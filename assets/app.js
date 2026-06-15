const TOC_DATA = {
  // ── 前置速通 ──
  0: [{id:"ch0-s0",l:"前置导图"}],
  // ── 主轴：0→1 AI 应用 ──
  1: [{id:"ch1-s0",l:"本章概览"},{id:"ch1-s1",l:"AI 是什么"},{id:"ch1-s2",l:"四大核心概念"},{id:"ch1-s3",l:"四大概念对比"},{id:"ch1-s4",l:"训练与推理"},{id:"ch1-s5",l:"数据：AI 的燃料"},{id:"ch1-s6",l:"四类核心任务"},{id:"ch1-s7",l:"AI 的风险"},{id:"ch1-s8",l:"何时用 AI"},{id:"ch1-s9",l:"实践：场景判断卡"},{id:"ch1-s10",l:"知识自测"},{id:"ch1-s11",l:"本章小结"},{id:"ch1-s12",l:"词汇表"}],
  2: [{id:"ch6-s0",l:"本章概览"},{id:"ch6-s1",l:"AI 数 r 的实验"},{id:"ch6-s2",l:"Token：分词与切块"},{id:"ch6-s3",l:"分词可视化"},{id:"ch6-s4",l:"Embedding：语义坐标"},{id:"ch6-s5",l:"语义运算实验室"},{id:"ch6-s6",l:"知识自测"},{id:"ch6-s7",l:"本章小结"},{id:"ch6-s8",l:"词汇表"}],
  3: [{id:"ch3-s0",l:"本章概览"},{id:"ch3-s1",l:"同一任务，两种结果"},{id:"ch3-s2",l:"Prompt 到底是什么"},{id:"ch3-s3",l:"Few-Shot 为什么有效"},{id:"ch3-s4",l:"思维链（CoT）"},{id:"ch3-s5",l:"常见失败与注入攻击"},{id:"ch3-s6",l:"互动演示"},{id:"ch3-s7",l:"本章给项目加了什么"},{id:"ch3-s8",l:"知识自测"},{id:"ch3-s9",l:"本章小结"},{id:"ch3-s10",l:"词汇表"}],
  4: [{id:"ch4-s0",l:"本章概览"},{id:"ch4-s1",l:"点发送底层发生了什么"},{id:"ch4-s2",l:"API 调用是什么"},{id:"ch4-s3",l:"API Key 与鉴权"},{id:"ch4-s4",l:"流式输出 SSE"},{id:"ch4-s5",l:"Token 与成本"},{id:"ch4-s6",l:"BYOK：用你的 Key"},{id:"ch4-s7",l:"填入 API Key"},{id:"ch4-env",l:"本地环境搭建"},{id:"ch4-s8",l:"本章给项目加了什么"},{id:"ch4-s9",l:"知识自测"},{id:"ch4-s10",l:"本章小结"},{id:"ch4-s11",l:"词汇表"}],
  5: [{id:"ch5-s0",l:"本章概览"},{id:"ch5-s1",l:"先问它一个私有问题"},{id:"ch5-s2",l:"RAG 核心思想"},{id:"ch5-s3",l:"检索：向量＋余弦"},{id:"ch5-s4",l:"切块与向量库"},{id:"ch5-s5",l:"完整管线与失败模式"},{id:"ch5-s6",l:"互动演示"},{id:"ch5-s7",l:"本章给项目加了什么"},{id:"ch5-s8",l:"知识自测"},{id:"ch5-s9",l:"本章小结"},{id:"ch5-s10",l:"词汇表"}],
  6: [{id:"ch6-s0",l:"本章概览"},{id:"ch6-s1",l:"先问它做不到的事"},{id:"ch6-s2",l:"工具调用的本质"},{id:"ch6-s3",l:"Agent 循环：ReAct"},{id:"ch6-s4",l:"工具描述与选择"},{id:"ch6-s5",l:"失败模式"},{id:"ch6-s6",l:"互动演示"},{id:"ch6-s7",l:"本章给项目加了什么"},{id:"ch6-s8",l:"知识自测"},{id:"ch6-s9",l:"本章小结"},{id:"ch6-s10",l:"词汇表"}],
  7: [{id:"ch7-s0",l:"本章概览"},{id:"ch7-s1",l:"改了 prompt 就上线"},{id:"ch7-s2",l:"为什么评估难"},{id:"ch7-s3",l:"评估的几种方式"},{id:"ch7-s4",l:"建评估集"},{id:"ch7-s5",l:"离线 vs 在线评估"},{id:"ch7-s6",l:"互动演示"},{id:"ch7-s7",l:"本章给项目加了什么"},{id:"ch7-s8",l:"知识自测"},{id:"ch7-s9",l:"本章小结"},{id:"ch7-s10",l:"词汇表"}],
  8: [{id:"ch8-s0",l:"本章概览"},{id:"ch8-s1",l:"助手在本地跑完了"},{id:"ch8-s2",l:"从脚本到服务"},{id:"ch8-s3",l:"跑在哪：三种环境"},{id:"ch8-s4",l:"生产中的密钥"},{id:"ch8-s5",l:"可观测：日志·监控"},{id:"ch8-s6",l:"延迟与流式输出"},{id:"ch8-s7",l:"项目整理与文档化"},{id:"ch8-s8",l:"本章给项目加了什么"},{id:"ch8-s9",l:"知识自测"},{id:"ch8-s10",l:"本章小结"},{id:"ch8-s11",l:"词汇表"}],
  // ── 选修翼：造 AI 路线 ──
  21:[{id:"ch21-s0",l:"本节定位"},{id:"ch21-s1",l:"前置清单"},{id:"ch21-s2",l:"新手扫雷"},{id:"ch21-s3",l:"练习区（规划中）"}],
  22:[{id:"ch22-s0",l:"本节定位"},{id:"ch22-s1",l:"推荐学习路径"},{id:"ch22-s2",l:"新手扫雷"},{id:"ch22-s3",l:"练习区（规划中）"}],
  23:[{id:"ch23-s0",l:"本节定位"},{id:"ch23-s1",l:"推荐学习路径"},{id:"ch23-s2",l:"新手扫雷"},{id:"ch23-s3",l:"练习区（规划中）"}]
};

