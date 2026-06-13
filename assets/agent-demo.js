// ── Agent Demo ────────────────────────────────────────────────────────
// Hand-written ReAct loop: prompt model to output JSON action → parse →
// execute tool → inject result back → repeat. Shows every step visibly.
// Production would use native Function Calling API for reliability.

// ── Tool definitions ──────────────────────────────────────────────────

const AGENT_DOCS = [
  { label: '年假政策', text: 'TechCorp 年假政策：入职满一年员工每年享有10天带薪年假；满三年15天；满五年20天。年假须在当年12月31日前用完，不可累积转入下一年。试用期内不享有年假。' },
  { label: '报销规定', text: '差旅报销规定：国内出差住宿标准为每晚500元以内，交通费凭票全额报销。报销申请须在出差结束后7个工作日内提交，超期不予受理。' },
  { label: '绩效考核', text: '绩效考核每年进行两次（6月和12月），分为S/A/B/C四档。连续两次C档将进入绩效改进计划（PIP）。S档员工年终奖为月薪的3倍。' },
  { label: '远程办公', text: '远程办公政策：正式员工通过试用期后可申请每周最多2天居家办公。申请须提前一个工作日通知直属上级，高级工程师及以上职级可每周3天。' },
  { label: '入职流程', text: '新员工入职须在第一天携带身份证、学历证书及离职证明原件。入职后前三个月为试用期，试用期薪资为转正薪资的80%。' },
  { label: '社保与公积金', text: 'TechCorp 按照国家法定标准为全员缴纳五险一金。公积金缴存比例为个人12%、公司12%。试用期内同样正常缴纳社保和公积金。' },
];

function _agentDocSearch(query) {
  const q = query.toLowerCase().replace(/\s+/g, '');
  const scored = AGENT_DOCS.map(d => {
    const f = d.text.toLowerCase().replace(/\s+/g, '');
    let m = 0;
    for (let i = 0; i < q.length - 1; i++) {
      if (f.includes(q.slice(i, i + 2))) m++;
    }
    if (q.length <= 4) for (const ch of q) { if (f.includes(ch)) m += 0.5; }
    return { doc: d, score: m };
  }).sort((a, b) => b.score - a.score).slice(0, 2);
  if (!scored[0] || scored[0].score === 0) return '未在文档库中找到相关内容。';
  return scored.map(s => `[${s.doc.label}] ${s.doc.text}`).join('\n\n');
}

const AGENT_TOOLS = {
  calculator: {
    label: '计算器',
    exec(input) {
      const expr = (input && input.expression) ? String(input.expression) : '';
      const cleaned = expr.replace(/[^0-9+\-*/.() ]/g, '');
      if (!cleaned) return '表达式无效';
      try {
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + cleaned + ')')();
        return `${expr} = ${result}`;
      } catch (e) {
        return `计算失败：${e.message}`;
      }
    },
  },
  get_time: {
    label: '时钟',
    exec(_input) {
      const now = new Date();
      const days = ['日', '一', '二', '三', '四', '五', '六'];
      const pad = n => String(n).padStart(2, '0');
      return `当前时间：${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ` +
             `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ` +
             `星期${days[now.getDay()]}（本地时间）`;
    },
  },
  search_docs: {
    label: '文档检索',
    exec(input) {
      const query = (input && input.query) ? String(input.query) : '';
      return _agentDocSearch(query);
    },
  },
};

// ── ReAct system prompt ───────────────────────────────────────────────

const AGENT_SYSTEM = `你是一个使用工具完成任务的 AI Agent。

可用工具：
- calculator：精确计算数学表达式（乘除加减等）。input: {"expression":"31*97*43"}
- get_time：获取当前日期、时间和星期。input: {}
- search_docs：在 TechCorp 员工手册中搜索信息（年假、报销、绩效等公司政策）。input: {"query":"年假政策"}

每次回复必须且只能是以下格式的 JSON，不要加任何额外文字、不要加代码块标记：

调用工具时：
{"thought":"分析原因","action":"工具名","input":{...}}

给出最终答案时：
{"thought":"已有所有信息","action":"final_answer","content":"完整答案"}

规则：
- 需要精确数字时，必须先调用 calculator 工具，不要自己心算
- 需要当前时间时，必须先调用 get_time 工具
- 需要公司政策时，必须先调用 search_docs 工具
- 拿到工具结果后，根据结果给出最终答案`;

// ── JSON extraction ───────────────────────────────────────────────────

function _extractJSON(text) {
  const t = text.trim();
  // Direct parse
  try { return JSON.parse(t); } catch {}
  // Strip markdown code fences
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) try { return JSON.parse(fenced[1].trim()); } catch {}
  // Extract first {...}
  const raw = t.match(/\{[\s\S]*\}/);
  if (raw) try { return JSON.parse(raw[0]); } catch {}
  return null;
}

// ── Step rendering ────────────────────────────────────────────────────

