import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, diaryEntry } from '../docs/src/domain.js';
import {
  BASIC_FOODS,
  RECIPE_FOODS,
  searchLocal,
  fromOpenFoodFacts,
  lookupBarcode,
  searchOnline,
  OFF_ORIGIN,
} from '../docs/src/foods.js';

const yogurt = {
  code: '3800201451161',
  product_name: 'Краве кисело мляко 3.6%',
  brands: 'Елена, Elena',
  quantity: '400 g',
  serving_size: '200 g',
  serving_quantity: 200,
  nutrition_data_per: '100g',
  nutriments: {
    'energy-kcal_100g': 63,
    proteins_100g: 3.3,
    carbohydrates_100g: 4.5,
    fat_100g: 3.6,
    fiber_100g: 0.4,
    sugars_100g: 4.5,
    'saturated-fat_100g': 2.2,
    sodium_100g: 0.2,
  },
};

test('basic products and recipes are ready to log with real values', () => {
  const tomato = BASIC_FOODS.find((f) => f.id === 'basic:tomato');
  assert.equal(tomato.name, 'Домати');
  assert.equal(tomato.basis, 100);
  assert.equal(tomato.kcal, 18);
  const egg = BASIC_FOODS.find((f) => f.id === 'basic:egg');
  assert.equal(egg.unit, 'порции');
  assert.equal(egg.basis, 1);
  assert.ok(RECIPE_FOODS.length >= 118);
  for (const f of [...BASIC_FOODS, ...RECIPE_FOODS])
    diaryEntry({ ...f, date: '2026-11-10', meal: 'Обяд' }); // every one is a valid diary entry
});

test('local search puts your foods first, then products and recipes', () => {
  const state = defaults();
  state.diary = [diaryEntry({ name: 'Кисело мляко Верея', date: '2026-11-09', meal: 'Закуска', unit: 'г', basis: 100, amount: 150, kcal: 64 })];
  const r = searchLocal(state, 'кисело');
  assert.equal(r.mine[0].name, 'Кисело мляко Верея');
  assert.ok(r.basic.some((f) => f.name === 'Кисело мляко'));
  assert.ok(r.recipes.every((f) => /кисело/i.test(f.name)));
  const empty = searchLocal(state, '');
  assert.equal(empty.mine.length, 1);
  assert.equal(empty.basic.length, 0, 'no catalogue dump before typing');
  assert.equal(searchLocal(state, 'xyzxyz').mine.length, 0);
});

test('Open Food Facts data becomes a diary draft; missing values stay unknown', () => {
  const draft = fromOpenFoodFacts(yogurt);
  assert.equal(draft.name, 'Краве кисело мляко 3.6%');
  assert.equal(draft.brand, 'Елена');
  assert.equal(draft.barcode, '3800201451161');
  assert.equal(draft.unit, 'г');
  assert.equal(draft.amount, 200);
  assert.equal(draft.kcal, 63);
  assert.equal(draft.sodium, 200);
  const entry = diaryEntry({ ...draft, date: '2026-11-10', meal: 'Закуска' });
  assert.equal((entry.kcal * entry.amount) / entry.basis, 126);
  const drink = fromOpenFoodFacts({ code: '5449000000996', product_name: 'Cola', quantity: '330 ml', nutriments: { energy_100g: 180 } });
  assert.equal(drink.unit, 'мл');
  assert.equal(drink.kcal, 43, 'kJ converted when kcal is missing');
  assert.equal(drink.protein, null);
  assert.equal(fromOpenFoodFacts({ code: '1', nutriments: {} }), null, 'no name, no draft');
});

test('barcode and search call Open Food Facts once and handle the unknown', async () => {
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    if (url.includes('/api/v2/product/3800201451161.json'))
      return new Response(JSON.stringify({ status: 1, product: yogurt }), { status: 200 });
    if (url.includes('/api/v2/product/'))
      return new Response(JSON.stringify({ status: 0, status_verbose: 'product not found' }), { status: 404 });
    if (url.includes('/cgi/search.pl')) return new Response(JSON.stringify({ products: [yogurt, { product_name: '' }] }), { status: 200 });
    return new Response('down', { status: 503 });
  };
  const found = await lookupBarcode('3800201451161', { fetchImpl: fake });
  assert.equal(found.kcal, 63);
  assert.ok(calls[0].startsWith(OFF_ORIGIN + '/api/v2/product/3800201451161.json'));
  await lookupBarcode('3800201451161', { fetchImpl: fake });
  assert.equal(calls.length, 1, 'cached for the session');
  assert.equal(await lookupBarcode('5449000000996', { fetchImpl: fake }), null);
  await assert.rejects(lookupBarcode('123', { fetchImpl: fake }), /не е валиден/);
  const list = await searchOnline('кисело мляко', { fetchImpl: fake });
  assert.equal(list.length, 1);
  assert.match(calls.at(-1), /search_terms=%D0%BA/);
  assert.deepEqual(await searchOnline('к', { fetchImpl: fake }), []);
  await assert.rejects(searchOnline('лютеница', { fetchImpl: async () => new Response('x', { status: 503 }) }), /не отговаря/);
});
