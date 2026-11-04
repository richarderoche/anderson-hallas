export function initNav() {
  const body = document.body;
  const header = document.querySelector('header.top');

  document.addEventListener('click', (e) => {
    const open = e.target.closest('.toggle-nav-open');
    if (open) {
      e.preventDefault();
      body.classList.add('main-nav-on');
      return;
    }
    const close = e.target.closest('.toggle-nav-close');
    if (close) {
      e.preventDefault();
      body.classList.remove('main-nav-on');
      return;
    }
    const on = e.target.closest('.toggle-on');
    if (on) {
      e.preventDefault();
      clearOverlays();
      const cls = on.getAttribute('data-toggle');
      if (cls) body.classList.add(cls);
      return;
    }
    const off = e.target.closest('.toggle-off');
    if (off) {
      e.preventDefault();
      const cls = off.getAttribute('data-toggle');
      if (cls) body.classList.remove(cls);
      return;
    }
    if (e.target.closest('.toggle-off-all')) {
      e.preventDefault();
      clearOverlays();
    }
  });

  // Desktop child menus
  header?.addEventListener('mouseenter', (e) => {
    const link = e.target.closest?.('a.top-link');
    if (link) {
      childMenuAlign();
      header.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
    }
    const parent = e.target.closest?.('.parent-link');
    if (parent) {
      const wrap = parent.parentElement;
      if (wrap && !wrap.classList.contains('active')) {
        header.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
        wrap.classList.add('active');
      }
    }
  }, true);

  header?.addEventListener('mouseleave', () => {
    header.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
  });

  window.addEventListener('resize', debounce(childMenuAlign, 150));
  childMenuAlign();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearOverlays();
      document.querySelector('.home-splash')?.remove();
      document.querySelector('aside.project-info')?.classList.remove('expanded');
      document.querySelectorAll('.lb-wrap .vid').forEach((v) => {
        try { v.pause(); } catch (_) {}
      });
    }
  });
}

export function clearOverlays() {
  document.body.classList.remove('main-nav-on', 'lb-on', 'ee-lb-on');
  document.querySelectorAll('.header-wrap .active').forEach((el) => el.classList.remove('active'));
  stopVideo();
}

function stopVideo() {
  document.querySelectorAll('iframe').forEach((iframe) => {
    const src = iframe.getAttribute('src');
    if (src) iframe.setAttribute('src', src);
  });
  document.querySelectorAll('.vid').forEach((v) => {
    try { v.pause(); } catch (_) {}
  });
}

function childMenuAlign() {
  document.querySelectorAll('.header-wrap .parent-link').forEach((link) => {
    const rect = link.getBoundingClientRect();
    const fromRight = `${window.innerWidth - (rect.left + rect.width)}px`;
    link.parentElement?.querySelectorAll('.children-wrap .sub-link').forEach((sub) => {
      sub.style.marginRight = fromRight;
    });
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
