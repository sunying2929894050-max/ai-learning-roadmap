# 部署 Cloudflare Worker

Worker 文件：`cloudflare/worker.js`
作用：BYOK 无密钥透传代理（把浏览器无法直连的 DeepSeek API 变成可跨域调用的端点）

---

## 方式一：Cloudflare 后台直接粘贴（最快，无需 CLI）

1. 访问 https://dash.cloudflare.com，登录（免费账号即可）
2. 左侧菜单 → **Workers & Pages** → 点击 **Create**
3. 选择 **Create Worker** → 点击 **Deploy**（先部署一个空的）
4. 部署完成后点击 **Edit Code**
5. 把 `cloudflare/worker.js` 的全部内容**粘贴**进编辑器，覆盖原来的代码
6. 点击右上角 **Save and Deploy**
7. 复制弹出的 Worker 地址，格式为 `https://ai-roadmap.YOUR_SUBDOMAIN.workers.dev`

---

## 方式二：wrangler CLI 部署

```bash
# 安装 wrangler（需要 Node.js >= 18）
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 进入 cloudflare 目录部署
cd cloudflare
wrangler deploy
```

部署成功后终端会输出 Worker URL，格式同上。

---

## 部署后：填入前端配置

打开 `assets/llm.js`，找到第一个常量：

```javascript
const WORKER_URL = '';  // ← 把你的 workers.dev 地址填进来
```

改为：

```javascript
const WORKER_URL = 'https://ai-roadmap.YOUR_SUBDOMAIN.workers.dev';
```

保存、提交、推送到 GitHub，GitHub Pages 自动更新。

---

## 验证部署正确

用 curl 测试（不要用真实 key 测试，用一个假的验证格式）：

```bash
# 应返回 401（key 缺失）
curl -X POST https://YOUR_WORKER.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hi"}]}'

# 应返回 401（key 格式错误）
curl -X POST https://YOUR_WORKER.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-User-Key: not-a-real-key" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hi"}]}'
```

用真实 key 测试：

```bash
curl -X POST https://YOUR_WORKER.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-User-Key: sk-你的真实key" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"用一句话介绍自己"}]}'
# 应返回 DeepSeek 的 JSON 响应
```

---

## 免费额度

Cloudflare Workers 免费套餐：每天 10 万次请求，学习使用完全够用。
超出后按 $0.30/百万次请求计费。
