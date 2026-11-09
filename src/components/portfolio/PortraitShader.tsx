import { useEffect, useRef } from "react";

type Props = {
	src: string;
	width: number;
	height: number;
	alt: string;
	className?: string;
};

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerAmt;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  v += a * noise(p); a *= 0.5; p = p * 2.03 + vec2(1.7, 9.2);
  v += a * noise(p); a *= 0.5; p = p * 2.03 + vec2(8.3, 2.8);
  v += a * noise(p); a *= 0.5; p = p * 2.03 + vec2(3.1, 4.4);
  v += a * noise(p);
  return v;
}

float blob(vec2 p, vec2 face, vec2 rad, float t) {
  vec2 delta = (p - face) / rad;
  float angle = atan(delta.y, delta.x);
  float lobe = sin(angle * 3.0 + 0.5) * 0.2 + sin(angle * 5.0 - 1.3) * 0.12 + sin(angle * 2.0 + t * 0.35) * 0.06;
  float chin = smoothstep(0.15, -0.85, delta.y) * 0.28;
  vec2 dent = vec2(
    fbm(delta * 2.2 + vec2(t * 0.08, 0.4)),
    fbm(delta * 2.2 + vec2(3.1, -t * 0.06))
  ) - 0.5;
  return length(delta + dent * 0.38) / max(0.45, 1.0 + lobe + chin);
}

void main() {
  vec2 uv = vUv;
  vec3 sharp = texture2D(uTex, uv).rgb;

  float t = uTime;
  vec2 face = vec2(0.58, 0.71);
  vec2 rad = vec2(0.26, 0.21);
  float mask = 1.0 - smoothstep(0.62, 1.12, blob(uv, face, rad, t));
  float pointerOnHead = 1.0 - smoothstep(0.85, 1.2, blob(uPointer, face, rad, t));
  vec2 flow = vec2(
    fbm(uv * 2.6 + vec2(t * 0.13, 1.4)),
    fbm(uv * 2.6 + vec2(5.2, -t * 0.11))
  ) - 0.5;

  vec2 fromPointer = uv - uPointer;
  float pointerDist = length(fromPointer * vec2(1.8, 2.6));
  float touch = exp(-pointerDist * pointerDist * 14.0) * uPointerAmt * pointerOnHead;

  vec2 duv = uv;
  duv += flow * 0.18 * mask;
  duv += vec2(sin(uv.y * 22.0 + t * 0.8), cos(uv.x * 16.0 - t * 0.5)) * 0.035 * mask;
  duv += normalize(fromPointer + 0.0001) * touch * 0.07;
  duv = clamp(duv, 0.002, 0.998);

  vec3 water = texture2D(uTex, duv).rgb * 0.42;
  water += texture2D(uTex, clamp(duv + flow * 0.022, 0.002, 0.998)).rgb * 0.22;
  water += texture2D(uTex, clamp(duv - flow * 0.018, 0.002, 0.998)).rgb * 0.2;
  water += texture2D(uTex, clamp(duv + vec2(0.0, 0.016) * mask, 0.002, 0.998)).rgb * 0.16;

  water *= vec3(0.28, 0.52, 0.4);
  water = mix(water, vec3(0.01, 0.07, 0.05), 0.38);
  float caustic = pow(fbm(uv * 7.0 + flow * 2.5 + t * 0.22), 3.0);
  water += vec3(0.05, 0.16, 0.1) * caustic * mask;
  water += vec3(0.12, 0.22, 0.16) * touch;

  gl_FragColor = vec4(mix(sharp, water, mask), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

export default function PortraitShader({ src, width, height, alt, className }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const gl = canvas.getContext("webgl", {
			alpha: false,
			antialias: false,
			preserveDrawingBuffer: true,
		});
		if (!gl) return;

		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
		if (!vs || !fs) return;

		const program = gl.createProgram();
		if (!program) return;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(program));
			return;
		}
		gl.useProgram(program);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
		const aPos = gl.getAttribLocation(program, "aPos");
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

		const uTex = gl.getUniformLocation(program, "uTex");
		const uTime = gl.getUniformLocation(program, "uTime");
		const uPointer = gl.getUniformLocation(program, "uPointer");
		const uPointerAmt = gl.getUniformLocation(program, "uPointerAmt");

		const texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 10, 8, 255]));
		gl.uniform1i(uTex, 0);

		const image = new Image();
		let imageReady = false;
		image.onload = () => {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			imageReady = true;
			canvas.dataset.shader = "ready";
		};
		image.src = src;

		const face = { x: 0.58, y: 0.74 };
		const rad = { x: 0.42, y: 0.3 };
		const pointer = { x: 0.6, y: 0.67, amt: 0, target: 0 };
		const overHead = (x: number, y: number) => {
			const dx = (x - face.x) / rad.x;
			const dy = (y - face.y) / rad.y;
			return dx * dx + dy * dy < 1;
		};
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let frame = 0;
		let running = true;
		const start = performance.now();

		const resize = () => {
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
			const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		const draw = (now: number) => {
			if (!running) return;
			resize();
			pointer.amt += (pointer.target - pointer.amt) * 0.08;
			const time = reduced ? 1.4 : (now - start) / 1000;
			gl.useProgram(program);
			gl.uniform1f(uTime, time);
			gl.uniform2f(uPointer, pointer.x, pointer.y);
			gl.uniform1f(uPointerAmt, pointer.amt);
			if (imageReady) gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			frame = window.requestAnimationFrame(draw);
		};

		const toUv = (event: PointerEvent) => {
			const rect = canvas.getBoundingClientRect();
			pointer.x = (event.clientX - rect.left) / rect.width;
			pointer.y = 1 - (event.clientY - rect.top) / rect.height;
		};
		const onMove = (event: PointerEvent) => {
			if (event.target !== canvas) return;
			toUv(event);
			const inside =
				pointer.x >= 0 &&
				pointer.x <= 1 &&
				pointer.y >= 0 &&
				pointer.y <= 1 &&
				overHead(pointer.x, pointer.y);
			pointer.target = inside ? 1 : 0;
		};
		const onLeave = () => {
			pointer.target = 0;
		};

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerleave", onLeave);
		frame = window.requestAnimationFrame(draw);

		return () => {
			running = false;
			window.cancelAnimationFrame(frame);
			observer.disconnect();
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerleave", onLeave);
			gl.deleteTexture(texture);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
		};
	}, [src]);

	return (
		<div
			className={`relative overflow-hidden rounded-sm bg-ink ring-1 ring-white/15 ${className ?? ""}`}
			style={{
				aspectRatio: `${width} / ${height}`,
				width: `min(22rem, calc(100vw - 3rem), calc((100dvh - 12rem) * ${width} / ${height}))`,
			}}
		>
			<img src={src} width={width} height={height} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
			<canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
		</div>
	);
}
