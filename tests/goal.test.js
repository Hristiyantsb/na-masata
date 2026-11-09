import test from 'node:test';
import assert from 'node:assert/strict';
import { calorieGoal, profileEntry, normalizeState, defaults, CALORIE_FLOOR } from '../docs/src/domain.js';
import { goalSheet, goalPreview } from '../docs/src/diary-views.js';

const woman = { sex: 'female', age: 35, height: 165, weight: 70, activity: 'light', goal: 'lose', pace: 0.5 };

test('the goal follows Mifflin-St Jeor, activity and the chosen pace', () => {
  const g = calorieGoal(woman);
  // 10*70 + 6.25*165 - 5*35 - 161 = 1395.25; x1.375 = 1918; minus 550 for 0.5 kg a week
  assert.equal(g.bmr, 1395);
  assert.equal(g.maintenance, 1920);
  assert.equal(g.change, -550);
  assert.equal(g.target, 1370);
  assert.equal(g.floorApplied, false);
  assert.deepEqual(g.macros, { protein: 69, carbs: 171, fat: 46 });
  const man = calorieGoal({ sex: 'male', age: 30, height: 180, weight: 85, activity: 'moderate', goal: 'keep' });
  // 850 + 1125 - 150 + 5 = 1830; x1.55 = 2836.5
  assert.equal(man.target, 2840);
  assert.equal(man.change, 0);
  const gain = calorieGoal({ ...woman, goal: 'gain', pace: 0.25 });
  assert.equal(gain.change, 275);
});

test('never below a safe floor, never for children, never with missing numbers', () => {
  const small = calorieGoal({ sex: 'female', age: 60, height: 150, weight: 50, activity: 'sedentary', goal: 'lose', pace: 0.75 });
  assert.equal(small.target, CALORIE_FLOOR.female);
  assert.equal(small.floorApplied, true);
  assert.throws(() => calorieGoal({ ...woman, age: 16 }), /18/);
  assert.throws(() => calorieGoal({ ...woman, sex: '' }), /пол/);
  assert.throws(() => calorieGoal({ ...woman, height: 300 }), /Ръстът/);
  assert.throws(() => calorieGoal({ ...woman, goal: 'gain', pace: 0.75 }), /темпо/);
  assert.match(goalPreview({ ...woman, age: '' }), /Попълни/);
  assert.match(goalPreview({ ...woman, age: 16 }), /лекар/);
  assert.match(goalPreview(woman), /1\s?370/);
});

test('the profile survives a backup and a broken one is refused', () => {
  const state = defaults();
  state.profile = profileEntry(woman);
  const back = normalizeState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(back.profile, state.profile);
  assert.equal(normalizeState({ ...defaults(), profile: undefined }).profile, null);
  assert.throws(() => normalizeState({ ...defaults(), profile: { ...woman, age: 5 } }), /дневната цел/);
});

test('the goal sheet offers the calculator and the manual number', () => {
  const html = goalSheet(defaults(), 'calc');
  assert.match(html, /data-form="goal-calc"/);
  assert.match(html, /не медицински съвет/);
  assert.equal((html.match(/name="activity"/g) || []).length, 4);
  assert.match(goalSheet(defaults(), 'manual'), /data-form="target"/);
});
