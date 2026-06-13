// ai-demo — interactive LLM demo component
//
// HTML shape:
//   <div class="ai-demo" [data-system="optional system prompt"]>
//     <div class="demo-label">…title…</div>          <!-- optional -->
//     <div class="demo-prompt">…prompt text…</div>   <!-- plain text -->
//     <button class="demo-run">运行</button>
//     <div class="demo-output" hidden></div>
//   </div>
//
// Calls window.callLLM(prompt, { system }) which is defined in llm.js.
// Handles all error states (no key, worker not deployed, upstream errors) gracefully.
// Idempotent via data-bound="1".

function initAiDemos(panelEl) {
  panelEl.querySelectorAll('.ai-demo:not([data-bound])').forEach(card => {
    card.dataset.bound = '1';

    const runBtn   = card.querySelector('.demo-run');
    const promptEl = card.querySelector('.demo-prompt');
    const outputEl = card.querySelector('.demo-output');
    if (!runBtn || !outputEl) return;

    runBtn.addEventListener('click', async () => {
      const prompt = promptEl ? promptEl.textContent.trim() : '';
      const system = card.dataset.system || undefined;

      outputEl.hidden = false;
      outputEl.innerHTML = '<div class="demo-pending">⏳ 生成中…</div>';
      runBtn.disabled = true;

      try {
        if (typeof window.callLLM !== 'function') {
          throw Object.assign(new Error('NO_WORKER'), {
            friendly: 'llm.js 未加载，请检查 index.html 的脚本引用。',
          });
        }

        const result = await window.callLLM(prompt, { system });
        outputEl.innerHTML =
          '<div class="demo-result">' +
          result.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/\n/g,'<br>') +
          '</div>';

      } catch (err) {
        const msg = err.friendly || err.message || '';
        outputEl.innerHTML = `<div class="demo-pending">${_icon(err)} ${msg}</div>`;
      } finally {
        runBtn.disabled = false;
      }
    });
  });
}

function _icon(err) {
  const m = err.message || '';
  if (m === 'NO_KEY')    return '🔑';
  if (m === 'NO_WORKER') return '✅';
  return '❌';
}
