// ── Eval Demo (LLM-as-judge) ──────────────────────────────────────────
// Wires #eval-answer / #eval-run / #eval-output / .eval-preset-btn
// Shows rubric → reasoning → score from the judge model.

const EVAL_CONTEXT = 'TechCorp 年假政策：入职满一年员工每年享有10天带薪年假；满三年15天；满五年20天。年假须在当年12月31日前用完，不可累积转入下一年。试用期内不享有年假。';
const EVAL_QUESTION = 'TechCorp 的年假政策是什么？入职满一年和满三年各有多少天？';

const EVAL_PRESETS = {
  good: '根据 TechCorp 的年假政策，入职满一年的员工每年可享有10天带薪年假，满三年则增加到15天。年假须在当年12月31日前使用完毕，不可累积到次年。',
  hallucinated: '根据 TechCorp 的年假政策，入职满一年的员工每年可享有15天带薪年假，满三年则增加到25天，满五年可达到30天。此外，员工还额外享有3天探亲假和5天病假。',
  incomplete: 'TechCorp 员工有带薪年假，满一年10天。',
  offtopic: '根据中华人民共和国劳动法，员工工作满1年不满10年的，年休假5天；满10年不满20年的，年休假10天。建议查阅劳动法相关条款了解您的权益。',
};

const JUDGE_SYSTEM = `你是一个严格、公正的 AI 系统评判员。你将按照给定的评分标准（rubric）对一个文档助手的回答进行逐条评分。

评分原则：
- 严格按 rubric，不根据个人偏好打分
- 每条必须给出具体理由
- 不因答案长就给高分（避免啰嗦偏见）
- 只基于提供的上下文判断事实正确性`;

function _buildJudgePrompt(answer) {
  return `你是一个严格的文档助手评判员。请根据以下 rubric 对回答进行评分。

【问题】${EVAL_QUESTION}

【参考上下文（文档库内容）】
${EVAL_CONTEXT}

【待评判的回答】
${answer}

【评分标准（Rubric）】
1. 忠实度（0-3分）：答案中的事实是否全部来自上下文？是否有凭空捏造的数据？
   - 3分：所有事实均有上下文依据，无捏造
   - 2分：大部分正确，有轻微偏差
   - 1分：部分正确，有明显捏造
   - 0分：大量捏造，与上下文矛盾

2. 完整性（0-3分）：答案是否回答了问题的所有要点（满一年天数 + 满三年天数）？
   - 3分：两个要点都完整回答
   - 2分：回答了一个要点，另一个缺失或模糊
   - 1分：两个要点都不完整
   - 0分：完全没有回答问题要点

3. 相关性（0-2分）：答案是否基于公司政策而非通用法规？
   - 2分：明确基于 TechCorp 政策
   - 1分：内容混合了通用知识和公司政策
   - 0分：只引用通用法规，没有基于公司政策

4. 简洁性（0-2分）：答案是否简洁，没有不必要的冗余信息？
   - 2分：简洁清晰，无冗余
   - 1分：略有冗余但可接受
   - 0分：大量冗余或偏题内容

请严格按以下格式输出（不要改变格式）：

忠实度：X/3 — 理由
完整性：X/3 — 理由
相关性：X/2 — 理由
简洁性：X/2 — 理由
总分：X/10
总结：一句话说明主要亮点或问题`;
}

// Parse judge output into structured sections
function _parseJudge(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const dimensions = [];
  let totalScore = null;
  let summary = '';

  const dimPatterns = [
    { key: '忠实度', max: 3, color: '#818cf8' },
    { key: '完整性', max: 3, color: 'var(--accent)' },
    { key: '相关性', max: 2, color: '#d97706' },
    { key: '简洁性', max: 2, color: '#22c55e' },
  ];

  for (const line of lines) {
    for (const dim of dimPatterns) {
      if (line.startsWith(dim.key + '：') || line.startsWith(dim.key + ':')) {
        const rest = line.replace(/^[^：:]+[：:]/, '').trim();
        // Extract score like "2/3 — reason"
        const scoreMatch = rest.match(/^(\d+)\/(\d+)\s*[—\-–]\s*(.+)/);
        if (scoreMatch) {
          dimensions.push({
            label: dim.key,
            score: parseInt(scoreMatch[1]),
            max: dim.max,
            reason: scoreMatch[3],
            color: dim.color,
          });
        }
      }
    }
    if (line.startsWith('总分：') || line.startsWith('总分:')) {
      const m = line.match(/(\d+)\/10/);
      if (m) totalScore = parseInt(m[1]);
    }
    if (line.startsWith('总结：') || line.startsWith('总结:')) {
      summary = line.replace(/^总结[：:]/, '').trim();
    }
  }

  return { dimensions, totalScore, summary, raw };
}

function _scoreColor(score, max) {
  const ratio = score / max;
  if (ratio >= 0.8) return 'var(--accent)';
  if (ratio >= 0.5) return '#d97706';
  return '#ef4444';
}

