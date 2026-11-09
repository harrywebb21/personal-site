import { useEffect, useRef } from "react";

/**
 * PixelCity — a procedural, horizontally scrolling 16-bit New York nightscape.
 * Keeps the original Canvas + seeded-strip architecture while expanding the
 * building vocabulary, facade detail, lighting and street-level silhouettes.
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
type Light = { x: number; y: number; w: number; h: number; phase: number; color: string; flicker: boolean };
type Flame = { x: number; y: number; phase: number };
type Layer = {
  buildings: Building[]; props: Prop[]; cars: Car[]; width: number; pad: number;
  speed: number; horizon: number; depth: number; palette: number;
};
type RenderedLayer = { layer: Layer; canvas: HTMLCanvasElement; baseline: number; lights: Light[]; flames: Flame[] };

const BRICK = ["#493d3b", "#59413d", "#684a43", "#3e4142", "#74645a", "#4c5050", "#62574f"];
const STONE = ["#55575a", "#666568", "#77736d", "#484e54", "#817b70"];
const NIGHT_WINDOWS = ["#d99a51", "#bd7540", "#b9a078", "#9ba8a3", "#e0b66e"];
const NEON = ["#c34d4b", "#d29a51", "#548b8b", "#82719a", "#a95b68"];
const METAL = ["#42494a", "#606665", "#292f33", "#777267"];

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
      ? (roll > .70 ? "gothic" : roll > .43 ? "tower" : "deco")
      : roll > .91 ? "gothic" : roll > .83 ? "civic" : roll > .75 ? "deco"
      : roll > .66 ? "warehouse" : roll > .56 ? "brownstone" : roll > .45 ? "loft"
      : roll > .34 ? "walkup" : roll > .22 ? "tower" : "tenement";
    if (kind === "deco" || kind === "civic") h += 58;
    if (kind === "tower") h += 72;
    if (kind === "gothic") h += 112;
    if (kind === "brownstone") h = Math.min(h, 240 + Math.floor(r() * 70));
    const landmarkSlot = street === "far" ? -1 : Math.floor(x / 1050) % 4;
    const landmarkRoll = hash(seed + Math.floor(x / 1050) * 97 + Math.floor(x / 180) * 13) % 100;
    const landmark = landmarkRoll < 22
      ? (["cathedral", "clock", "ruin", "skybridge"] as const)[landmarkSlot]
      : null;
    buildings.push({
      x, w, h, kind, palette: Math.floor(r() * (kind === "gothic" || kind === "civic" ? STONE.length : BRICK.length)), sign: street === "near" && r() > .84,
      fire: street === "near" && r() > .96, escape: street === "near" && (kind === "tenement" || kind === "walkup" || kind === "loft") && r() > .32,
      antenna: r() > .81, tank: street !== "far" && r() > .82, ac: street === "near" && r() > .32,
      boarded: street === "near" && r() > .81, dark: r() > .76,
      gargoyles: (kind === "gothic" || kind === "civic") && street !== "far" && r() > .28,
      damage: street !== "far" && r() > .43, rooftopChaos: street !== "far" && r() > .34, landmark,
    });
    x += Math.max(42, w - (street === "near" ? 10 + Math.floor(r() * 20) : 4 + Math.floor(r() * 12)));
  }
  if (street !== "far") {
    let p = 20;
    while (p < x - 30) {
      const n = r();
      const kind: PropKind = n > .94 ? "wreckage" : n > .88 ? "barrel" : n > .83 ? "signpost" : n > .77 ? "phone" : n > .67 ? "dumpster" : n > .57 ? "hydrant" : n > .46 ? "trash" : n > .35 ? "cone" : n > .22 ? "bollard" : "tree";
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
    for (let i = 0; i < Math.floor((faceW * (baseline - top)) / 950); i++) {
      const h = hash(b.x * 31 + i * 97 + b.h); const sx = x + h % Math.max(1, faceW - 5);
      const sy = top + ((h >>> 8) % Math.max(1, baseline - top - 12));
      rect(g, h % 3 ? shade(base, -38) : shade(base, 18), sx, sy, 2 + h % 5, 1 + (h % 8));
    }
  }
  // Stone lintel / floor bands vary by building family.
  if (b.kind === "gothic" || b.kind === "civic" || b.kind === "deco") {
    rect(g, "#8b857a", x, top, faceW, 5);
    for (let yy = top + 34; yy < baseline - 12; yy += 68) {
      rect(g, shade(base, 17), x, yy, faceW, 3);
      rect(g, shade(base, -24), x, yy + 4, faceW, 2);
    }
  }
  if (b.kind === "brownstone") {
    rect(g, "#b49a7b", x, top, faceW, 7); rect(g, "#d0b99a", x, top + 7, faceW, 2);
    for (let y = top + 7; y < baseline; y += 48) rect(g, "#b49a7b", x, y, faceW, 2);
  } else if (b.kind === "warehouse") {
    for (let y = top + 10; y < baseline; y += 44) rect(g, shade(base, 28), x, y, faceW, 3);
  }
  return faceW;
}

function drawWindow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, lit: boolean, boarded: boolean) {
  const frame = "#242a2b"; const sill = "#a18b73";
  rect(g, "#171c20", x - 2, y - 2, w + 4, h + 5);
  rect(g, frame, x - 1, y - 1, w + 2, h + 2);
  rect(g, lit ? NIGHT_WINDOWS[seed % NIGHT_WINDOWS.length] : "#182b3a", x, y, w, h);
  if (lit && w > 10) rect(g, "#f8d69a", x + 2, y + 2, Math.max(2, w - 4), 2);
  rect(g, "#0d151b", x + Math.floor(w / 2), y, 2, h);
  rect(g, "#0d151b", x, y + Math.floor(h * .58), w, 2);
  rect(g, "#68706b", x - 1, y - 1, w + 2, 1);
  rect(g, "#68706b", x - 1, y + h + 1, w + 2, 1);
  rect(g, sill, x - 3, y + h, w + 6, 3);
  rect(g, "#5b6464", x - 2, y - 3, w + 4, 2);
  if (boarded) {
    rect(g, "#785b42", x - 1, y + 2, w + 2, 3); rect(g, "#785b42", x + 2, y + h - 5, w - 4, 3);
    rect(g, "#3b3028", x + 1, y + 1, 2, h - 2);
  }
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
    rect(g, "#b49b79", x + faceW * .22, top - 29, faceW * .56, 3);
    rect(g, base, x + faceW * .36, top - 52, faceW * .28, 24);
    rect(g, "#d0b28a", x + faceW * .36, top - 53, faceW * .28, 3);
    rect(g, "#22282a", x + faceW * .48, top - 68, 4, 16);
  } else if (b.kind === "tower") {
    rect(g, base, x + faceW * .35, top - 32, faceW * .3, 30);
    rect(g, "#a9a18b", x + faceW * .35, top - 34, faceW * .3, 3);
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

function drawNeon(g: CanvasRenderingContext2D, b: Building, x: number, top: number, faceW: number) {
  if (!b.sign) return;
  const color = NEON[hash(b.x + b.h) % NEON.length]; const y = top + 58 + (hash(b.x) % 3) * 24;
  const w = Math.min(faceW - 12, 86); if (w < 28) return;
  rect(g, "#11171c", x + 6, y, w, 22); rect(g, "#59605d", x + 6, y, w, 2);
  rect(g, color, x + 10, y + 5, w - 20, 2); rect(g, color, x + 10, y + 10, w - 28, 2);
  rect(g, shade(color, -35), x + 6, y + 22, w, 2);
  // Pixel tubes and brackets give the sign a physical mounting.
  rect(g, "#252b2c", x + 12, y - 5, 2, 5); rect(g, "#252b2c", x + w - 10, y - 5, 2, 5);
}

function drawLandmark(g: CanvasRenderingContext2D, b: Building, x: number, top: number, faceW: number) {
  const stone = "#8b8579"; const shadow = "#252c32"; const lit = "#d6a45e";
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
    rect(g, "#d49a54", bx + 10, by + 9, bw - 20, 3);
    rect(g, "#161e25", bx + 8, by + 7, bw - 16, 17);
    for (let sx = bx + 12; sx < bx + bw - 8; sx += 18) rect(g, "#9a8d79", sx, by + 5, 2, 23);
    rect(g, shadow, bx + 4, by + 30, 5, 18);
    rect(g, shadow, bx + bw - 9, by + 30, 5, 18);
  }
}

function drawBuilding(g: CanvasRenderingContext2D, b: Building, baseline: number, layer: Layer, lights: Light[]) {
  const x = b.x; const top = baseline - b.h; const stone = b.kind === "gothic" || b.kind === "civic" || b.kind === "deco" || b.kind === "tower"; const palette = stone ? STONE : BRICK; const base = layer.depth < .45 ? ["#30383e", "#3a4044", "#46494a"][b.palette % 3] : palette[b.palette % palette.length];
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
      // Keep the architectural frame and mullions permanently painted. The
      // animated inset glow is composited later, so lights never erase them.
      drawWindow(g, wx, y, winW, winH, seed, false, boarded);
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
    row++;
  }
  // One continuous, multi-storey iron escape per eligible facade.
  if (b.escape && layer.depth > .7) drawFireEscape(g, x + faceW - 29, top + 10, baseline - 8, 26);
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
    if (b.gargoyles) for (let gx = x + 22; gx < x + faceW - 22; gx += 74) {
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
  drawNeon(g, b, x, top, faceW);
  if (b.fire) {
    const fx = x + Math.floor(faceW * .65); rect(g, "#ffb04c", fx, top - 10, 5, 11); rect(g, "#ff5c35", fx + 2, top - 17, 3, 8);
    rect(g, "#6d7775", fx - 3, top - 26, 4, 5);
  }
}

function drawProp(g: CanvasRenderingContext2D, p: Prop, baseline: number, depth: number, lights: Light[]) {
  const x = p.x; const near = depth > .7;
  if (p.kind === "lamp") {
    rect(g, "#252d30", x + 5, baseline - 82, 4, 82); rect(g, "#78817b", x + 4, baseline - 82, 2, 82);
    rect(g, "#252d30", x + 5, baseline - 84, 24, 4); rect(g, "#f5c66c", x + 23, baseline - 82, 10, 5);
    rect(g, "#fff0bd", x + 25, baseline - 81, 6, 2);
    lights.push({ x: x + 21, y: baseline - 79, w: 16, h: 8, phase: x, color: "#f5c66c", flicker: false }); return;
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
    rect(g, "#e0c68e", x + 7, baseline - 42, 17, 20); rect(g, "#273d3c", x + 9, baseline - 39, 13, 14);
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
    rect(g, "#313b3e", x - 3, baseline - 57, 34, 13); rect(g, "#9b8a70", x, baseline - 55, 28, 2);
    rect(g, "#a54c40", x + 3, baseline - 51, 3, 2); rect(g, "#d2b77f", x + 21, baseline - 51, 7, 2); return;
  }
  // Sparse street trees: dark, angular foliage with a few sodium-lit edges.
  rect(g, "#342a25", x + 12, baseline - 35, 7, 35);
  rect(g, near ? "#182c27" : "#172328", x + 3, baseline - 69, 25, 19);
  rect(g, near ? "#20372d" : "#1b292c", x, baseline - 55, 34, 18);
  rect(g, "#304438", x + 8, baseline - 71, 12, 5);
}

function drawCar(g: CanvasRenderingContext2D, car: Car, baseline: number) {
  const x = car.x; const y = baseline + 2;
  const colors = ["#d6a33f", "#a83e32", "#385a69", "#b8b4a5", "#30363b"];
  const body = colors[car.color];
  const width = car.w;
  rect(g, "#0c1115", x + 3, y + 9, width - 6, 15);
  rect(g, body, x + 5, y + 5, width - 12, 15);
  rect(g, shade(body, 28), x + 10, y + 5, width - 22, 3);
  rect(g, "#18262d", x + 16, y, width - 34, 9);
  rect(g, "#91a6a6", x + 18, y + 2, Math.max(7, (width - 38) / 2), 5);
  rect(g, "#18262d", x + width / 2, y + 1, 2, 8);
  rect(g, "#f5d48c", x + width - 9, y + 10, 5, 4); rect(g, "#e05b45", x + 4, y + 11, 4, 4);
  rect(g, "#15191c", x + 12, y + 18, 13, 10); rect(g, "#15191c", x + width - 28, y + 18, 13, 10);
  rect(g, "#777c78", x + 15, y + 21, 7, 4); rect(g, "#777c78", x + width - 25, y + 21, 7, 4);
  if (car.kind === "cab") { rect(g, "#f5d48c", x + width / 2 - 8, y - 5, 17, 5); rect(g, "#242a2b", x + width / 2 - 5, y - 4, 11, 2); }
  if (car.kind === "van" || car.kind === "truck") rect(g, "#a18b73", x + width - 15, y + 6, 3, 10);
}

function drawRoad(g: CanvasRenderingContext2D, width: number, baseline: number, pad: number) {
  rect(g, "#77736b", 0, baseline, width, 3); rect(g, "#252a2d", 0, baseline + 3, width, 7);
  rect(g, "#171c20", 0, baseline + 10, width, pad - 10);
  // Broken amber and red reflections in wet asphalt.
  for (let x = 7; x < width; x += 73) {
    const h = hash(x * 13);
    rect(g, h % 3 ? "rgba(187,126,67,.20)" : "rgba(147,65,57,.20)", x, baseline + 17 + h % 23, 12 + h % 28, 2);
    rect(g, "rgba(183,170,143,.12)", x + 5, baseline + 21 + h % 17, 4 + h % 12, 1);
  }
  for (let x = 12; x < width; x += 96) rect(g, "#82735f", x, baseline + 30, 38, 2);
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
function renderStrip(layer: Layer): RenderedLayer {
  const baseline = layer.buildings.reduce((m, b) => Math.max(m, b.h + 140), 0);
  const canvas = document.createElement("canvas"); canvas.width = layer.width; canvas.height = baseline + layer.pad;
  const g = canvas.getContext("2d"); const { lights, flames } = collectLights(layer, baseline);
  if (g) {
    for (const b of layer.buildings) drawBuilding(g, b, baseline, layer, lights);
    if (layer.pad) drawRoad(g, layer.width, baseline, layer.pad);
    for (const car of layer.cars) drawCar(g, car, baseline);
    for (const p of layer.props) drawProp(g, p, baseline, layer.depth, lights);
  }
  return { layer, canvas, baseline, lights, flames };
}

function paintNightSky(g: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const gradient = g.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#080d18"); gradient.addColorStop(.42, "#151c29"); gradient.addColorStop(.78, "#252b32"); gradient.addColorStop(1, "#393631");
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
  const glow = g.createLinearGradient(0, height * .48, 0, height);
  glow.addColorStop(0, "rgba(115,82,64,0)"); glow.addColorStop(.55, "rgba(143,91,58,.10)"); glow.addColorStop(1, "rgba(194,126,68,.23)");
  g.fillStyle = glow; g.fillRect(0, height * .45, width, height * .55);
  // Persistent rain slants across the scene. Pixel-sized and intentionally uneven.
  for (let i = 0; i < Math.floor(width * .11); i++) {
    const seed = hash(i * 71 + 19);
    const x = (seed % width + Math.floor(time * (24 + seed % 24))) % width;
    const y = (Math.floor(seed / 7) % height + Math.floor(time * (95 + seed % 65))) % height;
    rect(g, "rgba(151,169,177,.20)", x, y, 1, 4 + seed % 5);
  }
  // Distant aircraft beacons and sparse high-rise lights, not a field of stars.
  for (let i = 0; i < 14; i++) {
    const x = (i * 173 + 47) % width; const y = 28 + (i * 31) % Math.max(40, Math.floor(height * .34));
    if (Math.sin(time * 1.2 + i * 2.1) > .15) rect(g, i % 3 === 0 ? "#c47b55" : "#a5a8a1", x, y, 2, 2);
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
  fog.addColorStop(0, "rgba(145,137,124,0)"); fog.addColorStop(.55, "rgba(145,137,124,.09)"); fog.addColorStop(1, "rgba(90,91,88,.18)");
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

function makeLayers(viewH: number): RenderedLayer[] {
  const far = createCity(11, 3000, "far", Math.max(125, viewH * .14));
  const mid = createCity(29, 3200, "mid", Math.max(175, viewH * .19));
  const near = createCity(47, 3400, "near", Math.max(235, viewH * .22));
  const layers: Layer[] = [
    { ...far, pad: 0, speed: 7, horizon: .61, depth: .22, palette: 0 },
    { ...mid, pad: 0, speed: 17, horizon: .77, depth: .56, palette: 1 },
    { ...near, pad: 76, speed: 30, horizon: .91, depth: 1, palette: 2 },
  ];
  return layers.map(renderStrip);
}

export default function PixelCity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let strips = makeLayers(800); let frame = 0; let running = true; let builtFor = 0;
    const fit = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth / SCALE));
      const height = Math.max(1, Math.round(canvas.clientHeight / SCALE));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      if (height > 10 && Math.abs(height - builtFor) > 24) { strips = makeLayers(height); builtFor = height; }
    };
    const draw = (now: number) => {
      fit(); const width = canvas.width; const height = canvas.height; const still = motion.matches;
      const time = still ? 0 : now / 1000;
      ctx.imageSmoothingEnabled = false; paintNightSky(ctx, width, height, time);
      // A restrained vignette and haze separate the three city depths.
      for (const strip of strips) {
        const y = Math.round(height * strip.layer.horizon) - strip.baseline;
        const offset = still ? 0 : (time * strip.layer.speed) % strip.layer.width;
        for (let x = -offset; x < width; x += strip.layer.width) {
          const left = Math.round(x); ctx.drawImage(strip.canvas, left, y);
          for (const light of strip.lights) {
            if (light.flicker) {
              const cycle = Math.sin(time * 0.11 + light.phase);
              if ((Math.floor(light.phase) % 5) === 0 && cycle < -0.72) continue;
              ctx.globalAlpha = 0.72;
            }
            ctx.fillStyle = light.color;
            ctx.fillRect(left + light.x, y + light.y, light.w, light.h);
            ctx.globalAlpha = 1;
          }
          for (const flame of strip.flames) paintFlame(ctx, left + flame.x, y + flame.y, time, flame.phase);
        }
      }
      const vignette = ctx.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(5,9,16,.18)"); vignette.addColorStop(.55, "rgba(5,9,16,0)"); vignette.addColorStop(1, "rgba(5,8,11,.26)");
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
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
