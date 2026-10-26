import { RECIPES, PRODUCTS } from './catalog.js';
import { nutrition } from './nutrition.js';
import {
  defaults,
  recipe,
  candidates,
  settingsErrors,
  generatePlan,
  planSnapshot,
  rearrangePlan,
  changeServings,
  extraGrocery,
  shoppingSummary,
  total,
  groceries,
  diaryEntry,
  localDate,
  normalizeState,
  recipeJSON,
  packSize,
  packPrice,
  isValidBarcode,
  PLANS,
} from './domain.js';
import { loadState, saveState, parseBackup, STORAGE_KEY } from './storage.js';
import {
  shell,
  planView,
  recipesView,
  recipeDetail,
  recipeCards,
  shoppingView,
  pantryView,
  diaryView,
  foodForm,
  pricingView,
  settingsView,
  privacyView,
  extraGroceryForm,
} from './views.js';
import { wizardView, previewRecipes } from './onboarding.js';
import { esc, icon, button, money, num, field } from './ui.js';
import { Scanner } from './scanner.js';
import { lookupBarcode, searchProducts, setTokenProvider, request } from './api.js';
import {
  foodHistory,
  copiesForDates,
  parseAdiosExport,
  NUTRIENTS,
  macroEnergyShares,
} from './fitness.js';
import { foodPicker, foodCopyForm } from './fitness-views.js';
import { createAuth } from './auth.js';
import { accountView } from './account-view.js';
import { CONFIG } from './config.js';
import { initPwa, pwaState, installApp, checkAppUpdate } from './pwa.js';
const root = document.getElementById('app'),
  dialog = document.getElementById('dialog'),
  toastEl = document.getElementById('toast');
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error('unavailable');
    },
    setItem() {
      throw Error('unavailable');
    },
    removeItem() {
      throw Error('unavailable');
    },
  };
}
let loaded = loadState(storage),
  state = loaded.state,
  undo = null,
  deletedEntry = null,
  deletedGrocery = null,
  wizard = null,
  query = '',
  favorites = false,
  date = localDate(),
  interval = 'monthly',
  dialogRecipe = null,
  focusBeforeDialog = null,
  toastTimer,
  lookupController = null,
  busy = false;
let picker = { meal: 'Обяд', tab: 'history', query: '', products: [], status: '' },
  fitnessUndo = null;
const scanner = new Scanner();
const auth = createAuth(CONFIG);
setTokenProvider(() => auth.token());
let cloud = null,
  cloudBusy = false;
