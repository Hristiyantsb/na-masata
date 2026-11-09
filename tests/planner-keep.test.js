import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, candidates, generatePlan } from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';

const settings = (extra = {}) => ({
  ...defaults().settings,
  equipment: ['hob', 'oven', 'airfryer', 'microwave'],
  ...extra,
});
test('keep these, change the rest: kept dishes stay, the others change and still keep every rule', () => {
  const state = defaults();
  state.settings = settings();
  state.plan = generatePlan(state, seeded(7)).plan;
  const before = state.plan.map((e) => e.id);
  const result = generatePlan(state, seeded(8), { keep: [0, 3] });
  const after = result.plan.map((e) => e.id);
  assert.equal(after[0], before[0]);
  assert.equal(after[3], before[3]);
  for (const i of after.keys()) if (![0, 3].includes(i)) assert.notEqual(after[i], before[i], `meal ${i} changed`);
  const allowed = new Set(candidates(state.settings).map((r) => r.id));
  assert.ok(after.every((id) => allowed.has(id)));
  assert.equal(new Set(after).size, after.length, 'still no repeats');
  // A kept dish that breaks a new rule is replaced, never forced into the week.
  state.settings = { ...state.settings, diet: 'vegan' };
  const vegan = generatePlan(state, seeded(9), { keep: [0, 1, 2, 3, 4] });
  const veganAllowed = new Set(candidates(state.settings).map((r) => r.id));
  assert.ok(vegan.plan.every((e) => veganAllowed.has(e.id)));
});
