#!/usr/bin/env node
/**
 * Convert legacy Sass partials → organized CSS partials (same folders / names).
 * Mixins & Sass vars are expanded per-file via dart-sass; site.css keeps theme.scss import order.
 *
 * Usage: npm run convert:css
 */
import * as sass from 'sass';
import fs from 'node:fs';
import path from 'node:path';

const OLD = '/Volumes/Dev/_php/anderson-hallas-OLD/site/themes/andersonhallas-theme/sass';
const OUT = '/Volumes/Dev/_php/anderson-hallas/resources/css';
const TMP = path.join(OUT, '.sass-tmp');
// Partials live in resources/css/{shared,sections,md,lg,exlg}/ → fonts at resources/fonts/
const FONT = '../../fonts';

/** Partials that are only Sass helpers (no CSS output of their own) */
const SASS_ONLY = new Set([
  'shared/_sizes.scss',
  'shared/_mixins.scss',
  'shared/_typestyles.scss',
  'shared/_typetargets.scss',
  'shared/_kerning.scss',
  'shared/_debug.scss',
  'sections/_about.scss',
  'theme.scss',
  'override.scss',
  'md/_mdstyles.scss',
  'lg/_lgstyles.scss',
  'exlg/_exlgstyles.scss',
]);

/** Wrap compiled CSS in a media query (md / lg / exlg / type2 / type3) */
const MEDIA_WRAP = {
  'shared/_type2.scss': '(min-width: 680px)',
  'shared/_type3.scss': '(min-width: 1018px)',
  md: '(min-width: 680px)',
  lg: '(min-width: 1018px)',
  exlg: '(min-width: 1360px)',
};

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function collapseMultilineSelectorVars(src) {
  return src.replace(
    /\$([A-Za-z0-9_-]+)\s*:\s*'\s*\n([\s\S]*?)\n';/g,
    (_, name, body) => {
      const selectors = body
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('//'))
        .join(', ');
      return `$${name}: '${selectors}';`;
    }
  );
}

function stripLineComments(src) {
  return src
    .split('\n')
    .map((line) => {
      if (/^\s*\/\//.test(line)) return '';
      if (!line.includes("'") && !line.includes('"')) {
        return line.replace(/\s+\/\/.*$/, '');
      }
      return line;
    })
    .join('\n');
}

/** Convert /* section banners to // so Sass does not emit them into every partial */
function silenceBlockComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (block) => {
    // Keep real documentation that isn't the === banner style if needed; silence all
    // preamble helper comments (mixins/typestyles/typetargets) via // lines
    return block
      .split('\n')
      .map((line) => {
        const t = line.replace(/^\s*\/\*+\s?/, '').replace(/\*\/\s*$/, '').trim();
        return t ? `// ${t}` : '//';
      })
      .join('\n');
  });
}

