import { useEffect, useRef } from "react";

/**
 * PixelCity — a Gotham canyon at night.
 * Black stone closes over a wet street. Sodium windows and a few dying signs.
 */

const SCALE = 1;
const CELL = 24;

type Kind = "tenement" | "loft" | "brownstone" | "deco" | "tower" | "warehouse" | "walkup" | "spire" | "gothic" | "civic";
type Building = {
  x: number; w: number; h: number; kind: Kind; palette: number;
  sign: boolean; fire: boolean; escape: boolean; antenna: boolean;
  tank: boolean; ac: boolean; boarded: boolean; dark: boolean; gargoyles: boolean; damage: boolean; rooftopChaos: boolean;
  landmark: "cathedral" | "clock" | "ruin" | "skybridge" | null;
};
type PropKind = "lamp" | "hydrant" | "dumpster" | "trash" | "cone" | "tree" | "phone" | "bollard" | "barrel" | "wreckage" | "signpost";
type Prop = { kind: PropKind; x: number; variant: number };
type Vehicle = "cab" | "sedan" | "van" | "truck";
type Car = { x: number; w: number; kind: Vehicle; color: number; y: number };
type Light = { x: number; y: number; w: number; h: number; phase: number; color: string; flicker: boolean; dying?: boolean };
type Flame = { x: number; y: number; phase: number };
type Tv = { x: number; y: number; w: number; h: number; phase: number };
type Holo = { x: number; y: number; w: number; h: number; phase: number; color: string; variant: number; kind: "figure" | "board"; alpha: number };
type Layer = {
  buildings: Building[]; props: Prop[]; cars: Car[]; width: number; pad: number;
  speed: number; horizon: number; depth: number; palette: number;
};
type RenderedLayer = { layer: Layer; canvas: HTMLCanvasElement; baseline: number; lights: Light[]; flames: Flame[]; tvs: Tv[]; holos: Holo[] };

