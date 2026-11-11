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
  isSoup,
  isSalad,
  fitsSlot,
  offered,
  THEMES,
  weekOver,
  progress,
  WIDELY_SOLD,
} from './domain.js';
import { AISLE, AISLES } from './products-more.js';
import { priceSource, chainOffer, hasChainPrices, chainInTown } from './market.js';
import { CONFIG } from './config.js';
import { mascot, wordmark } from './brand.js';
import { storeBadge } from './stores.js';
import { DIET_COPY, GOAL_COPY } from './onboarding.js';
import { esc, icon, money, num, foodArt, dayName, plural, listJoin, inPlace, WEEKDAYS } from './ui.js';

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
<aside class="side"><a class="side-brand" href="#menu" aria-label="На маса, към менюто">${wordmark()}</a><nav class="side-nav" aria-label="Основно меню">${links('side-link')}</nav><a class="side-plus" href="#plans"><span class="side-plus-art">${mascot('hello')}</span><span><b>Плюс</b><small>Демо: всичко е отключено</small></span></a></aside>
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
  const allCooked = state.plan.every((_, i) => state.cooked[i]);
  const nextWeek =
    !keep && !state.locked && weekOver(state)
      ? `<section class="next-week"><div class="next-week-text"><b>${allCooked ? 'Всичко е сготвено' : 'Седмицата мина'}</b><span>Да подредим следващата по същите правила?</span></div><button type="button" class="btn btn-primary" data-action="new-menu">Нова седмица</button></section>`
      : '';
  const made = progress(state);
  const progressLine =
    !keep && (made.cooked > 0 || made.weeks > 1)
      ? `<button type="button" class="progress-line" data-action="progress">${icon('sparkle', 18)}<span>${esc(progressText(made))}</span>${icon('chevron', 16)}</button>`
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
  return `${head('Твоята седмица', meta, options, greeting())}${nextWeek}${summary}${progressLine}${notice}<div class="week">${body}</div>${foot}<p class="fine center">${RECIPES.length} рецепти в каталога. Цените са най-ниските във веригите ${inPlace(priceSource().place)} към ${priceSource().shown}. Калориите са за ядливата част на продуктите.</p>`;
}

