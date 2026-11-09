import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { defaults, candidates } from '../docs/src/domain.js';
import {
  STEPS,
  LAST_STEP,
  QUESTIONS,
  onboardingView,
  showStep,
  syncStep,
  showBuilding,
  pick,
  liveCount,
  sceneFor,
  relaxHints,
  isSelected,
  dislikesSheet,
} from '../docs/src/onboarding.js';
import { tableSVG, applyScene, sceneItems, seatPositions } from '../docs/src/table.js';

const draft = () => defaults().settings;
const page = (step, d = draft()) =>
  parseHTML('<html><body><div id="app">' + onboardingView(d, step) + '</div></body></html>').document;

test('setup follows the shopping decision: stores, eating, menu, kitchen, exclusions, household', () => {
  assert.deepEqual(STEPS, ['welcome', 'stores', 'eating', 'menu', 'kitchen', 'exclude', 'household', 'result']);
  assert.equal(LAST_STEP, 7);
  assert.equal(QUESTIONS, 6);
});

test('every screen has the wordmark, the table, one heading and a working form', () => {
  for (let step = 0; step < STEPS.length; step++) {
    const doc = page(step);
    assert.ok(doc.querySelector('img.wordmark-img[alt="На маса"]'), STEPS[step]);
    assert.ok(doc.querySelector('.ob-stage svg.t[aria-hidden="true"]'), STEPS[step]);
    assert.equal(doc.querySelectorAll('h1').length, 1);
    assert.ok(doc.querySelector('h1#ob-title').textContent.trim());
    assert.ok(doc.querySelector('form[data-form="wizard"] button[type="submit"]'));
    assert.doesNotMatch(doc.toString(), /edish|undefined|NaN/i);
  }
});

test('each question uses the control that fits it', () => {
  const stores = page(1);
  assert.equal(stores.querySelectorAll('.ob-store .store-badge img[src^="assets/stores/"]').length, 6);
  const eating = page(2);
  assert.equal(eating.querySelectorAll('[data-key="diet"]').length, 5);
  assert.equal(eating.querySelectorAll('.ob-toggle[data-key="needs"] .ob-switch').length, 3);
  const menu = page(3);
  assert.equal(menu.querySelectorAll('.ob-tile[data-key="goal"]').length, 4);
  assert.equal(menu.querySelectorAll('.ob-seg-item[data-key="maxCalories"]').length, 6);
  const kitchen = page(4);
  assert.equal(kitchen.querySelectorAll('.ob-appliance[data-key="equipment"]').length, 4);
  assert.ok(kitchen.querySelector('[data-key="equipment"][data-value="oven"][aria-label="Фурна"]'));
  assert.equal(kitchen.querySelectorAll('[data-key="maxTime"]').length, 5);
  const exclude = page(5);
  assert.ok(exclude.querySelector('[data-key="clear"][data-value="allergens"][aria-pressed="true"]'));
  assert.equal(exclude.querySelectorAll('.ob-chip[data-key="allergens"]').length, 8);
  assert.ok(exclude.querySelector('[data-action="dislikes"]'));
  const household = page(6);
  assert.equal(household.querySelectorAll('[data-key="people"]').length, 2);
  assert.equal(household.querySelectorAll('[data-key="days"]').length, 3);
  assert.equal(household.querySelectorAll('[data-key="slots"]').length, 2);
  assert.ok(household.querySelector('input[type="range"][data-input="budget-range"]'));
  assert.ok(household.querySelector('input[name="budget"][type="number"]'));
  const result = page(7);
  assert.equal(result.querySelectorAll('[data-action="wizard-recipe"]').length, 5);
});

test('a tap changes a copy of the draft and only what was tapped', () => {
  const d = draft();
  const next = pick(d, 'stores', 'BILLA');
  assert.deepEqual(d.stores, ['Lidl', 'Kaufland']);
  assert.deepEqual(next.stores, ['Lidl', 'Kaufland', 'BILLA']);
  assert.deepEqual(pick(next, 'stores', 'Lidl').stores, ['Kaufland', 'BILLA']);
  assert.equal(pick(d, 'maxTime', '30').maxTime, 30);
  assert.equal(pick(d, 'people', '20').people, 12);
  assert.equal(pick(d, 'people', '0').people, 1);
  assert.equal(pick(d, 'budget', 'abc').budget, d.budget);
  const allergic = pick(pick(d, 'allergens', 'nuts'), 'allergens', 'gluten');
  assert.deepEqual(pick(allergic, 'clear', 'allergens').allergens, []);
  assert.equal(isSelected(d, 'clear', 'allergens'), true);
});