const app         = document.getElementById("app");
const tocList     = document.getElementById("tocList");
const contentView = document.getElementById("contentView");
const backBtn     = document.getElementById("backBtn");
const cards       = document.querySelectorAll(".chapter-card");
const mount       = document.getElementById("chapter-mount");

let curChapter  = null;
let observer    = null;
let loading     = false;           // guard against rapid clicks during fetch
const loaded    = new Set();       // track which chapters have been injected

// ── Enter chapter ──
function enterChapter(ch) {
  if (loading) return;             // ignore rapid clicks while a fetch is in flight

  curChapter = ch;

  // Animate cards out
  cards.forEach(c => {
    const isSelected = +c.dataset.chapter === ch;
    c.classList.add(isSelected ? "exit-selected" : "exit-fade");
  });

  // Load chapter HTML if not yet loaded, then switch
  if (!loaded.has(ch)) {
    loading = true;
    fetch(`chapters/ch${ch}.html`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(html => {
        mount.insertAdjacentHTML("beforeend", html);
        loaded.add(ch);
        loading = false;
        _activateChapter(ch);
      })
      .catch(err => {
        loading = false;
        // On error: reset card animations and re-enable map
        cards.forEach(c => c.classList.remove("exit-fade", "exit-selected"));
        console.error("Failed to load chapter", ch, err);
      });
  } else {
    // Already in DOM — switch after card animation delay
    setTimeout(() => _activateChapter(ch), 340);
  }
}

// Called once chapter HTML is confirmed in the DOM
function _activateChapter(ch) {
  // Hide all panels, show only the requested one
  const panelEl = mount.querySelector(`#ch-${ch}`);
  mount.querySelectorAll(".ch-panel").forEach(p =>
    p.classList.toggle("active", p.id === `ch-${ch}`)
  );

  // Switch view
  app.classList.add("content");

  // Scroll to top
  contentView.scrollTo({ top: 0, behavior: "instant" });

  // Render TOC
  renderToc(ch);

  // Setup scroll observer (needs two rAF frames for layout to settle)
  requestAnimationFrame(() => requestAnimationFrame(() => {
    setupObserver(ch);
    // Initialize all chapter-scoped components (drawer, term chips, prompt-runner, etc.)
    // panelEl is the live DOM node for this chapter — safe to query inside it here.
    if (panelEl) initChapterComponents(panelEl);
  }));
}

// ── Chapter component initialization hook ──
// Called every time a chapter panel becomes active (including on re-entry after back→forward).
// Each feature module should register its setup logic here.
// panelEl — the <div class="ch-panel" id="ch-N"> node that just became active.
function initChapterComponents(panelEl) {
  initDrawers(panelEl);
  initTermChips(panelEl);
  initAiDemos(panelEl);
  if (typeof initTokenizerDemo === 'function') initTokenizerDemo(panelEl);
  if (typeof initEmbeddingDemo === 'function') initEmbeddingDemo(panelEl);
  if (typeof initByokPanel === 'function') initByokPanel(panelEl);
  if (typeof initRagDemo === 'function') initRagDemo(panelEl);
  if (typeof initAgentDemo === 'function') initAgentDemo(panelEl);
  if (typeof initEvalDemo === 'function') initEvalDemo(panelEl);
  if (typeof initTaskCards === 'function') initTaskCards(panelEl);
}

// ── Back to map ──
function backToMap() {
  app.classList.remove("content");

  // Reset card animations after transition
  setTimeout(() => {
    cards.forEach(c => {
      c.classList.remove("exit-fade", "exit-selected");
      c.style.animation = "none";
      requestAnimationFrame(() => { c.style.animation = ""; });
    });
  }, 420);

  if (observer) observer.disconnect();
  curChapter = null;
}

// ── TOC ──
function renderToc(ch) {
  tocList.innerHTML = (TOC_DATA[ch] || []).map(t =>
    `<div class="toc-item" data-id="${t.id}" onclick="goTo('${t.id}')">${t.l}</div>`
  ).join("");
}

function goTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  contentView.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
}

