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
  assert.ok(RECIPES.length >= 500, `${RECIPES.length} recipes`);
  assert.equal(new Set(RECIPES.map((r) => r.name)).size, RECIPES.length, 'no two dishes share a name');
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length, 'no two dishes share an id');
  assert.ok(RECIPES.filter(isBreakfast).length >= 78);
  assert.ok(RECIPES.filter(isSoup).length >= 54);
  assert.ok(RECIPES.filter(isSalad).length >= 54);
  for (const r of RECIPES) {
    assert.ok(!(isSoup(r) && isSalad(r)), `${r.id} is both a soup and a salad`);
    assert.ok(r.steps.length >= 2 && r.steps.every((step) => step.length >= 12), `${r.id}: steps`);
    assert.match(foodArt(r), /<svg/, `${r.id} has a drawing`);
  }
  // Every way of eating keeps a wide choice of main dishes and of breakfasts.
  const least = { all: [422, 78], pescatarian: [250, 72], veggie: [208, 71], vegan: [119, 18], keto: [85, 18] };
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

test('the plant, keto and family batches keep the promises in their names', async () => {
  const { PLANT_2026_11 } = await import('../docs/src/recipes-2026-11-plant.js');
  const { KETO_2026_11 } = await import('../docs/src/recipes-2026-11-keto.js');
  const { FAMILY_2026_11 } = await import('../docs/src/recipes-2026-11-family.js');
  assert.ok(PLANT_2026_11.length >= 30 && KETO_2026_11.length >= 23 && FAMILY_2026_11.length >= 31);
  const vegan = new Set(candidates(settings({ diet: 'vegan' })).map((r) => r.id));
  for (const r of PLANT_2026_11) assert.ok(vegan.has(r.id), `${r.id} is not plant-only`);
  const keto = new Set(candidates(settings({ diet: 'keto' })).map((r) => r.id));
  for (const r of KETO_2026_11) {
    assert.ok(keto.has(r.id), `${r.id} is not keto`);
    assert.ok(nutrition(r).netCarbs <= 15, `${r.id}: ${nutrition(r).netCarbs} g net carbohydrates`);
  }
  // A sensory-friendly plate is short and plain: few products, no garlic, onion or hot spice.
  const gentle = FAMILY_2026_11.filter((r) => r.tags?.includes('sensory'));
  assert.ok(gentle.length >= 4);
  for (const r of gentle) {
    assert.ok(Object.keys(r.ing).length <= 8, `${r.id}: too many products`);
    for (const k of ['garlic', 'onion', 'chili', 'peppercorn', 'paprika'])
      assert.equal(r.ing[k], undefined, `${r.id} uses ${k}`);
  }
  for (const r of [...PLANT_2026_11, ...KETO_2026_11, ...FAMILY_2026_11]) {
    const n = nutrition(r);
    const breakfast = isBreakfast(r);
    assert.ok(n.kcal >= 250 && n.kcal <= (breakfast ? 650 : 900), `${r.id}: ${n.kcal} kcal`);
    if (breakfast) assert.ok(r.time <= 30, `${r.id}: a slow breakfast`);
    assert.ok(r.steps.every((step) => /[.!]$/.test(step)), `${r.id}: a step without an end`);
  }
  // A vegan household now gets a week of different breakfasts, soups and salads to choose from.
  const plant = candidates(settings({ diet: 'vegan' }));
  assert.ok(plant.filter(isBreakfast).length >= 13);
  assert.ok(plant.filter(isSoup).length >= 11);
  assert.ok(plant.filter(isSalad).length >= 12);
  const state = stateWith({ diet: 'vegan', days: 7, slots: ['Закуска', 'Обяд', 'Вечеря'], budget: 500 });
  const { plan } = generatePlan(state, seeded(4));
  const breakfasts = plan.filter((e) => e.slot === 'Закуска').map((e) => e.id);
  assert.ok(new Set(breakfasts).size >= 6, `${new Set(breakfasts).size} different vegan breakfasts in a week`);
  // And a keto household has soups and salads, not only meat on a plate.
  const low = candidates(settings({ diet: 'keto' }));
  assert.ok(low.filter(isSoup).length >= 4 && low.filter(isSalad).length >= 11);
});

