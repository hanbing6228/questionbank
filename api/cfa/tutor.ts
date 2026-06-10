import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_MODELS = 'gemini-2.5-flash-lite,gemini-2.5-flash,gemini-1.5-flash-8b';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getGoogleKey(): string | undefined {
  const raw =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  return raw?.trim() || undefined;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryDelayMs(msg: string): number | null {
  const m = msg.match(/retry in ([\d.]+)s/i);
  if (!m) return null;
  const sec = parseFloat(m[1]);
  if (!Number.isFinite(sec) || sec <= 0 || sec > 60) return null;
  return Math.ceil(sec * 1000) + 300;
}

function isQuotaError(msg: string): boolean {
  return /quota|rate limit|429|resource_exhausted/i.test(msg);
}

async function generateWithModel(
  model: string,
  system: string,
  user: string,
  key: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  let lastErr = `No response from ${model}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.6 },
      }),
    });

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      lastErr = data?.error?.message || `HTTP ${res.status} for ${model}`;
      const delay = parseRetryDelayMs(lastErr);
      if (delay && attempt < 2) {
        await sleep(delay);
        continue;
      }
      throw new Error(lastErr);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
    lastErr = `Empty response from ${model}`;
    break;
  }

  throw new Error(lastErr);
}

async function chatWithGemini(system: string, user: string, key: string): Promise<string> {
  const models = (process.env.GEMINI_MODEL || DEFAULT_MODELS)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  let lastErr = 'No models tried';
  for (const model of models) {
    try {
      return await generateWithModel(model, system, user, key);
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (!isQuotaError(lastErr)) continue;
    }
  }
  throw new Error(lastErr);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = getGoogleKey();
  if (!key) {
    return res.status(503).json({
      error: 'AI not configured',
      hint: 'Set GEMINI_API_KEY in Vercel Environment Variables, then Redeploy',
    });
  }

  const { message, context } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }

  const ctx = context && typeof context === 'object' ? context : {};
  const system = `你是 CFA Level II 备考辅导老师。用中文回答，条理清晰，必要时用 bullet 分点。
规则：
- 结合题目背景材料（Vignette）和 Exhibit 图表讲解考点
- 若学生尚未提交答案，引导思路、提示公式与判断步骤，不要直接给出正确选项字母
- 若学生已提交，可对照解析讲清为什么对/错
- 回答简洁，单次不超过 400 字，除非学生明确要求详细展开`;

  const user = [
    ctx.subject ? `科目：${ctx.subject}` : '',
    ctx.topic ? `知识点：${ctx.topic}` : '',
    ctx.material ? `背景材料：\n${String(ctx.material).slice(0, 4000)}` : '',
    ctx.question ? `题干：\n${ctx.question}` : '',
    ctx.options ? `选项：\n${ctx.options}` : '',
    ctx.submitted ? `学生已选：${ctx.userAnswer || '（未记录）'}` : '学生尚未提交答案',
    ctx.submitted && ctx.correctAnswer ? `正确答案：${ctx.correctAnswer}` : '',
    ctx.submitted && ctx.explanation ? `官方解析：${ctx.explanation}` : '',
    `学生提问：${message}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const text = await chatWithGemini(system, user, key);
    return res.status(200).json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cfa/tutor]', msg);
    const quota = isQuotaError(msg);
    return res.status(quota ? 429 : 500).json({
      error: quota ? 'quota_exceeded' : 'AI request failed',
      detail: msg,
    });
  }
}
