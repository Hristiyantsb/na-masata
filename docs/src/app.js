// На маса controller: state, routes, the living setup, sheets and every action.
import {
  saveDraft,
  restoreDraft,
  clearDraft,
  cookingSteps,
  setCookingStep,
  knownBarcode,
  COOKING_KEY,
  LEGACY_KEYS,
  migrateLocalKeys,
} from './local-features.js';
import { PRODUCTS } from './catalog.js';
import { nutrition } from './nutrition.js';
import {
  defaults,
  recipe,
  candidates,
  settingsErrors,
  generatePlan,
  withWeight,
  calorieGoal,
  planSnapshot,
  rearrangePlan,
  changeServings,
  extraGrocery,
  shoppingSummary,
  groceries,
  diaryEntry,
  localDate,
  isValidBarcode,
  isBreakfast,
  fitsSlot,
} from './domain.js';
import { loadState, saveState, parseBackup, STORAGE_KEY } from './storage.js';
import {
  shell,
  statusBar,
  menuView,
  menuOptionsSheet,
  newMenuSheet,
  mealActionsSheet,
  destinationSheet,
  swapSheet,
  recipesView,
  recipeCard,
  filterRecipes,
  recipeSheet,
  cookView,
  shoppingView,
  shopModeView,
  grocerySheet,
  extraForm,
  pantryView,
  moreView,
  plansView,
  privacyView,
  reminderSheet,
  reminderICS,
  confirmSheet,
  installSheet,
} from './views.js';
import {
  diaryView,
  foodPicker,
  pickerRows,
  quickKcalForm,
  foodForm,
  foodCopyForm,
  entrySheet,
  weightForm,
  goalSheet,
  goalPreview,
  paceOptions,
  macroTargetsSheet,
  scannerSheet,
} from './diary-views.js';
import {
  STEPS,
  LAST_STEP,
  onboardingView,
  showStep,
  showBuilding,
  syncStep,
  setError,
  sceneFor,
  pick,
  liveCount,
  budgetNote,
  dislikesSheet,
  dislikeGroups,
  STORY,
} from './onboarding.js';
import { applyScene, react, startIdle, lookAt } from './table.js';
import { esc, icon, money, num, dayName } from './ui.js';
import { Scanner } from './scanner.js';
import { copiesForDates, parseAdiosExport, NUTRIENTS, macroEnergyShares } from './fitness.js';
import { lookupBarcode, searchOnline } from './foods.js';
import { convertQuantity } from './servings.js';
import { initPwa, pwaState, installApp, checkAppUpdate } from './pwa.js';

const root = document.getElementById('app'),
  sheet = document.getElementById('sheet'),
  toastEl = document.getElementById('toast');

let storage;
try {
  storage = window.localStorage;
  storage.getItem('probe');
} catch {
  const memory = new Map();
  storage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: (k) => memory.delete(k),
  };
}
migrateLocalKeys(storage);
const loaded = loadState(storage);
let state = loaded.state;

const ui = {
  wizard: null,
  building: false,
  keep: null,
  undo: null,
  shopMode: false,
  query: '',
  filter: 'all',
  date: localDate(),
  picker: newPicker('Обяд'),
  interval: 'monthly',
  sheetRecipe: null,
  dislikeQuery: '',
  beat: 0,
};
let cookTimer = null,
  cookTick = null,
  wakeLock = null,
  toastTimer = null,
  storyTimer = null,
  stopIdle = null,
  lastFocus = null,
  deleted = null,
  diaryBackup = null,
  pending = null;
const scanner = new Scanner();
function newPicker(meal) {
  return { meal, tab: 'all', query: '', online: { status: 'idle', query: '', results: [], error: '' } };
}
let onlineAt = 0,
  onlineController = null;
const reduced = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

/* ---------- basics ---------- */

function persist() {
  const ok = saveState(storage, state);
  if (!ok) toast('Няма място за запазване. Изтегли резервно копие от „Още“.', { error: true });
  return ok;
}

function toast(text, { error = false, action = '', label = 'Върни' } = {}) {
  toastEl.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button" data-action="${action}">${esc(label)}</button>` : ''}`;
  toastEl.classList.toggle('is-error', error);
  toastEl.classList.add('is-on');
  // A popover sits in the top layer, so the message shows above an open sheet too.
  try {
    if (toastEl.showPopover) {
      if (toastEl.matches(':popover-open')) toastEl.hidePopover();
      toastEl.showPopover();
    }
  } catch {}
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-on');
    try {
      toastEl.hidePopover?.();
    } catch {}
  }, action ? 7000 : 3800);
}

const ROUTES = ['menu', 'recipes', 'shopping', 'pantry', 'diary', 'more', 'plans', 'privacy'];
const ALIAS = { plan: 'menu', settings: 'more' };
function route() {
  const raw = location.hash.slice(1);
  const r = ALIAS[raw] || raw;
  return ROUTES.includes(r) ? r : 'menu';
}
function navigate(page) {
  if (route() === page && location.hash.slice(1) === page) {
    render();
    window.scrollTo?.(0, 0);
  } else location.hash = page;
}

