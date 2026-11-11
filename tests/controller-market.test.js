import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, localDate, recipe } from '../docs/src/domain.js';
import { MARKET_KEY, PLACES_KEY } from '../docs/src/market.js';
import { boot } from './helpers/boot.js';
import { TOWN, SMALL_TOWN, TOWNS } from './helpers/market-fixture.js';

const state = defaults();
state.onboarded = true;
state.settings = { ...state.settings, days: 2, slots: ['Вечеря'], stores: ['Lidl', 'BILLA', 'T MARKET'], city: 10135, budget: 200 };
state.plan = [
  { id: 'chickenrice', day: 0, slot: 'Вечеря', people: 2 },
  { id: 'shopska', day: 1, slot: 'Вечеря', people: 2 },
];
state.weekStart = localDate();

test('the real controller shows the town\'s prices, where a product is sold and lets the town change', async () => {
  // Today's file for Варна and the list of towns are already saved from an earlier visit.
  const t = await boot({
    state,
    hash: '#shopping',
    seed: { [MARKET_KEY]: { fetched: localDate(), data: TOWN }, [PLACES_KEY]: TOWNS },
  });
  const { app, sheet, click, saved, location, document, tick, data } = t;
  const toast = () => document.querySelector('#toast').textContent;

  // The list is priced for the town and says so; a promotion is marked on its row.
  assert.match(app.textContent, /по цените във Варна от 12\.11\.2026/);
  assert.match(app.textContent, /\(Варна, 12\.11\.2026\)/);
  assert.match(app.textContent, /не показват дали продуктът е на рафта в момента/);
  const chicken = [...app.querySelectorAll('.grow')].find((row) => row.querySelector('[data-id="chicken"]'));
  assert.ok(chicken.querySelector('.tag-deal'), 'the chicken is on promotion in BILLA today');
  assert.equal(chicken.closest('.store-sec').querySelector('h2').textContent, 'BILLA');
  // Tomatoes are cheapest in T MARKET, but only 2 of its 6 stores sell them: the list says Lidl.
  const tomato = [...app.querySelectorAll('.grow')].find((row) => row.querySelector('[data-id="tomato"]'));
  assert.equal(tomato.closest('.store-sec').querySelector('h2').textContent, 'Lidl');
  assert.equal(tomato.querySelector('.tag'), null);
  assert.match(app.querySelector('.saving').textContent, /1 продукт е в промоция днес: с 1,24\s€ под редовните им цени/);

  // The product sheet: each chosen chain with its price, the product behind it and its reach.
  await click('grocery-edit', { id: 'tomato' });
  const rows = [...sheet.querySelectorAll('.choice')].map((row) => row.textContent.replace(/\s+/g, ' '));
  assert.equal(rows.length, 3);
  assert.match(rows[0], /Lidl.*Домати на кг.*във всички 4 магазина.*2,69/);
  assert.match(rows[1], /BILLA.*Домати червени.*в 9 от 10 магазина.*2,99/);
  assert.match(rows[2], /T MARKET.*Домати кг.*в 2 от 6 магазина.*1,99.*промоция, иначе 2,49/);
  assert.match(sheet.textContent, /а не дали е на рафта в момента/);
  // Choosing T MARKET by hand keeps the choice and warns on the row that few stores sell it.
  const radio = sheet.querySelector('input[name="store"][value="T MARKET"]');
  for (const other of sheet.querySelectorAll('input[name="store"]')) other.removeAttribute('checked');
  radio.setAttribute('checked', '');
  sheet.querySelector('input[name="price"]').value = '1.99';
  await t.submit('[data-form="grocery"]');
  assert.equal(saved().storeFor.tomato, 'T MARKET');
  await click('close-sheet');
  const moved = [...app.querySelectorAll('.grow')].find((row) => row.querySelector('[data-id="tomato"]'));
  assert.equal(moved.closest('.store-sec').querySelector('h2').textContent, 'T MARKET');

  // With promotions in town, the new week can be built around them.
  await click('new-menu');
  assert.equal(sheet.querySelectorAll('[data-action="theme"]').length, 7);
  await click('[data-action="theme"][data-value="deals"]');
  await click('[data-action="regenerate"]');
  assert.equal(saved().plan.length, 2);
  assert.ok(saved().plan.every((e) => recipe(e.id).ing.chicken), 'both dinners use the chicken on promotion');
  assert.equal(toast().replace(/Върни$/, ''), 'Готово: „С промоциите“ за тази седмица.');

  // „Още“ names the town; the picker lists the saved towns and searches them.
  location.hash = '#more';
  await tick();
  assert.match(app.textContent, /Населено място\s*Варна · цени от 12\.11\.2026/);
  await click('city');
  assert.equal(sheet.querySelectorAll('[data-action="choose-city"]').length, 5);
  assert.equal(sheet.querySelector('.city-row.is-on b').textContent, 'Варна');
  assert.equal(sheet.querySelector('.city-row b').textContent, 'Варна', 'the chosen town leads the list');
  // Two places called Добрич are told apart by their municipality.
  const twins = [...sheet.querySelectorAll('.city-row')].filter((row) => row.querySelector('b').textContent === 'Добрич');
  assert.deepEqual(twins.map((row) => row.querySelector('small').textContent), ['община Димитровград, област Хасково', 'община Добрич, област Добрич']);
  const search = sheet.querySelector('[data-input="city-search"]');
  search.value = 'айт';
  search.dispatchEvent(new t.window.Event('input', { bubbles: true }));
  assert.deepEqual([...sheet.querySelectorAll('.city-row b')].map((b) => b.textContent), ['Айтос']);
  search.value = 'няма такова';
  search.dispatchEvent(new t.window.Event('input', { bubbles: true }));
  assert.match(sheet.querySelector('[data-city-list]').textContent, /Няма такова място/);

  // Moving to Айтос, where only Lidl has a store: the file comes from the site, the other
  // chains leave the settings and the person is told.
  location.protocol = 'https:';
  const asked = [];
  globalThis.fetch = async (url) => {
    asked.push(url);
    const body = url === 'data/prices/151.json' ? SMALL_TOWN : url === 'data/prices/index.json' ? TOWNS : null;
    return { ok: Boolean(body), status: body ? 200 : 404, json: async () => body };
  };
  await click('choose-city', { code: '151' });
  await tick(5);
  assert.deepEqual(asked, ['data/prices/151.json']);
  assert.equal(saved().settings.city, 151);
  assert.deepEqual(saved().settings.stores, ['Lidl']);
  assert.equal(toast(), 'Цените вече са за Айтос. Там няма BILLA и T MARKET.');
  assert.equal(JSON.parse(data.get(MARKET_KEY)).data.city, 151);
  assert.match(app.textContent, /Населено място\s*Айтос · цени от 12\.11\.2026/);
  location.hash = '#shopping';
  await tick();
  assert.match(app.textContent, /по цените в Айтос от 12\.11\.2026/);
  assert.deepEqual([...app.querySelectorAll('.store-sec h2')].map((h) => h.textContent).filter((name) => name !== 'И още за вкъщи'), ['Lidl']);

  // The setup shows the town above the chains and offers only the chains that are there.
  await click('wizard');
  const town = app.querySelector('.ob-city');
  assert.match(town.textContent, /Айтос.*цени от 12\.11\.2026.*Смени/);
  const chains = [...app.querySelectorAll('.ob-store')];
  assert.equal(chains.length, 6);
  assert.deepEqual(chains.filter((b) => !b.hasAttribute('disabled')).map((b) => b.getAttribute('aria-label')), ['Lidl']);
  assert.match(chains.find((b) => b.hasAttribute('disabled')).getAttribute('aria-label'), /няма магазин в Айтос/);
  // From the setup the picker opens the same way; a town without a file keeps the old prices.
  await click('city');
  assert.ok(sheet.querySelector('[data-city-sheet]'));
  await click('choose-city', { code: '72624' });
  await tick(5);
  assert.equal(saved().settings.city, 72624);
  assert.deepEqual(saved().settings.stores, ['Lidl']);
  assert.match(app.querySelector('.ob-city').textContent, /София/, 'no file for the town: the snapshot and its name');
  assert.equal(toast(), 'Цените за Добрич ще се заредят при връзка с интернет. Дотогава виждаш тези за София.');
});
