/**
 * Extract exhibit PNGs from 题库.pages and assign to cases missing exhibit_files.
 *
 * Usage:
 *   npm run import:pages
 *   npm run import:pages -- --pages "/Volumes/Document/File/CFA2/题库.pages"
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'web', 'cfa-data.js');
const exhibitsDir = join(root, 'web', 'exhibits');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const pagesPath = arg('--pages', '/Volumes/Document/File/CFA2/题库.pages');
const minBytes = Number(arg('--min-bytes', '8000'));

function between(raw, startMark, endMark) {
  const a = raw.indexOf(startMark);
  if (a < 0) throw new Error(`missing ${startMark}`);
  const b = raw.indexOf(endMark, a + startMark.length);
  if (b < 0) throw new Error(`missing ${endMark}`);
  return raw.slice(a + startMark.length, b).trim().replace(/;+\s*$/, '');
}

function exhibitNums(text) {
  const out = new Set();
  if (!text) return [];
  const re = /Exhibit\s+(\d+)/gi;
  let m;
  while ((m = re.exec(text))) out.add(Number(m[1]));
  return [...out].sort((a, b) => a - b);
}

function maxExhibitNum(c) {
  let max = 0;
  for (const n of exhibitNums(c.m || '')) max = Math.max(max, n);
  for (const q of c.qs || []) {
    for (const n of exhibitNums(q.q || '')) max = Math.max(max, n);
  }
  return max;
}

function extractPagesPngs(pagesFile, destDir) {
  mkdirSync(destDir, { recursive: true });
  const pyPath = join(tmpdir(), `cfa-pages-extract-${Date.now()}.py`);
  const py = `# -*- coding: utf-8 -*-
import zipfile, re, os
path = ${JSON.stringify(pagesFile)}
dest = ${JSON.stringify(destDir)}
min_bytes = ${minBytes}
os.makedirs(dest, exist_ok=True)
out = []
with zipfile.ZipFile(path, 'r') as z:
    for info in z.infolist():
        name = info.filename
        if not name.endswith('.png'):
            continue
        if '-small-' in name:
            continue
        if '__#$!@%!#__' in name:
            continue
        data = z.read(info.filename)
        if len(data) < min_bytes:
            continue
        m = re.search(r'(\\d+)\\.png$', name)
        num = int(m.group(1)) if m else len(out)
        fname = f'pg_{num:04d}.png'
        with open(os.path.join(dest, fname), 'wb') as f:
            f.write(data)
        out.append((num, fname, len(data)))
out.sort(key=lambda x: x[0])
print('EXTRACTED', len(out))
for row in out[:3]:
    print('SAMPLE', row)
for row in out[-2:]:
    print('SAMPLE', row)
`;
  writeFileSync(pyPath, py, 'utf8');
  try {
    const out = execSync(`python3 "${pyPath}"`, { encoding: 'utf8' });
    console.log(out.trim());
  } finally {
    try {
      unlinkSync(pyPath);
    } catch {
      /* ignore */
    }
  }
  return readdirSync(destDir)
    .filter((f) => f.startsWith('pg_') && f.endsWith('.png'))
    .sort();
}

if (!existsSync(pagesPath)) {
  console.error(`✗ 找不到 Pages 文件: ${pagesPath}`);
  process.exit(1);
}

console.log(`→ 从 Pages 提取图表: ${pagesPath}`);
const files = extractPagesPngs(pagesPath, exhibitsDir);
console.log(`✓ ${files.length} 张 Pages 图表 → web/exhibits/`);

const raw = readFileSync(dataPath, 'utf8');
const SM = eval(`(${between(raw, 'var SM=', 'var D=')})`);
const D = eval(`(${between(raw, 'var D=', 'var MK=')})`);
const MK = eval(`(${between(raw, 'var MK=', '\n')})`);

const used = new Set();
for (const c of D) {
  for (const f of c.exhibit_files || []) used.add(f);
}

let pool = files.filter((f) => !used.has(f));
let assigned = 0;
let casesFilled = 0;

for (const c of D) {
  if ((c.exhibit_files || []).length) continue;
  const need = maxExhibitNum(c);
  if (!need) continue;

  const picked = [];
  for (let i = 0; i < need && pool.length; i++) {
    picked.push(pool.shift());
  }
  if (!picked.length) break;

  c.exhibit_files = picked;
  delete c.exhibit_missing;
  assigned += picked.length;
  casesFilled++;
}

const banner = '/** CFA Level II bank — enriched with per-question exhibit refs + Pages exhibits */\n';
writeFileSync(dataPath, `${banner}var SM=${JSON.stringify(SM)};\nvar D=${JSON.stringify(D)};\nvar MK=${JSON.stringify(MK)};\n`, 'utf8');

console.log(`✓ 已为 ${casesFilled} 个缺图 Case 分配 ${assigned} 张 Pages 图表`);
console.log(`  剩余未分配 Pages 图: ${pool.length}`);
console.log('→ 运行 npm run enrich:cfa 更新 exhibit 标签');
