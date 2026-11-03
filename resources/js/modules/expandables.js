export function initExpandables() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-sec');
    if (!btn) return;
    e.preventDefault();
    const parent = btn.closest('.expandable');
    const sec = parent?.querySelector('.toggle-section');
    if (!parent || !sec) return;

    if (parent.classList.contains('expanded')) {
      sec.style.maxHeight = '';
      parent.classList.remove('expanded');
      sec.classList.remove('shown');
    } else {
      const clone = sec.cloneNode(true);
      clone.style.maxHeight = 'none';
      clone.style.visibility = 'hidden';
      sec.parentElement.appendChild(clone);
      const height = `${clone.offsetHeight + 15}px`;
      clone.remove();
      sec.style.maxHeight = height;
      parent.classList.add('expanded');
      sec.classList.add('shown');
    }
  });

  // Project info panel
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle-project-info], .toggle-project-info, aside.project-info .toggle');
    if (!toggle) return;
    e.preventDefault();
    document.querySelector('aside.project-info')?.classList.toggle('expanded');
  });
}
