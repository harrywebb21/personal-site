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

float gPool;
float streakTail(vec2 id, float fi) {
  return 34.0 + fi * 26.0 + hash(id + 4.4) * (48.0 + fi * 30.0);
}

// x = head, y = remaining length, z = how far the drop has sunk into the surface
vec3 dropState(float phase, float t, float speed, float resY, float surface, float tailLen) {
  float fallDist = max(resY - surface, 1.0);
  float fade = 40.0;
  float span = fallDist + tailLen + fade;
  float traveled = span * (1.0 - fract(phase - t * speed / span));
  float sunk = max(traveled - fallDist, 0.0);
  float falling = step(traveled, fallDist);
  float head = mix(surface, resY - traveled, falling);
  float remain = max(tailLen - sunk, 0.0);
  return vec3(head, remain, sunk);
}

vec3 glassRain(vec2 px, vec2 res, float t, vec4 menu) {
  vec2 distort = vec2(0.0);
  float wet = 0.0;
  float menuL = menu.x;
  float menuR = menu.x + menu.z;
  float menuT = res.y - menu.y;
  float menuOn = step(1.0, menu.z);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float cellX = 54.0 + fi * 28.0;
    float speed = 230.0 - fi * 50.0;
    float col = floor(px.x / cellX);
    for (int d = 0; d < 4; d++) {
      float di = float(d);
      vec2 id = vec2(col, di + fi * 17.0);
      float present = step(0.28 + fi * 0.08, hash(id + vec2(fi * 5.17, 2.4)));
      float x = 0.5 + (hash(id + 1.9) - 0.5) * 0.62;
      float headX = (col + x) * cellX;
      float tail = streakTail(id, fi);
      float onMenu = step(menuL, headX) * step(headX, menuR) * menuOn;
      float surface = mix(0.0, menuT, onMenu);
      vec3 state = dropState(hash(id + 8.2), t, speed, res.y, surface, tail);
      float headY = state.x;
      float remain = state.y;
      float dx = px.x - headX;
      float dy = px.y - headY;
      float above = max(dy, 0.0);
      float width = (1.4 + fi * 0.7) * (1.0 + above * 0.018);
      float len = max(remain, 1.0);
      float streak = smoothstep(width, 0.0, abs(dx));
      streak *= smoothstep(len, len * 0.22, above) * smoothstep(-2.2, 1.4, dy);
      streak *= present * step(1.0, remain);
      distort.x += dx * streak * 0.35;
      distort.y -= streak * (18.0 + fi * 8.0);
      wet += streak * 0.9;
      float sinking = smoothstep(0.0, 8.0, state.z) * step(1.0, remain);
      gPool += streak * sinking * 0.55;
    }
  }

  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float cellX = 96.0 + fi * 40.0;
    float speed = 18.0 + fi * 8.0;
    float col0 = floor(px.x / cellX);
    for (int s = 0; s < 3; s++) {
      float col = col0 + float(s) - 1.0;
      for (int d = 0; d < 4; d++) {
        float di = float(d);
        vec2 id = vec2(col, di + 40.0 + fi * 6.0);
        float present = step(0.72, hash(id + vec2(21.0, fi * 3.7)));
        float headX = (col + hash(id + 1.3)) * cellX;
        float tail = 68.0;
        vec3 state = dropState(hash(id + 5.1), t, speed, res.y, 0.0, tail);
        float remain = state.y;
        float live = present * smoothstep(0.0, 5.0, remain);
        vec2 q = vec2(px.x - headX, px.y - state.x);
        float beadR = mix(10.0, 2.2, clamp(state.z / tail, 0.0, 1.0));
        float bead = smoothstep(beadR, beadR * 0.32, length(q)) * live;
        float trailEnd = max(remain, 1.0);
        float trail = smoothstep(1.6, 0.0, abs(q.x)) * smoothstep(0.0, 4.0, q.y) * smoothstep(trailEnd, trailEnd * 0.25, q.y);
        trail *= live;
        distort -= q * bead * 0.22;
        distort.y -= trail * 8.0;
        wet += bead * 1.15 + trail * 0.35;
        float grow = clamp(state.z / tail, 0.0, 1.0);
        float life = smoothstep(0.0, 4.0, state.z) * (1.0 - smoothstep(tail, tail + 36.0, state.z));
        float radius = 3.2 + grow * 10.0;
        vec2 ell = vec2((px.x - headX) / radius, px.y / 3.0);
        gPool += smoothstep(1.05, 0.32, length(ell)) * life * present;
      }
    }
  }
  return vec3(distort / res, wet);
}

