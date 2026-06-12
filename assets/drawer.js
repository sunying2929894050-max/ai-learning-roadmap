// concept-drawer — three-layer collapsible component
//
// Expected HTML structure:
//   <div class="concept-drawer">
//     <div class="drawer-surface">…always-visible rich HTML…</div>
//     <div class="drawer-mechanism" hidden>…collapsible mechanism HTML…</div>
//     <div class="drawer-sources" hidden>          <!-- optional -->
//       <a href="…" target="_blank" rel="noopener">来源1</a>
//       <a href="…" target="_blank" rel="noopener">来源2</a>
//     </div>
//   </div>
//
// initDrawers injects toggle <button>s above each hidden layer and wires
// click handlers. Idempotent via data-bound="1".

function initDrawers(panelEl) {
  panelEl.querySelectorAll('.concept-drawer:not([data-bound])').forEach(el => {
    el.dataset.bound = '1';

    _wireLayer(el, '.drawer-mechanism', '深入机制');
    _wireLayer(el, '.drawer-sources',   '延伸阅读');
  });
}

function _wireLayer(drawerEl, selector, label) {
  const layer = drawerEl.querySelector(selector);
  if (!layer) return;

  const btn = document.createElement('button');
  btn.className = 'cd-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = `<span class="cd-chevron">▸</span>${label}`;

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    btn.querySelector('.cd-chevron').textContent = expanded ? '▸' : '▾';
    layer.hidden = expanded;
  });

  // Insert button immediately before the layer it controls
  layer.parentNode.insertBefore(btn, layer);
}
