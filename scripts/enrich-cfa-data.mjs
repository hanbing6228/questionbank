/**
 * Annotate CFA bank: per-question exhibit refs + case exhibit labels.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'web', 'cfa-data.js');

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

function buildExhibitLabels(c) {
  const files = c.exhibit_files || [];
  const mentioned = exhibitNums(c.m || '');
  return files.map((file, i) => ({
    file,
    label: mentioned[i] ?? i + 1,
  }));
}

const raw = readFileSync(dataPath, 'utf8');
const SM = eval(`(${between(raw, 'var SM=', 'var D=')})`);
const D = eval(`(${between(raw, 'var D=', 'var MK=')})`);
const MK = eval(`(${between(raw, 'var MK=', '\n')})`);

let qCount = 0;
let withRefs = 0;
let missingExhibitCases = 0;

for (const c of D) {
  c.exhibit_labels = buildExhibitLabels(c);
  const needsExhibit =
    exhibitNums(c.m).length > 0 || (c.qs || []).some((q) => exhibitNums(q.q).length > 0);
  if (needsExhibit && !(c.exhibit_files || []).length) {
    c.exhibit_missing = true;
    missingExhibitCases++;
  } else {
    delete c.exhibit_missing;
  }

  for (const q of c.qs || []) {
    q.exhibit_refs = exhibitNums(q.q);
    qCount++;
    if (q.exhibit_refs.length) withRefs++;
  }
}

const banner = '/** CFA Level II bank — enriched with per-question exhibit refs */\n';
const body = `var SM=${JSON.stringify(SM)};\nvar D=${JSON.stringify(D)};\nvar MK=${JSON.stringify(MK)};\n`;
writeFileSync(dataPath, banner + body, 'utf8');

const mb = (Buffer.byteLength(dataPath) / 1024 / 1024).toFixed(2);
console.log(`✓ Enriched ${dataPath} (${mb} MB)`);
console.log(`  ${qCount} questions · ${withRefs} reference Exhibit · ${missingExhibitCases} cases missing chart images`);
