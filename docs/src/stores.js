import { esc } from './ui.js';
// Store badges in each chain's own colours. These are typographic badges, not the chains'
// logo artwork. Drop an official file at assets/stores/<id>.svg and set `logo` to use it.
export const STORE_STYLE = Object.freeze({
  Lidl: { id: 'lidl', bg: '#0050aa', fg: '#fff000', label: 'Lidl', dot: '#e60a14' },
  Kaufland: { id: 'kaufland', bg: '#e10915', fg: '#ffffff', label: 'Kaufland', small: true },
  BILLA: { id: 'billa', bg: '#ffe500', fg: '#e2001a', label: 'BILLA' },
  METRO: { id: 'metro', bg: '#002d72', fg: '#ffed00', label: 'METRO' },
  Фантастико: { id: 'fantastico', bg: '#d7141e', fg: '#ffffff', label: 'Фантастико', small: true },
  'T MARKET': {
    id: 'tmarket',
    bg: '#ffffff',
    fg: '#e4002b',
    label: 'T MARKET',
    ring: true,
    small: true,
  },
  CBA: { id: 'cba', bg: '#ffffff', fg: '#d6001c', label: 'CBA', ring: true, dot: '#2b9a3c' },
  ProMarket: { id: 'promarket', bg: '#00843d', fg: '#ffffff', label: 'ProMarket', small: true },
  'KAM Market': { id: 'kam', bg: '#f39200', fg: '#ffffff', label: 'KAM Market', small: true },
  КООП: { id: 'coop', bg: '#0069b4', fg: '#ffffff', label: 'КООП' },
  Стопчето: { id: 'stopcheto', bg: '#6cb33f', fg: '#ffffff', label: 'Стопчето', small: true },
  minimart: { id: 'minimart', bg: '#1d1d1b', fg: '#ffffff', label: 'minimart', small: true },
  'Квартален магазин': {
    id: 'local',
    bg: '#f2f2f0',
    fg: '#1f2420',
    label: 'Квартален магазин',
    small: true,
    wrap: true,
  },
});

export function storeBadge(name) {
  const s = STORE_STYLE[name] || { bg: '#f2f2f0', fg: '#1f2420', label: name, small: true };
  if (s.logo)
    return `<span class="store-badge has-logo"><img src="${s.logo}" alt="" width="96" height="48"></span>`;
  return `<span class="store-badge ${s.ring ? 'is-ring' : ''} ${s.small ? 'is-small' : ''} ${s.wrap ? 'is-wrap' : ''}" style="--sb-bg:${s.bg};--sb-fg:${s.fg}">${s.dot ? `<i style="background:${s.dot}"></i>` : ''}<b>${esc(s.label)}</b></span>`;
}
