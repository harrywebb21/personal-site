import { useEffect, useRef } from "react";

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
uniform sampler2D uCity;
uniform float uTime;
uniform vec2 uRes;
uniform vec4 uMenu;

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
  v += a * noise(p); a *= 0.5; p = p * 2.02 + vec2(1.7, 9.2);
  v += a * noise(p); a *= 0.5; p = p * 2.03 + vec2(8.3, 2.8);
  v += a * noise(p); a *= 0.5; p = p * 1.97 + vec2(3.1, 4.4);
  v += a * noise(p);
  return v;
}

vec3 glassRain(vec2 px, vec2 res, float t, vec4 menu) {
  vec2 distort = vec2(0.0);
  float wet = 0.0;
  float menuT = res.y - menu.y;
  float blocked = step(menu.x, px.x) * step(px.x, menu.x + menu.z) * step(px.y, menuT + 0.5) * step(1.0, menu.z);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 cell = vec2(54.0 + fi * 28.0, 160.0 + fi * 90.0);
    float speed = 1.15 - fi * 0.28;
    vec2 id = floor(px / cell);
    vec2 f = fract(px / cell);
    float n = hash(id + vec2(fi * 5.17, 2.4));
    float present = step(0.28 + fi * 0.08, n);
    float x = 0.5 + (hash(id + 1.9) - 0.5) * 0.62;
    float head = fract(hash(id + 8.2) - t * speed);
    float dx = f.x - x;
    float dy = f.y - head;
    float above = max(dy, 0.0);
    float tail = 0.16 + hash(id + 4.4) * 0.28 + fi * 0.05;
    float width = (1.4 + fi * 0.7) / cell.x;
    float streak = smoothstep(width * (1.0 + above * 5.0), 0.0, abs(dx));
    streak *= smoothstep(tail, tail * 0.2, above) * smoothstep(-0.01, 0.015, dy);
    streak *= present * (1.0 - blocked);
    distort.x += dx * cell.x * streak * 0.35;
    distort.y -= streak * (18.0 + fi * 8.0);

    float age = 1.0 - head;
    vec2 hit = (vec2(x, 0.02) - f) * cell;
    float radius = age * (22.0 + hash(id + 6.6) * 26.0);
    float ring = abs(length(hit) - radius);
    float ripple = smoothstep(3.5, 0.0, ring) * smoothstep(0.7, 0.05, age) * smoothstep(0.0, 0.03, age);
    ripple *= present * (1.0 - blocked);
    vec2 normal = hit / max(length(hit), 0.001);
    distort -= normal * ripple * 7.0;
    wet += streak * 0.9 + ripple;
  }

  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 cell = vec2(96.0 + fi * 40.0, 78.0 + fi * 24.0);
    vec2 id = floor(px / cell);
    vec2 f = fract(px / cell);
    float n = hash(id + vec2(21.0, fi * 3.7));
    float present = step(0.9, n);
    float slide = fract(hash(id + 5.1) - t * (0.035 + fi * 0.02));
    vec2 c = vec2(hash(id + 1.3), slide);
    vec2 q = (f - c) * cell;
    float bead = smoothstep(13.0, 4.0, length(q)) * present;
    float trail = smoothstep(2.4, 0.0, abs(q.x)) * smoothstep(0.0, 4.0, q.y) * smoothstep(42.0, 8.0, q.y);
    trail *= present;
    distort -= q * bead * 0.22;
    distort.y -= trail * 10.0;
    wet += bead * 1.2 + trail * 0.4;
  }
  return vec3(distort / res, wet);
}

