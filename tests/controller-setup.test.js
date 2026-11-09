import test from 'node:test';
import assert from 'node:assert/strict';
import { candidates } from '../docs/src/domain.js';
import { boot } from './helpers/boot.js';

test('a first visit runs the setup, keeps a draft and builds a week that keeps every rule', async () => {
  const t = await boot({ state: null, hash: '' });
  const { app, sheet, click, submit, saved, data, tick } = t;
  const step = () => app.querySelector('.ob')?.getAttribute('data-step');
  const svg = app.querySelector('.ob-stage svg');

  assert.equal(step(), 'welcome');
  assert.ok(app.querySelector('[data-action="wizard-explore"]'));
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'stores');
  assert.equal(app.querySelector('.ob-stage svg'), svg, 'one table for the whole setup');

  // stores: the table carries a bag per chosen chain
  await click('[data-key="stores"][data-value="BILLA"]');
  assert.ok(svg.querySelector('[data-key="bag:BILLA"]'));
  await click('[data-key="stores"][data-value="Lidl"]');
  await click('[data-key="stores"][data-value="Kaufland"]');
  await click('[data-key="stores"][data-value="BILLA"]');
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'stores', 'no store, no next step');
  assert.match(app.querySelector('.ob-error').textContent, /магазин/);
  await click('[data-key="stores"][data-value="Lidl"]');
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'eating');

  // a draft survives a reload
  const draft = JSON.parse(data.get('na-masa-onboarding-v3'));
  assert.equal(draft.step, 2);
  assert.deepEqual(draft.draft.stores, ['Lidl']);

  await click('[data-key="diet"][data-value="veggie"]');
  assert.equal(svg.getAttribute('data-mood'), 'love');
  await click('[data-key="needs"][data-value="kids"]');
  assert.ok(svg.querySelector('[data-key="kid"]'));
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'menu');
  await click('[data-key="maxCalories"][data-value="700"]');
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'kitchen');
  await click('[data-key="equipment"][data-value="microwave"]');
  assert.ok(svg.querySelector('[data-key="appl:microwave"]'));
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'exclude');
  await click('[data-key="allergens"][data-value="nuts"]');
  assert.ok(svg.querySelector('[data-key="floor:nuts"]'));
  await click('dislikes');
  assert.ok(sheet.open);
  await click('[data-key="dislikes"][data-value="mushroom"]');
  assert.equal(sheet.querySelector('[data-key="dislikes"][data-value="mushroom"]').getAttribute('aria-pressed'), 'true');
  await click('close-sheet');
  assert.match(app.querySelector('[data-dislikes]').textContent, /Гъби/);
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'household');
  await click('[data-key="people"][data-delta="1"]');
  assert.equal(app.querySelector('[data-people]').textContent, '3');
  assert.equal(svg.querySelectorAll('[data-layer="top"] [data-key^="seat:"]').length, 3);
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'result');
  assert.equal(app.querySelectorAll('[data-action="wizard-recipe"]').length, 5);
  await click('[data-action="wizard-recipe"]');
  assert.ok(sheet.open);
  assert.equal(sheet.querySelector('[data-action="cook"]'), null, 'preview has no cooking or diary actions');
  await click('close-sheet');

  // build the week (reduced motion keeps the wait short)
  await submit('[data-form="wizard"]');
  assert.equal(step(), 'building');
  await tick(700);
  const s = saved();
  assert.equal(s.onboarded, true);
  assert.equal(s.plan.length, 5);
  assert.equal(s.settings.people, 3);
  const allowed = new Set(candidates(s.settings).map((r) => r.id));
  assert.ok(s.plan.every((e) => allowed.has(e.id)), 'every dish passes the hard rules');
  assert.equal(new Set(s.plan.map((e) => e.id)).size, 5, 'no repeats');
  assert.equal(data.get('na-masa-onboarding-v3'), undefined, 'the draft is cleared');
  assert.ok(app.querySelector('.meal'), 'the week is on screen');
  assert.ok(app.querySelector('.tabbar'));
});
