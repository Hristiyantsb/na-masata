import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PRODUCTS, STORES } from '../docs/src/catalog.js';
import { PRICE_SOURCE, STORE_PRICES } from '../docs/src/prices.js';
import {
  DEFAULT_CITY,
  MARKET_KEY,
  PLACES_KEY,
  readMarket,
  setMarket,
  market,
  marketVersion,
  chainPrice,
  chainOffer,
  hasChainPrices,
  referencePrice,
  coverage,
  chainInTown,
  priceSource,
  cachedMarket,
  downloadMarket,
  storeMarket,
  readPlaces,
  cachedPlaces,
  downloadPlaces,
} from '../docs/src/market.js';
import { TOWN } from './helpers/market-fixture.js';
import { defaults, storeOf, packPrice, priceIn, groceries, shoppingSummary, normalizeState, settingsErrors } from '../docs/src/domain.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), data };
};
const answer = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });

const stateWith = (stores) => {
  const state = defaults();
  state.settings.stores = stores;
  return state;
};

test('without a downloaded file the app counts with the snapshot that ships with it', () => {
  setMarket(null);
  assert.equal(market(), null);
  assert.equal(chainPrice('tomato', 'Lidl'), STORE_PRICES.tomato.Lidl);
  assert.equal(referencePrice('tomato'), PRODUCTS.tomato[3]);
  assert.equal(coverage('tomato', 'Lidl'), 1);
  assert.equal(chainInTown('METRO'), true);
  assert.equal(hasChainPrices('tomato'), true);
  assert.equal(hasChainPrices('spinach'), false);
  assert.deepEqual(chainOffer('tomato', 'Lidl'), { price: STORE_PRICES.tomato.Lidl, stores: 0, of: 0, name: '', was: null });
  assert.equal(chainOffer('spinach', 'Lidl'), null);
  assert.deepEqual(priceSource(), { ...PRICE_SOURCE, live: false });
  assert.equal(defaults().settings.city, DEFAULT_CITY);
});

test('a price file is checked before it is used: only our products, our chains, sane numbers', () => {
  const town = readMarket(TOWN);
  assert.deepEqual(town.stores, { Lidl: 4, BILLA: 10, 'T MARKET': 6 });
  assert.equal(town.place, 'Варна');
  assert.equal(town.products.unicorn, undefined);
  // A negative price, a price as text and a chain with no store in town are dropped.
  assert.equal(town.products.onion, undefined);
  assert.deepEqual(town.products.tomato['T MARKET'], { price: 1.99, stores: 2, of: 6, name: 'Домати кг', was: 2.49 });
  assert.equal(town.products.tomato.Lidl.was, null);
  // A count above the number of stores and an endless name are cut to size.
  assert.equal(town.products.milk.Lidl.stores, 4);
  assert.equal(town.products.milk.Lidl.name.length, 80);
  // The reference is the middle of the chains, where at least two give a figure.
  assert.equal(town.reference.tomato, 2.69);
  assert.equal(town.reference.chicken, 3.09);
  assert.equal(town.reference.rice, undefined);

  for (const bad of [null, 'text', {}, { ...TOWN, v: 2 }, { ...TOWN, date: '12.11.2026' }, { ...TOWN, city: '10135' }])
    assert.throws(() => readMarket(bad), /Невалиден файл/);
  assert.throws(() => readMarket({ ...TOWN, products: { tomato: TOWN.products.tomato } }), /непълен/);
});

