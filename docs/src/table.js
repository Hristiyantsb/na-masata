// The На маса table: the wooden mascot drawn as SVG so it can move.
// Markup builders are pure (they run in Node tests); the DOM helpers at the end animate a mounted
// table. Everything on the table is an item in a keyed layer, so changing the scene drops new
// things in and lifts old ones away instead of redrawing the picture.

const W = 320;
const H = 260;
// Table-top ellipse. Items stand on this plane: u runs left to right, v back to front, both -1..1.
const TOP = { cx: 160, cy: 100, rx: 120, ry: 33 };
export const onTop = (u, v) => [TOP.cx + u * TOP.rx, TOP.cy + v * TOP.ry];
const f1 = (n) => Math.round(n * 10) / 10;

export const MOODS = ['open', 'happy', 'wink', 'curious', 'determined', 'sleepy', 'love'];

/* ---------- body ---------- */

function legPath(x1, y1, x2, y2, w1, w2) {
  const dx = x2 - x1,
    dy = y2 - y1,
    len = Math.hypot(dx, dy),
    nx = -dy / len,
    ny = dx / len;
  const p = (x, y) => `${f1(x)} ${f1(y)}`;
  return (
    `M${p(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2)}L${p(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2)}` +
    `L${p(x2 + (nx * w2) / 2, y2 + (ny * w2) / 2)}A${w2 / 2} ${w2 / 2} 0 0 0 ${p(x2 - (nx * w2) / 2, y2 - (ny * w2) / 2)}Z`
  );
}

const LEGS = {
  bl: [134, 122, 123, 224, 17, 14],
  br: [186, 122, 197, 224, 17, 14],
  fl: [108, 126, 80, 238, 23, 18],
  fr: [212, 126, 240, 238, 23, 18],
};

function defs(id) {
  return `<defs>
<linearGradient id="${id}-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f9cd96"/><stop offset=".55" stop-color="#efae6c"/><stop offset="1" stop-color="#e49c58"/></linearGradient>
<linearGradient id="${id}-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d88d48"/><stop offset="1" stop-color="#b96f30"/></linearGradient>
<linearGradient id="${id}-apron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7a161"/><stop offset="1" stop-color="#d08442"/></linearGradient>
<linearGradient id="${id}-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7c283"/><stop offset=".45" stop-color="#eeac68"/><stop offset="1" stop-color="#d98f4c"/></linearGradient>
<linearGradient id="${id}-back" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c47c3d"/><stop offset="1" stop-color="#a2602a"/></linearGradient>
<radialGradient id="${id}-shadow"><stop offset="0" stop-color="#3c230f" stop-opacity=".2"/><stop offset="1" stop-color="#3c230f" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset=".55" stop-color="#d7dde2"/><stop offset="1" stop-color="#aab3bb"/></linearGradient>
<pattern id="${id}-ging" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="scale(1 .42) rotate(0)"><rect width="14" height="14" fill="#fffaf5"/><rect width="7" height="14" fill="#df4b3b" opacity=".5"/><rect width="14" height="7" fill="#df4b3b" opacity=".5"/></pattern>
<clipPath id="${id}-topclip"><ellipse cx="${TOP.cx}" cy="${TOP.cy}" rx="${TOP.rx}" ry="${TOP.ry}"/></clipPath>
</defs>`;
}

function face() {
  const eye = (x, side) => `<g class="t-eye t-eye-${side}" transform="translate(${x} 0)">
<g class="t-eye-open"><ellipse rx="13.4" ry="14.6" fill="#fffaf2"/><ellipse rx="13.4" ry="14.6" fill="none" stroke="#c57c3b" stroke-opacity=".35" stroke-width="1.2"/><g class="t-pupil"><circle r="7.9" fill="#2a190e"/><circle cx="2.5" cy="-2.7" r="2.5" fill="#fff"/><circle cx="-2.4" cy="2.5" r="1" fill="#fff" opacity=".6"/></g><path class="t-lid" d="M-13.5 -1.5C-13.5 -18 13.5 -18 13.5 -1.5Z" fill="#dc9452"/><path class="t-lid" d="M-13.5 -1.5H13.5" stroke="#7a4219" stroke-width="2.2" stroke-linecap="round"/></g>
<path class="t-eye-arc" d="M-9.5 3Q0 -9 9.5 3" fill="none" stroke="#2a190e" stroke-width="3.6" stroke-linecap="round"/>
<path class="t-brow" d="${side === 'l' ? 'M-11 -21L9 -16' : 'M-9 -16L11 -21'}" fill="none" stroke="#a4602a" stroke-width="3.2" stroke-linecap="round"/>
<path class="t-brow-up" d="M-10 -21Q0 -27 10 -22" fill="none" stroke="#a4602a" stroke-width="3" stroke-linecap="round"/>
</g>`;
  return `<g class="t-face" transform="translate(160 165)"><g class="t-face-in">
<ellipse class="t-blush" cx="-33" cy="11" rx="7.5" ry="4.2" fill="#f0806a" opacity=".38"/><ellipse class="t-blush" cx="33" cy="11" rx="7.5" ry="4.2" fill="#f0806a" opacity=".38"/>
${eye(-20, 'l')}${eye(20, 'r')}
<g class="t-mouth" transform="translate(0 19)"><path class="t-m-smile" d="M-7 -1Q0 6 7 -1" fill="none" stroke="#5d2b12" stroke-width="3" stroke-linecap="round"/><g class="t-m-open"><path d="M-8.5 -2.5Q0 13 8.5 -2.5Z" fill="#5d2b12"/><path d="M-4.6 4.4Q0 1.6 4.6 4.4Q0 8 -4.6 4.4Z" fill="#e2664d"/></g><ellipse class="t-m-o" cx="0" cy="1" rx="3.6" ry="4.4" fill="#5d2b12"/></g>
</g></g>`;
}

