// concept-drawer — three-layer collapsible component
// HTML shape expected:
//   <div class="concept-drawer"
//        data-surface="…"
//        data-mechanism="…"
//        data-sources='[{"label":"…","url":"…"}]'>
//   </div>

function initDrawers(panelEl) {
  panelEl.querySelectorAll('.concept-drawer:not([data-bound])').forEach(el => {
    el.dataset.bound = '1';

    const surface   = el.dataset.surface   || '';
    const mechanism = el.dataset.mechanism || '';
    let   sources   = [];
    try { sources = JSON.parse(el.dataset.sources || '[]'); } catch (_) {}

    el.innerHTML = `
      <div class="cd-surface">${surface}</div>
      <div class="cd-row" data-layer="mechanism">
        <button class="cd-toggle" aria-expanded="false">
          <span class="cd-chevron">▸</span> 深入机制
        </button>
        <div class="cd-body" hidden>
          <div class="cd-content">${mechanism}</div>
        </div>
      </div>
      ${sources.length ? `
      <div class="cd-row" data-layer="sources">
        <button class="cd-toggle" aria-expanded="false">
          <span class="cd-chevron">▸</span> 延伸阅读
        </button>
        <div class="cd-body" hidden>
          <ul class="cd-sources">
            ${sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.label}</a></li>`).join('')}
          </ul>
        </div>
      </div>` : ''}
    `;

    el.querySelectorAll('.cd-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        const body     = btn.nextElementSibling;
        btn.setAttribute('aria-expanded', String(!expanded));
        btn.querySelector('.cd-chevron').textContent = expanded ? '▸' : '▾';
        if (expanded) {
          body.hidden = true;
        } else {
          body.hidden = false;
        }
      });
    });
  });
}
