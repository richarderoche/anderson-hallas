export function initPortfolioFilter() {
  const content = document.querySelector('#tag-content');
  if (!content) return;

  document.addEventListener('change', (e) => {
    const select = e.target.closest('select.projcats.detect');
    if (!select) return;
    const opt = select.options[select.selectedIndex];
    const tag = opt?.getAttribute('data-tag');
    if (!tag) return;
    applyTag(tag);
  });

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('.tag-nav');
    if (!nav) return;
    e.preventDefault();
    const tag = nav.getAttribute('data-tag');
    if (!tag) return;
    document.querySelectorAll('.tag-nav').forEach((el) => el.classList.remove('active'));
    nav.classList.add('active');
    applyTag(tag, { skipNav: true });

    const select = document.querySelector('select.projcats');
    if (select) {
      select.classList.remove('detect');
      [...select.options].forEach((o) => {
        o.selected = o.getAttribute('data-tag') === tag || o.classList.contains(`opt-${tag}`);
      });
      const match = select.querySelector(`.opt-${CSS.escape(tag)}`);
      if (match) match.selected = true;
      select.classList.add('detect');
    }
  });
}

function applyTag(tag, { skipNav = false } = {}) {
  const content = document.querySelector('#tag-content');
  const box = document.querySelector('#tag-box');
  if (!content) return;

  if (box) content.style.height = `${box.offsetHeight}px`;

  document.querySelectorAll('.tag-item').forEach((el) => {
    const shouldShow = tag === 'all' || el.classList.contains(`tag-${tag}`);
    const isActive = el.classList.contains('active');
    if (shouldShow && !isActive) el.classList.add('active');
    if (!shouldShow && isActive) el.classList.remove('active');
  });

  if (!skipNav) {
    document.querySelectorAll('.tag-nav').forEach((el) => el.classList.remove('active'));
    document.querySelector(`.nav-${CSS.escape(tag)}`)?.classList.add('active');
  }

  window.setTimeout(() => {
    if (box) content.style.height = `${box.offsetHeight}px`;
  }, 50);

  window.setTimeout(() => {
    content.style.height = '';
  }, 300);
}
