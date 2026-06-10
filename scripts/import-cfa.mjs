/**
 * Import CFA Level II question bank into web/cfa-data.js + web/exhibits/
 *
 * Usage:
 *   npm run import:cfa
 *   npm run import:cfa -- --html ~/Downloads/CFA刷题通关_v6/index.html
 *   npm run import:cfa -- --exhibits ~/Downloads/CFA刷题通关_v6/exhibits
 *   npm run import:cfa -- --pdf "/Volumes/Document/File/CFA2/题库.pdf"
 *
 * The structured bank is extracted from the CFA刷题通关 HTML export (same content as 题库.pdf).
 * Direct PDF parsing cannot reliably recover exhibits; use the HTML + exhibits folder.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const webDir = join(root, 'web');
const exhibitsDest = join(webDir, 'exhibits');

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const pdfPath = arg('--pdf', '/Volumes/Document/File/CFA2/题库.pdf');
const htmlPath = arg(
  '--html',
  join(process.env.HOME, 'Downloads/CFA刷题通关_v6/index.html')
);
const exhibitsSrc = arg(
  '--exhibits',
  join(dirname(htmlPath), 'exhibits')
);

const htmlCandidates = [
  htmlPath,
  join(process.env.HOME, 'Downloads/CFA刷题通关_v6_1/index.html'),
  join(process.env.HOME, 'Downloads/CFA刷题通关_v6/index.html'),
  join(process.env.HOME, 'Downloads/CFA刷题通关_v5/index.html'),
].filter((p, i, a) => a.indexOf(p) === i);

let resolvedHtml = htmlCandidates.find((p) => existsSync(p));
if (!resolvedHtml) {
  console.error('✗ 找不到 CFA 结构化题库 HTML。请指定：');
  console.error('  npm run import:cfa -- --html /path/to/CFA刷题通关_v6/index.html');
  process.exit(1);
}

if (existsSync(pdfPath)) {
  const mb = (statSync(pdfPath).size / 1024 / 1024).toFixed(1);
  console.log(`✓ 题库 PDF: ${pdfPath} (${mb} MB)`);
} else {
  console.warn(`⚠ 未找到 PDF: ${pdfPath}（将仅导入 HTML 结构化数据）`);
}

console.log(`→ 提取题库: ${resolvedHtml}`);
const extract = spawnSync('node', [join(root, 'scripts/extract-cfa.mjs'), resolvedHtml], {
  stdio: 'inherit',
});

if (extract.status !== 0) process.exit(extract.status || 1);

const enrich = spawnSync('node', [join(root, 'scripts/enrich-cfa-data.mjs')], {
  stdio: 'inherit',
});
if (enrich.status !== 0) process.exit(enrich.status || 1);

const exhibitCandidates = [
  exhibitsSrc,
  join(dirname(resolvedHtml), 'exhibits'),
  join(process.env.HOME, 'Downloads/CFA刷题通关_v6/exhibits'),
  join(process.env.HOME, 'Downloads/CFA刷题通关_v6_1/exhibits'),
].filter((p, i, a) => a.indexOf(p) === i);

let resolvedExhibits = exhibitCandidates.find((p) => existsSync(p));
mkdirSync(exhibitsDest, { recursive: true });

if (resolvedExhibits) {
  const files = readdirSync(resolvedExhibits).filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f));
  for (const f of files) {
    cpSync(join(resolvedExhibits, f), join(exhibitsDest, f));
  }
  console.log(`✓ 已复制 ${files.length} 张图表 → web/exhibits/`);
} else {
  console.warn('⚠ 未找到 exhibits 目录，含图表的 Case 将无法显示图片');
}

// manifest for deploy
const manifest = {
  sourceHtml: resolvedHtml,
  sourcePdf: existsSync(pdfPath) ? pdfPath : null,
  exhibitsDir: resolvedExhibits || null,
  importedAt: new Date().toISOString(),
};
writeJson(join(root, 'questions', 'cfa-import.json'), manifest);
console.log('✓ CFA 题库导入完成');

function writeJson(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
