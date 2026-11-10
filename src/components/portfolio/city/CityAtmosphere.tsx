import { useEffect, useRef } from "react";

const vertexSource = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const fragmentSource = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float smoke(vec2 p) {
  float a = noise(p) * 0.56;
  a += noise(p * 2.03 + 4.7) * 0.28;
  a += noise(p * 4.11 + 9.1) * 0.16;
  return a;
}

void main() {
  vec2 drift = vec2(uTime * 0.026, uTime * 0.009);
  float broad = smoke(vUv * vec2(4.0, 2.5) + drift);
  float wisps = smoke(vUv * vec2(9.0, 5.0) - drift * 0.7);
  float horizon = smoothstep(0.09, 0.28, vUv.y) * (1.0 - smoothstep(0.57, 0.86, vUv.y));
  float bank = smoothstep(0.44, 0.72, broad * 0.75 + wisps * 0.25) * horizon;

  float groundBand = smoothstep(0.05, 0.14, vUv.y) * (1.0 - smoothstep(0.25, 0.39, vUv.y));
  float groundSmoke = smoke(vUv * vec2(7.2, 5.8) + vec2(drift.x * 1.9, -drift.y));
  float rollingFog = smoothstep(0.43, 0.67, groundSmoke) * groundBand;
  float plumeMask = exp(-pow((vUv.x - 0.22 - sin(uTime * 0.08) * 0.035) * 8.0, 2.0))
    + exp(-pow((vUv.x - 0.77 + sin(uTime * 0.06) * 0.03) * 10.0, 2.0));
  float plumes = smoothstep(0.44, 0.68, wisps) * plumeMask
    * smoothstep(0.13, 0.28, vUv.y) * (1.0 - smoothstep(0.57, 0.76, vUv.y));

  vec2 dustCell = floor((vUv + vec2(uTime * 0.004, -uTime * 0.002)) * vec2(205.0, 104.0));
  float fleck = step(0.992, hash(dustCell)) * max(horizon, groundBand);
  float alpha = clamp(bank * 0.09 + rollingFog * 0.12 + plumes * 0.045 + fleck * 0.075, 0.0, 0.19);
  vec3 color = mix(vec3(0.14, 0.16, 0.18), vec3(0.33, 0.26, 0.19), broad * 0.65 + rollingFog * 0.2);
  gl_FragColor = vec4(color, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("City atmosphere shader unavailable", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function CityAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    if (!program || !buffer) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("City atmosphere program unavailable", gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, "uTime");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let request = 0;
    let last = 0;
    const start = performance.now();
    const draw = (seconds: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(time, seconds);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const tick = (now: number) => {
      request = window.requestAnimationFrame(tick);
      if (document.hidden || now - last < 42) return;
      last = now;
      draw((now - start) / 1000);
    };
    const updateMotion = () => {
      window.cancelAnimationFrame(request);
      draw(0);
      if (!motion.matches) request = window.requestAnimationFrame(tick);
    };
    motion.addEventListener("change", updateMotion);
    updateMotion();
    return () => {
      motion.removeEventListener("change", updateMotion);
      window.cancelAnimationFrame(request);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="city-atmosphere-shader" width={960} height={540} aria-hidden="true" />;
}
