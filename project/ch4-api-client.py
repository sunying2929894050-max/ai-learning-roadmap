"""
文档助手 — ch4 产物：接通大模型 API
来源：AI 学习路线 ch4 接入大模型 API

用法：
  1. 在 DeepSeek 控制台获取 API key
  2. export DEEPSEEK_API_KEY="sk-..."
  3. python3 ch4-api-client.py
"""

import os
from openai import OpenAI  # DeepSeek 兼容 OpenAI SDK（pip install openai）

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],   # 从环境变量读，绝不硬编码
    base_url="https://api.deepseek.com",
)

# 读取 ch3 的 prompt 模板
_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "ch3-qa-prompt.txt")
with open(_TEMPLATE_PATH) as f:
    _TEMPLATE = f.read()


def answer_question(document_content: str, user_question: str) -> str:
    """用 ch3 的 QA prompt 模板回答关于文档的问题。"""
    prompt = _TEMPLATE.replace("{document_content}", document_content)
    prompt = prompt.replace("{user_question}", user_question)

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=512,
        stream=False,
    )
    return response.choices[0].message.content


if __name__ == "__main__":
    # 示例：合同文档问答
    doc = (
        "第一条：甲方须在签约后 30 日内支付定金 50%。"
        "第三条：项目交付日期为签约后 90 日。"
        "第五条：任一方违约须赔偿对方实际损失的 200%。"
    )
    questions = [
        "违约赔偿比例是多少？",
        "项目什么时候交付？",
        "定金比例和付款期限是多少？",
    ]
    for q in questions:
        print(f"\n问：{q}")
        print(f"答：{answer_question(doc, q)}")
