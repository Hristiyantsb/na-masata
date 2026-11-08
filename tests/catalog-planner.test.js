import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { RECIPES, PRODUCTS, EQUIPMENT, MEAT, SEAFOOD } from '../docs/src/catalog.js';
import { NUTRIENTS, nutrition } from '../docs/src/nutrition.js';
import { LARGE_ONLY, AISLE, AISLES } from '../docs/src/products-more.js';
import {
  defaults,
  candidates,
  generatePlan,
  explainEntry,
  mainProtein,
  normalizeState,
  weightEntry,
  withWeight,
  KETO_NET_CARBS,
  LOWCARB_NET_CARBS,
  DIETS,
} from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import { stepMinutes, shoppingView } from '../docs/src/views.js';

const settings = (extra = {}) => ({
  ...defaults().settings,
  equipment: ['hob', 'oven', 'airfryer', 'microwave'],
  ...extra,
});

test('every recipe is complete, uses known products and has a sane portion', () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), 'duplicate ' + r.id);
    ids.add(r.id);
    assert.ok(r.name && r.type && r.time > 0 && r.steps.length >= 2, r.id);
    assert.ok(
      r.equipment.every((k) => EQUIPMENT[k]),
      r.id,
    );
    for (const k of Object.keys(r.ing)) assert.ok(PRODUCTS[k] && NUTRIENTS[k], `${r.id}: ${k}`);
    for (const tag of r.tags || []) assert.ok(['kids', 'sensory'].includes(tag), r.id);
    const n = nutrition(r);
    assert.ok(n.kcal >= 250 && n.kcal <= 900, `${r.id} ${n.kcal} kcal`);
  }
  assert.ok(RECIPES.length >= 110);
  for (const k of Object.keys(PRODUCTS)) assert.ok(AISLE[k], 'aisle for ' + k);
});

test('every diet and need has a real choice of recipes', () => {
  for (const diet of Object.keys(DIETS))
    assert.ok(candidates(settings({ diet })).length >= 15, diet);
  for (const need of ['kids', 'sensory', 'lowcarb'])
    assert.ok(candidates(settings({ needs: [need] })).length >= 15, need);
});

test('diet and need rules are exact and never relaxed', () => {
  for (const r of candidates(settings({ diet: 'vegan' })))
    assert.ok(
      Object.keys(r.ing).every((k) => !PRODUCTS[k][5]),
      r.id,
    );
  for (const r of candidates(settings({ diet: 'veggie' })))
    assert.ok(
      Object.keys(r.ing).every((k) => !MEAT.includes(k) && !SEAFOOD.includes(k)),
      r.id,
    );
  for (const r of candidates(settings({ diet: 'pescatarian' })))
    assert.ok(
      Object.keys(r.ing).every((k) => !MEAT.includes(k)),
      r.id,
    );
  for (const r of candidates(settings({ diet: 'keto' })))
    assert.ok(nutrition(r).netCarbs <= KETO_NET_CARBS, r.id);
  for (const r of candidates(settings({ needs: ['lowcarb'] })))
    assert.ok(nutrition(r).netCarbs <= LOWCARB_NET_CARBS, r.id);
  for (const r of candidates(settings({ needs: ['sensory'] })))
    assert.ok(r.tags?.includes('sensory'), r.id);
  for (const r of candidates(settings({ needs: ['kids'] }))) assert.ok(!r.ing.chili, r.id);
  for (const r of candidates(settings({ allergens: ['shellfish', 'sesame'] })))
    assert.ok(!r.ing.shrimp && !r.ing.tahini && !r.ing.sesame, r.id);
});

test('a neighbourhood-store-only shopper gets no big-store products', () => {
  const list = candidates(settings({ stores: ['T MARKET'] }));
  assert.ok(list.length >= 40);
  for (const r of list)
    assert.ok(
      Object.keys(r.ing).every((k) => !LARGE_ONLY.includes(k)),
      r.id,
    );
  assert.ok(candidates(settings({ stores: ['T MARKET', 'Lidl'] })).length > list.length);
});

test('planner is reproducible, keeps every hard rule and never repeats a dish when it can avoid it', () => {
  const state = defaults();
  state.settings = settings({ days: 7, slots: ['Обяд', 'Вечеря'], diet: 'pescatarian' });
  const a = generatePlan(state, seeded(3)),
    b = generatePlan(state, seeded(3));
  assert.deepEqual(a.plan, b.plan);
  const allowed = new Set(candidates(state.settings).map((r) => r.id));
  assert.ok(a.plan.every((e) => allowed.has(e.id)));
  assert.equal(new Set(a.plan.map((e) => e.id)).size, 14);
  const families = a.plan.map((e) => mainProtein(RECIPES.find((r) => r.id === e.id)));
  assert.ok(
    families.some((f) => f === 'fish' || f === 'seafood'),
    'fish for a pescatarian',
  );
  assert.ok(new Set(families).size >= 4, 'varied main proteins');
});

test('every planned meal explains itself in at most three short reasons', () => {
  const state = defaults();
  state.settings = settings({ goal: 'protein' });
  state.plan = generatePlan(state, seeded(9)).plan;
  for (let i = 0; i < state.plan.length; i++) {
    const reasons = explainEntry(state, i);
    assert.ok(reasons.length >= 1 && reasons.length <= 3);
    assert.match(reasons[0], /протеин/);
  }
});

test('weight and water entries are validated and kept per day', () => {
  assert.throws(() => weightEntry({ date: '2026-11-08', kg: 5 }));
  assert.throws(() => weightEntry({ date: 'вчера', kg: 70 }));
  let list = withWeight([], { date: '2026-11-08', kg: 80.04 });
  list = withWeight(list, { date: '2026-11-01', kg: 81 });
  list = withWeight(list, { date: '2026-11-08', kg: 79.5 });
  assert.deepEqual(list, [
    { date: '2026-11-01', kg: 81 },
    { date: '2026-11-08', kg: 79.5 },
  ]);
  const raw = { ...defaults(), weights: list, water: { '2026-11-08': 6 } };
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(raw))).water, { '2026-11-08': 6 });
  assert.throws(() => normalizeState({ ...defaults(), water: { '2026-11-08': 99 } }));
});

test('cooking timers read the minutes written in a step', () => {
  assert.equal(stepMinutes('Вари 25–30 минути до омекване.'), 30);
  assert.equal(stepMinutes('Печи 2,5 часа на 170°C.'), 150);
  assert.equal(stepMinutes('Разбъркай 30 секунди.'), 0);
  assert.equal(stepMinutes('Сервирай веднага.'), 0);
});

test('the shopping list follows the store from produce to spices', () => {
  const state = defaults();
  state.settings = settings();
  state.plan = generatePlan(state, seeded(5)).plan;
  const doc = parseHTML('<html><body>' + shoppingView(state) + '</body></html>').document;
  const order = [...doc.querySelectorAll('.aisle-heading')].map((h) =>
    Object.values(AISLES).indexOf(h.textContent),
  );
  assert.ok(order.length >= 3);
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
  assert.ok(doc.querySelector('.cart-progress'));
});