function setupObserver(ch) {
  if (observer) observer.disconnect();
  const els = (TOC_DATA[ch] || []).map(t => document.getElementById(t.id)).filter(Boolean);
  observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        tocList.querySelectorAll(".toc-item").forEach(el =>
          el.classList.toggle("active", el.dataset.id === id)
        );
      }
    });
  }, { root: contentView, rootMargin: "-15% 0px -60% 0px", threshold: 0 });
  els.forEach(el => observer.observe(el));
}

// ── MC Quiz ──
function checkMC(el, result, explanation) {
  const group = el.closest(".mc-options");
  if (group.dataset.answered) return;
  group.dataset.answered = "1";
  group.querySelectorAll(".mc-opt").forEach(opt => {
    opt.style.pointerEvents = "none";
    if (opt === el) {
      opt.style.background = result === "correct" ? "rgba(0,212,170,.18)" : "rgba(239,68,68,.18)";
      opt.style.borderColor = result === "correct" ? "var(--accent)" : "#ef4444";
      opt.style.color       = result === "correct" ? "var(--accent)" : "#ef4444";
    }
  });
  let explain = group.nextElementSibling;
  if (!explain || !explain.classList.contains("mc-explain")) {
    explain = document.createElement("div");
    explain.className = "mc-explain";
    group.after(explain);
  }
  explain.textContent = (result === "correct" ? "✓ " : "✗ ") + explanation;
  explain.style.color   = result === "correct" ? "var(--accent)" : "#ef4444";
  explain.style.display = "block";
}

// ── Wire up card clicks ──
cards.forEach(c =>
  c.addEventListener("click", () => enterChapter(+c.dataset.chapter))
);
backBtn.addEventListener("click", backToMap);