vec3 lidRain(vec2 px, vec2 res, float t, vec4 menu) {
  vec2 distort = vec2(0.0);
  float wet = 0.0;
  float menuL = menu.x;
  float menuR = menu.x + menu.z;
  float menuT = res.y - menu.y;
  float menuB = menuT - menu.w;
  float alive = step(1.0, menu.z);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 cell = vec2(54.0 + fi * 28.0, 160.0 + fi * 90.0);
    float speed = 1.15 - fi * 0.28;
    float idy = floor(menuT / cell.y);
    float idx0 = floor(px.x / cell.x);
    for (int s = 0; s < 5; s++) {
      vec2 id = vec2(idx0 + float(s) - 2.0, idy);
      float n = hash(id + vec2(fi * 5.17, 2.4));
      float present = step(0.28 + fi * 0.08, n) * alive;
      float x = 0.5 + (hash(id + 1.9) - 0.5) * 0.62;
      float head = fract(hash(id + 8.2) - t * speed);
      float headX = (id.x + x) * cell.x;
      float lidF = menuT / cell.y - idy;
      float inCell = step(0.0, lidF) * step(lidF, 1.0);
      float onLid = step(menuL, headX) * step(headX, menuR);
      float pastPx = (lidF - head) * cell.y;
      float hit = step(0.0, pastPx) * inCell * onLid * present;
      float flightT = pastPx / max(speed * cell.y, 1.0);

      float spread = 3.0 + pastPx * 0.7;
      float sheetLife = smoothstep(0.0, 6.0, pastPx) * smoothstep(48.0, 16.0, pastPx);
      vec2 ell = vec2((px.x - headX) / spread, (px.y - menuT) / 2.2);
      float sheet = smoothstep(0.4, 0.05, abs(length(ell) - 1.0)) * sheetLife * hit;

      float burst = step(0.82, hash(id + vec2(3.4, fi + 1.7)));
      for (int d = 0; d < 2; d++) {
        float di = float(d);
        float h1 = hash(id + vec2(18.0 + di * 4.0, fi * 2.0 + 1.0));
        float h2 = hash(id + vec2(33.0 + di, 7.0 + fi));
        float vx = (h1 - 0.5) * 70.0;
        float vy = 22.0 + h2 * 28.0;
        float grav = 160.0;
        vec2 p = vec2(headX + vx * flightT, menuT + vy * flightT - grav * flightT * flightT * 0.5);
        vec2 vel = vec2(vx, vy - grav * flightT);
        float vlen = max(length(vel), 0.001);
        vec2 tailEnd = p - vel / vlen * 5.0;
        vec2 pa = px - p;
        vec2 ba = tailEnd - p;
        float along = clamp(dot(pa, ba) / max(dot(ba, ba), 0.001), 0.0, 1.0);
        float tail = smoothstep(1.05, 0.0, length(pa - ba * along));
        float drop = smoothstep(1.8, 0.35, length(px - p));
        float show = smoothstep(0.0, 0.04, flightT) * smoothstep(0.36, 0.12, flightT);
        show *= step(menuT - 4.0, p.y) * burst * hit;
        wet += (drop * 0.42 + tail * 0.18) * show;
      }

      float flowT = max(flightT - 0.06, 0.0);
      float run = flowT * 52.0;
      float ry = menuT - run;
      float onFace = step(menuB, px.y) * step(px.y, menuT) * step(menuL, px.x) * step(px.x, menuR);
      float flowLife = smoothstep(0.06, 0.16, flightT) * smoothstep(0.85, 0.4, flowT);
      float bead = smoothstep(2.2, 0.5, length(vec2((px.x - headX) * 0.8, px.y - ry)));
      float trail = smoothstep(0.9, 0.0, abs(px.x - headX));
      trail *= step(ry, px.y) * step(px.y, menuT - 1.5);
      trail *= exp(-max(px.y - ry, 0.0) / 22.0);
      wet += sheet * 0.28 + (bead * 0.32 + trail * 0.2) * onFace * flowLife * hit;
      distort.y -= (sheet * 3.0 + trail * onFace * flowLife * hit * 5.0);
    }
  }
  return vec3(distort / res, wet);
}

