import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "assets/worlds/source");
const output = path.join(root, "public/worlds/props");
const packs = {
  jdm: ["car", "tires", "barrier", "floodlight", "cones", "mechanic", "flag", "camera"],
  arcade: ["cabinet", "vending", "kiosk", "neon-sign", "planter", "robot", "drone", "cartridges"],
  packers: ["bench", "coolers", "helmet", "football", "chain-marker", "trunk", "camera", "flag"],
};

function cropBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error("Empty prop cell");
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

await mkdir(output, { recursive: true });
const manifest = {};
for (const [pack, names] of Object.entries(packs)) {
  const input = path.join(source, `${pack === "arcade" ? "arcade-props-clean" : `${pack}-props`}.png`);
  const meta = await sharp(input).metadata();
  if (meta.width !== 1774 || meta.height !== 887 || !meta.hasAlpha) throw new Error(`${pack}: unexpected source sheet geometry`);
  manifest[pack] = {};
  for (let i = 0; i < names.length; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const left = Math.round(col * meta.width / 4), right = Math.round((col + 1) * meta.width / 4);
    const top = Math.round(row * meta.height / 2), bottom = Math.round((row + 1) * meta.height / 2);
    const { data, info } = await sharp(input).extract({ left, top, width: right - left, height: bottom - top })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const box = cropBounds(data, info.width, info.height);
    if (box.left === 0 || box.top === 0 || box.left + box.width === info.width || box.top + box.height === info.height) {
      console.warn(`${pack}/${names[i]}: touches a source cell edge; inspect before repositioning`);
    }
    const outName = `${pack}-${names[i]}.webp`;
    await sharp(data, { raw: info }).extract(box).webp({ lossless: true, effort: 6 }).toFile(path.join(output, outName));
    manifest[pack][names[i]] = { src: `/worlds/props/${outName}`, width: box.width, height: box.height };
  }
  console.log(`${pack}: ${names.length} transparent props`);
}
await writeFile(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
