const TOC_DATA = {
  1:[{id:"ch1-s0",l:"本章概览"},{id:"ch1-s1",l:"AI 是什么"},{id:"ch1-s2",l:"四大核心概念"},{id:"ch1-s3",l:"四大概念对比"},{id:"ch1-s4",l:"训练与推理"},{id:"ch1-s5",l:"数据：AI 的燃料"},{id:"ch1-s6",l:"四类核心任务"},{id:"ch1-s7",l:"AI 的风险"},{id:"ch1-s8",l:"何时用 AI"},{id:"ch1-s9",l:"实践：场景判断卡"},{id:"ch1-s10",l:"知识自测"},{id:"ch1-s11",l:"本章小结"},{id:"ch1-s12",l:"词汇表"}],
  2:[{id:"ch2-s0",l:"本章概览"},{id:"ch2-s1",l:"为什么要学"},{id:"ch2-s2",l:"Python 基础语法"},{id:"ch2-s3",l:"数据科学三件套"},{id:"ch2-s4",l:"线性代数"},{id:"ch2-s5",l:"概率与统计"},{id:"ch2-s6",l:"导数与梯度"},{id:"ch2-s7",l:"实践：数据探索"},{id:"ch2-s8",l:"知识自测"},{id:"ch2-s9",l:"本章小结"},{id:"ch2-s10",l:"词汇表"}],
  3:[{id:"ch3-s0",l:"本章概览"},{id:"ch3-s1",l:"三大范式"},{id:"ch3-s2",l:"监督学习"},{id:"ch3-s3",l:"无监督学习"},{id:"ch3-s4",l:"模型评估"},{id:"ch3-s5",l:"特征工程"},{id:"ch3-s6",l:"实战：Titanic"},{id:"ch3-s7",l:"知识自测"},{id:"ch3-s8",l:"本章小结"},{id:"ch3-s9",l:"词汇表"}],
  4:[{id:"ch4-s0",l:"本章概览"},{id:"ch4-s1",l:"神经网络基础"},{id:"ch4-s2",l:"PyTorch 核心"},{id:"ch4-s3",l:"CNN：图像架构"},{id:"ch4-s4",l:"Transformer & NLP"},{id:"ch4-s5",l:"迁移学习"},{id:"ch4-s6",l:"实战：MNIST"},{id:"ch4-s7",l:"知识自测"},{id:"ch4-s8",l:"本章小结"},{id:"ch4-s9",l:"词汇表"}],
  5:[{id:"ch5-s0",l:"本章概览"},{id:"ch5-s1",l:"提示词工程"},{id:"ch5-s2",l:"大模型 API 调用"},{id:"ch5-s3",l:"RAG 知识库系统"},{id:"ch5-s4",l:"模型部署"},{id:"ch5-s5",l:"AI 作品集规划"},{id:"ch5-s6",l:"AI Agent"},{id:"ch5-s7",l:"知识自测"},{id:"ch5-s8",l:"本章小结"},{id:"ch5-s9",l:"词汇表"}]
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
