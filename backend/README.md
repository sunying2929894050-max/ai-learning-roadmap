# LLM Proxy — 部署手册（BYOK 模式）

## 安全声明

**本服务不持有任何 LLM API Key。**
用户通过请求头 `X-User-Key` 传入自己的 DeepSeek key，服务仅做一次性透传：
读取 → 放入上游请求头 → 请求结束后立即销毁，绝不写入日志、数据库或任何持久化存储。

---

## 目录结构

```
backend/
├── main.py               # FastAPI 应用
├── requirements.txt
├── .env.example          # 非敏感配置模板（提交到 git）
├── .env                  # 运行时配置（绝不提交）
├── llm-proxy.service     # systemd 单元文件
└── nginx-snippet.conf    # nginx 反向代理片段
```

---

## 首次部署

```bash
# 1. 上传到服务器
scp -r backend/ user@your-server:/opt/llm-proxy

# 2. 创建虚拟环境并安装依赖
cd /opt/llm-proxy
python3 -m venv venv
venv/bin/pip install -r requirements.txt

# 3. 创建运行时配置（无需填任何 key）
cp .env.example .env
# 按需修改端口、允许的 Origin 等

# 4. 安装 systemd 服务
sudo cp llm-proxy.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now llm-proxy

# 5. 检查状态
sudo systemctl status llm-proxy
```

---

## nginx 配置

把 `nginx-snippet.conf` 的内容粘贴进 SSL `server { }` 块，然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## tmux 替代方案

```bash
tmux new-session -d -s llm-proxy \
  'cd /opt/llm-proxy && venv/bin/uvicorn main:app --host 127.0.0.1 --port 8787'
```

---

## 验收 curl 示例

### 正常调用（用户自带 key）
```bash
curl -N -X POST https://your-domain.com/api/llm \
  -H "Content-Type: application/json" \
  -H "X-User-Key: sk-your-own-deepseek-key" \
  -H "Origin: https://sunying2929894050-max.github.io" \
  -d '{"messages":[{"role":"user","content":"用一句话解释什么是机器学习"}]}'
```

### 缺少 key → 401
```bash
curl -s -X POST https://your-domain.com/api/llm \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hi"}]}'
# {"error":"unauthorized","message":"API key required. Pass your DeepSeek key in X-User-Key."}
```

### max_tokens 钳制（传 99999，实际上限 2048）
```bash
curl -s -X POST https://your-domain.com/api/llm \
  -H "Content-Type: application/json" \
  -H "X-User-Key: sk-your-key" \
  -d '{"messages":[{"role":"user","content":"hi"}],"max_tokens":99999}' | head -c 200
```

### 连续猛打触发 IP 限流 → 429
```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "req $i: %{http_code}\n" \
    -X POST https://your-domain.com/api/llm \
    -H "Content-Type: application/json" \
    -H "X-User-Key: sk-your-key" \
    -d '{"messages":[{"role":"user","content":"ping"}]}'
done
# 第 31 次起返回 429
```

### 健康检查
```bash
curl https://your-domain.com/health
# {"status":"ok","mode":"byok"}
```

---

## 监控

```bash
# 查看实时日志（日志中不含任何 key）
sudo journalctl -u llm-proxy -f
```

---

## 更新部署

```bash
scp backend/main.py user@your-server:/opt/llm-proxy/
sudo systemctl restart llm-proxy
```
