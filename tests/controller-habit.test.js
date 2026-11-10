import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, generatePlan, recipe, localDate } from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import { boot } from './helpers/boot.js';

const state = defaults();
state.onboarded = true;
state.settings = { ...state.settings, days: 5, slots: ['Вечеря'], stores: ['Lidl', 'BILLA'], budget: 200 };
state.plan = generatePlan(state, seeded(21)).plan;
// A menu from before weeks were counted: no start date yet.
delete state.weekStart;

test('the real controller keeps the weekly habit: feedback, themes, a new week, sharing', async () => {
  const t = await boot({ state, hash: '#menu' });
  const { app, sheet, click, submit, saved, location, document } = t;
  const first = state.plan[0].id;

  // Cooking a dish asks once how it was; "do not offer again" hides it from future menus.
  await click('.meal [data-action="cooked"]');
  assert.equal(saved().cooked[0], true);
  assert.equal(saved().weekStart, localDate(), 'an older menu starts counting from today');
  assert.ok(sheet.open && sheet.querySelector('[data-action="feedback"][data-value="block"]'));
  await click('[data-action="feedback"][data-value="block"]');
  assert.deepEqual(saved().blocked, [first]);
  assert.deepEqual(saved().asked, [first]);
  assert.equal(sheet.open, false);
  // Un-cooking and cooking again does not ask a second time.
  await click('.meal [data-action="cooked"]');
  await click('.meal [data-action="cooked"]');
  assert.equal(sheet.open, false);
  assert.ok(app.querySelector('.progress-line'), 'one cooked dish is progress worth showing');

  // A liked dish becomes a favourite.
  await click('cooked', { index: '1' });
  await click('[data-action="feedback"][data-value="like"]');
  assert.deepEqual(saved().favorites, [state.plan[1].id]);

  // A themed week: quick dishes only, the hidden dish stays out, and the lived week is recorded.
  await click('new-menu');
  assert.equal(sheet.querySelectorAll('[data-action="theme"]').length, 6);
  await click('[data-action="theme"][data-value="quick"]');
  assert.equal(sheet.querySelector('[data-action="theme"][aria-pressed="true"]').dataset.value, 'quick');
  await click('[data-action="regenerate"]');
  const week = saved();
  assert.ok(week.plan.every((e) => recipe(e.id).time <= 30), 'everything is ready in half an hour');
  assert.ok(week.plan.every((e) => e.id !== first), 'the hidden dish is not offered');
  assert.deepEqual(week.cooked, {});
  assert.equal(week.history.length, 1, 'the week with cooked dinners went into the record');
  assert.equal(week.history[0].cooked, 2);
  assert.equal(week.weekStart, localDate());
  // Undo restores the old week and its record.
  await click('undo');
  assert.equal(saved().history.length, 0);
  assert.equal(saved().cooked[1], true);

  // Hiding from the "…" menu goes straight to choosing a replacement.
  await click('meal-actions', { index: '2' });
  const third = saved().plan[2].id;
  await click(`[data-action="block-recipe"][data-id="${third}"]`);
  assert.ok(saved().blocked.includes(third));
  assert.ok(sheet.querySelector('[data-action="choose-swap"]'));
  assert.equal(sheet.querySelector(`[data-action="choose-swap"][data-id="${third}"]`), null);
  await click('close-sheet');

  // Hidden dishes can be brought back from "Още".
  location.hash = '#more';
  await t.tick();
  await click('blocked-list');
  assert.equal(sheet.querySelectorAll('[data-action="unblock-recipe"]').length, 2);
  await click(`[data-action="unblock-recipe"][data-id="${third}"]`);
  assert.deepEqual(saved().blocked, [first]);
  await click('close-sheet');
  await click('progress');
  assert.match(sheet.textContent, /Твоят напредък/);
  await click('close-sheet');

  // The list goes to the phone's share sheet; without one it is copied.
  const shared = [];
  globalThis.navigator.share = async (data) => shared.push(data);
  location.hash = '#shopping';
  await t.tick();
  await click('share-shopping');
  await t.tick(5);
  assert.equal(shared.length, 1);
  assert.match(shared[0].text, /На маса · списък за пазаруване/);
  assert.match(shared[0].text, /Lidl|BILLA/);
  await click('share-recipe', { id: saved().plan[1].id, people: '4' });
  await t.tick(5);
  assert.match(shared[1].text, /Съставки[\s\S]+Приготвяне[\s\S]+1\. /);
  assert.match(shared[1].text, /4 порции/);

  // "Имам" fills in an amount; saving subtracts it from the list.
  location.hash = '#pantry';
  await t.tick();
  const have = app.querySelector('[data-action="pantry-have"]');
  const id = have.dataset.id;
  await click(`[data-action="pantry-have"][data-id="${id}"]`);
  assert.equal(app.querySelector(`input[name="${id}"]`).value, have.dataset.amount);
  await submit('[data-form="pantry"]');
  assert.equal(saved().pantry[id], Number(have.dataset.amount));

  // Recipes: what can be cooked from what is at home.
  location.hash = '#recipes';
  await t.tick();
  await click('recipe-filter', { filter: 'have' });
  assert.ok(app.querySelector('[data-recipe-grid]'));
  assert.ok(document.querySelector('#toast'));
});