function _stepEl(type, content) {
  const configs = {
    thinking:  { icon: '💭', label: '思考',   border: 'rgba(0,212,170,.25)',   bg: 'rgba(0,212,170,.05)',   color: 'var(--accent)' },
    action:    { icon: '🔧', label: '行动',   border: 'rgba(99,102,241,.25)',  bg: 'rgba(99,102,241,.05)',  color: '#818cf8' },
    observe:   { icon: '📊', label: '观察',   border: 'rgba(251,191,36,.25)',  bg: 'rgba(251,191,36,.05)',  color: '#d97706' },
    answer:    { icon: '✅', label: '最终答案', border: 'rgba(0,212,170,.4)',  bg: 'rgba(0,212,170,.08)',   color: 'var(--accent)' },
    error:     { icon: '❌', label: '错误',   border: 'rgba(239,68,68,.25)',   bg: 'rgba(239,68,68,.05)',   color: '#ef4444' },
  };
  const c = configs[type] || configs.error;
  const div = document.createElement('div');
  div.style.cssText = `border:1px solid ${c.border};border-radius:8px;padding:10px 14px;background:${c.bg};font-size:12px;line-height:1.7`;
  div.innerHTML =
    `<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:${c.color};margin-bottom:5px">${c.icon} ${c.label}</div>` +
    `<div style="color:var(--text)">${content}</div>`;
  return div;
}

// ── Main agent loop ───────────────────────────────────────────────────

async function _runAgentLoop(question, outEl) {
  outEl.style.display = 'grid';
  outEl.style.gap = '8px';
  outEl.innerHTML = '';

  const messages = [{ role: 'user', content: question }];
  const MAX_STEPS = 5;

  for (let step = 0; step < MAX_STEPS; step++) {
    // Show "thinking…" placeholder
    const thinkPlaceholder = _stepEl('thinking', `<em style="color:var(--muted)">⏳ 模型推理中（步骤 ${step + 1}）…</em>`);
    outEl.appendChild(thinkPlaceholder);

    let raw;
    try {
      raw = await window.callLLM(messages, {
        system: AGENT_SYSTEM,
        maxTokens: 512,
      });
    } catch (err) {
      thinkPlaceholder.remove();
      const icon = err.message === 'NO_KEY' ? '🔑' : err.message === 'NO_WORKER' ? '✅' : '❌';
      outEl.appendChild(_stepEl('error', `${icon} ${err.friendly || err.message}`));
      return;
    }

    const parsed = _extractJSON(raw);

    if (!parsed) {
      thinkPlaceholder.remove();
      outEl.appendChild(_stepEl('thinking', `模型输出：${raw.slice(0, 200)}`));
      outEl.appendChild(_stepEl('answer', raw));
      return;
    }

    // Replace placeholder with real thought
    thinkPlaceholder.remove();
    if (parsed.thought) {
      outEl.appendChild(_stepEl('thinking', parsed.thought));
    }

    // Final answer
    if (parsed.action === 'final_answer') {
      outEl.appendChild(_stepEl('answer', (parsed.content || raw).replace(/\n/g, '<br>')));
      return;
    }

    // Tool call
    const toolName = parsed.action || '';
    const toolInput = parsed.input || {};
    const tool = AGENT_TOOLS[toolName];

    const inputStr = Object.keys(toolInput).length
      ? Object.entries(toolInput).map(([k, v]) => `${k}: "${v}"`).join(', ')
      : '（无参数）';
    outEl.appendChild(_stepEl('action',
      `调用工具 <strong style="color:var(--accent)">${toolName}</strong>` +
      (tool ? `（${tool.label}）` : `（未知工具）`) +
      `&nbsp;— 参数：${inputStr}`
    ));

    let toolResult;
    if (!tool) {
      toolResult = `错误：工具 "${toolName}" 不存在。可用工具：${Object.keys(AGENT_TOOLS).join(', ')}`;
    } else {
      toolResult = tool.exec(toolInput);
    }

    outEl.appendChild(_stepEl('observe', toolResult.replace(/\n/g, '<br>')));

    // Inject result back into conversation history
    messages.push({ role: 'assistant', content: raw });
    messages.push({ role: 'user',      content: `[工具结果] ${toolResult}` });
  }

  outEl.appendChild(_stepEl('error', `已达最大步数（${MAX_STEPS} 步），任务未完成。`));
}

// ── initAgentDemo ─────────────────────────────────────────────────────

function initAgentDemo(panelEl) {
  const queryEl  = panelEl.querySelector('#agent-query');
  const runBtn   = panelEl.querySelector('#agent-run');
  const outEl    = panelEl.querySelector('#agent-output');
  const presets  = panelEl.querySelector('#agent-presets');
  if (!queryEl || !runBtn || !outEl) return;
  if (runBtn.dataset.bound) return;
  runBtn.dataset.bound = '1';

  // Wire preset buttons
  if (presets) {
    presets.querySelectorAll('.agent-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        queryEl.value = btn.dataset.q || '';
        queryEl.focus();
      });
    });
  }

  const run = async () => {
    const q = queryEl.value.trim();
    if (!q) { queryEl.focus(); return; }
    runBtn.disabled = true;
    outEl.innerHTML = '';
    await _runAgentLoop(q, outEl);
    runBtn.disabled = false;
  };

  runBtn.addEventListener('click', run);
  queryEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !runBtn.disabled) run();
  });
}

window.initAgentDemo = initAgentDemo;
