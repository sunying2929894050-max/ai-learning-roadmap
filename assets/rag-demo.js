// ── RAG Demo ──────────────────────────────────────────────────────────
// Keyword-overlap retrieval (honest label: not real vector search).
// Wires #rag-kb / #rag-query / #rag-run / #rag-output inside a chapter panel.

const RAG_FRAGMENTS = [
  {
    id: 'f1',
    label: '年假政策',
    text: 'TechCorp 年假政策：入职满一年员工每年享有10天带薪年假；满三年15天；满五年20天。年假须在当年12月31日前用完，不可累积转入下一年。',
  },
  {
    id: 'f2',
    label: '报销规定',
    text: '差旅报销规定：国内出差住宿标准为每晚500元以内，交通费凭票全额报销。报销申请须在出差结束后7个工作日内提交，超期不予受理。',
  },
  {
    id: 'f3',
    label: '绩效考核',
    text: '绩效考核每年进行两次（6月和12月），分为S/A/B/C四档。连续两次C档将进入绩效改进计划（PIP）。S档员工年终奖为月薪的3倍。',
  },
  {
    id: 'f4',
    label: '远程办公',
    text: '远程办公政策：正式员工通过试用期后可申请每周最多2天居家办公。申请须提前一个工作日通知直属上级，高级工程师及以上职级可每周3天。',
  },
  {
    id: 'f5',
    label: '入职流程',
    text: '新员工入职须在第一天携带身份证、学历证书及离职证明原件。入职后前三个月为试用期，试用期薪资为转正薪资的80%。',
  },
  {
    id: 'f6',
    label: '社保与公积金',
    text: 'TechCorp 按照国家法定标准为全员缴纳五险一金。公积金缴存比例为个人12%、公司12%。试用期内同样正常缴纳社保和公积金。',
  },
];

// Keyword overlap score: count shared CJK characters and words
function _scoreFragment(query, fragmentText) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  const f = fragmentText.toLowerCase().replace(/\s+/g, '');
  let matches = 0;
  // sliding 2-char window
  for (let i = 0; i < q.length - 1; i++) {
    const bigram = q.slice(i, i + 2);
    if (f.includes(bigram)) matches++;
  }
  // single char bonus for short queries
  if (q.length <= 4) {
    for (const ch of q) {
      if (f.includes(ch)) matches += 0.5;
    }
  }
  return matches;
}