function body(id, items = { top: [], cloth: [] }) {
  const leg = (k, fill) =>
    `<g class="t-leg t-leg-${k}"><path d="${legPath(...LEGS[k])}" fill="url(#${id}-${fill})"/></g>`;
  const edge = `M${TOP.cx - TOP.rx} ${TOP.cy}L${TOP.cx - TOP.rx} ${TOP.cy + 13}A${TOP.rx} ${TOP.ry} 0 0 0 ${TOP.cx + TOP.rx} ${TOP.cy + 13}L${TOP.cx + TOP.rx} ${TOP.cy}A${TOP.rx} ${TOP.ry} 0 0 1 ${TOP.cx - TOP.rx} ${TOP.cy}Z`;
  return `<g class="t-body">
${leg('bl', 'back')}${leg('br', 'back')}
<path class="t-apron" d="M103 110C103 168 126 198 160 198C194 198 217 168 217 110Z" fill="url(#${id}-apron)"/>
${leg('fl', 'leg')}${leg('fr', 'leg')}
<path class="t-edge" d="${edge}" fill="url(#${id}-edge)"/>
<path d="M${TOP.cx - TOP.rx + 6} ${TOP.cy + 9}A${TOP.rx - 6} ${TOP.ry - 2} 0 0 0 ${TOP.cx + TOP.rx - 6} ${TOP.cy + 9}" fill="none" stroke="#f3b977" stroke-opacity=".55" stroke-width="1.6"/>
<ellipse class="t-top" cx="${TOP.cx}" cy="${TOP.cy}" rx="${TOP.rx}" ry="${TOP.ry}" fill="url(#${id}-top)"/>
<g clip-path="url(#${id}-topclip)" fill="none" stroke="#cf8645" stroke-linecap="round" opacity=".42"><path d="M58 92C110 84 170 90 246 84" stroke-width="2.2"/><path d="M76 108C132 100 196 108 268 102" stroke-width="1.8"/><path d="M104 79C150 74 196 77 230 73" stroke-width="1.5"/><path d="M60 118C100 114 128 120 160 117" stroke-width="1.4"/></g>
<ellipse cx="128" cy="86" rx="46" ry="9" fill="#fff" opacity=".16"/>
<g class="t-layer" data-layer="cloth">${layerMarkup(items.cloth)}</g>
${face()}
<g class="t-layer" data-layer="top">${layerMarkup(items.top)}</g>
</g>`;
}

const SPARK = 'M0 0L9 -11M5 5L18 1M-5 -3L-3 -17';

/** Full SVG of the table. `uid` keeps gradient ids unique when several tables share a page. */
export function tableSVG({ uid = 't', mood, className = '', label = '', scene = null } = {}) {
  const id = String(uid).replace(/[^a-z0-9-]/gi, '');
  const items = scene ? sceneItems(scene, id) : { top: [], floor: [], fx: [], cloth: [] };
  mood = mood || scene?.mood || 'open';
  const a11y = label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"';
  return `<svg class="t ${className}" viewBox="0 0 ${W} ${H}" ${a11y} focusable="false" data-mood="${MOODS.includes(mood) ? mood : 'open'}" data-uid="${id}" data-cloche="${scene?.cloche || ''}" data-dance="${scene?.dance ? '1' : ''}">${defs(id)}
<ellipse class="t-shadow" cx="160" cy="241" rx="112" ry="11" fill="url(#${id}-shadow)"/>
<g class="t-feet" fill="#3c230f" opacity=".14"><ellipse cx="80" cy="241" rx="13" ry="3"/><ellipse cx="240" cy="241" rx="13" ry="3"/><ellipse cx="123" cy="229" rx="9" ry="2.2"/><ellipse cx="197" cy="229" rx="9" ry="2.2"/></g>
<g class="t-layer" data-layer="floor">${layerMarkup(items.floor)}</g>
${body(id, items)}
<g transform="translate(256 70)"><g class="t-sparkle"><path d="${SPARK}" fill="none" stroke="#f2b33d" stroke-width="3.2" stroke-linecap="round"/></g></g>
<g transform="translate(64 70) scale(-1 1)"><g class="t-sparkle"><path d="${SPARK}" fill="none" stroke="#f2b33d" stroke-width="3.2" stroke-linecap="round"/></g></g>
<g class="t-layer" data-layer="fx">${layerMarkup(items.fx)}</g>
</svg>`;
}

/* ---------- things that go on the table ---------- */

