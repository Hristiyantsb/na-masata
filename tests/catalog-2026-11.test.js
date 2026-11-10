import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, PRODUCTS, EQUIPMENT, STORES } from '../docs/src/catalog.js';
import { AISLE, LARGE_ONLY } from '../docs/src/products-more.js';
import { NUTRIENTS, nutrition } from '../docs/src/nutrition.js';
import { STORE_PRICES } from '../docs/src/prices.js';
import {
  defaults,
  candidates,
  generatePlan,
  isBreakfast,
  isSoup,
  isSalad,
  shoppingSummary,
  groceries,
  DIETS,
} from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import { filterRecipes, recipesView, shoppingView, RECIPE_FILTERS } from '../docs/src/views.js';
import { foodArt } from '../docs/src/ui.js';

const settings = (extra = {}) => ({
  ...defaults().settings,
  equipment: Object.keys(EQUIPMENT),
  stores: [...STORES],
  ...extra,
});
const stateWith = (extra) => {
  const state = defaults();
  state.onboarded = true;
  state.settings = settings(extra);
  return state;
};

test('the catalog is large and every course has a real choice', () => {
  assert.ok(RECIPES.length >= 260, `${RECIPES.length} recipes`);
  assert.equal(new Set(RECIPES.map((r) => r.name)).size, RECIPES.length, 'no two dishes share a name');
  assert.ok(RECIPES.filter(isBreakfast).length >= 39);
  assert.ok(RECIPES.filter(isSoup).length >= 25);
  assert.ok(RECIPES.filter(isSalad).length >= 15);
  for (const r of RECIPES) {
    assert.ok(!(isSoup(r) && isSalad(r)), `${r.id} is both a soup and a salad`);
    assert.ok(r.steps.length >= 2 && r.steps.every((step) => step.length >= 12), `${r.id}: steps`);
    assert.match(foodArt(r), /<svg/, `${r.id} has a drawing`);
  }
  // Every way of eating keeps a wide choice of main dishes and of breakfasts.
  const least = { all: [220, 39], pescatarian: [120, 30], veggie: [90, 28], vegan: [50, 6], keto: [30, 8] };
  for (const diet of Object.keys(DIETS)) {
    const list = candidates(settings({ diet }));
    const mains = list.filter((r) => !isBreakfast(r)).length;
    const breakfasts = list.filter(isBreakfast).length;
    assert.ok(mains >= least[diet][0], `${diet}: ${mains} main dishes`);
    assert.ok(breakfasts >= least[diet][1], `${diet}: ${breakfasts} breakfasts`);
  }
});

test('every product can be bought, placed in an aisle and counted', () => {
  for (const [key, p] of Object.entries(PRODUCTS)) {
    assert.ok(p[0] && p[1] > 0 && p[3] > 0, `${key}: name, pack and price`);
    assert.ok(AISLE[key], `${key}: no aisle`);
    assert.ok(NUTRIENTS[key], `${key}: no nutrition`);
  }
  for (const key of LARGE_ONLY) assert.ok(PRODUCTS[key], `unknown large-store product ${key}`);
  // The products added for the new dishes are really used.
  for (const key of ['chickenleg', 'sauerkraut', 'pumpkin', 'orange', 'cornmeal', 'sugar', 'lutenitsa'])
    assert.ok(RECIPES.some((r) => r.ing[key]), `${key} is in no recipe`);
});

test('recipes can be browsed by course and found by a product', () => {
  const state = stateWith({});
  const keys = RECIPE_FILTERS.map(([key]) => key);
  assert.deepEqual(keys, ['all', 'fav', 'have', 'breakfast', 'soup', 'salad', 'quick']);
  const soups = filterRecipes(state, '', 'soup');
  assert.ok(soups.length >= 25 && soups.every(isSoup));
  const salads = filterRecipes(state, '', 'salad');
  assert.ok(salads.length >= 15 && salads.every(isSalad));
  assert.match(recipesView(state, '', 'soup'), /Супи/);

  // „спанак“ finds dishes that contain spinach even when the name does not say so.
  const withSpinach = filterRecipes(state, 'спанак', 'all');
  assert.ok(withSpinach.some((r) => !/спана/i.test(r.name) && r.ing.spinach), 'found by product');
  assert.ok(withSpinach.every((r) => /спана/i.test(r.name) || r.ing.spinach));
  // Two letters are too few to search products: only names are matched.
  assert.ok(filterRecipes(state, 'ор', 'all').every((r) => r.name.toLocaleLowerCase('bg').includes('ор')));
});

test('the shopping list says what the cheaper chain saves', () => {
  const two = stateWith({ stores: ['Lidl', 'BILLA'], days: 7, slots: ['Обяд', 'Вечеря'], budget: 300 });
  two.plan = generatePlan(two, seeded(3)).plan;
  const summary = shoppingSummary(two);
  assert.ok(summary.saving > 0, 'two chains, different prices');
  // The figure is the difference to doing the whole shop in the cheaper of the two chains.
  const rows = groceries(two).filter((row) => row.packs);
  const inOne = (store) =>
    rows.reduce((sum, row) => sum + row.packs * (STORE_PRICES[row.k]?.[store] ?? PRODUCTS[row.k][3]), 0);
  const cheapest = Math.min(inOne('Lidl'), inOne('BILLA'));
  assert.equal(summary.saving, Math.round((cheapest - summary.fromMenu) * 100) / 100);
  assert.equal(summary.savingAgainst, inOne('Lidl') <= inOne('BILLA') ? 'Lidl' : 'BILLA');
  assert.ok(summary.saving < summary.fromMenu, 'a saving, not a second bill');
  assert.match(shoppingView(two), /По-евтино с .* само от (Lidl|BILLA)/);

  const one = stateWith({ stores: ['Lidl'] });
  one.plan = generatePlan(one, seeded(3)).plan;
  assert.equal(shoppingSummary(one).saving, 0);
  assert.equal(shoppingSummary(one).savingAgainst, '');
  assert.doesNotMatch(shoppingView(one), /По-евтино с/);
});

test('a week of three meals a day keeps every rule for every way of eating', () => {
  for (const diet of Object.keys(DIETS)) {
    const state = stateWith({ diet, days: 7, slots: ['Закуска', 'Обяд', 'Вечеря'], budget: 500 });
    const { plan } = generatePlan(state, seeded(11));
    const allowed = new Set(candidates(state.settings).map((r) => r.id));
    assert.equal(plan.length, 21, diet);
    for (const e of plan) {
      assert.ok(allowed.has(e.id), `${diet}: ${e.id} breaks a rule`);
      const r = RECIPES.find((x) => x.id === e.id);
      assert.equal(isBreakfast(r), e.slot === 'Закуска', `${diet}: ${e.id} as ${e.slot}`);
      const n = nutrition(r);
      assert.ok(n.kcal >= 250 && n.kcal <= 900, `${e.id}: ${n.kcal} kcal`);
    }
    const mains = plan.filter((e) => e.slot !== 'Закуска').map((e) => e.id);
    assert.equal(new Set(mains).size, mains.length, `${diet}: no main dish twice in a week`);
  }
});