test('the batches that bring the catalog to 500 keep their promises too', async () => {
  const { BG_2026_11 } = await import('../docs/src/recipes-2026-11-bg.js');
  const { PLANT_2026_11_B } = await import('../docs/src/recipes-2026-11-plant-b.js');
  const { PLANT_2026_11_C } = await import('../docs/src/recipes-2026-11-plant-c.js');
  const { KETO_2026_11_B } = await import('../docs/src/recipes-2026-11-keto-b.js');
  const { HOME_2026_11 } = await import('../docs/src/recipes-2026-11-home.js');
  const added = [...BG_2026_11, ...PLANT_2026_11_B, ...PLANT_2026_11_C, ...KETO_2026_11_B, ...HOME_2026_11];
  assert.equal(added.length, 150);
  assert.equal(RECIPES.length, 500);

  const vegan = new Set(candidates(settings({ diet: 'vegan' })).map((r) => r.id));
  for (const r of [...PLANT_2026_11_B, ...PLANT_2026_11_C]) assert.ok(vegan.has(r.id), `${r.id} is not plant-only`);
  const keto = new Set(candidates(settings({ diet: 'keto' })).map((r) => r.id));
  for (const r of KETO_2026_11_B) {
    assert.ok(keto.has(r.id), `${r.id} is not keto`);
    assert.ok(nutrition(r).netCarbs <= 15, `${r.id}: ${nutrition(r).netCarbs} g net carbohydrates`);
  }
  // Bulgarian cooking leads: the classics batch is Bulgarian almost to the last dish, and so
  // is the biggest share of the whole catalog.
  assert.ok(BG_2026_11.filter((r) => r.cuisine === 'bg').length >= 20);
  assert.ok(RECIPES.filter((r) => r.cuisine === 'bg').length >= 200);

  const gentle = HOME_2026_11.filter((r) => r.tags?.includes('sensory'));
  assert.equal(gentle.length, 6);
  for (const r of gentle) {
    assert.ok(Object.keys(r.ing).length <= 8, `${r.id}: too many products`);
    for (const k of ['garlic', 'onion', 'chili', 'peppercorn', 'paprika'])
      assert.equal(r.ing[k], undefined, `${r.id} uses ${k}`);
  }
  for (const r of added) {
    const n = nutrition(r);
    const breakfast = isBreakfast(r);
    assert.ok(n.kcal >= 250 && n.kcal <= (breakfast ? 650 : 900), `${r.id}: ${n.kcal} kcal`);
    if (breakfast) assert.ok(r.time <= 30, `${r.id}: a slow breakfast`);
    assert.ok(r.steps.length >= 3 && r.steps.every((step) => /[.!]$/.test(step)), `${r.id}: steps`);
    // A step never asks for something the shopping list does not have.
    for (const word of ['дафинов', 'босилек', 'майонеза', 'вино', 'бакпулвер', 'сода', 'мая'])
      assert.ok(!r.steps.some((step) => step.toLocaleLowerCase('bg').includes(word)), `${r.id} mentions ${word}`);
  }
  // A keto week of three meals a day is now a week of different dishes.
  const state = stateWith({ diet: 'keto', days: 7, slots: ['Закуска', 'Обяд', 'Вечеря'], budget: 600 });
  const { plan } = generatePlan(state, seeded(9));
  assert.equal(plan.length, 21);
  assert.ok(new Set(plan.filter((e) => e.slot === 'Закуска').map((e) => e.id)).size >= 6);
  assert.equal(new Set(plan.filter((e) => e.slot !== 'Закуска').map((e) => e.id)).size, 14);
});

test('pastry is drawn as pastry', () => {
  for (const id of ['banitsa', 'zelnik', 'leekbanitsa', 'panbanitsaphyllo']) {
    const art = foodArt(RECIPES.find((r) => r.id === id));
    assert.match(art, /stroke="#f1c577" stroke-width="4.4"/, `${id}: a coiled banitsa`);
  }
  assert.match(foodArt(RECIPES.find((r) => r.id === 'parlenkicheese')), /fill="#f3dcae" stroke="#dcb673"/);
  // Everything else keeps its own drawing.
  assert.doesNotMatch(foodArt(RECIPES.find((r) => r.id === 'shopska')), /#f1c577/);
});

test('a full week is searched quickly, however large the catalog', () => {
  // Seven days of three meals from 500 recipes: the heaviest search there is. Before the
  // lookups were indexed it took seconds; the bound is generous so that a slow machine passes.
  const state = stateWith({ days: 7, slots: ['Закуска', 'Обяд', 'Вечеря'], budget: 300 });
  generatePlan(state, seeded(1));
  const started = performance.now();
  const { plan } = generatePlan(state, seeded(2));
  const took = performance.now() - started;
  assert.equal(plan.length, 21);
  assert.ok(took < 1500, `the week took ${Math.round(took)} ms`);
});
