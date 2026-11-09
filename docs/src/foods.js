// Where diary foods come from: what you ate before, your saved foods, the basic products of the
// catalogue, На маса recipes per portion, and Open Food Facts for barcodes and name search.
// Only the barcode or the search words leave the device, and only when you scan or search.
import { PRODUCTS, RECIPES } from './catalog.js';
import { NUTRIENTS as PER_100, nutrition } from './nutrition.js';
import { foodHistory } from './fitness.js';
import { isValidBarcode } from './domain.js';

const lower = (s) => String(s ?? '').toLocaleLowerCase('bg');
const round1 = (n) => Math.round(n * 10) / 10;

/** Generic products from the recipe catalogue, per 100 g or ml (eggs per piece). */
export const BASIC_FOODS = Object.freeze(
  Object.entries(PRODUCTS)
    .filter(([k]) => PER_100[k] && k !== 'salt')
    .map(([k, p]) => {
      const [kcal, protein, carbs, fat, fiber] = PER_100[k];
      const piece = k === 'egg';
      return Object.freeze({
        id: `basic:${k}`,
        name: p[0],
        brand: '',
        unit: piece ? 'порции' : p[2] === 'мл' ? 'мл' : 'г',
        basis: piece ? 1 : 100,
        amount: piece ? 1 : 100,
        servingLabel: piece ? '1 яйце' : '',
        kcal,
        protein,
        carbs,
        fat,
        fiber,
        source: 'manual',
        kind: 'basic',
      });
    }),
);

/** Every На маса recipe as one portion. */
export const RECIPE_FOODS = Object.freeze(
  RECIPES.map((r) => {
    const n = nutrition(r);
    return Object.freeze({
      id: `recipe:${r.id}`,
      name: r.name,
      brand: 'Рецепта от „На маса“',
      unit: 'порции',
      basis: 1,
      amount: 1,
      kcal: n.kcal,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
      fiber: n.fiber,
      source: 'recipe',
      kind: 'recipe',
    });
  }),
);

function score(entry, q) {
  const text = lower(`${entry.name} ${entry.brand || ''}`);
  if (!q) return 1;
  if (text.startsWith(q)) return 4;
  if (text.split(/[\s,.;:()„“"-]+/).some((w) => w.startsWith(q))) return 3;
  return text.includes(q) ? 1 : 0;
}
function ranked(list, q, limit) {
  return list
    .map((e, i) => [score(e, q), i, e])
    .filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0] || a[1] - b[1])
    .slice(0, limit)
    .map(([, , e]) => e);
}

/** Local results while typing: your foods first, then basic products and recipes. */
export function searchLocal(state, query = '', { tab = 'all' } = {}) {
  const q = lower(query).trim();
  const saved = state.savedFoods.map((e) => ({ ...e, kind: 'saved' }));
  const savedKeys = new Set(saved.map((e) => lower(`${e.name}|${e.brand || ''}`)));
  const recent = foodHistory(state.diary, '', 60)
    .filter((e) => !savedKeys.has(lower(`${e.name}|${e.brand || ''}`)))
    .map((e) => ({ ...e, kind: 'recent' }));
  if (tab === 'saved') return { mine: ranked(saved, q, 60), basic: [], recipes: [] };
  return {
    mine: ranked([...saved, ...recent], q, q ? 12 : 40),
    basic: q ? ranked(BASIC_FOODS, q, 10) : [],
    recipes: q ? ranked(RECIPE_FOODS, q, 6) : [],
  };
}

/* ---------- Open Food Facts ---------- */

export const OFF_ORIGIN = 'https://world.openfoodfacts.org';
const FIELDS =
  'code,product_name,product_name_bg,generic_name,brands,quantity,serving_size,serving_quantity,nutriments,nutrition_data_per';
const value = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? round1(n) : null;
};

