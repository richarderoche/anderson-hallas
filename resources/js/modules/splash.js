import gsap from 'gsap';

export function initSplash({ reduced = false } = {}) {
  const html = document.documentElement;
  if (!html.classList.contains('splash')) return;

  const dismiss = () => {
    if (reduced) {
      html.classList.remove('splash');
      return;
    }
    gsap.delayedCall(0.5, () => html.classList.remove('splash'));
  };

  if (document.readyState === 'complete') {
    dismiss();
  } else {
    window.addEventListener('load', dismiss, { once: true });
  }

  document.querySelector('.home-splash')?.addEventListener('click', () => {
    document.querySelector('.home-splash')?.remove();
  });
}