async function keepAwake(on) {
  try {
    if (on && !wakeLock) wakeLock = (await navigator.wakeLock?.request('screen')) || null;
    if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {
    wakeLock = null;
  }
}

function exportFile(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- rendering ---------- */

function render() {
  if (ui.wizard) return mountWizard();
  stopStory();
  stopIdle?.();
  stopIdle = null;
  document.body.classList.remove('is-onboarding');
  const r = route();
  document.body.classList.toggle('is-shopping', ui.shopMode && r === 'shopping');
  if (ui.shopMode && r === 'shopping') {
    root.innerHTML = `<main class="main main-shop" id="main" tabindex="-1">${shopModeView(state)}</main>`;
    return;
  }
  if (r !== 'menu') ui.keep = null;
  const views = {
    menu: () => menuView(state, ui),
    recipes: () => recipesView(state, ui.query, ui.filter),
    shopping: () => shoppingView(state),
    pantry: () => pantryView(state),
    diary: () => diaryView(state, ui.date, localDate()),
    more: () => moreView(state, pwaState()),
    plans: () => plansView(ui.interval),
    privacy: privacyView,
  };
  root.innerHTML = shell(r, views[r](), pwaState());
}

/** Re-render and put focus back on the same control, so a tap never loses your place. */
function refresh() {
  const active = document.activeElement;
  const key = active?.dataset?.id && (active.dataset.change || active.dataset.action);
  let selector = null;
  if (key) {
    const id = globalThis.CSS?.escape
      ? CSS.escape(active.dataset.id)
      : String(active.dataset.id).replace(/[^\w:-]/g, '');
    selector = `[data-${active.dataset.change ? 'change' : 'action'}="${key}"][data-id="${id}"]`;
  }
  render();
  if (selector) root.querySelector(selector)?.focus({ preventScroll: true });
}

/* ---------- sheets ---------- */

function openSheet(html, { size = 'auto', keepScroll = false } = {}) {
  if (!sheet.open) lastFocus = document.activeElement;
  const body = sheet.querySelector('.sheet-body');
  const top = keepScroll && body ? body.scrollTop : 0;
  sheet.className = `sheet sheet-${size}`;
  sheet.innerHTML = `<div class="sheet-bar"><span class="sheet-grabber" aria-hidden="true"></span><button type="button" class="icon-btn" data-action="close-sheet" aria-label="Затвори">${icon('close', 22)}</button></div><div class="sheet-body">${html}</div>`;
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('.sheet-body').scrollTop = top;
  updateFoodPreview();
}

function closeSheet() {
  scanner.stop();
  clearInterval(cookTick);
  cookTimer = null;
  if (sheet.open) sheet.close();
  sheet.innerHTML = '';
  ui.sheetRecipe = null;
  if (!ui.shopMode) keepAwake(false);
  if (lastFocus?.isConnected) lastFocus.focus?.({ preventScroll: true });
  lastFocus = null;
}

function openRecipe(id, index = null, { keepScroll = false, preview = false } = {}) {
  const r = recipe(id);
  if (!r) return;
  ui.sheetRecipe = { id, index, preview };
  const base = preview ? { ...state, settings: ui.wizard?.draft || state.settings } : state;
  openSheet(
    recipeSheet(r, base, {
      index,
      preview,
      done: cookingSteps(storage, r.id, r.steps.length),
      people: preview ? base.settings.people : null,
    }),
    { size: 'tall', keepScroll },
  );
}

/* ---------- setup (onboarding) ---------- */

function stage() {
  return root.querySelector('.ob-stage svg');
}

function startWizard(step = null) {
  if (state.locked) {
    toast('Отключи менюто, за да смениш предпочитанията.');
    return;
  }
  closeSheet();
  const editing = state.onboarded || state.plan.length > 0;
  const restored = !editing && restoreDraft(storage);
  ui.wizard = restored || {
    draft: structuredClone(state.settings),
    step: step ?? (editing ? 1 : 0),
    dir: 'forward',
    error: '',
  };
  ui.wizard.editing = editing;
  ui.keep = null;
  mountWizard();
  window.scrollTo?.(0, 0);
}

function mountWizard() {
  const w = ui.wizard;
  document.body.classList.add('is-onboarding');
  document.body.classList.remove('is-shopping');
  root.innerHTML = onboardingView(w.draft, w.step, { error: w.error, canClose: w.editing, dir: w.dir });
  const svg = stage();
  applyScene(svg, sceneFor(w.step, w.draft, ui.beat));
  stopIdle?.();
  stopIdle = startIdle(svg);
  if (STEPS[w.step] === 'welcome') startStory();
  else if (STEPS[w.step] === 'result') revealResult();
}

function goStep(step, dir) {
  const w = ui.wizard;
  if (!w || !Number.isInteger(step) || step < 0 || step > LAST_STEP) return;
  w.dir = dir || (step < w.step ? 'back' : 'forward');
  w.step = step;
  w.error = '';
  stopStory();
  if (!showStep(root, w.draft, step, { canClose: w.editing, dir: w.dir })) return mountWizard();
  const svg = stage();
  if (STEPS[step] === 'welcome') {
    applyScene(svg, sceneFor(0, w.draft, ui.beat));
    startStory();
  } else if (STEPS[step] === 'result') revealResult();
  else applyScene(svg, sceneFor(step, w.draft));
  if (!state.onboarded) saveDraft(storage, w);
  window.scrollTo?.(0, 0);
  root.querySelector('.ob-body')?.scrollTo?.(0, 0);
  root.querySelector('#ob-title')?.focus({ preventScroll: true });
}

// The cloche stays on for a beat, then lifts to show what is for dinner.
function revealResult() {
  const w = ui.wizard,
    svg = stage();
  const scene = sceneFor(LAST_STEP, w.draft);
  if (!scene.cloche || reduced()) return applyScene(svg, scene);
  applyScene(svg, { ...scene, cloche: 'closed', fx: '' });
  setTimeout(() => {
    if (ui.wizard && STEPS[ui.wizard.step] === 'result' && stage() === svg) {
      applyScene(svg, scene);
      react(svg, 'sparkle');
    }
  }, 650);
}

function setBeat(beat) {
  ui.beat = ((beat % STORY.length) + STORY.length) % STORY.length;
  const svg = stage();
  if (!svg || !ui.wizard) return;
  applyScene(svg, sceneFor(0, ui.wizard.draft, ui.beat));
  root.querySelectorAll('[data-story] li').forEach((li) => {
    const on = Number(li.dataset.beat) === ui.beat;
    li.classList.toggle('is-on', on);
    li.toggleAttribute('aria-hidden', !on);
  });
  root.querySelectorAll('[data-story] .ob-dots button').forEach((b) => {
    b.classList.remove('is-on');
    if (Number(b.dataset.beat) === ui.beat) {
      void b.offsetWidth;
      b.classList.add('is-on');
    }
  });
}
function startStory() {
  stopStory();
  if (reduced()) {
    setBeat(1);
    return;
  }
  setBeat(ui.beat);
  storyTimer = setInterval(() => {
    if (!document.hidden) setBeat(ui.beat + 1);
  }, 3400);
}
function stopStory() {
  clearInterval(storyTimer);
  storyTimer = null;
}

function reactToPick(svg, key, value, before, after) {
  const was = liveCount(before).count,
    now = liveCount(after).count;
  if (was && !now) return react(svg, 'shake');
  const added = Array.isArray(after[key]) && after[key].length > (before[key] || []).length;
  if (key === 'allergens') return react(svg, added ? 'tilt' : 'nod');
  if (key === 'clear') return react(svg, 'nod');
  if (['goal', 'diet'].includes(key)) {
    react(svg, 'hop');
    return setTimeout(() => react(svg, 'sparkle'), 200);
  }
  if (['maxCalories', 'maxTime', 'days', 'slots'].includes(key)) return react(svg, 'nod');
  if (key === 'dislikes') return;
  return react(svg, added || key === 'people' || key === 'needs' ? 'hop' : 'nod');
}

async function buildWeek() {
  const w = ui.wizard;
  if (!w || ui.building) return;
  const errors = settingsErrors(w.draft);
  if (errors.length) return setError(root, errors[0]);
  ui.building = true;
  stopStory();
  showBuilding(root);
  const svg = stage();
  applyScene(svg, sceneFor('building', w.draft));
  const started = performance.now();
  await sleep(60);
  const next = { ...state, settings: structuredClone(w.draft) };
  const result = generatePlan(next);
  if (!result.plan) {
    ui.building = false;
    w.error = result.reason;
    goStep(LAST_STEP, 'back');
    setError(root, result.reason);
    return;
  }
  ui.undo = state.plan.length ? planSnapshot(state) : null;
  state.settings = next.settings;
  state.plan = result.plan;
  state.cooked = {};
  state.checked = {};
  state.onboarded = true;
  clearDraft(storage);
  persist();
  await sleep((reduced() ? 500 : 2300) - (performance.now() - started));
  ui.building = false;
  ui.wizard = null;
  if (route() !== 'menu' || location.hash.slice(1) !== 'menu') location.hash = 'menu';
  render();
  window.scrollTo?.(0, 0);
  toast(result.withinBudget ? 'Седмицата е на масата.' : `Седмицата е на масата. Сметката е ${money(result.cost)}, над бюджета.`);
}

/* ---------- menu helpers ---------- */

function shoppingText() {
  const rows = groceries(state).filter((r) => r.packs);
  const summary = shoppingSummary(state);
  return [
    'На маса · списък за пазаруване',
    'Примерни цени за цели опаковки.',
    '',
    ...state.settings.stores.flatMap((s) => {
      const list = rows.filter((r) => r.store === s);
      return list.length
        ? [s, ...list.map((r) => `${state.checked[r.k] ? '[x]' : '[ ]'} ${r.name}: ${r.packs} × ${num(r.size, 1)} ${r.unit} · ${money(r.cost)}`), '']
        : [];
    }),
    ...(state.extras.length
      ? [
          'И още',
          ...state.extras.map(
            (e) => `${e.checked ? '[x]' : '[ ]'} ${e.name}: ${num(e.amount, 2)} ${e.unit} · ${e.store} · ${e.price === null ? 'без цена' : money(e.price)}`,
          ),
          '',
        ]
      : []),
    `Общо: ${money(summary.knownTotal)}${summary.unknownPrices ? ` и ${summary.unknownPrices} без цена` : ''}`,
  ].join('\n');
}

function commitChange(next, message) {
  ui.undo = planSnapshot(state);
  Object.assign(state, next);
  persist();
  closeSheet();
  render();
  toast(message, { action: 'undo' });
}

/* ---------- diary helpers ---------- */

function pickedRows() {
  return pickerRows(state, ui.picker).map((row) => row.e);
}
function showPicker(keepScroll = false) {
  openSheet(foodPicker(state, ui.date, ui.picker), { size: 'tall', keepScroll });
}
/** Re-draw only the results, so the search field keeps focus and the caret. */
function refreshPickerResults() {
  const box = sheet.querySelector('[data-picker-results]');
  if (!box) return;
  const holder = document.createElement('div');
  holder.innerHTML = foodPicker(state, ui.date, ui.picker);
  box.innerHTML = holder.querySelector('[data-picker-results]')?.innerHTML || '';
}
// Open Food Facts allows about ten searches a minute: wait if the last one was very recent.
async function runOnlineSearch() {
  const query = ui.picker.query.trim();
  if (query.length < 2) return;
  onlineController?.abort();
  const controller = new AbortController();
  onlineController = controller;
  ui.picker.online = { status: 'loading', query, results: [], error: '' };
  refreshPickerResults();
  const wait = 6500 - (Date.now() - onlineAt);
  if (wait > 0) await sleep(wait);
  if (controller.signal.aborted) return;
  onlineAt = Date.now();
  try {
    const results = await searchOnline(query, { signal: controller.signal });
    if (controller.signal.aborted || ui.picker.query.trim() !== query) return;
    ui.picker.online = { status: 'done', query, results, error: '' };
  } catch (error) {
    if (error.name === 'AbortError') return;
    ui.picker.online = { status: 'error', query, results: [], error: error.message };
  }
  if (sheet.querySelector('[data-picker-results]')) refreshPickerResults();
}
function openFood(e, notice = '') {
  const entry = { ...e, id: undefined, date: ui.date, meal: ui.picker.meal, kcal: e.kcal ?? '' };
  openSheet(`${notice}${foodForm(ui.date, ui.picker.meal, entry)}`, { size: 'tall' });
}
function diaryDone(message) {
  persist();
  closeSheet();
  if (route() !== 'diary') navigate('diary');
  else render();
  toast(message, { action: 'undo-diary' });
}

function updateFoodPreview() {
  const form = sheet.querySelector('[data-form="food"]');
  if (!form) return;
  const preview = form.querySelector('[data-food-preview]');
  let scale = 0;
  try {
    const q = convertQuantity({
      amount: form.querySelector('[name="amount"]').value,
      measure: form.querySelector('[name="measure"]').value,
      unit: form.dataset.unit,
      basis: Number(form.dataset.basis),
      servingQuantity: form.querySelector('[name="servingQuantity"]')?.value,
      confirmed: !!form.querySelector('[name="servingConfirmed"]')?.checked,
    });
    scale = q.amount / Number(form.dataset.basis);
  } catch {
    preview.innerHTML = '<p class="fine">Въведи количество, за да видиш сметката.</p>';
    return;
  }
  const targets = { kcal: state.dailyTarget, ...state.macroTargets };
  const value = (key) => {
    const raw = form.querySelector(`[name="${key}"]`)?.value.trim();
    return raw === '' || raw == null ? null : Number(raw) * scale;
  };
  const cells = ['kcal', 'protein', 'carbs', 'fat']
    .map((key) => {
      const v = value(key);
      const unit = key === 'kcal' ? 'ккал' : 'г';
      const label = key === 'kcal' ? 'Калории' : NUTRIENTS[key].label;
      return `<div><small>${label}</small><b>${v === null || !Number.isFinite(v) ? '—' : `${num(v, key === 'kcal' ? 0 : 1)} ${unit}`}</b>${v !== null && targets[key] > 0 ? `<small>${num((v / targets[key]) * 100, 0)}% от целта</small>` : ''}</div>`;
    })
    .join('');
  const shares = macroEnergyShares({ protein: value('protein'), carbs: value('carbs'), fat: value('fat') });
  preview.innerHTML = `<p class="eyebrow">За изяденото</p><div class="preview-grid">${cells}</div>${shares ? `<p class="fine">Енергия от макросите: протеин ${num(shares.protein, 0)}%, въглехидрати ${num(shares.carbs, 0)}%, мазнини ${num(shares.fat, 0)}%.</p>` : ''}`;
}

async function processBarcode(code) {
  scanner.stop();
  if (!isValidBarcode(code)) {
    const error = sheet.querySelector('[data-form="barcode"] .form-error');
    if (error) error.textContent = 'Баркодът не е валиден. Провери цифрите.';
    else toast('Баркодът не е валиден. Провери цифрите.', { error: true });
    return;
  }
  const note = (kind, text) => `<p class="notice ${kind === 'ok' ? 'notice-accent' : ''}">${icon(kind === 'ok' ? 'check' : 'info', 18)}<span>${esc(text)}</span></p>`;
  const manual = { name: '', barcode: code, source: 'manual', unit: 'г', basis: 100, amount: 100, kcal: '', protein: null };
  const known = knownBarcode(state, code);
  if (known) return openFood(known, note('ok', 'Познахме го от твоите записи. Провери количеството.'));
  if (navigator.onLine === false)
    return openFood(manual, note('info', 'Няма интернет. Въведи стойностите от етикета; следващия път ще го познаем и без връзка.'));
  openSheet(`<div class="lookup" role="status">${icon('scan', 40)}<h2 class="sheet-title">Търсим продукта</h2><p class="sheet-sub">Баркод ${esc(code)} · Open Food Facts</p></div>`);
  const generation = ++lookupGeneration;
  try {
    const found = await lookupBarcode(code);
    if (generation !== lookupGeneration || !sheet.open) return;
    if (found && found.kcal !== null)
      return openFood(
        found,
        note('ok', `Намерихме го: ${found.name}${found.brand ? ', ' + found.brand : ''}. Стойностите са за 100 ${found.unit === 'мл' ? 'мл' : 'г'} от Open Food Facts; свери ги с етикета.`),
      );
    if (found)
      return openFood(
        { ...found, source: 'manual' },
        note('info', 'Намерихме името, но без калории. Допиши стойностите от етикета.'),
      );
    openFood(manual, note('info', 'Няма го в Open Food Facts. Въведи стойностите от етикета веднъж и следващия път ще го познаем.'));
  } catch (error) {
    if (generation !== lookupGeneration || !sheet.open) return;
    openFood(manual, note('info', `${error.message} Можеш да въведеш стойностите от етикета.`));
  }
}
let lookupGeneration = 0;

/* ---------- actions ---------- */

const actions = {
  'close-sheet': closeSheet,

  // setup
  wizard: () => startWizard(),
  'wizard-pick': (el) => {
    const w = ui.wizard;
    if (!w) return;
    const { key, value } = el.dataset;
    const before = w.draft;
    w.draft = pick(before, key, value);
    w.error = '';
    syncStep(root, w.draft);
    if (sheet.open) syncStep(sheet, w.draft);
    setError(root, '');
    const svg = stage();
    applyScene(svg, sceneFor(w.step, w.draft));
    reactToPick(svg, key, value, before, w.draft);
    const box = el.getBoundingClientRect?.();
    if (box?.width && !sheet.open) lookAt(svg, box.left + box.width / 2, box.top + box.height / 2);
    if (navigator.userActivation?.isActive) navigator.vibrate?.(8);
    if (!state.onboarded) saveDraft(storage, w);
  },
  'wizard-back': () => {
    const w = ui.wizard;
    if (!w) return;
    // When changing preferences, going back from the first question closes the setup.
    if (w.editing && w.step <= 1) actions['wizard-close']();
    else if (w.step > 0) goStep(w.step - 1, 'back');
  },
  'wizard-close': () => {
    if (!ui.wizard?.editing) return;
    ui.wizard = null;
    render();
  },
  'wizard-explore': () => {
    if (state.onboarded || state.plan.length) return;
    state.onboarded = true;
    clearDraft(storage);
    persist();
    ui.wizard = null;
    navigate('recipes');
  },
  'wizard-step': (el) => {
    closeSheet();
    goStep(Number(el.dataset.step));
  },
  'wizard-recipe': (el) => openRecipe(el.dataset.id, null, { preview: true }),
  dislikes: () => {
    ui.dislikeQuery = '';
    openSheet(dislikesSheet(ui.wizard.draft), { size: 'tall' });
  },
  story: (el) => {
    setBeat(Number(el.dataset.beat));
    if (!reduced()) startStory();
  },

  // menu
  'menu-options': () => openSheet(menuOptionsSheet(state, !!ui.undo)),
  lock: () => {
    state.locked = !state.locked;
    persist();
    closeSheet();
    render();
    toast(state.locked ? 'Менюто е заключено.' : 'Менюто е отключено.');
  },
  undo: () => {
    if (!ui.undo) return;
    Object.assign(state, ui.undo);
    ui.undo = null;
    persist();
    closeSheet();
    render();
    toast('Върнахме предишното меню.');
  },
  'new-menu': () => !state.locked && openSheet(newMenuSheet(state)),
  regenerate: () => {
    if (state.locked) return;
    const result = generatePlan(state);
    if (!result.plan) return toast(result.reason, { error: true });
    commitChange({ plan: result.plan, cooked: {}, checked: {} }, 'Новото меню е готово.');
  },
  'keep-start': () => {
    closeSheet();
    ui.keep = new Set();
    render();
    window.scrollTo?.(0, 0);
  },
  'keep-toggle': (el) => {
    const i = Number(el.dataset.index);
    if (!ui.keep || !state.plan[i]) return;
    ui.keep.has(i) ? ui.keep.delete(i) : ui.keep.add(i);
    refresh();
  },
  'keep-cancel': () => {
    ui.keep = null;
    render();
  },
  'keep-apply': () => {
    const keep = [...(ui.keep || [])];
    const result = generatePlan(state, Math.random, { keep });
    if (!result.plan) return toast(result.reason, { error: true });
    const cooked = Object.fromEntries(keep.filter((i) => state.cooked[i]).map((i) => [i, true]));
    ui.keep = null;
    const changed = result.plan.filter((e, i) => e.id !== state.plan[i]?.id).length;
    commitChange(
      { plan: result.plan, cooked, checked: {} },
      keep.length ? `Сменихме ${changed} ${changed === 1 ? 'ястие' : 'ястия'}, ${keep.length} остават.` : 'Новото меню е готово.',
    );
  },
  recipe: (el) => openRecipe(el.dataset.id, el.dataset.index === undefined ? null : Number(el.dataset.index)),
  cooked: (el) => {
    const i = Number(el.dataset.index);
    if (!state.plan[i]) return;
    state.cooked[i] = !state.cooked[i];
    persist();
    refresh();
  },
  'meal-actions': (el) => openSheet(mealActionsSheet(state, Number(el.dataset.index))),
  swap: (el) => {
    if (state.locked) return;
    openSheet(swapSheet(state, Number(el.dataset.index)), { size: 'tall' });
  },
  'choose-swap': (el) => {
    if (state.locked) return;
    const id = el.dataset.id,
      i = Number(el.dataset.index);
    if (!state.plan[i] || !candidates(state.settings).some((r) => r.id === id && fitsSlot(r, state.plan[i].slot))) return;
    const next = planSnapshot(state);
    next.plan[i].id = id;
    delete next.cooked[i];
    next.checked = {};
    commitChange(next, `${dayName(state.plan[i].day)}: ${recipe(id).name}.`);
  },
  'move-meal': (el) => openSheet(destinationSheet(state, Number(el.dataset.index), 'move'), { size: 'tall' }),
  'repeat-meal': (el) => openSheet(destinationSheet(state, Number(el.dataset.index), 'repeat'), { size: 'tall' }),
  'place-meal': (el) => {
    const mode = el.dataset.mode;
    const next = rearrangePlan(state, Number(el.dataset.from), Number(el.dataset.to), mode);
    commitChange(next, mode === 'move' ? 'Разменихме ястията.' : 'Ястието е повторено, покупките са обновени.');
  },
  'export-plan': () =>
    exportFile(
      'na-masa-menu.txt',
      `На маса · менюто\n\n${state.plan.map((e) => `${dayName(e.day)}, ${e.slot.toLocaleLowerCase('bg')}: ${recipe(e.id).name} (${e.people} порции)`).join('\n')}\n\n${shoppingText()}`,
    ),
  reminder: () => openSheet(reminderSheet()),

  // recipe and cooking
  favorite: (el) => {
    const id = el.dataset.id;
    const on = !state.favorites.includes(id);
    state.favorites = on ? [...state.favorites, id] : state.favorites.filter((v) => v !== id);
    persist();
    if (sheet.open && ui.sheetRecipe?.id === id) {
      refresh();
      openRecipe(id, ui.sheetRecipe.index, { keepScroll: true });
    } else refresh();
    toast(on ? 'Добавена в любими. Ще влиза по-често в менюто.' : 'Махната от любими.');
  },
  servings: (el) => {
    const i = Number(el.dataset.index);
    if (!state.plan[i]) return;
    const people = state.plan[i].people + Number(el.dataset.delta);
    const next = changeServings(state, i, people);
    ui.undo = planSnapshot(state);
    Object.assign(state, next);
    persist();
    render();
    openRecipe(state.plan[i].id, i, { keepScroll: true });
  },
  cook: async (el) => {
    const r = recipe(el.dataset.id),
      step = Number(el.dataset.step);
    if (!r || !Number.isInteger(step) || step < 0 || step >= r.steps.length) return;
    await keepAwake(true);
    const people = ui.sheetRecipe?.index != null ? state.plan[ui.sheetRecipe.index]?.people : state.settings.people;
    ui.cook = { id: r.id, people: people || state.settings.people, index: ui.sheetRecipe?.index ?? ui.cook?.index ?? null };
    openSheet(cookView(r, step, cookTimer, ui.cook.people), { size: 'full' });
    sheet.querySelector('.cook-nav .btn-primary')?.focus({ preventScroll: true });
  },
  'cook-timer': (el) => {
    const minutes = Number(el.dataset.minutes);
    if (!(minutes > 0 && minutes <= 300)) return;
    clearInterval(cookTick);
    cookTimer = { id: el.dataset.id, step: Number(el.dataset.step), ends: Date.now() + minutes * 60000, label: '' };
    const tick = () => {
      if (!cookTimer) return clearInterval(cookTick);
      const left = Math.max(0, cookTimer.ends - Date.now());
      cookTimer.label = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;
      const node = sheet.querySelector('[data-timer-left]');
      if (node) node.textContent = cookTimer.label;
      if (!left) {
        clearInterval(cookTick);
        cookTimer = null;
        navigator.vibrate?.([300, 150, 300]);
        toast('Времето изтече.');
      }
    };
    tick();
    cookTick = setInterval(tick, 1000);
    openSheet(cookView(recipe(el.dataset.id), Number(el.dataset.step), cookTimer, ui.cook?.people || 2), { size: 'full' });
  },
  'cook-timer-stop': () => {
    clearInterval(cookTick);
    const current = cookTimer;
    cookTimer = null;
    if (current) openSheet(cookView(recipe(current.id), current.step, null, ui.cook?.people || 2), { size: 'full' });
  },
  'cook-done': (el) => {
    const r = recipe(el.dataset.id);
    const i = ui.cook?.index;
    if (i != null && state.plan[i]?.id === r?.id) {
      state.cooked[i] = true;
      persist();
    }
    ui.cook = null;
    closeSheet();
    render();
    toast(`${r ? r.name : 'Ястието'} е готово. Добър апетит.`);
  },

  // recipes
  'recipe-filter': (el) => {
    ui.filter = el.dataset.filter;
    render();
  },

  // shopping
  'shop-mode': async () => {
    ui.shopMode = !ui.shopMode;
    await keepAwake(ui.shopMode);
    render();
    window.scrollTo?.(0, 0);
  },
  'grocery-edit': (el) => openSheet(grocerySheet(state, el.dataset.id)),
  'extra-add': () => {
    if (state.extras.length >= 200) return toast('Списъкът събира до 200 допълнителни продукта.', { error: true });
    openSheet(extraForm(state));
  },
  'extra-edit': (el) => {
    const e = state.extras.find((x) => x.id === el.dataset.id);
    if (e) openSheet(extraForm(state, e));
  },
  'extra-delete': (el) => {
    deleted = state.extras.find((x) => x.id === el.dataset.id) || null;
    state.extras = state.extras.filter((x) => x.id !== el.dataset.id);
    persist();
    closeSheet();
    render();
    toast('Продуктът е махнат.', { action: 'extra-undo' });
  },
  'extra-undo': () => {
    if (deleted && !state.extras.some((x) => x.id === deleted.id)) {
      state.extras.push(deleted);
      deleted = null;
      persist();
      render();
    }
  },
  'uncheck-all': () => {
    state.checked = {};
    state.extras.forEach((e) => (e.checked = false));
    persist();
    render();
  },
  'copy-shopping': async () => {
    try {
      await navigator.clipboard.writeText(shoppingText());
      toast('Списъкът е копиран. Постави го в съобщение или бележка.');
    } catch {
      exportFile('na-masa-pokupki.txt', shoppingText());
      toast('Списъкът е изтеглен като файл.');
    }
  },
  'export-shopping': () => exportFile('na-masa-pokupki.txt', shoppingText()),

  // diary
  'diary-jump': (el) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(el.dataset.date)) return;
    ui.date = el.dataset.date;
    render();
  },
  'add-food': (el) => {
    scanner.stop();
    ui.picker = newPicker(el?.dataset?.meal || defaultMeal());
    showPicker();
  },
  'food-tab': (el) => {
    ui.picker.tab = el.dataset.tab === 'saved' ? 'saved' : 'all';
    showPicker(true);
  },
  'picker-meal': (el) => {
    ui.picker.meal = el.dataset.meal;
    sheet.querySelectorAll('[data-action="picker-meal"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.meal === ui.picker.meal)));
  },
  'food-online': () => runOnlineSearch(),
  'quick-kcal': () => openSheet(quickKcalForm(ui.date, ui.picker.meal)),
  'manual-food': (el) => {
    scanner.stop();
    openSheet(foodForm(ui.date, el?.dataset?.meal || ui.picker.meal), { size: 'tall' });
  },
  'pick-food': (el) => {
    const e = pickedRows()[Number(el.dataset.index)];
    if (!e) return;
    openFood(
      e,
      e.kind === 'off'
        ? `<p class="notice">${icon('info', 18)}<span>От Open Food Facts. Стойностите са за 100 ${e.unit === 'мл' ? 'мл' : 'г'}; свери ги с етикета.</span></p>`
        : '',
    );
  },
  'quick-repeat-food': (el) => {
    const previous = pickedRows()[Number(el.dataset.index)];
    if (previous && !['recent', 'saved'].includes(previous.kind)) return openFood(previous);
    if (!previous || state.diary.length >= 20000) return;
    const entry = diaryEntry({ ...previous, id: crypto.randomUUID(), date: ui.date, meal: ui.picker.meal });
    diaryBackup = structuredClone(state.diary);
    state.diary.push(entry);
    diaryDone(`Добавено: ${entry.name}, ${num(entry.amount, 1)} ${entry.unit}.`);
  },
  'remove-saved-food': (el) => {
    state.savedFoods = state.savedFoods.filter((e) => e.id !== el.dataset.id);
    persist();
    showPicker(true);
  },
  entry: (el) => {
    const e = state.diary.find((x) => x.id === el.dataset.id);
    if (e) openSheet(entrySheet(e));
  },
  'edit-food': (el) => {
    const e = state.diary.find((x) => x.id === el.dataset.id);
    if (e) openSheet(foodForm(ui.date, e.meal, e), { size: 'tall' });
  },
  'copy-food': (el) => {
    const e = state.diary.find((x) => x.id === el.dataset.id);
    if (e) openSheet(foodCopyForm(e, ui.date));
  },
  'save-food': (el) => {
    const e = state.diary.find((x) => x.id === el.dataset.id);
    if (!e) return;
    const same = (v) => v.name === e.name && (v.brand || '') === (e.brand || '');
    if (state.savedFoods.length >= 500 && !state.savedFoods.some(same))
      return toast('„Мои храни“ е пълно: до 500 храни.', { error: true });
    state.savedFoods = state.savedFoods.filter((v) => !same(v));
    state.savedFoods.push({ ...structuredClone(e), id: crypto.randomUUID() });
    persist();
    closeSheet();
    toast('Запазено в „Мои храни“.');
  },
  'delete-food': (el) => {
    diaryBackup = structuredClone(state.diary);
    state.diary = state.diary.filter((e) => e.id !== el.dataset.id);
    diaryDone('Записът е изтрит.');
  },
  'undo-diary': () => {
    if (!diaryBackup) return;
    state.diary = diaryBackup;
    diaryBackup = null;
    persist();
    render();
    toast('Върнахме дневника.');
  },
  'daily-target': () => openSheet(goalSheet(state, 'calc'), { size: 'tall' }),
  'goal-mode': (el) => openSheet(goalSheet(state, el.dataset.mode === 'manual' ? 'manual' : 'calc'), { size: 'tall' }),
  'macro-targets': () => openSheet(macroTargetsSheet(state)),
  water: (el) => {
    const count = Number(el.dataset.count);
    if (!Number.isInteger(count) || count < 0 || count > 30) return;
    if (count) state.water[ui.date] = count;
    else delete state.water[ui.date];
    persist();
    refresh();
  },
  'weight-form': () => {
    const today = state.weights.find((e) => e.date === ui.date);
    openSheet(weightForm(ui.date, today?.kg ?? state.weights.at(-1)?.kg));
  },
  'diary-recipe': (el) => {
    const r = recipe(el.dataset.id);
    if (!r) return;
    const n = nutrition(r);
    const meal = isBreakfast(r) ? 'Закуска' : 'Вечеря';
    openSheet(
      foodForm(ui.date, meal, {
        name: r.name,
        date: ui.date,
        meal,
        amount: 1,
        unit: 'порции',
        basis: 1,
        kcal: n.kcal,
        protein: n.protein,
        carbs: n.carbs,
        fat: n.fat,
        fiber: n.fiber,
        source: 'recipe',
      }),
      { size: 'tall' },
    );
  },
  'export-diary': () => {
    const keys = ['date', 'meal', 'name', 'brand', 'amount', 'unit', 'basis', 'kcal', ...Object.keys(NUTRIENTS)];
    const cell = (v) => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"';
    exportFile(
      'na-masa-dnevnik.csv',
      '﻿' + [keys.map(cell).join(','), ...state.diary.map((e) => keys.map((k) => cell(e[k])).join(','))].join('\r\n'),
      'text/csv;charset=utf-8',
    );
  },
  scanner: (el) => {
    if (el?.dataset?.meal) ui.picker.meal = el.dataset.meal;
    openSheet(scannerSheet(), { size: 'tall' });
  },
  'start-camera': async (el) => {
    el.disabled = true;
    try {
      const video = sheet.querySelector('#scan-video');
      video.parentElement.classList.add('is-live');
      await scanner.start(video, processBarcode);
    } catch (e) {
      toast(e.name === 'NotAllowedError' ? 'Камерата не е разрешена. Въведи цифрите ръчно.' : e.message, { error: true });
      el.disabled = false;
    }
  },

  // more
  billing: (el) => {
    ui.interval = el.dataset.value === 'yearly' ? 'yearly' : 'monthly';
    render();
  },
  backup: () =>
    exportFile(
      `na-masa-${localDate()}.json`,
      JSON.stringify({ app: 'na-masa', version: 3, exportedAt: new Date().toISOString(), state }, null, 2),
      'application/json',
    ),
  reset: () =>
    openSheet(
      confirmSheet(
        'Да изтрием ли всичко?',
        'Менюто, покупките, дневникът и настройките ще изчезнат от това устройство. Ако искаш да ги запазиш, първо изтегли копие.',
        'confirm-reset',
        'Изтрий всичко',
        true,
        `<button type="button" class="btn btn-secondary" data-action="backup">${icon('download', 18)} Първо копие</button>`,
      ),
    ),
  'confirm-reset': () => {
    try {
      for (const key of [STORAGE_KEY, 'na-masata-v1', COOKING_KEY, LEGACY_KEYS.cooking]) storage.removeItem(key);
      clearDraft(storage);
    } catch {
      return toast('Не успяхме да изтрием данните.', { error: true });
    }
    state = defaults();
    ui.undo = null;
    closeSheet();
    startWizard(0);
    toast('Данните са изтрити. Започваме отначало.');
  },
  'confirm-restore': () => {
    if (!pending?.restore) return;
    state = pending.restore;
    pending = null;
    ui.undo = null;
    persist();
    closeSheet();
    render();
    toast('Копието е възстановено.');
  },
  'confirm-import': () => {
    if (!pending?.import) return;
    diaryBackup = structuredClone(state.diary);
    state.diary.push(...pending.import);
    pending = null;
    diaryDone('Записите са добавени.');
  },
  'install-app': async () => {
    if (!(await installApp())) openSheet(installSheet());
  },
  'check-update': async () => {
    try {
      await checkAppUpdate();
      toast('Проверихме. Ако има нова версия, ще се появи бутон „Обнови“.');
    } catch (e) {
      toast(e.message, { error: true });
    }
  },
  'app-update': () =>
    openSheet(
      confirmSheet(
        'Има нова версия',
        'Менюто, покупките и дневникът остават. Страницата ще се презареди.',
        'confirm-app-update',
        'Обнови сега',
      ),
    ),
  'confirm-app-update': () => {
    if (persist()) document.dispatchEvent(new CustomEvent('apply-app-update'));
  },
};

function defaultMeal() {
  const h = new Date().getHours();
  return h < 11 ? 'Закуска' : h < 16 ? 'Обяд' : h < 21 ? 'Вечеря' : 'Междинно';
}

/* ---------- forms ---------- */

const forms = {
  wizard: async (f) => {
    const w = ui.wizard;
    if (!w || ui.building) return;
    const name = STEPS[w.step];
    if (name === 'household' && f.get('budget') !== null) w.draft = pick(w.draft, 'budget', f.get('budget'));
    let error = '';
    if (name === 'stores' && !w.draft.stores.length) error = 'Избери поне един магазин.';
    if (name === 'household') error = !w.draft.slots.length ? 'Избери поне едно хранене.' : settingsErrors(w.draft)[0] || '';
    if (error) {
      w.error = error;
      setError(root, error);
      react(stage(), 'shake');
      return;
    }
    if (name !== 'result') return goStep(w.step + 1, 'forward');
    await buildWeek();
  },
  extra: (f, form) => {
    const previous = state.extras.find((e) => e.id === form.dataset.id);
    const e = extraGrocery({ ...Object.fromEntries(f), id: form.dataset.id || undefined, checked: previous?.checked || false });
    state.extras = previous ? state.extras.map((v) => (v.id === e.id ? e : v)) : [...state.extras, e];
    persist();
    closeSheet();
    render();
    toast(previous ? 'Продуктът е променен.' : 'Добавено в покупките.');
  },
  grocery: (f, form) => {
    const k = form.dataset.id,
      price = Number(f.get('price')),
      size = Number(f.get('size'));
    if (!PRODUCTS[k]) return;
    if (!Number.isFinite(price) || price < 0 || price > 10000 || !Number.isFinite(size) || size <= 0 || size > 100000)
      throw Error('Провери цената и размера на опаковката.');
    state.prices[k] = price;
    state.packSizes[k] = size;
    const store = f.get('store');
    if (store && state.settings.stores.includes(store)) state.storeFor[k] = store;
    delete state.checked[k];
    persist();
    closeSheet();
    render();
  },
  note: (f, form) => {
    state.notes[form.dataset.id] = String(f.get('note') || '').slice(0, 4000);
    persist();
    toast('Бележката е запазена.');
  },
  pantry: (f) => {
    const pantry = {};
    for (const k of Object.keys(PRODUCTS)) {
      const raw = f.get(k);
      const value = raw === null || raw === '' ? 0 : Number(String(raw).replace(',', '.'));
      if (!Number.isFinite(value) || value < 0 || value > 100000) throw Error(`Провери количеството: ${PRODUCTS[k][0]}.`);
      if (value) pantry[k] = value;
    }
    state.pantry = pantry;
    state.checked = {};
    persist();
    navigate('shopping');
    toast('Наличностите са приспаднати от списъка.');
  },
  food: (f, form) => {
    const quantity = convertQuantity({
      amount: f.get('amount'),
      measure: f.get('measure'),
      unit: form.dataset.unit,
      basis: Number(form.dataset.basis),
      servingQuantity: f.get('servingQuantity'),
      confirmed: f.get('servingConfirmed') === 'yes',
    });
    const e = diaryEntry({
      ...Object.fromEntries(f),
      ...quantity,
      id: form.dataset.id || undefined,
      basis: Number(form.dataset.basis),
      source: form.dataset.source,
      brand: form.dataset.brand,
      servingLabel: String(f.get('servingLabel') || ''),
      barcode: form.dataset.barcode,
    });
    const existing = state.diary.findIndex((v) => v.id === e.id);
    if (existing < 0 && state.diary.length >= 20000) throw Error('Дневникът е пълен.');
    diaryBackup = structuredClone(state.diary);
    if (existing >= 0) state.diary[existing] = e;
    else state.diary.push(e);
    ui.date = e.date;
    diaryDone(existing >= 0 ? 'Записът е променен.' : 'Записано в дневника.');
  },
  'copy-food': (f, form) => {
    const entry = state.diary.find((e) => e.id === form.dataset.id);
    if (!entry) throw Error('Записът вече не съществува.');
    const dates = f.getAll('dates');
    if (f.get('otherDate')) dates.push(f.get('otherDate'));
    const copies = copiesForDates([entry], dates, String(f.get('meal')));
    if (state.diary.length + copies.length > 20000) throw Error('Дневникът е пълен.');
    diaryBackup = structuredClone(state.diary);
    state.diary.push(...copies);
    diaryDone(`Копирано в ${copies.length} ${copies.length === 1 ? 'ден' : 'дни'}.`);
  },
  'macro-targets': (f) => {
    const targets = {};
    for (const k of ['protein', 'carbs', 'fat']) {
      const v = Number(f.get(k) || 0);
      if (!Number.isFinite(v) || v < 0 || v > 2000) throw Error('Целите са от 0 до 2000 г.');
      targets[k] = v;
    }
    state.macroTargets = targets;
    persist();
    closeSheet();
    render();
  },
  'goal-calc': (f) => {
    const g = calorieGoal(goalFormValues(f));
    state.profile = g.profile;
    state.dailyTarget = g.target;
    state.macroTargets = { ...g.macros };
    const last = state.weights.at(-1);
    if (!last || last.kg !== g.profile.weight) state.weights = withWeight(state.weights, { date: localDate(), kg: g.profile.weight });
    persist();
    closeSheet();
    render();
    toast(`Целта ти е ${num(g.target)} ккал на ден.`);
  },
  target: (f) => {
    const target = Number(f.get('target') || 0);
    if (!Number.isFinite(target) || target < 0 || target > 10000) throw Error('Целта е от 0 до 10 000 ккал.');
    state.dailyTarget = target;
    persist();
    closeSheet();
    render();
  },
  barcode: async (f) => processBarcode(String(f.get('barcode') || '').trim()),
  'food-search': (f) => {
    ui.picker.query = String(f.get('query') || '').slice(0, 80);
    return runOnlineSearch();
  },
  'quick-kcal': (f) => {
    const kcal = Number(f.get('kcal'));
    if (!Number.isFinite(kcal) || kcal < 1 || kcal > 2000) throw Error('Въведи калории от 1 до 2000.');
    const e = diaryEntry({
      name: String(f.get('name') || '').trim() || 'Бързо добавяне',
      date: String(f.get('date') || ui.date),
      meal: String(f.get('meal')),
      amount: 1,
      unit: 'порции',
      basis: 1,
      kcal,
      protein: f.get('protein') || null,
      carbs: f.get('carbs') || null,
      fat: f.get('fat') || null,
      source: 'manual',
    });
    if (state.diary.length >= 20000) throw Error('Дневникът е пълен.');
    diaryBackup = structuredClone(state.diary);
    state.diary.push(e);
    ui.date = e.date;
    diaryDone(`Добавено: ${num(kcal)} ккал към ${e.meal.toLocaleLowerCase('bg')}.`);
  },
  weight: (f) => {
    state.weights = withWeight(state.weights, { date: String(f.get('date')), kg: Number(String(f.get('kg')).replace(',', '.')) });
    persist();
    closeSheet();
    render();
    toast('Теглото е записано.');
  },
  reminder: (f) => {
    const day = Number(f.get('day')),
      time = String(f.get('time') || '');
    if (!(day >= 0 && day <= 6) || !/^\d{2}:\d{2}$/.test(time)) throw Error('Избери ден и час.');
    exportFile('na-masa-napomnyane.ics', reminderICS(day, time), 'text/calendar;charset=utf-8');
    closeSheet();
    toast('Отвори файла и избери „Добави“ в календара.');
  },
};

function goalFormValues(f) {
  return {
    sex: f.get('sex'),
    age: f.get('age') === '' || f.get('age') === null ? '' : Number(f.get('age')),
    height: f.get('height') ?? '',
    weight: f.get('weight') ?? '',
    activity: f.get('activity'),
    goal: f.get('goal'),
    pace: Number(f.get('pace')),
  };
}
// The goal helper recalculates while you type; the pace list follows lose or gain.
function updateGoalForm(form, changed) {
  const values = goalFormValues(new FormData(form));
  const paceBox = form.querySelector('[data-pace]');
  if (changed?.name === 'goal' && paceBox) {
    paceBox.hidden = values.goal === 'keep';
    if (values.goal !== 'keep') {
      form.querySelector('[data-pace-options]').innerHTML = paceOptions(values.goal, values.pace || 0.5);
      values.pace = Number(new FormData(form).get('pace'));
    }
  }
  const preview = form.querySelector('[data-goal-preview]');
  if (preview) preview.innerHTML = goalPreview(values);
}

/* ---------- events ---------- */

document.addEventListener('click', async (event) => {
  const el = event.target.closest?.('[data-action]');
  if (!el || el.disabled) return;
  const action = actions[el.dataset.action];
  if (!action) return;
  event.preventDefault();
  try {
    await action(el);
  } catch (e) {
    console.error('Action failed:', el.dataset.action, e);
    toast(e.message || 'Не успяхме. Опитай пак.', { error: true });
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest?.('[data-form]');
  if (!form) return;
  event.preventDefault();
  const handler = forms[form.dataset.form];
  if (!handler) return;
  const error = form.querySelector('.form-error');
  if (error) error.textContent = '';
  try {
    await handler(new FormData(form), form);
  } catch (e) {
    if (error) error.textContent = e.message;
    else toast(e.message, { error: true });
  }
});

document.addEventListener('change', async (event) => {
  const el = event.target;
  const food = el.closest?.('[data-form="food"]');
  if (food && (el.name === 'measure' || el.name === 'servingConfirmed')) {
    const details = food.querySelector('[data-serving-details]');
    if (details) details.hidden = food.querySelector('[name="measure"]')?.value !== 'именувана порция';
    updateFoodPreview();
  }
  const goalForm = el.closest?.('[data-form="goal-calc"]');
  if (goalForm) updateGoalForm(goalForm, el);
  if (ui.wizard && el.dataset.input === 'budget-range') {
    applyScene(stage(), sceneFor(ui.wizard.step, ui.wizard.draft));
    react(stage(), 'nod');
  }
  const action = el.dataset.change;
  if (!action) return;
  try {
    switch (action) {
      case 'cooking-step': {
        const r = recipe(el.dataset.id);
        if (!r) break;
        const done = setCookingStep(storage, r.id, Number(el.dataset.index), el.checked, r.steps.length);
        el.closest('.step')?.classList.toggle('is-done', el.checked);
        const progress = sheet.querySelector('[data-cook-progress]');
        if (progress) progress.textContent = `${done.length} от ${r.steps.length}`;
        break;
      }
      case 'purchased':
        state.checked[el.dataset.id] = el.checked;
        persist();
        refresh();
        if (el.checked) navigator.vibrate?.(6);
        break;
      case 'extra-checked': {
        const e = state.extras.find((x) => x.id === el.dataset.id);
        if (e) {
          e.checked = el.checked;
          persist();
          refresh();
        }
        break;
      }
      case 'scan-image': {
        const file = el.files?.[0];
        if (!file) return;
        scanner.stop();
        toast('Разчитаме баркода на телефона…');
        const generation = scanner.generation;
        const code = await scanner.image(file);
        if (generation === scanner.generation && sheet.open) await processBarcode(code);
        break;
      }
      case 'import-adios': {
        const file = el.files?.[0];
        if (!file) return;
        if (file.size > 5_000_000) throw Error('Файлът е твърде голям.');
        const imported = parseAdiosExport(await file.text());
        if (state.diary.length + imported.length > 20000) throw Error('Няма място в дневника.');
        pending = { import: imported };
        openSheet(
          confirmSheet(
            'Внасяне на записи',
            `Ще добавим ${imported.length} ${imported.length === 1 ? 'запис' : 'записа'}. Сегашните остават. Ако внесеш същия файл пак, ще има повторения.`,
            'confirm-import',
            'Добави записите',
          ),
        );
        break;
      }
      case 'restore': {
        const file = el.files?.[0];
        if (!file) return;
        if (file.size > 5_000_000) throw Error('Копието е твърде голямо.');
        const restored = parseBackup(await file.text());
        pending = { restore: restored };
        openSheet(
          confirmSheet(
            'Да възстановим ли копието?',
            `Сегашните данни ще бъдат заменени: ${restored.plan.length} ястия в менюто и ${restored.diary.length} записа в дневника.`,
            'confirm-restore',
            'Възстанови',
          ),
        );
        break;
      }
    }
  } catch (e) {
    toast(e.message, { error: true });
  } finally {
    if (el.type === 'file') el.value = '';
  }
});

let searchTimer;
document.addEventListener('input', (event) => {
  const el = event.target;
  if (el.closest?.('[data-form="food"]')) updateFoodPreview();
  if (el.closest?.('[data-form="goal-calc"]') && el.type !== 'radio') updateGoalForm(el.closest('form'), el);
  const w = ui.wizard;
  if (w && el.dataset.input === 'budget-range') {
    w.draft = pick(w.draft, 'budget', el.value);
    const input = root.querySelector('[data-input="budget"]');
    if (input) input.value = el.value;
    const note = root.querySelector('[data-budget-note]');
    if (note) note.textContent = budgetNote(w.draft);
    el.style.setProperty('--p', `${Math.round(((Number(el.value) - 10) / 290) * 100)}%`);
    return;
  }
  if (w && el.dataset.input === 'budget') {
    w.draft = pick(w.draft, 'budget', el.value);
    const note = root.querySelector('[data-budget-note]');
    if (note) note.textContent = budgetNote(w.draft);
    const slider = root.querySelector('[data-input="budget-range"]');
    if (slider) {
      slider.value = String(Math.min(300, Math.max(10, w.draft.budget)));
      slider.style.setProperty('--p', `${Math.round(((Number(slider.value) - 10) / 290) * 100)}%`);
    }
    return;
  }
  if (w && el.dataset.input === 'dislike-search') {
    ui.dislikeQuery = el.value.slice(0, 60);
    const groups = sheet.querySelector('[data-dislike-groups]');
    if (groups) groups.innerHTML = dislikeGroups(w.draft, ui.dislikeQuery);
    return;
  }
  if (el.dataset.input === 'recipe-search') {
    ui.query = el.value.slice(0, 80);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const grid = root.querySelector('[data-recipe-grid]');
      if (!grid) return;
      const list = filterRecipes(state, ui.query, ui.filter);
      if (list.length) {
        grid.innerHTML = list.map((r) => recipeCard(r, state)).join('');
        root.querySelector('.empty')?.remove();
      } else {
        const caret = el.selectionStart;
        render();
        const input = root.querySelector('[data-input="recipe-search"]');
        input?.focus();
        if (caret !== null) input?.setSelectionRange?.(caret, caret);
      }
    }, 120);
    return;
  }
  if (el.dataset.input === 'food-search') {
    ui.picker.query = el.value.slice(0, 80);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshPickerResults, 120);
  }
});