function _retrieve(query, k = 2) {
  const scored = RAG_FRAGMENTS.map(f => ({
    fragment: f,
    score: _scoreFragment(query, f.text),
  })).sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

function _renderKb(kbEl) {
  kbEl.innerHTML =
    '<div style="font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--muted);margin-bottom:4px">📚 知识库（6个片段）</div>' +
    RAG_FRAGMENTS.map(f =>
      `<div id="rag-frag-${f.id}" style="border:1px solid var(--line);border-radius:6px;padding:8px 12px;font-size:12px;line-height:1.6;transition:border-color .2s,background .2s">
        <span style="font-weight:700;color:var(--accent);margin-right:6px">[${f.label}]</span>${f.text}
       </div>`
    ).join('');
}

function _highlightFrags(topIds) {
  RAG_FRAGMENTS.forEach(f => {
    const el = document.getElementById(`rag-frag-${f.id}`);
    if (!el) return;
    if (topIds.includes(f.id)) {
      el.style.borderColor = 'var(--accent)';
      el.style.background = 'rgba(0,212,170,.07)';
    } else {
      el.style.borderColor = 'var(--line)';
      el.style.background = '';
    }
  });
}

function _resetHighlights() {
  RAG_FRAGMENTS.forEach(f => {
    const el = document.getElementById(`rag-frag-${f.id}`);
    if (!el) return;
    el.style.borderColor = 'var(--line)';
    el.style.background = '';
  });
}

function initRagDemo(panelEl) {
  const kbEl    = panelEl.querySelector('#rag-kb');
  const queryEl = panelEl.querySelector('#rag-query');
  const runBtn  = panelEl.querySelector('#rag-run');
  const outEl   = panelEl.querySelector('#rag-output');
  if (!kbEl || !queryEl || !runBtn || !outEl) return;
  if (runBtn.dataset.bound) return;
  runBtn.dataset.bound = '1';

  _renderKb(kbEl);

  runBtn.addEventListener('click', async () => {
    const query = queryEl.value.trim();
    if (!query) { queryEl.focus(); return; }

    // Reset
    _resetHighlights();
    outEl.style.display = 'grid';
    outEl.innerHTML = '<div style="color:var(--muted);font-size:13px">⏳ 检索中…</div>';
    runBtn.disabled = true;

    // Retrieve
    const hits = _retrieve(query, 2);
    const topIds = hits.map(h => h.fragment.id);
    _highlightFrags(topIds);

    const hitHtml = hits.map((h, i) =>
      `<div style="border:1px solid rgba(0,212,170,.3);border-radius:6px;padding:10px 14px;background:rgba(0,212,170,.05);font-size:12px;line-height:1.6">
        <div style="font-weight:800;font-size:11px;letter-spacing:.05em;color:var(--accent);margin-bottom:4px">检索片段 ${i + 1}（得分 ${h.score.toFixed(1)}）：${h.fragment.label}</div>
        ${h.fragment.text}
       </div>`
    ).join('');

    // Show retrieval result immediately
    outEl.innerHTML =
      `<div>
        <div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:var(--muted);margin-bottom:8px">🔍 检索到的上下文（top-2）</div>
        <div style="display:grid;gap:6px">${hitHtml}</div>
       </div>
       <div id="rag-llm-out" style="font-size:13px;color:var(--muted)">⏳ 正在调用 LLM 生成回答…</div>`;

    const llmOut = outEl.querySelector('#rag-llm-out');

    // Build RAG prompt (reusing ch3 QA template structure)
    const context = hits.map(h => h.fragment.text).join('\n\n');
    const ragPrompt = `你是一个严谨的文档助手。你只根据用户提供的上下文内容来回答问题。

规则：
1. 只使用 <context> 标签内的信息回答。
2. 如果上下文里找不到答案，直接说"在提供的文档中没有找到相关信息"，不要猜测。
3. 回答用中文，简洁直接，不超过150字。

<context>
${context}
</context>

用户问题：${query}

请回答：`;

    try {
      const answer = await window.callLLM(ragPrompt, { maxTokens: 256 });
      llmOut.innerHTML =
        `<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden">
          <div style="background:#0f172a;padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--accent);border-bottom:1px solid var(--line)">✅ RAG 回答（基于检索片段）</div>
          <div style="padding:12px 14px;font-size:13px;line-height:1.8;color:var(--text)">${answer.replace(/\n/g, '<br>')}</div>
         </div>
         <div style="border:1px solid rgba(239,68,68,.2);border-radius:8px;padding:10px 14px;background:rgba(239,68,68,.04);font-size:12px;color:#ef4444;line-height:1.6">
           ⚠️ <strong>对比：无 RAG 时的情况：</strong>直接把"${query.slice(0, 20)}"发给模型，它只能靠参数记忆回答——对 TechCorp 内部政策一无所知，极有可能给出通用回答或幻觉内容（ch1 讲过的场景）。
         </div>`;
    } catch (err) {
      const icon = err.message === 'NO_KEY' ? '🔑' : err.message === 'NO_WORKER' ? '✅' : '❌';
      llmOut.innerHTML =
        `<div style="border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:10px 14px;background:rgba(239,68,68,.05);font-size:13px;color:#ef4444">
          ${icon} ${err.friendly || err.message}
         </div>`;
    }

    runBtn.disabled = false;
  });

  // Allow Enter key to submit
  queryEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !runBtn.disabled) runBtn.click();
  });
}

window.initRagDemo = initRagDemo;
