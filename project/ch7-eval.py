"""
文档助手 — ch7 产物：评估脚本（LLM-as-judge + 忠实度检查）
来源：AI 学习路线 ch7 评估：怎么知道它真的有效

依赖：pip install openai chromadb
用法：
  export OPENAI_API_KEY="sk-..."   # 嵌入模型
  export DEEPSEEK_API_KEY="sk-..."  # 生成 + 评判模型
  python3 ch7-eval.py
"""

import os, json
from openai import OpenAI

# 复用 ch5 的 RAG 管线（需先运行 ch5-rag-pipeline.py 完成入库）
from ch5_rag_pipeline import collection, embed_client as _emb

ds = OpenAI(api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url="https://api.deepseek.com")


# ── 简化版 rag_answer（含上下文返回）────────────────────────────────
def rag_answer_with_context(question: str, k: int = 3) -> tuple[str, str]:
    """返回 (answer, context) 两元组，供评估用。"""
    q_vec = _emb.embeddings.create(
        model="text-embedding-3-small", input=[question]
    ).data[0].embedding
    results = collection.query(query_embeddings=[q_vec], n_results=k)
    context = "\n\n".join(results["documents"][0])

    import os as _os
    tpl_path = _os.path.join(_os.path.dirname(__file__), "ch3-qa-prompt.txt")
    with open(tpl_path) as f:
        template = f.read()
    prompt = template.replace("{document_content}", context).replace("{user_question}", question)

    resp = ds.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
    )
    return resp.choices[0].message.content, context


# ── 评估集：问题 + 期望行为描述 ──────────────────────────────────────
EVAL_SET = [
    {
        "id": "e1",
        "question": "公司年假政策是什么？满一年和满三年各几天？",
        "expected_keywords": ["10天", "15天", "满一年", "满三年"],
        "expected_behavior": "应提到满一年10天、满三年15天，不应编造其他数字",
    },
    {
        "id": "e2",
        "question": "报销申请的截止时间是多久？",
        "expected_keywords": ["7个工作日", "出差结束后"],
        "expected_behavior": "应提到出差结束后7个工作日内提交",
    },
    {
        "id": "e3",
        "question": "试用期员工有年假吗？",
        "expected_keywords": ["不享有", "试用期"],
        "expected_behavior": "应明确说试用期内不享有年假，不应编造数字",
    },
    {
        "id": "e4",
        "question": "绩效S档的年终奖是多少？",
        "expected_keywords": ["S档", "月薪", "3倍"],
        "expected_behavior": "应提到S档年终奖为月薪3倍",
    },
    {
        "id": "e5",
        "question": "公司CEO的薪资是多少？",
        "expected_keywords": ["没有找到", "未找到", "不知道", "没有相关"],
        "expected_behavior": "文档里没有此信息，应说找不到，不应编造",
    },
]


# ── LLM-as-judge ─────────────────────────────────────────────────────
JUDGE_PROMPT = """你是一个严格的文档助手评判员。请根据以下 rubric 对回答评分。

【问题】{question}
【参考上下文（RAG 检索内容）】
{context}
【待评判的回答】
{answer}

【评分标准（Rubric）】
1. 忠实度（0-3分）：答案事实是否全部来自上下文，无凭空捏造？
2. 完整性（0-3分）：答案是否回答了问题的所有要点？
3. 相关性（0-2分）：是否直接回答了问题？
4. 简洁性（0-2分）：是否简洁无冗余？

输出格式（严格遵守）：
忠实度：X/3 — 理由
完整性：X/3 — 理由
相关性：X/2 — 理由
简洁性：X/2 — 理由
总分：X/10
总结：一句话"""


def judge_answer(question: str, context: str, answer: str) -> dict:
    """LLM-as-judge 评判，返回结构化结果。"""
    prompt = (JUDGE_PROMPT
              .replace("{question}", question)
              .replace("{context}", context)
              .replace("{answer}", answer))
    resp = ds.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
    )
    raw = resp.choices[0].message.content

    # 提取总分
    total = None
    for line in raw.splitlines():
        if line.startswith("总分"):
            import re
            m = re.search(r'(\d+)/10', line)
            if m:
                total = int(m.group(1))
    return {"raw": raw, "total_score": total}


# ── 关键词快速检查（零 API 成本）───────────────────────────────────
def keyword_check(answer: str, keywords: list[str]) -> dict:
    found = [kw for kw in keywords if kw in answer]
    missing = [kw for kw in keywords if kw not in answer]
    return {
        "found": found,
        "missing": missing,
        "hit_rate": len(found) / len(keywords) if keywords else 1.0,
    }


# ── 主评估循环 ──────────────────────────────────────────────────────
def run_eval(use_llm_judge: bool = True) -> list[dict]:
    results = []

    for item in EVAL_SET:
        print(f"\n[{item['id']}] 问：{item['question']}")

        # Step 1：RAG 管线生成答案
        answer, context = rag_answer_with_context(item["question"])
        print(f"答：{answer[:100]}{'…' if len(answer) > 100 else ''}")

        # Step 2：关键词检查（快速，无 API 成本）
        kw = keyword_check(answer, item["expected_keywords"])
        print(f"关键词命中率：{kw['hit_rate']:.0%}  "
              f"{'✓' if not kw['missing'] else '✗ 缺失：' + str(kw['missing'])}")

        result = {
            "id": item["id"],
            "question": item["question"],
            "expected_behavior": item["expected_behavior"],
            "answer": answer,
            "keyword_check": kw,
        }

        # Step 3（可选）：LLM-as-judge 深度评分
        if use_llm_judge:
            judge = judge_answer(item["question"], context, answer)
            score = judge["total_score"]
            print(f"LLM 评分：{score}/10")
            result["llm_judge"] = {
                "total_score": score,
                "raw": judge["raw"],
            }

        results.append(result)

    # ── 汇总 ──────────────────────────────────────────────────────────
    avg_kw = sum(r["keyword_check"]["hit_rate"] for r in results) / len(results)
    print(f"\n{'='*50}")
    print(f"评估集：{len(results)} 条")
    print(f"平均关键词命中率：{avg_kw:.0%}")
    if use_llm_judge:
        scores = [r["llm_judge"]["total_score"] for r in results
                  if r.get("llm_judge") and r["llm_judge"]["total_score"] is not None]
        if scores:
            print(f"平均 LLM 评分：{sum(scores)/len(scores):.1f}/10")
            low = [(r["id"], r["llm_judge"]["total_score"])
                   for r in results
                   if r.get("llm_judge") and r["llm_judge"]["total_score"] is not None
                   and r["llm_judge"]["total_score"] < 7]
            if low:
                print(f"低分案例（<7分）：{low}")

    return results


if __name__ == "__main__":
    print("文档助手评估脚本 (ch7)\n" + "=" * 50)
    print("提示：先确保 ch5-rag-pipeline.py 已完成文档入库")

    results = run_eval(use_llm_judge=True)

    # 输出报告
    report_path = os.path.join(os.path.dirname(__file__), "eval_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n完整报告已保存：{report_path}")
