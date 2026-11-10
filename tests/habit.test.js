import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { RECIPES, PRODUCTS, EQUIPMENT, STORES } from '../docs/src/catalog.js';
import { AISLE } from '../docs/src/products-more.js';
import { nutrition } from '../docs/src/nutrition.js';
import { CONFIG } from '../docs/src/config.js';
import {
  defaults,
  candidates,
  offered,
  generatePlan,
  normalizeState,
  isBreakfast,
  isSoup,
  isSalad,
  mainProtein,
  fitsTheme,
  THEMES,
  startWeek,
  weekOver,
  progress,
  daysBetween,
  planSnapshot,
} from '../docs/src/domain.js';
import { seeded } from '../docs/src/planner.js';
import {
  menuView,
  newMenuSheet,
  mealActionsSheet,
  swapSheet,
  feedbackSheet,
  progressSheet,
  blockedSheet,
  progressText,
  moreView,
  recipesView,
  recipeSheet,
  filterRecipes,
  coverage,
  cookView,
  pantryView,
  shoppingView,
} from '../docs/src/views.js';
import { previewRecipes } from '../docs/src/onboarding.js';

const html = (markup) => parseHTML('<html><body>' + markup + '</body></html>').document.body;
const stateWith = (extra = {}) => {
  const state = defaults();
  state.onboarded = true;
  state.settings = { ...state.settings, equipment: Object.keys(EQUIPMENT), stores: [...STORES], ...extra };
  return state;
};
const withPlan = (extra, seed = 4) => {
  const state = stateWith(extra);
  state.plan = generatePlan(state, seeded(seed)).plan;
  state.weekStart = '2026-11-02';
  return state;
};

test('old saves load, and the new fields are checked like everything else', () => {
  const old = JSON.parse(JSON.stringify(withPlan({})));
  for (const key of ['blocked', 'asked', 'weekStart', 'history']) delete old[key];
  const loaded = normalizeState(old);
  assert.deepEqual([loaded.blocked, loaded.asked, loaded.weekStart, loaded.history], [[], [], '', []]);

  const full = JSON.parse(JSON.stringify(old));
  full.blocked = ['lentil', 'lentil', 'no-such-dish'];
  full.asked = ['lentil'];
  full.weekStart = '2026-11-02';
  full.history = [{ start: '2026-10-26', meals: 5, cooked: 4, cost: 31.5, saving: 2.1 }];
  const kept = normalizeState(full);
  assert.deepEqual(kept.blocked, ['lentil'], 'unknown and repeated dishes are dropped');
  assert.equal(kept.weekStart, '2026-11-02');
  assert.deepEqual(kept.history, full.history);

  for (const bad of [
    { weekStart: '02.11.2026' },
    { history: [{ start: '2026-10-26', meals: 5, cooked: 6, cost: 1, saving: 0 }] },
    { history: [{ start: 'yesterday', meals: 5, cooked: 1, cost: 1, saving: 0 }] },
    { history: 'none' },
    { blocked: 'lentil' },
  ])
    assert.throws(() => normalizeState({ ...JSON.parse(JSON.stringify(old)), ...bad }));
});

