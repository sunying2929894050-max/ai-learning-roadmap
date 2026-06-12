// term-chip — hover/tap shows one-sentence definition from glossary.json
// initTermChips(panelEl) is idempotent via data-bound="1"

let _glossary     = null;
let _glossaryReq  = null;   // pending Promise

function _loadGlossary() {
  if (_glossary) return Promise.resolve(_glossary);
  if (_glossaryReq) return _glossaryReq;
  _glossaryReq = fetch('assets/glossary.json')
    .then(r => r.json())
    .then(data => { _glossary = data; return data; })
    .catch(() => { _glossary = {}; return {}; });
  return _glossaryReq;
}

// Single shared tooltip (appended to body once)
let _tip = null;

function _getTip() {
  if (_tip) return _tip;
  _tip = document.createElement('div');
  _tip.className  = 'chip-tooltip';
  _tip.setAttribute('role', 'tooltip');
  _tip.hidden = true;
  document.body.appendChild(_tip);

  // Close on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.term-chip') && !e.target.closest('.chip-tooltip')) {
      _tip.hidden = true;
    }
  }, true);
  return _tip;
}

function _position(chip) {
  const tip = _getTip();
  const r   = chip.getBoundingClientRect();
  const sv  = document.scrollingElement || document.documentElement;
  tip.style.left = `${r.left + sv.scrollLeft}px`;
  tip.style.top  = `${r.bottom + sv.scrollTop + 6}px`;
  requestAnimationFrame(() => {
    const tr = tip.getBoundingClientRect();
    if (tr.right > window.innerWidth - 8) {
      tip.style.left = `${Math.max(8, window.innerWidth - tr.width - 8) + sv.scrollLeft}px`;
    }
  });
}

function _show(chip, text) {
  const tip = _getTip();
  tip.textContent = text;
  tip.hidden = false;
  _position(chip);
}

function _hide() {
  if (_tip) _tip.hidden = true;
}

async function initTermChips(panelEl) {
  const glossary = await _loadGlossary();

  panelEl.querySelectorAll('.term-chip:not([data-bound])').forEach(chip => {
    chip.dataset.bound = '1';

    const term = chip.dataset.term || chip.textContent.trim();
    const def  = glossary[term];
    if (!def) return;   // no entry — tutor fallback comes in Component 5

    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-describedby', 'chip-tooltip');
    chip.title = '';    // suppress native tooltip

    chip.addEventListener('mouseenter', () => _show(chip, def));
    chip.addEventListener('mouseleave', _hide);
    chip.addEventListener('focus',      () => _show(chip, def));
    chip.addEventListener('blur',       _hide);
    // Mobile: tap to toggle
    chip.addEventListener('click', e => {
      e.stopPropagation();
      const tip = _getTip();
      if (tip.hidden) { _show(chip, def); }
      else            { _hide(); }
    });
  });
}
