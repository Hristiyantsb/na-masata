// Official logos of the six chains, fetched from Wikimedia Commons (Lidl, Kaufland, BILLA, METRO)
// and from the chains' own sites (Фантастико, T MARKET). Trademarks of their owners, shown only
// to name the store the shopping list is for.
import { esc } from './ui.js';

export const STORE_LOGOS = Object.freeze({
  Lidl: 'assets/stores/lidl.svg',
  Kaufland: 'assets/stores/kaufland.svg',
  BILLA: 'assets/stores/billa.webp',
  METRO: 'assets/stores/metro.svg',
  Фантастико: 'assets/stores/fantastico.png',
  'T MARKET': 'assets/stores/tmarket.svg',
});

export function storeBadge(name) {
  const logo = STORE_LOGOS[name];
  if (!logo) return `<span class="store-badge is-text"><b>${esc(name)}</b></span>`;
  return `<span class="store-badge"><img src="${logo}" alt="" decoding="async" draggable="false"></span>`;
}
