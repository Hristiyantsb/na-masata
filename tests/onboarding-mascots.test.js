import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { defaults } from '../docs/src/domain.js';
import {
  STEPS,
  LAST_STEP,
  wizardView,
  buildingView,
  syncWizard,
  liveCount,
  isSelected,
} from '../docs/src/onboarding.js';
import { mascot, wordmark } from '../docs/src/brand.js';

const html = (step, settings = defaults().settings) =>
  parseHTML('<html><body>' + wizardView(settings, step, '', false) + '</body></html>').document;

test('setup is short and follows store, direction, appliances, exclusions, calories', () => {
  assert.equal(STEPS.length, 7);
  assert.deepEqual(STEPS.slice(1, 6), [
    'Магазини',
    'Насоченост',
    'Уреди',
    'Без това',
    'Калории и порции',
  ]);
  assert.equal(LAST_STEP, 6);
});
test('every setup screen has the На маса identity and a usable form', () => {
  for (let step = 0; step < STEPS.length; step++) {
    const document = html(step);
    assert.ok(document.querySelector('img.wordmark-img[src="assets/wordmark.webp"]'));
    assert.ok(document.querySelector('img.mascot[src^="assets/mascot/"]'));
    assert.ok(document.querySelector('form[data-form="wizard"] .nm-primary'));
    assert.ok(document.querySelector('h1#nm-step-title'));
    assert.doesNotMatch(document.toString(), /edish|eDish/);
  }
  assert.match(wordmark(), /alt="На маса"/);
  assert.match(mascot('chef'), /aria-hidden="true"/);
  assert.match(mascot('unknown'), /calm\.webp/);
});
test('each question uses the control that fits it', () => {
  const stores = html(1);
  assert.equal(stores.querySelectorAll('.nm-store .store-badge').length, 13);
  assert.equal(html(2).querySelectorAll('.nm-goal').length, 4);
  const kitchen = html(3);
  assert.equal(kitchen.querySelectorAll('.nm-kitchen .nm-appl').length, 4);
  assert.ok(kitchen.querySelector('.nm-appl[data-value="oven"][aria-label="Фурна"]'));
  assert.equal(kitchen.querySelectorAll('[data-key="maxTime"]').length, 5);
  assert.ok(html(4).querySelector('[data-key="clear"][data-value="allergens"]'));
  const portions = html(5);
  assert.equal(portions.querySelectorAll('[data-key="maxCalories"]').length, 6);
  assert.ok(portions.querySelector('.nm-kcal-food'));
  assert.equal(portions.querySelectorAll('.nm-seat').length, 2);
  assert.equal(portions.querySelectorAll('button[data-action="counter"]').length, 2);
  assert.equal(
    portions.querySelectorAll('input[type="range"][data-input="budget-range"]').length,
    1,
  );
  for (let step = 1; step < LAST_STEP; step++)
    assert.ok(html(step).querySelector('[data-live-count]'));
});
test('a choice updates the screen in place instead of rebuilding it', () => {
  const s = defaults().settings;
  const doc = html(3, s);
  const before = doc.querySelector('.nm-appl[data-value="oven"]');
  s.equipment = s.equipment.filter((k) => k !== 'oven');
  syncWizard(doc, s, 3, 'equipment');
  assert.equal(doc.querySelector('.nm-appl[data-value="oven"]'), before);
  assert.equal(before.getAttribute('aria-pressed'), 'false');
  assert.equal(
    doc.querySelector('.nm-legend-chip[data-value="oven"]').getAttribute('aria-pressed'),
    'false',
  );
});
test('live count follows the hard filters', () => {
  const s = defaults().settings;
  const all = liveCount(s).count;
  s.maxCalories = 400;
  assert.ok(liveCount(s).count < all);
  s.stores = [];
  assert.equal(liveCount(s).count, 0);
  assert.ok(isSelected({ allergens: [] }, 'clear', 'allergens'));
});
test('selected calorie cap is shown as selected', () => {
  const s = defaults().settings;
  s.maxCalories = 500;
  assert.equal(
    html(5, s).querySelector('[data-key="maxCalories"][aria-pressed="true"]').dataset.value,
    '500',
  );
});
test('building screen announces progress without blocking assistive tech', () => {
  const doc = parseHTML('<html><body>' + buildingView() + '</body></html>').document;
  assert.equal(doc.querySelector('[role="status"]').getAttribute('aria-live'), 'polite');
  assert.equal(doc.querySelectorAll('.nm-build-list li').length, 3);
});
test('onboarding content and button stay in a viewport with accessible overflow fallback', () => {
  const css = readFileSync(new URL('../docs/assets/onboarding.css', import.meta.url), 'utf8');
  assert.match(css, /body\.onboarding\s*\{[^}]*overflow:hidden/);
  assert.match(css, /\.nm-fields\s*\{[^}]*overflow-y:auto/);
  assert.match(css, /\.nm-footer\s*\{[^}]*flex-shrink:0/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /min-height:44px/);
});
