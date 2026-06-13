# TechCorp 文档问答助手

> 一句话：让员工用自然语言查询公司 HR 政策和规章，无需翻 PDF。

**[在线 Demo →](https://sunying2929894050-max.github.io/ai-learning-roadmap/)**

---

## 问题

企业内部文档（HR 政策、报销规定、绩效制度）散落在多份 PDF 里。员工想查一个信息要翻好几份文件，HR 团队每天重复回答相同问题。

**目标：** 构建一个能基于私有文档回答问题的 AI 助手，回答可追溯来源，不捏造信息。

---

## 架构

```
用户问题
   ↓
[提示词工程] ch3 — RTCF 框架 QA 模板
   ↓
[RAG 检索] ch5 — text-embedding-3-small + ChromaDB → top-3 相关片段
   ↓
[上下文注入] — 把片段拼进 prompt
   ↓
[LLM 生成] ch4 — DeepSeek API（流式 SSE）
   ↓
[Agent 扩展] ch6 — ReAct 循环：calculator / search_docs / get_time
   ↓
[评估] ch7 — LLM-as-judge rubric（忠实度/完整性/相关性/简洁性）
   ↓
[部署] ch8 — FastAPI + Cloudflare Worker（密钥代理）
```

---

## 做了什么

| 模块 | 技术细节 |
|------|----------|
| 提示词工程 | RTCF 框架结构化 QA prompt；few-shot 示例引导格式；CoT 推理链 |
| RAG 检索 | text-embedding-3-small 嵌入；ChromaDB 向量库；chunk_size=400 token，overlap=50；top-3 检索 |
| Agent | ReAct 循环（最多 5 步）；工具：calculator / search_docs / get_time；JSON 结构化输出 |
| 评估 | 5 条 eval set；LLM-as-judge 4 维 rubric；关键词快速检查（零 API 成本） |
| 部署 | FastAPI 非流式 + SSE 流式接口；Cloudflare Worker 密钥代理；环境变量注入 |

---

## 评估结果

| 指标 | 数值 |
|------|------|
| 关键词命中率（平均） | 填入你跑出的数字，如 92% |
| LLM-judge 平均分 | 填入你跑出的数字，如 8.2/10 |
| 低分案例（<7分） | 填入实际低分 ID，如 e5（CEO 薪资——文档中确实没有此信息） |

> 完整评估报告见 `project/eval_report.json`（运行 `python3 project/ch7-eval.py` 生成）。

---

## 关键取舍

**为什么用关键词 bigram 检索做演示，而非真实向量检索？**
演示环节在浏览器静态页面里运行，无法调 embedding API。用 bigram 字符重叠模拟语义检索，并在 UI 上标注"演示用简化检索"。真实 RAG 管线（`project/ch5-rag-pipeline.py`）使用 text-embedding-3-small + ChromaDB。

**为什么选 DeepSeek 而不是 Claude？**
价格更低，适合演示和评估场景的高频调用。生产替换只需改 base_url 和 model 参数。

**Agent 的局限：**
当前工具集仅包含 calculator / search_docs / get_time，不能调外部 API 或写文件。ReAct 循环上限 5 步，超出后强制终止。

---

## 还能改进什么

- [ ] 切块策略优化：当前固定 chunk_size，可以改成按段落/标题感知切块
- [ ] 混合检索：向量检索 + BM25 关键词检索取交集，提升精确率
- [ ] 评估集扩充：5 条太少，目标 50+ 条，覆盖更多真实用户问法
- [ ] 流式接口前端：把 `/ask/stream` 接到演示页面，减少感知延迟
- [ ] 用户反馈收集：点赞/踩数据存 DB，驱动在线评估

---

## 快速运行

```bash
# 1. 安装依赖
pip install openai chromadb fastapi uvicorn

# 2. 配置环境变量
export OPENAI_API_KEY="sk-..."      # embedding 模型
export DEEPSEEK_API_KEY="sk-..."   # 生成 + 评判模型

# 3. 建库
python3 project/ch5-rag-pipeline.py

# 4. 启动 API
uvicorn project.ch8_fastapi:app --host 0.0.0.0 --port 8000
# 访问 http://localhost:8000/docs

# 5. 跑评估
python3 project/ch7-eval.py
```

---

## 项目文件结构

```
project/
├── ch3-qa-prompt.txt      # RTCF 结构化 QA 提示词模板
├── ch4-api-client.py      # DeepSeek API 调用示例
├── ch5-rag-pipeline.py    # RAG 管线：文档入库 + 检索 + 生成
├── ch6-agent.py           # ReAct Agent：工具定义 + 循环
├── ch7-eval.py            # LLM-as-judge 评估脚本
├── ch8-fastapi.py         # FastAPI 部署骨架（非流式 + SSE 流式）
└── PORTFOLIO_README.md    # 本文件
```

---

## 简历表述示例

> 独立构建企业 HR 文档问答助手：RAG 检索（ChromaDB + text-embedding-3-small）+ ReAct Agent 工具调用 + LLM-as-judge 自动评估，LLM 评分均值 8.2/10、关键词命中率 92%，以 FastAPI + Cloudflare Worker 部署。

---

*本项目是 [AI 学习路线 ch1→ch8](https://sunying2929894050-max.github.io/ai-learning-roadmap/) 的贯穿产物。*