vec3 edgeRain(vec2 px, vec2 res, float t, float edgeY, float edgeL, float edgeR, float faceB, float alive, float holeL, float holeR, float holeOn) {
  vec2 distort = vec2(0.0);
  float wet = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float cellX = 54.0 + fi * 28.0;
    float speed = 230.0 - fi * 50.0;
    float col0 = floor(px.x / cellX);
    for (int s = 0; s < 5; s++) {
      float col = col0 + float(s) - 2.0;
      for (int d = 0; d < 4; d++) {
        float di = float(d);
        vec2 id = vec2(col, di + fi * 17.0);
        float present = step(0.28 + fi * 0.08, hash(id + vec2(fi * 5.17, 2.4))) * alive;
        float x = 0.5 + (hash(id + 1.9) - 0.5) * 0.62;
        float headX = (col + x) * cellX;
        float onEdge = step(edgeL, headX) * step(headX, edgeR);
        float open = 1.0 - step(holeL, headX) * step(headX, holeR) * holeOn;
        float tail = streakTail(id, fi);
        vec3 state = dropState(hash(id + 8.2), t, speed, res.y, edgeY, tail);
        float hit = onEdge * present * open * step(faceB - 2.0, edgeY);
        float grow = clamp(state.z / max(tail, 1.0), 0.0, 1.0);
        float life = smoothstep(0.0, 5.0, state.z) * (1.0 - smoothstep(tail, tail + 40.0, state.z));
        float radius = 2.8 + grow * (9.0 + hash(id + 6.6) * 8.0);
        vec2 ell = vec2((px.x - headX) / radius, (px.y - edgeY) / (2.6 + grow * 1.6));
        float pool = smoothstep(1.08, 0.28, length(ell)) * life * hit;
        float ring = smoothstep(0.22, 0.0, abs(length(ell) - 0.92)) * life * hit;
        wet += pool * 0.72 + ring * 0.22;
        distort.y -= pool * 4.0;
      }
    }
  }
  return vec3(distort / res, wet);
}

void main() {
  vec2 uv = vUv;
  vec2 px = uv * uRes;
  float menuL = uMenu.x;
  float menuR = uMenu.x + uMenu.z;
  float menuT = uRes.y - uMenu.y;
  float menuB = menuT - uMenu.w;
  float menuOn = step(1.0, uMenu.z);
  gPool = 0.0;
  vec3 rain = glassRain(px, uRes, uTime, uMenu);
  vec3 lid = vec3(0.0);
  vec3 ground = vec3(0.0);
  if (menuOn > 0.5 && px.y < menuT + 22.0 && px.y > menuT - 90.0) {
    lid = edgeRain(px, uRes, uTime, menuT, menuL, menuR, menuB, 1.0, 0.0, 0.0, 0.0);
  }
  if (px.y < 36.0) {
    ground = edgeRain(px, uRes, uTime, 0.0, 0.0, uRes.x, 0.0, 1.0, menuL, menuR, menuOn);
  }
  vec2 sampleUv = clamp(uv + rain.xy + lid.xy + ground.xy, 0.001, 0.999);
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

  float overMenu = step(menuL, px.x) * step(px.x, menuR) * step(menuB, px.y) * step(px.y, menuT) * menuOn;
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
    alpha = clamp((wet + gPool) * 0.78, 0.0, 0.9);
  } else {
    float splash = clamp(ground.z + gPool, 0.0, 1.0);
    vec3 sheen = color * vec3(0.78, 0.84, 0.92) + vec3(0.015, 0.02, 0.028);
    color = mix(color, sheen, splash * 0.72);
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
