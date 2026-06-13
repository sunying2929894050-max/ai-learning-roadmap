// BYOK (Bring Your Own Key) panel — wires save/clear buttons + status indicator
// Called from initChapterComponents when ch-4 becomes active.
// Idempotent via data-bound.

const BYOK_KEY = 'byok_key';

function initByokPanel(panelEl) {
  const panel = panelEl.querySelector('#byok-panel');
  if (!panel || panel.dataset.bound) return;
  panel.dataset.bound = '1';

  const input      = panel.querySelector('#byok-input');
  const saveBtn    = panel.querySelector('#byok-save');
  const clearBtn   = panel.querySelector('#byok-clear');
  const indicator  = panel.querySelector('#byok-indicator');
  const statusText = panel.querySelector('#byok-status-text');
  const notice     = panel.querySelector('#byok-saved-notice');

  function _refresh() {
    const stored = (sessionStorage.getItem(BYOK_KEY) || '').trim();
    if (stored) {
      indicator.className  = 'byok-dot byok-dot--active';
      statusText.textContent = 'Key 已就绪（会话中有效）';
      notice.style.display = 'block';
      input.value = '';
      input.placeholder = '已保存（粘贴新 key 可覆盖）';
    } else {
      indicator.className  = 'byok-dot byok-dot--empty';
      statusText.textContent = '未填入 Key';
      notice.style.display = 'none';
      input.placeholder = 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    }
  }

  saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) { input.focus(); return; }
    if (!val.startsWith('sk-')) {
      input.style.borderColor = '#ef4444';
      setTimeout(() => input.style.borderColor = '', 1200);
      return;
    }
    sessionStorage.setItem(BYOK_KEY, val);
    _refresh();
  });

  clearBtn.addEventListener('click', () => {
    sessionStorage.removeItem(BYOK_KEY);
    input.value = '';
    _refresh();
  });

  // Enter key saves
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });

  _refresh();
}
