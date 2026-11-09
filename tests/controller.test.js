import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, generatePlan, diaryEntry, recipe } from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import { boot } from './helpers/boot.js';

const state = defaults();
state.onboarded = true;
state.plan = generatePlan(state, seeded(11)).plan;
state.diary = [
  diaryEntry({ name: 'Кисело мляко', meal: 'Обяд', date: '2026-11-09', unit: 'г', basis: 100, amount: 200, kcal: 60, carbs: 4, fat: 3 }),
];

test('the real controller runs the week, the shopping list and the diary', async () => {
  const t = await boot({ state, hash: '#menu' });
  const { app, sheet, click, submit, change, saved, location, document } = t;

  // menu
  assert.equal(app.querySelectorAll('.meal').length, state.plan.length);
  await click('.meal [data-action="cooked"]');
  assert.equal(saved().cooked[0], true);
  await click('.meal-open');
  assert.ok(sheet.open);
  assert.ok(sheet.querySelector('.recipe [data-action="cook"]'));
  await click('servings', { index: '0', delta: '1' });
  assert.equal(saved().plan[0].people, state.plan[0].people + 1);
  assert.equal(sheet.querySelector('.servings b').textContent, String(state.plan[0].people + 1));
  await click('favorite', { id: state.plan[0].id });
  assert.deepEqual(saved().favorites, [state.plan[0].id]);
  await click('close-sheet');
  assert.equal(sheet.open, false);

  // swap one meal, then undo
  const before = saved().plan.map((e) => e.id);
  await click('swap', { index: '1' });
  const option = sheet.querySelector('[data-action="choose-swap"]');
  assert.ok(option);
  await click(`[data-action="choose-swap"][data-id="${option.dataset.id}"]`);
  assert.equal(saved().plan[1].id, option.dataset.id);
  await click('undo');
  assert.deepEqual(saved().plan.map((e) => e.id), before);

  // keep two meals, change the rest
  await click('new-menu');
  assert.ok(sheet.querySelector('[data-action="keep-start"]'));
  await click('keep-start');
  assert.ok(app.querySelector('.keep-bar'));
  await click('[data-action="keep-toggle"][data-index="0"]');
  await click('[data-action="keep-toggle"][data-index="2"]');
  await click('keep-apply');
  const after = saved().plan.map((e) => e.id);
  assert.equal(after[0], before[0]);
  assert.equal(after[2], before[2]);
  assert.ok(after.some((id, i) => ![0, 2].includes(i) && id !== before[i]), 'the rest changed');
  assert.ok([1, 3, 4].every((i) => after[i] !== before[i]), 'replaced meals are new');
  assert.equal(app.querySelector('.keep-bar'), null);

  // cook twice for tomorrow
  await click('meal-actions', { index: '0' });
  const twice = sheet.querySelector('[data-action="place-meal"][data-mode="repeat"]');
  assert.ok(twice);
  await click(`[data-action="place-meal"][data-mode="repeat"][data-to="${twice.dataset.to}"]`);
  assert.equal(saved().plan[Number(twice.dataset.to)].id, saved().plan[0].id);

  // shopping
  location.hash = '#shopping';
  await t.tick();
  assert.ok(app.querySelector('.store-sec'));
  const box = app.querySelector('[data-change="purchased"]');
  await change(box, true);
  assert.equal(saved().checked[box.dataset.id], true);
  await click('extra-add');
  const extra = sheet.querySelector('[data-form="extra"]');
  extra.querySelector('[name="name"]').value = 'Кафе';
  await submit('[data-form="extra"]');
  assert.equal(saved().extras[0].name, 'Кафе');
  await click('extra-edit', { id: saved().extras[0].id });
  await click('extra-delete', { id: saved().extras[0].id });
  assert.equal(saved().extras.length, 0);
  await click('extra-undo');
  assert.equal(saved().extras.length, 1);
  await click('grocery-edit', { id: box.dataset.id });
  sheet.querySelector('[name="price"]').value = '9.99';
  await submit('[data-form="grocery"]');
  assert.equal(saved().prices[box.dataset.id], 9.99);
  await click('shop-mode');
  assert.ok(app.querySelector('.shop'));
  await click('shop-mode');
  assert.equal(app.querySelector('.shop'), null);

  // pantry
  location.hash = '#pantry';
  await t.tick();
  const field = app.querySelector('[data-form="pantry"] input[name="potato"]');
  field.value = '5000';
  await submit('[data-form="pantry"]');
  assert.equal(saved().pantry.potato, 5000);
  assert.equal(location.hash, '#shopping');

  // diary
  location.hash = '#diary';
  await t.tick();
  await click('diary-jump', { date: '2026-11-09' });
  assert.match(app.textContent, /Кисело мляко/);
  await click('add-food', { meal: 'Вечеря' });
  assert.ok(sheet.querySelector('[data-action="pick-food"]'));
  await click('pick-food', { index: '0' });
  const food = sheet.querySelector('[data-form="food"]');
  assert.equal(food.dataset.id, undefined);
  assert.equal(food.querySelector('[name="carbs"]').value, '4');
  await submit('[data-form="food"]');
  assert.equal(saved().diary.length, 2);
  assert.equal(saved().diary[1].meal, 'Вечеря');
  const second = saved().diary[1].id;
  await click('entry', { id: second });
  assert.ok(sheet.querySelector('[data-action="delete-food"]'));
  await click('delete-food', { id: second });
  assert.equal(saved().diary.length, 1);
  await click('undo-diary');
  assert.equal(saved().diary.length, 2);
  await click('save-food', { id: second });
  assert.equal(saved().savedFoods.length, 1);
  await click('water', { count: '3' });
  assert.equal(saved().water['2026-11-09'], 3);
  await click('weight-form');
  sheet.querySelector('[name="kg"]').value = '72.4';
  await submit('[data-form="weight"]');
  assert.equal(saved().weights[0].kg, 72.4);

  // more
  location.hash = '#more';
  await t.tick();
  await click('reminder');
  await submit('[data-form="reminder"]');
  assert.ok(t.downloads.includes('na-masa-napomnyane.ics'));
  await click('backup');
  assert.ok(t.downloads.some((name) => /^na-masa-\d{4}-\d{2}-\d{2}\.json$/.test(name)));
  await click('reset');
  assert.ok(sheet.querySelector('[data-action="confirm-reset"]'));
  await click('close-sheet');
  assert.ok(saved().plan.length, 'nothing deleted without confirming');
  assert.ok(document.querySelector('#toast').textContent.length >= 0);
  assert.ok(recipe(saved().plan[0].id));
});
