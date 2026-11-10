import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCTS, STORES } from '../docs/src/catalog.js';
import { EDIBLE } from '../docs/src/products-more.js';
import { NUTRIENTS, nutrition } from '../docs/src/nutrition.js';
import { PRICE_SOURCE, STORE_PRICES, REFERENCE_PRICES } from '../docs/src/prices.js';
import { defaults, packPrice, storeOf, groceries } from '../docs/src/domain.js';

const stateWith = (stores) => {
  const state = defaults();
  state.settings.stores = stores;
  return state;
};

test('the price snapshot names its source and only covers real products and chains', () => {
  assert.match(PRICE_SOURCE.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(PRICE_SOURCE.shown, PRICE_SOURCE.date.split('-').reverse().join('.'));
  assert.ok(PRICE_SOURCE.name && PRICE_SOURCE.place && PRICE_SOURCE.url.startsWith('https://'));
  assert.ok(Object.keys(STORE_PRICES).length >= 35);
  for (const [key, perStore] of Object.entries(STORE_PRICES)) {
    assert.ok(PRODUCTS[key], `unknown product ${key}`);
    assert.ok(Object.keys(perStore).length >= 1, key);
    for (const [store, price] of Object.entries(perStore)) {
      assert.ok(STORES.includes(store), `${key}: unknown chain ${store}`);
      assert.ok(price > 0 && price < 50, `${key} in ${store}: ${price}`);
    }
    // The reference price in the product table is the median of the chains.
    assert.equal(PRODUCTS[key][3], REFERENCE_PRICES[key], `${key} reference price`);
  }
});

test('a product costs what it costs in the chain it is bought from', () => {
  const both = stateWith(['Lidl', 'Kaufland']);
  const potato = STORE_PRICES.potato;
  assert.equal(storeOf('potato', both), potato.Kaufland < potato.Lidl ? 'Kaufland' : 'Lidl');
  assert.equal(packPrice('potato', both), Math.min(potato.Lidl, potato.Kaufland));

  const billa = stateWith(['BILLA']);
  assert.equal(storeOf('potato', billa), 'BILLA');
  assert.equal(packPrice('potato', billa), potato.BILLA);

  // The person's own store and own price always win.
  both.storeFor.potato = 'Lidl';
  assert.equal(storeOf('potato', both), 'Lidl');
  assert.equal(packPrice('potato', both), potato.Lidl);
  both.prices.potato = 9.99;
  assert.equal(packPrice('potato', both), 9.99);

  // No figure for this chain or this product: the reference price.
  const small = stateWith(['T MARKET']);
  assert.equal(STORE_PRICES.bean['T MARKET'], undefined);
  assert.equal(packPrice('bean', small), PRODUCTS.bean[3]);
  assert.equal(STORE_PRICES.spinach, undefined);
  assert.equal(packPrice('spinach', both), PRODUCTS.spinach[3]);
});

test('the shopping list sends each product to the cheapest chosen chain', () => {
  const state = stateWith(['Lidl', 'Kaufland', 'BILLA']);
  state.plan = [
    { id: 'lentil', day: 0, slot: 'Вечеря', people: 2 },
    { id: 'moussaka', day: 1, slot: 'Вечеря', people: 2 },
  ];
  let checked = 0;
  for (const row of groceries(state)) {
    const known = STORE_PRICES[row.k];
    if (!known) continue;
    const chosen = state.settings.stores.filter((store) => known[store] != null);
    if (!chosen.length) continue;
    const cheapest = Math.min(...chosen.map((store) => known[store]));
    assert.equal(known[row.store], cheapest, `${row.k} is bought in ${row.store}`);
    if (row.packs) assert.equal(row.cost, row.packs * cheapest);
    checked++;
  }
  assert.ok(checked >= 5, 'the menu really has products with prices per chain');
});

test('calories and macros count only the part that is eaten', () => {
  for (const [key, share] of Object.entries(EDIBLE)) {
    assert.ok(PRODUCTS[key] && NUTRIENTS[key], `unknown product ${key}`);
    assert.ok(share > 0.3 && share < 1, `${key}: ${share}`);
  }
  const whole = nutrition({ ing: { rice: 100 } });
  assert.equal(whole.kcal, Math.round(NUTRIENTS.rice[0] / 2));
  const peeled = nutrition({ ing: { banana: 200 } });
  assert.equal(peeled.kcal, Math.round((NUTRIENTS.banana[0] * 2 * EDIBLE.banana) / 2));
  const trout = nutrition({ ing: { fish: 500 } });
  assert.ok(trout.kcal < (NUTRIENTS.fish[0] * 5) / 2, 'head and bones are not eaten');
  // Every product in the catalog has nutrition values.
  for (const key of Object.keys(PRODUCTS)) assert.ok(NUTRIENTS[key], `no nutrition for ${key}`);
});
