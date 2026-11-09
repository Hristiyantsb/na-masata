import test from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES } from '../docs/src/catalog.js';
import { nutrition } from '../docs/src/nutrition.js';
import {
  defaults,
  candidates,
  generatePlan,
  isBreakfast,
  fitsSlot,
  forSlots,
  normalizeState,
  rearrangePlan,
  settingsErrors,
  DIETS,
} from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import { swapSheet, destinationSheet, filterRecipes, menuView, RECIPE_FILTERS } from '../docs/src/views.js';
import { foodArt } from '../docs/src/ui.js';
import { liveCount, relaxHints, stepTitle, LAST_STEP } from '../docs/src/onboarding.js';

const settings = (extra = {}) => ({
  ...defaults().settings,
  equipment: ['hob', 'oven', 'airfryer', 'microwave'],
  ...extra,
});
const weekWith = (extra) => {
  const state = defaults();
  state.onboarded = true;
  state.settings = settings(extra);
  state.plan = generatePlan(state, seeded(5)).plan;
  return state;
};

test('breakfasts are their own kind of dish, sized and timed for a morning', () => {
  const breakfasts = RECIPES.filter(isBreakfast);
  assert.ok(breakfasts.length >= 20);
  for (const r of breakfasts) {
    const n = nutrition(r);
    assert.ok(n.kcal >= 250 && n.kcal <= 650, `${r.id}: ${n.kcal} kcal`);
    assert.ok(r.time <= 30, r.id);
    assert.ok(fitsSlot(r, 'Закуска') && !fitsSlot(r, 'Обяд') && !fitsSlot(r, 'Вечеря'), r.id);
    assert.match(foodArt(r), /<svg/, 'every breakfast has a drawing');
  }
  const dinner = RECIPES.find((r) => !isBreakfast(r));
  assert.ok(fitsSlot(dinner, 'Вечеря') && !fitsSlot(dinner, 'Закуска'));
  assert.deepEqual(forSlots(breakfasts, ['Вечеря']), []);
  // Every way of eating has a real choice of breakfasts, never fewer than four.
  for (const diet of Object.keys(DIETS)) assert.ok(candidates(settings({ diet })).filter(isBreakfast).length >= 4, diet);
});

test('a week with breakfast puts breakfasts in the morning only, without repeats, and keeps every rule', () => {
  for (const diet of ['all', 'veggie', 'vegan', 'keto']) {
    const state = weekWith({ days: 7, slots: ['Закуска', 'Вечеря'], diet, budget: 400 });
    const allowed = new Set(candidates(state.settings).map((r) => r.id));
    assert.equal(state.plan.length, 14, diet);
    for (const e of state.plan) {
      const r = RECIPES.find((x) => x.id === e.id);
      assert.ok(allowed.has(e.id), `${diet}: ${e.id} breaks a rule`);
      assert.ok(fitsSlot(r, e.slot), `${diet}: ${e.id} served as ${e.slot}`);
    }
    const breakfasts = state.plan.filter((e) => e.slot === 'Закуска').map((e) => e.id);
    const dinners = state.plan.filter((e) => e.slot === 'Вечеря').map((e) => e.id);
    // Vegan and keto have four breakfasts each, so a seven-day week has to repeat some.
    const distinct = Math.min(7, candidates(state.settings).filter(isBreakfast).length);
    assert.equal(new Set(breakfasts).size, distinct, `${diet}: breakfasts as varied as the rules allow`);
    assert.equal(new Set(dinners).size, 7, `${diet}: dinners never repeat`);
  }
});

test('a rule that leaves no breakfast says so instead of serving dinner in the morning', () => {
  const state = defaults();
  state.settings = settings({ slots: ['Закуска', 'Вечеря'], diet: 'vegan', allergens: ['gluten', 'nuts', 'soy'] });
  const result = generatePlan(state, seeded(1));
  assert.equal(result.plan, null);
  assert.match(result.reason, /закуска/i);
  // The setup names the gap and offers the one change that does not touch the rules.
  const draft = { ...state.settings };
  assert.equal(liveCount(draft).count, 0);
  assert.equal(stepTitle(draft, LAST_STEP).title, 'Нито една закуска не пасва');
  assert.ok(relaxHints(draft).some((h) => h.label === 'Махни закуската от храненията' && h.gain > 0));
  state.settings.slots = ['Вечеря'];
  assert.ok(generatePlan(state, seeded(1)).plan, 'without breakfast the same rules still make a week');
});

test('saved plans, moves and swaps keep breakfasts and main dishes apart', () => {
  assert.deepEqual(settingsErrors(settings({ slots: ['Закуска', 'Обяд', 'Вечеря'] })), []);
  const state = weekWith({ days: 3, slots: ['Закуска', 'Вечеря'] });
  const morning = state.plan.findIndex((e) => e.slot === 'Закуска');
  const evening = state.plan.findIndex((e) => e.slot === 'Вечеря');
  assert.throws(() => rearrangePlan(state, morning, evening, 'move'), /Закуските/);
  assert.throws(() => rearrangePlan(state, morning, evening, 'repeat'), /Закуските/);
  const nextMorning = state.plan.findIndex((e, i) => i > morning && e.slot === 'Закуска');
  rearrangePlan(state, morning, nextMorning, 'move');

  // An edited backup with a breakfast in a dinner slot is refused like any other broken menu,
  // while the same backup as the app wrote it still loads.
  const raw = JSON.parse(JSON.stringify(state));
  assert.equal(normalizeState(raw).plan.length, state.plan.length);
  raw.plan[evening].id = raw.plan[morning].id;
  assert.throws(() => normalizeState(raw), /Невалидно ястие/);

  const swap = swapSheet(state, morning);
  const offered = [...swap.matchAll(/data-action="choose-swap"[^>]*data-id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(offered.length > 0);
  assert.ok(offered.every((id) => isBreakfast(RECIPES.find((r) => r.id === id))), 'a breakfast swaps for a breakfast');
  const places = destinationSheet(state, morning, 'move');
  const targets = [...places.matchAll(/data-to="(\d+)"/g)].map((m) => state.plan[Number(m[1])].slot);
  assert.ok(targets.length > 0 && targets.every((slot) => slot === 'Закуска'), 'a breakfast moves to another morning');
});

test('the menu and the recipe list speak about breakfasts', () => {
  const state = weekWith({ days: 5, slots: ['Закуска'] });
  assert.match(menuView(state), /5 закуски/);
  assert.ok(RECIPE_FILTERS.some(([key, label]) => key === 'breakfast' && label === 'Закуски'));
  const list = filterRecipes(state, '', 'breakfast');
  assert.ok(list.length >= 20 && list.every(isBreakfast));
  assert.ok(filterRecipes(state, 'овесена', 'all').some(isBreakfast));
});
