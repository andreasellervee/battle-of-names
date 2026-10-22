import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const palettePath = 'src/data/shirtPalette.json';
const palette = JSON.parse(readFileSync(resolve(root, palettePath), 'utf8'));
const ids = palette.map(p => p.id);
if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-z]+$/.test(id)) || ['teal', 'ruby', 'gold'].some(id => !ids.includes(id))) {
  throw new Error('Shirt palette must have unique safe IDs and the three original outfits.');
}
const hash = data => createHash('sha256').update(data).digest('hex');
const sourceFiles = [palettePath, 'scripts/build-character-assets.py', 'scripts/prepare-character-assets.mjs', ...['body-teal', 'body-ruby', 'body-gold', 'axe', 'shield'].map(name => `public/assets/visual-identity/illustrated-v2/${name}-v2.png`)];
const sourceHash = hash(Buffer.concat(sourceFiles.map(path => readFileSync(resolve(root, path)))));
const outputRoot = resolve(root, 'public/assets/battle/v1');
const outputFiles = [256, 512].flatMap(size => [...ids.map(id => `body-${id}`), 'axe', 'shield'].map(name => `${size}/${name}.webp`));
const manifestPath = resolve(outputRoot, 'manifest.json');
let manifest;
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { /* Generate missing or invalid manifest. */ }
const current = manifest?.sourceHash === sourceHash && outputFiles.every(file => {
  const path = resolve(outputRoot, file);
  return existsSync(path) && manifest.files?.[file]?.sha256 === hash(readFileSync(path));
});
if (current && !process.argv.includes('--force')) {
  console.log('Character assets are current (no image processing needed).');
} else if (process.argv.includes('--check')) {
  console.error('Character assets are stale or missing. Run npm run assets:build.');
  process.exitCode = 1;
} else {
  const result = spawnSync(process.env.ASSET_PYTHON || 'python3', [resolve(root, 'scripts/build-character-assets.py')], { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error('Asset generation requires Python 3 and Pillow. Install scripts/requirements-assets.txt, or set ASSET_PYTHON to an environment that has Pillow.');
    process.exitCode = 1;
  } else {
    const files = Object.fromEntries(outputFiles.map(file => {
      const data = readFileSync(resolve(outputRoot, file));
      return [file, { bytes: data.length, sha256: hash(data) }];
    }));
    writeFileSync(manifestPath, JSON.stringify({ sourceHash, files }, null, 2) + '\n');
    for (const size of [256, 512]) {
      const bytes = Object.entries(files).filter(([name]) => name.startsWith(`${size}/`)).reduce((sum, [, file]) => sum + file.bytes, 0);
      console.log(`${size}px: ${Math.round(bytes / 1024)} KiB for all ${ids.length} outfits + equipment`);
    }
    console.log(`Wrote ${relative(root, manifestPath)}. Commit the generated sprites and manifest with source changes.`);
  }
}
