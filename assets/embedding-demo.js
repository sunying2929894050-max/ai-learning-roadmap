// embedding-demo — pure-client semantic vector operations
// Pre-computed 8-dim vectors; cosine similarity; analogy arithmetic.
// initEmbeddingDemo(panelEl) is idempotent via data-bound="1".
//
// Vector dimensions (semantic axes):
//  0: royalty/nobility  1: masculine(+)/feminine(-)  2: person/human
//  3: animal            4: positive sentiment          5: urban/city
//  6: national/country  7: food/consumable

const WORD_VECTORS = {
  "king":     [ 4.0,  3.0,  4.0,  0.0,  0.5,  0.3,  0.3,  0.0],
  "queen":    [ 4.0, -3.0,  4.0,  0.0,  0.6,  0.3,  0.3,  0.0],
  "man":      [ 0.2,  4.0,  4.5,  0.0,  0.2,  0.0,  0.0,  0.0],
  "woman":    [ 0.2, -4.0,  4.5,  0.0,  0.3,  0.0,  0.0,  0.0],
  "prince":   [ 3.5,  2.5,  3.5,  0.0,  0.4,  0.2,  0.2,  0.0],
  "princess": [ 3.5, -2.5,  3.5,  0.0,  0.5,  0.2,  0.2,  0.0],
  "boy":      [ 0.1,  3.0,  3.8,  0.0,  0.2,  0.0,  0.0,  0.0],
  "girl":     [ 0.1, -3.0,  3.8,  0.0,  0.3,  0.0,  0.0,  0.0],
  "father":   [ 0.2,  3.5,  4.2,  0.0,  0.4,  0.0,  0.0,  0.0],
  "mother":   [ 0.2, -3.5,  4.2,  0.0,  0.5,  0.0,  0.0,  0.0],
  "cat":      [ 0.0,  0.2,  0.5,  4.5,  0.4,  0.0,  0.0,  0.1],
  "dog":      [ 0.0,  0.3,  0.5,  4.3,  0.5,  0.0,  0.0,  0.0],
  "lion":     [ 0.1,  0.5,  0.1,  4.2,  0.0,  0.0,  0.0,  0.0],
  "horse":    [ 0.0,  0.1,  0.0,  4.0,  0.1,  0.0,  0.0,  0.0],
  "good":     [ 0.0,  0.1,  0.5,  0.0,  4.5,  0.0,  0.0,  0.0],
  "bad":      [ 0.0,  0.0,  0.3,  0.0, -4.2,  0.0,  0.0,  0.0],
  "happy":    [ 0.0,  0.0,  0.6,  0.0,  4.2,  0.0,  0.0,  0.0],
  "sad":      [ 0.0,  0.0,  0.5,  0.0, -4.0,  0.0,  0.0,  0.0],
  "excellent":[ 0.0,  0.0,  0.2,  0.0,  4.6,  0.0,  0.0,  0.0],
  "terrible": [ 0.0,  0.0,  0.2,  0.0, -4.4,  0.0,  0.0,  0.0],
  "paris":    [ 0.2,  0.0,  0.1,  0.0,  0.4,  4.5,  3.5,  0.0],
  "london":   [ 0.2,  0.0,  0.1,  0.0,  0.4,  4.4,  3.3,  0.0],
  "berlin":   [ 0.2,  0.0,  0.1,  0.0,  0.3,  4.4,  3.6,  0.0],
  "rome":     [ 0.2,  0.0,  0.1,  0.0,  0.3,  4.3,  3.4,  0.0],
  "france":   [ 0.0,  0.0,  0.0,  0.0,  0.3,  3.8,  4.6,  0.0],
  "germany":  [ 0.0,  0.0,  0.0,  0.0,  0.2,  3.6,  4.5,  0.0],
  "italy":    [ 0.0,  0.0,  0.0,  0.0,  0.2,  3.5,  4.4,  0.0],
  "england":  [ 0.0,  0.0,  0.0,  0.0,  0.2,  3.4,  4.3,  0.0],
  "apple":    [ 0.0,  0.0,  0.0,  0.0,  0.4,  0.0,  0.0,  4.5],
  "orange":   [ 0.0,  0.0,  0.0,  0.0,  0.4,  0.0,  0.0,  4.3],
  "banana":   [ 0.0,  0.0,  0.0,  0.0,  0.3,  0.0,  0.0,  4.1],
  "water":    [ 0.0,  0.0,  0.0,  0.0,  0.1,  0.0,  0.0,  3.5],
};

const WORD_LIST = Object.keys(WORD_VECTORS);

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function vecAdd(a, b)  { return a.map((v, i) => v + b[i]); }
function vecSub(a, b)  { return a.map((v, i) => v - b[i]); }

