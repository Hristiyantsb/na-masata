// Screens of the app after setup. Every function returns markup; app.js owns state and events.
import { RECIPES, PRODUCTS, ALLERGENS, EQUIPMENT, CUISINES } from './catalog.js';
import { nutrition } from './nutrition.js';
import {
  recipe,
  PLANS,
  groceries,
  total,
  recipeCost,
  candidates,
  packPrice,
  packSize,
  SHOPPING_UNITS,
  shoppingSummary,
  explainEntry,
  isBreakfast,
  fitsSlot,
} from './domain.js';
import { AISLE, AISLES } from './products-more.js';
import { PRICE_SOURCE, STORE_PRICES } from './prices.js';
import { mascot, wordmark } from './brand.js';
import { storeBadge } from './stores.js';
import { DIET_COPY, GOAL_COPY } from './onboarding.js';
import { esc, icon, money, num, foodArt, dayName, plural, WEEKDAYS } from './ui.js';

export const NAV = [
  ['menu', 'menu', 'Меню'],
  ['recipes', 'book', 'Рецепти'],
  ['shopping', 'bag', 'Покупки'],
  ['diary', 'diary', 'Дневник'],
  ['more', 'more', 'Още'],
];
const ALIASES = { plan: 'menu', settings: 'more' };
export const pageOf = (route) => {
  const page = ALIASES[route] || route;
  return ['pantry'].includes(page) ? 'shopping' : ['plans', 'privacy'].includes(page) ? 'more' : page;
};

export function shell(route, content, status = {}) {
  const page = pageOf(route);
  const links = (cls) =>
    NAV.map(
      ([id, ic, label]) =>
        `<a class="${cls}" href="#${id}" ${id === page ? 'aria-current="page"' : ''}>${icon(ic, 24)}<span>${label}</span></a>`,
    ).join('');
  return `<a class="skip" href="#main">Към съдържанието</a>
<div class="app">
<aside class="side"><a class="side-brand" href="#menu" aria-label="На маса, към менюто">${wordmark()}</a><nav class="side-nav" aria-label="Основно меню">${links('side-link')}</nav><a class="side-plus" href="#plans"><span class="side-plus-art">${mascot('hello')}</span><span><b>Меню Плюс</b><small>Демо: всичко е отключено</small></span></a></aside>
<main class="main" id="main" tabindex="-1"><div class="status" data-status ${status.offline || status.update ? '' : 'hidden'}>${statusBar(status)}</div>${content}</main>
<nav class="tabbar" aria-label="Основно меню">${links('tab')}</nav>
</div>`;
}
export function statusBar(s = {}) {
  return `${s.offline ? `<span>${icon('info', 16)} Без интернет. Всичко работи от телефона.</span>` : ''}${s.update ? `<button type="button" class="btn btn-plain btn-small" data-action="app-update">${icon('refresh', 16)} Нова версия · Обнови</button>` : ''}`;
}

const head = (title, meta = '', action = '', eyebrow = '', back = '') =>
  `<header class="page-head">${back}<div class="page-head-text">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1>${meta ? `<p class="page-meta">${meta}</p>` : ''}</div>${action}</header>`;
const backLink = (href, label) =>
  `<a class="back-link" href="${href}">${icon('back', 20)}<span>${esc(label)}</span></a>`;
const empty = (art, title, text, action = '') =>
  `<section class="empty">${mascot(art, 'empty-art')}<h2>${title}</h2><p>${text}</p>${action}</section>`;

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 11 ? 'Добро утро' : h < 18 ? 'Добър ден' : 'Добър вечер';
}

const listJoin = (items) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} и ${items.at(-1)}`;

/* ---------- menu ---------- */

export function menuView(state, ui = {}) {
  const s = state.settings;
  if (!state.plan.length)
    return (
      head('Твоята седмица', '', '', greeting()) +
      empty(
        'curious',
        'Масата още е празна',
        'Отговори на шест кратки въпроса и ще подредим менюто и списъка за покупки.',
        `<button type="button" class="btn btn-primary" data-action="wizard">Подреди седмицата</button>`,
      )
    );
  const cost = total(state);
  const rows = groceries(state).filter((r) => r.packs);
  const done = rows.filter((r) => state.checked[r.k]).length;
  const keep = ui.keep;
  const one = { Закуска: 'закуска', Обяд: 'обяд', Вечеря: 'вечеря' }[s.slots[0]];
  const many = { Закуска: 'закуски', Обяд: 'обеда', Вечеря: 'вечери' }[s.slots[0]];
  const meals = s.slots.length > 1 ? (state.plan.length === 1 ? 'хранене' : 'хранения') : state.plan.length === 1 ? one : many;
  const over = cost > s.budget;
  const meta = `${s.people} ${s.people === 1 ? 'човек' : 'души'} · ${state.plan.length} ${meals} · ${esc(listJoin(s.stores))}`;
  const options = `<button type="button" class="icon-btn" data-action="menu-options" aria-label="Настройки на менюто">${icon('sliders', 22)}</button>`;
  const summary = `<div class="summary">