test('with a file for the town, prices, availability and the source follow it', () => {
  const before = marketVersion();
  setMarket(readMarket(TOWN));
  assert.ok(marketVersion() > before);
  assert.equal(chainPrice('tomato', 'BILLA'), 2.99);
  assert.equal(chainPrice('tomato', 'Kaufland'), undefined, 'no Kaufland in this town');
  assert.equal(chainInTown('Kaufland'), false);
  assert.equal(chainInTown('Lidl'), true);
  assert.equal(coverage('tomato', 'T MARKET'), 2 / 6);
  assert.equal(coverage('tomato', 'BILLA'), 0.9);
  assert.equal(referencePrice('tomato'), 2.69);
  assert.equal(referencePrice('rice'), PRODUCTS.rice[3], 'one chain is not a reference');
  assert.equal(referencePrice('spinach'), PRODUCTS.spinach[3]);
  assert.deepEqual(priceSource(), {
    name: PRICE_SOURCE.name,
    url: PRICE_SOURCE.url,
    place: 'Варна',
    date: '2026-11-12',
    shown: '12.11.2026',
    live: true,
  });

  // The cheapest chain wins only where the product is widely sold: T MARKET lists tomatoes
  // in 2 of its 6 stores, so the list sends the person to Lidl.
  const all = stateWith(['Lidl', 'BILLA', 'T MARKET']);
  assert.equal(storeOf('tomato', all), 'Lidl');
  assert.equal(packPrice('tomato', all), 2.69);
  // When it is the only chosen chain that has it, it is used and the price is its own.
  const small = stateWith(['T MARKET']);
  assert.equal(storeOf('tomato', small), 'T MARKET');
  assert.equal(packPrice('tomato', small), 1.99);
  // Today's promotion decides where the chicken is bought.
  assert.equal(storeOf('chicken', all), 'BILLA');
  assert.equal(packPrice('chicken', all), 2.85);
  // A chain without a figure gets the middle of the others; the person's own price beats both.
  assert.equal(priceIn('chicken', 'T MARKET'), 3.09);
  all.prices.chicken = 5;
  assert.equal(packPrice('chicken', all), 5);

  // The list and the saving are counted with the same prices.
  all.prices = {};
  all.plan = [{ id: 'chickenrice', day: 0, slot: 'Вечеря', people: 2 }];
  const rows = groceries(all);
  assert.equal(rows.find((r) => r.k === 'chicken').store, 'BILLA');
  assert.equal(rows.find((r) => r.k === 'rice').store, 'BILLA');
  assert.ok(shoppingSummary(all).fromMenu > 0);

  // Back to the snapshot: the choice of store is worked out again.
  setMarket(null);
  assert.equal(packPrice('tomato', stateWith(['Lidl', 'BILLA', 'T MARKET'])), Math.min(STORE_PRICES.tomato.Lidl, STORE_PRICES.tomato.BILLA, STORE_PRICES.tomato['T MARKET'] ?? Infinity));
});

test('the file is downloaded once a day, kept for offline and never trusted blindly', async () => {
  const storage = memory();
  assert.equal(cachedMarket(10135, storage), null);
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, options]);
    return { ok: true, status: 200, json: async () => TOWN };
  };
  const fresh = await downloadMarket(10135, fetcher);
  assert.deepEqual(calls, [['data/prices/10135.json', { cache: 'no-cache' }]]);
  assert.equal(fresh.market.place, 'Варна');
  storeMarket(fresh.raw, storage, '2026-11-13');
  const cached = cachedMarket(10135, storage);
  assert.equal(cached.fetched, '2026-11-13');
  assert.deepEqual(cached.market, fresh.market);
  // Another town does not get these prices.
  assert.equal(cachedMarket(68134, storage), null);
  // A damaged cache is ignored instead of breaking the start.
  storage.setItem(MARKET_KEY, '{"fetched":"2026-11-13","data":{"city":10135,"v":1}}');
  assert.equal(cachedMarket(10135, storage), null);
  storage.setItem(MARKET_KEY, 'not json');
  assert.equal(cachedMarket(10135, storage), null);

  await assert.rejects(downloadMarket(10135, answer(null, false, 404)), /Няма цени/);
  await assert.rejects(downloadMarket(68134, answer(TOWN)), /друго населено място/);
  await assert.rejects(downloadMarket(10135, answer({ v: 1 })), /Невалиден файл/);
  // A storage that refuses to write only means another download later.
  storeMarket(TOWN, { setItem: () => { throw Error('full'); } }, '2026-11-13');
});

