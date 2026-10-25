import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, PRODUCTS } from '../docs/src/catalog.js';
import { nutrition } from '../docs/src/nutrition.js';
import {
  defaults,
  candidates,
  generatePlan,
  groceries,
  total,
  settingsErrors,
  normalizeState,
  diaryEntry,
  diaryTotals,
  isValidBarcode,
  recipeJSON,
  PLANS,
  localDate,
  daysBefore,
} from '../docs/src/domain.js';
import { loadState, parseBackup, saveState } from '../docs/src/storage.js';
import { esc } from '../docs/src/ui.js';
const rng = () => {
  let x = 71;
  return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32;
};
const planEntry = (id, day = 0, people = 2) => ({ id, day, people, slot: 'Вечеря' });
test('catalog is complete, unique, finite and exportable', () => {
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const r of RECIPES) {
    assert.ok(r.steps.length >= 2);
    assert.ok(Object.entries(r.ing).every(([k, n]) => PRODUCTS[k] && n > 0));
    assert.ok(nutrition(r).kcal > 0);
    assert.equal(recipeJSON(r)['@type'], 'Recipe');
    assert.equal(recipeJSON(r).recipeYield, '2 порции');
  }
});
test('strict vegan and allergy filters never admit forbidden ingredients', () => {
  const s = defaults();
  s.settings.diet = 'vegan';
  s.settings.allergens = ['gluten'];
  const p = generatePlan(s, rng());
  assert.ok(p.plan?.length);
  for (const e of p.plan) {
    const r = RECIPES.find((r) => r.id === e.id);
    assert.ok(
      Object.keys(r.ing).every((k) => !PRODUCTS[k][5] && !PRODUCTS[k][4].includes('gluten')),
    );
  }
});
test('equipment, protein, calorie and time are hard constraints', () => {
  for (const changes of [
    { goal: 'protein', maxCalories: 700 },
    { maxTime: 20 },
    { equipment: [] },
    { dislikes: ['rice', 'onion', 'cheese'] },
  ]) {
    const s = defaults();
    Object.assign(s.settings, changes);
    const pool = candidates(s.settings);
    const p = generatePlan(s, rng());
    if (!pool.length) {
      assert.equal(p.plan, null);
      continue;
    }
    assert.ok(p.plan.every((e) => pool.some((r) => r.id === e.id)));
    if (changes.goal)
      assert.ok(p.plan.every((e) => nutrition(RECIPES.find((r) => r.id === e.id)).protein >= 25));
  }
});
test('no match returns no plan and never relaxes filters', () => {
  const s = defaults();
  s.settings.diet = 'vegan';
  s.settings.goal = 'protein';
  s.settings.maxCalories = 100;
  const before = structuredClone(s);
  assert.equal(generatePlan(s, rng()).plan, null);
  assert.deepEqual(s, before);
});
test('14 meal slots preserve day, meal and servings, avoid repeats when possible', () => {
  const s = defaults();
  s.settings.days = 7;
  s.settings.slots = ['Обяд', 'Вечеря'];
  s.settings.people = 4;
  const p = generatePlan(s, rng());
  assert.equal(p.plan.length, 14);
  assert.equal(new Set(p.plan.map((e) => `${e.day}:${e.slot}`)).size, 14);
  assert.ok(p.plan.every((e) => e.people === 4));
  assert.equal(new Set(p.plan.map((e) => e.id)).size, 14);
});
test('package calculation aggregates before rounding and subtracts pantry once', () => {
  const s = defaults();
  s.plan = [planEntry('lentil'), planEntry('lentil', 1)];
  let row = groceries(s).find((r) => r.k === 'lentil');
  assert.equal(row.need, 360);
  assert.equal(row.packs, 1);
  s.pantry.lentil = 360;
  assert.equal(groceries(s).find((r) => r.k === 'lentil').packs, 0);
  s.pantry.lentil = 100;
  s.packSizes.lentil = 200;
  s.prices.lentil = 3;
  row = groceries(s).find((r) => r.k === 'lentil');
  assert.equal(row.missing, 260);
  assert.equal(row.packs, 2);
  assert.equal(row.cost, 6);
  assert.equal(row.left, 140);
});
test('household scaling is applied once; insufficient budget is reported', () => {
  const s = defaults();
  s.plan = [planEntry('lentil', 0, 4)];
  assert.equal(groceries(s).find((r) => r.k === 'lentil').need, 360);
  s.settings.budget = 1;
  const r = generatePlan(s, rng());
  assert.equal(r.withinBudget, false);
  assert.ok(r.cost > 1);
  assert.equal(r.cost, total(s, r.plan));
});
test('settings reject missing shops, fractional people and invalid limits', () => {
  for (const delta of [
    { stores: [] },
    { slots: [] },
    { people: 2.5 },
    { people: 0 },
    { days: 8 },
    { budget: NaN },
    { maxCalories: 50 },
    { diet: 'anything' },
    { equipment: ['made-up'] },
  ]) {
    assert.ok(settingsErrors({ ...defaults().settings, ...delta }).length);
  }
});
test('validated state round-trips without losing favorites, notes or diary', () => {
  const s = defaults();
  s.onboarded = true;
  s.plan = [planEntry('lentil')];
  s.favorites = ['lentil'];
  s.notes.lentil = '<script>text only</script>';
  s.diary = [
    diaryEntry({
      name: 'Кисело мляко',
      date: '2026-10-25',
      meal: 'Закуска',
      amount: 200,
      unit: 'г',
      kcal: 61,
      protein: 3.5,
    }),
  ];
  const restored = parseBackup(JSON.stringify({ app: 'na-masata', version: 3, state: s }));
  assert.deepEqual(restored.diary, s.diary);
  assert.equal(restored.notes.lentil, s.notes.lentil);
  assert.equal(restored.onboarded, true);
});
test('invalid backup fails atomically: duplicates, negative prices, dates, unknown recipes', () => {
  for (const change of [
    (s) => (s.plan = [planEntry('nope')]),
    (s) => (s.prices.rice = -1),
    (s) => (s.plan = [planEntry('lentil'), planEntry('lentil')]),
    (s) =>
      (s.diary = [
        { name: 'x', date: '2026-02-30', meal: 'Обяд', amount: 100, unit: 'г', kcal: 100 },
      ]),
  ]) {
    const s = defaults();
    change(s);
    assert.throws(() => normalizeState(s));
  }
});
test('unknown keys/prototype payloads cannot become state fields', () => {
  const s = defaults();
  s.evil = 'x';
  s.settings.evil = 'y';
  const result = normalizeState(s);
  assert.equal(result.evil, undefined);
  assert.equal(result.settings.evil, undefined);
  assert.throws(() => parseBackup('{"app":"other"}'));
});
test('local v1 data migrates; quota and malformed storage do not erase original', () => {
  const old = { ...defaults(), onboardingVersion: 2 };
  delete old.version;
  delete old.settings.goal;
  const storage = {
    getItem: (k) => (k === 'na-masata-v1' ? JSON.stringify(old) : null),
    setItem() {
      throw Error('quota');
    },
  };
  assert.equal(loadState(storage).state.settings.goal, 'balanced');
  assert.equal(loadState(storage).state.onboarded, true);
  assert.equal(saveState(storage, old), false);
  assert.ok(
    loadState({
      getItem() {
        throw Error('blocked');
      },
    }).warning,
  );
});
test('diary treats unknown protein as unknown; grams and portions calculate separately', () => {
  const e = diaryEntry({
    name: 'Тест',
    date: '2026-10-25',
    meal: 'Обяд',
    unit: 'г',
    amount: 250,
    basis: 100,
    kcal: 150,
    protein: '',
  });
  const r = diaryEntry({
    ...e,
    id: undefined,
    unit: 'порции',
    amount: 2,
    basis: 1,
    kcal: 400,
    protein: 30,
  });
  assert.deepEqual(diaryTotals([e, r]), { kcal: 1175, protein: 60, unknownProtein: 1 });
  for (const delta of [
    { amount: -1 },
    { kcal: NaN },
    { protein: -1 },
    { date: '2026-02-30' },
    { name: '' },
  ])
    assert.throws(() => diaryEntry({ ...e, ...delta }));
});
test('barcode validation includes checksum; escaping prevents HTML injection', () => {
  assert.equal(isValidBarcode('3017620422003'), true);
  assert.equal(isValidBarcode('3017620422004'), false);
  assert.equal(isValidBarcode('<script>'), false);
  assert.equal(esc('<img src=x onerror="a">'), '&lt;img src=x onerror=&quot;a&quot;&gt;');
});
test('billing amounts match requested monthly and annual totals', () => {
  assert.deepEqual(
    [PLANS.menu.monthly, PLANS.menu.yearly, PLANS.plus.monthly, PLANS.plus.yearly],
    [9, 90, 29, 290],
  );
});
test('calendar helpers use local calendar dates and cross month boundaries', () => {
  assert.equal(localDate(new Date(2026, 9, 25, 23, 59)), '2026-10-25');
  assert.equal(daysBefore('2026-03-01', 1), '2026-02-28');
});