<div class="sum-card"><span class="sum-label">${icon('receipt', 18)}Сметка</span><b class="sum-value">${money(cost)}</b><span class="sum-sub ${over ? 'is-over' : ''}">${over ? `с ${money(cost - s.budget)} над бюджета` : `от ${money(s.budget)} бюджет`}</span><span class="bar ${over ? 'is-over' : ''}"><i style="width:${Math.min(100, Math.round((cost / s.budget) * 100))}%"></i></span></div>
<a class="sum-card sum-link" href="#shopping"><span class="sum-label">${icon('bag', 18)}Покупки</span><b class="sum-value">${done} от ${rows.length}</b><span class="sum-sub">в количката</span><span class="bar"><i style="width:${rows.length ? Math.round((done / rows.length) * 100) : 0}%"></i></span></a>
</div>`;
  const notice = state.locked
    ? `<p class="notice">${icon('lock', 18)}<span>Менюто е заключено. Отключи го от ${icon('sliders', 16)}, за да сменяш ястия.</span></p>`
    : keep
      ? `<p class="notice notice-accent">${icon('pin', 18)}<span>Докосни „Запази“ на ястията, които остават. Останалите ще сменим.</span></p>`
      : '';
  const days = [...new Set(state.plan.map((e) => e.day))].sort((a, b) => a - b);
  const body = days
    .map((day) => {
      const items = state.plan.map((e, i) => [e, i]).filter(([e]) => e.day === day);
      return `<section class="day" aria-labelledby="day-${day}"><h2 class="day-title" id="day-${day}">${dayName(day)}</h2>${items
        .map(([, i]) => mealCard(state, i, keep))
        .join('')}</section>`;
    })
    .join('');
  const foot = keep
    ? `<div class="keep-bar"><button type="button" class="btn btn-secondary" data-action="keep-cancel">Отказ</button><button type="button" class="btn btn-primary" data-action="keep-apply">${keep.size ? `Смени останалите ${state.plan.length - keep.size}` : 'Смени всички'}</button></div>`
    : `<div class="menu-foot"><button type="button" class="btn btn-secondary" data-action="new-menu" ${state.locked ? 'disabled' : ''}>${icon('refresh', 18)} Ново меню</button>${ui.undo ? `<button type="button" class="btn btn-plain" data-action="undo">${icon('back', 18)} Върни предишното</button>` : ''}</div>`;
  return `${head('Твоята седмица', meta, options, greeting())}${summary}${notice}<div class="week">${body}</div>${foot}<p class="fine center">${RECIPES.length} рецепти в каталога. Цените са най-ниските във веригите към ${PRICE_SOURCE.shown}. Калориите са за ядливата част на продуктите.</p>`;
}

export function mealCard(state, i, keep = null) {
  const e = state.plan[i],
    r = recipe(e.id),
    n = nutrition(r),
    cooked = !!state.cooked[i],
    kept = keep?.has(i);
  const slot = state.settings.slots.length > 1 ? `<span class="meal-slot">${esc(e.slot)}</span>` : '';
  const bar = keep
    ? `<div class="meal-bar"><button type="button" class="pill ${kept ? 'is-on' : ''}" data-action="keep-toggle" data-index="${i}" aria-pressed="${!!kept}">${icon('pin', 18)} ${kept ? 'Остава' : 'Запази'}</button></div>`
    : `<div class="meal-bar"><button type="button" class="pill ${cooked ? 'is-on' : ''}" data-action="cooked" data-index="${i}" aria-pressed="${cooked}">${icon('check', 18)} ${cooked ? 'Сготвено' : 'Сготвих го'}</button><button type="button" class="pill" data-action="swap" data-index="${i}" ${state.locked ? 'disabled' : ''}>${icon('swap', 18)} Смени</button><button type="button" class="icon-btn icon-btn-sm" data-action="meal-actions" data-index="${i}" aria-label="Още за ${esc(r.name)}">${icon('more', 20)}</button></div>`;
  return `<article class="meal ${cooked ? 'is-cooked' : ''} ${kept ? 'is-kept' : ''}"><button type="button" class="meal-open" data-action="recipe" data-id="${esc(r.id)}" data-index="${i}">${foodArt(r, 76)}<span class="meal-text">${slot}<b class="meal-name">${esc(r.name)}</b><span class="meal-meta">${r.time} мин · ${num(n.kcal)} ккал · ${e.people} ${e.people === 1 ? 'порция' : 'порции'}</span><span class="meal-why">${explainEntry(state, i).map(esc).join(' · ')}</span></span></button>${bar}</article>`;
}

export function menuOptionsSheet(state, hasUndo) {
  return `<h2 class="sheet-title">Менюто</h2><div class="list">
${row('sliders', 'Предпочитания', 'Магазини, режим, уреди, порции', 'wizard')}
${row(state.locked ? 'unlock' : 'lock', state.locked ? 'Отключи менюто' : 'Заключи менюто', state.locked ? 'Пак ще можеш да сменяш ястия' : 'Пази менюто от случайни промени', 'lock')}
${hasUndo ? row('back', 'Върни предишното меню', 'Отменя последната промяна', 'undo') : ''}
${row('bell', 'Напомняне в календара', 'Всяка седмица да подредиш менюто', 'reminder')}
${row('download', 'Изтегли менюто', 'Текстов файл с ястията и покупките', 'export-plan')}
</div>`;
}
function row(ic, title, sub, action, attrs = '', danger = false) {
  return `<button type="button" class="list-row ${danger ? 'is-danger' : ''}" data-action="${action}" ${attrs}><span class="list-ic">${icon(ic, 20)}</span><span class="list-text"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${icon('chevron', 18)}</button>`;
}

export function newMenuSheet(state) {
  return `<h2 class="sheet-title">Ново меню</h2><p class="sheet-sub">Правилата ти остават същите. Старото меню може да се върне.</p><div class="list">
${row('refresh', 'Смени всичко', `Нови ${plural(state.plan.length, 'ястие', 'ястия')} за седмицата`, 'regenerate')}
${row('pin', 'Запази някои, смени останалите', 'Избираш кои ястия остават', 'keep-start')}
</div>`;
}

export function mealActionsSheet(state, i) {
  const e = state.plan[i],
    r = recipe(e.id);
  const next = state.plan.findIndex((x) => x.day === e.day + 1 && x.slot === e.slot);
  const locked = state.locked ? 'disabled' : '';
  return `<p class="eyebrow">${dayName(e.day)} · ${esc(e.slot)}</p><h2 class="sheet-title">${esc(r.name)}</h2><div class="list">
