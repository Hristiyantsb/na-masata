export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export const WEEKDAYS = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
export const dayName = (i) => WEEKDAYS[i % 7];
export const money = (n) =>
  new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' }).format(n);
export const num = (n, d = 0) =>
  new Intl.NumberFormat('bg-BG', { maximumFractionDigits: d }).format(n);
const paths = {
  plan: 'M5 4h14v17H5z M9 2v4m6-4v4M8 10h8m-8 4h8m-8 4h4',
  book: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z M12 6v15',
  bag: 'M5 8h14l2 13H3z M8 8V6a4 4 0 018 0v2',
  diary: 'M4 5h16v16H4z M8 2v6m8-6v6M4 11h16M8 15h2m4 0h2m-8 3h2',
  settings:
    'M12 8a4 4 0 100 8 4 4 0 000-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  clock: 'M12 8v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0',
  heart: 'M20 5c-3-3-6 0-8 2-2-2-5-5-8-2-5 5 8 15 8 15S25 10 20 5z',
  scan: 'M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5M7 7v10m3-10v10m4-10v10m3-10v10',
  leaf: 'M20 3C7 2 1 11 6 17c6 6 15-1 14-14zM5 20 16 8',
  protein: 'M4 6v12m3-9v6m10-6v6m3-9v12M7 12h10',
  airfryer: 'M5 3h14v18H5z M5 8h14M9 5h6M9 14h6m-3-2v4',
  microwave: 'M2 5h20v15H2zM5 8h11v9H5zM19 9v1m0 4v1',
  oven: 'M3 3h18v18H3zM3 8h18M7 5h1m3 0h1m4 0h1M7 12h10v6H7z',
  hob: 'M3 3h18v18H3zM8 7h1m6 0h1M7 15h3m4 0h3',
  camera: 'M3 7h4l2-3h6l2 3h4v14H3z M16 14a4 4 0 11-8 0 4 4 0 018 0',
  swap: 'M4 7h15l-4-4m4 14H4l4 4M19 7l-4 4M4 17l4-4',
  lock: 'M7 10V7a5 5 0 0110 0v3M5 10h14v11H5z M12 14v3',
  download: 'M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4',
  search: 'M17 10a7 7 0 11-14 0 7 7 0 0114 0M15 15l6 6',
  spark: 'm12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
  info: 'M12 11v6m0-10v1M21 12a9 9 0 11-18 0 9 9 0 0118 0',
  trash: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0M4 21v-2a8 8 0 0116 0v2',
};
export const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ? `<path d="${paths[name]}"/>` : '<circle cx="12" cy="12" r="8"/>'}</svg>`;
export const button = (text, action, attrs = '', kind = 'button') =>
  `<button type="button" class="${kind}" data-action="${action}" ${attrs}>${text}</button>`;
// Top-down dish drawn from the recipe's own ingredients: the main ingredient sets the base,
// the next few become garnish. Deterministic per recipe, no photos needed.
const FOOD_COLORS = {
  tomato: '#d9472b', canned: '#c63c26', pepper: '#e0662f', paprika: '#b8401f', carrot: '#ee8a2f',
  lentil: '#a5642d', bean: '#e8dcc2', chickpea: '#d9b46a', potato: '#e7c27a', rice: '#f3eee1',
  pasta: '#efcf7e', bread: '#d6a35c', flour: '#efe6d2', oats: '#d9c39a', phyllo: '#f0cf86',
  cheese: '#fbfaf3', yogurt: '#fdfcf7', egg: '#f5c542', chicken: '#e3b07a', mince: '#8c4a2f',
  fish: '#e9b6a0', spinach: '#3f7a35', zucchini: '#7fa64a', cucumber: '#8fbf5a', cabbage: '#c9dc9a',
  mushroom: '#9a7b5e', parsley: '#3f8a3a', dill: '#5f9a3f', savory: '#6c8a4a', onion: '#efe0c6',
  garlic: '#f4ecd9', lemon: '#f2d44c', walnut: '#8a5a32', apple: '#d8533c', banana: '#f2d670',
  honey: '#e3a32b', tofu: '#f3ecd8',
};
const SKIP = new Set(['oil', 'salt', 'peppercorn']);
export function foodArt(r) {
  const keys = Object.entries(r.ing || {})
    .filter(([k]) => FOOD_COLORS[k] && !SKIP.has(k))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  // The main ingredient sets the base; sauces and aromatics become garnish.
  const SAUCE = ['tomato', 'canned', 'onion', 'pepper', 'garlic', 'lemon', 'paprika'];
  const hero = keys.find((k) => !SAUCE.includes(k)) || keys[0];
  const rest = keys.filter((k) => k !== hero);
  const base = FOOD_COLORS[hero] || '#e7c27a';
  const accents = (rest.length ? rest.slice(0, 4) : [hero]).map((k) => FOOD_COLORS[k]);
  let seed = [...r.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
  let bits = '';
  for (let i = 0; i < 9; i++) {
    const angle = rand() * Math.PI * 2,
      dist = 3 + rand() * 11,
      x = (28 + Math.cos(angle) * dist).toFixed(1),
      y = (28 + Math.sin(angle) * dist).toFixed(1),
      size = (2 + rand() * 2.6).toFixed(1),
      color = accents[i % accents.length] || '#3f8a3a';
    bits +=
      i % 3 === 2
        ? `<ellipse cx="${x}" cy="${y}" rx="${size}" ry="${(size * 0.55).toFixed(1)}" transform="rotate(${Math.round(rand() * 180)} ${x} ${y})" fill="${color}"/>`
        : `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}"/>`;
  }
  const herb = keys.find((k) => ['parsley', 'dill', 'savory', 'spinach'].includes(k));
  if (herb) bits += `<path d="M33 20c3-2 6-1 7 1-2 2-5 2-7-1zm-2 3c-1-3 0-6 3-6 1 3 0 5-3 6z" fill="${FOOD_COLORS[herb]}"/>`;
  return `<div class="food-art" aria-hidden="true"><svg viewBox="0 0 56 56" width="100%" height="100%"><circle cx="28" cy="29.5" r="25" fill="#1f2420" opacity=".08"/><circle cx="28" cy="28" r="25" fill="#fff"/><circle cx="28" cy="28" r="25" fill="none" stroke="#1f2420" stroke-opacity=".08"/><circle cx="28" cy="28" r="18.5" fill="${base}" stroke="#1f2420" stroke-opacity=".08"/><circle cx="28" cy="28" r="18.5" fill="url(#fa-shade)"/>${bits}<defs><radialGradient id="fa-shade" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient></defs></svg></div>`;
}
export const badge = (text) => `<span class="badge">${esc(text)}</span>`;
export const heading = (eyebrow, title, sub, action = '') =>
  `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${action}</header>`;
export const empty = (title, text, action = '') =>
  `<section class="empty"><img class="mascot" src="assets/mascot/sleepy.webp" width="160" height="160" alt="" aria-hidden="true" decoding="async"><h2>${title}</h2><p>${text}</p>${action}</section>`;
export const field = (label, name, value, type = 'text', extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