function nearest(vec, excludeWords, topN) {
  return WORD_LIST
    .filter(w => !excludeWords.includes(w))
    .map(w => ({ word: w, sim: cosine(vec, WORD_VECTORS[w]) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, topN);
}

// ── Analogy widget ──────────────────────────────────────────────────────────

function _bindAnalogyDemo(demo) {
  const aEl = demo.querySelector('.analogy-a');
  const bEl = demo.querySelector('.analogy-b');
  const cEl = demo.querySelector('.analogy-c');
  const runBtn = demo.querySelector('.analogy-run');
  const result = demo.querySelector('.analogy-result');
  if (!runBtn || !result) return;

  function runAnalogy() {
    const a = aEl.value.trim().toLowerCase();
    const b = bEl.value.trim().toLowerCase();
    const c = cEl.value.trim().toLowerCase();

    if (!WORD_VECTORS[a] || !WORD_VECTORS[b] || !WORD_VECTORS[c]) {
      const missing = [a, b, c].filter(w => !WORD_VECTORS[w]);
      result.innerHTML = `<span style="color:#ef4444">词 "${missing.join(', ')}" 不在内置词表中。<br>支持的词：${WORD_LIST.join(', ')}</span>`;
      result.hidden = false;
      return;
    }

    const query = vecAdd(vecSub(WORD_VECTORS[a], WORD_VECTORS[b]), WORD_VECTORS[c]);
    const top = nearest(query, [a, b, c], 4);

    result.innerHTML =
      `<div style="margin-bottom:8px"><strong>${a}</strong> - <strong>${b}</strong> + <strong>${c}</strong> &nbsp;≈</div>` +
      top.map((r, i) =>
        `<div class="analogy-row" style="opacity:${1 - i*0.18}">
          <span class="analogy-rank">#${i+1}</span>
          <strong>${r.word}</strong>
          <span class="analogy-sim">相似度 ${(r.sim * 100).toFixed(1)}%</span>
         </div>`
      ).join('');
    result.hidden = false;
  }

  runBtn.addEventListener('click', runAnalogy);
  // Also run on Enter in any field
  [aEl, bEl, cEl].forEach(el => el && el.addEventListener('keydown', e => {
    if (e.key === 'Enter') runAnalogy();
  }));
}

// ── Similarity widget ───────────────────────────────────────────────────────

function _bindSimilarityDemo(demo) {
  const w1El = demo.querySelector('.sim-word1');
  const w2El = demo.querySelector('.sim-word2');
  const runBtn = demo.querySelector('.sim-run');
  const result = demo.querySelector('.sim-result');
  if (!runBtn || !result) return;

  function runSim() {
    const w1 = w1El.value.trim().toLowerCase();
    const w2 = w2El.value.trim().toLowerCase();
    if (!WORD_VECTORS[w1] || !WORD_VECTORS[w2]) {
      const missing = [w1, w2].filter(w => !WORD_VECTORS[w]);
      result.innerHTML = `<span style="color:#ef4444">词 "${missing.join(', ')}" 不在内置词表中。<br>支持的词：${WORD_LIST.join(', ')}</span>`;
      result.hidden = false;
      return;
    }
    const sim = cosine(WORD_VECTORS[w1], WORD_VECTORS[w2]);
    const pct = (sim * 100).toFixed(1);
    const barColor = sim > 0.7 ? 'var(--accent)' : sim > 0.3 ? '#f59e0b' : '#94a3b8';
    result.innerHTML =
      `<div style="font-size:13px;margin-bottom:8px">
         <strong>${w1}</strong> 与 <strong>${w2}</strong> 的余弦相似度：
         <span style="font-size:18px;font-weight:800;color:${barColor}">${pct}%</span>
       </div>
       <div style="background:#f1f5f9;border-radius:6px;height:10px;overflow:hidden">
         <div style="height:100%;width:${Math.max(0, (sim+1)/2*100).toFixed(1)}%;background:${barColor};border-radius:6px;transition:width .4s"></div>
       </div>
       <div style="font-size:11px;color:var(--light-muted);margin-top:6px">
         ${sim > 0.8 ? '语义非常相近' : sim > 0.5 ? '有一定语义关联' : sim > 0 ? '语义关联较弱' : '语义方向相反'}
       </div>`;
    result.hidden = false;
  }

  runBtn.addEventListener('click', runSim);
  [w1El, w2El].forEach(el => el && el.addEventListener('keydown', e => {
    if (e.key === 'Enter') runSim();
  }));
}

// ── Public init ─────────────────────────────────────────────────────────────

function initEmbeddingDemo(panelEl) {
  panelEl.querySelectorAll('.analogy-demo:not([data-bound])').forEach(demo => {
    demo.dataset.bound = '1';
    _bindAnalogyDemo(demo);
  });
  panelEl.querySelectorAll('.similarity-demo:not([data-bound])').forEach(demo => {
    demo.dataset.bound = '1';
    _bindSimilarityDemo(demo);
  });
}