/** One Open Food Facts product as a diary draft. Missing values stay unknown, never zero. */
export function fromOpenFoodFacts(p, code = p?.code) {
  if (!p || typeof p !== 'object') return null;
  const name = String(p.product_name_bg || p.product_name || p.generic_name || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  if (!name) return null;
  const n = p.nutriments || {};
  const liquid = /\b(ml|cl|dl|l|мл|л)\b/i.test(String(p.quantity || '')) || /ml/i.test(String(p.nutrition_data_per || ''));
  let kcal = value(n['energy-kcal_100g']);
  if (kcal === null && value(n.energy_100g) !== null) kcal = Math.round(Number(n.energy_100g) / 4.184);
  if (kcal !== null && kcal > 2000) kcal = null;
  const sodium =
    value(n.sodium_100g) !== null ? round1(Number(n.sodium_100g) * 1000) : value(n.salt_100g) !== null ? round1(Number(n.salt_100g) * 400) : null;
  const serving = Number(p.serving_quantity);
  const servingOk = Number.isFinite(serving) && serving > 0 && serving <= 2000;
  const cap = (v, max) => (v === null || v > max ? null : v);
  return {
    name,
    brand: String(p.brands || '').split(',')[0].trim().slice(0, 120),
    barcode: typeof code === 'string' && isValidBarcode(code) ? code : null,
    unit: liquid ? 'мл' : 'г',
    basis: 100,
    amount: servingOk ? round1(serving) : 100,
    servingLabel: String(p.serving_size || '').slice(0, 120),
    servingGrams: servingOk ? round1(serving) : null,
    kcal,
    protein: cap(value(n.proteins_100g), 200),
    carbs: cap(value(n.carbohydrates_100g), 200),
    fat: cap(value(n.fat_100g), 200),
    fiber: cap(value(n.fiber_100g), 200),
    sugars: cap(value(n.sugars_100g), 200),
    saturatedFat: cap(value(n['saturated-fat_100g']), 200),
    sodium: cap(sodium, 100000),
    source: 'openfoodfacts',
    kind: 'off',
  };
}

async function getJSON(url, { signal, fetchImpl = globalThis.fetch, timeout = 9000 } = {}) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  signal?.addEventListener?.('abort', stop, { once: true });
  const timer = setTimeout(stop, timeout);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (response.status === 404) return { notFound: true };
    if (!response.ok) throw Error('Open Food Facts не отговаря в момента. Опитай пак след малко.');
    return await response.json();
  } catch (error) {
    if (signal?.aborted) throw Object.assign(Error('Спряно.'), { name: 'AbortError' });
    if (error.name === 'AbortError') throw Error('Open Food Facts не отговори навреме. Опитай пак.');
    if (error instanceof TypeError)
      throw Error(
        globalThis.navigator?.onLine === false
          ? 'Няма интернет.'
          : 'Open Food Facts не отговаря в момента. Опитай пак след малко.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', stop);
  }
}

const cache = new Map();

/** Product by barcode, or null when Open Food Facts does not know it. */
export async function lookupBarcode(code, options = {}) {
  if (!isValidBarcode(code)) throw Error('Баркодът не е валиден. Провери цифрите.');
  if (cache.has(code)) return cache.get(code);
  const data = await getJSON(`${OFF_ORIGIN}/api/v2/product/${code}.json?fields=${FIELDS}`, options);
  const found = data.notFound || data.status !== 1 ? null : fromOpenFoodFacts(data.product, code);
  cache.set(code, found);
  return found;
}

/** Products by name. Open Food Facts allows few searches a minute, so call it on request only. */
export async function searchOnline(query, options = {}) {
  const q = String(query || '').trim().slice(0, 80);
  if (q.length < 2) return [];
  const key = 'q:' + lower(q);
  if (cache.has(key)) return cache.get(key);
  const data = await getJSON(
    `${OFF_ORIGIN}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`,
    options,
  );
  const seen = new Set();
  const list = (data.products || [])
    .map((p) => fromOpenFoodFacts(p))
    .filter((e) => e && e.kcal !== null)
    .filter((e) => {
      const k = lower(`${e.name}|${e.brand}|${e.kcal}`);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 20);
  cache.set(key, list);
  return list;
}