const BRICK = ["#0c1014", "#10141a", "#120e14", "#080c10", "#10141c", "#070a0e", "#141218"];
const STONE = ["#10141a", "#161a22", "#0c1016", "#1a1e24", "#0e1218"];
const NIGHT_WINDOWS = ["#ff9a3c", "#e8883a", "#ffb15a", "#c46a28", "#ff9a3c", "#a85a22", "#ffc56a", "#6a5a48"];
const NEON = ["#ff9a3c", "#5ce1ff", "#ff6a2a", "#3ee0ff", "#ff4d8d", "#ffd27a"];
const METAL = ["#2a3138", "#3a444c", "#161c22", "#4a545c"];

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n: number) {
  let x = n | 0; x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b); return (x ^ (x >>> 16)) >>> 0;
}
function pick<T>(items: readonly T[], r: () => number): T { return items[Math.floor(r() * items.length)]; }
function rect(g: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  if (w <= 0 || h <= 0) return; g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16); const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${gg},${b})`;
}

function createCity(seed: number, width: number, street: "far" | "mid" | "near", minHeight: number) {
  const r = mulberry32(seed); const buildings: Building[] = []; const props: Prop[] = []; const cars: Car[] = [];
  let x = 0;
  while (x < width) {
    const narrow = street === "near" && r() > 0.83;
    const w = narrow ? 48 + Math.floor(r() * 32) : (street === "near" ? 4 : 3) * CELL + Math.floor(r() * (street === "near" ? 150 : 100));
    let h = Math.max(minHeight, (street === "far" ? 4 : street === "mid" ? 6 : 7) * CELL + Math.floor(r() * (street === "near" ? 300 : 230)));
    const roll = r();
    let kind: Kind = street === "far"
      ? (roll > .55 ? "gothic" : roll > .28 ? "tower" : "civic")
      : roll > .62 ? "gothic" : roll > .46 ? "civic" : roll > .32 ? "tenement"
      : roll > .2 ? "walkup" : roll > .1 ? "tower" : "brownstone";
    if (kind === "deco" || kind === "civic") h += 58;
    if (kind === "tower") h += 72;
    if (kind === "gothic") h += 112;
    if (kind === "brownstone") h = Math.min(h, 240 + Math.floor(r() * 70));
    const landmarkSlot = street === "far" ? -1 : Math.floor(x / 1050) % 4;
    const landmarkRoll = hash(seed + Math.floor(x / 1050) * 97 + Math.floor(x / 180) * 13) % 100;
    const landmark = landmarkRoll < 46
      ? (["cathedral", "clock", "ruin", "skybridge"] as const)[landmarkSlot]
      : null;
    buildings.push({
      x, w, h, kind, palette: Math.floor(r() * (kind === "gothic" || kind === "civic" ? STONE.length : BRICK.length)), sign: (street === "near" && r() > .46) || (street === "mid" && r() > .78),
      fire: street === "near" && r() > .9, escape: street === "near" && (kind === "tenement" || kind === "walkup" || kind === "gothic" || kind === "civic") && r() > .2,
      antenna: r() > .7, tank: street !== "far" && r() > .62, ac: street === "near" && r() > .55,
      boarded: street === "near" && r() > .62, dark: r() > .55,
      gargoyles: (kind === "gothic" || kind === "civic" || kind === "tower") && street !== "far",
      damage: street !== "far", rooftopChaos: street !== "far" && r() > .22, landmark,
    });
    x += Math.max(42, w - (street === "near" ? 10 + Math.floor(r() * 20) : 4 + Math.floor(r() * 12)));
  }
  if (street !== "far") {
    let p = 20;
    while (p < x - 30) {
      const n = r();
      const kind: PropKind = n > .72 ? "wreckage" : n > .55 ? "dumpster" : n > .4 ? "barrel" : n > .28 ? "trash" : n > .16 ? "hydrant" : "lamp";
      if (r() > (street === "mid" ? .4 : .16)) props.push({ kind, x: p, variant: Math.floor(r() * 3) });
      p += 48 + Math.floor(r() * (street === "near" ? 115 : 160));
    }
  }
  if (street === "near") {
    let p = 24; let i = 0;
    while (p < x - 100) {
      if (r() > .3) { const kind: Vehicle[] = ["cab", "sedan", "van", "truck"]; cars.push({ x: p, w: [68, 62, 82, 104][i % 4], kind: kind[i % 4], color: Math.floor(r() * 5), y: 0 }); i++; }
      p += 95 + Math.floor(r() * 120);
    }
  }
  return { buildings, props, cars, width: x };
}

function drawBrickFacade(g: CanvasRenderingContext2D, b: Building, x: number, top: number, baseline: number, base: string, depth: number) {
  const faceW = b.w - Math.max(8, Math.floor(b.w * .13));
  rect(g, shade(base, -26), x + faceW, top, b.w - faceW, baseline - top);
  rect(g, base, x, top, faceW, baseline - top);
  rect(g, shade(base, 25), x, top, faceW, 4);
  rect(g, shade(base, -40), x, baseline - 5, b.w, 5);
  const mortar = shade(base, -18);
  if (depth > .5) {
    for (let y = top + 5; y < baseline - 8; y += 8) {
      rect(g, mortar, x, y, faceW, 1);
      const offset = (Math.floor((y - top) / 8) % 2) * 8;
      for (let xx = x + offset; xx < x + faceW; xx += 16) rect(g, shade(base, -30), xx, y - 3, 1, 4);
    }
    // Irregular soot, rain streaks and patched brickwork: deterministic, never a uniform filter.
    for (let i = 0; i < Math.floor((faceW * (baseline - top)) / 240); i++) {
      const h = hash(b.x * 31 + i * 97 + b.h); const sx = x + h % Math.max(1, faceW - 5);
      const sy = top + ((h >>> 8) % Math.max(1, baseline - top - 12));
      rect(g, h % 4 ? "#05070a" : shade(base, -28), sx, sy, 2 + h % 7, 2 + (h % 14));
    }
  }
  for (let yy = top + 22; yy < baseline - 18; yy += 42) {
    rect(g, shade(base, 10), x, yy, faceW, 2);
    rect(g, "#04060a", x, yy + 2, faceW, 4);
  }
  // Stone lintel / floor bands vary by building family.
  if (b.kind === "gothic" || b.kind === "civic" || b.kind === "deco") {
    rect(g, "#6d7580", x, top, faceW, 5);
    for (let yy = top + 34; yy < baseline - 12; yy += 68) {
      rect(g, shade(base, 17), x, yy, faceW, 3);
      rect(g, shade(base, -24), x, yy + 4, faceW, 2);
    }
  }
  if (b.kind === "brownstone") {
    rect(g, "#5c564e", x, top, faceW, 7); rect(g, "#8a8074", x, top + 7, faceW, 2);
    for (let y = top + 7; y < baseline; y += 48) rect(g, "#5c564e", x, y, faceW, 2);
  } else if (b.kind === "warehouse") {
    for (let y = top + 10; y < baseline; y += 44) rect(g, shade(base, 28), x, y, faceW, 3);
  }
  return faceW;
}

function drawWindow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, _lit: boolean, boarded: boolean) {
  // A plain hole. The stone lip is a real projection, drawn later in perspective.
  rect(g, "#05080c", x, y, w, h);
  rect(g, "#010203", x, y, 2, h);
  rect(g, "#010203", x, y, w, 2);
  if (boarded) {
    rect(g, "#4a3828", x - 1, y + 3, w + 2, 3);
    rect(g, "#4a3828", x + 2, y + h - 6, w - 4, 3);
    rect(g, "#241c16", x + 2, y + 2, 2, h - 4);
  }
  if (seed % 5 === 0) rect(g, "#0a0c10", x + w - 3, y + 4, 2, Math.max(2, h - 8));
}

function drawFireEscape(g: CanvasRenderingContext2D, x: number, top: number, bottom: number, width: number) {
  const iron = "#222a2b"; const edge = "#78817b";
  const floors = Math.max(1, Math.floor((bottom - top - 30) / 54));
  for (let i = 0; i < floors; i++) {
    const y = top + 28 + i * 54;
    rect(g, iron, x, y, width, 3); rect(g, edge, x, y, width, 1);
    rect(g, iron, x, y - 15, 3, 17); rect(g, iron, x + width - 3, y - 15, 3, 17);
    for (let xx = x + 5; xx < x + width - 2; xx += 7) rect(g, edge, xx, y - 13, 1, 12);
    rect(g, iron, x + 3, y + 3, 2, 5); rect(g, iron, x + width - 5, y + 3, 2, 5);
    // A visible angled ladder on alternating floors.
    if (i % 2 === 0) {
      for (let k = 0; k < 7; k++) rect(g, iron, x + width - 8 - k * 3, y + 4 + k * 6, 2, 7);
      for (let k = 0; k < 7; k++) rect(g, edge, x + width - 3 - k * 3, y + 4 + k * 6, 1, 7);
    }
  }
  rect(g, iron, x + 2, top + 10, 2, bottom - top - 8); rect(g, iron, x + width - 4, top + 10, 2, bottom - top - 8);
}

function drawRoof(g: CanvasRenderingContext2D, b: Building, x: number, top: number, faceW: number, base: string) {
  rect(g, "#242a2b", x - 3, top - 4, b.w + 6, 5); rect(g, "#85877b", x - 3, top - 4, b.w + 6, 1);
  if (b.kind === "deco") {
    rect(g, base, x + faceW * .22, top - 28, faceW * .56, 25);
    rect(g, "#7d8794", x + faceW * .22, top - 29, faceW * .56, 3);
    rect(g, base, x + faceW * .36, top - 52, faceW * .28, 24);
    rect(g, "#9aa6b2", x + faceW * .36, top - 53, faceW * .28, 3);
    rect(g, "#22282a", x + faceW * .48, top - 68, 4, 16);
  } else if (b.kind === "tower") {
    rect(g, base, x + faceW * .35, top - 32, faceW * .3, 30);
    rect(g, "#8b939c", x + faceW * .35, top - 34, faceW * .3, 3);
    rect(g, "#171e24", x + faceW * .48, top - 54, 4, 22);
  }
  if (b.kind === "gothic" || b.kind === "civic") {
    // Uneven parapets, lancet turrets and needle-like roof spires.
    const turretX = x + Math.floor(faceW * .18);
    rect(g, "#30363b", x + 5, top - 12, faceW - 10, 9);
    rect(g, "#77746d", x + 5, top - 13, faceW - 10, 2);
    for (let sx = x + 12; sx < x + faceW - 12; sx += 27) {
      rect(g, "#343a40", sx, top - 22, 8, 10);
      rect(g, "#77746d", sx - 2, top - 24, 12, 3);
    }
    rect(g, "#343a40", turretX, top - 53, 22, 42);
    rect(g, "#77746d", turretX - 3, top - 55, 28, 4);
    rect(g, "#252b31", turretX + 8, top - 76, 5, 22);
    rect(g, "#77746d", turretX + 5, top - 79, 11, 4);
    rect(g, "#252b31", turretX + 10, top - 103, 2, 25);
    rect(g, "#a48b6b", turretX + 8, top - 105, 6, 3);
    if (b.kind === "civic") {
      rect(g, "#262d33", x + faceW * .56, top - 38, 27, 26);
      rect(g, "#8d8779", x + faceW * .56 - 3, top - 40, 33, 4);
      rect(g, "#d29a51", x + faceW * .56 + 12, top - 31, 2, 13);
    }
  }
  if (b.rooftopChaos && b.w > 75) {
    const seed = hash(b.x + b.h * 3); const rx = x + 12 + (seed % Math.max(1, faceW - 52));
    // Rooftop clutter: broken vents, satellite dishes, pipes and crooked aerials.
    rect(g, "#171d22", rx, top - 17, 24, 13); rect(g, "#62645d", rx + 3, top - 20, 19, 4);
    rect(g, "#30383b", rx + 5, top - 4, 3, 5); rect(g, "#30383b", rx + 19, top - 4, 3, 5);
    rect(g, "#7c7568", rx + 30, top - 11, 15, 2); rect(g, "#454d4e", rx + 35, top - 22, 2, 12);
    rect(g, "#454d4e", rx + 28, top - 23, 16, 2);
    if (seed % 2 === 0) { rect(g, "#262e32", rx + 47, top - 28, 3, 25); rect(g, "#7c7568", rx + 43, top - 29, 11, 2); }
  }
  if (b.tank) {
    const tx = x + 12 + (hash(b.x) % Math.max(1, Math.floor(faceW / 3)));
    rect(g, "#171d20", tx, top - 35, 43, 28); rect(g, "#6b5845", tx + 2, top - 33, 39, 23);
    rect(g, "#292b29", tx - 3, top - 38, 49, 5); rect(g, "#a58a67", tx - 3, top - 38, 49, 2);
    rect(g, "#252b2c", tx + 7, top - 7, 3, 9); rect(g, "#252b2c", tx + 33, top - 7, 3, 9);
    for (let i = 0; i < 4; i++) rect(g, "#9a7959", tx + 5, top - 30 + i * 6, 34, 1);
  }
  if (b.antenna) {
    const ax = x + Math.floor(faceW * (.25 + (hash(b.x + 17) % 45) / 100));
    rect(g, "#242a2b", ax, top - 48, 2, 45); rect(g, "#77817d", ax - 7, top - 34, 16, 1);
    rect(g, "#77817d", ax - 4, top - 42, 10, 1); rect(g, "#f6b84c", ax - 1, top - 50, 4, 3);
  }
  if (b.kind === "warehouse" || b.kind === "loft") {
    rect(g, "#171d20", x + 8, top - 13, 30, 10); rect(g, "#59605d", x + 11, top - 11, 24, 6);
    rect(g, "#171d20", x + 50, top - 9, 18, 6);
  }
}

function drawTube(g: CanvasRenderingContext2D, lights: Light[], x: number, y: number, w: number, h: number, color: string, seed: number, vertical = false) {
  const parts = Math.max(2, Math.floor((vertical ? h : w) / 8));
  const size = (vertical ? h : w) / parts;
  for (let i = 0; i < parts; i++) {
    const dead = hash(seed + i * 13) % 3 === 0;
    const knocked = hash(seed + i * 7) % 5 === 0;
    const tx = vertical ? x + (knocked ? 3 : 0) : x + i * size;
    const ty = vertical ? y + i * size : y + (knocked ? 5 : 0);
    const tw = vertical ? w : size - 1;
    const th = vertical ? size - 1 : h;
    if (dead) {
      rect(g, "#141a20", tx, ty, tw, th);
      rect(g, "#3a4450", tx + (vertical ? 1 : tw * 0.4), ty + (vertical ? th : h), 1, 5 + hash(seed + i) % 9);
    } else {
      rect(g, color, tx, ty, tw, th);
      rect(g, shade(color, 48), tx, ty, vertical ? 1 : tw, vertical ? th : 1);
      lights.push({ x: tx, y: ty, w: Math.max(1, tw), h: Math.max(1, th), phase: seed + i * 5, color, flicker: false, dying: hash(seed + i) % 4 === 0 });
    }
  }
}

function drawNeon(g: CanvasRenderingContext2D, b: Building, x: number, top: number, faceW: number, baseline: number, lights: Light[]) {
  if (!b.sign) return;
  const seed = hash(b.x * 3 + b.h);
  const color = NEON[seed % NEON.length];
  const y = top + (b.kind === "tower" ? 108 : 52) + (seed % 4) * 26;
  const w = Math.min(faceW - 16, 112);
  const slumped = seed % 3 === 0;
  if (w >= 36 && y + 30 < baseline - 24) {
    rect(g, "#0c1016", x + 8, y, w * 0.55, 28);
    rect(g, "#0c1016", x + 8 + w * 0.55, y + (slumped ? 8 : 0), w * 0.45, 28);
    rect(g, "#243040", x + 8, y, w, 2);
    if (slumped) rect(g, "#3a4450", x + 8 + w * 0.55, y + 28, 2, 8);
    drawTube(g, lights, x + 14, y + 8, w - 28, 4, color, seed);
    drawTube(g, lights, x + 14, y + 16, Math.max(12, w - 44), 3, color, seed + 40);
    rect(g, "#1a222c", x + 14, y - 6, 2, 6);
    if (hash(seed) % 2 === 0) rect(g, "#3a4450", x + w - 8, y + 20, 1, 14);
    else rect(g, "#1a222c", x + w - 8, y - 6, 2, 6);
  }
  if (b.h > 200) {
    const bladeH = 52 + (seed % 36);
    const by = top + 40;
    const bladeX = b.escape ? x + 3 : x + faceW - 16;
    if (by + bladeH < baseline - 30) {
      rect(g, "#0c1016", bladeX, by, 10, bladeH);
      drawTube(g, lights, bladeX + 3, by + 4, 4, bladeH - 8, color, seed + 80, true);
    }
  }
  if (b.kind === "tower" && faceW > 96 && seed % 2 === 0) {
    const bw = Math.min(faceW * 0.62, 128);
    const bx = x + faceW * 0.16;
    const by = top + 18;
    const accent = NEON[(seed + 3) % NEON.length];
    rect(g, "#070b10", bx, by, bw, 58);
    rect(g, "#243040", bx, by, bw, 2);
    if (seed % 5 === 0) rect(g, "#141a20", bx + bw - 18, by + 8, 16, 22);
    drawTube(g, lights, bx + 8, by + 12, bw - 16, 7, color, seed + 120);
    drawTube(g, lights, bx + 8, by + 26, bw - 30, 6, accent, seed + 160);
    drawTube(g, lights, bx + 8, by + 40, bw * 0.42, 5, color, seed + 200);
  }
}

function drawLandmark(g: CanvasRenderingContext2D, b: Building, x: number, top: number, faceW: number) {
  const stone = "#7a8490"; const shadow = "#121820"; const lit = "#ff9a3c";
  if (!b.landmark || faceW < 90) return;
  if (b.landmark === "cathedral") {
    // Tall central nave, twin towers, pointed roofs and a glowing rose window.
    rect(g, shadow, x + faceW * .24, top - 92, faceW * .52, 94);
    rect(g, stone, x + faceW * .27, top - 96, faceW * .46, 5);
    for (const side of [0.12, 0.72]) {
      const sx = x + faceW * side;
      rect(g, shadow, sx, top - 126, faceW * .16, 128);
      rect(g, stone, sx - 3, top - 130, faceW * .16 + 6, 5);
      rect(g, shadow, sx + faceW * .045, top - 164, 5, 35);
      rect(g, stone, sx + faceW * .025, top - 167, 10, 4);
      rect(g, shadow, sx + faceW * .07, top - 184, 2, 19);
    }
    rect(g, "#161d25", x + faceW * .43, top - 76, faceW * .14, 38);
    rect(g, lit, x + faceW * .465, top - 72, faceW * .07, 27);
    rect(g, "#161d25", x + faceW * .47, top - 22, faceW * .06, 22);
    for (let i = 0; i < 5; i++) rect(g, stone, x + faceW * (.31 + i * .08), top - 8, 3, 10);
  } else if (b.landmark === "clock") {
    rect(g, shadow, x + faceW * .31, top - 132, faceW * .38, 134);
    rect(g, stone, x + faceW * .29, top - 136, faceW * .42, 5);
    rect(g, "#171e24", x + faceW * .39, top - 111, faceW * .22, 42);
    rect(g, lit, x + faceW * .415, top - 105, faceW * .17, 30);
    rect(g, "#3a3028", x + faceW * .49, top - 101, 2, 22);
    rect(g, "#3a3028", x + faceW * .45, top - 91, 14, 2);
    rect(g, shadow, x + faceW * .25, top - 155, faceW * .5, 20);
    rect(g, stone, x + faceW * .24, top - 159, faceW * .52, 5);
    rect(g, shadow, x + faceW * .46, top - 190, faceW * .08, 32);
    rect(g, stone, x + faceW * .44, top - 193, faceW * .12, 4);
    rect(g, shadow, x + faceW * .49, top - 213, 3, 21);
  } else if (b.landmark === "ruin") {
    // Broken crown and exposed steel ribs deliberately interrupt the roofline.
    rect(g, "#171e24", x + faceW * .12, top - 18, faceW * .76, 20);
    for (let i = 0; i < 8; i++) {
      const sx = x + faceW * (.16 + i * .095);
      const height = 20 + hash(b.x + i * 41) % 65;
      rect(g, shadow, sx, top - height, 7, height);
      if (i % 2 === 0) rect(g, "#9a7654", sx + 7, top - height + 8, 3, height - 8);
    }
    rect(g, "#9a7654", x + faceW * .2, top - 72, 2, 68);
    rect(g, "#9a7654", x + faceW * .78, top - 48, 2, 45);
  } else if (b.landmark === "skybridge") {
    // A covered bridge projects from the rooftop toward the next block.
    const bx = x + faceW - 2; const by = top - 52; const bw = Math.max(64, faceW * .72);
    rect(g, shadow, bx, by, bw, 30);
    rect(g, stone, bx, by, bw, 4);
    rect(g, "#5ce1ff", bx + 10, by + 9, bw - 20, 3);
    rect(g, "#161e25", bx + 8, by + 7, bw - 16, 17);
    for (let sx = bx + 12; sx < bx + bw - 8; sx += 18) rect(g, "#9a8d79", sx, by + 5, 2, 23);
    rect(g, shadow, bx + 4, by + 30, 5, 18);
    rect(g, shadow, bx + bw - 9, by + 30, 5, 18);
  }
}

function drawBuilding(g: CanvasRenderingContext2D, b: Building, baseline: number, layer: Layer, lights: Light[], tvs: Tv[], extras?: { openings: Opening[]; overhangs: Overhang[] }) {
  const x = b.x; const top = baseline - b.h; const stone = b.kind === "gothic" || b.kind === "civic" || b.kind === "deco" || b.kind === "tower"; const palette = stone ? STONE : BRICK; const base = layer.depth < .45 ? ["#10161e", "#141a22", "#181e28"][b.palette % 3] : palette[b.palette % palette.length];
  const faceW = drawBrickFacade(g, b, x, top, baseline, base, layer.depth);
  drawRoof(g, b, x, top, faceW, base);
  drawLandmark(g, b, x, top, faceW);
  const floorGap = b.kind === "warehouse" ? 46 : b.kind === "brownstone" ? 42 : b.kind === "gothic" || b.kind === "civic" ? 48 : 38;
  const winW = b.kind === "warehouse" ? 24 : b.kind === "brownstone" ? 13 : b.kind === "gothic" || b.kind === "civic" ? 12 : 15;
  const winH = b.kind === "warehouse" ? 27 : b.kind === "gothic" || b.kind === "civic" ? 29 : 21;
  const cols = Math.max(1, Math.floor((faceW - 16) / (winW + (b.kind === "warehouse" ? 14 : 12))));
  let row = 0;
  for (let y = top + 17; y + winH < baseline - 12; y += floorGap) {
    const offset = row % 2 ? 5 : 0;
    for (let col = 0; col < cols; col++) {
      const wx = x + 10 + offset + col * (winW + (b.kind === "warehouse" ? 14 : 12));
      if (wx + winW > x + faceW - 5) continue;
      const seed = hash(b.x * 13 + row * 37 + col * 19 + b.palette);
      const boarded = b.boarded && seed % 9 === 0;
      const litChance = layer.depth > .7 ? 54 : layer.depth > .4 ? 42 : 30;
      const canLight = !b.dark && !boarded && seed % 100 < litChance;
      const isTv = canLight && winW >= 12 && layer.depth > .4 && seed % 5 === 0;
      if (isTv) {
        rect(g, "#070b10", wx - 5, y - 6, winW + 10, winH + 16);
        rect(g, "#8aa0a8", wx - 5, y - 6, winW + 10, 3);
        rect(g, "#d7e4ea", wx + 2, y - 16, 1, 11);
        rect(g, "#d7e4ea", wx + winW - 3, y - 15, 1, 10);
        rect(g, "#d7e4ea", wx - 2, y - 16, 5, 1);
        rect(g, "#d7e4ea", wx + winW - 3, y - 15, 5, 1);
        rect(g, "#c5d0d6", wx + winW * 0.2, y + winH + 6, winW * 0.6, 3);
        rect(g, "#1a222c", wx + winW * 0.32, y + winH + 9, 2, 5);
        rect(g, "#1a222c", wx + winW * 0.58, y + winH + 9, 2, 5);
        const dead = seed % 3 === 0;
        const screenH = dead ? Math.max(3, Math.floor((winH - 4) * 0.45)) : Math.max(3, winH - 4);
        lights.push({
          x: wx + 2, y: y + 2, w: Math.max(2, winW - 4), h: screenH,
          phase: seed + b.x * 0.17, color: seed % 2 ? "#d7fbff" : "#ffe0b0", flicker: false, dying: dead,
        });
        if (dead) {
          for (let k = 0; k < 4; k++) rect(g, k % 2 ? "#152028" : "#3a2a22", wx + 2, y + screenH + 3 + k * 2, winW - 4, 1);
        }
        tvs.push({ x: wx + 2, y: y + 2, w: Math.max(2, winW - 4), h: screenH, phase: seed });
      } else {
      // Keep the architectural frame and mullions permanently painted. The
      // animated inset glow is composited later, so lights never erase them.
      drawWindow(g, wx, y, winW, winH, seed, false, boarded);
      if (extras && b.w > 0) {
        extras.openings.push({
          u0: (wx - b.x) / b.w,
          u1: (wx + winW - b.x) / b.w,
          yTop: baseline + 2 - y,
          yBot: baseline + 2 - (y + winH),
        });
      }
      if ((b.kind === "gothic" || b.kind === "civic") && layer.depth > .45) {
        // Stone voussoirs and pointed-arch crowns around narrow Gothic windows.
        rect(g, "#252c32", wx - 3, y - 5, winW + 6, 3);
        rect(g, "#8c8980", wx - 2, y - 7, 2, 5);
        rect(g, "#8c8980", wx + winW, y - 7, 2, 5);
        rect(g, "#343a40", wx + Math.floor(winW / 2) - 2, y - 9, 4, 4);
      }
      if (canLight) lights.push({
        x: wx + 1, y: y + 1, w: Math.max(1, winW - 2), h: Math.max(1, winH - 2),
        phase: seed + b.x * 0.17 + row * 3.1 + col * 5.7,
        color: NIGHT_WINDOWS[seed % NIGHT_WINDOWS.length], flicker: true,
      });
      if (b.ac && layer.depth > .7 && seed % 4 === 0) {
        rect(g, "#272f31", wx + 2, y + winH + 2, winW - 4, 7);
        rect(g, "#9a9a87", wx + 4, y + winH + 3, winW - 8, 1);
        rect(g, "#171d20", wx + 5, y + winH + 5, winW - 10, 2);
      }
      }
    }
    row++;
  }
  // One continuous, multi-storey iron escape per eligible facade.
  // On the street it is a real cage over the sidewalk. The flat paint is only
  // for the unused side-on strip.
  if (b.escape && layer.depth > .7) {
    if (extras && b.w > 0) {
      const floors = Math.max(1, Math.floor((baseline - top - 48) / 54));
      for (let i = 0; i < floors; i++) {
        if (hash(b.x + i * 41) % 5 === 0) continue;
        const deck = top + 28 + i * 54;
        extras.overhangs.push({
          u0: (x + faceW - 36 - b.x) / b.w,
          u1: (x + faceW - 4 - b.x) / b.w,
          y: baseline + 2 - deck,
          thick: 3,
          reach: 14 + (hash(b.x + i * 19) % 6),
          kind: "escape",
          ladder: i % 2 === 0,
        });
      }
    } else {
      drawFireEscape(g, x + faceW - 29, top + 10, baseline - 8, 26);
    }
  }
  if (extras && b.w > 0 && (b.kind === "tenement" || b.kind === "walkup" || b.kind === "loft" || b.kind === "brownstone") && b.h > 120) {
    const floors = Math.floor((baseline - 12 - (top + 17)) / floorGap);
    const spots = floors > 4 ? [1, 3] : [1];
    for (const floor of spots) {
      if (floor >= floors) continue;
      const deck = top + 17 + floor * floorGap + winH + 1;
      const x1 = x + Math.min(faceW * 0.58, faceW - 42);
      if (x1 - (x + 8) < 28) continue;
      extras.overhangs.push({
        u0: (x + 8 - b.x) / b.w,
        u1: (x1 - b.x) / b.w,
        y: baseline + 2 - deck,
        thick: 5,
        reach: 14,
        kind: "balcony",
        ladder: false,
      });
    }
  }
  // Cornice, drainpipes, lintels and foundation detail.
  rect(g, "#252c2d", x + faceW - 5, top + 5, 3, baseline - top - 8);
  rect(g, "#8e8879", x + 2, baseline - 9, faceW - 4, 2);
  if (layer.depth > .7) {
    const pipeX = x + faceW - 8;
    rect(g, "#303b3a", pipeX, top + 2, 3, baseline - top - 4);
    for (let yy = top + 35; yy < baseline - 10; yy += 54) rect(g, "#8a806e", pipeX - 2, yy, 7, 2);
    for (let xx = x + 4; xx < x + faceW - 8; xx += 32) rect(g, "#aa9678", xx, baseline - 13, 22, 2);
  }
  if (b.kind === "brownstone") {
    rect(g, "#b6a087", x, baseline - 45, faceW, 4);
    rect(g, "#292e30", x + faceW / 2 - 9, baseline - 39, 18, 39);
    rect(g, "#d0b99a", x + faceW / 2 - 12, baseline - 42, 24, 4);
  }
  if (b.kind === "warehouse") {
    for (let xx = x + 10; xx < x + faceW - 12; xx += 48) {
      rect(g, "#151c20", xx, baseline - 65, 35, 48); rect(g, "#8b8170", xx, baseline - 65, 35, 3);
      for (let k = 1; k < 5; k++) rect(g, "#4d5a5c", xx + k * 7, baseline - 62, 2, 43);
    }
  }
  if (b.boarded) {
    rect(g, "#6d4c37", x + 5, baseline - 82, 26, 4); rect(g, "#6d4c37", x + 5, baseline - 72, 26, 4);
    rect(g, "#332c27", x + 7, baseline - 82, 3, 14);
  }
  // Dark stone pilasters and inset vertical ribs give the larger blocks weight.
  if ((b.kind === "gothic" || b.kind === "civic") && layer.depth > .45) {
    for (let px = x + 5; px < x + faceW - 5; px += Math.max(32, Math.floor(faceW / 4))) {
      rect(g, "#30363a", px, top + 5, 4, baseline - top - 14);
      rect(g, "#858076", px + 4, top + 5, 2, baseline - top - 14);
      for (let yy = top + 16; yy < baseline - 20; yy += 48) rect(g, "#282f34", px - 2, yy, 9, 3);
    }
    // Sculpted pixel gargoyles perched on the facade: head, horns, wings and claws.
    if (b.gargoyles) for (let gx = x + 16; gx < x + faceW - 16; gx += 52) {
      const gy = top + 7; const stoneHi = "#969084"; const stoneLo = "#20272d";
      rect(g, stoneLo, gx + 2, gy + 7, 20, 10); rect(g, "#4c5357", gx + 5, gy + 4, 14, 9);
      rect(g, stoneHi, gx + 8, gy + 1, 9, 8); rect(g, stoneHi, gx + 6, gy - 3, 3, 5); rect(g, stoneHi, gx + 16, gy - 3, 3, 5);
      rect(g, "#171e24", gx + 9, gy + 4, 2, 2); rect(g, "#171e24", gx + 15, gy + 4, 2, 2);
      rect(g, "#343b40", gx, gy + 8, 7, 12); rect(g, "#343b40", gx + 19, gy + 8, 7, 12);
      rect(g, stoneHi, gx - 2, gy + 7, 5, 3); rect(g, stoneHi, gx + 22, gy + 7, 5, 3);
      rect(g, stoneLo, gx + 7, gy + 15, 3, 5); rect(g, stoneLo, gx + 17, gy + 15, 3, 5);
      rect(g, "#a64d3e", gx + 11, gy + 7, 2, 2);
    }
    // Broken masonry, missing stones and black water scars make the facade feel old.
    if (b.damage) for (let i = 0; i < 7; i++) {
      const seed = hash(b.x * 17 + i * 131); const dx = x + 8 + seed % Math.max(1, faceW - 18);
      const dy = top + 24 + ((seed >>> 8) % Math.max(1, baseline - top - 45));
      rect(g, seed % 3 ? "#20282d" : "#8a7967", dx, dy, 3 + seed % 7, 2 + seed % 5);
      if (seed % 2 === 0) rect(g, "#151c21", dx + 2, dy + 4, 2, 8);
    }
  }
  drawNeon(g, b, x, top, faceW, baseline, lights);
  if (b.fire) {
    const fx = x + Math.floor(faceW * .65); rect(g, "#ffb04c", fx, top - 10, 5, 11); rect(g, "#ff5c35", fx + 2, top - 17, 3, 8);
    rect(g, "#6d7775", fx - 3, top - 26, 4, 5);
  }
}

function drawProp(g: CanvasRenderingContext2D, p: Prop, baseline: number, depth: number, lights: Light[]) {
  const x = p.x; const near = depth > .7;
  if (p.kind === "lamp") {
    rect(g, "#252d30", x + 5, baseline - 82, 4, 82); rect(g, "#78817b", x + 4, baseline - 82, 2, 82);
    rect(g, "#252d30", x + 5, baseline - 84, 24, 4);     rect(g, "#ffb15a", x + 23, baseline - 82, 10, 5);
    rect(g, "#ffe0a8", x + 25, baseline - 81, 6, 2);
    lights.push({ x: x + 21, y: baseline - 79, w: 16, h: 8, phase: x, color: "#ff9a3c", flicker: false }); return;
  }
  if (p.kind === "hydrant") {
    rect(g, "#a83e32", x + 5, baseline - 18, 13, 18); rect(g, "#d65b3e", x + 3, baseline - 15, 17, 5);
    rect(g, "#d65b3e", x + 7, baseline - 23, 9, 6); rect(g, "#e4b26c", x + 5, baseline - 24, 13, 3);
    rect(g, "#6c2925", x + 1, baseline - 12, 5, 7); rect(g, "#6c2925", x + 17, baseline - 12, 5, 7); return;
  }
  if (p.kind === "dumpster") {
    rect(g, "#233c38", x, baseline - 30, 39, 30); rect(g, "#547064", x - 2, baseline - 34, 43, 6);
    rect(g, "#182b29", x + 5, baseline - 24, 29, 2); rect(g, "#718477", x + 4, baseline - 4, 31, 2);
    rect(g, "#111a1b", x + 4, baseline - 2, 6, 3); rect(g, "#111a1b", x + 29, baseline - 2, 6, 3); return;
  }
  if (p.kind === "trash") {
    rect(g, "#252a2b", x, baseline - 11, 12, 11); rect(g, "#a18b73", x + 3, baseline - 14, 7, 3);
    rect(g, "#5c5247", x + 12, baseline - 7, 11, 7); rect(g, "#b7a18a", x + 15, baseline - 10, 7, 3); return;
  }
  if (p.kind === "cone") {
    rect(g, "#e46c38", x + 6, baseline - 17, 7, 13); rect(g, "#f2e2c6", x + 5, baseline - 11, 9, 3);
    rect(g, "#e46c38", x + 2, baseline - 4, 15, 4); return;
  }
  if (p.kind === "phone") {
    rect(g, "#273d3c", x + 3, baseline - 48, 25, 48); rect(g, "#9a8060", x + 1, baseline - 50, 29, 4);
    rect(g, "#5ce1ff", x + 7, baseline - 42, 17, 20); rect(g, "#101820", x + 9, baseline - 39, 13, 14);
    rect(g, "#e6c77d", x + 11, baseline - 18, 9, 4); return;
  }
  if (p.kind === "bollard") { rect(g, "#a28d6d", x + 5, baseline - 18, 6, 18); rect(g, "#ded0ad", x + 4, baseline - 19, 8, 3); return; }
  if (p.kind === "barrel") {
    rect(g, "#252c2d", x + 4, baseline - 25, 17, 25); rect(g, "#704c37", x + 6, baseline - 23, 13, 20);
    rect(g, "#9a7959", x + 4, baseline - 20, 17, 3); rect(g, "#292e30", x + 4, baseline - 8, 17, 2); return;
  }
  if (p.kind === "wreckage") {
    rect(g, "#242b2e", x, baseline - 9, 34, 7); rect(g, "#6a5140", x + 5, baseline - 17, 18, 8);
    rect(g, "#343d40", x + 11, baseline - 23, 15, 7); rect(g, "#a04c39", x + 2, baseline - 11, 5, 3);
    rect(g, "#151b1f", x + 3, baseline - 3, 8, 5); rect(g, "#151b1f", x + 25, baseline - 3, 8, 5); return;
  }
  if (p.kind === "signpost") {
    rect(g, "#292f32", x + 12, baseline - 63, 3, 63); rect(g, "#52605f", x + 2, baseline - 61, 23, 2);
    rect(g, "#313b3e", x - 3, baseline - 57, 34, 13);     rect(g, "#5ce1ff", x, baseline - 55, 18, 2);
    rect(g, "#ff9a3c", x + 18, baseline - 51, 10, 2); return;
  }
  // Sparse street trees: dark, angular foliage with a few sodium-lit edges.
  rect(g, "#342a25", x + 12, baseline - 35, 7, 35);
  rect(g, near ? "#182c27" : "#172328", x + 3, baseline - 69, 25, 19);
  rect(g, near ? "#20372d" : "#1b292c", x, baseline - 55, 34, 18);
  rect(g, "#304438", x + 8, baseline - 71, 12, 5);
}

function drawCar(g: CanvasRenderingContext2D, car: Car, baseline: number) {
  const x = car.x; const y = baseline + 2;
  const colors = ["#14181e", "#101418", "#1c1814", "#0e1216", "#161c22"];
  const body = colors[car.color];
  const width = car.w;
  rect(g, "#0c1115", x + 3, y + 9, width - 6, 15);
  rect(g, body, x + 5, y + 5, width - 12, 15);
  rect(g, shade(body, 28), x + 10, y + 5, width - 22, 3);
  rect(g, "#18262d", x + 16, y, width - 34, 9);
  rect(g, "#91a6a6", x + 18, y + 2, Math.max(7, (width - 38) / 2), 5);
  rect(g, "#18262d", x + width / 2, y + 1, 2, 8);
  rect(g, "#ffc56a", x + width - 9, y + 10, 5, 4);
  rect(g, car.color % 2 ? "#5ce1ff" : "#ff4d6a", x + 4, y + 11, 4, 4);
  rect(g, "#15191c", x + 12, y + 18, 13, 10); rect(g, "#15191c", x + width - 28, y + 18, 13, 10);
  rect(g, "#777c78", x + 15, y + 21, 7, 4); rect(g, "#777c78", x + width - 25, y + 21, 7, 4);
  if (car.kind === "cab") { rect(g, "#ffb15a", x + width / 2 - 8, y - 5, 17, 5); rect(g, "#1a120c", x + width / 2 - 5, y - 4, 11, 2); }
  if (car.kind === "van" || car.kind === "truck") rect(g, "#a18b73", x + width - 15, y + 6, 3, 10);
}

function drawRoad(g: CanvasRenderingContext2D, width: number, baseline: number, pad: number) {
  rect(g, "#3a424c", 0, baseline, width, 3); rect(g, "#1a2028", 0, baseline + 3, width, 7);
  rect(g, "#0c1016", 0, baseline + 10, width, pad - 10);
  // Sodium and cyan streaks in the wet asphalt.
  for (let x = 7; x < width; x += 73) {
    const h = hash(x * 13);
    rect(g, h % 2 ? "rgba(255,154,60,.22)" : "rgba(92,225,255,.18)", x, baseline + 17 + h % 23, 12 + h % 28, 2);
    rect(g, "rgba(180,210,220,.10)", x + 5, baseline + 21 + h % 17, 4 + h % 12, 1);
  }
  for (let x = 12; x < width; x += 96) rect(g, "#6a7c86", x, baseline + 30, 38, 2);
  for (let x = 0; x < width; x += 24) rect(g, "#343a3c", x, baseline + 3, 1, 7);
  // Pothole patches and oily reflections.
  for (let x = 18; x < width; x += 137) {
    rect(g, "#101619", x, baseline + 17 + (hash(x) % 15), 18 + hash(x + 2) % 25, 2);
    rect(g, "#4a4840", x + 5, baseline + 20 + (hash(x) % 12), 8, 1);
  }
}

function collectLights(layer: Layer, baseline: number) {
  const lights: Light[] = []; const flames: Flame[] = [];
  for (const b of layer.buildings) {
    const top = baseline - b.h;
    const seed = hash(b.x * 19 + b.h * 7 + layer.palette * 101);
    // Small roof/facade fires are frequent enough to punctuate the skyline,
    // while larger flare-ups remain rare.
    if (b.fire || (layer.depth > .45 && seed % 100 < 13)) {
      flames.push({ x: b.x + 18 + (seed % Math.max(1, b.w - 36)), y: top - 7, phase: seed % 31 });
    }
    if (layer.depth > .7 && seed % 100 < 7) {
      flames.push({ x: b.x + 10 + (seed % Math.max(1, b.w - 20)), y: baseline - 30, phase: (seed >>> 5) % 29 });
    }
  }
  for (const p of layer.props) {
    const seed = hash(Math.floor(p.x) * 23 + p.variant * 71);
    if ((p.kind === "wreckage" || p.kind === "barrel") && seed % 100 < 58) {
      flames.push({ x: p.x + 12, y: baseline - 17, phase: seed % 23 });
    }
  }
  return { lights, flames };
}
function drawCable(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, sag: number, color: string) {
  const steps = Math.max(6, Math.floor(Math.abs(x1 - x0) / 3));
  let px = Math.round(x0);
  let py = Math.round(y0);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const ix = Math.round(x0 + (x1 - x0) * t);
    const iy = Math.round(y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag);
    rect(g, color, Math.min(px, ix), iy, Math.abs(ix - px) + 1, 2);
    if (iy !== py) rect(g, color, ix, Math.min(py, iy), 2, Math.abs(iy - py));
    px = ix;
    py = iy;
  }
}

function drawCables(g: CanvasRenderingContext2D, buildings: Building[], baseline: number, depth: number) {
  const sorted = [...buildings].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const seed = hash(a.x * 5 + b.x);
    const strands = depth > 0.7 ? 2 + (seed % 3) : 1 + (seed % 2);
    for (let s = 0; s < strands; s++) {
      const x0 = a.x + 6 + ((seed + s * 17) % Math.max(1, a.w - 10));
      const x1 = b.x + 4 + ((seed >> (s + 1)) % Math.max(1, b.w - 8));
      const y0 = baseline - a.h - 4 + s * 8;
      const y1 = baseline - b.h + ((seed >> 3) % 24) + s * 6;
      const sag = 12 + (seed % 30) + s * 10;
      const tone = (seed + s) % 4;
      const color = tone === 0 ? "#6a5038" : tone === 1 ? "#245058" : "#4a5562";
      drawCable(g, x0, y0, x1, y1, sag, color);
      if (s === strands - 1) {
        const dropX = x0 + (x1 - x0) * 0.42;
        const dropY = (y0 + y1) / 2 + sag;
        rect(g, color, dropX, dropY, 2, 16 + (seed % 36));
      }
    }
  }
}

function collectHolos(buildings: Building[], baseline: number, depth: number, horizon: number, viewH: number): Holo[] {
  if (depth > 0.7) return [];
  const far = depth < 0.4;
  const sorted = [...buildings].sort((a, b) => a.x - b.x);
  const holos: Holo[] = [];
  const gapNeeded = far ? 780 : 540;
  const minY = 20 - horizon * viewH + baseline;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const seam = Math.round((a.x + a.w + b.x) / 2);
    if (holos.length && seam - holos[holos.length - 1].x < gapNeeded) continue;
    const seed = hash(a.x * 11 + b.x * 3 + i * 17 + Math.floor(depth * 50));
    if (seed % 100 > (far ? 28 : 40)) continue;
    const kind: Holo["kind"] = seed % 3 === 0 ? "board" : "figure";
    const h = kind === "board" ? (far ? 72 : 120) : (far ? 110 : 188);
    const w = kind === "board" ? Math.round(h * 1.35) : Math.round(h * 0.4);
    const roof = baseline - Math.min(a.h, b.h);
    holos.push({
      x: seam - w * 0.35,
      y: Math.max(minY, roof - Math.round(h * 0.62)),
      w, h,
      phase: seed % 120,
      color: seed % 2 ? "#b7c6cf" : "#c4a06a",
      variant: (seed >>> 4) % 4,
      kind,
      alpha: far ? 0.26 : 0.38,
    });
  }
  return holos;
}

function paintFigure(g: CanvasRenderingContext2D, holo: Holo, x: number, y: number) {
  const s = holo.h / 80;
  const c = holo.color;
  const dim = shade(c, -70);
  const ink = "#07090c";
  const px = (nx: number, ny: number, w: number, h: number, color = dim) =>
    rect(g, color, x + nx * s, y + ny * s, Math.max(1, w * s), Math.max(1, h * s));
  if (holo.variant === 1) {
    px(6, 4, 20, 2, c);
    px(10, 0, 12, 6);
    px(12, 6, 8, 8);
    px(13, 8, 6, 2, ink);
    px(8, 14, 16, 48);
    px(6, 16, 3, 30);
    px(23, 16, 3, 28);
    px(14, 22, 1, 10, c);
    px(10, 62, 5, 16);
    px(17, 62, 5, 16);
    return;
  }
  if (holo.variant === 2) {
    px(7, 3, 16, 2, c);
    px(10, 0, 10, 5);
    px(11, 5, 8, 7);
    px(12, 7, 6, 2, ink);
    px(8, 12, 14, 52);
    px(6, 14, 2, 36);
    px(22, 14, 2, 34);
    px(15, 18, 1, 6, c);
    px(9, 64, 4, 14);
    px(17, 64, 4, 14);
    return;
  }
  if (holo.variant === 3) {
    px(10, 0, 10, 14);
    px(8, 12, 14, 4);
    px(11, 4, 8, 2, ink);
    px(9, 16, 12, 40);
    px(18, 22, 1, 28, c);
    px(10, 56, 4, 20);
    px(16, 56, 4, 20);
    return;
  }
  px(9, 0, 12, 16);
  px(7, 14, 16, 6);
  px(11, 6, 8, 2, ink);
  px(8, 20, 14, 42);
  px(6, 22, 2, 26);
  px(22, 22, 2, 24);
  px(10, 62, 4, 16);
  px(16, 62, 4, 16);
}

function paintBillboard(g: CanvasRenderingContext2D, holo: Holo, x: number, y: number, time: number) {
  const { w, h, color, variant } = holo;
  const dim = shade(color, -78);
  const dead = Math.sin(time * 1.4 + holo.phase) < -0.35;
  rect(g, color, x, y, w * 0.28, 2);
  rect(g, dim, x + w * 0.62, y, w * 0.22, 2);
  rect(g, dim, x, y + h - 2, w * 0.18, 2);
  rect(g, color, x, y, 2, h * 0.36);
  rect(g, dim, x + w - 2, y + h * 0.4, 2, h * 0.4);
  if (dead) return;
  if (variant === 1) {
    rect(g, dim, x + w * 0.28, y + h * 0.22, w * 0.44, h * 0.34);
    rect(g, "#07090c", x + w * 0.4, y + h * 0.3, w * 0.1, h * 0.16);
    rect(g, color, x + w * 0.36, y + h * 0.66, w * 0.28, 2);
    return;
  }
  if (variant === 2) {
    for (let i = 0; i < 6; i++) {
      if ((holo.phase + i) % 3 === 0) continue;
      rect(g, i % 2 ? dim : color, x + w * 0.38, y + 8 + i * (h * 0.12), 2, h * 0.08);
    }
    rect(g, dim, x + 8, y + h * 0.2, w * 0.22, h * 0.55);
    return;
  }
  if (variant === 3) {
    rect(g, dim, x + 8, y + h * 0.18, 3, h * 0.6);
    rect(g, dim, x + w * 0.28, y + h * 0.28, w * 0.36, 2);
    rect(g, color, x + w * 0.28, y + h * 0.4, w * 0.22, 2);
    rect(g, dim, x + w * 0.28, y + h * 0.52, w * 0.3, 2);
    return;
  }
  rect(g, dim, x + 8, y + h * 0.16, w * 0.22, h * 0.62);
  rect(g, "#07090c", x + 8 + w * 0.08, y + h * 0.28, w * 0.05, 2);
  rect(g, color, x + w * 0.4, y + h * 0.22, w * 0.34, 2);
  rect(g, dim, x + w * 0.4, y + h * 0.36, w * 0.22, 2);
  rect(g, dim, x + w * 0.4, y + h * 0.48, w * 0.28, 2);
}

function paintHolo(g: CanvasRenderingContext2D, holo: Holo, left: number, top: number, time: number) {
  const glitch = Math.sin(time * 8 + holo.phase) > 0.9 ? (holo.phase % 2 ? 5 : -5) : 0;
  g.globalAlpha = holo.alpha + 0.08 * Math.sin(time * 2.1 + holo.phase);
  const x = left + holo.x + glitch;
  const y = top + holo.y;
  if (holo.kind === "board") paintBillboard(g, holo, x, y, time);
  else paintFigure(g, holo, x, y);
  g.globalAlpha = holo.alpha * 0.45;
  const bands = Math.max(5, Math.floor(holo.h / 16));
  for (let i = 0; i < bands; i++) {
    const sy = (Math.floor(time * 14 + holo.phase) + i * 8) % Math.max(1, holo.h);
    rect(g, "#061018", x, y + sy, holo.w, 2);
  }
  g.globalAlpha = 1;
}

function renderStrip(layer: Layer, viewH: number): RenderedLayer {
  const baseline = layer.buildings.reduce((m, b) => Math.max(m, b.h + 140), 0);
  const canvas = document.createElement("canvas"); canvas.width = layer.width; canvas.height = baseline + layer.pad;
  const g = canvas.getContext("2d"); const { lights, flames } = collectLights(layer, baseline);
  const tvs: Tv[] = [];
  const holos = collectHolos(layer.buildings, baseline, layer.depth, layer.horizon, viewH);
  if (g) {
    for (const b of layer.buildings) drawBuilding(g, b, baseline, layer, lights, tvs);
    drawCables(g, layer.buildings, baseline, layer.depth);
    if (layer.pad) drawRoad(g, layer.width, baseline, layer.pad);
    for (const car of layer.cars) drawCar(g, car, baseline);
    for (const p of layer.props) drawProp(g, p, baseline, layer.depth, lights);
  }
  return { layer, canvas, baseline, lights, flames, tvs, holos };
}

function paintNightSky(g: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const gradient = g.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#040605"); gradient.addColorStop(.45, "#070a09"); gradient.addColorStop(.78, "#0c100e"); gradient.addColorStop(1, "#1a120e");
  g.fillStyle = gradient; g.fillRect(0, 0, width, height);
  // Heavy storm clouds: layered, broken pixel masses instead of a clean starry sky.
  const cloudR = mulberry32(177);
  for (let i = 0; i < 24; i++) {
    const drift = Math.floor(time * (i % 3 + 1) * 2);
    const cx = (i * 137 + drift) % (width + 240) - 120;
    const cy = 24 + (i * 43) % Math.max(60, Math.floor(height * .48));
    const cw = 45 + Math.floor(cloudR() * 100);
    rect(g, "rgba(5,9,16,.24)", cx, cy, cw, 7);
    rect(g, "rgba(69,75,82,.17)", cx + 9, cy - 5, cw * .62, 5);
    rect(g, "rgba(105,91,83,.10)", cx + 20, cy + 7, cw * .7, 3);
  }
  // Dirty amber city glow sits low beneath the storm ceiling.
  const glow = g.createLinearGradient(0, height * .55, 0, height);
  glow.addColorStop(0, "rgba(8,10,8,0)"); glow.addColorStop(.62, "rgba(18,16,12,.18)"); glow.addColorStop(1, "rgba(90,42,16,.16)");
  g.fillStyle = glow; g.fillRect(0, height * .5, width, height * .5);
  // Persistent rain slants across the scene. Pixel-sized and intentionally uneven.
  for (let i = 0; i < Math.floor(width * .11); i++) {
    const seed = hash(i * 71 + 19);
    const x = (seed % width + Math.floor(time * (24 + seed % 24))) % width;
    const y = (Math.floor(seed / 7) % height + Math.floor(time * (95 + seed % 65))) % height;
    rect(g, "rgba(140,148,140,.08)", x, y, 1, 5 + seed % 7);
  }
  // Distant aircraft beacons and sparse high-rise lights, not a field of stars.
  for (let i = 0; i < 14; i++) {
    const x = (i * 173 + 47) % width; const y = 28 + (i * 31) % Math.max(40, Math.floor(height * .34));
    if (Math.sin(time * 1.2 + i * 2.1) > .15) rect(g, i % 3 === 0 ? "#ff9a3c" : "#9fd7e4", x, y, 2, 2);
  }
  // Bat silhouettes cut across the storm clouds; tiny, angular and intermittent.
  for (let i = 0; i < 7; i++) {
    const seed = hash(i * 997 + 31); const bx = (seed % width + Math.floor(time * (12 + i * 2))) % width;
    const by = Math.floor(height * (.16 + (seed % 37) / 100)); const flap = Math.floor(time * 8 + i) % 2;
    rect(g, "#080e16", bx, by, 3, 2); rect(g, "#080e16", bx - 3, by - (flap ? 3 : 1), 3, 2);
    rect(g, "#080e16", bx + 3, by - (flap ? 3 : 1), 3, 2); rect(g, "#080e16", bx - 5, by - (flap ? 1 : 3), 2, 2);
    rect(g, "#080e16", bx + 5, by - (flap ? 1 : 3), 2, 2);
  }
  // Distant lightning briefly silhouettes the skyline without washing out the palette.
  const flash = Math.max(0, Math.sin(time * .53 + 1.4) - .986);
  if (flash > 0) { g.fillStyle = `rgba(143,165,183,${flash * 2.5})`; g.fillRect(0, 0, width, height * .72); }
  // Low drifting fog softens the skyline silhouette without blurring pixel edges.
  const fog = g.createLinearGradient(0, height * .66, 0, height);
  fog.addColorStop(0, "rgba(90,120,130,0)"); fog.addColorStop(.55, "rgba(70,110,120,.12)"); fog.addColorStop(1, "rgba(36,48,56,.24)");
  g.fillStyle = fog; g.fillRect(0, height * .64, width, height * .36);
}

function paintFlame(g: CanvasRenderingContext2D, x: number, y: number, time: number, phase: number) {
  const frame = Math.floor(time * 9 + phase) % 3;
  rect(g, "#8e4931", x - 5, y - 9 - frame, 10, 10 + frame);
  rect(g, "#e76b35", x - 3, y - 7 - frame, 6, 8 + frame);
  rect(g, "#ffd17b", x - 1, y - 5, 3, 5);
  rect(g, "#667174", x - 2, y - 16 - (frame * 2), 4, 5);
  const smoke = Math.floor(time * 2 + phase) % 4;
  rect(g, "rgba(82,91,94,.42)", x - 4 - smoke, y - 24 - smoke * 3, 5, 4);
  if (frame === 1) rect(g, "#ffd17b", x + 5, y - 12, 2, 2);
}

const STREET = 146;
const WALK = 48;
const EYE = 70;
const VIEW_MAX = 2200;
const WALK_SPEED = 68;

type BladeSign = { u: number; y0: number; y1: number; color: string; word: string };
type Opening = { u0: number; u1: number; yTop: number; yBot: number };
type Overhang = { u0: number; u1: number; y: number; thick: number; reach: number; kind: "escape" | "balcony"; ladder: boolean };
type Block = {
  side: -1 | 1;
  z0: number;
  len: number;
  inset: number;
  facadeH: number;
  sprite: HTMLCanvasElement;
  lights: Light[];
  tvs: Tv[];
  flames: Flame[];
  blades: BladeSign[];
  openings: Opening[];
  overhangs: Overhang[];
};
type StreetProp = { kind: PropKind; variant: number; z: number; x: number };
type Traffic = { z: number; lane: -1 | 1; kind: Vehicle; color: number; speed: number; oncoming: boolean };
type HoloSpot = { z: number; x: number; y: number; h: number; kind: "figure" | "board"; variant: number; color: string; phase: number; alpha: number };
type CableSpan = { z0: number; z1: number; x0: number; x1: number; y0: number; y1: number; sag: number; color: string };
type Street = {
  length: number;
  blocks: Block[];
  props: StreetProp[];
  propSprites: Map<string, HTMLCanvasElement>;
  cars: Traffic[];
  holos: HoloSpot[];
  cables: CableSpan[];
  fires: { z: number; x: number; phase: number }[];
};

function wrap(n: number, L: number) {
  return ((n % L) + L) % L;
}

function facadeLayer(): Layer {
  return { buildings: [], props: [], cars: [], width: 1, pad: 0, speed: 0, horizon: 0, depth: 1, palette: 2 };
}

const JP_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", sans-serif';
const SIGN_INK = ["#6a4a30", "#5a3838", "#4a4030", "#3a4440", "#7a4a28", "#4a3a32"];
const BLADE_WORDS = ["ラーメン", "居酒屋", "焼肉", "寿司", "喫茶", "漫画", "雀荘", "うどん", "とんかつ", "スナック", "質屋", "金券", "美容", "歯科", "薬局", "たばこ", "鮮魚", "定食", "そば", "カラオケ", "パチンコ", "ホテル", "バー", "酒", "餃子", "中華", "カレー", "お好み焼き"];
const BOARD_LINES: readonly [string, string][] = [
  ["本日特売", "刺身"],
  ["営業中", "朝まで"],
  ["カラオケ", "２階"],
  ["個室あり", "居酒屋"],
  ["飲み放題", "生ビール"],
  ["歓迎", "入口"],
  ["大盛況", "パチンコ"],
  ["休憩", "ホテル"],
  ["名物", "味噌"],
  ["新鮮", "海鮮丼"],
  ["現金", "買取"],
  ["深夜営業", "歓迎"],
  ["定食", "５００円"],
  ["喫煙", "可"],
];

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function stampJp(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, vertical = false) {
  const chars = Array.from(text);
  const c = document.createElement("canvas");
  const sg = c.getContext("2d");
  if (!sg) return { w: 0, h: 0 };
  sg.font = `700 ${size}px ${JP_FONT}`;
  const line = size + 3;
  const measured = vertical ? size + 6 : Math.ceil(sg.measureText(text).width) + 6;
  c.width = Math.max(2, measured);
  c.height = Math.max(2, vertical ? chars.length * line + 4 : size + 8);
  sg.font = `700 ${size}px ${JP_FONT}`;
  sg.textAlign = "center";
  sg.textBaseline = "middle";
  sg.fillStyle = shade(color, -30);
  const drawLine = (dx: number, dy: number, fill: string) => {
    sg.fillStyle = fill;
    if (vertical) chars.forEach((ch, i) => sg.fillText(ch, c.width / 2 + dx, 2 + line / 2 + i * line + dy));
    else sg.fillText(text, c.width / 2 + dx, c.height / 2 + dy);
  };
  drawLine(1, 1, shade(color, -55));
  drawLine(0, 0, color);
  g.imageSmoothingEnabled = false;
  g.drawImage(c, Math.round(x), Math.round(y));
  return { w: c.width, h: c.height };
}

function signFrame(g: CanvasRenderingContext2D, lights: Light[], x: number, y: number, w: number, h: number, color: string, seed: number) {
  rect(g, "#070b10", x, y, w, h);
  const edge = (i: number, ex: number, ey: number, ew: number, eh: number) => {
    if (hash(seed + i * 19) % 5 === 0) {
      rect(g, "#141a20", ex, ey, ew, eh);
      return;
    }
    rect(g, color, ex, ey, ew, eh);
    lights.push({ x: ex, y: ey, w: Math.max(1, ew), h: Math.max(1, eh), phase: seed + i * 6, color, flicker: false, dying: hash(seed + i) % 3 === 0 });
  };
  edge(0, x, y, w, 2);
  edge(1, x, y + h - 2, Math.max(2, w * 0.72), 2);
  edge(2, x, y, 2, h);
  edge(3, x + w - 2, y, 2, Math.max(2, h * 0.64));
}

function drawAlleySigns(g: CanvasRenderingContext2D, x: number, top: number, faceW: number, baseline: number, lights: Light[], seed: number, blades: BladeSign[]) {
  if (faceW < 48 || baseline - top < 80) return;
  const ink = SIGN_INK[mod(seed, SIGN_INK.length)];
  const blade = (word: string, sx: number, sy: number, color: number, phase: number) => {
    const size = 18;
    const h = Array.from(word).length * (size + 3) + 16;
    const w = size + 14;
    if (sx < x || sx + w > x + faceW - 2 || sy + h > baseline - 16) return;
    const tone = SIGN_INK[mod(color, SIGN_INK.length)];
    blades.push({
      u: Math.min(0.94, Math.max(0.06, (sx + w * 0.5) / Math.max(1, faceW))),
      y0: baseline + 2 - (sy + h),
      y1: baseline + 2 - sy,
      color: tone,
      word,
    });
    signFrame(g, lights, sx, sy, w, h, tone, phase);
    for (let i = 6; i < h - 2; i += 4) rect(g, "#05080c", sx + 2, sy + i, w - 4, 1);
    stampJp(g, word, sx + 4, sy + 6, size, tone, true);
    rect(g, "#2a241c", sx + w / 2 - 1, sy - 7, 2, 7);
  };
  if (hash(seed) % 3 === 0) {
    blade(BLADE_WORDS[mod(seed, BLADE_WORDS.length)], x + 8 + mod(seed, 5) * 6, top + 28 + mod(seed, 4) * 18, seed, seed);
  }
  const board = (lines: readonly [string, string], sx: number, sy: number, color: string, phase: number) => {
    const size = 16;
    const tw = Math.max(lines[0].length, lines[1].length) * (size + 1) + 18;
    const w = Math.min(faceW - 16, Math.max(78, tw));
    const h = size * 2 + 22;
    if (sx + w > x + faceW - 2 || sy + h > baseline - 20) return;
    signFrame(g, lights, sx, sy, w, h, color, phase);
    rect(g, "#101820", sx + 3, sy + 3, w - 6, h - 6);
    for (let i = 5; i < h - 3; i += 3) rect(g, "rgba(4,8,12,.55)", sx + 3, sy + i, w - 6, 1);
    stampJp(g, lines[0], sx + 8, sy + 4, size, color);
    stampJp(g, lines[1], sx + 8, sy + size + 8, size - 2, shade(color, 18));
    if (hash(phase) % 4 === 0) rect(g, "#141a20", sx + w - 18, sy + 6, 12, h * 0.4);
  };
  if (hash(seed + 9) % 5 === 0) {
    const slot = BOARD_LINES[mod(seed >> 6, BOARD_LINES.length)];
    board(slot, x + Math.max(8, faceW * 0.28), top + 36 + mod(seed, 5) * 16, ink, seed + 80);
  }
  if (hash(seed + 4) % 4 === 0 && faceW > 64) {
    const door = x + faceW * 0.38;
    const ny = baseline - 62;
    const cloth = ink;
    rect(g, "#121820", door, ny, 18, 34);
    rect(g, "#121820", door + 22, ny, 18, 34);
    rect(g, cloth, door, ny, 18, 3);
    rect(g, cloth, door + 22, ny, 18, 3);
    const mark = BLADE_WORDS[mod(seed >> 3, BLADE_WORDS.length)];
    stampJp(g, mark.slice(0, 1), door + 1, ny + 6, 14, cloth);
    stampJp(g, Array.from(mark)[1] ?? "店", door + 23, ny + 6, 14, cloth);
    rect(g, "#ff6a2a", door - 16, ny + 4, 12, 14);
    rect(g, "#ffd27a", door - 13, ny + 7, 6, 5);
    rect(g, "#3a2a22", door - 11, ny - 4, 2, 8);
    lights.push({ x: door - 16, y: ny + 4, w: 12, h: 14, phase: seed + 3, color: "#ff9a3c", flicker: false, dying: hash(seed) % 4 === 0 });
  }
  if (hash(seed) % 7 === 0 && faceW > 80) {
    const vx = x + (hash(seed + 7) % 2 ? 8 : faceW - 36);
    const vy = baseline - 78;
    rect(g, "#12181e", vx, vy, 26, 48);
    rect(g, "#5ce1ff", vx + 3, vy + 4, 20, 16);
    rect(g, "#ff4d8d", vx + 4, vy + 22, 8, 6);
    rect(g, "#ffd27a", vx + 14, vy + 22, 8, 6);
    rect(g, "#7dff9a", vx + 4, vy + 30, 8, 6);
    rect(g, "#ff9a3c", vx + 14, vy + 30, 8, 6);
    rect(g, "#0c1016", vx + 8, vy + 40, 10, 4);
    lights.push({ x: vx + 3, y: vy + 4, w: 20, h: 16, phase: seed + 11, color: "#d7fbff", flicker: false, dying: hash(seed + 5) % 3 === 0 });
  }
}

function renderBlockSprite(b: Building, side: -1 | 1) {
  const head = 260;
  const baseline = head + b.h;
  const width = Math.max(8, b.w);
  const sprite = document.createElement("canvas");
  sprite.width = width;
  sprite.height = baseline + 2;
  const g = sprite.getContext("2d");
  const lights: Light[] = [];
  const tvs: Tv[] = [];
  const flames: Flame[] = [];
  const openings: Opening[] = [];
  const overhangs: Overhang[] = [];
  if (!g) return { sprite, lights, tvs, flames, facadeH: b.h, blades: [], openings, overhangs };
  g.imageSmoothingEnabled = false;
  g.save();
  g.translate(-b.x, 0);
  drawBuilding(g, b, baseline, facadeLayer(), lights, tvs, { openings, overhangs });
  g.restore();
  for (const light of lights) light.x -= b.x;
  for (const tv of tvs) tv.x -= b.x;
  const seed = hash(b.x * 19 + b.h * 7);
  if (b.fire || seed % 100 < 13) {
    flames.push({
      x: 18 + (seed % Math.max(1, width - 36)),
      y: baseline - b.h - 7,
      phase: seed % 31,
    });
  }
  let out = sprite;
  let og = g;
  if (side > 0) {
    const flip = document.createElement("canvas");
    flip.width = width;
    flip.height = sprite.height;
    const fg = flip.getContext("2d");
    if (!fg) return { sprite, lights, tvs, flames, facadeH: b.h, blades: [], openings, overhangs };
    fg.imageSmoothingEnabled = false;
    fg.save();
    fg.translate(width, 0);
    fg.scale(-1, 1);
    fg.drawImage(sprite, 0, 0);
    fg.restore();
    for (const light of lights) light.x = width - light.x - light.w;
    for (const tv of tvs) tv.x = width - tv.x - tv.w;
    for (const flame of flames) flame.x = width - flame.x;
    const flipU = (item: { u0: number; u1: number }) => {
      const a = 1 - item.u1;
      const b = 1 - item.u0;
      item.u0 = a;
      item.u1 = b;
    };
    for (const opening of openings) flipU(opening);
    for (const overhang of overhangs) flipU(overhang);
    out = flip;
    og = fg;
  }
  const faceW = Math.max(16, width - Math.max(8, Math.floor(width * 0.13)));
  const blades: BladeSign[] = [];
  drawAlleySigns(og, 0, head, faceW, baseline, lights, hash(b.x * 13 + b.h + side), blades);
  og.globalAlpha = 0.62;
  for (let i = 0; i < 28; i++) {
    const h = hash(b.x * 9 + i * 53);
    rect(og, "#030508", h % Math.max(1, width - 4), head + ((h >>> 8) % Math.max(1, b.h - 8)), 1 + (h % 3), 12 + (h % 48));
  }
  og.globalAlpha = 0.8;
  for (let i = 0; i < 5; i++) {
    const h = hash(b.x * 3 + i * 91 + b.h);
    const px = 4 + (h % Math.max(1, width - 30));
    const py = head + 18 + ((h >>> 6) % Math.max(1, b.h - 60));
    rect(og, i % 2 ? "#241c16" : "#1a221c", px, py, 16 + (h % 14), 20 + (h % 12));
    rect(og, "#0a0c0e", px, py + (h % 9), 16 + (h % 14), 2);
    rect(og, "#3a241c", px + (h % 8), py + 18, 2, 8 + (h % 16));
  }
  og.globalAlpha = 1;
  return { sprite: out, lights, tvs, flames, facadeH: b.h, blades, openings, overhangs };
}

function layoutSide(seed: number, side: -1 | 1, viewH: number): Block[] {
  const city = createCity(seed, 5200, "near", Math.max(300, viewH * 0.42));
  const blocks: Block[] = [];
  let z = 36;
  for (const b of city.buildings) {
    const painted = renderBlockSprite(b, side);
    const len = Math.max(64, painted.sprite.width);
    blocks.push({
      side, z0: z, len, facadeH: painted.facadeH,
      inset: (hash(b.x * 5 + side * 80) % 52) - 18,
      sprite: painted.sprite, lights: painted.lights, tvs: painted.tvs, flames: painted.flames,
      blades: painted.blades, openings: painted.openings, overhangs: painted.overhangs,
    });
    z += len + 22 + (hash(b.x + side * 50) % 34);
  }
  return blocks;
}

function propSprite(kind: PropKind, variant: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 52;
  canvas.height = 96;
  const g = canvas.getContext("2d");
  if (g) {
    g.imageSmoothingEnabled = false;
    drawProp(g, { kind, x: 4, variant }, 92, 1, []);
  }
  return canvas;
}

function buildStreet(viewH: number): Street {
  const left = layoutSide(47, -1, viewH);
  const right = layoutSide(91, 1, viewH);
  const blocks = [...left, ...right];
  const end = (list: Block[]) => list.reduce((m, b) => Math.max(m, b.z0 + b.len), 0);
  const length = Math.max(800, end(left), end(right));
  const propSprites = new Map<string, HTMLCanvasElement>();
  const props: StreetProp[] = [];
  const kinds: PropKind[] = ["lamp", "hydrant", "dumpster", "barrel", "wreckage"];
  let z = 90;
  let i = 0;
  while (z < length - 30) {
    const side = i % 2 === 0 ? -1 : 1;
    const kind = i % 3 === 0 ? "lamp" : kinds[hash(i * 17) % kinds.length];
    const variant = hash(i) % 3;
    const key = `${kind}:${variant}`;
    if (!propSprites.has(key)) propSprites.set(key, propSprite(kind, variant));
    if (hash(i + 4) % 5 !== 0) props.push({ kind, variant, z, x: side * (STREET - WALK * 0.45) });
    z += 150 + (hash(i + 9) % 130);
    i++;
  }
  const cars: Traffic[] = [];
  for (let n = 0; n < 16; n++) {
    const oncoming = n % 4 === 0;
    cars.push({
      z: 80 + n * 280,
      lane: n % 2 === 0 ? -1 : 1,
      kind: (["cab", "sedan", "van", "truck"] as const)[n % 4],
      color: n % 5,
      speed: oncoming ? -120 : 28,
      oncoming,
    });
  }
  const holos: HoloSpot[] = [];
  const cables: CableSpan[] = [];
  for (const side of [-1, 1] as const) {
    const row = blocks.filter((b) => b.side === side).sort((a, b) => a.z0 - b.z0);
    for (let n = 0; n < row.length - 1; n++) {
      const a = row[n];
      const b = row[n + 1];
      const tone = hash(a.z0 + n) % 3;
      cables.push({
        z0: a.z0 + a.len * 0.72,
        z1: b.z0 + b.len * 0.2,
        x0: side * (STREET - 8),
        x1: side * (STREET - 8),
        y0: a.facadeH + 8,
        y1: b.facadeH + 4,
        sag: 16 + (hash(n + side) % 22),
        color: tone === 0 ? "#6a5038" : tone === 1 ? "#245058" : "#4a5562",
      });
      if (n % 4 === 0) {
        cables.push({
          z0: a.z0 + a.len * 0.4,
          z1: a.z0 + a.len * 0.4,
          x0: side * (STREET - 4),
          x1: -side * (STREET - 4),
          y0: a.facadeH * 0.86,
          y1: a.facadeH * 0.8,
          sag: 42 + (hash(a.z0) % 24),
          color: "#3a4550",
        });
      }
    }
  }
  const fires = [180, 740, 1500, 2300].map((z, n) => ({
    z, x: (n % 2 === 0 ? -1 : 1) * (STREET - WALK * 0.35), phase: n * 9,
  }));
  return { length, blocks, props, propSprites, cars, holos, cables, fires };
}

function lightAlpha(light: Light, time: number) {
  if (light.dying) {
    const cycle = Math.sin(time * 2.6 + light.phase);
    if (cycle < -0.2) return 0;
    return cycle > 0.35 ? 0.95 : 0.28;
  }
  if (light.flicker) {
    const cycle = Math.sin(time * 0.11 + light.phase);
    if ((Math.floor(light.phase) % 5) === 0 && cycle < -0.72) return 0;
    return 0.72;
  }
  return 0.9;
}

export default function PixelCity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let street = buildStreet(800);
    let frame = 0;
    let running = true;
    let builtFor = 0;
    let camZ = 80;
    let last = 0;
    const fit = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth / SCALE));
      const height = Math.max(1, Math.round(canvas.clientHeight / SCALE));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      if (height > 10 && Math.abs(height - builtFor) > 24) { street = buildStreet(height); builtFor = height; }
    };
    const draw = (now: number) => {
      fit();
      const width = canvas.width;
      const height = canvas.height;
      const still = motion.matches;
      const time = still ? 0 : now / 1000;
      const dt = still || !last ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!still) {
        camZ = wrap(camZ + WALK_SPEED * dt, street.length);
        for (const car of street.cars) car.z = wrap(car.z + car.speed * dt, street.length);
      }
      const L = street.length;
      const bob = still ? 0 : Math.round(Math.sin(time * 2.5) * 2);
      const sway = still ? 0 : Math.round(Math.sin(time * 0.75) * 4);
      const vx = width * 0.5 + sway;
      const vy = height * 0.34 + bob;
      const focal = height * 0.86;
      const rel = (z: number) => {
        let d = wrap(z - camZ, L);
        if (d > L * 0.5) d -= L;
        return d;
      };
      const project = (d: number, x: number, y: number) => {
        const s = focal / Math.max(d, 0.4);
        return { sx: vx + x * s, sy: vy - (y - EYE) * s, s };
      };
      ctx.imageSmoothingEnabled = false;
      paintNightSky(ctx, width, height, time);
      const glow = ctx.createLinearGradient(0, vy - 90, 0, vy + 36);
      glow.addColorStop(0, "rgba(255,154,60,0)");
      glow.addColorStop(1, "rgba(120,52,24,0.1)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, vy - 90, width, 126);
      const curb = STREET - WALK;
      for (let sy = Math.floor(vy) + 6; sy < height; sy += 2) {
        const d = (EYE * focal) / (sy - vy);
        if (d > 1600 || d < 8) continue;
        const fade = d > 1100 ? Math.max(0, 1 - (d - 1100) / 500) : 1;
        const s = focal / d;
        const roadHalf = curb * s;
        const wallHalf = STREET * s;
        ctx.globalAlpha = fade;
        ctx.fillStyle = "#12181e";
        ctx.fillRect(vx - wallHalf, sy, wallHalf * 2, 2);
        ctx.fillStyle = "#090d12";
        ctx.fillRect(vx - roadHalf, sy, roadHalf * 2, 2);
        ctx.fillStyle = "#3a424c";
        ctx.fillRect(vx - roadHalf, sy, 2, 2);
        ctx.fillRect(vx + roadHalf - 2, sy, 2, 2);
        const along = camZ + d;
        if (Math.floor(along / 36) % 2 === 0) {
          ctx.fillStyle = "#3a444c";
          const dash = Math.max(2, 2.4 * s);
          ctx.fillRect(vx - dash / 2, sy, dash, 2);
        }
        if (hash(Math.floor(along) * 5 + sy) % 23 === 0) {
          ctx.fillStyle = "#05070a";
          ctx.fillRect(vx - roadHalf * (0.15 + (hash(Math.floor(along)) % 50) / 100), sy, Math.max(10, 36 * s), 1);
        }
        if (hash(Math.floor(along / 18)) % 9 === 0 && sy % 8 < 2) {
          ctx.fillStyle = "rgba(42, 26, 14, 0.5)";
          const px = ((hash(Math.floor(along / 18)) % 100) / 100 - 0.5) * roadHalf * 1.3;
          ctx.fillRect(vx + px, sy, Math.max(8, 20 * s), 2);
        }
        if (sy % 4 === 0) {
          for (let k = 0; k < 3; k++) {
            const hsh = hash(Math.floor(along / 8) * 13 + k * 97 + sy);
            if (hsh % 4 !== 0) continue;
            const lx = ((hsh % 1000) / 1000 - 0.5) * roadHalf * 2;
            ctx.fillStyle = hsh % 2 ? "rgba(255,154,60,.22)" : "rgba(92,225,255,.16)";
            ctx.fillRect(vx + lx, sy, 2 + (hsh % 8), 2);
          }
        }
        ctx.globalAlpha = 1;
      }
      const paintCable = (cable: CableSpan) => {
        const d0 = rel(cable.z0);
        const d1 = rel(cable.z1);
        if (Math.abs(d0 - d1) > 700) return;
        if (Math.max(d0, d1) < 6 || Math.min(d0, d1) > VIEW_MAX) return;
        let prev: { sx: number; sy: number } | null = null;
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const d = d0 + (d1 - d0) * t;
          if (d < 4) { prev = null; continue; }
          const x = cable.x0 + (cable.x1 - cable.x0) * t;
          const y = cable.y0 + (cable.y1 - cable.y0) * t - Math.sin(Math.PI * t) * cable.sag;
          const p = project(d, x, y);
          if (prev) {
            ctx.fillStyle = cable.color;
            const x0 = Math.round(prev.sx);
            const y0 = Math.round(prev.sy);
            const x1 = Math.round(p.sx);
            const y1 = Math.round(p.sy);
            ctx.fillRect(Math.min(x0, x1), y1, Math.abs(x1 - x0) + 1, 2);
            if (y0 !== y1) ctx.fillRect(x0, Math.min(y0, y1), 2, Math.abs(y1 - y0));
          }
          prev = p;
        }
      };
      const farCables = street.cables.filter((c) => rel(c.z0) > 500);
      for (const cable of farCables) paintCable(cable);

      const sprites = street.holos.flatMap((holo) => {
        const d = rel(holo.z);
        const near = Math.min(1, Math.max(0, (d - 280) / 200));
        const far = Math.min(1, Math.max(0, (1700 - d) / 420));
        const fade = near * far;
        if (fade < 0.04) return [];
        return [{ holo, d, fade }];
      }).sort((a, b) => b.d - a.d);
      for (const { holo, d, fade } of sprites) {
        const p = project(d, holo.x, holo.y);
        const sc = Math.max(0.15, p.s * (holo.h / 80));
        ctx.save();
        ctx.translate(Math.round(p.sx), Math.round(p.sy));
        ctx.scale(sc, sc);
        paintHolo(ctx, {
          x: 0, y: 0, w: holo.kind === "board" ? 120 : 34, h: 80,
          phase: holo.phase, color: holo.color, variant: holo.variant, kind: holo.kind,
          alpha: holo.alpha * fade,
        }, 0, 0, time);
        ctx.restore();
      }

      const visible = street.blocks.flatMap((block) => {
        let d0 = wrap(block.z0 - camZ, L);
        if (d0 > L * 0.5) d0 -= L;
        const d1 = d0 + block.len;
        if (d1 < 0.8 || d0 > VIEW_MAX) return [];
        return [{ block, d0, d1 }];
      }).sort((a, b) => b.d0 - a.d0);

      const wallX = (block: Block) => block.side * (STREET + block.inset);
      const drawCap = (block: Block, d: number) => {
        if (d < 78 || d > 1500) return;
        const wall = wallX(block);
        const outer = wall + block.side * 42;
        const s = focal / d;
        const x0 = vx + wall * s;
        const x1 = vx + outer * s;
        const top = vy - (block.facadeH - EYE) * s;
        const bot = vy + EYE * s;
        const left = Math.min(x0, x1);
        const ww = Math.abs(x1 - x0);
        const hh = bot - top;
        if (ww < 3 || hh < 8) return;
        ctx.fillStyle = "#080c12";
        ctx.fillRect(left, top, ww, hh);
        ctx.fillStyle = "#ff9a3c";
        for (let i = 1; i <= 5; i++) {
          ctx.globalAlpha = 0.75;
          ctx.fillRect(left + ww * 0.3, top + hh * (i / 7), Math.max(2, ww * 0.22), Math.max(2, hh * 0.035));
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#3a424c";
        ctx.fillRect(left, top, ww, 3);
      };
      const drawShelf = (block: Block, d0: number, d1: number, y: number, reach: number, body: string, lip: string) => {
        const wall = wallX(block);
        const tip = wall - block.side * reach;
        const start = Math.max(d0, 1);
        const end = Math.max(start + 4, d1);
        let prev: { x0: number; x1: number; y: number } | null = null;
        for (let i = 0; i <= 10; i++) {
          const d = start + (end - start) * (i / 10);
          if (d < 3) { prev = null; continue; }
          const s = focal / d;
          const x0 = vx + wall * s;
          const x1 = vx + tip * s;
          const yy = vy - (y - EYE) * s;
          if (prev) {
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(prev.x0, prev.y);
            ctx.lineTo(prev.x1, prev.y);
            ctx.lineTo(x1, yy);
            ctx.lineTo(x0, yy);
            ctx.fill();
            ctx.fillStyle = lip;
            ctx.fillRect(Math.min(x0, x1), yy, Math.abs(x1 - x0), 2);
          }
          prev = { x0, x1, y: yy };
        }
      };
      const drawBlade = (block: Block, d0: number, blade: BladeSign) => {
        const d = d0 + blade.u * block.len;
        if (d < 60 || d > 1200) return;
        const wall = wallX(block);
        const tip = wall - block.side * 20;
        const face = (dist: number) => {
          const s = focal / dist;
          const x0 = vx + wall * s;
          const x1 = vx + tip * s;
          const yTop = vy - (blade.y1 - EYE) * s;
          const yBot = vy - (blade.y0 - EYE) * s;
          return { x: Math.min(x0, x1), w: Math.abs(x1 - x0), y: Math.min(yTop, yBot), h: Math.abs(yBot - yTop) };
        };
        const back = face(d + 9);
        ctx.fillStyle = "#05070b";
        ctx.fillRect(back.x, back.y, back.w, back.h);
        const front = face(d);
        if (front.w < 6 || front.h < 12) return;
        ctx.fillStyle = "#070b10";
        ctx.fillRect(front.x, front.y, front.w, front.h);
        ctx.fillStyle = blade.color;
        ctx.fillRect(front.x, front.y, front.w, 2);
        ctx.fillRect(front.x, front.y, 2, front.h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(front.x + 2, front.y + 2, Math.max(1, front.w - 4), Math.max(1, front.h - 4));
        ctx.clip();
        const chars = Array.from(blade.word);
        ctx.fillStyle = blade.color;
        ctx.font = `700 ${Math.max(8, Math.floor(front.h / (chars.length + 0.35)))}px ${JP_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        chars.forEach((ch, i) => ctx.fillText(ch, front.x + front.w / 2, front.y + (i + 0.55) * (front.h / chars.length)));
        ctx.restore();
        if (Math.sin(time * 2.4 + d) < -0.86) {
          ctx.fillStyle = "rgba(5,8,12,.5)";
          ctx.fillRect(front.x, front.y, front.w, front.h);
        }
      };

      const NEAR = 64;
      const queue: { d: number; fn: () => void }[] = [];
      const enqueue = (d: number, fn: () => void) => {
        if (d < NEAR || d > 1650) return;
        queue.push({ d, fn });
      };
      const renderSlice = (block: Block, d0: number, z0: number, z1: number) => {
        const wall = wallX(block);
        const xFar = vx + wall * focal / z1;
        const xNear = vx + wall * focal / z0;
        const xStart = Math.max(0, Math.floor(Math.min(xFar, xNear)));
        const xEnd = Math.min(width, Math.ceil(Math.max(xFar, xNear)));
        const span = xEnd - xStart;
        const step = span > 520 ? 2 : 1;
        const worldH = block.sprite.height;
        for (let sx = xStart; sx <= xEnd; sx += step) {
          const denom = sx - vx;
          if (Math.abs(denom) < 0.5) continue;
          const d = (wall * focal) / denom;
          if (d < z0 - 0.6 || d > z1 + 0.6) continue;
          const u = (d - d0) / block.len;
          if (u < 0 || u > 1) continue;
          const srcX = Math.max(0, Math.min(block.sprite.width - 1, Math.floor(u * block.sprite.width)));
          const fade = d < 620 ? 1 : Math.max(0.1, 1 - (d - 620) / 980);
          const top = Math.round(vy - (worldH - EYE) * focal / d);
          const bot = Math.round(vy + EYE * focal / d);
          const hh = bot - top;
          if (hh < 1) continue;
          ctx.globalAlpha = fade;
          ctx.drawImage(block.sprite, srcX, 0, 1, block.sprite.height, sx, top, step, hh);
          const depthShade = Math.min(0.62, Math.max(0, (d - 180) / 900));
          if (depthShade > 0.02) {
            ctx.globalAlpha = depthShade * fade;
            ctx.fillStyle = "#020408";
            ctx.fillRect(sx, top, step, hh);
          }
          ctx.globalAlpha = 1;
        }
        const paintSpan = (u0: number, u1: number, worldTop: number, worldBot: number, color: string, alpha: number) => {
          if (alpha <= 0) return;
          const a = d0 + u0 * block.len;
          const b = d0 + u1 * block.len;
          const lo = Math.max(Math.min(a, b), NEAR);
          const hi = Math.max(a, b);
          if (hi < NEAR) return;
          const xA = vx + wall * focal / hi;
          const xB = vx + wall * focal / lo;
          const start = Math.max(0, Math.floor(Math.min(xA, xB)));
          const end = Math.min(width, Math.ceil(Math.max(xA, xB)));
          ctx.fillStyle = color;
          for (let sx = start; sx <= end; sx++) {
            const denom = sx - vx;
            if (Math.abs(denom) < 0.5) continue;
            const d = (wall * focal) / denom;
            if (d < lo - 0.4 || d > hi + 0.4) continue;
            const fade = d < 620 ? 1 : Math.max(0.1, 1 - (d - 620) / 980);
            const s = focal / d;
            const y0 = vy - (worldTop - EYE) * s;
            const y1 = vy - (worldBot - EYE) * s;
            ctx.globalAlpha = alpha * fade;
            ctx.fillRect(sx, Math.round(Math.min(y0, y1)), 1, Math.max(1, Math.round(Math.abs(y1 - y0))));
          }
          ctx.globalAlpha = 1;
        };
        const quad = (pts: { sx: number; sy: number }[], color: string, alpha = 1) => {
          if (pts.some((p) => !Number.isFinite(p.sx) || !Number.isFinite(p.sy))) return;
          let minX = pts[0].sx, maxX = pts[0].sx, minY = pts[0].sy, maxY = pts[0].sy;
          for (const p of pts) {
            minX = Math.min(minX, p.sx); maxX = Math.max(maxX, p.sx);
            minY = Math.min(minY, p.sy); maxY = Math.max(maxY, p.sy);
          }
          if (maxX - minX > width * 0.55 || maxY - minY > height * 0.62) return;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(pts[0].sx, pts[0].sy);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1;
        };
        const owns = (z: number) => z >= z0 && z < z1;
        for (const light of block.lights) {
          const alpha = lightAlpha(light, time);
          if (alpha <= 0) continue;
          const u0 = light.x / block.sprite.width;
          const u1 = (light.x + light.w) / block.sprite.width;
          const nearZ = d0 + Math.min(u0, u1) * block.len;
          if (!owns(nearZ)) continue;
          paintSpan(u0, u1, worldH - light.y, worldH - (light.y + light.h), light.color, alpha);
        }
        const drawLip = (zLo: number, zHi: number, yHi: number, yLo: number, reach: number, topColor: string, faceColor: string) => {
          const tip = wall - block.side * reach;
          const P = (z: number, x: number, y: number) => project(z, x, y);
          quad([P(zLo, wall, yLo), P(zHi, wall, yLo), P(zHi, tip, yLo), P(zLo, tip, yLo)], "#100e0c");
          quad([P(zHi, wall, yHi), P(zHi, tip, yHi), P(zHi, tip, yLo), P(zHi, wall, yLo)], "#2a2622");
          quad([P(zLo, wall, yHi), P(zHi, wall, yHi), P(zHi, tip, yHi), P(zLo, tip, yHi)], topColor);
          quad([P(zLo, tip, yHi), P(zHi, tip, yHi), P(zHi, tip, yLo), P(zLo, tip, yLo)], faceColor);
          quad([P(zLo, wall, yHi), P(zLo, tip, yHi), P(zLo, tip, yLo), P(zLo, wall, yLo)], "#4a4036");
        };
        for (const opening of block.openings) {
          let zA = d0 + Math.min(opening.u0, opening.u1) * block.len;
          let zB = d0 + Math.max(opening.u0, opening.u1) * block.len;
          if (zB < NEAR || !owns(Math.max(zA, NEAR))) continue;
          zA = Math.max(NEAR, zA);
          drawLip(zA, zB, opening.yBot, opening.yBot - 3, 6, "#8a7360", "#4a3c32");
          drawLip(zA, zB, opening.yTop + 3, opening.yTop, 4, "#6a645c", "#3a342e");
        }
        for (const tv of block.tvs) {
          const u0 = tv.x / block.sprite.width;
          const u1 = (tv.x + tv.w) / block.sprite.width;
          if (!owns(d0 + Math.min(u0, u1) * block.len)) continue;
          const rows = 4;
          const shift = Math.floor(time * 12 + tv.phase) % rows;
          for (let i = 0; i < rows; i++) {
            if ((i + shift) % 2 !== 0) continue;
            const top = worldH - (tv.y + (i / rows) * tv.h);
            paintSpan(u0, u1, top, top - Math.max(1, tv.h / rows) * 0.45, "#061018", 0.45);
          }
        }
        for (const flame of block.flames) {
          const d = d0 + (flame.x / block.sprite.width) * block.len;
          if (!owns(d)) continue;
          const p = project(d, wall, worldH - flame.y);
          ctx.save();
          ctx.translate(Math.round(p.sx), Math.round(p.sy));
          ctx.scale(Math.max(0.3, p.s * 0.4), Math.max(0.3, p.s * 0.4));
          paintFlame(ctx, 0, 0, time, flame.phase);
          ctx.restore();
        }
        drawShelf(block, z0, z1, block.facadeH, 6, "#0c1014", "#2c3238");
        const drawOverhang = (o: Overhang) => {
          let zA = d0 + Math.min(o.u0, o.u1) * block.len;
          let zB = d0 + Math.max(o.u0, o.u1) * block.len;
          if (zB < NEAR || zB - zA < 2 || !owns(Math.max(zA, NEAR))) return;
          zA = Math.max(NEAR, zA);
          const tip = wall - block.side * Math.min(o.reach, 18);
          const y = o.y;
          const yLo = y - o.thick;
          const iron = o.kind === "escape";
          const rust = hash(block.z0 + Math.floor(y)) % 3 === 0;
          const P = (z: number, x: number, yy: number) => project(z, x, yy);
          quad([P(zA, wall, yLo), P(zB, wall, yLo), P(zB, tip, yLo), P(zA, tip, yLo)], "#0c0e0c");
          quad([P(zB, wall, y), P(zB, tip, y), P(zB, tip, yLo), P(zB, wall, yLo)], iron ? "#1a1e1c" : "#241c16");
          quad([P(zA, wall, y), P(zB, wall, y), P(zB, tip, y), P(zA, tip, y)], rust ? "#4a3428" : iron ? "#4e5652" : "#5c5348");
          quad([P(zA, tip, y), P(zB, tip, y), P(zB, tip, yLo), P(zA, tip, yLo)], iron ? "#242826" : "#3a322c");
          quad([P(zA, wall, y), P(zA, tip, y), P(zA, tip, yLo), P(zA, wall, yLo)], iron ? "#3a403c" : "#4a4036");
          const rail = y + (iron ? 14 : 10);
          const posts = iron ? [0.08, 0.4, 0.72] : [0.15, 0.55, 0.88];
          for (const t of posts) {
            if (hash(block.z0 + Math.floor(t * 20) + Math.floor(y)) % 7 === 0) continue;
            const z = zA + (zB - zA) * t;
            quad([P(z, tip, rail), P(z + 1.5, tip, rail), P(z + 1.5, tip, y), P(z, tip, y)], rust ? "#6a4030" : "#6a726c");
          }
          quad([P(zA, tip, rail), P(zB, tip, rail), P(zB, tip, rail - 1.4), P(zA, tip, rail - 1.4)], rust ? "#5a3828" : "#5c6460");
          if (!o.ladder || hash(block.z0 + Math.floor(y)) % 4 === 0) return;
          const lz0 = zA + 2;
          const lz1 = Math.min(zB - 1, zA + 7);
          quad([P(lz0, tip, y), P(lz1, tip, y), P(lz1, tip, y - 40), P(lz0, tip, y - 40)], "#1c201e");
          for (let k = 1; k <= 4; k++) {
            const yy = y - k * 8;
            quad([P(lz0, tip, yy + 1), P(lz1, tip, yy + 1), P(lz1, tip, yy), P(lz0, tip, yy)], "#5a6260");
          }
        };
        for (const overhang of block.overhangs) drawOverhang(overhang);
        for (const blade of block.blades) {
          const d = d0 + blade.u * block.len;
          if (owns(d)) drawBlade(block, d0, blade);
        }
      };
      for (const { block, d0, d1 } of visible) {
        const nearD = Math.max(d0, NEAR);
        if (d1 <= nearD) continue;
        if (d1 > NEAR) enqueue(d1, () => drawCap(block, d1));
        if (d0 > NEAR) enqueue(d0, () => drawCap(block, d0));
        const slices = Math.max(1, Math.ceil((d1 - nearD) / 32));
        for (let i = 0; i < slices; i++) {
          const z0 = nearD + (d1 - nearD) * i / slices;
          const z1 = nearD + (d1 - nearD) * (i + 1) / slices;
          const piece = block;
          const origin = d0;
          enqueue(z0, () => renderSlice(piece, origin, z0, z1));
        }
      }

      for (const cable of street.cables) {
        const d = Math.min(rel(cable.z0), rel(cable.z1));
        if (d > NEAR && d <= 500) enqueue(d, () => paintCable(cable));
      }

      for (const prop of street.props) {
        const d = rel(prop.z);
        if (d < NEAR || d > 1100) continue;
        enqueue(d, () => {
          const sprite = street.propSprites.get(`${prop.kind}:${prop.variant}`);
          if (!sprite) return;
          const ground = project(d, prop.x, 0);
          const top = project(d, prop.x, sprite.height);
          const w = sprite.width * ground.s;
          const h = ground.sy - top.sy;
          if (h < 28 || h > height * 0.7) return;
          ctx.drawImage(sprite, Math.round(ground.sx - w / 2), Math.round(top.sy), Math.round(w), Math.round(h));
        });
      }

      for (const fire of street.fires) {
        const d = rel(fire.z);
        if (d < NEAR || d > 1200) continue;
        enqueue(d, () => {
          const p = project(d, fire.x, 8);
          if (p.sy < height * 0.72) return;
          ctx.save();
          ctx.translate(Math.round(p.sx), Math.round(p.sy));
          ctx.scale(Math.max(0.3, p.s * 0.35), Math.max(0.3, p.s * 0.35));
          paintFlame(ctx, 0, 0, time, fire.phase);
          ctx.restore();
        });
      }

      const box = (pts: { sx: number; sy: number }[], color: string) => {
        if (pts.length < 3 || pts.some((p) => !Number.isFinite(p.sx) || !Number.isFinite(p.sy))) return;
        let minX = pts[0].sx, maxX = pts[0].sx, minY = pts[0].sy, maxY = pts[0].sy;
        for (const p of pts) {
          minX = Math.min(minX, p.sx); maxX = Math.max(maxX, p.sx);
          minY = Math.min(minY, p.sy); maxY = Math.max(maxY, p.sy);
        }
        if (maxX - minX > width * 0.5 || maxY - minY > height * 0.55) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pts[0].sx, pts[0].sy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
        ctx.closePath();
        ctx.fill();
      };
      for (const car of street.cars) {
        const d = rel(car.z);
        if (d < NEAR || d > 1500) continue;
        enqueue(d, () => {
        const spec = {
          cab: { len: 64, wid: 32, body: 18, cab: 14, a: 0.2, b: 0.7 },
          sedan: { len: 82, wid: 34, body: 16, cab: 14, a: 0.32, b: 0.74 },
          van: { len: 96, wid: 36, body: 26, cab: 8, a: 0.06, b: 0.38 },
          truck: { len: 118, wid: 40, body: 22, cab: 16, a: 0.58, b: 0.94 },
        }[car.kind];
        const lane = car.lane * (STREET - WALK) * 0.72;
        const z0 = d;
        const z1 = d + spec.len;
        const xL = lane - spec.wid / 2;
        const xR = lane + spec.wid / 2;
        const paint = ["#1c2226", "#181c20", "#241c18", "#161a1e", "#202428"][car.color % 5];
        const c = (z: number, x: number, y: number) => project(z, x, y);
        ctx.globalAlpha = 0.55;
        box([c(z0, xL - 3, 1), c(z1, xL - 3, 1), c(z1, xR + 3, 1), c(z0, xR + 3, 1)], "#020304");
        ctx.globalAlpha = 1;
        const wheel = (z: number, x: number) => {
          box([c(z, x, 10), c(z + 16, x, 10), c(z + 16, x + 8, 10), c(z, x + 8, 10)], "#0c0e12");
          box([c(z, x, 1), c(z + 16, x, 1), c(z + 16, x, 10), c(z, x, 10)], "#3a4046");
          box([c(z, x + 8, 1), c(z + 16, x + 8, 1), c(z + 16, x + 8, 10), c(z, x + 8, 10)], "#4a5256");
        };
        wheel(z0 + 6, xL - 7);
        wheel(z0 + 6, xR);
        wheel(z1 - 22, xL - 7);
        wheel(z1 - 22, xR);
        box([c(z1, xL, spec.body), c(z1, xR, spec.body), c(z1, xR, 4), c(z1, xL, 4)], shade(paint, -18));
        box([c(z0, xL, spec.body), c(z1, xL, spec.body), c(z1, xL, 4), c(z0, xL, 4)], shade(paint, -10));
        box([c(z0, xL, 9), c(z1, xL, 9), c(z1, xL, 4), c(z0, xL, 4)], "#14110e");
        box([c(z0, xR, spec.body), c(z1, xR, spec.body), c(z1, xR, 4), c(z0, xR, 4)], shade(paint, 8));
        box([c(z0, xR, 9), c(z1, xR, 9), c(z1, xR, 4), c(z0, xR, 4)], "#1c1612");
        box([c(z0, xL, spec.body), c(z1, xL, spec.body), c(z1, xR, spec.body), c(z0, xR, spec.body)], shade(paint, 16));
        const cz0 = z0 + spec.len * spec.a;
        const cz1 = z0 + spec.len * spec.b;
        const cabTop = spec.body + spec.cab;
        box([c(cz1, xL + 3, cabTop), c(cz1, xR - 3, cabTop), c(cz1, xR - 3, spec.body), c(cz1, xL + 3, spec.body)], "#0c1418");
        box([c(cz0, xL + 3, cabTop), c(cz1, xL + 3, cabTop), c(cz1, xL + 3, spec.body), c(cz0, xL + 3, spec.body)], "#101820");
        box([c(cz0, xR - 3, cabTop), c(cz1, xR - 3, cabTop), c(cz1, xR - 3, spec.body), c(cz0, xR - 3, spec.body)], "#182028");
        box([c(cz0, xL + 3, cabTop), c(cz1, xL + 3, cabTop), c(cz1, xR - 3, cabTop), c(cz0, xR - 3, cabTop)], shade(paint, 22));
        box([c(cz0, xL + 4, cabTop - 2), c(cz0, xR - 4, cabTop - 2), c(cz0, xR - 4, spec.body + 2), c(cz0, xL + 4, spec.body + 2)], "#071018");
        box([c(z0, xL, spec.body), c(z0, xR, spec.body), c(z0, xR, 4), c(z0, xL, 4)], paint);
        const glow = car.oncoming ? "#ffc56a" : (car.color % 2 ? "#5ce1ff" : "#ff4d6a");
        box([c(z0 - 1, xL + 3, 12), c(z0 - 1, xL + 10, 12), c(z0 - 1, xL + 10, 8), c(z0 - 1, xL + 3, 8)], glow);
        box([c(z0 - 1, xR - 10, 12), c(z0 - 1, xR - 3, 12), c(z0 - 1, xR - 3, 8), c(z0 - 1, xR - 10, 8)], glow);
        if (car.kind === "cab") box([c(cz0, lane - 6, cabTop + 4), c(cz1, lane - 6, cabTop + 4), c(cz1, lane + 6, cabTop + 4), c(cz0, lane + 6, cabTop + 4)], "#8a5a28");
        });
      }

      queue.sort((a, b) => b.d - a.d);
      for (const item of queue) item.fn();

      const throat = ctx.createLinearGradient(0, vy - 70, 0, vy + 50);
      throat.addColorStop(0, "rgba(4,6,5,.28)");
      throat.addColorStop(1, "rgba(4,6,5,0)");
      ctx.fillStyle = throat;
      ctx.fillRect(0, vy - 70, width, 120);

      const vignette = ctx.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(5,9,16,.2)");
      vignette.addColorStop(0.45, "rgba(5,9,16,0)");
      vignette.addColorStop(1, "rgba(5,8,11,.34)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };
    const loop = (now: number) => { if (!running) return; draw(now); frame = window.requestAnimationFrame(loop); };
    if (motion.matches) draw(0); else frame = window.requestAnimationFrame(loop);
    const onResize = () => { if (motion.matches) draw(0); };
    window.addEventListener("resize", onResize);
    const onMotion = () => { window.cancelAnimationFrame(frame); if (motion.matches) draw(0); else frame = window.requestAnimationFrame(loop); };
    motion.addEventListener?.("change", onMotion);
    return () => { running = false; window.cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); motion.removeEventListener?.("change", onMotion); };
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" className="pixel-city pointer-events-none fixed inset-0 z-0 h-dvh w-full" />;
}