${row('book', 'Отвори рецептата', '', 'recipe', `data-id="${esc(r.id)}" data-index="${i}"`)}
${row('swap', 'Смени с друго ястие', 'Само от подходящите за теб', 'swap', `data-index="${i}" ${locked}`)}
${row('calendar', 'Премести на друг ден', 'Разменя мястото с друго ястие', 'move-meal', `data-index="${i}" ${locked}`)}
${next >= 0 ? row('copy', 'Сготви двойно за утре', `${dayName(e.day + 1)}: същото ястие, покупките се обновяват`, 'place-meal', `data-from="${i}" data-to="${next}" data-mode="repeat" ${locked}`) : ''}
${row('copy', 'Повтори в друг ден', 'Същото ястие на още едно място', 'repeat-meal', `data-index="${i}" ${locked}`)}
</div>`;
}

export function destinationSheet(state, from, mode) {
  const current = recipe(state.plan[from].id);
  const fits = (entry) =>
    fitsSlot(current, entry.slot) && (mode !== 'move' || fitsSlot(recipe(entry.id), state.plan[from].slot));
  return `<p class="eyebrow">${mode === 'move' ? 'Премести' : 'Повтори'}</p><h2 class="sheet-title">${esc(current.name)}</h2><p class="sheet-sub">${mode === 'move' ? 'Избери ястие, с което да си разменят местата.' : 'Избери кое хранене да стане същото ястие. Покупките ще се преизчислят.'}</p><div class="list">${state.plan
    .map((entry, to) =>
      to === from || !fits(entry)
        ? ''
        : `<button type="button" class="list-row" data-action="place-meal" data-from="${from}" data-to="${to}" data-mode="${mode}"><span class="list-text"><small>${dayName(entry.day)} · ${esc(entry.slot)}</small><b>${esc(recipe(entry.id).name)}</b></span>${icon('chevron', 18)}</button>`,
    )
    .join('')}</div>`;
}

export function swapSheet(state, i) {
  const current = recipe(state.plan[i].id);
  const used = new Set(state.plan.map((e) => e.id));
  const options = candidates(state.settings)
    .filter((r) => r.id !== current.id && fitsSlot(r, state.plan[i].slot))
    .sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)) || a.name.localeCompare(b.name, 'bg'));
  return `<p class="eyebrow">Вместо „${esc(current.name)}“</p><h2 class="sheet-title">Какво ти се яде?</h2><p class="sheet-sub">${plural(options.length, 'ястие пасва', 'ястия пасват')} на правилата ти. Останалото меню остава.</p><div class="recipe-grid recipe-grid-sheet">${options
    .map((r) => recipeCard(r, state, { swap: i, inMenu: used.has(r.id) }))
    .join('')}</div>`;
}

/* ---------- recipes ---------- */

export function recipeCard(r, state, { swap = null, inMenu = false } = {}) {
  const n = nutrition(r);
  const fav = state.favorites.includes(r.id);
  const kindLabel = isBreakfast(r) ? r.type : r.cuisine && CUISINES[r.cuisine];
  const open =
    swap === null
      ? `data-action="recipe" data-id="${esc(r.id)}"`
      : `data-action="choose-swap" data-id="${esc(r.id)}" data-index="${swap}"`;
  return `<article class="rcard"><button type="button" class="rcard-open" ${open}><span class="rcard-art">${foodArt(r, 112)}</span><span class="rcard-text">${kindLabel ? `<span class="rcard-kind">${esc(kindLabel)}${inMenu ? ' · в менюто' : ''}</span>` : ''}<b>${esc(r.name)}</b><span class="rcard-meta">${r.time} мин · ${num(n.kcal)} ккал · ${num(n.protein)} г протеин</span></span></button>${
    swap === null
      ? `<button type="button" class="fav ${fav ? 'is-on' : ''}" data-action="favorite" data-id="${esc(r.id)}" aria-pressed="${fav}" aria-label="Любима рецепта: ${esc(r.name)}">${icon('heart', 20, fav)}</button>`
      : ''
  }</article>`;
}

export const RECIPE_FILTERS = [
  ['all', 'Всички'],
  ['fav', 'Любими'],
  ['breakfast', 'Закуски'],
  ['quick', 'До 30 мин'],
];
export function filterRecipes(state, query = '', filter = 'all') {
  const q = query.trim().toLocaleLowerCase('bg');
  return candidates(state.settings).filter(
    (r) =>
      (!q || r.name.toLocaleLowerCase('bg').includes(q)) &&
      (filter === 'all' ||
        (filter === 'fav' && state.favorites.includes(r.id)) ||
        (filter === 'quick' && r.time <= 30) ||
        (filter === 'breakfast' && isBreakfast(r)) ||
        r.cuisine === filter),
  );
}

export function recipesView(state, query = '', filter = 'all') {
  const allowed = candidates(state.settings);
  const list = filterRecipes(state, query, filter);
  const cuisines = Object.entries(CUISINES).filter(([k]) => allowed.some((r) => r.cuisine === k));
  const chips = [...RECIPE_FILTERS, ...cuisines]
    .map(
      ([id, label]) =>
        `<button type="button" class="chip ${filter === id ? 'is-on' : ''}" data-action="recipe-filter" data-filter="${esc(id)}" aria-pressed="${filter === id}">${id === 'fav' ? icon('heart', 16, filter === id) : ''}${esc(label)}</button>`,
    )
    .join('');
  const emptyState =
    filter === 'fav' && !query
      ? empty('curious', 'Още нямаш любими', 'Докосни сърцето на рецепта и тя ще се появява тук. Любимите влизат по-често в менюто.')
      : empty('sleepy', 'Няма такава рецепта', 'Опитай с друга дума или махни филтъра.');
  return `${head('Рецепти', `${plural(allowed.length, 'рецепта пасва', 'рецепти пасват')} на правилата ти`)}<label class="search">${icon('search', 18)}<input type="search" data-input="recipe-search" value="${esc(query)}" placeholder="Търси ястие или продукт" aria-label="Търси рецепта" autocomplete="off"></label><div class="chips-scroll" role="group" aria-label="Филтър">${chips}</div><div class="recipe-grid" data-recipe-grid>${list.map((r) => recipeCard(r, state)).join('')}</div>${list.length ? '' : emptyState}`;
}

/* ---------- recipe detail ---------- */

/** Minutes mentioned in a cooking step ("25–30 минути", "2,5 часа"); the larger value wins. */
export function stepMinutes(text) {
  const hours = text.match(/(\d+(?:,\d+)?)\s*час/);
  if (hours) return Math.round(Number(hours[1].replace(',', '.')) * 60);
  const minutes = text.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*мин/);
  return minutes ? Number(minutes[2] || minutes[1]) : 0;
}
/** Steps are written for two servings; water in ml scales with the household. */
export const scaleStep = (text, people) =>
  text.replace(/(\d+) мл/g, (_, v) => `${num((Number(v) * people) / 2, 0)} мл`).replace(/ за 2 порции/g, '');

export function recipeSheet(r, state, { index = null, done = [], preview = false, people = null } = {}) {
  const n = people ?? (index === null ? state.settings.people : state.plan[index]?.people || state.settings.people);
  const macros = nutrition(r);
  const allergens = [...new Set(Object.keys(r.ing).flatMap((k) => PRODUCTS[k][4]))];
  const fav = state.favorites.includes(r.id);
  // A breakfast is first of all a breakfast (plain, keto or plant-based); the cuisine comes second.
  const kind = (isBreakfast(r) ? [r.type, r.cuisine && CUISINES[r.cuisine]] : [r.cuisine && CUISINES[r.cuisine], r.type])
    .filter(Boolean)
    .join(' · ');
  const servings =
    index !== null && !preview
      ? `<div class="servings"><span>Порции</span><div class="stepper"><button type="button" class="icon-btn" data-action="servings" data-index="${index}" data-delta="-1" aria-label="Една порция по-малко" ${state.locked || n <= 1 ? 'disabled' : ''}>${icon('minus', 20)}</button><b>${n}</b><button type="button" class="icon-btn" data-action="servings" data-index="${index}" data-delta="1" aria-label="Една порция повече" ${state.locked || n >= 12 ? 'disabled' : ''}>${icon('plus', 20)}</button></div></div>`
      : '';
  const ingredients = Object.entries(r.ing)
    .map(([k, v]) => {
      const q = (v * n) / 2;
      return `<li><span>${esc(PRODUCTS[k][0])}</span><b>${num(q, q < 10 ? 1 : 0)} ${PRODUCTS[k][2]}</b></li>`;
    })
    .join('');
  const steps = r.steps
    .map(
      (text, i) =>
        `<li><label class="step ${done.includes(i) ? 'is-done' : ''}"><input type="checkbox" data-change="cooking-step" data-id="${esc(r.id)}" data-index="${i}" ${done.includes(i) ? 'checked' : ''} ${preview ? 'disabled' : ''}><span class="step-n" aria-hidden="true">${i + 1}</span><span class="step-text">${esc(scaleStep(text, n))}</span></label></li>`,
    )
    .join('');
  const actions = preview
    ? ''
    : `<div class="recipe-actions"><button type="button" class="btn btn-secondary ${fav ? 'is-on' : ''}" data-action="favorite" data-id="${esc(r.id)}" aria-pressed="${fav}">${icon('heart', 18, fav)} ${fav ? 'В любими' : 'Любима'}</button><button type="button" class="btn btn-secondary" data-action="diary-recipe" data-id="${esc(r.id)}">${icon('plus', 18)} В дневника</button>${index !== null ? `<button type="button" class="btn btn-secondary" data-action="swap" data-index="${index}" ${state.locked ? 'disabled' : ''}>${icon('swap', 18)} Смени</button>` : ''}</div>`;
  const note = preview
    ? ''
    : `<form class="note" data-form="note" data-id="${esc(r.id)}"><label class="field"><span>Моя бележка</span><textarea name="note" maxlength="4000" rows="3" placeholder="Например: следващия път повече чесън">${esc(state.notes[r.id] || '')}</textarea></label><button class="btn btn-secondary btn-small" type="submit">Запази бележката</button></form>`;
  return `<article class="recipe"><div class="recipe-hero">${foodArt(r, 168)}</div>${kind ? `<p class="eyebrow">${esc(kind)}</p>` : ''}<h2 class="sheet-title">${esc(r.name)}</h2><ul class="facts"><li>${icon('clock', 18)}${r.time} мин${r.prepNote ? ' + накисване' : ''}</li><li>${icon('people', 18)}${n} ${n === 1 ? 'порция' : 'порции'}</li><li>${icon('utensils', 18)}${esc(r.equipment.map((k) => EQUIPMENT[k]).join(', ') || 'Без готвене')}</li></ul>${servings}<div class="macros" aria-label="На порция"><div><b>${num(macros.kcal)}</b><small>ккал</small></div><div><b>${num(macros.protein)} г</b><small>протеин</small></div><div><b>${num(macros.carbs)} г</b><small>въглехидрати</small></div><div><b>${num(macros.fat)} г</b><small>мазнини</small></div></div><p class="fine">На порция. Съставките за ${n} ${n === 1 ? 'порция' : 'порции'} са около ${money(recipeCost(r, n, state))} по цените от ${PRICE_SOURCE.shown}.</p>${r.prepNote ? `<p class="notice">${icon('clock', 18)}<span>${esc(r.prepNote)}</span></p>` : ''}${preview ? '' : `<button type="button" class="btn btn-primary btn-block" data-action="cook" data-id="${esc(r.id)}" data-step="0">${icon('play', 18, true)} Готви стъпка по стъпка</button>`}<section class="recipe-sec"><h3>Съставки <span>за ${n} ${n === 1 ? 'порция' : 'порции'}</span></h3><ul class="ingredients">${ingredients}</ul><p class="fine">${allergens.length ? `Алергени: ${esc(allergens.map((k) => ALLERGENS[k]).join(', ').toLocaleLowerCase('bg'))}.` : 'Без отбелязаните алергени.'} Проверявай етикетите.</p></section><section class="recipe-sec"><h3>Приготвяне ${preview ? '' : `<span data-cook-progress>${done.length} от ${r.steps.length}</span>`}</h3><ol class="steps">${steps}</ol></section>${actions}${note}</article>`;
}

export function cookView(r, step, timer, people = 2) {
  const count = r.steps.length,
    text = scaleStep(r.steps[step], people),
    minutes = stepMinutes(r.steps[step]),
    running = timer && timer.id === r.id && timer.step === step;
  const timerBlock = minutes
    ? `<div class="cook-timer">${
        running
          ? `<b class="cook-clock" data-timer-left>${esc(timer.label)}</b><button type="button" class="btn btn-secondary" data-action="cook-timer-stop">Спри таймера</button>`
          : `<button type="button" class="btn btn-secondary" data-action="cook-timer" data-minutes="${minutes}" data-id="${esc(r.id)}" data-step="${step}">${icon('timer', 20)} Таймер ${minutes} мин</button>`
      }</div>`
    : '';
  return `<div class="cook"><p class="eyebrow">${esc(r.name)}</p><div class="cook-dots" aria-hidden="true">${r.steps.map((_, i) => `<i class="${i < step ? 'is-done' : i === step ? 'is-now' : ''}"></i>`).join('')}</div><p class="cook-count">Стъпка ${step + 1} от ${count}</p><p class="cook-text">${esc(text)}</p>${timerBlock}<div class="cook-nav">${
    step > 0
      ? `<button type="button" class="btn btn-secondary" data-action="cook" data-id="${esc(r.id)}" data-step="${step - 1}">${icon('back', 20)} Назад</button>`
      : '<span></span>'
  }${
    step < count - 1
      ? `<button type="button" class="btn btn-primary" data-action="cook" data-id="${esc(r.id)}" data-step="${step + 1}">Следваща ${icon('arrow', 20)}</button>`
      : `<button type="button" class="btn btn-primary" data-action="cook-done" data-id="${esc(r.id)}">${icon('check', 20)} Готово</button>`
  }</div><p class="fine center">Екранът няма да изгасне, докато готвиш.</p></div>`;
}

/* ---------- shopping ---------- */

const AISLE_ORDER = Object.keys(AISLES);
const aisleIndex = (k) => {
  const i = AISLE_ORDER.indexOf(AISLE[k] || 'dry');
  return i < 0 ? AISLE_ORDER.length : i;
};
// Only food that spoils within days gets a "left over" hint; staples like potatoes keep.
const SHORT_LIFE = new Set([
  'spinach',
  'dill',
  'parsley',
  'mushroom',
  'rocket',
  'lettuce',
  'avocado',
  'greenonion',
  'zucchini',
  'broccoli',
  'cauliflower',
  'tomato',
  'cucumber',
  'eggplant',
  'bread',
  'tortilla',
]);
const leftoverMatters = (k) =>
  SHORT_LIFE.has(k) ||
  (['meat', 'fish', 'dairy'].includes(AISLE[k]) && !['egg', 'butter', 'parmesan', 'kashkaval'].includes(k));

function groceryRow(r, state, big = false) {
  const done = !!state.checked[r.k];
  const left =
    leftoverMatters(r.k) && r.left / r.size >= 0.3 ? ` · остават ${num(r.left, 0)} ${r.unit}` : '';
  const detail = big
    ? `${r.packs} × ${num(r.size, 1)} ${r.unit}`
    : `${r.packs} × ${num(r.size, 1)} ${r.unit} · за менюто ${num(r.need, 1)} ${r.unit}${left}`;
  return `<li class="grow ${done ? 'is-done' : ''}"><label class="gcheck"><input type="checkbox" data-change="purchased" data-id="${r.k}" ${done ? 'checked' : ''}><span class="gbox" aria-hidden="true">${icon('check', 16)}</span><span class="gtext"><b>${esc(r.name)}</b><small>${detail}</small></span></label>${big ? '' : `<button type="button" class="gprice" data-action="grocery-edit" data-id="${r.k}" aria-label="Цена и магазин: ${esc(r.name)}">${money(r.cost)}</button>`}</li>`;
}

function storeSections(state, rows, big = false) {
  return state.settings.stores
    .map((store) => {
      const list = rows
        .filter((r) => r.store === store)
        .sort((a, b) => aisleIndex(a.k) - aisleIndex(b.k) || a.name.localeCompare(b.name, 'bg'));
      if (!list.length) return '';
      let aisle = null,
        body = '';
      for (const r of list) {
        const a = AISLE[r.k] || 'dry';
        if (a !== aisle) {
          body += `${aisle ? '</ul>' : ''}<h3 class="aisle">${esc(AISLES[a])}</h3><ul class="glist">`;
          aisle = a;
        }
        body += groceryRow(r, state, big);
      }
      body += '</ul>';
      const doneHere = list.filter((r) => state.checked[r.k]).length;
      return `<section class="store-sec"><header class="store-head">${storeBadge(store)}<h2>${esc(store)}</h2><span>${big ? `${doneHere} от ${list.length}` : money(list.reduce((s, r) => s + r.cost, 0))}</span></header>${body}</section>`;
    })
    .join('');
}

export function shoppingView(state) {
  const rows = groceries(state),
    toBuy = rows.filter((r) => r.packs),
    done = toBuy.filter((r) => state.checked[r.k]).length,
    summary = shoppingSummary(state),
    pct = toBuy.length ? Math.round((done / toBuy.length) * 100) : 0;
  const action = toBuy.length
    ? `<button type="button" class="btn btn-primary btn-small" data-action="shop-mode">${icon('cart', 18)} Пазарувам</button>`
    : '';
  if (!state.plan.length && !state.extras.length)
    return (
      head('Покупки') +
      empty(
        'list',
        'Списъкът чака менюто',
        'Подреди седмицата и ще съберем всички съставки тук, по магазини и щандове.',
        `<button type="button" class="btn btn-primary" data-action="wizard">Подреди седмицата</button>`,
      )
    );
  const progress = toBuy.length
    ? `<section class="cart-card" role="group" aria-label="Напредък"><div class="cart-top"><b>${done} от ${toBuy.length}</b><span>в количката</span><strong>${money(summary.knownTotal)}</strong></div><span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="В количката"><i style="width:${pct}%"></i></span><p class="fine">За цели опаковки по цените от ${PRICE_SOURCE.shown}${summary.unknownPrices ? `, плюс ${plural(summary.unknownPrices, 'продукт', 'продукта')} без цена` : ''}.</p></section>`
    : '';
  const have = rows.filter((r) => !r.packs);
  const haveBlock = have.length
    ? `<details class="have"><summary>${icon('fridge', 18)} Имаш достатъчно вкъщи <span>${have.length}</span></summary><ul class="have-list">${have.map((r) => `<li><span>${esc(r.name)}</span><small>${num(r.need, 1)} ${r.unit}</small></li>`).join('')}</ul></details>`
    : '';
  const extras = `<section class="extras"><header class="section-head"><h2>И още за вкъщи</h2><button type="button" class="btn btn-secondary btn-small" data-action="extra-add">${icon('plus', 18)} Добави</button></header>${
    state.extras.length
      ? `<ul class="glist">${state.extras
          .map(
            (e) =>
              `<li class="grow ${e.checked ? 'is-done' : ''}"><label class="gcheck"><input type="checkbox" data-change="extra-checked" data-id="${esc(e.id)}" ${e.checked ? 'checked' : ''}><span class="gbox" aria-hidden="true">${icon('check', 16)}</span><span class="gtext"><b>${esc(e.name)}</b><small>${num(e.amount, 2)} ${esc(e.unit)} · ${esc(e.store)}</small></span></label><button type="button" class="gprice" data-action="extra-edit" data-id="${esc(e.id)}" aria-label="Редактирай: ${esc(e.name)}">${e.price === null ? 'без цена' : money(e.price)}</button></li>`,
          )
          .join('')}</ul>`
      : '<p class="muted">Неща извън рецептите: кафе, препарати, плодове за децата. Остават при смяна на менюто.</p>'
  }</section>`;
  return `${head('Покупки', esc(listJoin(state.settings.stores)), action)}${progress}<a class="row-link" href="#pantry"><span class="list-ic">${icon('fridge', 20)}</span><span class="list-text"><b>Какво имаш вкъщи?</b><small>Приспадаме го от списъка</small></span>${icon('chevron', 18)}</a>${storeSections(state, toBuy)}${haveBlock}${extras}<div class="actions-row"><button type="button" class="btn btn-secondary btn-small" data-action="copy-shopping">${icon('copy', 18)} Копирай</button><button type="button" class="btn btn-secondary btn-small" data-action="export-shopping">${icon('download', 18)} Изтегли</button>${done || state.extras.some((e) => e.checked) ? `<button type="button" class="btn btn-plain btn-small" data-action="uncheck-all">Изчисти отметките</button>` : ''}</div><p class="fine">Цените са най-ниските за продукта във веригата, от която го купуваш, по ${PRICE_SOURCE.name} (${PRICE_SOURCE.place}, ${PRICE_SOURCE.shown}). За продуктите извън кошницата на портала цената е от онлайн магазин на същата дата. Менят се всеки ден и не са оферти. Смени цена или опаковка с докосване върху сумата.</p>`;
}

export function shopModeView(state) {
  const toBuy = groceries(state).filter((r) => r.packs);
  const done = toBuy.filter((r) => state.checked[r.k]).length;
  const pct = toBuy.length ? Math.round((done / toBuy.length) * 100) : 0;
  const all = done === toBuy.length && toBuy.length;
  return `<div class="shop"><header class="shop-head"><div><p class="eyebrow">Пазаруваш</p><h1>${done} от ${toBuy.length}</h1></div><button type="button" class="btn btn-primary btn-small" data-action="shop-mode">Готово</button></header><span class="bar"><i style="width:${pct}%"></i></span>${all ? `<p class="notice notice-accent">${icon('check', 18)}<span>Всичко е в количката. Приятно готвене.</span></p>` : ''}${storeSections(state, toBuy, true)}${
    state.extras.length
      ? `<section class="store-sec"><header class="store-head"><h2>И още</h2></header><ul class="glist">${state.extras
          .map(
            (e) =>
              `<li class="grow ${e.checked ? 'is-done' : ''}"><label class="gcheck"><input type="checkbox" data-change="extra-checked" data-id="${esc(e.id)}" ${e.checked ? 'checked' : ''}><span class="gbox" aria-hidden="true">${icon('check', 16)}</span><span class="gtext"><b>${esc(e.name)}</b><small>${num(e.amount, 2)} ${esc(e.unit)} · ${esc(e.store)}</small></span></label></li>`,
          )
          .join('')}</ul></section>`
      : ''
  }<p class="fine center">Екранът остава включен, докато пазаруваш.</p></div>`;
}

export function grocerySheet(state, k) {
  const p = PRODUCTS[k];
  const stores = state.settings.stores;
  const current = groceries(state).find((r) => r.k === k)?.store || stores[0];
  return `<p class="eyebrow">Продукт</p><h2 class="sheet-title">${esc(p[0])}</h2><form data-form="grocery" data-id="${k}">${
    stores.length > 1
      ? `<fieldset class="field"><legend>Купувам го от</legend><div class="choice-list">${stores.map((s) => `<label class="choice"><input type="radio" name="store" value="${esc(s)}" ${s === current ? 'checked' : ''}>${storeBadge(s)}<span>${esc(s)}</span>${STORE_PRICES[k]?.[s] != null ? `<small class="choice-price">${money(STORE_PRICES[k][s])}</small>` : ''}</label>`).join('')}</div></fieldset>`
      : ''
  }<div class="form-grid"><label class="field"><span>Цена на опаковка, €</span><input name="price" type="number" inputmode="decimal" min="0" max="10000" step="0.01" value="${packPrice(k, state)}" required></label><label class="field"><span>Опаковка, ${p[2]}</span><input name="size" type="number" inputmode="decimal" min="0.1" max="100000" step="0.1" value="${packSize(k, state)}" required></label></div><p class="fine">${STORE_PRICES[k] ? `До всяка верига е най-ниската цена за продукта по ${PRICE_SOURCE.name} (${PRICE_SOURCE.place}, ${PRICE_SOURCE.shown}). Менят се всеки ден.` : `Цената е от онлайн магазин към ${PRICE_SOURCE.shown}.`} Ако запишеш своя цена, тя важи за всички магазини.</p><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запази</button></form>`;
}

export function extraForm(state, entry = null) {
  const e = entry || { name: '', amount: 1, unit: 'бр.', price: null, store: state.settings.stores[0] };
  return `<h2 class="sheet-title">${entry ? 'Промени продукта' : 'Добави към покупките'}</h2><form data-form="extra" ${entry ? `data-id="${esc(entry.id)}"` : ''}><label class="field"><span>Продукт</span><input name="name" value="${esc(e.name)}" maxlength="100" required autocomplete="off" placeholder="Например кафе"></label><div class="form-grid"><label class="field"><span>Количество</span><input name="amount" type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" value="${e.amount}" required></label><label class="field"><span>Мярка</span><select name="unit">${SHOPPING_UNITS.map((u) => `<option ${u === e.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label><label class="field"><span>Обща цена, €</span><input name="price" type="number" inputmode="decimal" min="0" max="100000" step="0.01" value="${e.price ?? ''}" placeholder="по желание"></label><label class="field"><span>Магазин</span><select name="store">${state.settings.stores.map((s) => `<option ${s === e.store ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label></div><p class="form-error" role="alert"></p><div class="sheet-actions">${entry ? `<button type="button" class="btn btn-danger" data-action="extra-delete" data-id="${esc(entry.id)}">${icon('trash', 18)} Махни</button>` : ''}<button class="btn btn-primary" type="submit">Запази</button></div></form>`;
}

