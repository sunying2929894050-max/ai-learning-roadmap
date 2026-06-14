/**
 * 动手任务卡组件
 * 元素级幂等：:not([data-bound]) 保证退出再进不重复绑定
 */
function initTaskCards(panelEl) {
  panelEl.querySelectorAll('.task-card:not([data-bound])').forEach(card => {
    card.dataset.bound = '1';
    const toggle = card.querySelector('.task-answer-toggle');
    const answer = card.querySelector('.task-answer');
    if (!toggle || !answer) return;
    toggle.addEventListener('click', () => {
      const opening = answer.hasAttribute('hidden');
      if (opening) {
        answer.removeAttribute('hidden');
        toggle.innerHTML = '收起参考答案 <span class="task-toggle-arrow">▴</span>';
        toggle.classList.add('open');
      } else {
        answer.setAttribute('hidden', '');
        toggle.innerHTML = '查看参考答案 <span class="task-toggle-arrow">▾</span>';
        toggle.classList.remove('open');
      }
    });
  });
}
window.initTaskCards = initTaskCards;