const FOOD = {
  rice: '<path d="M-10 0C-10 -8 10 -8 10 0Z" fill="#f7f0e0"/><path d="M-5 -3.5h2.2M1 -4.6h2.2M4.5 -2.2h2.2M-2 -1.4h2.2M-7 -1.2h2" stroke="#e1d3b7" stroke-width="1.2" stroke-linecap="round"/>',
  drumstick:
    '<g transform="rotate(-18)"><rect x="3.5" y="-4.4" width="9.5" height="2.8" rx="1.4" fill="#f4ecdd"/><circle cx="13.2" cy="-5" r="1.9" fill="#f4ecdd"/><circle cx="13.2" cy="-2.6" r="1.9" fill="#f4ecdd"/><ellipse cx="-1.5" cy="-3.8" rx="8" ry="6" fill="#c46f35"/><ellipse cx="-3.2" cy="-5.6" rx="3.8" ry="2.1" fill="#e09254" opacity=".85"/></g>',
  fish: '<path d="M-12 -4C-7 -11 6 -11 9 -4C6 3 -7 3 -12 -4Z" fill="#ef8f6d"/><path d="M8 -4L15 -9.5L15 1.5Z" fill="#e2744f"/><circle cx="-6.6" cy="-5.2" r="1.2" fill="#3a2316"/><path d="M-1.5 -8.5C.5 -6 .5 -2.5 -1.5 0" fill="none" stroke="#e2744f" stroke-width="1.1"/>',
  egg: '<path d="M-10 -2.5C-12 -8 -4 -11.5 0 -9C5 -12 12 -7 10 -1.5C9 3 -8 3 -10 -2.5Z" fill="#fffef8"/><circle cx="0" cy="-4.2" r="3.9" fill="#f4b31a"/><circle cx="-1.1" cy="-5.4" r="1.2" fill="#fff" opacity=".7"/>',
  broccoli:
    '<rect x="-1.7" y="-5.5" width="3.4" height="5.5" rx="1.2" fill="#9cc56a"/><circle cx="-3.8" cy="-7.4" r="3.8" fill="#4f8f35"/><circle cx="3.4" cy="-7.8" r="3.8" fill="#5a9c3d"/><circle cx="0" cy="-10.6" r="4" fill="#47842f"/>',
  tomato:
    '<ellipse cx="0" cy="-1.8" rx="4.8" ry="3.6" fill="#e04a32"/><ellipse cx="0" cy="-1.8" rx="3.3" ry="2.3" fill="#f27a5e"/><circle cx="-1.1" cy="-1.9" r=".6" fill="#fbe5a2"/><circle cx="1.2" cy="-1.4" r=".6" fill="#fbe5a2"/>',
  leaves:
    '<path d="M-9.5 -1C-9.5 -8.5 -2 -10.5 0 -5.5C-1 -2 -5 0 -9.5 -1Z" fill="#6ba844"/><path d="M9.5 -1C9.5 -9.5 2 -11.5 0 -6.5C1 -2 5 0 9.5 -1Z" fill="#7dbb51"/><path d="M-4 -1C-3 -10.5 4 -12.5 5 -6.5C4 -2 0 0 -4 -1Z" fill="#5c9a39"/>',
  avocado:
    '<g transform="rotate(-14)"><path d="M0 -14C5.5 -14 7.5 -6.5 7.5 -2C7.5 2.5 3.5 4.5 0 4.5C-3.5 4.5 -7.5 2.5 -7.5 -2C-7.5 -6.5 -5.5 -14 0 -14Z" fill="#5a8b2e"/><path d="M0 -12C4.2 -12 5.8 -6.5 5.8 -2C5.8 1.2 2.8 2.8 0 2.8C-2.8 2.8 -5.8 1.2 -5.8 -2C-5.8 -6.5 -4.2 -12 0 -12Z" fill="#d1e290"/><circle cx="0" cy="-2.2" r="3.1" fill="#99602f"/></g>',
  cheese:
    '<path d="M-5.5 -6.5L1 -9.6L7.5 -6.5L1 -3.4Z" fill="#fff9e4"/><path d="M-5.5 -6.5L1 -3.4L1 3L-5.5 -.1Z" fill="#f3e4b6"/><path d="M1 -3.4L7.5 -6.5L7.5 -.1L1 3Z" fill="#e8d59d"/>',
  chickpeas:
    '<circle cx="-3.2" cy="-2.4" r="2.6" fill="#e2c07c"/><circle cx="2.2" cy="-2.7" r="2.6" fill="#d9b169"/><circle cx="-.6" cy="-6" r="2.6" fill="#e9ca8b"/><circle cx="4.8" cy="-5.6" r="2.3" fill="#e2c07c"/><circle cx="-5.2" cy="-5.8" r="2.1" fill="#d9b169"/>',
  bacon:
    '<path d="M-11 -3.5C-7 -8 -3.5 1 1 -3.5C5 -8 8.5 1 12 -3.5L12 0C8.5 4.5 5 -4.5 1 0C-3.5 4.5 -7 -4.5 -11 0Z" fill="#c4503a"/><path d="M-11 -1.8C-7 -6.3 -3.5 2.7 1 -1.8C5 -6.3 8.5 2.7 12 -1.8" fill="none" stroke="#f4c6aa" stroke-width="1"/>',
  lemon:
    '<path d="M-5.5 0A5.5 5.5 0 0 1 5.5 0Z" fill="#f1cd3c"/><path d="M-4 -.4A4 4 0 0 1 4 -.4Z" fill="#fbe88c"/><path d="M0 -.4V-3.9M-2.6 -.8L-1.1 -3.2M2.6 -.8L1.1 -3.2" stroke="#f1cd3c" stroke-width=".8"/>',
  carrot:
    '<rect x="-7" y="-4.4" width="11" height="2.4" rx="1.2" fill="#ee8a2e" transform="rotate(-10)"/><rect x="-4" y="-1.8" width="11" height="2.4" rx="1.2" fill="#f39a41" transform="rotate(8)"/>',
};

// What is on the plate for each way of eating. [food, x, y] around the plate centre.
const DISH = {
  all: [
    ['rice', -15, -2],
    ['drumstick', 7, -2],
    ['broccoli', -3, 5],
    ['tomato', 17, 4],
  ],
  pescatarian: [
    ['rice', -15, -2],
    ['fish', 7, -2],
    ['leaves', -3, 5],
    ['lemon', 18, 4],
  ],
  veggie: [
    ['rice', -15, -2],
    ['egg', 7, -2],
    ['tomato', -4, 5],
    ['cheese', 15, 5],
  ],
  vegan: [
    ['rice', -15, -2],
    ['chickpeas', 7, -2],
    ['leaves', -3, 5],
    ['avocado', 17, 5],
  ],
  keto: [
    ['avocado', -15, 1],
    ['egg', 5, -2],
    ['leaves', -4, 5],
    ['bacon', 15, 5],
  ],
};
const CARBS = new Set(['rice']);

function plate(r, color = '#fffdf8') {
  const ry = r * 0.3;
  return `<ellipse cy="2" rx="${f1(r + 1.5)}" ry="${f1(ry + 1.5)}" fill="#3c230f" opacity=".14"/><ellipse rx="${r}" ry="${f1(ry)}" fill="${color}"/><ellipse rx="${f1(r * 0.74)}" ry="${f1(ry * 0.74)}" fill="#efe8dc"/>`;
}