export function pantryView(state) {
  const used = new Set(groceries(state).map((r) => r.k));
  const input = (k) => {
    const p = PRODUCTS[k];
    return `<label class="prow"><span>${esc(p[0])}</span><span class="prow-in"><input name="${k}" type="number" inputmode="decimal" min="0" max="100000" step="${p[2] === 'бр.' ? 1 : 0.1}" value="${state.pantry[k] || ''}" placeholder="0"><small>${p[2]}</small></span></label>`;
  };
  const inMenu = [...used].sort((a, b) => aisleIndex(a) - aisleIndex(b));
  const rest = Object.keys(PRODUCTS)
    .filter((k) => !used.has(k))
    .sort((a, b) => aisleIndex(a) - aisleIndex(b) || PRODUCTS[a][0].localeCompare(PRODUCTS[b][0], 'bg'));
  return `${head('Какво имаш вкъщи?', 'Количества, не опаковки. Приспадаме ги от списъка за покупки.', '', '', backLink('#shopping', 'Покупки'))}<form data-form="pantry" class="pantry">${inMenu.length ? `<section class="pgroup"><h2>За менюто тази седмица</h2>${inMenu.map(input).join('')}</section>` : ''}<details class="pgroup" ${inMenu.length ? '' : 'open'}><summary><h2>Всички продукти</h2></summary>${rest.map(input).join('')}</details><div class="sticky-actions"><button class="btn btn-primary btn-block" type="submit">Запази и обнови списъка</button></div></form>`;
}

