# 贯穿项目：我的文档助手

> 来源：AI 学习路线 · 主线项目

## 项目目标

做一个能回答你自己文档问题的 AI 助手。
从一个 prompt 模板出发，逐章迭代，最终成为可部署的产品。

## 各章演进路线

| 章节 | 加入的能力 | 产物 |
|------|-----------|------|
| ch3 提示词工程 | 结构化 QA prompt 模板 | `ch3-qa-prompt.txt` |
| ch4 大模型 API | 接入 Anthropic API，让 prompt 真正运行 | `ch4-api-client.py` |
| ch5 RAG | 文档向量化 + 语义检索，不再靠复制粘贴 | `ch5-rag-pipeline.py` |
| ch6 Agent | 加搜索工具，支持多步骤任务 | `ch6-agent.py` |
| ch7 评估 | 自动评估回答质量，建立基线 | `ch7-eval.py` |
| ch8 部署 | 打包为 Web 应用，对外可用 | `ch8-app/` |

## 当前状态

- [x] ch3：QA prompt 模板已就绪（`ch3-qa-prompt.txt`）
- [ ] ch4：等待接入 API
- [ ] ch5-ch8：未开始

## 运行方式

> 待 ch4 完成后补充。目前只有 prompt 模板，还不能运行。