function patchScss(src, rel) {
  if (rel.includes('debug')) return '/* debug removed */\n';
  const key = rel.replace(/\\/g, '/');
  let s = collapseMultilineSelectorVars(src);
  s = s.replace(/\/assets\/fonts\//g, `${FONT}/`);
  s = s.replace(/@import\s+["']shared\/debug["'];?/g, '');
  s = s.replace(/@import\s+["']\.\.\/shared\/debug["'];?/g, '');
  // media.scss: drop nested type/md/lg/exlg imports — those ship as separate CSS files
  if (key.endsWith('shared/_media.scss')) {
    s = s.replace(/@import\s+["']\.\.\/shared\/type2["'];?/g, '/* type2.css imported via site.css @ 680px */');
    s = s.replace(/@import\s+["']\.\.\/md\/mdstyles["'];?/g, '/* md/* imported via site.css @ 680px */');
    s = s.replace(/@import\s+["']\.\.\/shared\/type3["'];?/g, '/* type3.css imported via site.css @ 1018px */');
    s = s.replace(/@import\s+["']\.\.\/lg\/lgstyles["'];?/g, '/* lg/* imported via site.css @ 1018px */');
    s = s.replace(/@import\s+["']\.\.\/exlg\/exlgstyles["'];?/g, '/* exlg/* imported via site.css @ 1360px */');
  }
  // Sass-only helpers are imported into every partial compile — don't leak their banners
  if (
    key.endsWith('shared/_mixins.scss') ||
    key.endsWith('shared/_typestyles.scss') ||
    key.endsWith('shared/_typetargets.scss') ||
    key.endsWith('shared/_sizes.scss')
  ) {
    s = silenceBlockComments(s);
  }
  s = stripLineComments(s);
  s = s.replace(/\$tRoll \+\.1s/g, '$tRoll + 0.1s');
  return s;
}

function outName(rel) {
  // shared/_layout.scss → shared/layout.css
  const normalized = rel.replace(/\\/g, '/');
  const dir = path.dirname(normalized);
  let base = path.basename(normalized, '.scss');
  if (base.startsWith('_')) base = base.slice(1);
  return path.join(dir, `${base}.css`);
}

function postCss(css) {
  css = css.replace(/url\((['"]?)[^'")]*\.eot[^'")]*\1\)\s*format\((['"])embedded-opentype\2\)\s*,?/g, '');
  css = css.replace(/url\((['"]?)[^'")]*\.eot[^'")]*\1\)\s*,?/g, '');
  css = css.replace(/,?\s*url\((['"]?)[^'")]*\.ttf\1\)\s*format\((['"])truetype\2\)/g, '');
  css = css.replace(/src:\s*,/g, 'src:');
  css = css.replace(/src:\s*;\s*\n\s*src:/g, 'src:');
  css = css.replace(/,\s*;/g, ';');
  // Drop charset noise from nested compiles
  css = css.replace(/@charset\s+"UTF-8";\s*/gi, '');
  css = css.replace(/\.js\.no-touchevents[^{]*\{[^}]*\}/g, '');
  css = css.replace(/\.generatedcontent\.picturefill[^{]*\{[^}]*\}/g, '');
  css = css.replace(/\.generatedcontent[^{]*\{[^}]*\}/g, '');
  css = css.replace(/\.page-visible[^{]*\{[^}]*\}/g, '');

  // Touch class → media queries (selector-level)
  css = rewriteTouchSelectors(css);
  css = css.replace(/\.no-touchevents/g, '');
  css = css.replace(/\.touchevents/g, '');
  css = css.replace(/,\s*,/g, ',');
  return css;
}

function rewriteTouchSelectors(css) {
  const fine = '(hover: hover) and (pointer: fine)';
  const coarse = '(hover: none), (pointer: coarse)';
  const out = [];
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf('{', i);
    if (brace === -1) {
      out.push(css.slice(i));
      break;
    }
    const selector = css.slice(i, brace).trim();
    let depth = 0;
    let j = brace;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    const body = css.slice(brace, j);
    const leading = css.slice(i, brace).match(/^\s*/)?.[0] ?? '';
    if (/\.no-touchevents|\.touchevents/.test(selector) && !selector.includes('@media')) {
      const isFine = /\.no-touchevents/.test(selector);
      const isCoarse = /\.touchevents/.test(selector);
      let cleaned = selector
        .replace(/\.no-touchevents/g, '')
        .replace(/\.touchevents/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      cleaned = cleaned
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .join(', ');
      if (!cleaned) cleaned = ':root';
      const mq = isFine && !isCoarse ? fine : coarse;
      out.push(`${leading}@media ${mq} {\n${cleaned} ${body}\n}\n`);
    } else {
      out.push(css.slice(i, j));
    }
    i = j;
  }
  return out.join('');
}

function wrapMedia(css, query) {
  const trimmed = css.trim();
  if (!trimmed) return `/* empty */\n`;
  return `@media ${query} {\n${trimmed}\n}\n`;
}

const COLOR_VARS_SCSS = `
$white: #fff;
$stone: #F1EEEA;
$orange: #FF551E;
$brownTXT: #493421;
$brownBG: #3B2B1E;
$brown50: #A49990;
$overlay: rgba(59,43,30,.95);
$overlayLight: rgba(241,238,234,.9);
$linkUnderline: $brown50;
$formInputBG: $stone;
`;

const ANIMATION_VARS_SCSS = `
$linkopacity: opacity .2s ease-in-out;
$imgOpacity: opacity .8s ease-in-out;
$navlinkopacity: color .2s ease-in-out, opacity .2s ease-in-out;
$tglSec: .35s;
$toggleIn: visibility 0s linear, max-height $tglSec $easeSwiftOut;
$toggleOut: visibility 0s linear $tglSec, max-height $tglSec $easeSwiftOut;
$childrenIn: visibility 0s linear, opacity .15s ease-in-out;
$childrenOut: visibility 0s linear .15s, opacity .15s ease-in-out;
$overlayIn: transform 0s linear, visibility 0s linear, opacity .35s ease-in-out;
$overlayOut: transform 0s linear .3s, visibility 0s linear .3s, opacity .35s ease-in-out;
$projThumb: opacity .3s ease-in-out, background-color .2s ease-in-out;
$tagLoading: opacity .35s ease-in-out;
$tagheight: height .5s $easeSwiftOut;
$projPanel: transform .2s $easeSwiftOut;
$sliderFade: opacity .35s ease-in-out;
$autoSliderFade: opacity .7s ease-in-out;
$tempArrows: tempArrows 2.25s $easeSwiftOut;
$tRoll: 1.6s;
$tWordFade: .9s;
$tWordBetween: -.1s;
$flipDelay: .4s;
$tFlip: .5s;
$outDelay: .8s;
$outFade: 1.8s;
$tWord: $tWordFade + $tWordBetween;
$craftDelay: $tRoll + 0.1s;
$balanceDelay: $craftDelay + $tWord;
$whimsyDelay: $balanceDelay + $tWord;
$tflipDelay: $tWordFade + .2s;
$tTotal: ($whimsyDelay + $tflipDelay + $tFlip + $outDelay);
$symbol: transform $tRoll $easeRoll, opacity $tRoll * 0.6 ease-in-out;
$craft: opacity $tWordFade ease-in-out $craftDelay;
$balance: opacity $tWordFade ease-in-out $balanceDelay;
$whimsy: opacity $tWordFade ease-in-out $whimsyDelay, transform $tFlip $easeSwiftInBack $whimsyDelay + $tflipDelay;
$splashOut: transform 0s linear ($tTotal + $outFade), visibility 0s linear ($tTotal + $outFade), opacity $outFade ease-in-out $tTotal;
$homeDot: opacity .2s ease-in-out, background-color .3s ease-in-out;
`;

function compilePartial(rel) {
  const key = rel.replace(/\\/g, '/');
  // Avoid circular/self-duplication: don't re-import a file's own API into itself
  const skipColors = key.endsWith('shared/_colors.scss');
  const skipIcons = key.endsWith('shared/_icons.scss');
  const skipAnims = key.endsWith('shared/_animations.scss');

  const preamble = `
@import "shared/sizes";
@import "shared/mixins";
@import "shared/typestyles";
${skipColors ? '' : '@import "shared/color-vars";'}
${skipIcons ? '' : '@import "shared/icons";'}
${skipAnims ? '' : '@import "shared/animation-vars";'}
@import "shared/form-vars";
`;
  const entry = path.join(TMP, `_compile_${rel.replace(/[\\/]/g, '__')}.scss`);
  const sassImport = rel
    .replace(/\\/g, '/')
    .replace(/\.scss$/, '')
    .replace(/(^|\/)_/, '$1');

  fs.writeFileSync(entry, `${preamble}\n@import "${sassImport}";\n`);

  const result = sass.compile(entry, {
    loadPaths: [TMP],
    style: 'expanded',
    silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div'],
  });
  return postCss(result.css);
}

// --- prepare patched tree ---
fs.rmSync(TMP, { recursive: true, force: true });
ensureDir(TMP);

const allScss = [];
function walk(dir, base = '') {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.join(base, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full, rel);
      continue;
    }
    if (!name.endsWith('.scss')) continue;
    allScss.push(rel);
    const dest = path.join(TMP, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, patchScss(fs.readFileSync(full, 'utf8'), rel));
  }
}
walk(OLD);

// Cross-partial Sass API (vars only) so each CSS file can compile alone
fs.writeFileSync(path.join(TMP, 'shared/_color-vars.scss'), COLOR_VARS_SCSS);
fs.writeFileSync(path.join(TMP, 'shared/_animation-vars.scss'), ANIMATION_VARS_SCSS);
fs.writeFileSync(
  path.join(TMP, 'shared/_form-vars.scss'),
  `
$form_placeholder_prefixes: ('::-webkit-input-placeholder', ':-moz-placeholder', '::-moz-placeholder', '::input-placeholder', '::placeholder');
$form_placeholder_prefixes_withIE: ('::-webkit-input-placeholder', ':-moz-placeholder', '::-moz-placeholder', ':-ms-input-placeholder', '::input-placeholder', '::placeholder');
`
);

// tokens.css (CSS vars for documentation / future use; breakpoints stay literals in CSS)
ensureDir(path.join(OUT, 'shared'));
fs.writeFileSync(
  path.join(OUT, 'shared/tokens.css'),
  `/* Design tokens from shared/_sizes.scss (media queries still use literal px). */
:root {
  --font-sm: 18;
  --font-md: 18;
  --font-lg: 14;
  --gut-sm: 10;
  --gut-md: 12;
  --gut-lg: 12.36;
  --bp-min: 272px;
  --bp-mid: 680px;
  --bp-full: 1018px;
  --bp-exlg: 1360px;
  --header-sm: 3em;
}
`
);

const written = [];
for (const rel of allScss) {
  const key = rel.replace(/\\/g, '/');
  if (SASS_ONLY.has(key)) continue;

  process.stdout.write(`compile ${key}… `);
  try {
    let css = compilePartial(rel);
    const folder = key.split('/')[0];
    let query = MEDIA_WRAP[key] || MEDIA_WRAP[folder];
    if (query) css = wrapMedia(css, query);

    // text-wrap pretty once on body/type targets — add to type1 only
    if (key === 'shared/_type1.scss') {
      css += `\n.widont, .widont p, h1, h2, h3, h4 { text-wrap: pretty; }\n`;
    }

    const destRel = outName(rel);
    const destAbs = path.join(OUT, destRel);
    ensureDir(path.dirname(destAbs));
    fs.writeFileSync(destAbs, `/* from ${key} */\n${css}`);
    written.push(destRel.replace(/\\/g, '/'));
    console.log('ok');
  } catch (e) {
    console.log('FAIL');
    console.error(`  ${e.message}`);
  }
}

// Bard preview from override.scss
try {
  const ov = compilePartial('override.scss');
  ensureDir(path.join(OUT, 'cp'));
  fs.writeFileSync(path.join(OUT, 'cp/bard-preview.css'), ov);
  console.log('Wrote cp/bard-preview.css');
} catch (e) {
  ensureDir(path.join(OUT, 'cp'));
  fs.writeFileSync(
    path.join(OUT, 'cp/bard-preview.css'),
    `.bard-content { font-family: FFMarkWeb, sans-serif; }\n`
  );
}

// site.css — same import order as theme.scss (CSS partials, not Sass-only helpers)
const siteCss = `/*! Anderson Hallas — CSS partials (converted from Sass; same folders & order as theme.scss) */

/* tokens (CSS vars; optional reference) */
@import "./shared/tokens.css";

/* foundation (sizes/mixins/typestyles were Sass-only → expanded into each partial) */
@import "./shared/fontface.css";

/* reset */
@import "./shared/reset.css";
@import "./shared/resetforms.css";

/* global */
@import "./shared/colors.css";
@import "./shared/icons.css";
@import "./shared/animations.css";

/* small (mobile first) + type1 */
@import "./shared/type1.css";
@import "./shared/layout.css";
@import "./shared/site-header.css";
@import "./shared/site-footer.css";
@import "./shared/page-content.css";
@import "./shared/bodytxt.css";
@import "./shared/components.css";
@import "./shared/forms.css";

/* sections */
@import "./sections/home.css";
@import "./sections/project.css";
@import "./sections/portfolio.css";
@import "./sections/staff.css";
@import "./sections/media.css";
@import "./sections/contact.css";

/* md (wrapped @ 680px during convert) — same set as md/_mdstyles.scss */
@import "./shared/type2.css";
@import "./md/md-layout.css";
@import "./md/md-site-header.css";
@import "./md/md-site-footer.css";
@import "./md/md-page-content.css";
@import "./md/md-home.css";
@import "./md/md-staff.css";
@import "./md/md-media.css";
@import "./md/md-portfolio.css";
@import "./md/md-project.css";
@import "./md/md-contact.css";

/* lg (wrapped @ 1018px) — same set as lg/_lgstyles.scss */
@import "./shared/type3.css";
@import "./lg/lg-layout.css";
@import "./lg/lg-site-header.css";
@import "./lg/lg-site-footer.css";
@import "./lg/lg-page-content.css";
@import "./lg/lg-components.css";
@import "./lg/lg-forms.css";
@import "./lg/lg-home.css";
@import "./lg/lg-staff.css";
@import "./lg/lg-media.css";
@import "./lg/lg-project.css";
@import "./lg/lg-portfolio.css";
@import "./lg/lg-contact.css";

/* exlg (wrapped @ 1360px) */
@import "./exlg/exlg-project.css";

/* fluid body type-scale ladder (nested md/lg/exlg imports removed; see above) */
@import "./shared/media.css";
`;

fs.writeFileSync(path.join(OUT, 'site.css'), siteCss);

// Remove monolithic theme.css if present
const mono = path.join(OUT, 'theme.css');
if (fs.existsSync(mono)) fs.unlinkSync(mono);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nWrote ${written.length} CSS partials + site.css`);