test('the list of towns is checked and kept the same way', async () => {
  const raw = {
    v: 1,
    date: '2026-11-12',
    places: [
      [10135, 'Варна', 'Варна', 'Варна', { Lidl: 4, BILLA: 10 }],
      [151, 'Айтос', 'Айтос', 'Бургас', { Lidl: 1, Чужда: 9 }],
      ['x', 'Без код', '', '', { Lidl: 1 }],
      [5, '', '', '', { Lidl: 1 }],
      [6, 'Без вериги', '', '', { Чужда: 2 }],
      'not a row',
    ],
  };
  const places = readPlaces(raw);
  assert.deepEqual(places, [
    { code: 10135, name: 'Варна', municipality: 'Варна', region: 'Варна', stores: { Lidl: 4, BILLA: 10 } },
    { code: 151, name: 'Айтос', municipality: 'Айтос', region: 'Бургас', stores: { Lidl: 1 } },
  ]);
  assert.throws(() => readPlaces({ v: 1, places: [] }), /празен/);
  assert.throws(() => readPlaces({ places: [] }), /Невалиден списък/);
  const storage = memory();
  assert.equal(cachedPlaces(storage), null);
  assert.deepEqual(await downloadPlaces(storage, answer(raw)), places);
  assert.ok(storage.data.has(PLACES_KEY));
  assert.deepEqual(cachedPlaces(storage), places);
  await assert.rejects(downloadPlaces(storage, answer(null, false, 500)), /не се зареди/);
});

test('the town is a setting like the stores: old backups get София, a bad one is refused', () => {
  const backup = JSON.parse(JSON.stringify(defaults()));
  delete backup.settings.city;
  assert.equal(normalizeState(backup).settings.city, DEFAULT_CITY);
  backup.settings.city = 10135;
  assert.equal(normalizeState(backup).settings.city, 10135);
  for (const city of [0, -5, 1.5, '10135', 123456])
    assert.ok(settingsErrors({ ...defaults().settings, city }).includes('Избери населено място.'), String(city));
  assert.throws(() => normalizeState({ ...backup, settings: { ...backup.settings, city: 'София' } }), /невалидни настройки/);
});

test('the price files that ship with the site are what the app can read', () => {
  const dir = new URL('../docs/data/prices/', import.meta.url);
  const index = JSON.parse(fs.readFileSync(new URL('index.json', dir), 'utf8'));
  const places = readPlaces(index);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(index.date));
  assert.ok(places.length >= 80, `${places.length} towns`);
  assert.ok(places.some((p) => p.code === DEFAULT_CITY && p.name === 'София'));
  const files = fs.readdirSync(dir).filter((name) => name !== 'index.json');
  assert.deepEqual(files.map((name) => Number(name.replace('.json', ''))).sort((a, b) => a - b), places.map((p) => p.code).sort((a, b) => a - b));
  for (const place of places) {
    const raw = JSON.parse(fs.readFileSync(new URL(`${place.code}.json`, dir), 'utf8'));
    assert.equal(raw.date, index.date, place.name);
    assert.equal(raw.place, place.name);
    const town = readMarket(raw);
    assert.deepEqual(town.stores, place.stores, place.name);
    for (const [k, offers] of Object.entries(town.products)) {
      assert.ok(PRODUCTS[k], `${place.name}: ${k}`);
      for (const [chain, offer] of Object.entries(offers)) {
        assert.ok(STORES.includes(chain));
        assert.ok(offer.price > 0.05 && offer.price < 60, `${place.name} ${k} ${chain}: ${offer.price}`);
        assert.ok(offer.stores >= 1 && offer.stores <= offer.of, `${place.name} ${k} ${chain}`);
        assert.ok(offer.name.length > 2);
      }
    }
  }
  // София, the default town, has all six chains and most of the basket.
  const sofia = readMarket(JSON.parse(fs.readFileSync(new URL(`${DEFAULT_CITY}.json`, dir), 'utf8')));
  assert.deepEqual(Object.keys(sofia.stores), [...STORES]);
  assert.ok(Object.keys(sofia.products).length >= 38);
});
