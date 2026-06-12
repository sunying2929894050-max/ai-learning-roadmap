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
        outputEl.innerHTML =
          '<div class="demo-pending">' +
          '🔌 LLM 接口尚未接入。<br>' +
          '<span style="opacity:.7;font-size:12px">Component 3（prompt-runner）完成并配置好服务端地址后，此演示将自动变为可运行状态。</span>' +
          '</div>';
      }
    });
  });
}
