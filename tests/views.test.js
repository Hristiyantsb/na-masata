import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { defaults, generatePlan, diaryEntry, extraGrocery, PLANS } from '../docs/src/domain.js';
import { RECIPES } from '../docs/src/catalog.js';
import { onboardingView, STEPS } from '../docs/src/onboarding.js';
import { seeded } from '../docs/src/planner.js';
import * as views from '../docs/src/views.js';
import * as diary from '../docs/src/diary-views.js';

const dom = (html) => parseHTML(`<html><body>${html}</body></html>`).document;
function safeMarkup(html, name = '') {
  const document = dom(html);
  for (const el of document.querySelectorAll('*'))
    for (const attr of el.attributes) assert.ok(!/^on/i.test(attr.name), `no inline handlers in ${name}`);
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/, `no missing values in ${name}`);
  return document;
}
function planned() {
  const state = defaults();
  state.onboarded = true;
  state.plan = generatePlan(state, seeded(3)).plan;
  return state;
}

test('every setup step labels its inputs and has one heading', () => {
  const state = defaults();
  for (let i = 0; i < STEPS.length; i++) {
    const d = safeMarkup(onboardingView(state.settings, i), STEPS[i]);
    assert.equal(d.querySelectorAll('h1').length, 1);
    for (const input of d.querySelectorAll('input, select')) {
      assert.ok(
        input.closest('label') || input.getAttribute('aria-label') || (input.id && d.querySelector(`label[for="${input.id}"]`)),
        input.outerHTML,
      );
    }
  }
});

test('all screens render empty and filled without missing values', () => {
  for (const state of [defaults(), planned()]) {
    const today = '2026-11-10';
    const r = RECIPES[0];
    const screens = {
      menu: views.menuView(state, {}),
      keep: views.menuView(state, { keep: new Set([0]) }),
      recipes: views.recipesView(state, '', 'all'),
      favourites: views.recipesView(state, '', 'fav'),
      cuisine: views.recipesView(state, '', 'bg'),
      shopping: views.shoppingView(state),
      shop: views.shopModeView(state),
      pantry: views.pantryView(state),
      more: views.moreView(state, { ready: true }),
      plans: views.plansView('monthly'),
      yearly: views.plansView('yearly'),
      privacy: views.privacyView(),
      recipe: views.recipeSheet(r, state, { index: state.plan.length ? 0 : null }),
      preview: views.recipeSheet(r, state, { preview: true }),
      cook: views.cookView(r, 0, null, 3),
      reminder: views.reminderSheet(),
      grocery: views.grocerySheet(state, 'tomato'),
      extra: views.extraForm(state),
      diary: diary.diaryView(state, today, today),
      picker: diary.foodPicker(state, today, 'Обяд'),
      food: diary.foodForm(today, 'Обяд'),
      weight: diary.weightForm(today, 70),
      target: diary.targetSheet(state),
      macros: diary.macroTargetsSheet(state),
      scanner: diary.scannerSheet(),
    };
    if (state.plan.length) {
      screens.actions = views.mealActionsSheet(state, 0);
      screens.swap = views.swapSheet(state, 0);
      screens.move = views.destinationSheet(state, 0, 'move');
      screens.options = views.menuOptionsSheet(state, true);
      screens.newMenu = views.newMenuSheet(state);
    }
    for (const [name, html] of Object.entries(screens)) safeMarkup(views.shell('menu', html, {}), name);
  }
});

test('the week groups meals by day and every meal can be opened, cooked, swapped and moved', () => {
  const state = planned();
  const d = dom(views.menuView(state, {}));
  assert.equal(d.querySelectorAll('.day').length, state.settings.days);
  assert.equal(d.querySelectorAll('.meal').length, state.plan.length);
  for (const meal of d.querySelectorAll('.meal')) {
    for (const action of ['recipe', 'cooked', 'swap', 'meal-actions'])
      assert.ok(meal.querySelector(`[data-action="${action}"]`), action);
    assert.ok(meal.querySelector('.meal-why').textContent.trim());
  }
  const actions = dom(views.mealActionsSheet(state, 0));
  for (const action of ['recipe', 'swap', 'move-meal', 'repeat-meal', 'place-meal'])
    assert.ok(actions.querySelector(`[data-action="${action}"]`), action);
  const keep = dom(views.menuView(state, { keep: new Set([1]) }));
  assert.equal(keep.querySelectorAll('[data-action="keep-toggle"]').length, state.plan.length);
  assert.equal(keep.querySelector('[data-action="keep-toggle"][data-index="1"]').getAttribute('aria-pressed'), 'true');
  assert.ok(keep.querySelector('[data-action="keep-apply"]'));
});