/** "3 седмици подред · 14 сготвени ястия · 12,40 € спестени": only what really happened. */
export function progressText(p) {
  return [
    p.streak > 1 ? `${p.streak} седмици подред` : '',
    p.cooked ? plural(p.cooked, 'сготвено ястие', 'сготвени ястия') : '',
    p.saved >= 0.5 ? `${money(p.saved)} спестени` : '',
  ]
    .filter(Boolean)
    .join(' · ');
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

export function newMenuSheet(state, theme = 'usual') {
  const themes = Object.entries(THEMES)
    .map(
      ([key, [name, sub]]) =>
        `<button type="button" class="theme-chip" data-action="theme" data-value="${key}" aria-pressed="${key === theme}"><b>${esc(name)}</b><small>${esc(sub)}</small></button>`,
    )
    .join('');
  return `<h2 class="sheet-title">${weekOver(state) ? 'Нова седмица' : 'Ново меню'}</h2><p class="sheet-sub">Правилата ти остават същите. Старото меню може да се върне.</p><fieldset class="themes"><legend>Тази седмица искам</legend><div class="theme-grid">${themes}</div></fieldset><div class="list">
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
${row('close', 'Не предлагай повече', 'Махаме го от менюто и избираш друго', 'block-recipe', `data-id="${esc(r.id)}" data-index="${i}" ${locked}`)}
</div>`;
}

/** Asked once after a dish is cooked: the answer shapes the next weeks. */
export function feedbackSheet(r) {
  return `<p class="eyebrow">Сготвено</p><h2 class="sheet-title">Как беше „${esc(r.name)}“?</h2><p class="sheet-sub">Питаме веднъж за всяко ястие. Така менюто става все по-твое.</p><div class="list">
${row('heart', 'Харесва ни', 'Ще го предлагаме по-често', 'feedback', `data-id="${esc(r.id)}" data-value="like"`)}
${row('check', 'Става', 'Остава в менюто както досега', 'feedback', `data-id="${esc(r.id)}" data-value="fine"`)}
${row('close', 'Не го предлагай повече', 'Махаме го от бъдещите менюта', 'feedback', `data-id="${esc(r.id)}" data-value="block"`)}
</div>`;
}

export function progressSheet(state) {
  const p = progress(state);
  const weeks = (state.history || [])
    .slice()
    .reverse()
    .map((w) => {
      const [y, m, d] = w.start.split('-');
      return `<li><span>Седмица от ${d}.${m}.${y}</span><b>${w.cooked} от ${w.meals} сготвени · ${money(w.cost)}</b></li>`;
    })
    .join('');
  return `<h2 class="sheet-title">Твоят напредък</h2><p class="sheet-sub">Смятаме само това, което наистина се е случило на това устройство.</p><div class="macros progress-tiles"><div><b>${num(p.weeks)}</b><small>${p.weeks === 1 ? 'седмица с меню' : 'седмици с меню'}</small></div><div><b>${num(p.cooked)}</b><small>${p.cooked === 1 ? 'сготвено ястие' : 'сготвени ястия'}</small></div><div><b>${money(p.saved)}</b><small>спестени от разделяне по вериги</small></div></div>${p.streak > 1 ? `<p class="notice notice-accent">${icon('sparkle', 18)}<span>${p.streak} седмици подред с подредено меню.</span></p>` : ''}${weeks ? `<section class="recipe-sec"><h3>Минали седмици</h3><ul class="ingredients">${weeks}</ul></section>` : '<p class="muted">Тук ще се появяват седмиците, след като минат.</p>'}`;
}

export function blockedSheet(state) {
  const list = (state.blocked || []).map(recipe).filter(Boolean);
  return `<h2 class="sheet-title">Скрити ястия</h2><p class="sheet-sub">Тези ястия не влизат в менюто и не се предлагат при смяна. Върни ги по всяко време.</p>${
    list.length
      ? `<ul class="hidden-list">${list.map((r) => `<li><span>${foodArt(r, 44)}<b>${esc(r.name)}</b></span><button type="button" class="btn btn-secondary btn-small" data-action="unblock-recipe" data-id="${esc(r.id)}">Върни</button></li>`).join('')}</ul>`
      : '<p class="muted">Няма скрити ястия.</p>'
  }`;
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
  const options = offered(state)
    .filter((r) => r.id !== current.id && fitsSlot(r, state.plan[i].slot))
    .sort((a, b) => Number(used.has(a.id)) - Number(used.has(b.id)) || a.name.localeCompare(b.name, 'bg'));
  return `<p class="eyebrow">Вместо „${esc(current.name)}“</p><h2 class="sheet-title">Какво ти се яде?</h2><p class="sheet-sub">${plural(options.length, 'ястие пасва', 'ястия пасват')} на правилата ти. Останалото меню остава.</p><div class="recipe-grid recipe-grid-sheet">${options
    .map((r) => recipeCard(r, state, { swap: i, inMenu: used.has(r.id) }))
    .join('')}</div>`;
}

/* ---------- recipes ---------- */

export function recipeCard(r, state, { swap = null, inMenu = false, have = false } = {}) {
  const n = nutrition(r);
  const at = have ? coverage(r, state) : null;
  const fav = state.favorites.includes(r.id);
  const kindLabel = isBreakfast(r) ? r.type : r.cuisine && CUISINES[r.cuisine];
  const open =
    swap === null
      ? `data-action="recipe" data-id="${esc(r.id)}"`
      : `data-action="choose-swap" data-id="${esc(r.id)}" data-index="${swap}"`;
  return `<article class="rcard"><button type="button" class="rcard-open" ${open}><span class="rcard-art">${foodArt(r, 112)}</span><span class="rcard-text">${kindLabel ? `<span class="rcard-kind">${esc(kindLabel)}${inMenu ? ' · в менюто' : ''}</span>` : ''}<b>${esc(r.name)}</b><span class="rcard-meta">${r.time} мин · ${num(n.kcal)} ккал · ${num(n.protein)} г протеин</span>${at ? `<span class="rcard-have">${at.have === at.of ? 'Имаш всичко' : `Имаш ${at.have} от ${at.of} продукта`}</span>` : ''}</span></button>${
    swap === null
      ? `<button type="button" class="fav ${fav ? 'is-on' : ''}" data-action="favorite" data-id="${esc(r.id)}" aria-pressed="${fav}" aria-label="Любима рецепта: ${esc(r.name)}">${icon('heart', 20, fav)}</button>`
      : ''
  }</article>`;
}

export const RECIPE_FILTERS = [
  ['all', 'Всички'],
  ['fav', 'Любими'],
  ['have', 'С каквото имам'],
  ['breakfast', 'Закуски'],
  ['soup', 'Супи'],
  ['salad', 'Салати'],
  ['quick', 'До 30 мин'],
];
// Salt, oil and spices are in every kitchen: they do not count when we match a dish to the pantry.
const countable = (r) => Object.keys(r.ing).filter((k) => AISLE[k] !== 'spices');
/** How much of a dish is already at home: products in the pantry out of the ones that count. */
export function coverage(r, state) {
  const keys = countable(r);
  const have = keys.filter((k) => (state.pantry[k] || 0) > 0).length;
  return { have, of: keys.length, share: keys.length ? have / keys.length : 0 };
}

export function filterRecipes(state, query = '', filter = 'all') {
  if (filter === 'have')
    return filterRecipes(state, query, 'all')
      .map((r) => ({ r, c: coverage(r, state) }))
      .filter(({ c }) => c.have > 0 && c.share >= 0.5)
      .sort((a, b) => b.c.share - a.c.share || a.c.of - a.c.have - (b.c.of - b.c.have) || a.r.name.localeCompare(b.r.name, 'bg'))
      .map(({ r }) => r);
  const q = query.trim().toLocaleLowerCase('bg');
  // From three letters on the search also looks inside the products: „спанак“ finds every dish with spinach.
  const hasProduct = (r) =>
    q.length >= 3 && Object.keys(r.ing).some((k) => PRODUCTS[k][0].toLocaleLowerCase('bg').includes(q));
  return candidates(state.settings).filter(
    (r) =>
      (!q || r.name.toLocaleLowerCase('bg').includes(q) || hasProduct(r)) &&
      (filter === 'all' ||
        (filter === 'fav' && state.favorites.includes(r.id)) ||
        (filter === 'quick' && r.time <= 30) ||
        (filter === 'breakfast' && isBreakfast(r)) ||
        (filter === 'soup' && isSoup(r)) ||
        (filter === 'salad' && isSalad(r)) ||
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
    filter === 'have' && !query
      ? empty('curious', Object.keys(state.pantry).length ? 'Още малко продукти' : 'Кажи какво имаш вкъщи', Object.keys(state.pantry).length ? 'Няма ястие, за което да имаш поне половината продукти. Отбележи още някой продукт.' : 'Отбележи продуктите в хладилника и шкафа и ще покажем какво става от тях.', `<a class="btn btn-primary" href="#pantry">Какво имам вкъщи</a>`)
      : filter === 'fav' && !query
      ? empty('curious', 'Още нямаш любими', 'Докосни сърцето на рецепта и тя ще се появява тук. Любимите влизат по-често в менюто.')
      : empty('sleepy', 'Няма такава рецепта', 'Опитай с друга дума или махни филтъра.');
  return `${head('Рецепти', `${plural(allowed.length, 'рецепта пасва', 'рецепти пасват')} на правилата ти`)}<label class="search">${icon('search', 18)}<input type="search" data-input="recipe-search" value="${esc(query)}" placeholder="Търси ястие или продукт" aria-label="Търси рецепта" autocomplete="off"></label><div class="chips-scroll" role="group" aria-label="Филтър">${chips}</div>${filter === 'have' && list.length ? `<p class="fine have-note">Подредени по това колко от продуктите вече имаш. Солта, олиото и подправките не се броят. <a href="#pantry">Промени какво имам</a></p>` : ''}<div class="recipe-grid" data-recipe-grid>${list.map((r) => recipeCard(r, state, { have: filter === 'have' })).join('')}</div>${list.length ? '' : emptyState}`;
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
    : `<div class="recipe-actions"><button type="button" class="btn btn-secondary ${fav ? 'is-on' : ''}" data-action="favorite" data-id="${esc(r.id)}" aria-pressed="${fav}">${icon('heart', 18, fav)} ${fav ? 'В любими' : 'Любима'}</button><button type="button" class="btn btn-secondary" data-action="diary-recipe" data-id="${esc(r.id)}">${icon('plus', 18)} В дневника</button><button type="button" class="btn btn-secondary" data-action="share-recipe" data-id="${esc(r.id)}" data-people="${n}">${icon('share', 18)} Изпрати</button>${index !== null ? `<button type="button" class="btn btn-secondary" data-action="swap" data-index="${index}" ${state.locked ? 'disabled' : ''}>${icon('swap', 18)} Смени</button>` : ''}</div>`;
  const hidden = (state.blocked || []).includes(r.id);
  const note = preview
    ? ''
    : `<form class="note" data-form="note" data-id="${esc(r.id)}"><label class="field"><span>Моя бележка</span><textarea name="note" maxlength="4000" rows="3" placeholder="Например: следващия път повече чесън">${esc(state.notes[r.id] || '')}</textarea></label><button class="btn btn-secondary btn-small" type="submit">Запази бележката</button></form><button type="button" class="btn btn-plain btn-small recipe-hide" data-action="${hidden ? 'unblock-recipe' : 'block-recipe'}" data-id="${esc(r.id)}">${hidden ? 'Предлагай го отново в менюто' : 'Не го предлагай в менюто'}</button>`;
  return `<article class="recipe"><div class="recipe-hero">${foodArt(r, 168)}</div>${kind ? `<p class="eyebrow">${esc(kind)}</p>` : ''}<h2 class="sheet-title">${esc(r.name)}</h2><ul class="facts"><li>${icon('clock', 18)}${r.time} мин${r.prepNote ? ' + накисване' : ''}</li><li>${icon('people', 18)}${n} ${n === 1 ? 'порция' : 'порции'}</li><li>${icon('utensils', 18)}${esc(r.equipment.map((k) => EQUIPMENT[k]).join(', ') || 'Без готвене')}</li></ul>${servings}<div class="macros" aria-label="На порция"><div><b>${num(macros.kcal)}</b><small>ккал</small></div><div><b>${num(macros.protein)} г</b><small>протеин</small></div><div><b>${num(macros.carbs)} г</b><small>въглехидрати</small></div><div><b>${num(macros.fat)} г</b><small>мазнини</small></div></div><p class="fine">На порция. Съставките за ${n} ${n === 1 ? 'порция' : 'порции'} са около ${money(recipeCost(r, n, state))} по цените от ${priceSource().shown}.</p>${r.prepNote ? `<p class="notice">${icon('clock', 18)}<span>${esc(r.prepNote)}</span></p>` : ''}${preview ? '' : `<button type="button" class="btn btn-primary btn-block" data-action="cook" data-id="${esc(r.id)}" data-step="0">${icon('play', 18, true)} Готви стъпка по стъпка</button>`}<section class="recipe-sec"><h3>Съставки <span>за ${n} ${n === 1 ? 'порция' : 'порции'}</span></h3><ul class="ingredients">${ingredients}</ul><p class="fine">${allergens.length ? `Алергени: ${esc(allergens.map((k) => ALLERGENS[k]).join(', ').toLocaleLowerCase('bg'))}.` : 'Без отбелязаните алергени.'} Проверявай етикетите.</p></section><section class="recipe-sec"><h3>Приготвяне ${preview ? '' : `<span data-cook-progress>${done.length} от ${r.steps.length}</span>`}</h3><ol class="steps">${steps}</ol></section>${actions}${note}</article>`;
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
  const amounts = Object.entries(r.ing)
    .map(([k, v]) => {
      const q = (v * people) / 2;
      return `<li><span>${esc(PRODUCTS[k][0])}</span><b>${num(q, q < 10 ? 1 : 0)} ${PRODUCTS[k][2]}</b></li>`;
    })
    .join('');
  const ingredients = `<details class="cook-ing"><summary>${icon('utensils', 18)} Съставки за ${people} ${people === 1 ? 'порция' : 'порции'}</summary><ul class="ingredients">${amounts}</ul></details>`;
  return `<div class="cook"><p class="eyebrow">${esc(r.name)}</p><div class="cook-dots" aria-hidden="true">${r.steps.map((_, i) => `<i class="${i < step ? 'is-done' : i === step ? 'is-now' : ''}"></i>`).join('')}</div><p class="cook-count">Стъпка ${step + 1} от ${count}</p><p class="cook-text">${esc(text)}</p>${timerBlock}${ingredients}<div class="cook-nav">${
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

/** In how many of the chain's stores in town the product is on the price list. */
export function soldIn(offer) {
  if (!offer?.of) return '';
  if (offer.stores >= offer.of) return offer.of === 1 ? 'в магазина на веригата' : `във всички ${offer.of} магазина`;
  return `в ${offer.stores} от ${offer.of} магазина`;
}

/** The chain's offer behind a row of the list, unless the person keeps a price of their own. */
const offerOf = (r, state) => (state.prices[r.k] == null ? chainOffer(r.k, r.store) : null);
const onDeal = (r, state) => Boolean(offerOf(r, state)?.was);

function offerTags(r, state) {
  const offer = offerOf(r, state);
  if (!offer) return '';
  const deal = offer.was ? '<span class="tag tag-deal">промоция</span>' : '';
  const few =
    offer.of && offer.stores / offer.of < WIDELY_SOLD
      ? `<span class="tag">${soldIn(offer)}</span>`
      : '';
  return deal + few;
}

function groceryRow(r, state, big = false) {
  const done = !!state.checked[r.k];
  const left =
    leftoverMatters(r.k) && r.left / r.size >= 0.3 ? ` · остават ${num(r.left, 0)} ${r.unit}` : '';
  const detail = big
    ? `${r.packs} × ${num(r.size, 1)} ${r.unit}`
    : `${r.packs} × ${num(r.size, 1)} ${r.unit} · за менюто ${num(r.need, 1)} ${r.unit}${left}`;
  return `<li class="grow ${done ? 'is-done' : ''}"><label class="gcheck"><input type="checkbox" data-change="purchased" data-id="${r.k}" ${done ? 'checked' : ''}><span class="gbox" aria-hidden="true">${icon('check', 16)}</span><span class="gtext"><b>${esc(r.name)}${offerTags(r, state)}</b><small>${detail}</small></span></label>${big ? '' : `<button type="button" class="gprice" data-action="grocery-edit" data-id="${r.k}" aria-label="Цена и магазин: ${esc(r.name)}">${money(r.cost)}</button>`}</li>`;
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
    source = priceSource(),
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
    ? `<section class="cart-card" role="group" aria-label="Напредък"><div class="cart-top"><b>${done} от ${toBuy.length}</b><span>в количката</span><strong>${money(summary.knownTotal)}</strong></div><span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="В количката"><i style="width:${pct}%"></i></span><p class="fine">За цели опаковки по цените ${inPlace(source.place)} от ${source.shown}${summary.unknownPrices ? `, плюс ${plural(summary.unknownPrices, 'продукт', 'продукта')} без цена` : ''}.</p></section>`
    : '';
  // What the split and today's promotions do for this list, in one calm line.
  const deals = toBuy.filter((r) => onDeal(r, state)).length;
  const gains = [
    summary.saving >= 0.2
      ? `По-евтино с <b>${money(summary.saving)}</b>, отколкото ако купиш всичко само от ${esc(summary.savingAgainst)}: всеки продукт е от веригата, в която струва най-малко.`
      : '',
    deals ? `${plural(deals, 'продукт е', 'продукта са')} в промоция днес.` : '',
  ].filter(Boolean);
  const saving = gains.length
    ? `<p class="saving">${icon('check', 16)}<span>${gains.join(' ')}</span></p>`
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
  return `${head('Покупки', esc(listJoin(state.settings.stores)), action)}${progress}${saving}<a class="row-link" href="#pantry"><span class="list-ic">${icon('fridge', 20)}</span><span class="list-text"><b>Какво имаш вкъщи?</b><small>Приспадаме го от списъка</small></span>${icon('chevron', 18)}</a>${storeSections(state, toBuy)}${haveBlock}${extras}<div class="actions-row"><button type="button" class="btn btn-secondary btn-small" data-action="share-shopping">${icon('share', 18)} Изпрати</button><button type="button" class="btn btn-secondary btn-small" data-action="copy-shopping">${icon('copy', 18)} Копирай</button><button type="button" class="btn btn-secondary btn-small" data-action="export-shopping">${icon('download', 18)} Изтегли</button>${done || state.extras.some((e) => e.checked) ? `<button type="button" class="btn btn-plain btn-small" data-action="uncheck-all">Изчисти отметките</button>` : ''}</div><p class="fine">Цените са най-ниските за продукта във веригата, от която го купуваш: по данните, които веригите подават всеки ден към ${source.name} (${esc(source.place)}, ${source.shown}). Не са оферти и не показват дали продуктът е на рафта в момента. За продуктите извън кошницата на портала цената е ориентировъчна, от онлайн магазин. Смени цена или опаковка с докосване върху сумата.</p>`;
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
  const source = priceSource();
  // One line per chosen chain: what the product costs there today, which product that is on
  // the chain's list and in how many of its stores in town it is sold.
  const offerText = (s) => {
    const offer = chainOffer(k, s);
    if (!offer)
      return `<small>${chainInTown(s) ? 'няма цена в данните за днес' : `няма магазин ${esc(inPlace(source.place))}`}</small>`;
    const sold = soldIn(offer);
    return `${offer.name ? `<small class="choice-name">${esc(offer.name)}</small>` : ''}${sold ? `<small>${sold}</small>` : ''}`;
  };
  const offerPrice = (s) => {
    const offer = chainOffer(k, s);
    if (!offer) return '';
    return `<span class="choice-price"><b>${money(offer.price)}</b>${offer.was ? `<small>промоция, иначе ${money(offer.was)}</small>` : ''}</span>`;
  };
  const chains =
    stores.length > 1
      ? `<fieldset class="field"><legend>Купувам го от</legend><div class="choice-list">${stores.map((s) => `<label class="choice"><input type="radio" name="store" value="${esc(s)}" ${s === current ? 'checked' : ''}>${storeBadge(s)}<span class="choice-text"><b>${esc(s)}</b>${offerText(s)}</span>${offerPrice(s)}</label>`).join('')}</div></fieldset>`
      : chainOffer(k, current)
        ? `<div class="choice-list"><div class="choice">${storeBadge(current)}<span class="choice-text"><b>${esc(current)}</b>${offerText(current)}</span>${offerPrice(current)}</div></div>`
        : '';
  const note = hasChainPrices(k)
    ? `До всяка верига е цената на най-евтиния подходящ продукт в типичния ѝ магазин ${esc(inPlace(source.place))}, преизчислена за нашата опаковка, по ${source.name} от ${source.shown}.${source.live ? ' Броят магазини показва в колко от обектите на веригата продуктът е в ценоразписа, а не дали е на рафта в момента.' : ''}`
    : `За този продукт порталът няма данни: цената е ориентировъчна, от онлайн магазин.`;
  return `<p class="eyebrow">Продукт</p><h2 class="sheet-title">${esc(p[0])}</h2><form data-form="grocery" data-id="${k}">${chains}<div class="form-grid"><label class="field"><span>Цена на опаковка, €</span><input name="price" type="number" inputmode="decimal" min="0" max="10000" step="0.01" value="${packPrice(k, state)}" required></label><label class="field"><span>Опаковка, ${p[2]}</span><input name="size" type="number" inputmode="decimal" min="0.1" max="100000" step="0.1" value="${packSize(k, state)}" required></label></div><p class="fine">${note} Ако запишеш своя цена, тя важи за всички магазини.</p><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запази</button></form>`;
}

/** The rows of the town picker: the towns whose name or region contains the query. */
export function cityRows(places, current, query = '') {
  const q = query.trim().toLocaleLowerCase('bg');
  const count = new Map();
  for (const p of places) count.set(p.name, (count.get(p.name) || 0) + 1);
  const rows = places
    .filter((p) => !q || p.name.toLocaleLowerCase('bg').includes(q) || p.region.toLocaleLowerCase('bg').includes(q))
    // The chosen town leads the list, so it is seen without scrolling; the rest stay by name.
    .sort((a, b) => (b.code === current) - (a.code === current))
    .map((p) => {
      // Two places can share a name (Добрич, Габрово): the municipality tells them apart.
      const where = count.get(p.name) > 1 ? `община ${p.municipality}, област ${p.region}` : `област ${p.region}`;
      const on = p.code === current;
      return `<button type="button" class="city-row ${on ? 'is-on' : ''}" data-action="choose-city" data-code="${p.code}" aria-pressed="${on}"><span class="city-text"><b>${esc(p.name)}</b><small>${esc(where)}</small><small class="city-chains">${esc(Object.keys(p.stores).join(' · '))}</small></span>${on ? icon('check', 18) : ''}</button>`;
    })
    .join('');
  return (
    rows ||
    '<p class="muted">Няма такова място в данните. В списъка са населените места с магазин на поне една от шестте вериги.</p>'
  );
}

/**
 * The town picker in „Още“ and in the setup. `places` is null while the list is on its way;
 * `offline` says that it cannot come now.
 */
export function citySheet(places, current, query = '', offline = false) {
  const body = places
    ? `<label class="search">${icon('search', 18)}<input type="search" data-input="city-search" value="${esc(query)}" placeholder="Търси град или село" aria-label="Търси населено място" autocomplete="off" enterkeyhint="search"></label><div class="city-list" data-city-list>${cityRows(places, current, query)}</div>`
    : `<p class="muted" role="status">${offline ? `Списъкът с населени места се зарежда при връзка с интернет. Дотогава цените остават за ${esc(priceSource().place)}.` : 'Зареждаме списъка с населени места…'}</p>`;
  return `<div data-city-sheet><p class="eyebrow">Цени и магазини</p><h2 class="sheet-title">Къде пазаруваш?</h2><p class="sheet-sub">Показваме цените на веригите в твоето населено място и в колко от магазините им се продава всеки продукт.</p>${body}</div>`;
}

export function extraForm(state, entry = null) {
  const e = entry || { name: '', amount: 1, unit: 'бр.', price: null, store: state.settings.stores[0] };
  return `<h2 class="sheet-title">${entry ? 'Промени продукта' : 'Добави към покупките'}</h2><form data-form="extra" ${entry ? `data-id="${esc(entry.id)}"` : ''}><label class="field"><span>Продукт</span><input name="name" value="${esc(e.name)}" maxlength="100" required autocomplete="off" placeholder="Например кафе"></label><div class="form-grid"><label class="field"><span>Количество</span><input name="amount" type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" value="${e.amount}" required></label><label class="field"><span>Мярка</span><select name="unit">${SHOPPING_UNITS.map((u) => `<option ${u === e.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label><label class="field"><span>Обща цена, €</span><input name="price" type="number" inputmode="decimal" min="0" max="100000" step="0.01" value="${e.price ?? ''}" placeholder="по желание"></label><label class="field"><span>Магазин</span><select name="store">${state.settings.stores.map((s) => `<option ${s === e.store ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label></div><p class="form-error" role="alert"></p><div class="sheet-actions">${entry ? `<button type="button" class="btn btn-danger" data-action="extra-delete" data-id="${esc(entry.id)}">${icon('trash', 18)} Махни</button>` : ''}<button class="btn btn-primary" type="submit">Запази</button></div></form>`;
}

export function pantryView(state) {
  const rows = groceries(state);
  const used = new Set(rows.map((r) => r.k));
  const need = Object.fromEntries(rows.map((r) => [r.k, r.need]));
  const input = (k) => {
    const p = PRODUCTS[k];
    const enough = Math.max(Math.ceil(need[k] || 0), p[2] === 'бр.' ? 1 : p[1]);
    const on = (state.pantry[k] || 0) > 0;
    return `<div class="prow"><label for="pantry-${k}">${esc(p[0])}</label><span class="prow-in"><button type="button" class="pill pill-sm ${on ? 'is-on' : ''}" data-action="pantry-have" data-id="${k}" data-amount="${enough}" aria-pressed="${on}">${icon('check', 16)} Имам</button><input id="pantry-${k}" name="${k}" type="number" inputmode="decimal" min="0" max="100000" step="${p[2] === 'бр.' ? 1 : 0.1}" value="${state.pantry[k] || ''}" placeholder="0"><small>${p[2]}</small></span></div>`;
  };
  const inMenu = [...used].sort((a, b) => aisleIndex(a) - aisleIndex(b));
  const rest = Object.keys(PRODUCTS)
    .filter((k) => !used.has(k))
    .sort((a, b) => aisleIndex(a) - aisleIndex(b) || PRODUCTS[a][0].localeCompare(PRODUCTS[b][0], 'bg'));
  return `${head('Какво имаш вкъщи?', 'Докосни „Имам“ или впиши количество. Приспадаме го от списъка, а в „Рецепти“ показваме какво става от него.', '', '', backLink('#shopping', 'Покупки'))}<form data-form="pantry" class="pantry">${inMenu.length ? `<section class="pgroup"><h2>За менюто тази седмица</h2>${inMenu.map(input).join('')}</section>` : ''}<details class="pgroup" ${inMenu.length ? '' : 'open'}><summary><h2>Всички продукти</h2></summary>${rest.map(input).join('')}</details><div class="sticky-actions"><button class="btn btn-primary btn-block" type="submit">Запази и обнови списъка</button></div></form>`;
}

/* ---------- more ---------- */

export function moreView(state, pwa = {}) {
  const readiness = pwa.ready
    ? 'Готово за работа без интернет на това устройство.'
    : pwa.error
      ? 'Не успяхме да подготвим работа без интернет. Приложението работи онлайн.'
      : 'Подготвя се за работа без интернет при първото зареждане.';
  return `${head('Още')}<a class="plus-card" href="#plans"><span class="plus-art">${mascot('hello')}</span><span class="plus-text"><b>Плюс · демо</b><small>Дневник, баркод, макроси, тегло и вода. Всичко е отключено, плащанията още не са включени.</small></span>${icon('chevron', 18)}</a>
<section class="list-group"><h2>Седмицата</h2><div class="list">${row('sliders', 'Предпочитания', 'Магазини, режим, уреди, порции', 'wizard')}${row('pin', 'Населено място', `${priceSource().place} · цени от ${priceSource().shown}`, 'city')}${row('bell', 'Напомняне в календара', 'Всяка седмица да подредиш менюто', 'reminder')}${state.plan.length ? row('download', 'Изтегли менюто', 'Текстов файл с ястията и покупките', 'export-plan') : ''}${progress(state).weeks ? row('sparkle', 'Твоят напредък', progressText(progress(state)) || 'Седмици, сготвени ястия и спестено', 'progress') : ''}${(state.blocked || []).length ? row('close', 'Скрити ястия', `${plural(state.blocked.length, 'ястие не се предлага', 'ястия не се предлагат')} в менюто`, 'blocked-list') : ''}</div></section>
<section class="list-group"><h2>Данни на това устройство</h2><div class="list">${row('download', 'Изтегли резервно копие', 'Меню, покупки, дневник и настройки', 'backup')}<label class="list-row"><span class="list-ic">${icon('upload', 20)}</span><span class="list-text"><b>Възстанови от копие</b><small>Файл .json от „На маса“</small></span>${icon('chevron', 18)}<input type="file" accept="application/json,.json" data-change="restore" class="sr-only"></label>${row('trash', 'Изтрий всички данни', 'Започваш отначало на това устройство', 'reset', '', true)}</div></section>
<section class="list-group"><h2>Приложението</h2><div class="list">${row('phone', 'Добави на началния екран', 'Отваря се като приложение', 'install-app')}${row('refresh', 'Провери за нова версия', '', 'check-update')}</div><p class="list-note" id="offline-readiness" role="status">${readiness}</p></section>
<section class="list-group"><h2>За „На маса“</h2><div class="list"><a class="list-row" href="#privacy"><span class="list-ic">${icon('shield', 20)}</span><span class="list-text"><b>Поверителност</b><small>Какво пазим и къде</small></span>${icon('chevron', 18)}</a><a class="list-row" href="https://github.com/Hristiyantsb/na-masata" target="_blank" rel="noopener"><span class="list-ic">${icon('external', 20)}</span><span class="list-text"><b>Изходен код</b><small>GitHub</small></span>${icon('chevron', 18)}</a></div><p class="list-note">Версия ${CONFIG.version} · ${RECIPES.length} рецепти · ${Object.keys(PRODUCTS).length} продукта</p></section>`;
}

export function plansView(interval = 'monthly') {
  const yearly = interval === 'yearly';
  const list = (items) =>
    `<ul class="plan-list">${items.map((t) => `<li>${icon('check', 18)}<span>${esc(t)}</span></li>`).join('')}</ul>`;
  const plus = PLANS.plus;
  // What a year costs less than twelve single months, worked out from the two prices.
  const saved = Math.round((1 - plus.yearly / (plus.monthly * 12)) * 100);
  const free = `<article class="plan-card"><h2>${esc(PLANS.free.name)}</h2><p class="plan-price"><b>0 €</b><span>завинаги</span></p><p class="fine">Без карта и без регистрация</p>${list([
    'Седмично меню по твоите правила',
    'Списък по магазини с цените за деня в твоя град',
    'Готвене стъпка по стъпка с таймер',
    `Всички ${RECIPES.length} рецепти`,
  ])}</article>`;
  const paid = `<article class="plan-card is-plus"><h2>${esc(plus.name)}</h2><p class="plan-price"><b>${money(yearly ? plus.yearly : plus.monthly)}</b><span>/ ${yearly ? 'година' : 'месец'}</span></p><p class="fine">${yearly ? `${money(plus.yearly / 12)} на месец, платени наведнъж. С ${saved}% по-малко от дванайсет отделни месеца.` : 'Плащане всеки месец'}</p>${list([
    'Всичко от безплатното',
    'Хранителен дневник с калории и макроси',
    'Баркод от етикета',
    'Цел за калории, тегло и вода',
  ])}</article>`;
  return `${head('Планове', 'Плащанията още не са включени. Докато сме в демо, всичко е отключено и нищо не се таксува.', '', '', backLink('#more', 'Още'))}<div class="seg seg-2" role="group" aria-label="Период"><button type="button" class="seg-item" data-action="billing" data-value="monthly" aria-pressed="${!yearly}">Месечно</button><button type="button" class="seg-item" data-action="billing" data-value="yearly" aria-pressed="${yearly}">Годишно</button></div><div class="plan-cards">${free}${paid}</div><p class="fine">Менюто, покупките и рецептите остават безплатни. Цената на „${esc(plus.name)}“ е за бъдещото пускане: преди плащане ще видиш точната сума, периода и условията.</p>`;
}

export function privacyView() {
  return `${head('Поверителност', 'Как работи „На маса“ на това устройство.', '', '', backLink('#more', 'Още'))}<div class="prose"><h2>Всичко остава тук</h2><p>Менюто, покупките, дневникът и настройките се пазят само в този браузър. Нямаш акаунт. Към интернет излизат само две неща. Приложението изтегля от собствения си адрес файла с днешните цени за избраното населено място: в заявката няма нищо за теб, само кой файл е поискан. И когато сканираш баркод или търсиш храна онлайн в дневника, изпращаме цифрите на баркода или думите за търсене до Open Food Facts (openfoodfacts.org), за да намерим продукта. Нищо друго.</p><h2>Камерата</h2><p>Баркодът се разчита на самото устройство. Кадрите не се записват и не се изпращат никъде; изпращат се само цифрите, за да намерим продукта.</p><h2>Open Food Facts</h2><p>Продуктите по баркод и при търсене онлайн идват от Open Food Facts, открита база с лиценз ODbL. Данните са въведени от хора и може да се различават от етикета.</p><h2>Резервно копие</h2><p>Изтегли копие от „Още“, ако чистиш браузъра или сменяш телефона. Файлът е твой и стои там, където го запазиш.</p><h2>Изтриване</h2><p>„Още“ → „Изтрий всички данни“ маха всичко от това устройство. Действието не може да се върне.</p><h2>Цени и хранителни стойности</h2><p>Цените идват от отворените данни на ${priceSource().name}: веригите са длъжни по закон да подават там цените си всеки ден, за всеки свой магазин. Всяка сутрин взимаме новите данни и за всяка верига показваме цената на най-евтиния подходящ продукт в типичния ѝ магазин в твоето населено място, преизчислена за нашата опаковка. Сега виждаш цените ${esc(inPlace(priceSource().place))} от ${priceSource().shown}. „В 41 от 43 магазина“ значи, че продуктът е в ценоразписа на толкова обекта на веригата, а не че е на рафта в момента. За продуктите извън кошницата на портала цената е ориентировъчна, от онлайн магазин. Цените не са оферти. Хранителните стойности са по стандартни таблици и важат за ядливата част на продукта. Проверявай етикетите за алергени.</p></div>`;
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
