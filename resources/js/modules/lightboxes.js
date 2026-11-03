import { clearOverlays } from './nav.js';

export function initLightboxes() {
  document.addEventListener('click', (e) => {
    const staffBtn = e.target.closest('.lb-btn');
    if (staffBtn) {
      e.preventDefault();
      clearOverlays();
      document.body.classList.add('lb-on');
      document.querySelectorAll('.lb-wrap .panel').forEach((p) => p.classList.remove('show'));
      const id = staffBtn.getAttribute('data-id');
      if (id) document.querySelector(`.lb-wrap .${CSS.escape(id)}`)?.classList.add('show');
      return;
    }

    const ee = e.target.closest('.ee-lb-btn');
    if (ee) {
      e.preventDefault();
      clearOverlays();
      document.body.classList.add('ee-lb-on');
      return;
    }

    if (e.target.closest('.close-lb')) {
      e.preventDefault();
      document.body.classList.remove('lb-on', 'ee-lb-on');
      return;
    }

    if (document.body.classList.contains('lb-on') || document.body.classList.contains('ee-lb-on')) {
      if (!e.target.closest('.lb .content')) {
        clearOverlays();
      }
    }
  });
}