/** Plate with food for a way of eating. Food scale shows a calorie cap. */
export function dishSVG({ diet = 'all', divided = false, lowcarb = false, flag = '' } = {}) {
  let food = (DISH[diet] || DISH.all).map((x) => x.slice());
  if (lowcarb) food = food.map((x) => (CARBS.has(x[0]) ? ['broccoli', x[1], x[2]] : x));
  let parts = plate(44);
  if (divided) {
    // A plate with walls keeps foods apart: calmer for sensory-sensitive eaters.
    parts += `<path d="M0 1L0 -12.5M0 1L-31 9M0 1L31 9" stroke="#e3d9c9" stroke-width="2.6" stroke-linecap="round"/>`;
    food = [
      [food[0][0], -15, -3],
      [food[1][0], 15, -3],
      [food[2][0], -4, 8],
      [food[3][0], 9, 8],
    ];
  }
  const ordered = food.slice().sort((a, b) => a[2] - b[2]);
  parts += `<g class="t-food"><g transform="scale(1.45)">${ordered.map(([k, x, y]) => `<g transform="translate(${x} ${y})">${FOOD[k]}</g>`).join('')}</g></g>`;
  if (flag) {
    const w = Math.round(flag.length * 4.6 + 12);
    parts += `<g class="t-flag" transform="translate(6 -6)"><path d="M0 0V-31" stroke="#8a5a32" stroke-width="1.4" stroke-linecap="round"/><path d="M0 -31H${w}L${w - 4} -24.5L${w} -18H0Z" fill="#fffdf8" stroke="#013c26" stroke-width="1.2" stroke-linejoin="round"/><text x="${(w - 4) / 2}" y="-21.6" text-anchor="middle" font-size="7.6" font-weight="700" fill="#013c26">${flag}</text></g>`;
  }
  return parts;
}

const PROPS = {
  hat: `<g transform="rotate(-14)"><ellipse cy="1.5" rx="17" ry="4" fill="#3c230f" opacity=".16"/><g fill="#ddd0bd" stroke="#ddd0bd" stroke-width="2.6" stroke-linejoin="round"><rect x="-13" y="-14" width="26" height="13" rx="2.5"/><circle cx="-10" cy="-24" r="10"/><circle cx="9" cy="-25" r="10.5"/><circle cx="0" cy="-31" r="11.5"/><path d="M-19.5 -22C-17 -13 17 -13 19.5 -22L13 -14H-13Z"/></g><g fill="#fffdf9"><rect x="-13" y="-14" width="26" height="13" rx="2.5"/><circle cx="-10" cy="-24" r="10"/><circle cx="9" cy="-25" r="10.5"/><circle cx="0" cy="-31" r="11.5"/><path d="M-19.5 -22C-17 -13 17 -13 19.5 -22L13 -14H-13Z"/></g><rect x="-13" y="-14" width="26" height="13" rx="2.5" fill="#f5efe5"/><path d="M-13 -9.5H13" stroke="#e2d6c4" stroke-width="1.2"/><path d="M-12 -27C-10 -31 -5 -33 -1 -32" fill="none" stroke="#efe6d8" stroke-width="1.4" stroke-linecap="round"/><path d="M4 -36C7 -37 11 -35 12 -32" fill="none" stroke="#efe6d8" stroke-width="1.4" stroke-linecap="round"/></g>`,
  kid: `<ellipse cy="1.5" rx="15" ry="4" fill="#3c230f" opacity=".14"/><path d="M-14 -9C-14 0 -7 3 0 3C7 3 14 0 14 -9Z" fill="#fbd36b"/><ellipse cy="-9" rx="14" ry="3.6" fill="#ffe7a3"/><ellipse cy="-9" rx="10.5" ry="2.4" fill="#f6efe0"/><circle cx="-4.5" cy="-4.4" r="1.6" fill="#3a2316"/><circle cx="4.5" cy="-4.4" r="1.6" fill="#3a2316"/><path d="M-4.2 -1.3Q0 1.6 4.2 -1.3" fill="none" stroke="#3a2316" stroke-width="1.4" stroke-linecap="round"/>`,
  notepad: `<ellipse cy="1.5" rx="20" ry="4" fill="#3c230f" opacity=".14"/><g transform="rotate(-4)"><rect x="-17" y="-46" width="34" height="46" rx="2.5" fill="#fffdf8"/><rect x="-17" y="-46" width="34" height="46" rx="2.5" fill="none" stroke="#e7dfd2"/><rect x="-8" y="-49" width="16" height="6" rx="2" fill="#4b5157"/>${[0, 1, 2, 3]
    .map(
      (i) =>
        `<g class="t-row" style="--i:${i}" transform="translate(0 ${-36 + i * 9})"><path d="M-12 0L-10 2L-6.5 -2" fill="none" stroke="#1f7a4c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="-3" y="-1.2" width="${[15, 11, 13, 9][i]}" height="2.4" rx="1.2" fill="#d8d1c4"/></g>`,
    )
    .join('')}</g>`,
  coins: (n) =>
    `<ellipse cy="1.5" rx="11" ry="3" fill="#3c230f" opacity=".14"/>${Array.from(
      { length: n },
      (_, i) =>
        `<g transform="translate(0 ${-i * 3.1})"><path d="M-9 0V2.4A9 3 0 0 0 9 2.4V0" fill="#d8a127"/><ellipse rx="9" ry="3" fill="#f2c14e"/><ellipse rx="5.6" ry="1.7" fill="none" stroke="#dba52f" stroke-width=".9"/></g>`,
    ).join('')}`,
  timer: (minutes) => {
    const angle = Math.round((Math.min(60, minutes) / 60) * 360);
    return `<ellipse cy="1.5" rx="13" ry="3.4" fill="#3c230f" opacity=".14"/><circle cy="-11" r="11.5" fill="#e2482f"/><ellipse cx="-3.5" cy="-15" rx="4" ry="2.6" fill="#fff" opacity=".28"/><path d="M0 -22.5L-4 -26.5L-1 -25L0 -28.5L1 -25L4 -26.5Z" fill="#4f8f35"/><circle cy="-11" r="6.4" fill="#fff7f1" opacity=".95"/><g transform="translate(0 -11) rotate(${angle})"><path d="M0 0V-5.4" stroke="#b5321c" stroke-width="1.6" stroke-linecap="round"/></g><circle cy="-11" r="1.2" fill="#b5321c"/>`;
  },
  cloche: `<g class="t-cloche-dish"></g><g class="t-dome"><path d="M-33 -2C-33 -33 33 -33 33 -2Z" fill="url(#UID-silver)"/><path d="M-24 -10C-22 -21 -14 -26 -6 -28" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.6" stroke-linecap="round"/><ellipse cy="-1.5" rx="34.5" ry="4.2" fill="#c3cad0"/><circle cy="-31.5" r="4.2" fill="#c3cad0"/><circle cx="-1.2" cy="-32.6" r="1.6" fill="#fff" opacity=".8"/></g>`,
};