/* ---------- more ---------- */

export function moreView(state, pwa = {}) {
  const readiness = pwa.ready
    ? 'Готово за работа без интернет на това устройство.'
    : pwa.error
      ? 'Не успяхме да подготвим работа без интернет. Приложението работи онлайн.'
      : 'Подготвя се за работа без интернет при първото зареждане.';
  return `${head('Още')}<a class="plus-card" href="#plans"><span class="plus-art">${mascot('hello')}</span><span class="plus-text"><b>Меню Плюс · демо</b><small>Дневник, баркод, макроси, тегло и вода. Всичко е отключено, плащанията още не са включени.</small></span>${icon('chevron', 18)}</a>
<section class="list-group"><h2>Седмицата</h2><div class="list">${row('sliders', 'Предпочитания', 'Магазини, режим, уреди, порции', 'wizard')}${row('bell', 'Напомняне в календара', 'Всяка седмица да подредиш менюто', 'reminder')}${state.plan.length ? row('download', 'Изтегли менюто', 'Текстов файл с ястията и покупките', 'export-plan') : ''}</div></section>
<section class="list-group"><h2>Данни на това устройство</h2><div class="list">${row('download', 'Изтегли резервно копие', 'Меню, покупки, дневник и настройки', 'backup')}<label class="list-row"><span class="list-ic">${icon('upload', 20)}</span><span class="list-text"><b>Възстанови от копие</b><small>Файл .json от „На маса“</small></span>${icon('chevron', 18)}<input type="file" accept="application/json,.json" data-change="restore" class="sr-only"></label>${row('trash', 'Изтрий всички данни', 'Започваш отначало на това устройство', 'reset', '', true)}</div></section>
<section class="list-group"><h2>Приложението</h2><div class="list">${row('phone', 'Добави на началния екран', 'Отваря се като приложение', 'install-app')}${row('refresh', 'Провери за нова версия', '', 'check-update')}</div><p class="list-note" id="offline-readiness" role="status">${readiness}</p></section>
<section class="list-group"><h2>За „На маса“</h2><div class="list"><a class="list-row" href="#privacy"><span class="list-ic">${icon('shield', 20)}</span><span class="list-text"><b>Поверителност</b><small>Какво пазим и къде</small></span>${icon('chevron', 18)}</a><a class="list-row" href="https://github.com/Hristiyantsb/na-masata" target="_blank" rel="noopener"><span class="list-ic">${icon('external', 20)}</span><span class="list-text"><b>Изходен код</b><small>GitHub</small></span>${icon('chevron', 18)}</a></div><p class="list-note">Версия 1.0 · ${RECIPES.length} рецепти · ${Object.keys(PRODUCTS).length} продукта</p></section>`;
}

