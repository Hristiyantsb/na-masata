import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, localDate } from '../docs/src/domain.js';
import { filterRecipes, recipesView, moreRecipes, RECIPE_PAGE } from '../docs/src/views.js';
import { EQUIPMENT, STORES } from '../docs/src/catalog.js';
import { boot } from './helpers/boot.js';

const state = defaults();
state.onboarded = true;
state.settings = { ...state.settings, days: 2, slots: ['Вечеря'], stores: [...STORES], equipment: Object.keys(EQUIPMENT) };
state.plan = [
  { id: 'chickenrice', day: 0, slot: 'Вечеря', people: 2 },
  { id: 'shopska', day: 1, slot: 'Вечеря', people: 2 },
];
state.weekStart = localDate();

test('the recipes screen draws a page of cards and brings the rest on demand', async () => {
  const all = filterRecipes(state, '', 'all');
  assert.equal(all.length, 500);
  // Outside the app the view still returns every card; the app asks for a page.
  assert.equal(recipesView(state, '', 'all').match(/<article class="rcard">/g).length, 500);
  assert.equal(recipesView(state, '', 'all', RECIPE_PAGE).match(/<article class="rcard">/g).length, RECIPE_PAGE);
  assert.equal(moreRecipes(60, 60), '');
  assert.match(moreRecipes(500, 60), /data-action="more-recipes">Още рецепти · 440</);

  const t = await boot({ state, hash: '#recipes' });
  const { app, click, location, tick, window } = t;
  const cards = () => app.querySelectorAll('[data-recipe-grid] .rcard').length;
  assert.equal(cards(), RECIPE_PAGE);
  assert.match(app.querySelector('[data-action="more-recipes"]').textContent, /Още рецепти · 440/);
  assert.match(app.textContent, /500 рецепти пасват/);

  await click('[data-action="more-recipes"]');
  assert.equal(cards(), RECIPE_PAGE * 2);
  assert.match(app.querySelector('[data-action="more-recipes"]').textContent, /380/);
  // The cards that came later are the next ones of the same list, in order, with no repeats.
  const ids = [...app.querySelectorAll('[data-recipe-grid] [data-action="recipe"]')].map((el) => el.dataset.id);
  assert.deepEqual(ids, all.slice(0, RECIPE_PAGE * 2).map((r) => r.id));

  // A filter starts from the first page again; a short list has no button.
  await click('recipe-filter', { filter: 'soup' });
  const soups = filterRecipes(state, '', 'soup');
  assert.equal(cards(), Math.min(RECIPE_PAGE, soups.length));
  assert.equal(app.querySelector('[data-action="more-recipes"]'), null);
  await click('recipe-filter', { filter: 'all' });
  assert.equal(cards(), RECIPE_PAGE);

  // Searching looks through all 500, not only the cards on screen.
  const search = app.querySelector('[data-input="recipe-search"]');
  search.value = 'зелник';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick(200);
  assert.ok([...app.querySelectorAll('[data-recipe-grid] .rcard b')].some((el) => /Зелник/.test(el.textContent)));
  assert.equal(cards(), filterRecipes(state, 'зелник', 'all').length);
  assert.equal(app.querySelector('[data-action="more-recipes"]'), null);

  // Leaving and coming back starts from the first page.
  search.value = '';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick(200);
  await click('[data-action="more-recipes"]');
  assert.equal(cards(), RECIPE_PAGE * 2);
  location.hash = '#menu';
  await tick();
  location.hash = '#recipes';
  await tick();
  assert.equal(cards(), RECIPE_PAGE);
});
