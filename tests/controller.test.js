import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { defaults, diaryEntry } from '../docs/src/domain.js';
import { STORAGE_KEY } from '../docs/src/storage.js';
test('actual controller wires diary picker, save/reuse/copy/clear/undo and existing grocery actions', async () => {
  const { document, window } = parseHTML(
    '<html><body><div id="app"></div><dialog id="dialog"></dialog><div id="toast"></div></body></html>',
  );
  const state = defaults();
  state.onboarded = true;
  state.diary = [
    diaryEntry({
      name: 'Кисело мляко',
      meal: 'Обяд',
      date: '2026-10-26',
      unit: 'г',
      basis: 100,
      amount: 200,
      kcal: 60,
      carbs: 4,
      fat: 3,
    }),
  ];
  const data = new Map([[STORAGE_KEY, JSON.stringify(state)]]);
  const localStorage = {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
  Object.assign(globalThis, {
    document,
    window,
    location: { hash: '#diary' },
    localStorage,
    CustomEvent: window.CustomEvent,
  });
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  window.localStorage = localStorage;
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: false });
  const dialog = document.getElementById('dialog');
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
  };
  const realTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ms) => {
    const t = realTimeout(fn, ms);
    t.unref?.();
    return t;
  };
  const NativeFormData = globalThis.FormData;
  globalThis.FormData = class {
    constructor(form) {
      this.pairs = [...form.querySelectorAll('input[name],select[name],textarea[name]')]
        .filter((e) => !['checkbox', 'radio'].includes(e.type) || e.checked)
        .map((e) => [
          e.name,
          e.tagName === 'SELECT'
            ? (e.querySelector('option[selected]') || e.querySelector('option')).textContent
            : e.value,
        ]);
    }
    get(name) {
      return this.pairs.find(([k]) => k === name)?.[1] ?? null;
    }
    getAll(name) {
      return this.pairs.filter(([k]) => k === name).map(([, v]) => v);
    }
    [Symbol.iterator]() {
      return this.pairs[Symbol.iterator]();
    }
  };
  await import('../docs/src/app.js');
  async function click(action, extra = {}) {
    const el = document.createElement('button');
    el.dataset.action = action;
    Object.assign(el.dataset, extra);
    document.body.append(el);
    el.dispatchEvent(new window.Event('click', { bubbles: true }));
    await new Promise((resolve) => setImmediate(resolve));
    el.remove();
  }
  const saved = () => JSON.parse(data.get(STORAGE_KEY));
  await click('diary-jump', { date: '2026-10-26' });
  assert.match(document.getElementById('app').textContent, /Кисело мляко/);
  await click('save-food', { id: state.diary[0].id });
  assert.equal(saved().savedFoods.length, 1);
  await click('add-food', { meal: 'Вечеря' });
  assert.ok(dialog.querySelector('[data-action=pick-food]'));
  await click('pick-food', { index: '0' });
  const food = dialog.querySelector('[data-form=food]');
  assert.equal(food.dataset.id, undefined);
  assert.equal(food.querySelector('select[name=meal] option[selected]').textContent, 'Вечеря');
  assert.equal(food.querySelector('[name=carbs]').value, '4');
  food.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(saved().diary.length, 2);
  assert.equal(saved().diary[1].meal, 'Вечеря');
  assert.equal(saved().diary[1].carbs, 4);
  await click('copy-food', { id: state.diary[0].id });
  assert.equal(dialog.querySelectorAll('[name=dates]').length, 7);
  await click('clear-meal', { meal: 'Обяд' });
  assert.ok(dialog.querySelector('[data-action=confirm-clear-meal]'));
  await click('confirm-clear-meal', { meal: 'Обяд' });
  assert.equal(saved().diary.length, 1);
  await click('undo-fitness');
  assert.equal(saved().diary.length, 2);
  await click('extra-add');
  assert.ok(dialog.querySelector('[data-form=extra]'));
  await click('account');
  assert.match(dialog.textContent, /не са активирани/);
  await click('app-update');
  assert.ok(dialog.querySelector('[data-action=confirm-app-update]'));
  await click('add-food', { meal: 'Закуска' });
  const search = dialog.querySelector('[name=query]');
  search.value = 'няма-такава-храна';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((resolve) => realTimeout(resolve, 350));
  assert.equal(dialog.querySelectorAll('[data-action=quick-repeat-food]').length, 0);
  const searchAgain = dialog.querySelector('[name=query]');
  searchAgain.value = 'мляко';
  searchAgain.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((resolve) => realTimeout(resolve, 350));
  const beforeQuick = saved().diary.length;
  assert.ok(dialog.querySelector('[data-action=quick-repeat-food]'));
  await click('quick-repeat-food', { index: '0' });
  const added = saved().diary.at(-1);
  assert.equal(saved().diary.length, beforeQuick + 1);
  assert.equal(added.meal, 'Закуска');
  assert.equal(added.amount, 200);
  assert.equal(added.carbs, 4);
  assert.notEqual(added.id, state.diary[0].id);
  await click('undo-fitness');
  assert.equal(saved().diary.length, beforeQuick);
  globalThis.setTimeout = realTimeout;
  globalThis.FormData = NativeFormData;
});
