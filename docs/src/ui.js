// Shared formatting, icons and the dish illustrations.
export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const WEEKDAYS = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
export const SHORT_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
export const dayName = (i) => WEEKDAYS[i % 7];
export const money = (n) =>
  new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' }).format(n);
export const num = (n, d = 0) =>
  new Intl.NumberFormat('bg-BG', { maximumFractionDigits: d }).format(n);
/** "1 рецепта" / "5 рецепти". With `bare`, only the word. */
export const plural = (n, one, many, bare = false) => {
  const word = Math.abs(n) === 1 ? one : many;
  return bare ? word : `${n} ${word}`;
};

// One icon family: 24 px grid, 1.8 px rounded strokes.
const PATHS = {
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9.5 5.5l6.5 6.5-6.5 6.5',
  down: 'M5.5 9.5l6.5 6.5 6.5-6.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.3 4.3L19 7',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5.5M12 7.7v.3',
  search: 'M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15zM16 16l4.5 4.5',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4',
  moon: 'M19.5 14.6A8 8 0 019.4 4.5a8 8 0 1010.1 10.1z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7.5V12l3 2',
  flame:
    'M12 21c3.8 0 6.4-2.6 6.4-6.2 0-3.1-1.9-5.3-3.5-7.1-.3 1.6-1.2 2.7-2.4 3.2.4-2.9-.7-5.7-3.3-7.7.2 3.2-1.6 5.2-3 7.1-1 1.4-.6 3.2-.6 4.5C5.6 18.4 8.2 21 12 21z',
  people:
    'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.8 20c.4-3.5 2.9-5.5 6.2-5.5s5.8 2 6.2 5.5M15.8 4.4a3.5 3.5 0 010 6.3M17.6 14.6c2 .6 3.3 2.4 3.6 5.4',
  menu: 'M4 6.6A2.6 2.6 0 016.6 4h10.8A2.6 2.6 0 0120 6.6v10.8a2.6 2.6 0 01-2.6 2.6H6.6A2.6 2.6 0 014 17.4zM4 9h16M8.5 2.6v3M15.5 2.6v3M12 17.4a2.9 2.9 0 100-5.8 2.9 2.9 0 000 5.8z',
  book: 'M12 6.6C10.4 5.2 7.9 4.6 4 4.6v13c3.9 0 6.4.6 8 2 1.6-1.4 4.1-2 8-2v-13c-3.9 0-6.4.6-8 2zM12 6.6v13',
  bag: 'M5.6 8h12.8l-1 12.4H6.6zM9 8V6.6a3 3 0 016 0V8',
  diary: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 3v9l6.4 6.4',
  more: 'M5.5 12h.01M12 12h.01M18.5 12h.01',
  heart: 'M12 20s-7.6-4.6-7.6-10.2A4.4 4.4 0 0112 7.2a4.4 4.4 0 017.6 2.6C19.6 15.4 12 20 12 20z',
  swap: 'M7 7.5h11.5L15 4M17 16.5H5.5L9 20',
  refresh: 'M19.6 12.6A7.7 7.7 0 1117 6.4M19.5 3.8v4.6h-4.6',
  lock: 'M7.5 10.5V8a4.5 4.5 0 019 0v2.5M5.8 10.5h12.4v9.7H5.8zM12 14.4v2',
  unlock: 'M7.5 10.5V8a4.5 4.5 0 018.7-1.6M5.8 10.5h12.4v9.7H5.8z',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.6h14',
  upload: 'M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.6h14',
  copy: 'M9 9h10.5v10.5H9zM15 9V4.5H4.5V15H9',
  trash: 'M4.5 7h15M10 7V4.5h4V7M6.6 7l1 13h8.8l1-13M10 11v5.5M14 11v5.5',
  edit: 'M14.6 5.4l4 4L8 20H4v-4z',
  scan: 'M4 8V5.6A1.6 1.6 0 015.6 4H8M16 4h2.4A1.6 1.6 0 0120 5.6V8M20 16v2.4a1.6 1.6 0 01-1.6 1.6H16M8 20H5.6A1.6 1.6 0 014 18.4V16M7.5 8.5v7M10.5 8.5v7M13.5 8.5v7M16.5 8.5v7',
  camera:
    'M4 8.6A1.6 1.6 0 015.6 7h2.2l1.4-2h5.6l1.4 2h2.2A1.6 1.6 0 0120 8.6v9a1.6 1.6 0 01-1.6 1.6H5.6A1.6 1.6 0 014 17.6zM12 16.6a3.6 3.6 0 100-7.2 3.6 3.6 0 000 7.2z',
  cart: 'M3 4h2.4l2.3 11h10.6l2-8H6.5M9.6 20.2a1 1 0 100-2 1 1 0 000 2zM17 20.2a1 1 0 100-2 1 1 0 000 2z',
  timer: 'M12 21a8 8 0 100-16 8 8 0 000 16zM12 9v4.5M9.5 2.6h5M18.4 6.1L20 4.5',
  play: 'M8 5.6v12.8L18.4 12z',
  calendar: 'M4.5 6.6A2 2 0 016.5 4.6h11a2 2 0 012 2v11a2 2 0 01-2 2h-11a2 2 0 01-2-2zM4.5 9.6h15M8.5 3v3M15.5 3v3',
  bell: 'M18 15.6V11a6 6 0 10-12 0v4.6L4.5 18h15zM10 20.6a2 2 0 004 0',
  water: 'M12 3.6s-6 6.6-6 10.6a6 6 0 0012 0c0-4-6-10.6-6-10.6z',
  weight: 'M5.6 4h12.8A1.6 1.6 0 0120 5.6v12.8a1.6 1.6 0 01-1.6 1.6H5.6A1.6 1.6 0 014 18.4V5.6A1.6 1.6 0 015.6 4zM8.4 10.2a4.6 4.6 0 017.2 0M12 10.4l1.5-2',
  pin: 'M9 4.5h6l-1 5.2 3 3.1H7l3-3.1zM12 12.8v7',
  sliders: 'M4 7h9.5M17.5 7H20M4 17h3.5M11.5 17H20M15.5 4.6v4.8M9.5 14.6v4.8',
  share: 'M12 3.6v11M8 7.6l4-4 4 4M5.6 12v6.4A1.6 1.6 0 007.2 20h9.6a1.6 1.6 0 001.6-1.6V12',
  star: 'M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.4l-5 2.8 1-5.6-4.1-3.9 5.6-.7z',
  sparkle: 'M12 3.6l1.8 5.2 5.2 1.8-5.2 1.8L12 17.6l-1.8-5.2L5 10.6l5.2-1.8z',
  phone: 'M8 3.6h8a1.6 1.6 0 011.6 1.6v13.6A1.6 1.6 0 0116 20.4H8a1.6 1.6 0 01-1.6-1.6V5.2A1.6 1.6 0 018 3.6zM11 17.4h2',
  shield: 'M12 3.6l7 2.5v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6.1z',
  receipt: 'M6 3.6h12v16.8l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5zM9 8h6M9 12h6M9 16h3',
  fridge: 'M7 3.6h10a1.6 1.6 0 011.6 1.6v13.6a1.6 1.6 0 01-1.6 1.6H7a1.6 1.6 0 01-1.6-1.6V5.2A1.6 1.6 0 017 3.6zM5.4 10h13.2M9 6.6v1.4M9 13v3',
  utensils: 'M7 3.6v7M5 3.6v4a2 2 0 004 0v-4M7 10.6v9.8M16.6 20.4V3.6c-2 1-3 3.5-3 6.5v3h3',
  arrow: 'M5 12h14M13.5 6.5L19 12l-5.5 5.5',
  external: 'M14 4.6h5.4V10M19.4 4.6L11 13M18 14v4.4a1.6 1.6 0 01-1.6 1.6H5.6A1.6 1.6 0 014 18.4V7.6A1.6 1.6 0 015.6 6H10',
  leaf: 'M19.5 4.5C10 4 4.5 9 5 16c0 1.3.4 2.5 1 3.5 1-4 3.5-7 7.5-9-3 2.6-5 5.5-5.7 9.3C17 20 20 13 19.5 4.5z',
};
const FILLED = new Set(['heart', 'star', 'play', 'sparkle']);
export const icon = (name, size = 20, filled = false) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled && FILLED.has(name) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${name === 'more' ? 2.8 : 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${PATHS[name] || PATHS.info}"/></svg>`;

// Kept for modules prepared for a future account (not shown in the local edition).
export const button = (text, action, attrs = '', kind = 'btn') =>
  `<button type="button" class="${kind}" data-action="${action}" ${attrs}>${text}</button>`;
export const field = (label, name, value, type = 'text', extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;

/* ---------- dish illustrations ----------
   A top-down plate drawn from the recipe's own ingredients: soups and stews go in a bowl,
   salads become leaves and chunks, pasta gets strands, everything else a main with a side.
   Deterministic per recipe and never presented as a photo. */

const SOUP = /супа|чорба|таратор|яхния|чили|къри|гювеч|леща|боб |боб$|нахут с|червена леща/i;
const SALAD = /салата|шопска/i;
const PASTA = /паста|спагети|фиде|болонезе/i;

const PROTEIN = [
  [['chicken', 'chickenthigh', 'turkey'], 'poultry'],
  [['salmon'], 'salmon'],
  [['fish', 'mackerel', 'hake', 'tuna'], 'fish'],
  [['shrimp'], 'shrimp'],
  [['beef', 'pork', 'bacon'], 'meat'],
  [['mince'], 'mince'],
  [['egg'], 'egg'],
  [['tofu'], 'tofu'],
  [['cheese', 'kashkaval', 'mozzarella', 'cottage', 'parmesan'], 'cheese'],
  [['lentil', 'redlentil', 'bean', 'redbean', 'chickpea'], 'legume'],
];
const VEG_COLORS = {
  broccoli: '#4f8f35',
  cauliflower: '#f1ead8',
  greenbeans: '#5f9c3a',
  peas: '#86bd4c',
  carrot: '#ee8a2f',
  zucchini: '#8fb85a',
  eggplant: '#6b3f6e',
  pepper: '#e0662f',
  tomato: '#e04a32',
  spinach: '#3f7a35',
  mushroom: '#b08a68',
  cabbage: '#c5dc96',
  leek: '#cfe3a7',
  corn: '#f2c84b',
  beet: '#8e2846',
  cucumber: '#9cc76a',
  avocado: '#8fb74f',
  lettuce: '#8cc36a',
  rocket: '#5c9a3c',
  olives: '#3d3a2c',
  onion: '#efe0c6',
  sweetpotato: '#ee9a52',
};
const hashOf = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
function rng(seed) {
  let a = seed >>> 0;
  return () => ((a = (a * 1103515245 + 12345) >>> 0) % 10000) / 10000;
}
const has = (r, ...keys) => keys.some((k) => r.ing[k]);
const f1 = (n) => Math.round(n * 10) / 10;

function proteinOf(r) {
  let best = null,
    weight = 0;
  for (const [keys, kind] of PROTEIN)
    for (const k of keys) {
      const w = (r.ing[k] || 0) * (k === 'egg' ? 60 : 1);
      if (w > weight) {
        weight = w;
        best = kind;
      }
    }
  return best;
}
function vegOf(r, limit = 3) {
  return Object.entries(r.ing)
    .filter(([k]) => VEG_COLORS[k] && k !== 'onion')
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
const i0 = (c) => c;
function brothOf(r) {
  if (has(r, 'yogurt') && has(r, 'cucumber')) return '#eef0e2';
  if (has(r, 'broccoli') && /крем/i.test(r.name)) return '#94bd5f';
  if (has(r, 'redlentil')) return '#e08a3c';
  if (has(r, 'lentil')) return '#b06d38';
  if (has(r, 'coconutmilk', 'curry')) return '#e6b146';
  if (has(r, 'redbean') || /чили/i.test(r.name)) return '#a8432c';
  if (has(r, 'bean')) return '#c9824f';
  if (/пилешка/i.test(r.name)) return '#f0d38a';
  if (has(r, 'fish', 'hake', 'mackerel')) return '#e9a35b';
  if (has(r, 'canned', 'tomatopaste', 'tomato')) return '#c9553a';
  return '#d89a5a';
}
function sauceOf(r) {
  if (has(r, 'cream', 'milk', 'butter') && !has(r, 'canned')) return '#f3e7c6';
  if (has(r, 'avocado', 'spinach', 'rocket')) return '#a7c86a';
  if (has(r, 'canned', 'tomato', 'tomatopaste', 'redlentil')) return '#cf4e33';
  return '#f2dc9a';
}

function baseOf(r) {
  if (has(r, 'canned', 'tomatopaste') || (has(r, 'tomato') && /яхния|гювеч|шакшука|кавърма|мусака|чушки|ориз/i.test(r.name))) return '#d4583a';
  if (has(r, 'cream', 'milk')) return '#f0e3c4';
  if (has(r, 'spinach')) return '#4f8a3a';
  if (has(r, 'zucchini')) return '#a9c46e';
  if (has(r, 'eggplant')) return '#8a5a78';
  if (has(r, 'cabbage')) return '#cddf9f';
  if (has(r, 'mushroom')) return '#bb9c7c';
  if (has(r, 'pepper')) return '#e27a3c';
  if (has(r, 'broccoli', 'cauliflower', 'greenbeans', 'peas')) return '#8fbd5f';
  if (has(r, 'yogurt', 'cottage', 'cheese')) return '#f3ead2';
  return '#e7c38a';
}
function blob(cx, cy, radius, rand, color, points = 9) {
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2,
      rr = radius * (0.86 + rand() * 0.24);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = `M${mid(pts.at(-1), pts[0]).map(f1).join(' ')}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % points]);
    d += `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`;
  });
  return `<path d="${d}Z" fill="${color}"/>`;
}

const leafShape = (x, y, a, s, c) =>
  `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${Math.round(a)}) scale(${f1(s)})" d="M0 -5C3 -3 3 3 0 5C-3 3 -3 -3 0 -5Z" fill="${c}"/>`;

function vegBits(veg, rand, cx, cy, spread, count) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const k = veg[i % veg.length],
      c = VEG_COLORS[k],
      a = rand() * Math.PI * 2,
      d = rand() * spread,
      x = cx + Math.cos(a) * d,
      y = cy + Math.sin(a) * d;
    if (k === 'broccoli')
      out += `<g transform="translate(${f1(x)} ${f1(y)})"><circle r="2.6" fill="#4f8f35"/><circle cx="1.8" cy="-1.2" r="2" fill="#5c9c3e"/><circle cx="-1.6" cy="-1.4" r="1.9" fill="#447f2d"/></g>`;
    else if (k === 'greenbeans' || k === 'leek' || k === 'carrot')
      out += `<rect x="${f1(x - 3.5)}" y="${f1(y - 0.9)}" width="7" height="1.8" rx=".9" fill="${c}" transform="rotate(${Math.round(rand() * 180)} ${f1(x)} ${f1(y)})"/>`;
    else if (k === 'peas' || k === 'corn')
      out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.4" fill="${c}"/><circle cx="${f1(x + 2.4)}" cy="${f1(y + 0.8)}" r="1.4" fill="${c}"/>`;
    else if (k === 'spinach' || k === 'rocket' || k === 'lettuce' || k === 'cabbage')
      out += leafShape(x, y, rand() * 180, 0.8, c);
    else if (k === 'tomato')
      out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#e04a32"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.5" fill="#f07a5e"/>`;
    else out += `<rect x="${f1(x - 1.8)}" y="${f1(y - 1.8)}" width="3.6" height="3.6" rx="1.1" fill="${c}" transform="rotate(${Math.round(rand() * 90)} ${f1(x)} ${f1(y)})"/>`;
  }
  return out;
}

function proteinArt(kind, rand, x, y) {
  switch (kind) {
    case 'poultry':
      return `<g transform="translate(${x} ${y}) rotate(${Math.round(rand() * 30 - 15)})"><path d="M-9 -2C-9 -7 -2 -8 4 -7C9 -6 10 -1 9 3C8 7 0 8 -5 6C-8 5 -9 2 -9 -2Z" fill="#e3ac72"/><path d="M-5 -5L-2 4M0 -6L3 4M4 -5L6 3" stroke="#b9763e" stroke-width="1.3" stroke-linecap="round"/></g>`;
    case 'salmon':
      return `<g transform="translate(${x} ${y}) rotate(${Math.round(rand() * 20 - 10)})"><rect x="-9" y="-5.5" width="18" height="11" rx="3.5" fill="#f0906f"/><path d="M-5 -5.5V5.5M-1 -5.5V5.5M3 -5.5V5.5" stroke="#fbd1c0" stroke-width="1.1"/></g>`;
    case 'fish':
      return `<g transform="translate(${x} ${y}) rotate(${Math.round(rand() * 20 - 10)})"><path d="M-10 0C-6 -6 6 -6 9 0C6 6 -6 6 -10 0Z" fill="#f2e2c8"/><path d="M-10 0C-6 -6 6 -6 9 0" fill="none" stroke="#dcae6a" stroke-width="2"/></g>`;
    case 'shrimp':
      return [0, 1, 2]
        .map((i) => `<path transform="translate(${x + i * 5 - 5} ${y + (i % 2) * 3 - 1})" d="M-3 2C-4.5 -1.5 -1 -4.5 2.5 -3.4C4.5 -2.6 5 0 3.5 1.6" fill="none" stroke="#f39a73" stroke-width="2.6" stroke-linecap="round"/>`)
        .join('');
    case 'meat':
      return `<g transform="translate(${x} ${y}) rotate(${Math.round(rand() * 30 - 15)})"><path d="M-9 -3C-8 -7 2 -8 7 -6C11 -3 9 4 4 6C-2 8 -10 4 -9 -3Z" fill="#9a583a"/><path d="M-6 -4C-2 -6 3 -6 6 -4" fill="none" stroke="#c78a68" stroke-width="1.2"/></g>`;
    case 'mince':
      return [
        [-4, -2],
        [3, -3],
        [0, 3],
        [6, 3],
      ]
        .map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="3.4" fill="#8c4a2f"/><circle cx="${x + dx - 1}" cy="${y + dy - 1}" r="1.2" fill="#b06a48"/>`)
        .join('');
    case 'egg':
      return `<g transform="translate(${x} ${y})"><path d="M-8 -1C-9 -6 -3 -8 1 -7C6 -8 9 -3 7 1C6 6 -6 6 -8 -1Z" fill="#fffdf6"/><circle cx="0" cy="-1" r="3.4" fill="#f4b31a"/></g>`;
    case 'tofu':
      return [
        [-4, -3],
        [3, -2],
        [-1, 3],
      ]
        .map(([dx, dy]) => `<rect x="${x + dx - 2.8}" y="${y + dy - 2.8}" width="5.6" height="5.6" rx="1.2" fill="#f1e2bd" stroke="#d9b170" stroke-width=".9"/>`)
        .join('');
    case 'cheese':
      return [
        [-3, -2],
        [3, -1],
        [0, 3],
      ]
        .map(([dx, dy]) => `<rect x="${x + dx - 2.6}" y="${y + dy - 2.6}" width="5.2" height="5.2" rx="1" fill="#fdf9ec" stroke="#e8dcc0" stroke-width=".8"/>`)
        .join('');
    case 'legume':
      return Array.from({ length: 9 }, () => {
        const a = rand() * Math.PI * 2,
          d = rand() * 6;
        return `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d)}" r="1.6" fill="#c89a5c"/>`;
      }).join('');
    default:
      return '';
  }
}

