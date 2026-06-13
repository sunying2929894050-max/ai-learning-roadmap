// llm.js — 全站唯一的 LLM 调用入口
//
// 使用前：
//   1. 部署 cloudflare/worker.js，得到 xxx.workers.dev 地址
//   2. 把地址填入下方 WORKER_URL（保留末尾无斜杠）
//
// 模型说明：
//   deepseek-chat 将于 2026-07-24 废弃，届时改为 deepseek-v4-flash
//   只需修改下方 MODEL 常量即可，所有调用点不受影响

const WORKER_URL = 'https://damp-shape-22bb.sunying2929894050.workers.dev';
const MODEL      = 'deepseek-chat';  // 2026-07-24 后改为 'deepseek-v4-flash'

/**
 * callLLM(input, opts?) → Promise<string>
 *
 * @param {string | Array<{role:string, content:string}>} input
 *   字符串 → 自动包装为单条 user 消息；
 *   消息数组 → 直接使用。
 * @param {{ system?: string, maxTokens?: number }} [opts]
 * @returns {Promise<string>} 模型回复的纯文本
 *
 * 抛出时机：
 *   - 未填入 key → 引导用户去 ch4 填写，不显示技术错误
 *   - WORKER_URL 未配置 → 提示"将在下一步开通"
 *   - 上游返回非 2xx → 抛出带状态码的错误
 */
async function callLLM(input, opts = {}) {
  /* ── 1. 检查 key（先于 WORKER_URL，给出最准确的引导）── */
  const key = (sessionStorage.getItem('byok_key') || '').trim();
  if (!key) {
    const err = new Error('NO_KEY');
    err.friendly = '请先在 ch4「填入你的 API Key」一节填写 DeepSeek Key，再运行演示。';
    throw err;
  }

  /* ── 2. 检查 Worker 是否已部署 ── */
  if (!WORKER_URL) {
    const err = new Error('NO_WORKER');
    err.friendly = 'Key 已就绪 ✅  AI 直连接口将在 Worker 部署后自动开通，无需重新填写 Key。';
    throw err;
  }

  /* ── 3. 构建消息列表 ── */
  const messages = typeof input === 'string'
    ? [{ role: 'user', content: input }]
    : input;

  const body = {
    model:      MODEL,
    messages:   opts.system
                  ? [{ role: 'system', content: opts.system }, ...messages]
                  : messages,
    max_tokens: opts.maxTokens ?? 1024,
  };

  /* ── 4. 发请求（key 只在 X-User-Key 头，绝不进 URL / body）── */
  const res = await fetch(WORKER_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Key':   key,          // ← key 唯一出现点
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

window.callLLM = callLLM;
