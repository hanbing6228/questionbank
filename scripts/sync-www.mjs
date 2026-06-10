import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'web');
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'cfa-app.js',
  'cfa-data.js',
  'data.js',
  'manifest.json',
  'icon.svg',
];

function copyExhibits(destRoot) {
  const exSrc = join(src, 'exhibits');
  if (!existsSync(exSrc)) return;
  const exDest = join(destRoot, 'exhibits');
  mkdirSync(exDest, { recursive: true });
  for (const f of readdirSync(exSrc)) {
    if (/\.(jpe?g|png|webp|gif)$/i.test(f)) {
      cpSync(join(exSrc, f), join(exDest, f));
    }
  }
}

for (const destName of ['www', 'public']) {
  const dest = join(root, destName);
  mkdirSync(dest, { recursive: true });
  for (const file of files) {
    const from = join(src, file);
    if (existsSync(from)) cpSync(from, join(dest, file));
  }
  copyExhibits(dest);
}

console.log('Synced www/ + public/ from web/');