function sideArt(r, rand, x, y) {
  if (has(r, 'potato', 'sweetpotato')) {
    const c = has(r, 'sweetpotato') ? '#ee9a52' : '#ecc06e';
    if (/пюре/i.test(r.name)) return `<ellipse cx="${x}" cy="${y}" rx="8" ry="6.5" fill="#f4e3b4"/><path d="M${x - 4} ${y - 1}q2 -2 4 0t4 0" fill="none" stroke="#e5cc8c" stroke-width="1"/>`;
    return [0, 1, 2, 3]
      .map((i) => `<path transform="translate(${x + (i % 2) * 6 - 3} ${y + Math.floor(i / 2) * 5 - 3}) rotate(${Math.round(rand() * 160)})" d="M-4 0C-4 -2.6 4 -2.6 4 0C4 1.6 -4 1.6 -4 0Z" fill="${c}" stroke="#c98a3a" stroke-width=".7"/>`)
      .join('');
  }
  if (has(r, 'rice', 'bulgur', 'quinoa', 'buckwheat', 'couscous')) {
    const c = has(r, 'buckwheat') ? '#b48a5e' : has(r, 'bulgur', 'couscous') ? '#e9cf94' : '#f7f1e2';
    let grains = `<ellipse cx="${x}" cy="${y}" rx="8.5" ry="7" fill="${c}"/>`;
    for (let i = 0; i < 8; i++)
      grains += `<rect x="${f1(x - 6 + rand() * 11)}" y="${f1(y - 5 + rand() * 9)}" width="2.2" height="1" rx=".5" fill="#000" opacity=".08" transform="rotate(${Math.round(rand() * 180)} ${x} ${y})"/>`;
    return grains;
  }
  if (has(r, 'bread', 'tortilla', 'phyllo'))
    return `<path transform="translate(${x} ${y}) rotate(-12)" d="M-7 -5C-7 -8 7 -8 7 -5V6H-7Z" fill="#e7b46b"/><path transform="translate(${x} ${y}) rotate(-12)" d="M-5.5 -4C-5.5 -6 5.5 -6 5.5 -4V4.6H-5.5Z" fill="#f6dfae"/>`;
  return '';
}