void main() {
  vec2 uv = vUv;
  vec2 px = uv * uRes;
  vec3 rain = glassRain(px, uRes, uTime, uMenu);
  vec3 lid = lidRain(px, uRes, uTime, uMenu);
  vec2 sampleUv = clamp(uv + rain.xy + lid.xy, 0.001, 0.999);
  vec3 city = texture2D(uCity, sampleUv).rgb;
  float luma = dot(city, vec3(0.299, 0.587, 0.114));

  vec3 graded = mix(city * vec3(0.72, 0.78, 0.84), vec3(0.04, 0.05, 0.065), 0.18);
  graded = mix(graded, graded * 0.55 + vec3(0.025, 0.035, 0.05), smoothstep(0.38, 0.02, luma) * 0.35);

  float warm = smoothstep(0.28, 0.72, city.r - city.b + city.g * 0.15);
  graded = mix(graded, city * vec3(1.15, 0.78, 0.38), warm * 0.85);

  vec3 halo = (
    texture2D(uCity, uv + vec2(3.0 / uRes.x, 0.0)).rgb +
    texture2D(uCity, uv - vec2(3.0 / uRes.x, 0.0)).rgb +
    texture2D(uCity, uv + vec2(0.0, 3.0 / uRes.y)).rgb +
    texture2D(uCity, uv - vec2(0.0, 3.0 / uRes.y)).rgb
  ) * 0.25;
  float haloWarm = smoothstep(0.22, 0.62, halo.r - halo.b);
  graded += vec3(0.55, 0.28, 0.08) * haloWarm * 0.28;

  float fog = fbm(uv * vec2(1.8, 1.05) + vec2(uTime * 0.035, uTime * 0.012));
  float street = smoothstep(0.62, 0.0, uv.y);
  float sky = smoothstep(0.55, 1.0, uv.y);
  vec3 soot = vec3(0.07, 0.075, 0.085);
  graded = mix(graded, soot, smoothstep(0.4, 0.9, fog) * (0.08 + street * 0.2 + sky * 0.14));

  float stain = smoothstep(0.62, 0.92, fbm(uv * 6.5 + vec2(2.2, 8.4)));
  graded *= mix(1.0, 0.62, stain * 0.55);

  float menuL = uMenu.x;
  float menuR = uMenu.x + uMenu.z;
  float menuT = uRes.y - uMenu.y;
  float menuB = menuT - uMenu.w;
  float overMenu = step(menuL, px.x) * step(px.x, menuR) * step(menuB, px.y) * step(px.y, menuT) * step(1.0, uMenu.z);
  float wet = clamp(rain.z + lid.z, 0.0, 1.0);
  graded += wet * vec3(0.62, 0.66, 0.7) * (0.08 + luma * 0.5);

  float scratch = step(0.996, hash(vec2(floor(uv.y * 220.0), floor(uv.x * uRes.x * 0.15))));
  graded += scratch * 0.045;

  float grain = hash(uv * uRes + fract(uTime) * 47.0);
  graded += (grain - 0.5) * (0.055 + (1.0 - luma) * 0.06);

  vec2 vig = uv * 2.0 - 1.0;
  float v = smoothstep(0.55, 1.4, length(vig * vec2(0.92, 1.05)));
  graded *= mix(1.0, 0.42, v);

  vec3 color = clamp(graded, 0.0, 1.0);
  float alpha = 1.0;
  if (overMenu > 0.5) {
    color = vec3(0.78, 0.82, 0.86);
    alpha = clamp(wet * 0.78, 0.0, 0.9);
  }
  gl_FragColor = vec4(color, alpha);
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

export default function GothamGrime() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
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

		const uCity = gl.getUniformLocation(program, "uCity");
		const uTime = gl.getUniformLocation(program, "uTime");
		const uRes = gl.getUniformLocation(program, "uRes");
		const uMenu = gl.getUniformLocation(program, "uMenu");
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		const texture = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 10, 12, 255]));
		gl.uniform1i(uCity, 0);

		const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let frame = 0;
		let running = true;
		const start = performance.now();

		const resize = () => {
			const width = Math.max(1, Math.round(canvas.clientWidth));
			const height = Math.max(1, Math.round(canvas.clientHeight));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			gl.viewport(0, 0, canvas.width, canvas.height);
		};

		const draw = (now: number) => {
			if (!running) return;
			resize();
			const city = document.querySelector("canvas.pixel-city");
			gl.useProgram(program);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.uniform1f(uTime, motion.matches ? 2.4 : (now - start) / 1000);
			gl.uniform2f(uRes, canvas.width, canvas.height);
			const menu = document.querySelector("[data-game-menu]");
			if (menu instanceof HTMLElement) {
				const rect = menu.getBoundingClientRect();
				const scaleX = canvas.width / Math.max(1, canvas.clientWidth);
				const scaleY = canvas.height / Math.max(1, canvas.clientHeight);
				gl.uniform4f(uMenu, rect.left * scaleX, rect.top * scaleY, rect.width * scaleX, rect.height * scaleY);
			} else {
				gl.uniform4f(uMenu, 0, 0, 0, 0);
			}
			if (city instanceof HTMLCanvasElement && city.width > 10) {
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, city);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			}
		};

		const loop = (now: number) => {
			if (!running) return;
			draw(now);
			frame = window.requestAnimationFrame(loop);
		};

		if (motion.matches) draw(0);
		else frame = window.requestAnimationFrame(loop);

		return () => {
			running = false;
			window.cancelAnimationFrame(frame);
			gl.deleteTexture(texture);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 z-30 h-dvh w-full"
		/>
	);
}