function bag(color, second) {
  return `<ellipse cy="1.5" rx="11" ry="3" fill="#3c230f" opacity=".14"/><path d="M-9.5 0L9.5 0L8.4 -21L-8.4 -21Z" fill="#e6c193"/><path d="M3 0L9.5 0L8.4 -21L2.6 -21Z" fill="#d7ab76"/><path d="M-8.4 -21L8.4 -21L7.6 -24L-7.6 -24Z" fill="#d3a46c"/><path d="M-4 -22C-4 -30 4 -30 4 -22" fill="none" stroke="#a8784a" stroke-width="1.5" stroke-linecap="round"/><path d="M-9 -13L9 -13L8.7 -7L-9.2 -7Z" fill="${color}"/>${second ? `<path d="M-9.1 -9.6L8.8 -9.6L8.8 -8.2L-9.2 -8.2Z" fill="${second}"/>` : ''}`;
}
// Store colours only, never the logos: the bags hint at the chains without imitating them.
export const STORE_COLORS = {
  Lidl: ['#0b4ea2', '#ffe12b'],
  Kaufland: ['#e2171d', ''],
  BILLA: ['#ffe12b', '#e2171d'],
  METRO: ['#0a3d7c', '#ffe12b'],
  Фантастико: ['#e2171d', '#ffffff'],
  'T MARKET': ['#d9261c', '#f2a20c'],
};

const APPLIANCES = {
  hob: `<ellipse cy="2" rx="25" ry="4.4" fill="#3c230f" opacity=".14"/><path d="M-21 -6L21 -6L25 1L-25 1Z" fill="#30363b"/><path d="M-25 1H25V4H-25Z" fill="#1d2125"/><ellipse class="t-burner" cx="-10" cy="-2.6" rx="7.5" ry="2" fill="none" stroke="#ff7a45" stroke-width="1.6"/><ellipse class="t-burner" cx="10" cy="-2.6" rx="7.5" ry="2" fill="none" stroke="#ff7a45" stroke-width="1.6"/>`,
  oven: `<ellipse cy="2" rx="24" ry="4.2" fill="#3c230f" opacity=".14"/><path d="M-21 -32L-17 -36L25 -36L21 -32Z" fill="#f4f6f7"/><path d="M21 -32L25 -36L25 -4L21 0Z" fill="#c4cad0"/><rect x="-21" y="-32" width="42" height="32" rx="2.5" fill="#e4e8eb"/><rect x="-17" y="-25" width="27" height="19" rx="2.4" fill="#33393f"/><rect x="-14" y="-21" width="21" height="12" rx="1.6" fill="#ff9b47" opacity=".55"/><rect x="-17" y="-29" width="27" height="1.8" rx=".9" fill="#8b9198"/><circle cx="15.5" cy="-22" r="2.2" fill="#8b9198"/><circle cx="15.5" cy="-14" r="2.2" fill="#8b9198"/>`,
  microwave: `<ellipse cy="2" rx="25" ry="4.2" fill="#3c230f" opacity=".14"/><path d="M-23 -25L-19 -29L27 -29L23 -25Z" fill="#f1f3f5"/><path d="M23 -25L27 -29L27 -4L23 0Z" fill="#bfc6cc"/><rect x="-23" y="-25" width="46" height="25" rx="2.5" fill="#dde2e6"/><rect x="-19" y="-21" width="28" height="17" rx="2.2" fill="#2f353a"/><rect x="-16" y="-18" width="16" height="3" rx="1.5" fill="#fff" opacity=".18"/><rect x="12" y="-21" width="8" height="17" rx="1.4" fill="#c9cfd5"/><circle cx="16" cy="-16" r="1.4" fill="#6b7279"/><circle cx="16" cy="-11" r="1.4" fill="#6b7279"/><rect x="13.5" y="-8" width="5" height="1.6" rx=".8" fill="#5fcf8c"/>`,
  airfryer: `<ellipse cy="2" rx="16" ry="3.8" fill="#3c230f" opacity=".14"/><path d="M-13 0C-15.5 -11 -15.5 -27 -11 -33C-6.5 -38.5 6.5 -38.5 11 -33C15.5 -27 15.5 -11 13 0Z" fill="#2b3035"/><path d="M-13.6 -14H13.6C13.4 -8 13.2 -4 13 0H-13C-13.2 -4 -13.4 -8 -13.6 -14Z" fill="#3b4147"/><rect x="-5.5" y="-10" width="11" height="3.2" rx="1.6" fill="#626a72"/><rect x="-5" y="-30" width="10" height="5" rx="1.6" fill="#1b1f22"/><rect x="-3.4" y="-28.6" width="6.8" height="2.2" rx=".8" fill="#6fe39b"/><path d="M-9 -34C-5 -36.6 5 -36.6 9 -34" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.4"/>`,
};

