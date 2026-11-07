import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { defaults } from '../docs/src/domain.js';
import { STEPS, LAST_STEP, wizardView, buildingView } from '../docs/src/onboarding.js';
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
    assert.ok(document.querySelector('.wordmark-lockup svg.mascot'));
    assert.ok(document.querySelector('form[data-form="wizard"] .nm-primary'));
    assert.ok(document.querySelector('h1#nm-step-title'));
    assert.doesNotMatch(document.toString(), /edish|eDish/);
  }
  assert.match(wordmark(), /на маса/);
  assert.match(mascot(40), /aria-hidden="true"/);
});
test('each question uses the control that fits it', () => {
  assert.ok(html(1).querySelectorAll('.nm-store').length >= 6);
  assert.equal(html(2).querySelectorAll('.nm-goal').length, 4);
  assert.equal(html(3).querySelectorAll('.nm-appliance').length, 4);
  assert.equal(html(3).querySelectorAll('[data-key="maxTime"]').length, 5);
  assert.ok(html(4).querySelector('[data-key="clear"][data-value="allergens"]'));
  const calories = html(5);
  assert.equal(calories.querySelectorAll('[data-key="maxCalories"]').length, 6);
  assert.equal(calories.querySelectorAll('.nm-counter button[data-action="counter"]').length, 2);
  assert.equal(
    calories.querySelectorAll('input[type="range"][data-input="budget-range"]').length,
    1,
  );
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
