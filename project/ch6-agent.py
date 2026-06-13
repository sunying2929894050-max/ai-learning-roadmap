"""
文档助手 — ch6 产物：Agent 循环 + 工具调用
来源：AI 学习路线 ch6 工具调用与 Agent

依赖：pip install openai chromadb
用法：
  export OPENAI_API_KEY="sk-..."   # 用于 ch5 的嵌入模型
  export DEEPSEEK_API_KEY="sk-..."  # 用于生成模型
  python3 ch6-agent.py
"""

import os, json, re
from openai import OpenAI

# ── 复用 ch5 的 RAG 检索（已入库的 collection） ──
from ch5_rag_pipeline import collection, embed_client as _emb


def _search_docs(query: str, k: int = 2) -> str:
    """把 ch5 的向量检索包装成 Agent 工具。"""
    q_vec = _emb.embeddings.create(
        model="text-embedding-3-small", input=[query]
    ).data[0].embedding
    results = collection.query(query_embeddings=[q_vec], n_results=k)
    docs = results["documents"][0]
    if not docs:
        return "未在文档库中找到相关内容。"
    return "\n\n".join(f"[片段{i+1}] {d}" for i, d in enumerate(docs))


def _calculator(expression: str) -> str:
    cleaned = re.sub(r"[^0-9+\-*/.() ]", "", expression)
    try:
        result = eval(cleaned, {"__builtins__": {}})
        return f"{expression} = {result}"
    except Exception as e:
        return f"计算失败：{e}"


def _get_time() -> str:
    from datetime import datetime
    return datetime.now().strftime("当前时间：%Y-%m-%d %H:%M:%S（本地）")


# ── 工具路由表 ──
TOOLS = {
    "calculator": {
        "desc": "精确计算数学表达式。适合乘除加减、开方等数值运算。input: {\"expression\":\"31*97\"}",
        "fn": lambda inp: _calculator(inp["expression"]),
    },
    "get_time": {
        "desc": "获取当前日期和时间。适合需要知道今天日期或现在时刻的问题。input: {}",
        "fn": lambda _: _get_time(),
    },
    "search_docs": {
        "desc": (
            "在公司内部文档库（ch5 知识库）中语义搜索。"
            "适合回答公司政策、合同条款等私有信息。"
            'input: {"query":"年假政策"}'
        ),
        "fn": lambda inp: _search_docs(inp["query"]),
    },
}

SYSTEM_PROMPT = (
    "你是一个使用工具完成任务的 AI Agent。\n\n"
    "可用工具：\n"
    + "\n".join(f"- {n}: {t['desc']}" for n, t in TOOLS.items())
    + "\n\n每次回复必须且只能是以下格式的 JSON（不加任何额外文字）：\n"
    '调用工具：{"thought":"原因","action":"工具名","input":{...}}\n'
    '最终答案：{"thought":"已有所有信息","action":"final_answer","content":"答案"}'
)

ds = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)


def _parse_json(text: str) -> dict:
    """鲁棒解析：先直接 parse，再从文本中提取 {...}。"""
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            return json.loads(m.group())
        return {"action": "final_answer", "content": text}


def run_agent(question: str, max_steps: int = 5) -> str:
    """ReAct 循环：思考 → 调工具 → 观察 → 再思考……"""
    messages = [{"role": "user", "content": question}]

    for step in range(max_steps):
        # ── 每步都是一次 ch4 的 API 调用 ──
        resp = ds.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + messages,
            max_tokens=512,
        )
        raw = resp.choices[0].message.content.strip()
        print(f"\n[步骤 {step+1}] 模型输出：{raw}")

        action = _parse_json(raw)

        if action.get("action") == "final_answer":
            return action.get("content", "")

        # ── 执行工具 ──
        tool_name = action.get("action", "")
        tool_input = action.get("input", {})
        if tool_name not in TOOLS:
            tool_result = f"错误：工具 '{tool_name}' 不存在，可用：{list(TOOLS.keys())}"
        else:
            tool_result = TOOLS[tool_name]["fn"](tool_input)
            print(f"[工具结果] {tool_result}")

        # ── 把工具结果回灌进上下文（ch5 的上下文注入模式） ──
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": f"[工具结果] {tool_result}"})

    return "已达最大步数，无法完成任务。"


if __name__ == "__main__":
    questions = [
        "现在几点了？",
        "31 × 97 × 43 等于多少？",
        "公司的年假政策是什么，试用期有年假吗？",
    ]
    for q in questions:
        print(f"\n{'='*50}\n问：{q}")
        ans = run_agent(q)
        print(f"\n最终答案：{ans}")
