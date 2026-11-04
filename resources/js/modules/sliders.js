import gsap from 'gsap';
import { clearOverlays } from './nav.js';

const SLIDE_FADE = 0.35;
const AUTO_FADE = 0.7;

export function initSliders({ reduced = false } = {}) {
  // Move home dots into nav wrap
  if (document.querySelector('main.home')) {
    document.querySelectorAll('.dot').forEach((dot) => {
      document.querySelector('.slide-nav-wrap .dots')?.appendChild(dot);
    });
  }

  if (!document.querySelector('.slide-wrap')) return;

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('.slide-nav');
    if (nav) {
      e.preventDefault();
      clearOverlays();
      document.querySelector('aside.project-info')?.classList.remove('expanded');
      const wrap = document.querySelector('.slide-wrap');
      if (wrap?.classList.contains('switching')) return;
      slideInit();
      if (nav.classList.contains('slide-next')) slideNext();
      else slidePrev();
      slideSlide({ reduced });
      return;
    }

    const dot = e.target.closest('.slide-nav-wrap .dot');
    if (dot) {
      document.querySelector('.slide-wrap.autoplay')?.classList.remove('autoplay');
      if (dot.classList.contains('active')) return;
      const id = dot.getAttribute('data-id');
      const chosen = document.querySelector(`.slide.${CSS.escape(id)}`);
      const wrap = document.querySelector('.slide-wrap');
      if (!chosen || wrap?.classList.contains('switching')) return;
      wrap.classList.add('switching');
      document.querySelectorAll('.slide.show').forEach((s) => {
        s.classList.add('leaving');
        s.classList.remove('show');
      });
      window.__newSlide = chosen;
      slideSlide({ reduced });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!document.querySelector('.slide-wrap')) return;
    if (e.key === 'ArrowLeft') {
      document.querySelector('.slide-wrap.autoplay')?.classList.remove('autoplay');
      slideInit();
      slidePrev();
      slideSlide({ reduced });
    } else if (e.key === 'ArrowRight') {
      document.querySelector('.slide-wrap.autoplay')?.classList.remove('autoplay');
      slideInit();
      slideNext();
      slideSlide({ reduced });
    }
  });

  if (!reduced) {
    const delay = (SLIDE_FADE + 1.8) * 1000;
    window.setInterval(() => {
      if (!document.querySelector('.slide-wrap.autoplay')) return;
      slideInit();
      slideNext();
      slideSlide({ reduced, auto: true });
    }, delay);
  }
}

function slideInit() {
  const wrap = document.querySelector('.slide-wrap');
  const show = document.querySelector('.slide-wrap .show');
  if (!wrap || !show) return;
  window.__slideWidth = show.clientWidth;
  window.__sliderTotalWidth = wrap.clientWidth;
  wrap.classList.add('switching');
  if (!(window.__sliderTotalWidth * 0.75 > window.__slideWidth)) {
    const shown = document.querySelectorAll('.slide.show');
    if (shown.length > 1) {
      shown[shown.length - 1].classList.remove('display', 'show');
    }
  }
  document.querySelectorAll('.slide.show').forEach((s) => {
    s.classList.add('leaving');
    s.classList.remove('show');
  });
}

function slideNext() {
  bumpCounter(1);
  const leaving = document.querySelectorAll('.slide.leaving');
  const last = leaving[leaving.length - 1];
  if (window.__sliderTotalWidth * 0.75 > window.__slideWidth) {
    window.__newSlide = last?.nextElementSibling?.classList.contains('slide')
      ? last.nextElementSibling
      : document.querySelector('.slide');
  } else {
    let next = last?.nextElementSibling;
    if (next?.classList.contains('empty')) next = next.nextElementSibling;
    window.__newSlide = next?.classList.contains('slide') ? next : document.querySelector('.slide');
  }
}

function slidePrev() {
  bumpCounter(-1);
  const leaving = document.querySelectorAll('.slide.leaving');
  const first = leaving[0];
  if (window.__sliderTotalWidth * 0.75 > window.__slideWidth) {
    window.__newSlide = first?.previousElementSibling?.classList.contains('slide')
      ? first.previousElementSibling
      : document.querySelector('.slide:last-of-type');
  } else {
    let prev = first?.previousElementSibling;
    if (prev?.classList.contains('empty')) prev = prev.previousElementSibling;
    window.__newSlide = prev?.classList.contains('slide')
      ? prev
      : document.querySelector('.slide:last-of-type');
  }
}

function bumpCounter(dir) {
  const el = document.querySelector('#slidecounter');
  const totalEl = document.querySelector('#slidetotal');
  if (!el || !totalEl) return;
  const total = parseInt(totalEl.textContent, 10) || 1;
  let n = parseInt(el.textContent, 10) + dir;
  if (n > total) n = 1;
  if (n < 1) n = total;
  el.textContent = String(n);
}

function slideSlide({ reduced = false, auto = false } = {}) {
  const newSlide = window.__newSlide;
  if (!newSlide) return;
  newSlide.classList.add('display', 'show', 'coming');
  const newW = newSlide.clientWidth;
  if (window.__sliderTotalWidth * 0.75 > newW) {
    if (newSlide.classList.contains('left')) {
      newSlide.nextElementSibling?.classList.add('display', 'show', 'coming');
    }
    if (newSlide.classList.contains('right')) {
      newSlide.previousElementSibling?.classList.add('display', 'show', 'coming');
    }
  }
  const id = document.querySelector('.slide.show')?.getAttribute('data-id');
  if (id) {
    document.querySelectorAll('.dot.active').forEach((d) => d.classList.remove('active'));
    document.querySelector(`.dot.${CSS.escape(id)}`)?.classList.add('active');
  }

  const duration = reduced ? 0 : auto ? AUTO_FADE : SLIDE_FADE;
  gsap.delayedCall(duration, () => {
    document.querySelectorAll('.slide.leaving').forEach((s) => s.classList.remove('leaving', 'display'));
    document.querySelectorAll('.slide.coming').forEach((s) => s.classList.remove('coming'));
    document.querySelectorAll('.slide-wrap').forEach((w) => w.classList.remove('switching'));
  });
}
