"""
文档助手 — ch8 产物：FastAPI 部署骨架（含流式接口）
来源：AI 学习路线 ch8 部署与作品集

依赖：pip install fastapi uvicorn openai chromadb
用法：
  export DEEPSEEK_API_KEY="sk-..."
  export OPENAI_API_KEY="sk-..."
  uvicorn ch8_fastapi:app --host 0.0.0.0 --port 8000
  # 访问 http://localhost:8000/docs 查看交互式文档

架构说明：
  调用方（前端/同事）→ 你的 FastAPI（提供方）→ DeepSeek API（你是调用方）
  这和 ch4 角色对称：ch4 你只是调用方，现在你同时是提供方。
"""

import os
import json
import time
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI

# 复用 ch5 的 RAG 管线（需先运行 ch5-rag-pipeline.py 完成入库）
try:
    from ch5_rag_pipeline import collection, embed_client as _emb
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    logging.warning("ch5_rag_pipeline 未导入，RAG 功能不可用。请先运行 ch5-rag-pipeline.py。")

app = FastAPI(
    title="TechCorp 文档问答助手",
    description="RAG + Agent + LLM-judge 的企业文档助手，ch3→ch8 的完整项目产物。",
    version="1.0.0",
)

ds = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


# ── 数据模型 ──────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    k: int = 3  # 检索 top-k 片段


class AskResponse(BaseModel):
    answer: str
    context_used: list[str]
    latency_ms: int


# ── 工具函数 ──────────────────────────────────────────────────────────

def retrieve(question: str, k: int = 3) -> list[str]:
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG 管线未初始化，请先运行 ch5-rag-pipeline.py")
    q_vec = _emb.embeddings.create(
        model="text-embedding-3-small", input=[question]
    ).data[0].embedding
    results = collection.query(query_embeddings=[q_vec], n_results=k)
    return results["documents"][0]


def build_prompt(context_chunks: list[str], question: str) -> str:
    import os as _os
    tpl_path = _os.path.join(_os.path.dirname(__file__), "ch3-qa-prompt.txt")
    with open(tpl_path) as f:
        template = f.read()
    context = "\n\n".join(context_chunks)
    return template.replace("{document_content}", context).replace("{user_question}", question)


# ── 路由：非流式 ──────────────────────────────────────────────────────

@app.post("/ask", response_model=AskResponse, summary="问答接口（非流式）")
def ask(req: AskRequest):
    """接收问题，返回 RAG 增强的回答和检索上下文。"""
    t0 = time.time()

    ctx = retrieve(req.question, req.k)
    prompt = build_prompt(ctx, req.question)

    resp = ds.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
    )
    answer = resp.choices[0].message.content
    latency_ms = int((time.time() - t0) * 1000)

    # 结构化日志（ch8 机制层：成本追踪 = ch4 token 知识的延伸）
    usage = resp.usage
    logging.info(json.dumps({
        "endpoint": "/ask",
        "question_len": len(req.question),
        "answer_len": len(answer),
        "latency_ms": latency_ms,
        "ctx_count": len(ctx),
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
    }))

    return AskResponse(answer=answer, context_used=ctx, latency_ms=latency_ms)


# ── 路由：流式（SSE）─────────────────────────────────────────────────

@app.post("/ask/stream", summary="流式问答接口（SSE）")
def ask_stream(req: AskRequest):
    """
    流式接口：先做 RAG 检索（快），再用 SSE 流式调大模型。
    ch8 机制层：你的 FastAPI 做 SSE 中继——对 DeepSeek 是消费方，对浏览器是生产方。
    前端用 EventSource 或 fetch+ReadableStream 消费。
    """
    ctx = retrieve(req.question, req.k)
    prompt = build_prompt(ctx, req.question)

    def generate():
        # 先推送检索到的上下文（方便前端显示"正在检索…"）
        yield f"data: {json.dumps({'type': 'context', 'chunks': ctx})}\n\n"

        # 再流式调大模型
        for chunk in ds.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
            stream=True,
        ):
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield f"data: {json.dumps({'type': 'token', 'delta': delta})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── 路由：健康检查 ────────────────────────────────────────────────────

@app.get("/health", summary="健康检查")
def health():
    return {"status": "ok", "rag_available": RAG_AVAILABLE}
