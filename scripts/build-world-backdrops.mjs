import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const source = path.join(root, "assets/worlds/source");
const output = path.join(root, "public/worlds");
const worlds = ["jdm-drift", "cyberpunk-arcade", "football-sideline"];

await mkdir(output, { recursive: true });
for (const world of worlds) {
  const input = path.join(source, `${world}.png`);
  const metadata = await sharp(input).metadata();
  if ((metadata.width ?? 0) < 1600 || (metadata.height ?? 0) < 900) {
    throw new Error(`${world}: source image is too small for the scene`);
  }
  await sharp(input).webp({ quality: 88, effort: 6 }).toFile(path.join(output, `${world}.webp`));
  console.log(`${world}: ${metadata.width}×${metadata.height} source → WebP`);
}
