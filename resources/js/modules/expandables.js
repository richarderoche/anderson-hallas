const DESKTOP_MQ = '(min-width: 1018px)';

export function initExpandables() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.toggle-sec');
    if (!btn) return;

    const projectInfo = btn.closest('aside.project-info');
    if (projectInfo) {
      e.preventDefault();
      // Desktop: whole panel slides via CSS transform.
      // Mobile: same accordion height animation as job drawers.
      if (window.matchMedia(DESKTOP_MQ).matches) {
        projectInfo.classList.toggle('expanded');
        return;
      }
      const sec = projectInfo.querySelector('.toggle-section');
      if (!sec) return;
      if (projectInfo.classList.contains('expanded')) {
        collapseSection(projectInfo, sec);
      } else {
        expandSection(projectInfo, sec);
      }
      return;
    }

    const parent = btn.closest('.expandable');
    const sec = parent?.querySelector('.toggle-section');
    if (!parent || !sec) return;

    e.preventDefault();

    if (parent.classList.contains('expanded')) {
      collapseSection(parent, sec);
    } else {
      expandSection(parent, sec);
    }
  });
}

function expandSection(parent, sec) {
  clearHeightListener(sec);

  sec.style.maxHeight = '0px';
  parent.classList.add('expanded');
  // Force layout so the transition starts from 0, not from "none"/auto.
  void sec.offsetHeight;
  sec.style.maxHeight = `${sec.scrollHeight}px`;

  const onEnd = (e) => {
    if (e.target !== sec || e.propertyName !== 'max-height') return;
    sec.style.maxHeight = 'none';
    clearHeightListener(sec);
  };
  sec._heightOnEnd = onEnd;
  sec.addEventListener('transitionend', onEnd);
}

function collapseSection(parent, sec) {
  clearHeightListener(sec);

  // From open "none" → concrete px, then to 0 so the close eases evenly.
  sec.style.maxHeight = `${sec.scrollHeight}px`;
  void sec.offsetHeight;
  sec.style.maxHeight = '0px';
  parent.classList.remove('expanded');

  const onEnd = (e) => {
    if (e.target !== sec || e.propertyName !== 'max-height') return;
    sec.style.maxHeight = '';
    clearHeightListener(sec);
  };
  sec._heightOnEnd = onEnd;
  sec.addEventListener('transitionend', onEnd);
}

function clearHeightListener(sec) {
  if (sec._heightOnEnd) {
    sec.removeEventListener('transitionend', sec._heightOnEnd);
    sec._heightOnEnd = null;
  }
}
