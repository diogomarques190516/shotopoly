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

// ── player characters: 8 full-color party blobs, each with its own face ──────
// Body color matches PLAYER_COLORS[i] in constants/gameConstants.ts.
const INK_FACE = '#1B2030';

function blob(color, face, hat = '') {
  return `
    ${hat}
    <ellipse cx="64" cy="70" rx="46" ry="44" fill="${color}"/>
    <ellipse cx="46" cy="50" rx="15" ry="9" fill="rgba(255,255,255,0.30)" transform="rotate(-18 46 50)"/>
    ${face}`;
}

const eyesNormal = `
  <circle cx="48" cy="64" r="10" fill="#FFFFFF"/><circle cx="50" cy="66" r="5" fill="${INK_FACE}"/>
  <circle cx="80" cy="64" r="10" fill="#FFFFFF"/><circle cx="82" cy="66" r="5" fill="${INK_FACE}"/>`;
const smile = `<path d="M50 86 Q64 98 78 86" stroke="${INK_FACE}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`;

const CHARS = {
  // 1 · red — party hat
  char_1: blob('#FF4655', eyesNormal + smile, `
    <path d="M64 2 L86 38 L42 38 Z" fill="#FFC300"/>
    <circle cx="64" cy="4" r="7" fill="#FFFFFF"/>`),

  // 2 · gold — sunglasses
  char_2: blob('#FFC300', `
    <rect x="32" y="56" width="27" height="16" rx="6" fill="${INK_FACE}"/>
    <rect x="69" y="56" width="27" height="16" rx="6" fill="${INK_FACE}"/>
    <rect x="56" y="60" width="16" height="5" fill="${INK_FACE}"/>
    <path d="M48 88 Q64 100 80 86" stroke="${INK_FACE}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`),

  // 3 · green — wink + tongue
  char_3: blob('#39D98A', `
    <circle cx="48" cy="64" r="10" fill="#FFFFFF"/><circle cx="50" cy="66" r="5" fill="${INK_FACE}"/>
    <path d="M72 64 L90 64" stroke="${INK_FACE}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M50 84 Q64 96 78 84" stroke="${INK_FACE}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="68" cy="94" rx="8" ry="7" fill="#FF6BD0"/>`),

  // 4 · blue — crown
  char_4: blob('#4FC3F7', eyesNormal + smile, `
    <path d="M42 36 L46 10 L58 26 L64 6 L70 26 L82 10 L86 36 Z" fill="#FFC300"/>`),

  // 5 · pink — bow + blush
  char_5: blob('#FF6BD0', eyesNormal + smile + `
    <circle cx="36" cy="80" r="6.5" fill="rgba(200,30,90,0.4)"/>
    <circle cx="92" cy="80" r="6.5" fill="rgba(200,30,90,0.4)"/>`, `
    <path d="M44 8 L64 20 L44 32 Z" fill="#FF4655"/>
    <path d="M84 8 L64 20 L84 32 Z" fill="#FF4655"/>
    <circle cx="64" cy="20" r="7" fill="#D62F4B"/>`),

  // 6 · orange — happy-drunk: closed eyes, wavy mouth, drool drop
  char_6: blob('#FF8A3D', `
    <path d="M38 64 Q47 56 56 64" stroke="${INK_FACE}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M72 64 Q81 56 90 64" stroke="${INK_FACE}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M48 88 Q56 80 64 88 Q72 96 80 88" stroke="${INK_FACE}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
    <path d="M84 92 q7 11 0 16 q-7 -5 0 -16" fill="#4FC3F7"/>`),

  // 7 · teal — backwards cap
  char_7: blob('#00E5C0', eyesNormal + smile, `
    <path d="M38 38 A26 20 0 0 1 90 38 L90 44 L38 44 Z" fill="#FF4655"/>
    <rect x="86" y="32" width="20" height="10" rx="5" fill="#D62F4B"/>`),

  // 8 · silver — monocle + moustache
  char_8: blob('#E8ECF5', `
    <circle cx="48" cy="64" r="10" fill="#FFFFFF" stroke="${INK_FACE}" stroke-width="2"/><circle cx="50" cy="66" r="5" fill="${INK_FACE}"/>
    <circle cx="80" cy="64" r="10" fill="#FFFFFF"/><circle cx="82" cy="66" r="5" fill="${INK_FACE}"/>
    <circle cx="80" cy="64" r="15" fill="none" stroke="${INK_FACE}" stroke-width="4"/>
    <line x1="80" y1="79" x2="80" y2="94" stroke="${INK_FACE}" stroke-width="3"/>
    <path d="M42 84 Q53 74 64 82 Q75 74 86 84 Q75 90 64 86 Q53 90 42 84 Z" fill="${INK_FACE}"/>`),
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

for (const [name, inner] of Object.entries({ ...CHARS, ...ICONS })) {
  const svg = wrap(inner);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 128 } }).render().asPng();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  console.log(`${name}.png`, png.length, 'bytes');
}
