import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] || join(process.env.HOME, 'Downloads/CFA刷题通关_v6/index.html');
const t = readFileSync(src, 'utf8');

function between(startMark, endMark) {
  const a = t.indexOf(startMark);
  if (a < 0) throw new Error(`missing ${startMark}`);
  const b = t.indexOf(endMark, a + startMark.length);
  if (b < 0) throw new Error(`missing ${endMark}`);
  return t.slice(a + startMark.length, b).trim().replace(/;+\s*$/, '');
}

const SM = between('const SM=', 'const D=');
const D = between('const D=', 'const MK=');
const MK = between('const MK=', 'try{const sv');

const outPath = join(root, 'web', 'cfa-data.js');
const banner = '/** Auto-extracted from CFA刷题通关_v6 — do not edit by hand */\n';
writeFileSync(outPath, `${banner}const SM=${SM};\nconst D=${D};\nconst MK=${MK};\n`, 'utf8');

const sizeMb = (Buffer.byteLength(outPath) / 1024 / 1024).toFixed(2);
console.log(`Wrote ${outPath} (${sizeMb} MB)`);