export function plansView(interval = 'monthly') {
  const yearly = interval === 'yearly';
  const card = (id, items) => {
    const p = PLANS[id];
    const price = yearly ? p.yearly : p.monthly;
    return `<article class="plan-card ${id === 'plus' ? 'is-plus' : ''}"><h2>${esc(p.name)}</h2><p class="plan-price"><b>${num(price)} €</b><span>/ ${yearly ? 'година' : 'месец'}</span></p>${yearly ? `<p class="fine">${money(p.yearly / 12)} на месец, платени наведнъж</p>` : '<p class="fine">Плащане всеки месец</p>'}<ul class="plan-list">${items.map((t) => `<li>${icon('check', 18)}<span>${esc(t)}</span></li>`).join('')}</ul></article>`;
  };
  return `${head('Планове', 'Плащанията още не са включени. Докато сме в демо, всичко е отключено и нищо не се таксува.', '', '', backLink('#more', 'Още'))}<div class="seg seg-2" role="group" aria-label="Период"><button type="button" class="seg-item" data-action="billing" data-value="monthly" aria-pressed="${!yearly}">Месечно</button><button type="button" class="seg-item" data-action="billing" data-value="yearly" aria-pressed="${yearly}">Годишно</button></div><div class="plan-cards">${card('menu', [
    'Седмично меню по твоите правила',
    'Списък по магазини и щандове',
    'Готвене стъпка по стъпка с таймер',
    `Всички ${RECIPES.length} рецепти`,
  ])}${card('plus', ['Всичко от „Меню“', 'Хранителен дневник с макроси', 'Баркод от етикета', 'Тегло и вода'])}</div><p class="fine">Цените са за бъдещото пускане. Преди плащане ще видиш точната сума, периода и условията.</p>`;
}

