export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
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
export function foodArt(r) {
  const kind = ['shopska', 'chickpea', 'airchickpea', 'zucchini', 'spinach', 'cabbage'].includes(
    r.id,
  )
    ? 'greens'
    : r.id === 'fish'
      ? 'fish'
      : r.id === 'banitsa'
        ? 'pie'
        : ['omelette', 'mishmash'].includes(r.id)
          ? 'pan'
          : 'bowl';
  const shapes = {
    greens:
      'M24 34c-16-3-15-21-5-23 10-2 17 12 5 23zm0 0c1-17 13-25 21-18 9 9-1 22-21 18zm1 1-5-17m5 17 15-13',
    fish: 'M13 28c12-19 29-15 37 0-8 15-25 18-37 0zm0 0L3 16v24zm24-5h1m-7-11 2 7m-2 18 2 7',
    pie: 'M6 30 25 7l24 23-5 17H10zM6 30h43M17 19l21 11M23 12l23 14M17 35v6m11-6v6m10-6v6',
    pan: 'M8 18h33v16c0 17-33 17-33 0zm33 7h12M18 5v6m12-6v6M16 27c5-6 15-4 16 3s-8 11-13 7-7-6-3-10',
    bowl: 'M5 25h44c-1 18-11 24-22 24S7 43 5 25zm5 5h34M18 5c-6 5 5 8 0 13M28 3c-6 6 5 9 0 15M38 5c-6 5 5 8 0 13',
  };
  return `<div class="food-art art-${r.id.length % 4}" aria-hidden="true"><span class="plate"><svg width="36" height="36" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${shapes[kind]}"/></svg></span></div>`;
}
export const badge = (text) => `<span class="badge">${esc(text)}</span>`;
export const heading = (eyebrow, title, sub, action = '') =>
  `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${action}</header>`;
export const empty = (title, text, action = '') =>
  `<section class="empty"><span class="empty-icon">${icon('leaf', 32)}</span><h2>${title}</h2><p>${text}</p>${action}</section>`;
export const field = (label, name, value, type = 'text', extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