function showAccount(email = '') {
  modal(accountView(auth, email, cloud));
}
async function cloudWrite(value) {
  if (cloudBusy || !cloud) return;
  cloudBusy = true;
  const revision = cloud.revision,
    userId = auth.user()?.id;
  try {
    const result = await request('/backup', { method: 'POST', body: { revision, state: value } });
    if (auth.user()?.id !== userId) return;
    cloud = { ...result, state: value };
    showAccount();
    toast(value ? 'Облачното копие е запазено.' : 'Облачното копие е изтрито.');
  } finally {
    cloudBusy = false;
  }
}
function persist() {
  const saved = saveState(storage, state);
  if (!saved) toast('Няма място за запазване. Изтегли резервно копие от Настройки.', true);
  return saved;
}
function toast(text, error = false) {
  toastEl.textContent = text;
  toastEl.classList.toggle('error', error);
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 5000);
}
function route() {
  return location.hash.slice(1) || 'plan';
}
function navigate(page) {
  if (route() === page) {
    render();
    window.scrollTo(0, 0);
  } else location.hash = page;
}
function render() {
  if (wizard) {
    root.innerHTML = wizardView(
      wizard.draft,
      wizard.step,
      wizard.error,
      state.onboarded || state.plan.length > 0,
    );
    document.body.classList.add('onboarding');
    return;
  }
  document.body.classList.remove('onboarding');
  const page = route(),
    views = {
      plan: () => planView(state, undo),
      recipes: () => recipesView(state, query, favorites),
      shopping: () => shoppingView(state),
      pantry: () => pantryView(state),
      diary: () => diaryView(state, date),
      plans: () => pricingView(interval),
      settings: () => settingsView(state, pwaState()),
      privacy: privacyView,
    };
  root.innerHTML = shell(page, (views[page] || views.plan)(), pwaState());
}
function closeDialog() {
  scanner.stop();
  lookupController?.abort();
  lookupController = null;
  dialog.close();
  dialogRecipe = null;
  focusBeforeDialog?.focus?.();
}
function updateFoodPreview() {
  const form = dialog.querySelector('[data-form="food"]');
  if (!form) return;
  const preview = form.querySelector('[data-food-preview]');
  const amount = Number(form.querySelector('[name="amount"]').value);
  const scale = amount / Number(form.dataset.basis);
  if (!Number.isFinite(scale) || scale <= 0) {
    preview.textContent = '';
    return;
  }
  const targets = { kcal: state.dailyTarget, ...state.macroTargets };
  preview.innerHTML =
    '<p class="eyebrow">ЗА ИЗЯДЕНОТО КОЛИЧЕСТВО</p>' +
    ['kcal', 'protein', 'carbs', 'fat']
      .map((key) => {
        const input = form.querySelector(`[name="${key}"]`);
        const value = input.value.trim() === '' ? null : Number(input.value) * scale;
        const label = key === 'kcal' ? 'Калории' : NUTRIENTS[key].label;
        const unit = key === 'kcal' ? 'ккал' : 'г';
        return `<p><b>${label}: ${value === null || !Number.isFinite(value) ? 'неизвестно' : num(value, 1) + ' ' + unit}</b>${value !== null && Number.isFinite(value) && targets[key] > 0 ? ' · ' + num((value / targets[key]) * 100, 1) + '% от дневната цел' : ''}</p>`;
      })
      .join('');
  const values = Object.fromEntries(
    ['protein', 'carbs', 'fat'].map((key) => {
      const raw = form.querySelector(`[name="${key}"]`).value.trim();
      return [key, raw === '' ? null : Number(raw) * scale];
    }),
  );
  const shares = macroEnergyShares(values);
  preview.innerHTML +=
    '<p class="eyebrow">ЕНЕРГИЯ ОТ МАКРОСИТЕ</p>' +
    (shares
      ? '<p>' +
        ['protein', 'carbs', 'fat']
          .map((key) => NUTRIENTS[key].label + ': <b>' + num(shares[key], 1) + '%</b>')
          .join(' · ') +
        '</p><p class="fine">Ориентировъчно по 4/4/9 ккал на грам. Разпределението е между тези три макроса и може да се различава от калориите на етикета.</p>'
      : '<p class="fine">Въведи и трите макроса, за да видиш разпределение. При нулев сбор няма процентно разпределение.</p>');
}
function modal(content, wide = false) {
  if (!dialog.open) focusBeforeDialog = document.activeElement;
  dialog.classList.toggle('wide', wide);
  dialog.innerHTML = `<div class="dialog-bar"><span>на масата.</span>${button(icon('close'), 'close-dialog', 'aria-label="Затвори"', 'icon-button')}</div><div class="dialog-content">${content}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.dialog-content').scrollTop = 0;
  updateFoodPreview();
}
function openRecipe(id, index = null) {
  const r = recipe(id);
  if (!r) return;
  dialogRecipe = { id, index };
  modal(recipeDetail(r, state, index), true);
}
function startWizard() {
  if (state.locked) {
    toast('Отключи менюто преди промяна на предпочитанията.');
    return;
  }
  closeDialog();
  wizard = { draft: structuredClone(state.settings), step: state.onboarded ? 1 : 0, error: '' };
  render();
  window.scrollTo(0, 0);
}
function snapshot() {
  undo = planSnapshot(state);
}
function commitPlan(result) {
  state.plan = result.plan;
  state.cooked = {};
  state.checked = {};
  state.onboarded = true;
  persist();
}
function exportFile(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function shoppingText() {
  return (
    'НА МАСАТА — СПИСЪК ЗА ПАЗАРУВАНЕ\nПримерни цени за цели опаковки.\n\n' +
    state.settings.stores
      .map((s) => {
        const rows = groceries(state).filter((r) => r.packs && r.store === s);
        return rows.length
          ? s +
              '\n' +
              rows
                .map(
                  (r) =>
                    `${state.checked[r.k] ? '[✓]' : '[ ]'} ${r.name}: ${r.packs} × ${num(r.size, 1)} ${r.unit} — ${money(r.cost)}`,
                )
                .join('\n')
          : '';
      })
      .filter(Boolean)
      .join('\n\n') +
    '\n\nДОПЪЛНИТЕЛНИ ПРОДУКТИ\n' +
    state.extras
      .map(
        (e) =>
          `${e.checked ? '[✓]' : '[ ]'} ${e.name}: ${num(e.amount, 2)} ${e.unit} · ${e.store} — ${e.price === null ? 'без цена' : money(e.price)}`,
      )
      .join('\n') +
    `\n\nИзвестна сума: ${money(shoppingSummary(state).knownTotal)}${shoppingSummary(state).unknownPrices ? ` + ${shoppingSummary(state).unknownPrices} продукта без цена` : ''}`
  );
}
function chooseMealDestination(el, mode) {
  if (state.locked) return;
  const from = Number(el.dataset.index),
    current = recipe(state.plan[from].id);
  modal(
    `<p class="eyebrow">${mode === 'move' ? 'ПРЕМЕСТИ ЯСТИЕ' : 'ПОВТОРИ ЯСТИЕ'}</p><h2 class="dialog-title">${esc(current.name)}</h2><p class="muted">${mode === 'move' ? 'Избери хранене, с което да разменим местата.' : 'Избери кое хранене да заменим със същото ястие. Количествата за покупки ще се преизчислят.'}</p><div class="destination-list">${state.plan.map((entry, to) => (to === from ? '' : button(`<span>Ден ${entry.day + 1} · ${entry.slot}</span><b>${esc(recipe(entry.id).name)}</b>${icon('arrow', 16)}`, 'place-meal', `data-from="${from}" data-to="${to}" data-mode="${mode}"`, 'destination-option'))).join('')}</div>${state.plan.length < 2 ? '<p>Добави още дни или хранения от предпочитанията.</p>' : ''}`,
  );
}
function showFoodPicker() {
  modal(
    foodPicker(state, date, picker.meal, picker.tab, picker.query, picker.products, picker.status),
  );
}
function pickedRows() {
  return picker.tab === 'products'
    ? picker.products
    : (picker.tab === 'saved'
        ? state.savedFoods
        : foodHistory(state.diary, picker.query, 40)
      ).filter((e) =>
        (e.name + ' ' + (e.brand || ''))
          .toLocaleLowerCase('bg')
          .includes(picker.query.toLocaleLowerCase('bg')),
      );
}
function rememberDiary() {
  fitnessUndo = structuredClone(state.diary);
}
function finishFitness(message) {
  persist();
  closeDialog();
  navigate('diary');
  render();
  toast(message);
  toastEl.innerHTML = `${esc(message)} ${button('Върни', 'undo-fitness', '', 'toast-undo')}`;
}
function scannerView() {
  modal(
    `<p class="eyebrow">МЕНЮ ПЛЮС · СКЕНЕР</p><h2 class="dialog-title">От етикета в дневника.</h2><p class="muted">Сканирай баркода на опаковката. Камерата не разпознава калории на готово ястие.</p><div class="scanner-frame"><video id="scan-video" autoplay muted playsinline></video><div class="scanner-guide">${icon('scan', 58)}<span>Постави баркода в рамката</span></div></div><div class="inline-actions">${button(icon('camera', 18) + ' Включи камерата', 'start-camera', '', 'button primary')}<label class="button outline file-label">Снимка на баркод<input type="file" accept="image/*" capture="environment" data-change="scan-image" hidden></label></div><form data-form="barcode" class="barcode-form">${field('Или въведи цифрите от баркода', 'barcode', '', 'text', 'inputmode="numeric" pattern="[0-9]{8}|[0-9]{12,14}" maxlength="14" required')}<button class="button outline" type="submit">Провери баркода ${icon('arrow', 16)}</button><p class="form-error" role="alert"></p></form><p class="fine">Кадрите остават на устройството. При свързан продуктов каталог се изпраща само баркодът.</p><div class="notice">Оценката на ястие по снимка предстои. Дотогава можеш да въведеш храната от етикета.</div>`,
  );
}
async function processBarcode(code) {
  scanner.stop();
  if (!isValidBarcode(code)) {
    toast('Баркодът не е валиден. Провери цифрите.', true);
    return;
  }
  if (!CONFIG.apiBase) {
    modal(
      `<p class="eyebrow">БАРКОДЪТ Е РАЗЧЕТЕН</p><h2 class="dialog-title">${esc(code)}</h2><p class="muted">Продуктовата база още не е свързана. Можеш да въведеш хранителните стойности от етикета — няма да ги предполагаме.</p>${button('Въведи от етикета ' + icon('arrow', 17), 'manual-food', '', 'button primary full')}`,
    );
    return;
  }
  lookupController?.abort();
  lookupController = new AbortController();
  modal('<h2>Търсим продукта…</h2><p class="muted">Проверяваме данните в Open Food Facts.</p>');
  try {
    const p = await lookupBarcode(code, lookupController.signal);
    if (!dialog.open) return;
    modal(
      `<p class="eyebrow">OPEN FOOD FACTS</p><h2 class="dialog-title">${esc(p.name)}</h2><p>Провери данните спрямо етикета на твоята опаковка.</p>${p.kcal === null ? '<div class="notice warning">Няма достатъчно хранителни данни. Въведи стойностите от етикета.</div>' + button('Въведи ръчно', 'manual-food', '', 'button primary') : foodForm(date, picker.meal, { ...p, id: undefined, date, meal: picker.meal, unit: p.unit || 'г', amount: 100, basis: 100, source: 'openfoodfacts', barcode: code })}<p class="fine">Данни: <a href="https://world.openfoodfacts.org/product/${code}" target="_blank" rel="noopener">Open Food Facts</a>, ODbL. Възможни са неточности.</p>`,
    );
  } catch (e) {
    if (e.name === 'AbortError') return;
    modal(
      `<h2 class="dialog-title">Не успяхме да намерим данните.</h2><p>${esc(e.message)}</p>${button('Въведи ръчно', 'manual-food', '', 'button primary')}`,
    );
  }
}
const actions = {
  account: () => showAccount(),
  'auth-out': async () => {
    cloud = null;
    try {
      await auth.signOut();
    } finally {
      showAccount();
    }
  },
  'cloud-read': async () => {
    if (cloudBusy) return;
    cloudBusy = true;
    const userId = auth.user()?.id;
    try {
      const result = await request('/backup');
      if (auth.user()?.id !== userId) return;
      cloud = { ...result, state: result.state ? normalizeState(result.state) : null };
      showAccount();
    } finally {
      cloudBusy = false;
    }
  },
  'cloud-upload': () =>
    modal(
      `<h2 class="dialog-title">Качи данните от това устройство?</h2><p>Ще замениш облачното копие за ${esc(auth.user()?.email || '')} с текущото меню, дневник и предпочитания. Това качва и информацията за храненето ти.</p>${button('Качи и замени', 'confirm-cloud-upload', '', 'button primary')}`,
    ),
  'confirm-cloud-upload': () => cloudWrite(structuredClone(state)),
  'cloud-delete': () =>
    modal(
      `<h2 class="dialog-title">Изтрий облачното копие?</h2><p>Локалните данни остават. Облачното копие няма да може да се възстанови от приложението.</p>${button('Изтрий копието', 'confirm-cloud-delete', '', 'button danger')}`,
    ),
  'confirm-cloud-delete': () => cloudWrite(null),
  'cloud-restore': () =>
    modal(
      `<h2 class="dialog-title">Замени локалните данни?</h2><p>Първо изтегли резервно копие, ако искаш да запазиш текущите записи. Това действие заменя менюто, дневника и предпочитанията с облачното копие.</p>${button('Изтегли текущите данни', 'backup', '', 'button outline')}${button('Възстанови копието', 'confirm-cloud-restore', '', 'button primary')}`,
    ),
  'confirm-cloud-restore': () => {
    if (!cloud?.state) return;
    const restored = normalizeState(cloud.state);
    if (!saveState(storage, restored)) throw Error('Няма място за възстановяване.');
    state = restored;
    undo = null;
    fitnessUndo = null;
    deletedEntry = null;
    deletedGrocery = null;
    closeDialog();
    render();
    toast('Облачното копие е възстановено.');
  },
  'install-app': async () => {
    if (await installApp()) return;
    modal(
      `<h2 class="dialog-title">На началния екран</h2><p><b>iPhone / Safari:</b> отвори менюто за споделяне и избери „Добави към началния екран“.</p><p><b>Android / Chrome:</b> отвори менюто ⋮ и избери „Инсталиране на приложението“ или „Добавяне към началния екран“.</p><p class="fine">Наличността и името на командата зависят от браузъра. Отвори приложението онлайн веднъж, за да се подготви за офлайн работа. Данните остават на това устройство.</p>`,
    );
  },
  'check-update': async () => {
    await checkAppUpdate();
    toast('Проверяваме за нова версия. Ако има готова, ще се появи бутон „Обнови“.');
  },
  'app-update': () =>
    modal(
      `<h2 class="dialog-title">Нова версия е готова</h2><p>Запазените меню, покупки и дневник ще останат. Страницата ще се презареди; незапазените полета ще се затворят.</p>${button('Обнови сега', 'confirm-app-update', '', 'button primary')}`,
    ),
  'confirm-app-update': () => {
    if (persist()) document.dispatchEvent(new CustomEvent('apply-app-update'));
  },
  'extra-add': () => modal(extraGroceryForm(state)),
  'extra-edit': (el) => {
    const e = state.extras.find((e) => e.id === el.dataset.id);
    if (e) modal(extraGroceryForm(state, e));
  },
  'extra-delete': (el) => {
    deletedGrocery = state.extras.find((e) => e.id === el.dataset.id);
    state.extras = state.extras.filter((e) => e.id !== el.dataset.id);
    persist();
    render();
    toast('Продуктът е премахнат.');
    toastEl.innerHTML = `Продуктът е премахнат. ${button('Върни', 'extra-undo', '', 'toast-undo')}`;
  },
  'extra-undo': () => {
    if (deletedGrocery && !state.extras.some((e) => e.id === deletedGrocery.id)) {
      state.extras.push(deletedGrocery);
      deletedGrocery = null;
      persist();
      render();
    }
    toast('Продуктът е възстановен.');
  },
  'close-dialog': closeDialog,
  wizard: startWizard,
  'wizard-cancel': () => {
    if (!state.onboarded && !state.plan.length) return;
    wizard = null;
    render();
  },
  'wizard-explore': () => {
    // Guest mode: no forced account or checkout to sample the recipe catalogue.
    if (state.onboarded || state.plan.length) return;
    state.onboarded = true;
    persist();
    wizard = null;
    navigate('recipes');
    render();
  },
  'wizard-recipe': (el) => {
    if (!wizard) return;
    const r = recipe(el.dataset.id);
    if (!r || !previewRecipes(wizard.draft).some((item) => item.id === r.id)) return;
    modal(recipeDetail(r, { ...state, settings: wizard.draft }), true);
  },
  'wizard-back': () => {
    if (wizard.step) {
      wizard.step--;
      wizard.error = '';
      render();
      window.scrollTo(0, 0);
    } else if (state.onboarded || state.plan.length) {
      wizard = null;
      render();
    }
  },
  'wizard-step': (el) => {
    const index = Number(el.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index > 8) return;
    wizard.step = index;
    wizard.error = '';
    render();
    window.scrollTo(0, 0);
  },
  'wizard-pick': (el) => {
    const { key, value } = el.dataset,
      d = wizard.draft;
    if (['stores', 'slots', 'equipment', 'allergens', 'dislikes'].includes(key))
      d[key] = d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value];
    else d[key] = ['days', 'maxTime'].includes(key) ? Number(value) : value;
    wizard.error = '';
    render();
    // Keep keyboard focus on the selected option after replacing the screen.
    Array.from(root.querySelectorAll('[data-action="wizard-pick"]'))
      .find((node) => node.dataset.key === key && node.dataset.value === value)
      ?.focus({ preventScroll: true });
  },
  counter: (el) => {
    wizard.draft.people = Math.max(1, Math.min(12, wizard.draft.people + Number(el.dataset.delta)));
    render();
  },
  'wizard-budget': (el) => {
    wizard.draft.budget = Number(el.dataset.value);
    render();
  },
  regenerate: () => {
    if (state.locked) return;
    const result = generatePlan(state);
    if (!result.plan) {
      toast(result.reason, true);
      return;
    }
    snapshot();
    commitPlan(result);
    render();
    toast('Новото меню е готово. Предишното може да се върне.');
  },
  undo: () => {
    if (!undo) return;
    Object.assign(state, undo);
    undo = null;
    persist();
    render();
    toast('Предишното меню е възстановено.');
  },
  lock: () => {
    state.locked = !state.locked;
    persist();
    render();
  },
  recipe: (el) =>
    openRecipe(el.dataset.id, el.dataset.index === undefined ? null : Number(el.dataset.index)),
  cooked: (el) => {
    const i = Number(el.dataset.index);
    state.cooked[i] = !state.cooked[i];
    persist();
    render();
  },
  favorite: (el) => {
    const id = el.dataset.id;
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((v) => v !== id)
      : [...state.favorites, id];
    persist();
    render();
    if (dialogRecipe) openRecipe(dialogRecipe.id, dialogRecipe.index);
  },
  'favorites-filter': () => {
    favorites = !favorites;
    render();
  },
  'move-meal': (el) => chooseMealDestination(el, 'move'),
  'repeat-meal': (el) => chooseMealDestination(el, 'repeat'),
  'place-meal': (el) => {
    const next = rearrangePlan(
      state,
      Number(el.dataset.from),
      Number(el.dataset.to),
      el.dataset.mode,
    );
    snapshot();
    Object.assign(state, next);
    persist();
    closeDialog();
    render();
    toast(
      el.dataset.mode === 'move'
        ? 'Ястията са разменени. Можеш да върнеш промяната.'
        : 'Ястието е повторено и покупките са обновени.',
    );
  },
  swap: (el) => {
    if (state.locked) return;
    const i = Number(el.dataset.index),
      options = candidates(state.settings).filter((r) => r.id !== state.plan[i].id);
    modal(
      `<p class="eyebrow">СМЯНА НА ЕДНО ЯСТИЕ</p><h2 class="dialog-title">Какво ти се хапва вместо това?</h2><p class="muted">Заменяш „${recipe(state.plan[i].id).name}“. Останалото меню се запазва.</p><div class="recipe-grid">${recipeCards(options, state, i)}</div>${!options.length ? '<p>Няма други подходящи рецепти за тези филтри.</p>' : ''}`,
      true,
    );
  },
  'choose-swap': (el) => {
    if (state.locked) return;
    const id = el.dataset.id,
      i = Number(el.dataset.index);
    if (!candidates(state.settings).some((r) => r.id === id)) return;
    snapshot();
    state.plan[i].id = id;
    delete state.cooked[i];
    state.checked = {};
    persist();
    closeDialog();
    render();
    toast('Ястието и списъкът са обновени.');
  },
  pantry: () => navigate('pantry'),
  price: (el) => {
    const k = el.dataset.id;
    modal(
      `<p class="eyebrow">ЛИЧНА ЦЕНА</p><h2 class="dialog-title">${PRODUCTS[k][0]}</h2><form data-form="price" data-id="${k}"><div class="form-grid">${field('Цена на опаковката (€)', 'price', packPrice(k, state), 'number', 'min="0" max="10000" step="0.01" required')}${field(`Размер на опаковката (${PRODUCTS[k][2]})`, 'size', packSize(k, state), 'number', 'min="0.1" max="100000" step="0.1" required')}</div><p class="fine">Една лична цена за продукта, независимо от избрания магазин. Не е актуална оферта.</p><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Запази и преизчисли</button></form>`,
    );
  },
  'uncheck-all': () => {
    state.checked = {};
    state.extras.forEach((e) => (e.checked = false));
    persist();
    render();
  },
  'export-shopping': () => exportFile('na-masata-pokupki.txt', shoppingText()),
  'copy-shopping': async () => {
    try {
      await navigator.clipboard.writeText(shoppingText());
      toast('Списъкът е копиран.');
    } catch {
      exportFile('na-masata-pokupki.txt', shoppingText());
      toast('Списъкът е изтеглен като файл.');
    }
  },
  'export-plan': () =>
    exportFile(
      'na-masata-menu.txt',
      'НА МАСАТА\n\n' +
        state.plan
          .map((e) => `Ден ${e.day + 1} · ${e.slot}: ${recipe(e.id).name} (${e.people} порции)`)
          .join('\n') +
        '\n\n' +
        shoppingText(),
    ),
  'export-recipe': (el) =>
    exportFile(
      `recepta-${el.dataset.id}.json`,
      JSON.stringify(recipeJSON(recipe(el.dataset.id)), null, 2),
      'application/ld+json',
    ),
  'add-food': (el) => {
    scanner.stop();
    picker = {
      meal: el?.dataset?.meal || 'Обяд',
      tab: 'history',
      query: '',
      products: [],
      status: '',
    };
    showFoodPicker();
  },
  'manual-food': (el) => {
    scanner.stop();
    modal(foodForm(date, el?.dataset?.meal || picker.meal));
  },
  'diary-jump': (el) => {
    date = el.dataset.date;
    render();
  },
  'food-tab': (el) => {
    lookupController?.abort();
    picker.tab = el.dataset.tab;
    picker.query = '';
    picker.status = '';
    showFoodPicker();
  },
  'pick-food': (el) => {
    const e = pickedRows()[Number(el.dataset.index)];
    if (!e) return;
    modal(
      foodForm(date, picker.meal, {
        ...e,
        id: undefined,
        date,
        meal: picker.meal,
        amount: e.amount || 100,
        basis: e.basis || 100,
        unit: e.unit || 'г',
        kcal: e.kcal ?? '',
      }),
    );
  },
  'quick-repeat-food': (el) => {
    if (picker.tab === 'products' || state.diary.length >= 20000) return;
    const previous = pickedRows()[Number(el.dataset.index)];
    if (!previous) return;
    const entry = diaryEntry({ ...previous, id: crypto.randomUUID(), date, meal: picker.meal });
    const next = { ...state, diary: [...state.diary, entry] };
    if (!saveState(storage, next)) throw Error('Няма място за запазване. Изтегли резервно копие.');
    el.disabled = true;
    rememberDiary();
    state = next;
    finishFitness('Добавено: ' + entry.name + ' · ' + num(entry.amount, 1) + ' ' + entry.unit);
  },
  'quick-food': () =>
    modal(
      foodForm(date, 'Междинно', {
        name: 'Бърз запис',
        date,
        meal: 'Междинно',
        amount: 1,
        basis: 1,
        unit: 'порции',
        kcal: '',
        protein: null,
        source: 'manual',
      }),
    ),
  'remove-saved-food': (el) => {
    state.savedFoods = state.savedFoods.filter((e) => e.id !== el.dataset.id);
    persist();
    showFoodPicker();
  },
  'save-food': (el) => {
    const e = state.diary.find((e) => e.id === el.dataset.id);
    if (!e) return;
    if (
      state.savedFoods.length >= 500 &&
      !state.savedFoods.some((v) => v.name === e.name && v.brand === e.brand)
    ) {
      toast('Библиотеката е пълна.');
      return;
    }
    state.savedFoods = state.savedFoods.filter((v) => v.name !== e.name || v.brand !== e.brand);
    state.savedFoods.push({ ...structuredClone(e), id: crypto.randomUUID() });
    persist();
    toast('Храната е запазена в „Мои храни“.');
  },
  'copy-food': (el) => {
    const e = state.diary.find((e) => e.id === el.dataset.id);
    if (e) modal(foodCopyForm(e, date));
  },
  'clear-meal': (el) =>
    modal(
      `<h2 class="dialog-title">Изчисти ${esc(el.dataset.meal.toLowerCase())}?</h2><p>Ще премахнем само записите за ${date} в това хранене. Можеш да върнеш промяната.</p>${button('Изчисти храненето', 'confirm-clear-meal', `data-meal="${esc(el.dataset.meal)}"`, 'button danger')}`,
    ),
  'confirm-clear-meal': (el) => {
    rememberDiary();
    state.diary = state.diary.filter((e) => e.date !== date || e.meal !== el.dataset.meal);
    finishFitness('Храненето е изчистено.');
  },
  'undo-fitness': () => {
    if (fitnessUndo) {
      state.diary = fitnessUndo;
      fitnessUndo = null;
      persist();
      render();
    }
    toast('Дневникът е възстановен.');
  },
  'macro-targets': () =>
    modal(
      `<h2 class="dialog-title">Твоите цели за макроси</h2><p class="muted">Въведи цели, които си избрал. Не задаваме автоматични препоръки.</p><form data-form="macro-targets"><div class="form-grid">${['protein', 'carbs', 'fat'].map((k) => field(NUTRIENTS[k].label + ' (г/ден)', k, state.macroTargets[k] || '', 'number', 'min="0" max="2000" step="1"')).join('')}</div><p class="fine">Празно или 0 означава без цел.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Запази</button></form>`,
    ),
  'export-diary': () => {
    const keys = [
      'date',
      'meal',
      'name',
      'brand',
      'amount',
      'unit',
      'basis',
      'kcal',
      ...Object.keys(NUTRIENTS),
    ];
    const cell = (v) =>
      '"' +
      String(v ?? '')
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    exportFile(
      'na-masata-dnevnik.csv',
      '\ufeff' +
        [
          keys.map(cell).join(','),
          ...state.diary.map((e) => keys.map((k) => cell(e[k])).join(',')),
        ].join('\r\n'),
      'text/csv;charset=utf-8',
    );
  },
  'diary-recipe': (el) => {
    const r = recipe(el.dataset.id),
      n = nutrition(r);
    dialogRecipe = null;
    modal(
      foodForm(date, 'Вечеря', {
        id: crypto.randomUUID(),
        name: r.name,
        date,
        meal: 'Вечеря',
        amount: 1,
        unit: 'порции',
        basis: 1,
        kcal: n.kcal,
        protein: n.protein,
        source: 'recipe',
      }),
    );
  },
  'edit-food': (el) => {
    const e = state.diary.find((e) => e.id === el.dataset.id);
    if (e) modal(foodForm(date, e.meal, e));
  },
  'delete-food': (el) => {
    deletedEntry = state.diary.find((e) => e.id === el.dataset.id);
    state.diary = state.diary.filter((e) => e.id !== el.dataset.id);
    persist();
    render();
    toastEl.innerHTML = `Записът е премахнат. ${button('Върни', 'undo-delete', '', 'toast-undo')}`;
    toastEl.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 8000);
  },
  'undo-delete': () => {
    if (deletedEntry && !state.diary.some((e) => e.id === deletedEntry.id)) {
      state.diary.push(deletedEntry);
      deletedEntry = null;
      persist();
      render();
    }
    toast('Записът е възстановен.');
  },
  'daily-target': () =>
    modal(
      `<p class="eyebrow">ТВОЯТА ЛИЧНА ЦЕЛ</p><h2 class="dialog-title">Без автоматични препоръки.</h2><p class="muted">Въведи цел, която вече си избрал. Това приложение не определя подходящ калориен прием.</p><form data-form="target">${field('Дневна цел (ккал)', 'target', state.dailyTarget || '', 'number', 'min="0" max="10000" step="1" placeholder="Без зададена цел"')}<p class="fine">Остави празно или въведи 0, за да премахнеш целта.</p><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Запази</button></form>`,
    ),
  'billing-period': (el) => {
    interval = el.dataset.value;
    render();
  },
  'plan-info': (el) => {
    const p = PLANS[el.dataset.plan];
    modal(
      `<p class="eyebrow">${p.name.toUpperCase()}</p><h2 class="dialog-title">${p[interval]} € / ${interval === 'yearly' ? 'година' : 'месец'}</h2><p class="muted">Плащанията още не са активирани. Можеш да изпробваш демонстрацията, без да въвеждаш карта.</p>${button('Към ' + (el.dataset.plan === 'plus' ? 'дневника' : 'менюто'), 'preview-plan', `data-page="${el.dataset.plan === 'plus' ? 'diary' : 'plan'}"`, 'button primary full')}`,
    );
  },
  'preview-plan': (el) => {
    closeDialog();
    navigate(el.dataset.page);
  },
  scanner: (el) => {
    if (el?.dataset?.meal) picker.meal = el.dataset.meal;
    scannerView();
  },
  'start-camera': async (el) => {
    el.disabled = true;
    try {
      const video = document.getElementById('scan-video');
      video.parentElement.classList.add('camera-active');
      await scanner.start(video, processBarcode);
    } catch (e) {
      toast(
        e.name === 'NotAllowedError'
          ? 'Камерата не е разрешена. Можеш да въведеш баркода ръчно.'
          : e.message,
        true,
      );
      el.disabled = false;
    }
  },
  backup: () =>
    exportFile(
      'na-masata-backup.json',
      JSON.stringify(
        { app: 'na-masata', version: 3, exportedAt: new Date().toISOString(), state },
        null,
        2,
      ),
      'application/json',
    ),
  reset: () =>
    modal(
      `<h2 class="dialog-title">Изтриване на локалните данни?</h2><p>Менюто, дневникът, любимите и настройките ще бъдат премахнати от този браузър. Изтегли копие, ако искаш да ги запазиш.</p><div class="inline-actions">${button('Първо изтегли копие', 'backup', '', 'button outline')}${button('Изтрий данните', 'confirm-reset', '', 'button danger')}</div>`,
    ),
  'confirm-reset': () => {
    try {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem('na-masata-v1');
    } catch {
      toast('Не успяхме да изтрием данните.', true);
      return;
    }
    state = defaults();
    undo = null;
    closeDialog();
    startWizard();
    toast('Локалните данни са изтрити.');
  },
};
document.addEventListener('click', async (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const action = actions[el.dataset.action];
  if (!action) return;
  event.preventDefault();
  try {
    await action(el);
  } catch (e) {
    console.error('Action failed:', el.dataset.action);
    toast(e.message || 'Не успяхме да завършим действието. Опитай отново.', true);
  }
});
document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const f = new FormData(form);
  try {
    switch (form.dataset.form) {
      case 'auth-email': {
        const email = String(f.get('email') || '').trim();
        await auth.sendCode(email);
        showAccount(email);
        break;
      }
      case 'auth-verify': {
        await auth.verify(form.dataset.email, String(f.get('code') || '').trim());
        cloud = null;
        showAccount();
        break;
      }
      case 'wizard': {
        if (busy || !wizard) return;
        const d = wizard.draft;
        const step = wizard.step;
        if (step === 6) d.budget = Number(f.get('budget'));
        let error = '';
        if (step === 5 && !d.slots.length) error = 'Избери поне едно хранене.';
        if (step === 6 && !d.stores.length) error = 'Избери поне един магазин.';
        if (step === 6 || step === 7 || step === 8) error ||= settingsErrors(d)[0] || '';
        if (step === 7 && !previewRecipes(d).length)
          error ||= 'Промени времето, уредите или предпочитанията си, за да видиш рецепти.';
        if (error) {
          wizard.error = error;
          render();
          return;
        }
        if (step < 8) {
          wizard.step += 1;
          wizard.error = '';
          render();
          root.querySelector('.nm-heading')?.focus({ preventScroll: true });
          window.scrollTo(0, 0);
          return;
        }
        const validation = settingsErrors(d);
        if (validation.length) throw Error(validation[0]);
        if (state.locked) throw Error('Менюто е заключено.');
        busy = true;
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        submit.textContent = 'Подреждаме менюто…';
        await new Promise((resolve) => setTimeout(resolve, 30));
        const next = { ...state, settings: structuredClone(d) };
        const result = generatePlan(next);
        if (!result.plan) throw Error(result.reason);
        snapshot();
        state.settings = next.settings;
        commitPlan(result);
        wizard = null;
        busy = false;
        navigate('plan');
        render();
        window.scrollTo(0, 0);
        toast('Масата е готова. Добър апетит!');
        break;
      }
      case 'extra': {
        if (!form.dataset.id && state.extras.length >= 200)
          throw Error('Списъкът може да съдържа до 200 допълнителни продукта.');
        const previous = state.extras.find((e) => e.id === form.dataset.id);
        const e = extraGrocery({
          ...Object.fromEntries(f),
          id: form.dataset.id || undefined,
          checked: previous?.checked || false,
        });
        if (previous) state.extras = state.extras.map((v) => (v.id === e.id ? e : v));
        else state.extras.push(e);
        persist();
        closeDialog();
        render();
        toast('Продуктът е запазен.');
        break;
      }
      case 'servings': {
        const index = Number(form.dataset.index),
          next = changeServings(state, index, Number(f.get('people')));
        snapshot();
        Object.assign(state, next);
        persist();
        render();
        openRecipe(state.plan[index].id, index);
        toast('Порциите и покупките са преизчислени.');
        break;
      }
      case 'note':
        state.notes[form.dataset.id] = String(f.get('note') || '').slice(0, 4000);
        persist();
        toast('Бележката е запазена.');
        break;
      case 'price': {
        const price = Number(f.get('price')),
          size = Number(f.get('size'));
        if (
          !Number.isFinite(price) ||
          price < 0 ||
          price > 10000 ||
          !Number.isFinite(size) ||
          size <= 0 ||
          size > 100000
        )
          throw Error('Провери цената и размера.');
        state.prices[form.dataset.id] = price;
        state.packSizes[form.dataset.id] = size;
        delete state.checked[form.dataset.id];
        persist();
        closeDialog();
        render();
        break;
      }
      case 'pantry': {
        const pantry = {};
        for (const k of Object.keys(PRODUCTS)) {
          const value = Number(f.get(k));
          if (!Number.isFinite(value) || value < 0 || value > 100000)
            throw Error('Провери въведените количества.');
          pantry[k] = value;
        }
        state.pantry = pantry;
        state.checked = {};
        persist();
        navigate('shopping');
        toast('Наличностите и покупките са обновени.');
        break;
      }
      case 'food-search': {
        picker.query = String(f.get('query') || '').trim();
        picker.status = '';
        if (picker.tab !== 'products') {
          showFoodPicker();
          break;
        }
        if (!CONFIG.apiBase) {
          picker.status =
            'Онлайн каталогът още не е свързан. Последните храни, твоите храни и ръчното въвеждане работят офлайн.';
          showFoodPicker();
          break;
        }
        lookupController?.abort();
        const controller = new AbortController();
        lookupController = controller;
        picker.status = 'Търсим…';
        showFoodPicker();
        try {
          const result = await searchProducts(picker.query, controller.signal);
          if (controller.signal.aborted || !dialog.open) break;
          picker.products = result.products || [];
          picker.status = picker.products.length ? '' : 'Няма намерени продукти.';
          showFoodPicker();
        } catch (e) {
          if (e.name === 'AbortError') break;
          picker.status = e.message;
          showFoodPicker();
        }
        break;
      }
      case 'copy-food': {
        const entry = state.diary.find((e) => e.id === form.dataset.id);
        if (!entry) throw Error('Записът вече не съществува.');
        const dates = f.getAll('dates');
        if (f.get('otherDate')) dates.push(f.get('otherDate'));
        const copies = copiesForDates([entry], dates, String(f.get('meal')));
        if (state.diary.length + copies.length > 20000) throw Error('Дневникът е пълен.');
        rememberDiary();
        state.diary.push(...copies);
        finishFitness('Записът е копиран.');
        break;
      }
      case 'macro-targets': {
        const targets = {};
        for (const k of ['protein', 'carbs', 'fat']) {
          const v = Number(f.get(k));
          if (!Number.isFinite(v) || v < 0 || v > 2000) throw Error('Провери целите.');
          targets[k] = v;
        }
        state.macroTargets = targets;
        persist();
        closeDialog();
        render();
        break;
      }
      case 'food': {
        const e = diaryEntry({
          ...Object.fromEntries(f),
          id: form.dataset.id || undefined,
          basis: Number(form.dataset.basis),
          source: form.dataset.source,
          brand: form.dataset.brand,
          servingLabel: form.dataset.serving,
          barcode: form.dataset.barcode,
        });
        const existing = state.diary.findIndex((v) => v.id === e.id);
        if (existing < 0 && state.diary.length >= 20000) throw Error('Дневникът е пълен.');
        if (existing >= 0) state.diary[existing] = e;
        else state.diary.push(e);
        date = e.date;
        persist();
        closeDialog();
        navigate('diary');
        render();
        toast('Храненето е записано.');
        break;
      }
      case 'target': {
        const target = Number(f.get('target'));
        if (!Number.isFinite(target) || target < 0 || target > 10000)
          throw Error('Въведи валидна цел.');
        state.dailyTarget = target;
        persist();
        closeDialog();
        render();
        break;
      }
      case 'barcode':
        await processBarcode(String(f.get('barcode')).trim());
        break;
    }
  } catch (e) {
    busy = false;
    const error = form.querySelector('.form-error');
    if (error) error.textContent = e.message;
    else toast(e.message, true);
    form.querySelectorAll('[type=submit]').forEach((b) => (b.disabled = false));
  }
});
document.addEventListener('change', async (event) => {
  const el = event.target,
    action = el.dataset.change;
  if (!action) return;
  try {
    switch (action) {
      case 'calorie-limit':
        wizard.draft.maxCalories = el.checked ? 700 : 0;
        render();
        break;
      case 'purchased':
        state.checked[el.dataset.id] = el.checked;
        persist();
        render();
        break;
      case 'store':
        if (state.settings.stores.includes(el.value)) {
          state.storeFor[el.dataset.id] = el.value;
          persist();
          render();
        }
        break;
      case 'extra-checked': {
        const e = state.extras.find((e) => e.id === el.dataset.id);
        if (e) {
          e.checked = el.checked;
          persist();
          render();
        }
        break;
      }
      case 'diary-date':
        if (el.value) {
          date = el.value;
          render();
        }
        break;
      case 'scan-image': {
        const file = el.files?.[0];
        if (!file) return;
        scanner.stop();
        toast('Разчитаме баркода на устройството…');
        const generation = scanner.generation;
        const code = await scanner.image(file);
        if (generation === scanner.generation && dialog.open) await processBarcode(code);
        break;
      }
      case 'import-adios': {
        const file = el.files?.[0];
        if (!file) return;
        if (file.size > 5_000_000) throw Error('Файлът е твърде голям.');
        const imported = parseAdiosExport(await file.text());
        if (state.diary.length + imported.length > 20000) throw Error('Няма място в дневника.');
        modal(
          `<h2 class="dialog-title">Импорт на дневник</h2><p>Ще добавим ${imported.length} записа от adios. Повторният импорт ще създаде дубликати. Текущите записи се запазват.</p>${button('Добави записите', 'confirm-adios-import', '', 'button primary')}`,
        );
        actions['confirm-adios-import'] = () => {
          rememberDiary();
          state.diary.push(...imported);
          delete actions['confirm-adios-import'];
          finishFitness('Записите са добавени.');
        };
        break;
      }
      case 'restore': {
        const file = el.files?.[0];
        if (!file) return;
        if (file.size > 5_000_000) throw Error('Копието е твърде голямо.');
        const restored = parseBackup(await file.text());
        modal(
          `<h2 class="dialog-title">Възстановяване на копие</h2><p>Ще заменим текущите данни с ${restored.plan.length} хранения в менюто и ${restored.diary.length} записа в дневника.</p>${button('Възстанови копието', 'confirm-restore', '', 'button primary full')}`,
        );
        actions['confirm-restore'] = () => {
          state = restored;
          undo = null;
          persist();
          closeDialog();
          render();
          toast('Копието е възстановено.');
          delete actions['confirm-restore'];
        };
        break;
      }
    }
  } catch (e) {
    toast(e.message, true);
  }
});
document.addEventListener('input', (event) => {
  if (event.target.closest('[data-form=food]')) updateFoodPreview();
  const el = event.target;
  if (wizard && el.dataset.input === 'budget-range') {
    wizard.draft.budget = Number(el.value);
    const input = document.getElementById('budget');
    if (input) input.value = el.value;
    return;
  }
  if (wizard && el.name === 'budget') {
    wizard.draft.budget = Number(el.value);
    const slider = document.querySelector('[data-input="budget-range"]');
    if (slider) slider.value = el.value;
  }
  if (wizard && el.name === 'maxCalories') wizard.draft.maxCalories = Number(el.value);
  if (el.dataset.input === 'recipe-search') {
    const position = el.selectionStart;
    query = el.value;
    render();
    const input = root.querySelector('[data-input=recipe-search]');
    input.focus();
    if (position !== null)
      try {
        input.setSelectionRange(position, position);
      } catch {}
  }
});
dialog.addEventListener('cancel', () => {
  scanner.stop();
  lookupController?.abort();
  dialogRecipe = null;
});
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      closeDialog();
  }
});
window.addEventListener('hashchange', () => {
  closeDialog();
  wizard = null;
  render();
  window.scrollTo(0, 0);
});
window.addEventListener('pagehide', () => scanner.stop());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) scanner.stop();
});
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY)
    toast('Данните са променени в друг раздел. Презареди, преди да продължиш.');
});
if (!state.onboarded && !state.plan.length) startWizard();
else render();
if (loaded.warning) toast(loaded.warning, true);

// Status changes do not rebuild the page or discard an in-progress form.
document.addEventListener('pwa-state', () => {
  const readiness = document.getElementById('offline-readiness');
  if (readiness) {
    const s = pwaState();
    readiness.textContent = s.ready
      ? 'Офлайн копието е готово на това устройство.'
      : s.error
        ? 'Не успяхме да подготвим офлайн копие. Приложението остава достъпно онлайн.'
        : 'Офлайн копието се подготвя при онлайн зареждане.';
  }
  const el = document.getElementById('connection-status');
  if (el) {
    const s = pwaState();
    el.innerHTML = `${s.offline ? '<span>Без интернет · локален режим</span>' : ''}${s.update ? button('Нова версия · Обнови', 'app-update', '', 'quiet') : ''}`;
    el.hidden = !s.offline && !s.update;
  }
});
initPwa();
