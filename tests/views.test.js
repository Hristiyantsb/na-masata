import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { defaults, generatePlan } from '../docs/src/domain.js';
import { RECIPES } from '../docs/src/catalog.js';
import { wizardView, STEPS } from '../docs/src/onboarding.js';
import * as views from '../docs/src/views.js';
const dom = (html) => parseHTML(`<html><body>${html}</body></html>`).document;
function safeMarkup(html) {
  const document = dom(html);
  for (const el of document.querySelectorAll('*')) {
    for (const attr of el.attributes)
      assert.ok(!/^on/i.test(attr.name), 'no inline event handlers');
  }
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.ok(!html.includes('undefined'), 'no missing interpolated values');
  return document;
}
test('every setup step renders a labeled form and one primary heading', () => {
  const state = defaults();
  for (let i = 0; i < STEPS.length; i++) {
    const d = safeMarkup(wizardView(state.settings, i));
    assert.equal(d.querySelectorAll('h1').length, 1);
    assert.ok(d.querySelector('form[data-form=wizard] button[type=submit]'));
    for (const input of d.querySelectorAll('input:not([type=hidden]), select')) {
      assert.ok(
        input.closest('label') ||
          input.getAttribute('aria-label') ||
          (input.id && d.querySelector(`label[for="${input.id}"]`)),
        input.outerHTML,
      );
    }
  }
});
test('all main views render empty and populated states without missing values', () => {
  const state = defaults();
  for (const populated of [false, true]) {
    if (populated) state.plan = generatePlan(state, () => 0.2).plan;
    for (const [page, html] of [
      ['plan', views.planView(state, null)],
      ['recipes', views.recipesView(state, '', false)],
      ['shopping', views.shoppingView(state)],
      ['pantry', views.pantryView(state)],
      ['diary', views.diaryView(state, '2026-10-25')],
      ['settings', views.settingsView(state)],
      ['privacy', views.privacyView()],
    ]) {
      const d = safeMarkup(views.shell(page, html));
      assert.equal(d.querySelectorAll('main').length, 1);
      assert.equal(d.querySelectorAll('h1').length, 1, page);
    }
  }
});
test('pricing presents exact annual charges and explicitly identifies preview', () => {
  for (const [interval, prices] of [
    ['monthly', [9, 29]],
    ['yearly', [90, 290]],
  ]) {
    const d = safeMarkup(views.pricingView(interval));
    const shown = [...d.querySelectorAll('.plan-price')].map((el) => el.textContent);
    assert.equal(shown.length, 2);
    prices.forEach((p, i) => assert.ok(shown[i].startsWith(`${p} €`)));
    assert.match(d.body.textContent, /Не събираме плащания/);
    assert.equal(d.querySelectorAll('[data-action="plan-info"]').length, 2);
    if (interval === 'yearly')
      for (const p of prices) assert.ok(d.body.textContent.includes(`${p} € наведнъж годишно`));
  }
});
test('recipe notes and food names remain text after HTML rendering', () => {
  const state = defaults();
  state.notes[RECIPES[0].id] = '</textarea><img src=x onerror=alert(1)>';
  const detail = safeMarkup(views.recipeDetail(RECIPES[0], state));
  assert.equal(detail.querySelectorAll('img').length, 0);
  const food = safeMarkup(
    views.foodForm('2026-10-25', 'Обяд', {
      id: 'test',
      name: '"><script>alert(1)</script>',
      date: '2026-10-25',
      meal: 'Обяд',
      amount: 100,
      unit: 'г',
      basis: 100,
      kcal: 120,
      protein: null,
      source: 'manual',
    }),
  );
  assert.equal(food.querySelector('[name=name]').value, '"><script>alert(1)</script>');
  assert.equal(food.querySelector('[name=protein]').value, '');
});
