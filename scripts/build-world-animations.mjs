import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "assets/worlds/source");
const output = path.join(root, "public/worlds");
const animations = [
  { name: "jdm-drift-loop", frameWidth: 320, frameHeight: 160 },
  { name: "arcade-patron-walk", frameWidth: 128, frameHeight: 256 },
  { name: "packers-watson-run", sourceName: "packers-watson-run-grid", layout: "grid", frameWidth: 128, frameHeight: 256 },
  { name: "packers-field-play", layout: "grid", frameWidth: 400, frameHeight: 180 },
  { name: "packers-fireworks", layout: "grid", frameWidth: 256, frameHeight: 256 },
];
const frames = 8;
const alphaThreshold = 16;

function bounds(data, width, height) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error("Empty animation frame");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

await mkdir(output, { recursive: true });
const manifest = {};
for (const animation of animations) {
  const input = path.join(source, `${animation.sourceName ?? animation.name}.png`);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width < 8 * 100 || info.height < 200) throw new Error(`${animation.name}: source is too small`);
  const occupied = Array(info.width).fill(0);
  if (animation.layout !== "grid") for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > alphaThreshold) occupied[x]++;
    }
  }
  const cuts = [0];
  if (animation.layout !== "grid") for (let boundary = 1; boundary < frames; boundary++) {
    const expected = boundary * info.width / frames;
    let best = { x: Math.round(expected), pixels: Infinity, distance: Infinity };
    for (let x = Math.max(1, Math.floor(expected - 80)); x < Math.min(info.width - 1, expected + 80); x++) {
      const candidate = { x, pixels: occupied[x], distance: Math.abs(x - expected) };
      if (candidate.pixels < best.pixels || (candidate.pixels === best.pixels && candidate.distance < best.distance)) best = candidate;
    }
    cuts.push(best.x);
  }
  cuts.push(info.width);
  const layers = [];
  const frameSignatures = new Set();
  for (let frame = 0; frame < frames; frame++) {
    const sourceFrame = animation.sourceFrames?.[frame] ?? frame;
    const column = sourceFrame % 4, row = Math.floor(sourceFrame / 4);
    const x0 = animation.layout === "grid" ? Math.round(column * info.width / 4) : cuts[sourceFrame];
    const x1 = animation.layout === "grid" ? Math.round((column + 1) * info.width / 4) : cuts[sourceFrame + 1];
    const y0 = animation.layout === "grid" ? Math.round(row * info.height / 2) : 0;
    const y1 = animation.layout === "grid" ? Math.round((row + 1) * info.height / 2) : info.height;
    const width = x1 - x0;
    const height = y1 - y0;
    const cell = await sharp(input).extract({ left: x0, top: y0, width, height })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const box = bounds(cell.data, width, height);
    if (animation.layout === "grid" && (box.left < 3 || box.top < 3 || box.left + box.width > width - 3 || box.top + box.height > height - 3)) {
      throw new Error(`${animation.name}: grid frame ${frame + 1} touches a source cell edge`);
    }
    if (animation.layout !== "grid" && ((box.left === 0 && x0 > 0 && occupied[x0 - 1] > 0) ||
      (box.left + box.width === width && x1 < info.width && occupied[x1] > 0))) {
      throw new Error(`${animation.name}: frame ${frame + 1} clips at a source cell boundary`);
    }
    const content = await sharp(input).extract({ left: x0 + box.left, top: y0 + box.top, width: box.width, height: box.height })
      .png().toBuffer();
    frameSignatures.add((await sharp(content).resize(16, 16, { fit: "fill" }).raw().toBuffer()).toString("base64"));
    const maxWidth = animation.frameWidth - 16;
    const maxHeight = animation.frameHeight - 12;
    const scale = Math.min(maxWidth / box.width, maxHeight / box.height);
    const targetWidth = Math.max(1, Math.round(box.width * scale));
    const targetHeight = Math.max(1, Math.round(box.height * scale));
    const resized = await sharp(content).resize(targetWidth, targetHeight, { kernel: "nearest" }).png().toBuffer();
    layers.push({ input: resized,
      left: frame * animation.frameWidth + Math.round((animation.frameWidth - targetWidth) / 2),
      top: animation.frameHeight - targetHeight - 5 });
  }
  if (frameSignatures.size < 5) throw new Error(`${animation.name}: too few distinct animation frames`);
  const atlas = await sharp({ create: { width: animation.frameWidth * frames,
    height: animation.frameHeight, channels: 4, background: "#00000000" } })
    .composite(layers).webp({ lossless: true, effort: 6 }).toFile(path.join(output, `${animation.name}.webp`));
  manifest[animation.name] = { src: `/worlds/${animation.name}.webp`, frames,
    frameWidth: animation.frameWidth, frameHeight: animation.frameHeight,
    width: animation.frameWidth * frames, height: animation.frameHeight,
    distinctFrames: frameSignatures.size, bytes: atlas.size };
  console.log(`${animation.name}: ${frames} checked frames, ${frameSignatures.size} distinct → ${atlas.width}×${atlas.height}`);
}
await writeFile(path.join(output, "animation-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
