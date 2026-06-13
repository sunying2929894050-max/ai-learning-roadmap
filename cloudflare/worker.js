/**
 * Cloudflare Worker — BYOK 无密钥透传代理
 *
 * 安全设计：
 *   - 用户 key 只从请求头 X-User-Key 读取，只用于向上游发送 Authorization 头
 *   - 任何 console / log 调用均不包含 key 或其任何衍生值
 *   - Worker 本身无状态，key 在请求处理完成后随函数实例回收
 *   - 不写 KV / D1 / R2 / Cache，零持久化
 */

const UPSTREAM    = 'https://api.deepseek.com/chat/completions';
const ALLOW_ORIGIN = 'https://sunying2929894050-max.github.io';

const CORS = {
  'Access-Control-Allow-Origin':  ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Key',
  'Access-Control-Max-Age':       '86400',
};

function jsonReply(body, status, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

export default {
  async fetch(request) {

    /* ── CORS 预检 ── */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
      return jsonReply({ error: 'Method not allowed' }, 405);
    }

    /* ── 读取并验证用户 key（绝不 log）── */
    const userKey = (request.headers.get('X-User-Key') || '').trim();
    if (!userKey.startsWith('sk-')) {
      return jsonReply({ error: 'Missing or invalid X-User-Key header' }, 401);
    }

    /* ── 解析请求体 ── */
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonReply({ error: 'Invalid JSON body' }, 400);
    }

    // MVP: 强制非流式，端到端打通后可改为透传 stream 字段
    body.stream = false;

    /* ── 向上游转发（key 只在此处使用一次）── */
    let upstream;
    try {
      upstream = await fetch(UPSTREAM, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${userKey}`,   // ← key 唯一使用点
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // err.message 不含 key，安全打印
      return jsonReply({ error: `Upstream unreachable: ${err.message}` }, 502);
    }

    /* ── 透传响应 ── */
    const responseText = await upstream.text();
    return new Response(responseText, {
      status:  upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        ...CORS,
      },
    });
  },
};