function _renderJudgeResult(parsed, outEl) {
  const { dimensions, totalScore, summary, raw } = parsed;

  let html = '';

  // Rubric label
  html += `<div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--muted);margin-bottom:4px">⚖️ 评判结果（LLM-as-judge · rubric 逐条打分）</div>`;

  // Dimension scores
  if (dimensions.length > 0) {
    html += `<div style="display:grid;gap:6px">`;
    for (const d of dimensions) {
      const pct = (d.score / d.max * 100).toFixed(0);
      const col = _scoreColor(d.score, d.max);
      html +=
        `<div style="border:1px solid var(--line);border-radius:7px;padding:8px 12px;background:#0f172a">` +
        `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">` +
        `<span style="font-weight:700;font-size:12px;color:${d.color}">${d.label}</span>` +
        `<span style="font-weight:800;font-size:13px;color:${col}">${d.score}/${d.max}</span>` +
        `</div>` +
        `<div style="background:var(--line);border-radius:4px;height:4px;margin-bottom:6px">` +
        `<div style="background:${col};width:${pct}%;height:100%;border-radius:4px;transition:width .4s"></div>` +
        `</div>` +
        `<div style="font-size:11px;color:var(--light-muted);line-height:1.5">${d.reason}</div>` +
        `</div>`;
    }
    html += `</div>`;
  } else {
    // Fallback: show raw output
    html += `<div style="border:1px solid var(--line);border-radius:7px;padding:10px 12px;background:#0f172a;font-size:12px;line-height:1.7;white-space:pre-wrap;color:var(--light-muted)">${raw}</div>`;
  }

  // Total score
  if (totalScore !== null) {
    const col = _scoreColor(totalScore, 10);
    html +=
      `<div style="border:1px solid ${col};border-radius:8px;padding:12px 16px;background:rgba(0,0,0,.2);display:flex;justify-content:space-between;align-items:center">` +
      `<span style="font-weight:800;font-size:14px;color:var(--text)">总分</span>` +
      `<span style="font-weight:900;font-size:24px;color:${col}">${totalScore}<span style="font-size:14px;font-weight:600;color:var(--muted)">/10</span></span>` +
      `</div>`;
  }

  // Summary
  if (summary) {
    html +=
      `<div style="border:1px solid var(--line);border-radius:7px;padding:8px 12px;background:#0f172a;font-size:12px;color:var(--light-muted);line-height:1.6">` +
      `<strong style="color:var(--muted)">总结：</strong>${summary}` +
      `</div>`;
  }

  // Mechanism note
  html +=
    `<div style="border:1px solid rgba(251,191,36,.2);border-radius:7px;padding:8px 12px;background:rgba(251,191,36,.04);font-size:11px;color:#d97706;line-height:1.6">` +
    `💡 <strong>机制说明：</strong>以上评判结果来自一次 LLM API 调用——用 rubric 作为 prompt 的一部分，让模型按评分标准续写分析。评判本身就是 ch3 的 prompt 工程任务，评判模型也可能有偏见（啰嗦偏见、位置偏见）。` +
    `</div>`;

  outEl.style.display = 'grid';
  outEl.style.gap = '8px';
  outEl.innerHTML = html;
}

// ── initEvalDemo ──────────────────────────────────────────────────────

function initEvalDemo(panelEl) {
  const answerEl = panelEl.querySelector('#eval-answer');
  const runBtn   = panelEl.querySelector('#eval-run');
  const outEl    = panelEl.querySelector('#eval-output');
  if (!answerEl || !runBtn || !outEl) return;
  if (runBtn.dataset.bound) return;
  runBtn.dataset.bound = '1';

  // Wire preset buttons
  panelEl.querySelectorAll('.eval-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      if (EVAL_PRESETS[key]) {
        answerEl.value = EVAL_PRESETS[key];
        answerEl.focus();
      }
    });
  });

  runBtn.addEventListener('click', async () => {
    const answer = answerEl.value.trim();
    if (!answer) { answerEl.focus(); return; }

    runBtn.disabled = true;
    outEl.style.display = 'grid';
    outEl.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px">⏳ 评判模型运行中…</div>';

    try {
      const raw = await window.callLLM(
        _buildJudgePrompt(answer),
        { system: JUDGE_SYSTEM, maxTokens: 600 }
      );
      const parsed = _parseJudge(raw);
      _renderJudgeResult(parsed, outEl);
    } catch (err) {
      const icon = err.message === 'NO_KEY' ? '🔑' : err.message === 'NO_WORKER' ? '✅' : '❌';
      outEl.innerHTML =
        `<div style="border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:10px 14px;background:rgba(239,68,68,.05);font-size:13px;color:#ef4444">` +
        `${icon} ${err.friendly || err.message}</div>`;
    }

    runBtn.disabled = false;
  });
}

window.initEvalDemo = initEvalDemo;