test('a dish the household turned down never comes back by itself', () => {
  const state = withPlan({ days: 7, slots: ['Обяд', 'Вечеря'], budget: 300 });
  const gone = state.plan.slice(0, 6).map((e) => e.id);
  state.blocked = gone;
  assert.ok(offered(state).every((r) => !gone.includes(r.id)));
  assert.equal(offered(state).length, candidates(state.settings).length - gone.length);
  for (const seed of [1, 2, 3]) {
    const { plan } = generatePlan(state, seeded(seed));
    assert.ok(plan.every((e) => !gone.includes(e.id)), 'not in a new week');
  }
  const offers = [...swapSheet(state, 8).matchAll(/data-action="choose-swap"[^>]*data-id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(offers.length > 0 && offers.every((id) => !gone.includes(id)), 'not in a swap');
  // It is still in the recipe book, where it can be brought back.
  assert.ok(filterRecipes(state, '', 'all').some((r) => r.id === gone[0]));
  assert.match(recipeSheet(RECIPES.find((r) => r.id === gone[0]), state), /unblock-recipe/);
  assert.match(blockedSheet(state), /unblock-recipe/);
});

test('a themed week only narrows the choice and never relaxes a rule', () => {
  assert.deepEqual(Object.keys(THEMES), ['usual', 'cheap', 'quick', 'fasting', 'protein', 'light']);
  for (const diet of ['all', 'veggie', 'keto']) {
    const state = stateWith({ diet, days: 5, slots: ['Закуска', 'Вечеря'], budget: 300 });
    const allowed = new Set(candidates(state.settings).map((r) => r.id));
    for (const theme of Object.keys(THEMES)) {
      const result = generatePlan(state, seeded(7), { theme });
      if (!result.plan) {
        assert.match(result.reason, new RegExp(THEMES[theme][0]), `${diet}/${theme}: says which theme has no dishes`);
        continue;
      }
      for (const e of result.plan) {
        const r = RECIPES.find((x) => x.id === e.id);
        assert.ok(allowed.has(e.id), `${diet}/${theme}: ${e.id} breaks a rule`);
        assert.ok(fitsTheme(r, theme), `${diet}/${theme}: ${e.id} is off theme`);
      }
      assert.equal(result.withinBudget, result.cost <= state.settings.budget, 'the real budget is the yardstick');
    }
  }
  const quick = RECIPES.filter((r) => fitsTheme(r, 'quick'));
  assert.ok(quick.every((r) => r.time <= 30));
  const fasting = RECIPES.filter((r) => fitsTheme(r, 'fasting'));
  assert.ok(fasting.length >= 50 && fasting.every((r) => Object.keys(r.ing).every((k) => !PRODUCTS[k][5])));
  assert.ok(RECIPES.filter((r) => fitsTheme(r, 'light')).every((r) => nutrition(r).kcal <= 500));
  // A dish the person keeps stays, whatever the theme.
  const state = withPlan({ days: 5, slots: ['Вечеря'] });
  const kept = state.plan[1].id;
  const next = generatePlan(state, seeded(2), { keep: [1], theme: 'fasting' });
  if (next.plan) assert.equal(next.plan[1].id, kept);
});

test('a week that was lived goes into the history; trying menus in one evening does not', () => {
  const state = withPlan({ days: 5, slots: ['Вечеря'] });
  const fresh = generatePlan(state, seeded(9)).plan;

  // Same evening, nothing cooked: no trace.
  let patch = startWeek(state, fresh, '2026-11-02');
  assert.deepEqual(patch.history, []);
  assert.equal(patch.weekStart, '2026-11-02');
  assert.deepEqual([patch.cooked, patch.checked], [{}, {}]);

  // Three dinners cooked: the week is recorded with what really happened.
  state.cooked = { 0: true, 2: true, 3: true };
  patch = startWeek(state, fresh, '2026-11-09');
  assert.equal(patch.history.length, 1);
  assert.deepEqual(
    { ...patch.history[0], cost: 0, saving: 0 },
    { start: '2026-11-02', meals: 5, cooked: 3, cost: 0, saving: 0 },
  );
  assert.ok(patch.history[0].cost > 0);
  assert.equal(patch.weekStart, '2026-11-09');

  // The same week is never counted twice, and the record stays short.
  state.history = patch.history;
  assert.equal(startWeek(state, fresh, '2026-11-09').history.length, 1);
  state.history = Array.from({ length: 110 }, (_, i) => ({ start: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`, meals: 5, cooked: 5, cost: 30, saving: 1 }));
  assert.equal(startWeek(state, fresh, '2026-11-09').history.length, 104);

  // Undo brings the week back together with its date and record.
  const snap = planSnapshot(state);
  assert.equal(snap.weekStart, state.weekStart);
  assert.equal(snap.history.length, state.history.length);
});

test('the menu knows when the week is over and counts only what happened', () => {
  const state = withPlan({ days: 5, slots: ['Вечеря'] });
  assert.equal(daysBetween('2026-11-02', '2026-11-09'), 7);
  assert.equal(weekOver(state, '2026-11-04'), false);
  assert.equal(weekOver(state, '2026-11-07'), true, 'its five days have passed');
  state.cooked = Object.fromEntries(state.plan.map((_, i) => [i, true]));
  assert.equal(weekOver(state, '2026-11-03'), true, 'everything is cooked');
  assert.equal(weekOver({ ...state, weekStart: '' }, '2026-12-01'), false);
  assert.equal(weekOver({ ...state, plan: [] }, '2026-12-01'), false);

  state.history = [
    { start: '2026-10-05', meals: 5, cooked: 2, cost: 30, saving: 0 },
    { start: '2026-10-19', meals: 5, cooked: 5, cost: 32, saving: 1.5 },
    { start: '2026-10-26', meals: 5, cooked: 4, cost: 31, saving: 2.25 },
  ];
  const p = progress(state);
  assert.equal(p.weeks, 4);
  assert.equal(p.cooked, 2 + 5 + 4 + 5);
  assert.equal(p.streak, 3, 'two weeks in October plus this one; the gap before them breaks the run');
  assert.ok(p.saved >= 3.75);
  assert.match(progressText(p), /3 седмици подред · 16 сготвени ястия/);
  assert.equal(progressText({ streak: 1, cooked: 0, saved: 0 }), '');
  assert.deepEqual(progress(defaults()), { weeks: 0, streak: 0, cooked: 0, saved: 0 });
});

test('the screens offer the next week, the themes and the feedback', () => {
  const state = withPlan({ days: 5, slots: ['Вечеря'] });
  state.weekStart = '2020-01-01';
  const menu = html(menuView(state));
  assert.ok(menu.querySelector('.next-week [data-action="new-menu"]'), 'a finished week offers the next one');
  assert.equal(menu.querySelector('.progress-line'), null, 'nothing to show before anything is cooked');
  state.cooked = { 0: true };
  assert.ok(html(menuView(state)).querySelector('.progress-line[data-action="progress"]'));
  state.locked = true;
  assert.equal(html(menuView(state)).querySelector('.next-week'), null, 'a locked menu is left alone');
  state.locked = false;

  const sheet = html(newMenuSheet(state, 'quick'));
  assert.equal(sheet.querySelectorAll('[data-action="theme"]').length, 6);
  assert.equal(sheet.querySelector('[data-action="theme"][aria-pressed="true"]').dataset.value, 'quick');
  assert.ok(sheet.querySelector('[data-action="regenerate"]') && sheet.querySelector('[data-action="keep-start"]'));
  assert.match(sheet.querySelector('.sheet-title').textContent, /Нова седмица/);

  assert.ok(html(mealActionsSheet(state, 0)).querySelector(`[data-action="block-recipe"][data-id="${state.plan[0].id}"]`));
  const feedback = html(feedbackSheet(RECIPES[0]));
  assert.deepEqual(
    [...feedback.querySelectorAll('[data-action="feedback"]')].map((b) => b.dataset.value),
    ['like', 'fine', 'block'],
  );
  state.history = [{ start: '2026-10-26', meals: 5, cooked: 4, cost: 31, saving: 2.25 }];
  const done = html(progressSheet(state));
  assert.match(done.textContent, /Седмица от 26\.10\.2026/);
  assert.match(done.textContent, /4 от 5 сготвени/);
  const more = html(moreView(state));
  assert.match(more.textContent, new RegExp(`Версия ${CONFIG.version.replace(/\./g, '\\.')}`));
  assert.ok(more.querySelector('[data-action="progress"]'));
  assert.equal(more.querySelector('[data-action="blocked-list"]'), null);
  state.blocked = [RECIPES[0].id];
  assert.ok(html(moreView(state)).querySelector('[data-action="blocked-list"]'));
});

test('recipes can be matched to what is at home', () => {
  const state = stateWith({});
  assert.deepEqual(filterRecipes(state, '', 'have'), [], 'an empty pantry matches nothing');
  assert.ok(html(recipesView(state, '', 'have')).querySelector('a[href="#pantry"]'));

  state.pantry = { potato: 2000, egg: 10, cheese: 400, onion: 1000, salt: 1000, oil: 1000 };
  const list = filterRecipes(state, '', 'have');
  assert.ok(list.length > 0);
  let last = 1;
  for (const r of list) {
    const c = coverage(r, state);
    assert.ok(c.have > 0 && c.share >= 0.5, `${r.id}: ${c.have} of ${c.of}`);
    assert.ok(c.share <= last + 1e-9, 'best matches first');
    last = c.share;
    assert.equal(c.of, Object.keys(r.ing).filter((k) => AISLE[k] !== 'spices').length, 'salt, oil and spices do not count');
  }
  const cards = html(recipesView(state, '', 'have'));
  assert.equal(cards.querySelectorAll('.rcard-have').length, list.length);
  assert.match(cards.querySelector('.rcard-have').textContent, /Имаш (всичко|\d+ от \d+ продукта)/);
  // Only salt and oil at home: nothing to cook from that alone.
  state.pantry = { salt: 1000, oil: 1000 };
  assert.deepEqual(filterRecipes(state, '', 'have'), []);

  // One tap in the pantry instead of typing grams.
  const pantry = html(pantryView(withPlan({ days: 5, slots: ['Вечеря'] })));
  const have = pantry.querySelector('[data-action="pantry-have"]');
  assert.ok(have && Number(have.dataset.amount) > 0);
  assert.ok(pantry.querySelector(`input[name="${have.dataset.id}"]`));
});

test('the first look at the week shows its range, and cooking keeps the quantities at hand', () => {
  const draft = { ...defaults().settings, slots: ['Закуска', 'Вечеря'], equipment: Object.keys(EQUIPMENT) };
  const picks = previewRecipes(draft);
  assert.equal(picks.length, 5);
  assert.equal(picks.filter(isBreakfast).length, 1, 'one breakfast, not five');
  const kinds = picks.filter((r) => !isBreakfast(r)).map((r) => mainProtein(r) + (isSoup(r) ? ' soup' : isSalad(r) ? ' salad' : ''));
  assert.equal(new Set(kinds).size, 4, 'four main dishes that differ');
  const onlyBreakfast = previewRecipes({ ...draft, slots: ['Закуска'] });
  assert.equal(onlyBreakfast.length, 5);
  assert.equal(new Set(onlyBreakfast.map((r) => r.name.split(' ')[0])).size, 5);
  for (const goal of ['protein', 'light', 'quick']) assert.equal(previewRecipes({ ...draft, goal }).length, 5, goal);

  const r = RECIPES.find((x) => x.id === 'lentil');
  const cook = html(cookView(r, 0, null, 4));
  assert.equal(cook.querySelectorAll('.cook-ing .ingredients li').length, Object.keys(r.ing).length);
  assert.match(cook.querySelector('.cook-ing summary').textContent, /Съставки за 4 порции/);

  const state = withPlan({ stores: ['Lidl', 'BILLA'], days: 5, slots: ['Вечеря'] });
  assert.ok(html(shoppingView(state)).querySelector('[data-action="share-shopping"]'));
  assert.match(recipeSheet(r, state), /data-action="share-recipe"/);
});
