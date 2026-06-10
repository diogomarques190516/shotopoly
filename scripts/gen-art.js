// Generates the game's vector art as tintable PNGs (white shapes on
// transparent background — React Native tints them with `tintColor`).
// All shapes are original, hand-authored paths. Run: node scripts/gen-art.js

const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../assets/art');
fs.mkdirSync(OUT, { recursive: true });

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${inner}</svg>`;

const W = 'fill="#FFFFFF"';
const S = 'fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round"';

// ── player tokens: 8 distinct silhouettes ─────────────────────────────────────
const TOKENS = {
  token_circle:   `<circle cx="64" cy="64" r="46" ${W}/>`,
  token_triangle: `<path d="M64 16 L114 104 L14 104 Z" ${W}/>`,
  token_square:   `<rect x="22" y="22" width="84" height="84" rx="16" ${W}/>`,
  token_diamond:  `<path d="M64 10 L118 64 L64 118 L10 64 Z" ${W}/>`,
  token_star:     `<path d="M64 12 L76.3 47 L113.5 47.9 L84 70.5 L94.6 106.1 L64 85 L33.4 106.1 L44 70.5 L14.5 47.9 L51.7 47 Z" ${W}/>`,
  token_hexagon:  `<path d="M64 12 L109 38 L109 90 L64 116 L19 90 L19 38 Z" ${W}/>`,
  token_heart:    `<path d="M64 112 C28 84 16 62 16 44 C16 28 28 18 42 18 C52 18 60 24 64 32 C68 24 76 18 86 18 C100 18 112 28 112 44 C112 62 100 84 64 112 Z" ${W}/>`,
  token_bolt:     `<path d="M74 8 L26 72 L56 72 L50 120 L102 50 L70 50 Z" ${W}/>`,
};

// ── board space + UI icons ────────────────────────────────────────────────────
const ICONS = {
  // GO — bold arrow
  icon_go: `<path d="M14 50 H66 V26 L114 64 L66 102 V78 H14 Z" ${W}/>`,

  // Jail — cell window with bars
  icon_jail: `
    <rect x="18" y="18" width="92" height="92" rx="14" ${S} stroke-width="10"/>
    <line x1="46" y1="24" x2="46" y2="104" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
    <line x1="64" y1="24" x2="64" y2="104" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
    <line x1="82" y1="24" x2="82" y2="104" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>`,

  // Go to jail — police siren
  icon_siren: `
    <path d="M36 72 A28 30 0 0 1 92 72 V84 H36 Z" ${W}/>
    <rect x="22" y="84" width="84" height="16" rx="8" ${W}/>
    <line x1="64" y1="14" x2="64" y2="32" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
    <line x1="30" y1="28" x2="42" y2="42" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
    <line x1="98" y1="28" x2="86" y2="42" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>`,

  // Free space — martini glass
  icon_martini: `
    <path d="M20 22 H108 L64 70 Z" ${W}/>
    <rect x="59" y="66" width="10" height="36" ${W}/>
    <rect x="38" y="100" width="52" height="10" rx="5" ${W}/>`,

  // Surprise — four-point spark
  icon_spark: `<path d="M64 6 C71 42 86 57 122 64 C86 71 71 86 64 122 C57 86 42 71 6 64 C42 57 57 42 64 6 Z" ${W}/>`,

  // Tax — coin stack
  icon_coins: `
    <rect x="28" y="22" width="72" height="20" rx="10" ${W}/>
    <rect x="20" y="50" width="72" height="20" rx="10" ${W}/>
    <rect x="36" y="78" width="72" height="20" rx="10" ${W}/>`,

  // Shot glass (used in shots counters)
  icon_shot: `
    <path d="M36 18 L92 18 L82 100 L46 100 Z" ${S} stroke-width="9"/>
    <path d="M48 56 L80 56 L75 90 L53 90 Z" ${W}/>`,

  // Die — rounded square with 5 punched-out pips (fill-rule evenodd)
  icon_die: `<path fill-rule="evenodd" ${W} d="M38 14 H90 Q114 14 114 38 V90 Q114 114 90 114 H38 Q14 114 14 90 V38 Q14 14 38 14 Z
    M40 30 A10 10 0 1 0 40 50 A10 10 0 1 0 40 30 Z
    M88 30 A10 10 0 1 0 88 50 A10 10 0 1 0 88 30 Z
    M64 54 A10 10 0 1 0 64 74 A10 10 0 1 0 64 54 Z
    M40 78 A10 10 0 1 0 40 98 A10 10 0 1 0 40 78 Z
    M88 78 A10 10 0 1 0 88 98 A10 10 0 1 0 88 78 Z"/>`,

  // Crown — lobby host badge
  icon_crown: `<path d="M18 96 L12 38 L40 60 L64 22 L88 60 L116 38 L110 96 Z" ${W}/>`,

  // Trophy — winner screen
  icon_trophy: `
    <path d="M38 16 H90 V52 A26 26 0 0 1 38 52 Z" ${W}/>
    <path d="M38 24 H18 V36 A22 22 0 0 0 42 58" ${S} stroke-width="8"/>
    <path d="M90 24 H110 V36 A22 22 0 0 1 86 58" ${S} stroke-width="8"/>
    <rect x="58" y="74" width="12" height="20" ${W}/>
    <rect x="42" y="94" width="44" height="12" rx="6" ${W}/>`,
};

for (const [name, inner] of Object.entries({ ...TOKENS, ...ICONS })) {
  const svg = wrap(inner);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 128 } }).render().asPng();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  console.log(`${name}.png`, png.length, 'bytes');
}
