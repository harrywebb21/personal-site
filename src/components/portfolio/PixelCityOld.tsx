import { useEffect, useRef } from "react";

const SCALE = 1;
const CELL = 24;

type Kind = "flat" | "step" | "pyramid" | "pent" | "tank" | "deco" | "loft" | "spire" | "dome" | "brownstone";

type Building = {
	x: number;
	w: number;
	h: number;
	kind: Kind;
	sign: boolean;
	fire: boolean;
	dark: boolean;
	escape: boolean;
	antenna: boolean;
	shop: boolean;
	ac: boolean;
};

type Light = {
	x: number;
	y: number;
	size: number;
	phase: number;
	flicker: boolean;
};

type Fire = {
	x: number;
	y: number;
	phase: number;
};

type PropKind = "tree" | "pine" | "billboard" | "lamp" | "hydrant" | "cone" | "dumpster" | "trash";

type Prop = {
	kind: PropKind;
	x: number;
};

type Vehicle = "moto" | "sport" | "pickup" | "sedan";

type Car = {
	x: number;
	y: number;
	w: number;
	kind: Vehicle;
	burn: boolean;
	dark: boolean;
};

type Layer = {
	buildings: Building[];
	props: Prop[];
	cars: Car[];
	pad: number;
	width: number;
	speed: number;
	horizon: number;
	wall: string;
	alt: string;
	win: string;
	mortar: string;
	cap: string;
	edge: string;
	shade: string | null;
	winSize: number;
	glow: string;
};