export function privacyView() {
  return `${head('Поверителност', 'Как работи „На маса“ на това устройство.', '', '', backLink('#more', 'Още'))}<div class="prose"><h2>Всичко остава тук</h2><p>Менюто, покупките, дневникът и настройките се пазят само в този браузър. Нямаш акаунт. Към интернет излиза само едно: когато сканираш баркод или търсиш храна онлайн в дневника, изпращаме цифрите на баркода или думите за търсене до Open Food Facts (openfoodfacts.org), за да намерим продукта. Нищо друго.</p><h2>Камерата</h2><p>Баркодът се разчита на самото устройство. Кадрите не се записват и не се изпращат никъде; изпращат се само цифрите, за да намерим продукта.</p><h2>Open Food Facts</h2><p>Продуктите по баркод и при търсене онлайн идват от Open Food Facts, открита база с лиценз ODbL. Данните са въведени от хора и може да се различават от етикета.</p><h2>Резервно копие</h2><p>Изтегли копие от „Още“, ако чистиш браузъра или сменяш телефона. Файлът е твой и стои там, където го запазиш.</p><h2>Изтриване</h2><p>„Още“ → „Изтрий всички данни“ маха всичко от това устройство. Действието не може да се върне.</p><h2>Цени и хранителни стойности</h2><p>Цените са снимка към ${PRICE_SOURCE.shown}: най-ниската цена за продукта във всяка верига по ${PRICE_SOURCE.name} (${PRICE_SOURCE.place}), а за продуктите извън кошницата на портала — от онлайн магазин. Не са оферти и се менят всеки ден. Хранителните стойности са по стандартни таблици и важат за ядливата част на продукта. Проверявай етикетите за алергени.</p></div>`;
}

