import { cpSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'web');
const files = ['index.html', 'styles.css', 'app.js', 'cfa-data.js', 'manifest.json', 'icon.svg'];

for (const destName of ['www', 'public']) {
  const dest = join(root, destName);
  mkdirSync(dest, { recursive: true });
  for (const file of files) {
    cpSync(join(src, file), join(dest, file));
  }
}

console.log('Synced www/ + public/ from web/');