const ALLERGEN_ART = {
  gluten: `<path d="M-9 -2C-11 -12 -6 -17 0 -17C6 -17 11 -12 9 -2Z" fill="#d79f57"/><path d="M-6.6 -3.5C-8 -11 -4.5 -14.4 0 -14.4C4.5 -14.4 8 -11 6.6 -3.5Z" fill="#f2d7a6"/>`,
  dairy: `<path d="M-6 0V-14L-3 -19H3L6 -14V0Z" fill="#f7f9fb"/><path d="M-6 -14L-3 -19H3L6 -14Z" fill="#4f86c6"/><rect x="-6" y="-11" width="12" height="5" fill="#4f86c6"/>`,
  egg: `<ellipse cy="-8" rx="6.4" ry="8.2" fill="#f6ead6"/><ellipse cx="-2" cy="-11" rx="2" ry="2.8" fill="#fff" opacity=".7"/>`,
  fish: `<path d="M-11 -6C-6 -13 6 -13 9 -6C6 1 -6 1 -11 -6Z" fill="#7aa3c4"/><path d="M8 -6L14 -11L14 -1Z" fill="#5f8bae"/><circle cx="-6" cy="-7" r="1.1" fill="#21313d"/>`,
  nuts: `<ellipse cx="-3" cy="-6" rx="5.6" ry="6.4" fill="#b87a42"/><ellipse cx="3.6" cy="-7" rx="5.2" ry="6" fill="#c98b4f"/><path d="M-3 -11V-1M3.6 -12V-2" stroke="#8d5a2c" stroke-width="1"/>`,
  soy: `<path d="M-11 -4C-9 -12 9 -12 11 -6C9 -2 -9 2 -11 -4Z" fill="#9bc65d"/><circle cx="-5" cy="-6" r="2.5" fill="#b9da7c"/><circle cx="0.6" cy="-7" r="2.5" fill="#b9da7c"/><circle cx="6" cy="-6.6" r="2.3" fill="#b9da7c"/>`,
  shellfish: `<path d="M-9 -3C-11 -10 -4 -16 3 -14C8 -12 10 -7 7 -3" fill="none" stroke="#f08159" stroke-width="5" stroke-linecap="round"/><path d="M7 -3L11 0L5 1Z" fill="#f08159"/><circle cx="2" cy="-12" r="1" fill="#3a2316"/>`,
  sesame: `<path d="M-11 -2C-11 -12 -5 -16 0 -16C5 -16 11 -12 11 -2Z" fill="#e2a85e"/>${[
    [-5, -9],
    [0, -12],
    [5, -8],
    [-1, -6],
    [6, -12.5],
    [-6.5, -4.5],
  ]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.1" ry=".7" fill="#fff6e0"/>`)
    .join('')}`,
};
const ALLERGEN_SPOTS = [
  [40, 246],
  [280, 246],
  [14, 232],
  [306, 232],
  [64, 258],
  [256, 258],
  [10, 258],
  [310, 258],
];

/* ---------- small pictures for the controls: what you tap is what lands on the table ---------- */

const miniPlate =
  '<ellipse cy="2.2" rx="20.5" ry="6.6" fill="#3c230f" opacity=".12"/><ellipse rx="19" ry="6" fill="#fffdf8" stroke="#e7d6bf" stroke-width=".8"/><ellipse rx="13.5" ry="4.2" fill="#f1e9dc"/>';
const placeFood = (items) =>
  items.map(([k, x, y]) => `<g transform="translate(${x} ${y})">${FOOD[k]}</g>`).join('');
const DIET_PICT = {
  all: [
    ['drumstick', -5, -1],
    ['broccoli', 9, 2],
  ],
  pescatarian: [
    ['fish', -3, -1],
    ['lemon', 11, 2],
  ],
  veggie: [
    ['egg', -4, -1],
    ['tomato', 10, 2],
  ],
  vegan: [
    ['avocado', -6, 1],
    ['leaves', 8, 2],
  ],
  keto: [
    ['avocado', -8, 1],
    ['bacon', 7, 2],
  ],
};
const GOAL_PICT = {
  balanced: [
    ['rice', -8, -1],
    ['drumstick', 6, -1],
    ['tomato', 1, 3],
  ],
  protein: [
    ['drumstick', -5, -1],
    ['egg', 9, 1],
  ],
  light: [
    ['leaves', -4, 0],
    ['tomato', 9, 2],
  ],
};
const PICTS = {
  diet: (k) => DIET_PICT[k] && { vb: '-23 -20 46 30', svg: miniPlate + placeFood(DIET_PICT[k]) },
  goal: (k) =>
    k === 'quick'
      ? { vb: '-16 -27 32 31', svg: PROPS.timer(30) }
      : GOAL_PICT[k] && { vb: '-23 -20 46 30', svg: miniPlate + placeFood(GOAL_PICT[k]) },
  appliance: (k) => APPLIANCES[k] && { vb: '-29 -40 59 46', svg: APPLIANCES[k] },
  allergen: (k) => ALLERGEN_ART[k] && { vb: '-15 -21 30 25', svg: ALLERGEN_ART[k] },
};
/** A small standalone picture of something that can sit on the table. */
export function pictogram(kind, key, { size = 44 } = {}) {
  const art = PICTS[kind]?.(key);
  if (!art) return '';
  return `<svg class="pict" viewBox="${art.vb}" width="${size}" height="${size}" aria-hidden="true" focusable="false">${art.svg}</svg>`;
}

const FLAGS = { protein: '≥ 25 г протеин', light: 'до 500 ккал', quick: 'до 30 мин' };
export const goalFlag = (goal) => FLAGS[goal] || '';
// Plates for each person around the table, in a ring, drawn back to front.
export function seatPositions(n) {
  const count = Math.max(0, Math.min(12, n | 0));
  const seats = [];
  for (let i = 0; i < count; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / count + (count % 2 ? 0 : Math.PI / count);
    seats.push(onTop(Math.cos(a) * 0.74, Math.sin(a) * 0.62));
  }
  return seats;
}
const seat = (r) =>
  `${plate(r)}<path d="M${f1(r + 4)} -1.4L${f1(r + 9)} -3" stroke="#a8aeb4" stroke-width="1.4" stroke-linecap="round"/>`;

/**
 * Items for a scene. Each item: { key, x, y, svg, sig?, vars? }.
 * Keys stay stable between scenes so the same plate is moved, not redrawn.
 */
export function sceneItems(scene, uid = 't') {
  const top = [],
    floor = [],
    fx = [],
    cloth = [];
  const add = (key, [x, y], svg, extra = {}) =>
    top.push({ key, x, y, ...extra, svg: extra.s ? `<g transform="scale(${extra.s})">${svg}</g>` : svg });
  if (scene.hat) add('hat', onTop(-0.6, -0.36), PROPS.hat, { s: 1.5 });
  const bags = (scene.bags || []).filter((s) => STORE_COLORS[s]);
  bags.forEach((store, i) => {
    const [from, to] = scene.hat ? [-0.14, 0.62] : [-0.6, 0.6];
    const u = bags.length === 1 ? (from + to) / 2 : from + ((to - from) * i) / (bags.length - 1);
    add(`bag:${store}`, onTop(u, i % 2 ? 0.2 : -0.16), bag(...STORE_COLORS[store]), { s: 1.6 });
  });
  if (scene.dish) {
    const d = scene.dish;
    add('dish', onTop(scene.kid ? 0.12 : 0, 0.12), dishSVG(d), {
      sig: [d.diet, d.divided, d.lowcarb, d.flag].join('|'),
      vars: { '--s': d.scale ?? 1 },
    });
  }
  if (scene.kid) add('kid', onTop(-0.56, 0.22), PROPS.kid, { s: 1.35 });
  (scene.appliances || []).forEach((k, i, all) => {
    if (!APPLIANCES[k]) return;
    const u = all.length === 1 ? 0 : -0.6 + (1.2 * i) / (all.length - 1);
    add(`appl:${k}`, onTop(u, i % 2 ? 0.2 : -0.18), APPLIANCES[k], { s: 1.3 });
  });
  if (scene.timer > 0)
    add('timer', onTop(0.74, 0.5), PROPS.timer(scene.timer), { sig: String(scene.timer), s: 1.35 });
  if (scene.coins > 0)
    add('coins', onTop(0.8, 0.5), PROPS.coins(scene.coins), { sig: String(scene.coins), s: 1.4 });
  seatPositions(scene.plates || 0).forEach(([x, y], i) => {
    const r = scene.plates > 8 ? 11 : scene.plates > 4 ? 13 : 16;
    add(`seat:${i}`, [x, y], seat(r), { sig: String(r) });
  });
  const week = Math.min(7, scene.week || 0);
  for (let i = 0; i < week; i++) {
    const u = week === 1 ? 0 : -0.66 + (1.32 * i) / (week - 1);
    const day = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'][i];
    add(
      `week:${i}`,
      onTop(u, 0.08),
      `${plate(14)}<g transform="translate(0 -2)"><circle cx="-3" cy="-1" r="2.6" fill="${['#e04a32', '#6ba844', '#f2c14e', '#c46f35', '#ef8f6d', '#5a8b2e', '#e2a85e'][i]}"/><circle cx="3" cy="-1.5" r="2.2" fill="#f7f0e0"/></g><g transform="translate(0 9)"><path d="M-8 0L-6 -9H6L8 0Z" fill="#fffdf8" stroke="#e5dccd" stroke-width=".8"/><text y="-2.4" text-anchor="middle" font-size="6.4" font-weight="700" fill="#013c26">${day}</text></g>`,
      { vars: { '--d': `${i * 110}ms` }, s: 1.25 },
    );
  }
  if (scene.notepad) add('notepad', onTop(scene.week ? 0.62 : 0.12, -0.16), PROPS.notepad, { s: 1.3 });
  if (scene.cloche) {
    const dish = scene.dish ? '' : dishSVG(scene.revealed || {});
    add('cloche', onTop(0, 0.14), PROPS.cloche.replace('<g class="t-cloche-dish"></g>', `<g class="t-cloche-dish">${dish}</g>`).replace('UID', uid), { sig: JSON.stringify(scene.revealed || {}) });
  }
  top.sort((a, b) => a.y - b.y);
  (scene.floor || []).forEach((k, i) => {
    if (!ALLERGEN_ART[k]) return;
    const [x, y] = ALLERGEN_SPOTS[i % ALLERGEN_SPOTS.length];
    floor.push({
      key: `floor:${k}`,
      x,
      y: y - 6,
      vars: { '--fx': x < 160 ? '86px' : '-86px' },
      svg: `<g transform="scale(1.55)"><ellipse cy="1.5" rx="10" ry="2.6" fill="#3c230f" opacity=".12"/><g class="t-fallen">${ALLERGEN_ART[k]}</g><g transform="translate(9 -17)"><circle r="5.6" fill="#fff"/><circle r="4.5" fill="none" stroke="#c8352a" stroke-width="1.7"/><path d="M-3.1 3.1L3.1 -3.1" stroke="#c8352a" stroke-width="1.7"/></g></g>`,
    });
  });
  if (scene.cloth)
    cloth.push({
      key: 'cloth',
      x: 0,
      y: 0,
      svg: `<ellipse cx="${TOP.cx}" cy="${TOP.cy - 1}" rx="${TOP.rx + 5}" ry="${TOP.ry + 2}" fill="url(#${uid}-ging)"/><path d="M${TOP.cx - TOP.rx - 5} ${TOP.cy - 1}L${TOP.cx - TOP.rx - 4} ${TOP.cy + 14}C${TOP.cx - 80} ${TOP.cy + 44} ${TOP.cx + 80} ${TOP.cy + 44} ${TOP.cx + TOP.rx + 4} ${TOP.cy + 14}L${TOP.cx + TOP.rx + 5} ${TOP.cy - 1}A${TOP.rx + 5} ${TOP.ry + 2} 0 0 1 ${TOP.cx - TOP.rx - 5} ${TOP.cy - 1}Z" fill="url(#${uid}-ging)"/><path d="M${TOP.cx - TOP.rx - 4} ${TOP.cy + 14}C${TOP.cx - 80} ${TOP.cy + 44} ${TOP.cx + 80} ${TOP.cy + 44} ${TOP.cx + TOP.rx + 4} ${TOP.cy + 14}" fill="none" stroke="#b8392c" stroke-opacity=".35" stroke-width="1.6"/>`,
    });
  if (scene.fx === 'zzz')
    fx.push({
      key: 'zzz',
      x: 204,
      y: 142,
      svg: ['z', 'z', 'Z']
        .map((z, i) => `<text class="t-z" style="--i:${i}" x="${i * 9}" y="${-i * 12}" font-size="${11 + i * 4}" font-weight="700" fill="#8a5a32">${z}</text>`)
        .join(''),
    });
  if (scene.fx === 'confetti')
    fx.push({
      key: 'confetti',
      x: 0,
      y: 0,
      svg: Array.from({ length: 18 }, (_, i) => {
        const x = 40 + ((i * 53) % 240),
          y = 8 + ((i * 29) % 46),
          c = ['#1f6b45', '#e9a868', '#df4b3b', '#f2c14e', '#7dbb51'][i % 5];
        return i % 3
          ? `<rect class="t-bit" style="--i:${i}" x="${x}" y="${y}" width="4" height="8" rx="1.4" fill="${c}"/>`
          : `<circle class="t-bit" style="--i:${i}" cx="${x}" cy="${y}" r="3" fill="${c}"/>`;
      }).join(''),
    });
  if (scene.fx === 'steam')
    fx.push({
      key: 'steam',
      x: 160,
      y: 96,
      svg: [-12, 0, 12]
        .map((x, i) => `<path class="t-steam" style="--i:${i}" d="M${x} 0C${x - 5} -7 ${x + 5} -12 ${x} -20" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`)
        .join(''),
    });
  return { top, floor, fx, cloth };
}

/* ---------- DOM: mount, update, react ---------- */

const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function itemMarkup(item, fresh) {
  const style = [`transform:translate(${f1(item.x)}px,${f1(item.y)}px)`]
    .concat(Object.entries(item.vars || {}).map(([k, v]) => `${k}:${v}`))
    .join(';');
  return `<g class="t-item${fresh ? ' is-new' : ''}" data-key="${item.key}" data-sig="${item.sig ?? ''}" style="${style}"><g class="t-item-in">${item.svg}</g></g>`;
}
function layerMarkup(list) {
  return list.map((item) => itemMarkup(item, false)).join('');
}
function itemNode(doc, item) {
  const tpl = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  tpl.innerHTML = itemMarkup(item, true);
  return tpl.firstElementChild;
}

function setLayer(svg, name, items) {
  const layer = svg.querySelector(`[data-layer="${name}"]`);
  if (!layer) return;
  const doc = svg.ownerDocument;
  const live = new Map();
  for (const node of [...layer.children])
    if (!node.classList.contains('is-leaving')) live.set(node.getAttribute('data-key'), node);
  let cursor = null;
  for (const item of items) {
    let node = live.get(item.key);
    if (node && node.getAttribute('data-sig') !== String(item.sig ?? '')) {
      node.remove();
      node = null;
    }
    if (node) {
      live.delete(item.key);
      node.style.transform = `translate(${f1(item.x)}px,${f1(item.y)}px)`;
      for (const [k, v] of Object.entries(item.vars || {})) node.style.setProperty(k, String(v));
    } else {
      node = itemNode(doc, item);
      if (reduced()) node.classList.remove('is-new');
      else setTimeout(() => node.classList.remove('is-new'), 900);
    }
    const expected = cursor ? cursor.nextSibling : layer.firstChild;
    if (node !== expected) layer.insertBefore(node, expected);
    cursor = node;
  }
  for (const node of live.values()) {
    if (reduced()) node.remove();
    else {
      node.classList.add('is-leaving');
      setTimeout(() => node.remove(), 420);
    }
  }
}

/** Bring a mounted table to a scene. Unchanged items stay put; new ones drop in. */
export function applyScene(svg, scene = {}) {
  if (!svg) return;
  const uid = svg.getAttribute('data-uid') || 't';
  svg.setAttribute('data-mood', MOODS.includes(scene.mood) ? scene.mood : 'open');
  svg.setAttribute('data-cloche', scene.cloche || '');
  svg.setAttribute('data-dance', scene.dance ? '1' : '');
  const { top, floor, fx, cloth } = sceneItems(scene, uid);
  setLayer(svg, 'top', top);
  setLayer(svg, 'floor', floor);
  setLayer(svg, 'fx', fx);
  setLayer(svg, 'cloth', cloth);
}

const ONE_SHOTS = ['hop', 'shake', 'nod', 'tilt', 'wiggle', 'sparkle'];
/** A short reaction: hop on a choice, shake for "no", tilt to push something off. */
export function react(svg, kind = 'hop') {
  if (!svg || !ONE_SHOTS.includes(kind) || reduced()) return;
  const cls = `is-${kind}`;
  svg.classList.remove(cls);
  svg.getBoundingClientRect?.();
  svg.classList.add(cls);
  clearTimeout(svg._reactTimer);
  svg._reactTimer = setTimeout(() => svg.classList.remove(cls), kind === 'tilt' ? 900 : 700);
}

/** Point the pupils at a screen position (a tapped option or the mouse). */
export function lookAt(svg, x, y) {
  if (!svg?.getBoundingClientRect) return;
  const box = svg.getBoundingClientRect();
  if (!box.width) return;
  const ex = box.left + box.width * 0.5,
    ey = box.top + box.height * 0.63;
  const dx = x - ex,
    dy = y - ey,
    d = Math.max(1, Math.hypot(dx, dy));
  const k = Math.min(1, d / 160);
  svg.style.setProperty('--lx', f1((dx / d) * k));
  svg.style.setProperty('--ly', f1((dy / d) * k));
}

/** Idle life: blinks and the odd glance. Stops by itself once the table leaves the page. */
export function startIdle(svg) {
  if (!svg || reduced()) return () => {};
  let stopped = false,
    timer;
  const blink = () => {
    if (stopped || !svg.isConnected) return;
    if (!globalThis.document?.hidden) {
      svg.classList.add('is-blink');
      setTimeout(() => svg.classList.remove('is-blink'), 190);
    }
    timer = setTimeout(blink, 2400 + Math.random() * 3600);
  };
  timer = setTimeout(blink, 1200 + Math.random() * 1500);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
