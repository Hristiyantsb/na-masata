import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, diaryEntry, normalizeState } from '../docs/src/domain.js';
import {
  nutritionTotals,
  foodHistory,
  copiesForDates,
  weekDates,
  parseAdiosExport,
} from '../docs/src/fitness.js';
import { foodForm } from '../docs/src/views.js';
import { foodPicker } from '../docs/src/fitness-views.js';
import { normalizeProduct } from '../server/products.js';
const entry = (more = {}) =>
  diaryEntry({
    name: 'Кисело мляко',
    date: '2026-10-26',
    meal: 'Закуска',
    amount: 250,
    basis: 100,
    unit: 'г',
    kcal: 60,
    protein: 4,
    carbs: 5,
    fat: 3,
    ...more,
  });
test('nutrition scales each basis; null is distinct from zero', () => {
  const t = nutritionTotals([
    entry(),
    entry({ amount: 2, basis: 1, unit: 'порции', carbs: null, fat: 0 }),
  ]);
  assert.equal(t.kcal, 270);
  assert.equal(t.known.carbs, 12.5);
  assert.equal(t.missing.carbs, 1);
  assert.equal(t.known.fat, 7.5);
  assert.equal(t.missing.fat, 0);
  assert.equal(t.missing.fiber, 2);
  for (const kcal of ['', null, undefined, NaN, -1]) assert.throws(() => entry({ kcal }));
  assert.throws(() => entry({ sodium: -1 }));
  assert.throws(() => entry({ basis: 1 }));
});
test('older v3 states migrate additive fields without losing food IDs; backup roundtrip keeps all nutrients', () => {
  const s = defaults();
  s.diary = [entry({ fiber: 3, sodium: 50, sugars: 4, saturatedFat: 1 })];
  s.savedFoods = [entry()];
  s.macroTargets = { protein: 100, carbs: 200, fat: 50 };
  const restored = normalizeState(JSON.parse(JSON.stringify(s)));
  for (const k of ['diary', 'savedFoods', 'macroTargets']) assert.deepEqual(restored[k], s[k]);
  delete s.macroTargets;
  delete s.savedFoods;
  delete s.diary[0].carbs;
  const migrated = normalizeState(s);
  assert.equal(migrated.diary[0].carbs, null);
  assert.equal(migrated.diary[0].id, s.diary[0].id);
  assert.deepEqual(migrated.savedFoods, []);
});
test('history is unique but does not collapse distinct brands or nutrient profiles', () => {
  const a = entry(),
    b = entry({ brand: 'Друга марка' }),
    c = entry({ carbs: 6 });
  assert.equal(foodHistory([a, b, c, a]).length, 3);
  assert.equal(foodHistory([a, b], 'марка')[0].id, b.id);
});
test('copy multiple dates makes independent IDs, deduplicates dates, preserves portions and validates calendar', () => {
  const e = entry({ basis: 1, unit: 'порции', amount: 0.5 });
  const copy = copiesForDates([e], ['2026-12-31', '2027-01-01', '2027-01-01'], 'Вечеря');
  assert.equal(copy.length, 2);
  assert.equal(new Set([e, ...copy].map((v) => v.id)).size, 3);
  assert.equal(copy[0].carbs, 5);
  assert.equal(copy[0].amount, 0.5);
  assert.equal(copy[0].meal, 'Вечеря');
  assert.throws(() => copiesForDates([e], ['2026-02-30']));
  assert.throws(() => copiesForDates([e], []));
  assert.deepEqual(weekDates('2027-01-01'), [
    '2026-12-28',
    '2026-12-29',
    '2026-12-30',
    '2026-12-31',
    '2027-01-01',
    '2027-01-02',
    '2027-01-03',
  ]);
});
test('adios API JSON import converts numeric strings without inventing gram weights or missing nutrients', () => {
  const source = {
    name: 'Ябълка',
    meal: 'snacks',
    loggedDate: '2026-10-26',
    numberOfServings: '1.5',
    caloriesPerServing: '80.00',
    carbsPerServing: '20.00',
    proteinPerServing: '0',
    servingLabel: '1 medium',
  };
  const [e] = parseAdiosExport(JSON.stringify({ items: [source] }));
  assert.equal(e.meal, 'Междинно');
  assert.equal(e.unit, 'порции');
  assert.equal(e.amount, 1.5);
  assert.equal(e.carbs, 20);
  assert.equal(e.fat, null);
  assert.equal(nutritionTotals([e]).kcal, 120);
  assert.throws(() => parseAdiosExport(JSON.stringify([source, { ...source, meal: 'invalid' }])));
  assert.throws(() => parseAdiosExport(JSON.stringify([{ ...source, caloriesPerServing: null }])));
});
test('OFF normalization converts sodium grams to mg and keeps missing nutrition unknown', () => {
  const p = normalizeProduct(
    {
      product: {
        product_name_bg: 'Мляко',
        brands: 'Марка',
        serving_size: '1 cup',
        nutriments: { 'energy-kj_100g': 418.4, sodium_100g: 0.12, carbohydrates_100g: 0 },
      },
    },
    '3800000000000',
  );
  assert.equal(p.kcal, 100);
  assert.equal(p.sodium, 120);
  assert.equal(p.carbs, 0);
  assert.equal(p.fat, null);
  assert.equal(p.basis, 100);
  assert.equal(p.unitNeedsConfirmation, true);
  assert.equal(p.servingLabel, '1 cup');
});
test('new-from-history forms do not accidentally edit originals; text is escaped', () => {
  const e = entry({ name: '<img src=x onerror=alert(1)>', brand: '"<script>' });
  const html = foodForm(e.date, e.meal, { ...e, id: undefined });
  assert.doesNotMatch(html, /data-id=/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /name="carbs"/);
  const s = defaults();
  s.savedFoods = [e];
  assert.doesNotMatch(foodPicker(s, e.date, e.meal, 'saved'), /<script>/);
});

test('macro energy shares use 4/4/9 and require complete, nonnegative data', async () => {
  const { macroEnergyShares } = await import('../docs/src/fitness.js');
  assert.deepEqual(macroEnergyShares({ protein: 10, carbs: 10, fat: 0 }), {
    protein: 50,
    carbs: 50,
    fat: 0,
  });
  assert.equal(macroEnergyShares({ protein: 10, carbs: null, fat: 0 }), null);
  assert.equal(macroEnergyShares({ protein: 0, carbs: 0, fat: 0 }), null);
  assert.equal(macroEnergyShares({ protein: -1, carbs: 1, fat: 1 }), null);
  const result = macroEnergyShares({ protein: 10, carbs: 10, fat: 10 });
  assert.ok(Math.abs(result.fat - 9000 / 170) < 0.0001);
});
