import { readFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "assets/city/source");
const output = path.join(root, "public/city");
const manifest = JSON.parse(await readFile(path.join(root, "src/components/portfolio/city/manifest.json"), "utf8"));

const sources = {
  buildings: ["cathedral.png", "tenement.png", "power-station.png", "clock-tower.png", "broadcast-center.png", "diner.png", "billboard-apartments.png", "ruined-midrise.png", "reactor-station.png", "stone-walkup.png"],
  street: ["sedan.png", "streetlamp.png", "barricade.png"],
  fillers: ["rubble.png", "fence.png", "terminal.png"],
  terrain: ["dead-bush.png", "wrecked-bus.png", "wrecked-truck.png"],
  highway: ["broken-highway.png"],
  falloutDust: ["fallout-dust-source.png"],
  barrelFire: ["barrel-fire-source.png"],
  nuke: ["nuke-source.png"],
  vertibird: ["vertibird-source.png"],
  ghoul: ["ghoul-source.png"],
  survivor: ["survivor-source.png"],
  mutant: ["mutant-source.png"],
  synthDuel: ["synth-duel-v1-grid.png", "synth-duel-v2-grid.png", "synth-duel-v3-grid.png"],
};

async function normalize(input, width, height) {
  const cropped = await sharp(input).ensureAlpha().trim({ threshold: 12 }).png().toBuffer();
  const resized = await sharp(cropped)
    .resize(width - 12, height - 12, { fit: "inside", kernel: "lanczos3", withoutEnlargement: true })
    .png().toBuffer();
  const { width: w, height: h } = await sharp(resized).metadata();
  return { input: resized, left: Math.floor((width - w) / 2), top: height - h - 6 };
}

async function buildAtlas(name) {
  const spec = manifest.atlases[name];
  const { frameWidth: w, frameHeight: h, frames } = spec;
  const pieces = [];
  if (name === "synthDuel") {
    if (frames !== sources[name].length * 8) throw new Error("synthDuel: expected eight frames per 4×2 source grid");
    for (const sourceFile of sources[name]) {
      const sourcePath = path.join(source, sourceFile);
      const { width: sourceWidth, height: sourceHeight, hasAlpha } = await sharp(sourcePath).metadata();
      if (!hasAlpha || !sourceWidth || !sourceHeight) throw new Error(`synthDuel: ${sourceFile} must be transparent`);
      for (let frame = 0; frame < 8; frame++) {
        const col = frame % 4;
        const row = Math.floor(frame / 4);
        const left = Math.round(col * sourceWidth / 4);
        const top = Math.round(row * sourceHeight / 2);
        const right = Math.round((col + 1) * sourceWidth / 4);
        const bottom = Math.round((row + 1) * sourceHeight / 2);
        const cellWidth = right - left;
        const cellHeight = bottom - top;
        if (cellWidth > w - 4 || cellHeight > h - 4) throw new Error(`synthDuel: ${sourceFile} cell exceeds destination frame`);
        const input = await sharp(sourcePath).extract({ left, top, width: cellWidth, height: cellHeight }).png().toBuffer();
        pieces.push({ input, left: Math.floor((w - cellWidth) / 2), top: Math.floor((h - cellHeight) / 2) });
      }
    }
  } else if (sources[name].length === frames) {
    for (const file of sources[name]) pieces.push(await normalize(path.join(source, file), w, h));
  } else {
    const sourcePath = path.join(source, sources[name][0]);
    const image = sharp(sourcePath);
    const { width: sourceWidth, height: sourceHeight } = await image.metadata();
    for (let i = 0; i < frames; i++) {
      const left = Math.round(i * sourceWidth / frames);
      const right = Math.round((i + 1) * sourceWidth / frames);
      const slice = await sharp(sourcePath)
        .extract({ left, top: 0, width: right - left, height: sourceHeight })
        .png().toBuffer();
      pieces.push(await normalize(slice, w, h));
    }
  }
  const composites = pieces.map((piece, i) => ({ ...piece, left: piece.left + i * w }));
  const file = path.join(output, path.basename(spec.url));
  await sharp({ create: { width: frames * w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).png({ compressionLevel: 9 }).toFile(file);
  const { width: actualWidth, height: actualHeight, hasAlpha } = await sharp(file).metadata();
  if (actualWidth !== frames * w || actualHeight !== h || !hasAlpha) throw new Error(`${name}: invalid atlas geometry or alpha`);
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const signatures = new Set();
  for (let frame = 0; frame < frames; frame++) {
    let count = 0;
    const signature = createHash("sha256");
    for (let y = 0; y < h; y++) {
      const start = (y * actualWidth + frame * w) * info.channels;
      signature.update(data.subarray(start, start + w * info.channels));
      for (let x = frame * w; x < (frame + 1) * w; x++) {
        const alpha = data[(y * actualWidth + x) * info.channels + 3];
        if (alpha > 16) count++;
        if ((x === frame * w || x === (frame + 1) * w - 1 || y === 0 || y === h - 1) && alpha > 16) {
          throw new Error(`${name}: frame ${frame} touches a cell edge`);
        }
      }
    }
    if (count < 100) throw new Error(`${name}: frame ${frame} is empty`);
    signatures.add(signature.digest("hex"));
  }
  if ("duration" in spec && signatures.size < Math.min(frames, 4)) throw new Error(`${name}: too few distinct animation frames`);
  if (name === "synthDuel" && signatures.size !== frames) throw new Error("synthDuel: every combat frame must be distinct");
  console.log(`${name}: ${actualWidth}×${actualHeight}, ${frames} nonempty transparent frames`);
}

await mkdir(output, { recursive: true });
const targets = process.argv.slice(2);
for (const name of targets.length ? targets : Object.keys(manifest.atlases)) {
  if (!(name in manifest.atlases) || !(name in sources)) throw new Error(`Unknown city atlas: ${name}`);
  await buildAtlas(name);
}
if (targets.length) process.exit(0);
const backdropSource = path.join(source, "wasteland-backdrop.png");
const backdrop = await sharp(backdropSource).metadata();
if ((backdrop.width ?? 0) < 1200 || (backdrop.height ?? 0) < 700) throw new Error("wastelandBackdrop: source is too small");
await copyFile(backdropSource, path.join(output, "wasteland-backdrop.png"));
console.log(`wastelandBackdrop: ${backdrop.width}×${backdrop.height} source copied`);