/** Dish illustration for a recipe. `size` is the rendered square size in px. */
export function foodArt(r, size = 56) {
  const rand = rng(hashOf(r.id));
  const veg = vegOf(r);
  const herb = has(r, 'parsley', 'dill', 'mint', 'greenonion', 'savory');
  let food = '';
  let bowl = false;
  if (SOUP.test(r.name) && !SALAD.test(r.name)) {
    bowl = true;
    const broth = brothOf(r);
    food += `<circle cx="32" cy="32" r="21" fill="${broth}"/><circle cx="29" cy="28" r="12" fill="#fff" opacity=".13"/>`;
    const bits = [...veg, proteinOf(r) === 'poultry' ? 'chicken' : null].filter(Boolean);
    for (let i = 0; i < 7; i++) {
      const a = rand() * Math.PI * 2,
        d = 4 + rand() * 12,
        x = 32 + Math.cos(a) * d,
        y = 32 + Math.sin(a) * d,
        k = bits[i % Math.max(1, bits.length)];
      const c = k === 'chicken' ? '#efd2a4' : VEG_COLORS[k] || '#e7b26a';
      food += `<rect x="${f1(x - 1.9)}" y="${f1(y - 1.9)}" width="3.8" height="3.8" rx="1.2" fill="${c}" transform="rotate(${Math.round(rand() * 90)} ${f1(x)} ${f1(y)})"/>`;
    }
    for (let i = 0; i < 4; i++)
      food += `<circle cx="${f1(22 + rand() * 20)}" cy="${f1(22 + rand() * 20)}" r="${f1(0.9 + rand() * 1.2)}" fill="#fff" opacity=".35"/>`;
  } else if (SALAD.test(r.name)) {
    const greens = has(r, 'rocket') ? '#5c9a3c' : has(r, 'cabbage') ? '#c5dc96' : '#86bf5f';
    food += blob(32, 32, 17, rand, i0(greens));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rand(),
        d = 4 + rand() * 12;
      food += leafShape(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, rand() * 180, 1.9, i % 3 ? greens : '#5f9d3f');
    }
    food += `<g transform="translate(32 32) scale(1.25) translate(-32 -32)">${vegBits(veg.length ? veg : ['tomato'], rand, 32, 32, 11, 9)}</g>`;
    const p = proteinOf(r);
    if (p === 'cheese' || has(r, 'cheese')) food += proteinArt('cheese', rand, 34, 30);
    else if (p) food += proteinArt(p, rand, 34, 31);
  } else if (PASTA.test(r.name) || has(r, 'pasta')) {
    food += `<circle cx="32" cy="32" r="19" fill="${sauceOf(r)}" opacity=".9"/>`;
    for (let i = 0; i < 9; i++) {
      const a = rand() * Math.PI * 2,
        x = 32 + Math.cos(a) * rand() * 9,
        y = 32 + Math.sin(a) * rand() * 9;
      food += `<path d="M${f1(x - 8)} ${f1(y)}c3 -${f1(3 + rand() * 3)} 6 ${f1(3 + rand() * 3)} 9 0s5 -3 7 0" transform="rotate(${Math.round(rand() * 180)} ${f1(x)} ${f1(y)})" fill="none" stroke="#efcd77" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    const p = proteinOf(r);
    if (p && p !== 'cheese' && p !== 'legume') food += proteinArt(p, rand, 36, 34);
    food += vegBits(veg.length ? veg : ['tomato'], rand, 32, 32, 12, 5);
    if (has(r, 'parmesan', 'cheese'))
      for (let i = 0; i < 6; i++) food += `<circle cx="${f1(24 + rand() * 16)}" cy="${f1(24 + rand() * 16)}" r=".9" fill="#fffbe8"/>`;
  } else {
    const p = proteinOf(r);
    const side = sideArt(r, rand, 0, 0);
    food += blob(32, 33, 18.5, rand, baseOf(r));
    food += `<circle cx="28" cy="28" r="9" fill="#fff" opacity=".12"/>`;
    if (side) food += `<g transform="translate(22.5 26) scale(1.25)">${side}</g>`;
    if (p) food += `<g transform="translate(${side ? 39 : 32} ${side ? 31 : 31}) scale(1.3)">${proteinArt(p, rand, 0, 0)}</g>`;
    food += vegBits(veg.length ? veg : ['pepper'], rand, side ? 31 : 32, side ? 42 : 39, 7, side || p ? 5 : 10);
  }
  if (herb)
    for (let i = 0; i < 5; i++) food += leafShape(26 + rand() * 12, 25 + rand() * 12, rand() * 180, 0.42, '#3f8a3a');
  const plate = bowl
    ? `<circle cx="32" cy="33.5" r="29.5" fill="#1e2a22" opacity=".09"/><circle cx="32" cy="32" r="29" fill="#fff"/><circle cx="32" cy="32" r="29" fill="none" stroke="#1e2a22" stroke-opacity=".08"/><circle cx="32" cy="32" r="23" fill="#ece6dc"/>`
    : `<circle cx="32" cy="33.5" r="29.5" fill="#1e2a22" opacity=".09"/><circle cx="32" cy="32" r="29" fill="#fff"/><circle cx="32" cy="32" r="29" fill="none" stroke="#1e2a22" stroke-opacity=".08"/><circle cx="32" cy="32" r="23" fill="#f7f3ec"/><circle cx="32" cy="32" r="23" fill="none" stroke="#1e2a22" stroke-opacity=".05"/>`;
  return `<span class="dish" style="--size:${size}px" aria-hidden="true"><svg viewBox="0 0 64 64" width="${size}" height="${size}" focusable="false">${plate}${food}</svg></span>`;
}
