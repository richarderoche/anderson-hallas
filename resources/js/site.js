import gsap from 'gsap';
import { initSplash } from './modules/splash.js';
import { initNav } from './modules/nav.js';
import { initSliders } from './modules/sliders.js';
import { initLightboxes } from './modules/lightboxes.js';
import { initPortfolioFilter } from './modules/portfolio-filter.js';
import { initMailto } from './modules/mailto.js';
import { initExpandables } from './modules/expandables.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function boot() {
  const mm = gsap.matchMedia();

  mm.add(
    {
      isDesktop: '(min-width: 1018px)',
      reduceMotion: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { reduceMotion: rm } = context.conditions;

      initSplash({ reduced: rm });
      initNav();
      initSliders({ reduced: rm });
      initLightboxes();
      initPortfolioFilter();
      initMailto();
      initExpandables();

      return () => {};
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('load', () => {
  if (!reduceMotion.matches) {
    // splash handled in module; ensure class cleared if still present
  }
});
