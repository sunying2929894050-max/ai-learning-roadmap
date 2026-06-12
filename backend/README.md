# LLM Proxy — 部署手册

## 目录结构

```
backend/
├── main.py               # FastAPI 应用
├── requirements.txt
├── .env.example          # 配置模板（提交到 git）
├── .env                  # 真实配置（绝对不提交）
├── llm-proxy.service     # systemd 单元文件
└── nginx-snippet.conf    # nginx 反向代理片段
```

---

## 首次部署

```bash
# 1. 把 backend/ 目录上传到服务器（建议放 /opt/llm-proxy）
scp -r backend/ user@your-server:/opt/llm-proxy

# 2. 创建虚拟环境并安装依赖
cd /opt/llm-proxy
python3 -m venv venv
venv/bin/pip install -r requirements.txt

# 3. 创建 .env
cp .env.example .env
nano .env          # 填入真实 DEEPSEEK_API_KEY 等

# 4. 安装 systemd 服务
sudo cp llm-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now llm-proxy

# 5. 检查状态
sudo systemctl status llm-proxy
```

---

## nginx 配置

把 `nginx-snippet.conf` 的内容粘贴进你的 `server { }` SSL 块，然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## tmux 替代方案（不用 systemd 时）

```bash
tmux new-session -d -s llm-proxy \
  'cd /opt/llm-proxy && source .env && venv/bin/uvicorn main:app --host 127.0.0.1 --port 8787'
```

---

## 验收 curl 示例

### 正常调用（流式）
```bash
curl -N -X POST https://your-domain.com/api/llm \
  -H "Content-Type: application/json" \
  -H "Origin: https://sunying2929894050-max.github.io" \
  -d '{"messages":[{"role":"user","content":"用一句话解释什么是机器学习"}]}'
```

### max_tokens 钳制验证（传 99999，实际上限 1024）
```bash
curl -s -X POST https://your-domain.com/api/llm \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}],"max_tokens":99999}' \
  | head -c 500
# 观察返回的 SSE 中 usage.completion_tokens <= 1024
```

### 触发 IP 限流（连续猛打）
```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "req $i: %{http_code}\n" \
    -X POST https://your-domain.com/api/llm \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"ping"}]}'
done
# 第 11 次起应返回 429
```

### 健康检查（含每日计数）
```bash
curl https://your-domain.com/health
# {"status":"ok","daily_calls":N,"daily_throttled":0,"daily_limit":2000}
```

### 非白名单 Origin 被 CORS 拦截
```bash
curl -s -X POST https://your-domain.com/api/llm \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.example.com" \
  -d '{"messages":[{"role":"user","content":"hi"}]}' -v 2>&1 | grep -i "access-control"
# 浏览器会拦截；curl 本身不强制 CORS，但响应头里不会有 Access-Control-Allow-Origin
```

---

## 监控额度消耗

```bash
# 查看当日调用次数
curl https://your-domain.com/health | python3 -m json.tool

# 查看进程日志（systemd）
sudo journalctl -u llm-proxy -f
```

---

## 更新部署

```bash
scp backend/main.py user@your-server:/opt/llm-proxy/
sudo systemctl restart llm-proxy
```
