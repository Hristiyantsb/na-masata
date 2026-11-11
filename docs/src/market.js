// The prices the app counts with.
//
// Every morning the site gets a fresh file per town, built from the open data of the public
// price portal kolkostruva.bg: for each chain, the price of our pack of a product in the chain's
// typical store and in how many of its stores in that town the product is sold. Until today's
// file for the person's town is loaded, the snapshot that ships with the app is used.
//
// This is a price list, not a stock count: "sold in 41 of 43 stores" says where the product is
// on the list, never whether the shelf is full this hour.
import { PRODUCTS, STORES } from './catalog.js';
import { PRICE_SOURCE, STORE_PRICES } from './prices.js';

export const DEFAULT_CITY = 68134;
export const PRICES_BASE = 'data/prices/';
export const MARKET_KEY = 'na-masata-market-v1';
export const PLACES_KEY = 'na-masata-places-v1';

let live = null;
let version = 0;

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const cents = (n) => Math.round(n * 100) / 100;
const median = (list) => {
  const s = list.slice().sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
const storeCounts = (raw) => {
  const stores = {};
  for (const chain of STORES) {
    const count = raw?.[chain];
    if (Number.isInteger(count) && count > 0 && count < 5000) stores[chain] = count;
  }
  return stores;
};

/**
 * Checks a town's price file and keeps only what the app knows: our products, our chains,
 * sane numbers. The file comes from the network, so nothing in it is trusted as it is.
 */
export function readMarket(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1 || !isDate(raw.date) || !Number.isInteger(raw.city))
    throw Error('Невалиден файл с цени.');
  const stores = storeCounts(raw.stores);
  const products = {};
  const reference = {};
  for (const [k, perChain] of Object.entries(raw.products || {})) {
    if (!Object.hasOwn(PRODUCTS, k) || !perChain || typeof perChain !== 'object') continue;
    const offers = {};
    for (const chain of STORES) {
      const entry = perChain[chain];
      if (!Array.isArray(entry) || !stores[chain]) continue;
      const [price, count, name, was] = entry;
      if (!Number.isFinite(price) || price <= 0 || price > 200) continue;
      if (!Number.isInteger(count) || count < 1) continue;
      offers[chain] = {
        price,
        stores: Math.min(count, stores[chain]),
        of: stores[chain],
        name: text(name, 80),
        was: Number.isFinite(was) && was > price && was < 400 ? was : null,
      };
    }
    const prices = Object.values(offers).map((offer) => offer.price);
    if (!prices.length) continue;
    products[k] = offers;
    if (prices.length >= 2) reference[k] = cents(median(prices));
  }
  if (Object.keys(products).length < 10) throw Error('Файлът с цени е непълен.');
  return { date: raw.date, city: raw.city, place: text(raw.place, 60), stores, products, reference };
}

/** Makes a checked price file the one the app counts with; null goes back to the snapshot. */
export function setMarket(data) {
  live = data || null;
  version++;
}
export const market = () => live;
/** Changes whenever the prices change, so that anything worked out from them can be redone. */
export const marketVersion = () => version;

/** The price of our pack in a chain, or undefined when the chain gives no figure. */
export const chainPrice = (k, store) =>
  live ? live.products[k]?.[store]?.price : STORE_PRICES[k]?.[store];

/** { price, stores, of, name, was } for a product in a chain, or null. */
export function chainOffer(k, store) {
  if (live) return live.products[k]?.[store] ?? null;
  const price = STORE_PRICES[k]?.[store];
  return price == null ? null : { price, stores: 0, of: 0, name: '', was: null };
}

/** True when the product has a figure in at least one chain. */
export const hasChainPrices = (k) => Boolean(live ? live.products[k] : STORE_PRICES[k]);

/** The price used where the chain gives none: the middle of the chains, else the catalog. */
export const referencePrice = (k) => live?.reference[k] ?? PRODUCTS[k][3];

/** The share of the chain's stores in town that list the product; 1 when it is not known. */
export function coverage(k, store) {
  const offer = live?.products[k]?.[store];
  return offer && offer.of ? offer.stores / offer.of : 1;
}

/** False only when today's file says the chain has no store in the person's town. */
export const chainInTown = (store) => !live || Boolean(live.stores[store]);

const shown = (date) => date.split('-').reverse().join('.');
/** Where the prices on screen come from: { name, url, place, date, shown, live }. */
export function priceSource() {
  if (!live) return { ...PRICE_SOURCE, live: false };
  return {
    name: PRICE_SOURCE.name,
    url: PRICE_SOURCE.url,
    place: live.place || PRICE_SOURCE.place,
    date: live.date,
    shown: shown(live.date),
    live: true,
  };
}

/* ---------- loading: the network first, the last good file when there is none ---------- */

/** The last downloaded file for this town, if it is still readable: { market, fetched } or null. */
export function cachedMarket(city, storage) {
  try {
    const saved = JSON.parse(storage.getItem(MARKET_KEY) || 'null');
    if (saved?.data?.city !== city) return null;
    return { market: readMarket(saved.data), fetched: text(saved.fetched, 10) };
  } catch {
    return null;
  }
}

export async function downloadMarket(city, fetcher = globalThis.fetch, base = PRICES_BASE) {
  const response = await fetcher(`${base}${city}.json`, { cache: 'no-cache' });
  if (!response.ok) throw Error(`Няма цени за това населено място (${response.status}).`);
  const raw = await response.json();
  const data = readMarket(raw);
  if (data.city !== city) throw Error('Файлът с цени е за друго населено място.');
  return { raw, market: data };
}

export function storeMarket(raw, storage, today) {
  try {
    storage.setItem(MARKET_KEY, JSON.stringify({ fetched: today, data: raw }));
  } catch {
    // A full or blocked storage only means the file is downloaded again next time.
  }
}

/** The towns that have prices: [{ code, name, municipality, region, stores }]. */
export function readPlaces(raw) {
  if (!raw || raw.v !== 1 || !Array.isArray(raw.places)) throw Error('Невалиден списък с населени места.');
  const places = [];
  for (const row of raw.places) {
    if (!Array.isArray(row)) continue;
    const [code, name, municipality, region, stores] = row;
    const counts = storeCounts(stores);
    if (!Number.isInteger(code) || code < 1 || !text(name, 60) || !Object.keys(counts).length) continue;
    places.push({
      code,
      name: text(name, 60),
      municipality: text(municipality, 60),
      region: text(region, 60),
      stores: counts,
    });
  }
  if (!places.length) throw Error('Списъкът с населени места е празен.');
  return places;
}

export function cachedPlaces(storage) {
  try {
    return readPlaces(JSON.parse(storage.getItem(PLACES_KEY) || 'null'));
  } catch {
    return null;
  }
}

export async function downloadPlaces(storage, fetcher = globalThis.fetch, base = PRICES_BASE) {
  const response = await fetcher(`${base}index.json`, { cache: 'no-cache' });
  if (!response.ok) throw Error(`Списъкът не се зареди (${response.status}).`);
  const raw = await response.json();
  const places = readPlaces(raw);
  try {
    storage.setItem(PLACES_KEY, JSON.stringify(raw));
  } catch {
    // Not saved: the list is simply downloaded again.
  }
  return places;
}
