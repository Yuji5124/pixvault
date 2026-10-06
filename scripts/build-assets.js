import { readdir, readFile, mkdir, writeFile, stat, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { generateTags } from './generate-tags.js';

export async function buildAssets(publicDir = path.resolve('public')) {
  const root = path.join(publicDir, 'assets');
  const output = path.join(publicDir, 'data/assets.json');
  await mkdir(root, { recursive: true });
  let existing = [];
  try { existing = JSON.parse(await readFile(output, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const previous = new Map(existing.map(a => [a.file, a]));
  const files = [];
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && /\.png$/i.test(entry.name)) files.push(full);
    }
  }
  await walk(root);
  const assets = [], hashes = new Map();
  for (const full of files) {
    const relative = path.relative(root, full).split(path.sep).join('/');
    const file = `assets/${relative}`, old = previous.get(file) || {};
    const bytes = await readFile(full), info = await stat(full);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const image = sharp(bytes, { limitInputPixels: 100_000_000 });
    const metadata = await image.metadata();
    if (metadata.format !== 'png') throw new Error(`Not a PNG: ${relative}`);
    const stats = await image.stats();
    const transparent = Boolean(metadata.hasAlpha && stats.channels.at(-1).min < 255);
    const thumbnail = `thumbnails/${relative}.webp`;
    await mkdir(path.dirname(path.join(publicDir, thumbnail)), { recursive: true });
    await sharp(bytes).resize(256, 256, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(publicDir, thumbnail));
    if (hashes.has(hash)) console.warn(`Duplicate asset detected: ${relative} = ${hashes.get(hash)}`);
    hashes.set(hash, relative);
    assets.push({ ...old, id: old.id || `asset-${createHash('sha256').update(file).digest('hex').slice(0,20)}`, name: path.basename(relative).replace(/\.png$/i,''), file, thumbnail,
      category: relative.includes('/') ? relative.split('/')[0] : 'misc',
      tags: generateTags(relative, old.tags || []), aiTags: old.aiTags || [],
      width: metadata.width, height: metadata.height, transparent, format: 'png', fileSize: bytes.length, hash,
      createdAt: old.createdAt || info.mtime.toISOString(), description: old.description || '' });
  }
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, JSON.stringify(assets, null, 2) + '\n');
  await rename(`${output}.tmp`, output);
  console.log(`Indexed ${assets.length} PNG assets.`);
  return assets;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildAssets().catch(e => { console.error(e.message); process.exitCode = 1; });
}
