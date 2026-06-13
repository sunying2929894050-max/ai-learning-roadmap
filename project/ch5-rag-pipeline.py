"""
文档助手 — ch5 产物：RAG 管线
来源：AI 学习路线 ch5 RAG：让模型用你的私有知识

依赖：pip install openai chromadb
嵌入模型用 OpenAI text-embedding-3-small（DeepSeek 暂无嵌入 API）

用法：
  1. export OPENAI_API_KEY="sk-..."
  2. export DEEPSEEK_API_KEY="sk-..."
  3. python3 ch5-rag-pipeline.py
"""

import os
from openai import OpenAI
import chromadb

embed_client = OpenAI()          # 用 OPENAI_API_KEY 做嵌入
chroma = chromadb.Client()
collection = chroma.get_or_create_collection("docs")


# ── 切块函数 ──
def chunk_text(text: str, size: int = 400, overlap: int = 80) -> list[str]:
    chunks, start = [], 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return chunks


# ── 入库（离线，执行一次） ──
def index_document(doc_id: str, text: str) -> None:
    chunks = chunk_text(text)
    embeddings = embed_client.embeddings.create(
        model="text-embedding-3-small",
        input=chunks,
    ).data
    collection.add(
        ids=[f"{doc_id}_{i}" for i in range(len(chunks))],
        embeddings=[e.embedding for e in embeddings],
        documents=chunks,
    )
    print(f"已入库 {len(chunks)} 个片段（doc_id={doc_id}）")


# ── 检索 + 生成（每次提问） ──
def rag_answer(question: str, k: int = 3) -> str:
    # Step A：问题嵌入（必须和入库用同一个模型）
    q_vec = embed_client.embeddings.create(
        model="text-embedding-3-small", input=[question]
    ).data[0].embedding

    # Step B：top-k 向量检索
    results = collection.query(query_embeddings=[q_vec], n_results=k)
    context = "\n\n".join(results["documents"][0])

    # Step C：上下文注入（直接复用 ch3 的 prompt 模板）
    template_path = os.path.join(os.path.dirname(__file__), "ch3-qa-prompt.txt")
    with open(template_path) as f:
        template = f.read()
    prompt = template.replace("{document_content}", context)
    prompt = prompt.replace("{user_question}", question)

    # Step D：调 LLM 生成回答（用 ch4 建好的 DeepSeek 客户端）
    ds_client = OpenAI(
        api_key=os.environ["DEEPSEEK_API_KEY"],
        base_url="https://api.deepseek.com",
    )
    resp = ds_client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
    )
    return resp.choices[0].message.content


if __name__ == "__main__":
    # 示例：入库一份合同文档，再查询
    doc = (
        "第一条：甲方须在签约后 30 日内支付定金 50%。"
        "第三条：项目交付日期为签约后 90 日。"
        "第五条：任一方违约须赔偿对方实际损失的 200%。"
        "第七条：本合同适用中华人民共和国法律，争议提交北京仲裁委员会仲裁。"
    )
    index_document("contract_v1", doc)

    questions = [
        "违约赔偿比例是多少？",
        "项目什么时候交付？",
        "合同纠纷如何解决？",
    ]
    for q in questions:
        print(f"\n问：{q}")
        print(f"答：{rag_answer(q)}")
