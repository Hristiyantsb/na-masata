import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, candidates } from '../docs/src/domain.js';
import { PRODUCTS } from '../docs/src/catalog.js';
import { nutrition } from '../docs/src/nutrition.js';
import { previewRecipes, onboardingView, STEPS, LAST_STEP } from '../docs/src/onboarding.js';

test('first value is real recipes, limited to five and stable', () => {
  const s = defaults().settings;
  const first = previewRecipes(s);
  assert.ok(first.length > 0 && first.length <= 5);
  assert.deepEqual(first.map((r) => r.id), previewRecipes(s).map((r) => r.id));
  assert.ok(first.every((r) => candidates(s).some((item) => item.id === r.id)));
  assert.equal(new Set(first.map((r) => r.id)).size, first.length);
});
test('preview respects all hard restrictions', () => {
  const s = defaults().settings;
  s.diet = 'vegan';
  s.allergens = ['gluten', 'nuts'];
  s.equipment = [];
  for (const r of previewRecipes(s)) {
    for (const k of Object.keys(r.ing)) {
      assert.ok(!PRODUCTS[k][5], r.name);
      assert.ok(!PRODUCTS[k][4].some((a) => s.allergens.includes(a)), r.name);
    }
    assert.equal(r.equipment.length, 0);
  }
});
test('onboarding does not pretend that checkout is live', () => {
  const s = defaults().settings;
  assert.equal(STEPS.length, 8);
  assert.match(onboardingView(s, 0), /Какво ще ядем тази седмица\?/);
  assert.match(onboardingView(s, LAST_STEP), /data-action="wizard-recipe"/);
  for (let i = 0; i < STEPS.length; i++) {
    const html = onboardingView(s, i);
    assert.doesNotMatch(html, /data-action="checkout"|абонамент|пробен период/i);
  }
});
test('calorie cap removes heavier recipes from the preview', () => {
  const s = defaults().settings;
  s.maxCalories = 400;
  for (const r of previewRecipes(s)) assert.ok(nutrition(r).kcal <= 400, r.name);
});
