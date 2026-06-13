// ai-demo — interactive LLM demo placeholder
// HTML shape:
//   <div class="ai-demo">
//     <div class="demo-label">…title…</div>          <!-- optional -->
//     <div class="demo-prompt">…prompt text…</div>   <!-- plain text, no escaping needed -->
//     <button class="demo-run">运行</button>
//     <div class="demo-output" hidden></div>
//   </div>
//
// When window.callLLM is a function (Component 3), clicking Run calls it.
// Otherwise shows a friendly "not yet connected" placeholder.
// Idempotent via data-bound="1".

function initAiDemos(panelEl) {
  panelEl.querySelectorAll('.ai-demo:not([data-bound])').forEach(card => {
    card.dataset.bound = '1';

    const runBtn   = card.querySelector('.demo-run');
    const promptEl = card.querySelector('.demo-prompt');
    const outputEl = card.querySelector('.demo-output');
    if (!runBtn || !outputEl) return;

    runBtn.addEventListener('click', () => {
      if (typeof window.callLLM === 'function') {
        window.callLLM({
          prompt:    promptEl ? promptEl.textContent.trim() : '',
          outputEl,
          runBtn,
        });
      } else {
        outputEl.hidden = false;
        const hasKey = !!(sessionStorage.getItem('byok_key') || '').trim();
        if (hasKey) {
          outputEl.innerHTML =
            '<div class="demo-pending">' +
            '✅ Key 已就绪。<br>' +
            '<span style="opacity:.7;font-size:12px">AI 直连接口将在下一步开通，届时此演示将自动变为可运行状态。</span>' +
            '</div>';
        } else {
          outputEl.innerHTML =
            '<div class="demo-pending">' +
            '🔑 请先在 <strong>ch4 第七节</strong>填入你的 DeepSeek API Key，再来运行演示。<br>' +
            '<span style="opacity:.7;font-size:12px">Key 只存在浏览器 sessionStorage，关闭标签页自动清除。</span>' +
            '</div>';
        }
      }
    });
  });
}
