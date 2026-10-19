// Deterministic crops and background extension. Original inputs are never written to.
import sharp from 'sharp';
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const target = 'src/assets/brand';
await mkdir(target, { recursive: true });
const files = await readdir('img');
const inputs = [
  { file: 'logo vegan alta.jpeg', output: 'vegan-records.png', height: 1210 },
  { file: files.find(file => file.endsWith('.png')), output: 'vegan-music-store.png', height: 3200, paddingBottom: 975 },
];
const hashes = [];
for (const { file, output, height, paddingBottom = 0 } of inputs) {
  const source = join('img', file);
  const originalBytes = await readFile(source);
  const sha256 = createHash('sha256').update(originalBytes).digest('hex');
  const { width } = await sharp(originalBytes).metadata();
  const region = { left: 0, top: 0, width, height };
  const path = join(target, output);
  const core = await sharp(originalBytes).extract(region).png().toBuffer();
  if (paddingBottom) {
    // Clean background below the original captions; keeps the texture and lilac band.
    const patches = [];
    for (let added = 0; added < paddingBottom;) {
      const chunk = Math.min(716, paddingBottom - added);
      const input = await sharp(originalBytes).extract({ left: 0, top: 4300, width, height: chunk }).png().toBuffer();
      patches.push({ input, left: 0, top: height + added });
      added += chunk;
    }
    await sharp(core).extend({ bottom: paddingBottom, top: 0, left: 0, right: 0, background: '#fff' }).composite(patches).removeAlpha().png().toFile(path);
  } else await sharp(core).png().toFile(path);
  const retained = await sharp(originalBytes).extract(region).raw().toBuffer();
  const result = await sharp(path).extract(region).raw().toBuffer();
  if (!retained.equals(result)) throw new Error(`Los píxeles de ${output} no coinciden.`);
  if (!originalBytes.equals(await readFile(source))) throw new Error(`El original ${file} cambió.`);
  hashes.push({ source, sha256, output: path, crop: region, paddingBottom, ...(paddingBottom ? { cleanBackgroundSourceY: 4300, textTopMargin: 1095, textBottomMargin: 1095 } : {}), retainedPixelsIdentical: true });
  console.log(`${path}: ${width} × ${height + paddingBottom}. Píxeles conservados idénticos; original intacto.`);
}
await writeFile(join(target, 'provenance.json'), JSON.stringify(hashes, null, 2) + '\n');