export const REMINDER_DAYS = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
export function reminderSheet() {
  return `<h2 class="sheet-title">Напомняне в календара</h2><p class="sheet-sub">Добавяме седмично събитие в календара ти, за да не забравяш да подредиш менюто. Без акаунт и без известия от приложението.</p><form data-form="reminder"><div class="form-grid"><label class="field"><span>Ден</span><select name="day">${REMINDER_DAYS.map((d, i) => `<option value="${i}" ${i === 6 ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label class="field"><span>Час</span><input name="time" type="time" value="18:00" required></label></div><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">${icon('calendar', 18)} Добави в календара</button></form><p class="fine">Изтегля се файл .ics. На iPhone и Android го отваряш и избираш „Добави“.</p>`;
}

/** Weekly calendar event as iCalendar text. Floating local time, so it follows the phone. */
export function reminderICS(weekday, time, from = new Date(), url = 'https://hristiyantsb.github.io/na-masata/') {
  const [h, m] = String(time).split(':').map(Number);
  const start = new Date(from);
  start.setHours(h, m, 0, 0);
  const target = (Number(weekday) + 1) % 7; // our list starts on Monday, Date.getDay() on Sunday
  let delta = (target - start.getDay() + 7) % 7;
  if (delta === 0 && start <= from) delta = 7;
  start.setDate(start.getDate() + delta);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const byday = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][Number(weekday)];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Na masa//BG',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:na-masa-weekly-${byday}@na-masa`,
    `DTSTAMP:${stamp(from)}`,
    `DTSTART:${stamp(start)}`,
    'DURATION:PT15M',
    `RRULE:FREQ=WEEKLY;BYDAY=${byday}`,
    'SUMMARY:Подреди менюто за седмицата',
    'DESCRIPTION:Отвори „На маса“ и натисни „Ново меню“.',
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Подреди менюто за седмицата',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function confirmSheet(title, text, action, label, danger = false, extra = '') {
  return `<h2 class="sheet-title">${esc(title)}</h2><p class="sheet-sub">${text}</p><div class="sheet-actions">${extra}<button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="${action}">${esc(label)}</button></div>`;
}

export function installSheet() {
  return `<h2 class="sheet-title">На началния екран</h2><div class="prose"><p><b>iPhone, Safari:</b> докосни „Сподели“ и избери „Добави към началния екран“.</p><p><b>Android, Chrome:</b> отвори менюто ⋮ и избери „Инсталиране на приложението“.</p><p class="fine">Отвори приложението веднъж с интернет, за да се подготви за работа без връзка. Данните остават на това устройство.</p></div>`;
}

export { DIET_COPY, GOAL_COPY, WEEKDAYS };
