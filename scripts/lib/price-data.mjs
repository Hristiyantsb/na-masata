// Turns the daily archive of the price portal into what the app shows: for every settlement
// and chain, the price of our pack of a product and in how many of the chain's stores it is sold.
import { chainFiles, eachProductRow } from './kzp.mjs';
import {
  RULES,
  PRODUCTS_BY_SET,
  isProduct,
  unitPrice,
  packOf,
  matchName,
} from './price-rules.mjs';
import { PLACES } from './places.mjs';

export const CHAINS = Object.freeze(['Lidl', 'Kaufland', 'BILLA', 'METRO', 'Фантастико', 'T MARKET']);
export const SOFIA = 68134;
// The app refuses a town file with fewer products than this (readMarket in docs/src/market.js),
// so such a town is not offered in the picker at all.
export const MIN_PRODUCTS = 10;

const cents = (n) => Math.round(n * 100) / 100;

/**
 * Reads every chain file of the archive.
 * Returns { cities, stats }: cities is city -> chain -> store -> product ->
 * { best, matched, readable }: the cheapest readable row of that product in that store
 * ({ unit, regular, promo, name }), how many rows are that product and how many could be read.
 */
export function readArchive(zipBuffer) {
  const cities = new Map();
  const stats = {};
  for (const file of chainFiles(zipBuffer)) {
    const stat = (stats[file.chain] ||= { files: 0, rows: 0, skipped: 0 });
    stat.files++;
    const result = eachProductRow(file.text(), (row) => {
      let city = cities.get(row.city);
      if (!city) cities.set(row.city, (city = new Map()));
      let chain = city.get(file.chain);
      if (!chain) city.set(file.chain, (chain = new Map()));
      let store = chain.get(row.store);
      if (!store) chain.set(row.store, (store = new Map()));
      const keys = PRODUCTS_BY_SET.get(row.set);
      if (!keys) return;
      const name = matchName(row.name);
      for (const key of keys) {
        if (!isProduct(key, row, name)) continue;
        let entry = store.get(key);
        if (!entry) store.set(key, (entry = { best: null, matched: 0, readable: 0 }));
        entry.matched++;
        const found = unitPrice(key, row, file.chain);
        if (!found) continue;
        entry.readable++;
        if (!entry.best || found.unit < entry.best.unit) entry.best = { ...found, name: row.name };
      }
    });
    stat.rows += result.rows;
    stat.skipped += result.skipped;
  }
  return { cities, stats };
}

/**
 * A product name as it is shown: shop-floor capitals become a sentence, a leading counter code
 * ("285 SOC ...") is dropped and the text is kept short.
 */
export function tidyName(name) {
  let text = name.replace(/\s+/g, ' ').replace(/^[*\s]+/, '').replace(/^\d{2,3}\s+(?=\D)/, '').trim();
  if (!/[а-я]/.test(text) && /[А-Я]/.test(text)) {
    text = text.replace(/[А-Я]+/g, (word) => word.toLocaleLowerCase('bg'));
    // A name that starts with a size ("700гр бял хляб") stays as it is.
    text = text.replace(/^[а-я]/, (ch) => ch.toLocaleUpperCase('bg'));
  }
  return text.length > 64 ? `${text.slice(0, 63).trimEnd()}…` : text;
}

/**
 * A store's cheapest readable row stands for the product only when it was picked from enough of
 * the shelf. Where most names give no size (one sized premium butter among fifteen unsized
 * ones), the cheapest readable row is not the cheapest product, so the store gives no figure.
 */
export function representative(entry) {
  return Boolean(entry.best) && (entry.readable >= 3 || entry.readable * 3 >= entry.matched);
}

/**
 * The prices of one settlement: { stores: { chain: count }, products: { key: { chain: entry } } }.
 * An entry is [price of our pack, stores that sell it, product name, regular price if on promotion].
 * The price is the one in the chain's typical store: every store offers its cheapest matching
 * product, the stores are lined up by that price and the middle one is taken. One odd store
 * (a clearance, a typing error) cannot move it, and the name is the product behind the number.
 */