function mulberry32(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function skyline(
	seed: number,
	opts: {
		width: number;
		w0: number;
		wSpan: number;
		h0: number;
		hSpan: number;
		signs: boolean;
		fires: number;
		street: "near" | "mid" | null;
		minH: number;
	},
) {
	const rand = mulberry32(seed);
	const buildings: Building[] = [];
	const props: Prop[] = [];
	let x = 0;
	while (x < opts.width) {
		let w = Math.max(CELL, (opts.w0 + Math.floor(rand() * opts.wSpan)) * CELL);
		let h = Math.max(CELL * 3, (opts.h0 + Math.floor(rand() * opts.hSpan)) * CELL);
		if (opts.street === "near") {
			if (rand() > 0.78) w = CELL * (1 + Math.floor(rand() * 2));
			else if (rand() > 0.4) w += CELL * (1 + Math.floor(rand() * 4));
			h += CELL * (rand() > 0.55 ? 2 + Math.floor(rand() * 8) : Math.floor(rand() * 4));
		} else if (rand() > 0.7) {
			h += CELL * (1 + Math.floor(rand() * 3));
		}
		const roll = rand();
		const kind = pickKind(roll, opts.street, w, h);
		if (kind === "spire") h += CELL * 4;
		if (kind === "deco") h = Math.max(h, CELL * 8);
		h = Math.max(h, opts.minH);
		const signed = opts.signs && rand() > 0.55 && w >= CELL * 3 && kind !== "spire";
		const shop = opts.street === "near" && !signed && kind !== "loft" && kind !== "spire" && rand() > 0.48 && w >= CELL * 3;
		buildings.push({
			x,
			w,
			h,
			kind,
			sign: signed,
			fire: false,
			dark: rand() > 0.58,
			escape: opts.street === "near" && !signed && !shop && rand() > 0.4 && w >= CELL * 4,
			antenna: rand() > 0.72,
			shop,
			ac: opts.street === "near" && !signed && rand() > 0.35,
		});
		x += Math.max(CELL, w - (3 + Math.floor(rand() * 18)));
	}
	lineStreet(rand, x, opts.street, props);
	const cars = lineCars(rand, x, opts.street);
	const candidates = buildings.filter((b) => (b.kind === "flat" || b.kind === "step") && b.h >= CELL * 5);
	for (let i = 0; i < opts.fires && candidates.length; i++) {
		const index = Math.floor(rand() * candidates.length);
		candidates[index].fire = true;
		candidates.splice(index, 1);
	}
	return { buildings, props, cars, width: x };
}

function pickKind(roll: number, street: "near" | "mid" | null, w: number, h: number): Kind {
	if (street !== "near") return roll > 0.82 ? "step" : roll > 0.68 ? "pent" : "flat";
	if (w <= CELL * 2 && roll > 0.35) return "spire";
	if (h <= CELL * 12 && w >= CELL * 4 && roll > 0.62) return "loft";
	if (roll > 0.93) return "dome";
	if (roll > 0.84) return "deco";
	if (roll > 0.74) return "brownstone";
	if (roll > 0.64) return "tank";
	if (roll > 0.54) return "pyramid";
	if (roll > 0.44) return "step";
	if (roll > 0.34) return "pent";
	return "flat";
}

function grit(n: number) {
	let x = n | 0;
	x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
	x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
	return (x ^ (x >>> 16)) >>> 0;
}

function shadeWidth(b: Building) {
	return Math.max(10, Math.min(CELL, Math.floor(b.w * 0.22)));
}

function frontSpan(b: Building) {
	return Math.max(CELL, b.w - shadeWidth(b));
}

function lineStreet(rand: () => number, end: number, street: "near" | "mid" | null, props: Prop[]) {
	if (!street) return;
	let cursor = 12;
	while (cursor < end - 36) {
		const roll = rand();
		const kind: PropKind =
			street === "near"
				? roll > 0.84
					? "lamp"
					: roll > 0.68
						? "dumpster"
						: roll > 0.52
							? "cone"
							: roll > 0.36
								? "trash"
								: roll > 0.2
									? "hydrant"
									: "tree"
				: roll > 0.55
					? "lamp"
					: "tree";
		if (rand() > 0.28) props.push({ kind, x: cursor });
		cursor += 36 + Math.floor(rand() * 120);
	}
}

function lineCars(rand: () => number, end: number, street: "near" | "mid" | null) {
	const cars: Car[] = [];
	if (street !== "near") return cars;
	const order: Vehicle[] = ["moto", "sport", "pickup", "sedan"];
	let n = 0;
	let cursor = 18;
	while (cursor < end - 90) {
		if (rand() > 0.28) {
			const kind = order[n % order.length];
			n += 1;
			const w = kind === "moto" ? 36 : kind === "sport" ? 72 : kind === "pickup" ? 80 : 56;
			cars.push({ x: cursor, y: 0, w, kind, burn: kind !== "moto" && rand() > 0.86, dark: rand() > 0.5 });
			cursor += w;
		}
		cursor += 28 + Math.floor(rand() * 64);
	}
	return cars;
}

function roofSteps(b: Building) {
	if (b.kind === "deco") return 3;
	if (b.kind !== "pyramid") return 0;
	return Math.max(1, Math.min(4, Math.floor(frontSpan(b) / (CELL * 2))));
}

function roofAndBody(b: Building, baseline: number) {
	const roof = baseline - b.h;
	let body = roof;
	if (b.kind === "pyramid" || b.kind === "deco") body += roofSteps(b) * CELL;
	else if (b.kind === "step" || b.kind === "brownstone") body += CELL;
	else if (b.kind === "dome" || b.kind === "spire") body += CELL * 2;
	return { roof, body };
}

function groundFloor(b: Building, baseline: number) {
	const doorW = 14;
	const doorH = 34;
	const face = frontSpan(b);
	const doorX = b.shop
		? b.x + Math.max(2, face - doorW - 2)
		: b.x + Math.max(2, Math.floor((Math.min(face, b.w - 2) - doorW) / 2));
	return { doorX, doorY: baseline - doorH, doorW, doorH, face };
}

function hidesWindow(b: Building, baseline: number, cx: number, cy: number, detailed: boolean) {
	if (!detailed) return false;
	const { doorX, doorY, doorW } = groundFloor(b, baseline);
	const hitsDoor = cx < doorX + doorW && cx + CELL > doorX && cy + CELL > doorY - 3 && cy < baseline;
	const hitsShop = b.shop && cy >= baseline - CELL * 2 && cx + CELL <= doorX;
	return hitsDoor || hitsShop;
}

function paintEscape(g: CanvasRenderingContext2D, x: number, top: number, bottom: number, metal: string) {
	g.fillStyle = metal;
	const height = bottom - top - 48;
	if (height < 18) return;
	g.fillRect(x, top + 12, 1, height);
	g.fillRect(x + 4, top + 12, 1, height);
	for (let y = top + 20; y < bottom - 40; y += 28) g.fillRect(x, y, 6, 1);
}

function paintGround(g: CanvasRenderingContext2D, b: Building, baseline: number, bodyTop: number) {
	const { doorX, doorY, doorW, doorH } = groundFloor(b, baseline);
	const frame = b.dark ? "#e4e4e4" : "#1a1a1a";
	const leaf = b.dark ? "#101010" : "#2a2a2a";

	if (b.shop) {
		const glassW = Math.max(16, doorX - b.x - 10);
		g.fillStyle = frame;
		g.fillRect(b.x + 4, baseline - 40, glassW, 30);
		g.fillStyle = "#d8d8d8";
		g.fillRect(b.x + 7, baseline - 37, glassW - 6, 24);
		g.fillStyle = leaf;
		g.fillRect(b.x + 7 + Math.floor(glassW / 2), baseline - 37, 1, 24);
		g.fillRect(b.x + 7, baseline - 25, glassW - 6, 1);
		g.fillStyle = "#f4f4f4";
		g.fillRect(b.x + 2, baseline - 48, glassW + doorW + 10, 8);
		g.fillStyle = leaf;
		for (let i = 0; i < glassW + doorW + 10; i += 4) g.fillRect(b.x + 2 + i, baseline - 48, 2, 8);
	} else {
		g.fillStyle = frame;
		g.fillRect(doorX - 2, doorY - 8, doorW + 4, 6);
		g.fillRect(Math.max(b.x, doorX - 8), baseline - 18, 2, 18);
		g.fillRect(Math.min(b.x + b.w - 4, doorX + doorW + 4), baseline - 18, 2, 18);
		g.fillRect(Math.max(b.x, doorX - 8), baseline - 18, 8, 2);
		g.fillRect(doorX + doorW, baseline - 18, Math.min(8, b.x + b.w - (doorX + doorW) - 2), 2);
	}

	g.fillStyle = frame;
	g.fillRect(doorX - 2, doorY, doorW + 4, doorH);
	g.fillStyle = leaf;
	g.fillRect(doorX, doorY + 2, doorW, doorH - 6);
	g.fillStyle = frame;
	g.fillRect(doorX + 2, doorY + Math.floor(doorH / 2), doorW - 4, 1);
	g.fillRect(doorX + doorW - 5, doorY + 16, 2, 2);
	g.fillStyle = b.dark ? "#9a9a9a" : "#d8d8d8";
	g.fillRect(doorX - 4, baseline - 4, doorW + 8, 4);

	if (!b.shop && b.w >= CELL * 3) {
		const ventX = doorX > b.x + b.w / 2 ? b.x + 8 : b.x + b.w - 18;
		g.fillStyle = "#101010";
		g.fillRect(ventX, baseline - 12, 10, 8);
		g.fillStyle = frame;
		g.fillRect(ventX, baseline - 9, 10, 1);
		g.fillRect(ventX + 3, baseline - 12, 1, 8);
		g.fillRect(ventX + 6, baseline - 12, 1, 8);
	}

	if (!b.escape) return;
	const metal = b.dark ? "#b7bbb7" : "#2a2c2a";
	const face = frontSpan(b);
	const ex = doorX > b.x + face / 2 ? b.x : b.x + Math.max(0, face - 6);
	paintEscape(g, ex, bodyTop, baseline, metal);
}

function paintBuilding(
	g: CanvasRenderingContext2D,
	b: Building,
	baseline: number,
	layer: Layer,
) {
	const { roof: top, body: bodyTop } = roofAndBody(b, baseline);
	const { x, w } = b;
	const wall = b.dark ? layer.alt : layer.wall;

	if (b.kind === "pyramid") {
		const face = frontSpan(b);
		const steps = roofSteps(b);
		let y = top;
		for (let i = 0; i < steps; i++) {
			const inset = (steps - 1 - i) * (CELL / 2);
			const sw = Math.max(CELL, face - inset * 2);
			const sx = x + Math.floor((face - sw) / 2);
			const sh = i === steps - 1 ? CELL + 3 : CELL;
			g.fillStyle = wall;
			g.fillRect(sx, y, sw, sh);
			g.fillStyle = layer.cap;
			g.fillRect(sx, y, sw, 2);
			g.fillStyle = layer.edge;
			g.fillRect(sx + sw - 1, y, 1, sh);
			y += CELL;
		}
	} else if (b.kind === "step") {
		const face = frontSpan(b);
		const lip = Math.min(CELL * 2, Math.floor(face / 4));
		g.fillStyle = wall;
		g.fillRect(x + lip, top, face - lip * 2, CELL + 3);
		g.fillStyle = layer.cap;
		g.fillRect(x + lip, top, face - lip * 2, 2);
	} else if (b.kind === "deco") {
		const face = frontSpan(b);
		const steps = roofSteps(b);
		let y = top;
		for (let i = 0; i < steps; i++) {
			const inset = (steps - 1 - i) * Math.max(4, Math.floor(face / 8));
			const sw = Math.max(CELL, face - inset * 2);
			const sx = x + Math.floor((face - sw) / 2);
			const sh = i === steps - 1 ? CELL + 3 : CELL;
			g.fillStyle = wall;
			g.fillRect(sx, y, sw, sh);
			g.fillStyle = layer.cap;
			g.fillRect(sx, y, sw, 2);
			y += CELL;
		}
	} else if (b.kind === "dome") {
		const face = frontSpan(b);
		const radius = Math.min(CELL, Math.floor(face / 2) - 2);
		const cx = x + Math.floor(face / 2);
		g.fillStyle = wall;
		g.fillRect(x, top + radius - 1, face, bodyTop - top - radius + 4);
		for (let dy = 0; dy <= radius; dy++) {
			const span = Math.floor(Math.sqrt(Math.max(0, radius * radius - (radius - dy) * (radius - dy))));
			g.fillRect(cx - span, top + dy, span * 2 + 1, 1);
		}
		g.fillStyle = layer.cap;
		g.fillRect(cx - 4, top, 8, 2);
	} else if (b.kind === "spire") {
		const face = frontSpan(b);
		const shaft = Math.max(8, Math.min(14, Math.floor(face / 2)));
		const sx = x + Math.floor((face - shaft) / 2);
		g.fillStyle = wall;
		g.fillRect(sx, top + 16, shaft, bodyTop - top - 13);
		g.fillStyle = layer.cap;
		g.fillRect(sx + Math.floor(shaft / 2), top, 2, 22);
	} else if (b.kind === "brownstone") {
		g.fillStyle = layer.cap;
		g.fillRect(x, top, frontSpan(b), 6);
		g.fillStyle = wall;
		g.fillRect(x, top + 6, frontSpan(b), bodyTop - top - 4);
	}

	g.fillStyle = wall;
	g.fillRect(x, bodyTop, w, baseline - bodyTop);
	if (layer.shade) {
		const shadeW = shadeWidth(b);
		g.fillStyle = layer.shade;
		g.fillRect(x + w - shadeW, bodyTop + 1, shadeW, baseline - bodyTop);
	}
	g.fillStyle = layer.cap;
	g.fillRect(x, bodyTop, w - 1, 3);

	const size = layer.winSize;
	const inset = Math.floor((CELL - size) / 2);
	const detailed = layer.horizon >= 0.75;
	const face = frontSpan(b);
	for (let cy = bodyTop + CELL; cy + CELL <= baseline; cy += CELL) {
		if (detailed) {
			g.fillStyle = layer.mortar;
			const joint = (Math.floor((cy - bodyTop) / CELL) % 2) * (CELL / 2);
			for (let jx = x + joint; jx < x + w; jx += CELL) g.fillRect(jx, cy, 1, CELL - 1);
		}
		for (let cx = x; cx + CELL <= x + face; cx += CELL) {
			if (hidesWindow(b, baseline, cx, cy, detailed)) continue;
			g.fillStyle = layer.mortar;
			g.fillRect(cx, cy + CELL - 2, CELL, 2);
			g.fillStyle = layer.win;
			g.fillRect(cx + inset, cy + inset, size, size);
			if (size >= 8) {
				g.fillStyle = b.dark ? layer.wall : "#1a1c1a";
				const mid = Math.floor(size / 2);
				g.fillRect(cx + inset, cy + inset + mid, size, 1);
				g.fillRect(cx + inset + mid, cy + inset, 1, size);
			}
			if (!b.ac || grit(cx + b.x) % 3 !== 0) continue;
			g.fillStyle = b.dark ? "#c8c8c8" : "#1a1a1a";
			g.fillRect(cx + inset, cy + CELL - 6, size, 3);
		}
		if (!layer.shade) continue;
		const side = Math.max(3, Math.floor(size * 0.5));
		for (let cx = x + face + 4; cx + side <= x + w - 2; cx += CELL) {
			g.fillStyle = "#070807";
			g.fillRect(cx, cy + inset, side, Math.max(side, 6));
		}
	}
	g.fillStyle = layer.edge;
	g.fillRect(x + w - 1, bodyTop, 1, baseline - bodyTop);
	g.fillStyle = b.dark ? "#141614" : layer.edge;
	g.fillRect(x, baseline - 6, w - 1, 6);

	if (b.kind === "pent") {
		const pw = Math.min(CELL * 2, Math.max(CELL, face - 8));
		const px = x + Math.max(4, Math.floor((face - pw) / 2));
		g.fillStyle = wall;
		g.fillRect(px, top - CELL, pw, CELL + 4);
		g.fillStyle = layer.cap;
		g.fillRect(px, top - CELL, pw, 2);
		g.fillStyle = layer.win;
		g.fillRect(px + 8, top - CELL + 8, 6, 6);
		g.fillStyle = layer.edge;
		g.fillRect(px + pw - 2, top - CELL, 2, CELL + 4);
	}

	if (b.kind === "tank" && frontSpan(b) >= CELL * 2) {
		const tw = CELL + 6;
		const tx = x + 8;
		g.fillStyle = wall;
		g.fillRect(tx, top - 28, tw, 18);
		g.fillStyle = layer.cap;
		g.fillRect(tx, top - 28, tw, 3);
		g.fillStyle = layer.edge;
		g.fillRect(tx + 4, top - 10, 2, 14);
		g.fillRect(tx + tw - 6, top - 10, 2, 14);
	}

	if (b.antenna && b.kind !== "pyramid" && b.kind !== "spire" && b.kind !== "dome") {
		const ax = x + Math.max(6, Math.min(Math.floor(face / 3), face - 8));
		g.fillStyle = layer.cap;
		g.fillRect(ax, top - 22, 2, 26);
		g.fillRect(ax - 5, top - 16, 12, 1);
	}

	if (b.kind === "flat" || b.kind === "loft" || b.kind === "brownstone" || b.kind === "step") {
		g.fillStyle = wall;
		for (let px = x + 2; px < x + face - 2; px += 4 + (grit(px + b.h) % 5)) {
			const n = grit(b.x * 19 + px);
			if (n % 4 === 0) continue;
			const tooth = 3 + (n % 8);
			g.fillRect(px, bodyTop - tooth, n % 2 === 0 ? 2 : 3, tooth + 3);
		}
		if (grit(b.h + b.x) % 3 !== 0) {
			const horn = 16 + (grit(b.h) % 18);
			const hx = x + 6 + (grit(b.x) % Math.max(1, face - 14));
			g.fillStyle = layer.cap;
			g.fillRect(hx, bodyTop - horn, 2, horn + 3);
		}
	}

	if (detailed) paintGround(g, b, baseline, bodyTop);

	if (b.kind === "loft") {
		const door = groundFloor(b, baseline);
		const glassW = Math.max(12, door.doorX - x - 10);
		const panes = Math.max(1, Math.floor(glassW / 12));
		g.fillStyle = b.dark ? "#101010" : "#1c1c1c";
		g.fillRect(x + 4, baseline - 40, glassW, 30);
		g.fillStyle = "#d8d8d8";
		for (let i = 0; i < panes; i++) g.fillRect(x + 7 + i * 12, baseline - 36, 8, 22);
		paintGround(g, b, baseline, bodyTop);
	}

	if (b.sign) {
		const sw = Math.min(CELL + (b.h % CELL), face - CELL);
		const floors = Math.max(1, Math.floor((baseline - bodyTop) / CELL) - 2);
		const sy = bodyTop + (1 + (grit(b.x + b.h) % floors)) * CELL;
		if (sw >= 16 && sy + CELL < baseline - CELL) {
			g.fillStyle = "#f4f4f4";
			g.fillRect(x + 4, sy, sw, CELL - 4);
			g.fillStyle = "#141414";
			g.fillRect(x + 8, sy + 5, Math.max(4, sw - 16), 3);
			g.fillRect(x + 8, sy + 11, Math.max(4, sw - 22), 2);
		}
	}

	if (b.sign && face >= CELL * 2 && b.kind !== "dome" && b.kind !== "spire" && b.kind !== "deco") {
		const bw = Math.min(face - 12, CELL * 2);
		g.fillStyle = layer.edge;
		g.fillRect(x + 8, top - 4, 2, 8);
		g.fillRect(x + bw - 4, top - 4, 2, 8);
		g.fillStyle = "#f2f2f2";
		g.fillRect(x + 4, top - 22, bw, 18);
		g.fillStyle = "#161616";
		g.fillRect(x + 8, top - 16, Math.max(4, bw - 16), 3);
		g.fillRect(x + 8, top - 10, Math.max(4, bw - 22), 2);
	}
}

function paintProp(g: CanvasRenderingContext2D, prop: Prop, baseline: number, near: boolean) {
	const x = prop.x;
	if (prop.kind === "tree" || prop.kind === "pine") {
		const leaf = near ? "#4a5248" : "#242824";
		const trunk = near ? "#2a241e" : "#141210";
		const cap = near ? "#c5cdc2" : "#5a6258";
		g.fillStyle = trunk;
		g.fillRect(x + 12, baseline - 18, 6, 18);
		g.fillStyle = leaf;
		if (prop.kind === "pine") {
			g.fillRect(x + 10, baseline - 58, 10, 14);
			g.fillRect(x + 5, baseline - 44, 20, 14);
			g.fillRect(x, baseline - 30, 30, 14);
		} else {
			g.fillRect(x + 6, baseline - 52, 16, 12);
			g.fillRect(x + 2, baseline - 40, 24, 14);
			g.fillRect(x, baseline - 28, 28, 12);
		}
		g.fillStyle = cap;
		g.fillRect(x + 12, prop.kind === "pine" ? baseline - 58 : baseline - 52, 6, 2);
		return;
	}
	if (prop.kind === "lamp") {
		g.fillStyle = near ? "#8e928e" : "#3a3e3a";
		g.fillRect(x + 4, baseline - 58, 3, 58);
		g.fillRect(x + 4, baseline - 64, 18, 4);
		g.fillStyle = near ? "#f4f4f4" : "#8a8e8a";
		g.fillRect(x + 16, baseline - 62, 5, 3);
		return;
	}
	if (prop.kind === "cone") {
		g.fillStyle = "#d8d8d8";
		g.fillRect(x + 6, baseline - 16, 4, 16);
		g.fillRect(x + 4, baseline - 10, 8, 4);
		g.fillRect(x + 2, baseline - 4, 12, 4);
		g.fillStyle = "#1a1a1a";
		g.fillRect(x + 4, baseline - 10, 8, 2);
		return;
	}
	if (prop.kind === "dumpster") {
		g.fillStyle = near ? "#5a5e5a" : "#2a2e2a";
		g.fillRect(x, baseline - 22, 28, 22);
		g.fillStyle = "#c8ccc8";
		g.fillRect(x, baseline - 26, 28, 5);
		g.fillStyle = "#1a1a1a";
		g.fillRect(x + 4, baseline - 16, 20, 2);
		g.fillRect(x + 3, baseline - 4, 5, 4);
		g.fillRect(x + 20, baseline - 4, 5, 4);
		return;
	}
	if (prop.kind === "trash") {
		g.fillStyle = "#2a2c2a";
		g.fillRect(x + 2, baseline - 10, 8, 10);
		g.fillRect(x + 8, baseline - 7, 7, 7);
		g.fillStyle = "#8a8e8a";
		g.fillRect(x + 3, baseline - 12, 6, 3);
		return;
	}
	g.fillStyle = near ? "#d8d8d8" : "#6a6e6a";
	g.fillRect(x + 4, baseline - 18, 12, 18);
	g.fillRect(x, baseline - 12, 20, 6);
	g.fillStyle = "#1a1a1a";
	g.fillRect(x + 7, baseline - 15, 6, 4);
}

function paintWheel(g: CanvasRenderingContext2D, x: number, y: number, size: number) {
	g.fillStyle = "#0c0c0c";
	g.fillRect(x + 1, y, size - 2, size);
	g.fillRect(x, y + 1, size, size - 2);
	g.fillStyle = "#8e928e";
	const hub = Math.max(3, size - 6);
	const inset = Math.floor((size - hub) / 2);
	g.fillRect(x + inset, y + inset, hub, hub);
}

function paintFlame(g: CanvasRenderingContext2D, x: number, y: number) {
	g.fillStyle = "#f4f4f4";
	g.fillRect(x, y - 7, 3, 7);
	g.fillRect(x - 4, y - 4, 3, 4);
	g.fillRect(x + 4, y - 5, 3, 5);
	g.fillStyle = "#8a8e8a";
	g.fillRect(x, y - 10, 3, 3);
}

function paintCar(g: CanvasRenderingContext2D, car: Car, baseline: number) {
	const x = car.x;
	const y = baseline + 1;
	const body = car.dark ? "#c8c8c8" : "#f2f2f2";
	const trim = car.dark ? "#2a2a2a" : "#161616";

	if (car.kind === "moto") {
		const seat = y + 4;
		g.fillStyle = "#1a1a1a";
		g.fillRect(x + 10, seat, 7, 7);
		g.fillStyle = "#9a9e9a";
		g.fillRect(x + 11, seat + 1, 5, 2);
		g.fillStyle = "#1a1a1a";
		g.fillRect(x + 8, seat + 7, 8, 7);
		g.fillStyle = body;
		g.fillRect(x + 6, seat + 13, 14, 4);
		g.fillRect(x + 18, seat + 14, 8, 4);
		g.fillStyle = trim;
		g.fillRect(x + 22, seat + 2, 2, 14);
		g.fillRect(x + 20, seat + 2, 10, 2);
		g.fillRect(x + 8, seat + 17, 20, 2);
		paintWheel(g, x + 1, seat + 16, 11);
		paintWheel(g, x + 22, seat + 16, 11);
		return;
	}

	if (car.kind === "sport") {
		const nose = y + 8;
		g.fillStyle = trim;
		g.fillRect(x + 2, nose, 2, 8);
		g.fillRect(x + 2, nose, 12, 2);
		g.fillStyle = body;
		g.fillRect(x + 20, nose + 1, 16, 4);
		g.fillRect(x + 6, nose + 8, 52, 5);
		g.fillRect(x + 54, nose + 10, 16, 3);
		g.fillStyle = "#101010";
		g.fillRect(x + 22, nose + 3, 12, 4);
		g.fillStyle = trim;
		g.fillRect(x + 8, nose + 10, 48, 2);
		g.fillStyle = "#f7f7f7";
		g.fillRect(x + 66, nose + 11, 4, 2);
		paintWheel(g, x + 12, nose + 8, 12);
		paintWheel(g, x + 48, nose + 8, 12);
		if (car.burn) paintFlame(g, x + 14, nose);
		return;
	}

	if (car.kind === "pickup") {
		const bed = y - 2;
		g.fillStyle = "#141414";
		g.fillRect(x + 6, bed + 14, 30, 8);
		g.fillStyle = body;
		g.fillRect(x + 2, bed + 10, 4, 14);
		g.fillRect(x + 2, bed + 10, 36, 3);
		g.fillRect(x + 34, bed + 10, 4, 14);
		g.fillRect(x + 38, bed - 8, 22, 30);
		g.fillStyle = "#101010";
		g.fillRect(x + 41, bed - 4, 16, 10);
		g.fillStyle = body;
		g.fillRect(x + 60, bed + 6, 18, 16);
		g.fillStyle = trim;
		g.fillRect(x + 4, bed + 20, 70, 2);
		g.fillStyle = "#f7f7f7";
		g.fillRect(x + 74, bed + 12, 4, 3);
		paintWheel(g, x + 8, bed + 18, 13);
		paintWheel(g, x + 52, bed + 18, 13);
		if (car.burn) paintFlame(g, x + 18, bed + 10);
		return;
	}

	g.fillStyle = body;
	g.fillRect(x + 2, y + 8, 50, 10);
	g.fillRect(x, y + 12, 56, 6);
	g.fillRect(x + 18, y, 18, 4);
	g.fillRect(x + 14, y + 3, 26, 8);
	g.fillStyle = "#101010";
	g.fillRect(x + 16, y + 4, 10, 6);
	g.fillRect(x + 28, y + 4, 10, 6);
	g.fillStyle = trim;
	g.fillRect(x + 2, y + 12, 50, 2);
	g.fillRect(x, y + 15, 5, 3);
	g.fillRect(x + 51, y + 15, 5, 3);
	g.fillStyle = "#f7f7f7";
	g.fillRect(x + 50, y + 13, 4, 2);
	g.fillStyle = "#6a6a6a";
	g.fillRect(x + 2, y + 13, 3, 2);
	paintWheel(g, x + 6, y + 14, 11);
	paintWheel(g, x + 38, y + 14, 11);
	if (car.burn) paintFlame(g, x + 24, y);
}

function paintStreet(g: CanvasRenderingContext2D, width: number, baseline: number, pad: number) {
	g.fillStyle = "#d4d8d4";
	g.fillRect(0, baseline, width, 2);
	g.fillStyle = "#3a3c3a";
	g.fillRect(0, baseline + 2, width, 8);
	g.fillStyle = "#2a2c2a";
	for (let x = 0; x < width; x += 22) g.fillRect(x, baseline + 2, 1, 8);
	g.fillStyle = "#141614";
	g.fillRect(0, baseline + 10, width, Math.max(0, pad - 10));
	g.fillStyle = "#7a7e7a";
	for (let x = 6; x < width; x += 28) g.fillRect(x, baseline + 18, 8, 2);
}

function collectDecor(layer: Layer, baseline: number) {
	const lights: Light[] = [];
	const fires: Fire[] = [];
	for (const building of layer.buildings) {
		const { roof, body } = roofAndBody(building, baseline);
		if (building.fire) fires.push({ x: building.x + Math.floor(building.w / 2), y: roof, phase: building.x % 7 });
		const signW = building.sign ? Math.min(CELL * 3, building.w - CELL) : 0;
		const signX = building.x + CELL / 2;
		const signY = body + CELL;
		const inset = Math.floor((CELL - layer.winSize) / 2);
		const detailed = layer.horizon >= 0.75;
		const face = frontSpan(building);
		for (let cy = body + CELL; cy + CELL <= baseline; cy += CELL) {
			for (let cx = building.x; cx + CELL <= building.x + face; cx += CELL) {
				if (hidesWindow(building, baseline, cx, cy, detailed)) continue;
				if (building.sign && cx >= signX && cx < signX + signW && cy >= signY && cy < signY + CELL) continue;
				const phase = cx * 13 + cy * 29;
				let pick = Math.imul(phase ^ (phase >>> 16), 0x7feb352d);
				pick = Math.imul(pick ^ (pick >>> 15), 0x846ca68b);
				if (((pick ^ (pick >>> 16)) >>> 0) % 4 !== 0) continue;
				lights.push({ x: cx + inset, y: cy + inset, size: layer.winSize, phase, flicker: true });
			}
		}
	}
	for (const prop of layer.props) {
		if (prop.kind !== "lamp") continue;
		lights.push({ x: prop.x + 16, y: baseline - 62, size: 5, phase: prop.x, flicker: false });
	}
	for (const car of layer.cars) {
		if (!car.burn) continue;
		fires.push({
			x: car.x + (car.kind === "pickup" ? 16 : car.kind === "sport" ? 18 : Math.floor(car.w / 2)),
			y: baseline + (car.kind === "pickup" ? 6 : car.kind === "sport" ? 8 : 1),
			phase: car.x % 7,
		});
	}
	return { lights, fires };
}

function windowLit(phase: number, time: number) {
	const span = 4.5 + (phase % 41) / 5;
	const local = time + ((phase * 19) % 97) / 97 * span;
	const slot = Math.floor(local / span);
	const into = local / span - slot;
	const roll = Math.abs(Math.sin(phase * 12.9898 + slot * 78.233));
	const blip = 0.045 + (phase % 4) * 0.012;
	if (roll > 0.22) return true;
	if (into < blip) return false;
	return !(roll < 0.08 && into > 0.55 && into < 0.55 + blip);
}

const FLAMES = [
	["....#....", "...###...", "..##.##..", ".###.###.", "..#####.."],
	["...#.#...", "..#####..", ".###.###.", "..#####..", "...###..."],
	["..#...#..", "...###...", "..##.##..", ".#######.", "..#####.."],
	["....#....", "..##.##..", ".###.###.", "..#####..", ".#######."],
];

function paintFire(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, phase: number, still: boolean) {
	const frame = still ? 0 : Math.floor(time * 8 + phase) % FLAMES.length;
	const rows = FLAMES[frame];
	const px = 4;
	rows.forEach((row, ry) => {
		for (let rx = 0; rx < row.length; rx++) {
			if (row[rx] !== "#") continue;
			const hot = ry > 2 || rx === 4;
			ctx.fillStyle = hot ? "#f7f7f7" : "#9a9e9a";
			ctx.fillRect(x - 4 * px + rx * px, y - rows.length * px + ry * px, px, px);
		}
	});
	ctx.fillStyle = "#f4f4f4";
	ctx.fillRect(x - 3 * px, y, 7 * px, px);
	const puff = still ? 3 : Math.floor(time * 4 + phase) % 9;
	ctx.fillStyle = "#5c605c";
	ctx.fillRect(x - px, y - rows.length * px - puff * px, px * 2, px * 2);
	ctx.fillRect(x + 2 * px, y - rows.length * px - ((puff + 4) % 9) * px, px * 2, px);
	if (still) return;
	for (let i = 0; i < 3; i++) {
		const rise = (time * 14 + phase * 2 + i * 5) % 12;
		ctx.fillStyle = rise < 6 ? "#f4f4f4" : "#7a7e7a";
		ctx.fillRect(x - 3 * px + ((i * 3 + frame) % 7) * px, y - rows.length * px - Math.floor(rise) * px, px, px);
	}
}

const STARS = Array.from({ length: 150 }, (_, index) => {
	const rand = mulberry32(80 + index * 17);
	return {
		x: rand(),
		y: rand() * 0.46,
		plus: rand() > 0.78,
		phase: rand() * 20,
	};
});

function paintSky(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, still: boolean) {
	for (const star of STARS) {
		const tick = Math.floor(time * 2.4 + star.phase);
		const bright = still || tick % 5 !== 0;
		if (!bright && !star.plus) continue;
		const sx = Math.round(star.x * width);
		const sy = Math.round(star.y * height);
		ctx.fillStyle = still || tick % 4 === 0 ? "#f4f4f4" : "#8e928e";
		ctx.fillRect(sx, sy, 1, 1);
		if (star.plus && (still || tick % 3 !== 1)) {
			ctx.fillRect(sx - 1, sy, 3, 1);
			ctx.fillRect(sx, sy - 1, 1, 3);
		}
	}

	const cx = Math.round(width * 0.62);
	const cy = Math.round(height * 0.1);
	const radius = Math.max(7, Math.round(height * 0.055));
	ctx.fillStyle = "#f3f3f3";
	for (let y = -radius; y <= radius; y++) {
		const span = Math.floor(Math.sqrt(radius * radius - y * y));
		ctx.fillRect(cx - span, cy + y, span * 2 + 1, 1);
	}
	ctx.fillStyle = "#b7b7b7";
	ctx.fillRect(cx - Math.round(radius * 0.35), cy - Math.round(radius * 0.28), 3, 2);
	ctx.fillRect(cx + Math.round(radius * 0.18), cy + Math.round(radius * 0.22), 2, 2);
	ctx.fillRect(cx - 1, cy + 1, 2, 1);
	ctx.fillStyle = "#8d8d8d";
	ctx.fillRect(cx + radius - 2, cy - 1, 1, 3);
}

function renderStrip(layer: Layer) {
	const baseline = layer.buildings.reduce((max, b) => Math.max(max, b.h + 56), 0);
	const height = baseline + layer.pad;
	const canvas = document.createElement("canvas");
	canvas.width = layer.width;
	canvas.height = height;
	const g = canvas.getContext("2d");
	const decor = collectDecor(layer, baseline);
	if (!g) return { canvas, baseline, ...decor };
	for (const building of layer.buildings) paintBuilding(g, building, baseline, layer);
	if (layer.pad > 0) paintStreet(g, layer.width, baseline, layer.pad);
	for (const car of layer.cars) paintCar(g, car, baseline);
	const near = layer.horizon >= 0.75;
	for (const prop of layer.props) paintProp(g, prop, baseline, near);
	return { canvas, baseline, ...decor };
}

function makeLayers(viewH: number): Layer[] {
	const nearMin = Math.max(CELL * 5, Math.ceil(viewH * 0.12));
	const midMin = Math.max(CELL * 4, Math.ceil(viewH * 0.14));
	const farMin = Math.max(CELL * 3, Math.ceil(viewH * 0.08));
	return [
		{
			...skyline(11, { width: 2200, w0: 2, wSpan: 3, h0: 3, hSpan: 4, signs: false, fires: 0, street: null, minH: farMin }),
			pad: 0,
			speed: 10,
			horizon: 0.62,
			wall: "#222422",
			alt: "#141614",
			win: "#8d938c",
			mortar: "#101210",
			cap: "#3c423c",
			edge: "#0c0e0c",
			shade: null,
			winSize: 4,
			glow: "#d5d5d5",
		},
		{
			...skyline(29, { width: 2400, w0: 2, wSpan: 3, h0: 4, hSpan: 5, signs: false, fires: 1, street: "mid", minH: midMin }),
			pad: 0,
			speed: 22,
			horizon: 0.74,
			wall: "#525652",
			alt: "#2c302c",
			win: "#0e100e",
			mortar: "#2a2e2a",
			cap: "#8a908a",
			edge: "#1c201c",
			shade: "#242824",
			winSize: 6,
			glow: "#f0f0f0",
		},
		{
			...skyline(47, { width: 2600, w0: 2, wSpan: 3, h0: 5, hSpan: 6, signs: true, fires: 4, street: "near", minH: nearMin }),
			pad: 46,
			speed: 36,
			horizon: 0.82,
			wall: "#9a9e9a",
			alt: "#3a3e3a",
			win: "#0a0c0a",
			mortar: "#4a4e4a",
			cap: "#f4f4f4",
			edge: "#242824",
			shade: "#2a2e2a",
			winSize: 8,
			glow: "#ffffff",
		},
	];
}

export default function PixelCity() {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d", { alpha: false });
		if (!ctx) return;

		let strips = makeLayers(800).map((layer) => ({ layer, ...renderStrip(layer) }));
		const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let frame = 0;
		let running = true;
		let builtFor = 0;

		const fit = () => {
			const width = Math.max(1, Math.round(canvas.clientWidth / SCALE));
			const height = Math.max(1, Math.round(canvas.clientHeight / SCALE));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			if (height > 10 && Math.abs(height - builtFor) > 24) {
				strips = makeLayers(height).map((layer) => ({ layer, ...renderStrip(layer) }));
				builtFor = height;
			}
		};

		const draw = (now: number) => {
			fit();
			const width = canvas.width;
			const height = canvas.height;
			const still = motion.matches;
			const time = still ? 0 : now / 1000;
			ctx.imageSmoothingEnabled = false;
			ctx.fillStyle = "#080a08";
			ctx.fillRect(0, 0, width, height);
			paintSky(ctx, width, height, time, still);

			for (const strip of strips) {
				const y = Math.round(height * strip.layer.horizon) - strip.baseline;
				const offset = (time * strip.layer.speed) % strip.layer.width;
				for (let x = -offset; x < width; x += strip.layer.width) {
					const left = Math.round(x);
					ctx.drawImage(strip.canvas, left, y);
					ctx.fillStyle = strip.layer.glow;
					for (const light of strip.lights) {
						const on = still || !light.flicker || windowLit(light.phase, time);
						if (!on) continue;
						ctx.fillRect(left + light.x, y + light.y, light.size, light.size);
					}
					for (const fire of strip.fires) {
						paintFire(ctx, left + fire.x, y + fire.y, time, fire.phase, still);
					}
				}
			}
		};

		const loop = (now: number) => {
			if (!running) return;
			draw(now);
			frame = window.requestAnimationFrame(loop);
		};

		if (motion.matches) draw(0);
		else frame = window.requestAnimationFrame(loop);

		const onResize = () => {
			if (motion.matches) draw(0);
		};
		window.addEventListener("resize", onResize);
		return () => {
			running = false;
			window.cancelAnimationFrame(frame);
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden="true"
			className="pixel-city pointer-events-none fixed inset-0 z-0 h-dvh w-full"
		/>
	);
}
