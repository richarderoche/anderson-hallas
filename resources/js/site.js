import { initSplash } from './modules/splash.js';
import { initNav } from './modules/nav.js';
import { initSliders } from './modules/sliders.js';
import { initLightboxes } from './modules/lightboxes.js';
import { initPortfolioFilter } from './modules/portfolio-filter.js';
import { initMailto } from './modules/mailto.js';
import { initExpandables } from './modules/expandables.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function boot() {
  const reduced = reduceMotion.matches;

  initSplash({ reduced });
  initNav();
  initSliders({ reduced });
  initLightboxes();
  initPortfolioFilter();
  initMailto();
  initExpandables();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