export function cityPrices(chains) {
  const stores = {};
  const products = {};
  const found = {};
  for (const chain of CHAINS) {
    const storeMap = chains.get(chain);
    if (!storeMap) continue;
    stores[chain] = storeMap.size;
    for (const entries of storeMap.values())
      for (const [key, entry] of entries)
        if (representative(entry)) ((found[key] ||= {})[chain] ||= []).push(entry.best);
  }
  for (const key of Object.keys(RULES)) {
    if (!found[key]) continue;
    const pack = packOf(key);
    products[key] = {};
    for (const chain of CHAINS) {
      const list = found[key][chain];
      if (!list) continue;
      list.sort((a, b) => a.unit - b.unit);
      const typical = list[Math.floor((list.length - 1) / 2)];
      const price = cents(typical.unit * pack);
      const entry = [price, list.length, tidyName(typical.name)];
      const regular = cents(typical.regular * pack);
      if (typical.promo && regular > price) entry.push(regular);
      products[key][chain] = entry;
    }
  }
  return { stores, products };
}

/**
 * Everything the app needs: { index, cities }.
 * index lists the settlements that have at least one store of our chains;
 * cities maps the settlement code to its price file.
 */
export function buildPriceFiles(zipBuffer, date, { minProducts = MIN_PRODUCTS } = {}) {
  const { cities, stats } = readArchive(zipBuffer);
  const files = new Map();
  const places = [];
  const unknown = [];
  for (const [code, chains] of cities) {
    const place = PLACES.get(code);
    if (!place) {
      unknown.push(code);
      continue;
    }
    const { stores, products } = cityPrices(chains);
    if (Object.keys(products).length < minProducts) continue;
    files.set(code, { v: 1, date, city: code, place: place.name, stores, products });
    places.push([code, place.name, place.municipality, place.region, stores]);
  }
  places.sort((a, b) => a[1].localeCompare(b[1], 'bg') || a[0] - b[0]);
  return {
    index: { v: 1, date, source: 'https://kolkostruva.bg', places },
    cities: files,
    stats,
    unknown,
  };
}

/** Refuses a day's data that would make the app worse: a chain missing or too few products. */
export function assertUsable({ cities, stats }) {
  for (const chain of CHAINS) {
    if (!stats[chain] || stats[chain].rows < 5000)
      throw Error(`The archive has no usable data for ${chain}`);
  }
  const sofia = cities.get(SOFIA);
  if (!sofia) throw Error('The archive has no prices for София');
  const wide = Object.values(sofia.products).filter((chains) => Object.keys(chains).length >= 3);
  if (wide.length < 32)
    throw Error(`Only ${wide.length} products have prices in three chains in София`);
}

/** JSON with one product per line, so that a day's change reads as a short diff. */
export function cityJson(file) {
  const lines = Object.entries(file.products).map(
    ([key, chains]) => `    ${JSON.stringify(key)}: ${JSON.stringify(chains)}`,
  );
  const head = [
    `"v": ${file.v}`,
    `"date": ${JSON.stringify(file.date)}`,
    `"city": ${file.city}`,
    `"place": ${JSON.stringify(file.place)}`,
    `"stores": ${JSON.stringify(file.stores)}`,
  ];
  return `{\n  ${head.join(',\n  ')},\n  "products": {\n${lines.join(',\n')}\n  }\n}\n`;
}

export function indexJson(index) {
  const lines = index.places.map((place) => `    ${JSON.stringify(place)}`);
  return `{\n  "v": ${index.v},\n  "date": ${JSON.stringify(index.date)},\n  "source": ${JSON.stringify(index.source)},\n  "places": [\n${lines.join(',\n')}\n  ]\n}\n`;
}