test('a choice updates the screen in place, so the table and focus stay', () => {
  const doc = page(4);
  const root = doc.querySelector('#app');
  const oven = root.querySelector('[data-key="equipment"][data-value="oven"]');
  const table = root.querySelector('.ob-stage svg');
  const next = pick(draft(), 'equipment', 'oven');
  syncStep(root, next);
  assert.equal(root.querySelector('[data-key="equipment"][data-value="oven"]'), oven);
  assert.equal(oven.getAttribute('aria-pressed'), 'false');
  assert.equal(root.querySelector('[data-live-count]').textContent, String(candidates(next).length));
  showStep(root, next, 5);
  assert.equal(root.querySelector('.ob-stage svg'), table, 'the table survives a step change');
  assert.equal(root.querySelector('.ob').getAttribute('data-step'), 'exclude');
  showBuilding(root);
  assert.equal(root.querySelectorAll('.ob-build li').length, 3);
  assert.ok(root.querySelector('[role="status"]'));
});

test('the live count follows the hard filters and says why it is zero', () => {
  const d = draft();
  assert.equal(liveCount(d).count, candidates(d).length);
  const vegan = pick(d, 'diet', 'vegan');
  assert.ok(liveCount(vegan).count < liveCount(d).count);
  assert.equal(liveCount({ ...d, stores: [] }).count, 0);
  assert.match(liveCount({ ...d, stores: [] }).label, /магазин/);
  assert.match(liveCount({ ...d, slots: [] }).label, /хранене/);
});

test('the table acts out every answer', () => {
  const d = { ...draft(), stores: ['Lidl', 'METRO'], needs: ['kids', 'sensory'], diet: 'pescatarian' };
  assert.deepEqual(sceneFor(1, d).bags, ['Lidl', 'METRO']);
  const eating = sceneFor(2, d);
  assert.equal(eating.dish.diet, 'pescatarian');
  assert.equal(eating.dish.divided, true);
  assert.equal(eating.kid, true);
  assert.match(sceneFor(3, { ...d, goal: 'protein' }).dish.flag, /25 г/);
  assert.deepEqual(sceneFor(4, { ...d, equipment: ['oven'] }).appliances, ['oven']);
  assert.deepEqual(sceneFor(5, { ...d, allergens: ['nuts'] }).floor, ['nuts']);
  assert.equal(sceneFor(6, { ...d, people: 6 }).plates, 6);
  assert.equal(sceneFor(7, d).cloche, 'open');
  assert.equal(sceneFor(7, { ...d, diet: 'keto', needs: ['sensory'], maxTime: 20 }).mood, 'sleepy');
  const building = sceneFor('building', { ...d, days: 7 });
  assert.equal(building.week, 7);
  assert.equal(building.dance, true);
  assert.equal(seatPositions(12).length, 12);
});

test('when nothing fits we suggest loosening only optional choices', () => {
  const d = { ...draft(), diet: 'vegan', needs: ['sensory'], maxTime: 20 };
  assert.equal(candidates(d).length, 0);
  const hints = relaxHints(d);
  assert.ok(hints.length > 0);
  for (const h of hints) {
    assert.ok(h.gain > 0);
    assert.doesNotMatch(h.label, /алерг|кето|веган|вегетариан/i);
  }
  const stuck = { ...draft(), diet: 'keto', needs: ['sensory'], maxTime: 20, equipment: ['microwave'] };
  assert.deepEqual(relaxHints(stuck), [], 'no fake hint when one change is not enough');
  assert.match(onboardingView(stuck, LAST_STEP), /Върни се и промени/);
});

test('the table keeps items keyed, so a new choice drops in and an old one lifts away', async () => {
  const { document } = parseHTML('<html><body>' + tableSVG({ uid: 'x' }) + tableSVG({ uid: 'y' }) + '</body></html>');
  const [svg, other] = document.querySelectorAll('svg');
  assert.notEqual(svg.innerHTML.match(/id="x-top"/), null);
  assert.notEqual(other.innerHTML.match(/id="y-top"/), null);
  applyScene(svg, { mood: 'determined', bags: ['Lidl', 'Kaufland'] });
  const keys = () => [...svg.querySelectorAll('[data-layer="top"] > g:not(.is-leaving)')].map((n) => n.getAttribute('data-key'));
  assert.deepEqual(keys().sort(), ['bag:Kaufland', 'bag:Lidl']);
  const lidl = svg.querySelector('[data-key="bag:Lidl"]');
  applyScene(svg, { mood: 'determined', bags: ['Lidl'] });
  assert.equal(svg.querySelector('[data-key="bag:Lidl"]'), lidl, 'the same bag stays');
  assert.deepEqual(keys(), ['bag:Lidl']);
  assert.equal(svg.getAttribute('data-mood'), 'determined');
  const items = sceneItems({ dish: { diet: 'vegan' }, floor: ['nuts', 'soy'], fx: 'zzz' });
  assert.equal(items.top.length, 1);
  assert.equal(items.floor.length, 2);
  assert.equal(items.fx[0].key, 'zzz');
});

test('the dislikes sheet lists catalogue products and searches them', () => {
  const html = dislikesSheet(draft(), 'дом');
  assert.match(html, /Домати/);
  assert.doesNotMatch(html, /Кайма/);
  assert.match(html, /data-key="dislikes"/);
});
