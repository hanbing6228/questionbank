import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { dirname, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const questionsDir = join(root, 'questions');
const outFile = join(root, 'web', 'data.js');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      if (ch === '\r') i++;
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

function letterToIndex(letter) {
  const u = String(letter).trim().toUpperCase();
  if (!u) return null;
  const code = u.charCodeAt(0) - 65;
  return code >= 0 && code < 26 ? code : null;
}

function parseAnswer(raw, type) {
  const s = String(raw ?? '').trim();
  if (type === 'judge') {
    const lower = s.toLowerCase();
    if (['true', '1', 'yes', '正确', '对', 't', 'y'].includes(lower)) return true;
    if (['false', '0', 'no', '错误', '错', 'f', 'n'].includes(lower)) return false;
    throw new Error(`无法解析判断题答案: ${raw}`);
  }
  if (type === 'multi') {
    const parts = s.split(/[,，;；\s]+/).filter(Boolean);
    const idx = parts.map((p) => {
      const li = letterToIndex(p);
      if (li !== null) return li;
      const n = Number(p);
      if (!Number.isNaN(n)) return n;
      throw new Error(`无法解析多选答案: ${p}`);
    });
    return [...new Set(idx)].sort((a, b) => a - b);
  }
  const li = letterToIndex(s);
  if (li !== null) return li;
  const n = Number(s);
  if (!Number.isNaN(n)) return n;
  throw new Error(`无法解析单选答案: ${raw}`);
}

function csvRowToQuestion(headers, values) {
  const row = Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] ?? '').trim()]));
  const type = row.type;
  if (!['single', 'multi', 'judge'].includes(type)) {
    throw new Error(`无效题型 ${type}，题目 id=${row.id}`);
  }

  const options = [row.optionA, row.optionB, row.optionC, row.optionD].filter((o) => o && o.length > 0);
  const q = {
    id: row.id,
    category: row.category,
    type,
    stem: row.stem,
    answer: parseAnswer(row.answer, type),
    explanation: row.explanation || '',
    difficulty: Math.min(3, Math.max(1, Number(row.difficulty) || 1)),
  };
  if (type !== 'judge') {
    if (options.length < 2) throw new Error(`选择题至少需要 2 个选项: ${row.id}`);
    q.options = options;
  }
  return q;
}

function loadJsonBank(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (Array.isArray(data)) return { questions: data };
  return data;
}

function mergeBanks(banks) {
  const base = banks.find((b) => b.id && b.categories) || banks[0];
  const merged = {
    id: base.id || 'default',
    title: base.title || '题库',
    categories: [...(base.categories || [])],
    questions: [],
  };

  const catIds = new Set(merged.categories.map((c) => c.id));
  const seen = new Set();

  for (const bank of banks) {
    for (const c of bank.categories || []) {
      if (!catIds.has(c.id)) {
        merged.categories.push(c);
        catIds.add(c.id);
      }
    }
    for (const q of bank.questions || []) {
      if (seen.has(q.id)) {
        console.warn(`跳过重复题目 id: ${q.id}`);
        continue;
      }
      seen.add(q.id);
      merged.questions.push(q);
    }
  }

  return merged;
}

function validateQuestion(q) {
  if (!q.id || !q.category || !q.stem) {
    throw new Error(`题目缺少必填字段: ${JSON.stringify(q)}`);
  }
  if (!['single', 'multi', 'judge'].includes(q.type)) {
    throw new Error(`无效题型: ${q.id}`);
  }
}

function main() {
  const banks = [];

  const bankJson = join(questionsDir, 'bank.json');
  if (existsSync(bankJson)) {
    banks.push(loadJsonBank(bankJson));
    console.log('Loaded bank.json');
  }

  for (const file of readdirSync(questionsDir)) {
    const full = join(questionsDir, file);
    if (file === 'bank.json') continue;
    if (extname(file).toLowerCase() === '.json') {
      banks.push(loadJsonBank(full));
      console.log(`Loaded ${file}`);
    }
  }

  const csvFiles = readdirSync(questionsDir).filter((f) => extname(f).toLowerCase() === '.csv');
  for (const file of csvFiles) {
    const text = readFileSync(join(questionsDir, file), 'utf8');
    const rows = parseCsv(text);
    if (rows.length < 2) continue;
    const headers = rows[0];
    const questions = rows.slice(1).map((r) => csvRowToQuestion(headers, r));
    banks.push({ questions });
    console.log(`Loaded ${file} (${questions.length} questions)`);
  }

  if (!banks.length) {
    throw new Error('questions/ 目录下未找到 bank.json 或 CSV 文件');
  }

  const bank = mergeBanks(banks);
  bank.questions.forEach(validateQuestion);

  const js = `/** 由 scripts/import-questions.mjs 自动生成，请勿手改 */\n/** @typedef {'single'|'multi'|'judge'} QType */\n\nconst QUESTION_BANK = ${JSON.stringify(bank, null, 2)};\n`;

  writeFileSync(outFile, js, 'utf8');
  console.log(`\n✓ 已生成 web/data.js`);
  console.log(`  题库: ${bank.title}`);
  console.log(`  分类: ${bank.categories.length}`);
  console.log(`  题目: ${bank.questions.length}`);
}

main();
