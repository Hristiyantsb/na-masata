import test from 'node:test';
import assert from 'node:assert/strict';
import { readMarket, setMarket } from '../docs/src/market.js';
import {
  defaults,
  recipe,
  generatePlan,
  shoppingSummary,
  groceries,
  isBreakfast,
  THEMES,
  themesNow,
  hasDeals,
  dealSaving,
  fitsTheme,
  DEAL_WORTH,
} from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import { RECIPES } from '../docs/src/catalog.js';
import { newMenuSheet, shoppingView } from '../docs/src/views.js';
import { TOWN } from './helpers/market-fixture.js';

// In the fixture town the chicken is on promotion in BILLA (2,85 € instead of 4,09 € for 500 g)
// and the tomatoes in T MARKET, which sells them in only 2 of its 6 stores.
const stateWith = (stores, extra = {}) => {
  const state = defaults();
  state.onboarded = true;
  state.settings = { ...state.settings, stores, days: 3, slots: ['Вечеря'], budget: 300, ...extra };
  return state;
};

test('a week of promotions is offered only while today\'s prices show some in the chosen chains', () => {
  setMarket(null);
  const all = stateWith(['Lidl', 'BILLA', 'T MARKET']);
  assert.equal(hasDeals(all), false, 'the bundled snapshot knows no promotions');
  assert.ok(!themesNow(all).includes('deals'));
  assert.equal(newMenuSheet(all).match(/data-action="theme"/g).length, 6);
  const none = generatePlan(all, seeded(1), { theme: 'deals' });
  assert.equal(none.plan, null);
  assert.match(none.reason, /Няма ястия за „С промоциите“/);

  setMarket(readMarket(TOWN));
  assert.equal(hasDeals(all), true);
  assert.deepEqual(themesNow(all), Object.keys(THEMES));
  const sheet = newMenuSheet(all, 'deals');
  assert.equal(sheet.match(/data-action="theme"/g).length, 7);
  assert.match(sheet, /theme-chip-wide" data-action="theme" data-value="deals" aria-pressed="true"/);
  // Lidl has no promotion in this town today.
  assert.equal(hasDeals(stateWith(['Lidl'])), false);
  setMarket(null);
});

test('a dish counts for the week when promotions take real money off it', () => {
  setMarket(readMarket(TOWN));
  const state = stateWith(['Lidl', 'BILLA', 'T MARKET']);
  const dish = recipe('chickenrice');
  // The chicken the dish uses, at the difference between the regular and the promotion price.
  const expected = (dish.ing.chicken / 500) * (4.09 - 2.85);
  assert.ok(Math.abs(dealSaving(dish, state) - expected) < 1e-9);
  assert.ok(expected >= DEAL_WORTH);
  assert.equal(fitsTheme(dish, 'deals', state), true);
  // Tomatoes are on promotion only in a chain that hardly sells them: the list buys them in
  // Lidl at the regular price, so a tomato salad is not a promotion dish.
  assert.equal(dealSaving(recipe('shopska'), state), 0);
  assert.equal(fitsTheme(recipe('shopska'), 'deals', state), false);
  // Breakfast is left alone, a price of the person's own is not a promotion, no state no claim.
  assert.equal(fitsTheme(RECIPES.find(isBreakfast), 'deals', state), true);
  assert.equal(dealSaving(dish, { ...state, prices: { chicken: 3 } }), 0);
  assert.equal(fitsTheme(dish, 'deals'), false);

  const { plan } = generatePlan(state, seeded(5), { theme: 'deals' });
  assert.equal(plan.length, 3);
  for (const e of plan) assert.ok(dealSaving(recipe(e.id), state) >= DEAL_WORTH, e.id);
  assert.equal(new Set(plan.map((e) => e.id)).size, 3);
  setMarket(null);
});

test('the list says how many products are on promotion and what that saves', () => {
  setMarket(readMarket(TOWN));
  const state = stateWith(['Lidl', 'BILLA', 'T MARKET']);
  state.plan = [
    { id: 'chickenrice', day: 0, slot: 'Вечеря', people: 2 },
    { id: 'shopska', day: 1, slot: 'Вечеря', people: 2 },
  ];
  const packs = groceries(state).find((row) => row.k === 'chicken').packs;
  const summary = shoppingSummary(state);
  assert.equal(summary.deals, 1);
  assert.equal(summary.dealSaving, Math.round(packs * (4.09 - 2.85) * 100) / 100);
  const html = shoppingView(state).replace(/&nbsp;|\s/g, ' ');
  assert.match(html, /1 продукт е в промоция днес: с <b>1,24 €<\/b> под редовните им цени\./);
  // With a price of their own for the chicken, nothing is claimed.
  state.prices.chicken = 2.85;
  assert.deepEqual([shoppingSummary(state).deals, shoppingSummary(state).dealSaving], [0, 0]);
  assert.doesNotMatch(shoppingView(state), /в промоция днес/);
  setMarket(null);
  assert.equal(shoppingSummary(state).deals, 0);
});