test('a locked menu cannot be changed from the screen', () => {
  const state = planned();
  state.locked = true;
  const d = dom(views.menuView(state, {}));
  assert.ok([...d.querySelectorAll('[data-action="swap"]')].every((b) => b.hasAttribute('disabled')));
  assert.ok(d.querySelector('[data-action="new-menu"]').hasAttribute('disabled'));
  const r = dom(views.recipeSheet(RECIPES[0], state, { index: 0 }));
  assert.ok([...r.querySelectorAll('[data-action="servings"]')].every((b) => b.hasAttribute('disabled')));
  assert.equal(dom(views.recipeSheet(RECIPES[0], state, {})).querySelector('[data-action="servings"]'), null);
});

test('notes, food names and extra products stay text', () => {
  const state = planned();
  const id = RECIPES[0].id;
  state.notes[id] = '<img src=x onerror=alert(1)>';
  state.extras = [extraGrocery({ name: '<script>x</script>', amount: 1, unit: 'бр.', price: null, store: 'Lidl' })];
  state.diary = [diaryEntry({ name: '<b>торта</b>', date: '2026-11-10', meal: 'Обяд', unit: 'г', amount: 100, basis: 100, kcal: 300 })];
  for (const html of [
    views.recipeSheet(RECIPES[0], state, {}),
    views.shoppingView(state),
    diary.diaryView(state, '2026-11-10', '2026-11-10'),
  ]) {
    const d = safeMarkup(html);
    assert.equal(d.querySelectorAll('img[src="x"], script').length, 0);
    assert.ok(![...d.querySelectorAll('b')].some((b) => b.textContent === 'торта'));
  }
  assert.match(views.shoppingView(state), /без цена/);
});

test('the local edition shows plan prices honestly and never a checkout', () => {
  const monthly = views.plansView('monthly');
  const yearly = views.plansView('yearly');
  assert.match(monthly, new RegExp(`${PLANS.menu.monthly} €`));
  assert.match(monthly, new RegExp(`${PLANS.plus.monthly} €`));
  assert.match(yearly, new RegExp(`${PLANS.menu.yearly} €`));
  assert.match(yearly, new RegExp(`${PLANS.plus.yearly} €`));
  for (const html of [monthly, yearly, views.moreView(defaults())]) {
    assert.match(html, /не са включени|Демо|демо/);
    assert.doesNotMatch(html, /data-action="(checkout|buy|subscribe|login)"/);
  }
});

test('the weekly reminder is a real calendar event on the chosen day', () => {
  const now = new Date(2026, 10, 10, 9, 0); // Tuesday
  const ics = views.reminderICS(6, '18:30', now);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=SU/);
  assert.match(ics, /DTSTART:20261115T183000/);
  assert.match(views.reminderICS(1, '08:00', now), /DTSTART:20261117T080000/, 'same weekday later moves a week on');
  assert.match(views.reminderICS(1, '10:00', now), /DTSTART:20261110T100000/, 'today later still counts');
});

test('cooking reads timers from the step and scales water for the household', () => {
  assert.equal(views.stepMinutes('Печи 25–30 минути.'), 30);
  assert.equal(views.scaleStep('Налей 600 мл вода за 2 порции.', 4), 'Налей 1200 мл вода.');
  const html = views.cookView(RECIPES.find((r) => r.steps.some((s) => /мин/.test(s))), 0, null, 2);
  assert.match(html, /Стъпка 1 от/);
});