sheet.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeSheet();
});
sheet.addEventListener('click', (event) => {
  if (event.target !== sheet) return;
  const box = sheet.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeSheet();
});

window.addEventListener('hashchange', () => {
  closeSheet();
  if (ui.wizard?.editing && !ui.building) ui.wizard = null;
  if (ui.shopMode && route() !== 'shopping') {
    ui.shopMode = false;
    keepAwake(false);
  }
  if (!ui.wizard) {
    render();
    window.scrollTo?.(0, 0);
    document.getElementById('main')?.focus?.({ preventScroll: true });
  }
});

// The table follows the mouse on a computer; on a phone it looks at what you tap.
let lookFrame = 0;
window.addEventListener?.('pointermove', (event) => {
  if (!ui.wizard || event.pointerType !== 'mouse' || lookFrame) return;
  lookFrame = requestAnimationFrame(() => {
    lookFrame = 0;
    lookAt(stage(), event.clientX, event.clientY);
  });
});

window.addEventListener('pagehide', () => scanner.stop());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) scanner.stop();
  else if (ui.shopMode || ui.cook) keepAwake(true);
});
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) toast('Данните са променени в друг раздел. Презареди, преди да продължиш.');
});
document.addEventListener('pwa-state', () => {
  const s = pwaState();
  const bar = document.querySelector('[data-status]');
  if (bar) {
    bar.innerHTML = statusBar(s);
    bar.hidden = !s.offline && !s.update;
  }
  const readiness = document.getElementById('offline-readiness');
  if (readiness)
    readiness.textContent = s.ready
      ? 'Готово за работа без интернет на това устройство.'
      : s.error
        ? 'Не успяхме да подготвим работа без интернет. Приложението работи онлайн.'
        : 'Подготвя се за работа без интернет при първото зареждане.';
});

/* ---------- start ---------- */

if (!state.onboarded && !state.plan.length) startWizard();
else render();
if (loaded.warning) toast(loaded.warning, { error: true });
if (window.self === window.top) initPwa();
