// Setup in the order people decide a week of meals: where they shop, how the household eats,
// what the menu should be, what the kitchen can do, what never goes on the table and how many
// sit down. The wooden table on top acts every answer out, so the screen explains itself.
import { STORES, PRODUCTS, EQUIPMENT, ALLERGENS } from './catalog.js';
import { candidates } from './domain.js';
import { AISLE, AISLES } from './products-more.js';
import { nutrition } from './nutrition.js';
import { tableSVG, pictogram, goalFlag } from './table.js';
import { esc, icon, num, foodArt, plural } from './ui.js';
import { wordmark } from './brand.js';
import { storeBadge } from './stores.js';

export const STEPS = ['welcome', 'stores', 'eating', 'menu', 'kitchen', 'exclude', 'household', 'result'];
export const LAST_STEP = STEPS.length - 1;
export const QUESTIONS = LAST_STEP - 1;

export const COPY = {
  welcome: { title: 'Какво ще ядем тази седмица?', sub: '' },
  stores: {
    title: 'Къде пазаруваш?',
    sub: 'Ще разделим списъка за покупки по тези магазини. Може и повече от един.',
  },
  eating: {
    title: 'Как се храните вкъщи?',
    sub: 'Това е правило, не предпочитание: в менюто няма да попадне нищо извън него.',
  },
  menu: {
    title: 'Какво да е менюто?',
    sub: 'Насоката подрежда седмицата. Таванът на калориите маха по-тежките ястия.',
  },
  kitchen: {
    title: 'С какво готвиш?',
    sub: 'Ще предлагаме само ястия за уредите, които имаш.',
  },
  exclude: {
    title: 'Какво не слагаме на масата?',
    sub: 'Алергените махаме от всяка съставка, включително подправките. Продуктите, които не обичате, също.',
  },
  household: {
    title: 'За колко души готвиш?',
    sub: 'Количествата и списъкът за покупки се смятат точно за толкова порции.',
  },
  result: { title: 'Ето какво пасва на масата ти', sub: '' },
};

// Three beats of the welcome story: what you give, what you get, how you shop.
export const STORY = [
  ['Казваш къде пазаруваш', 'Lidl, Kaufland, BILLA, METRO, Фантастико или T MARKET'],
  ['Масата подрежда седмицата', 'Ястия по дни, без повторения, в рамките на бюджета'],
  ['Пазаруваш по един списък', 'Подреден по магазини и щандове, с цели опаковки'],
];

export const DIET_COPY = {
  all: ['Ядем от всичко', 'Месо, риба и всичко останало'],
  pescatarian: ['Риба, без месо', 'Риба и морски дарове'],
  veggie: ['Вегетарианско', 'С яйца и млечни, без месо и риба'],
  vegan: ['Веганско', 'Само растителни продукти'],
  keto: ['Кето', 'До 15 г нетни въглехидрати'],
};
export const NEED_COPY = {
  kids: ['Деца на масата', 'Без люто, с познати вкусове'],
  sensory: ['Сензорно щадящо', 'Предвидими текстури, храните поотделно. При АДХД и аутизъм'],
  lowcarb: ['По-малко въглехидрати', 'До 35 г нетни въглехидрати на порция'],
};
export const GOAL_COPY = {
  balanced: ['Балансирано', 'Разнообразни домашни ястия'],
  protein: ['Повече протеин', 'Поне 25 г на порция'],
  light: ['По-леко', 'До 500 ккал на порция'],
  quick: ['Бързо', 'Готово до 30 минути'],
};
export const TIME_OPTIONS = [20, 30, 45, 60, 0];
export const CALORIE_OPTIONS = [0, 400, 500, 600, 700, 800];
export const DAY_OPTIONS = [3, 5, 7];
const LIST_KEYS = ['stores', 'slots', 'equipment', 'allergens', 'dislikes', 'needs'];
const NUMBER_KEYS = ['days', 'maxTime', 'maxCalories'];
export const BUDGET = { min: 10, max: 300, step: 5 };

/* ---------- state helpers (pure) ---------- */

export function isSelected(d, key, value) {
  if (key === 'clear') return !d[value]?.length;
  if (LIST_KEYS.includes(key)) return (d[key] || []).includes(value);
  return String(d[key]) === String(value);
}

/** Apply one tap to a draft. Returns the new draft; the old one is untouched. */
export function pick(d, key, value) {
  const next = structuredClone(d);
  if (key === 'clear' && ['allergens', 'dislikes', 'needs'].includes(value)) next[value] = [];
  else if (LIST_KEYS.includes(key))
    next[key] = next[key].includes(value) ? next[key].filter((v) => v !== value) : [...next[key], value];
  else if (NUMBER_KEYS.includes(key)) next[key] = Number(value);
  else if (key === 'people') next.people = Math.max(1, Math.min(12, Number(value) || 1));
  else if (key === 'budget') {
    const n = Math.round(Number(value));
    if (Number.isFinite(n) && n >= 1) next.budget = Math.min(10000, n);
  } else next[key] = value;
  return next;
}

export function liveCount(d) {
  if (!d.stores.length) return { count: 0, label: 'Избери поне един магазин', blocked: true };
  if (!d.slots.length) return { count: 0, label: 'Избери поне едно хранене', blocked: true };
  const count = candidates(d).length;
  return {
    count,
    blocked: false,
    label: count ? plural(count, 'рецепта пасва', 'рецепти пасват', true) : 'Нито една рецепта не пасва',
  };
}

/** Five real recipes that pass every hard rule, ordered by what the person asked for. */
export function previewRecipes(d) {
  const ranked = candidates(d).map((r) => ({ r, n: nutrition(r) }));
  ranked.sort((a, b) => {
    if (d.goal === 'protein') return b.n.protein - a.n.protein || a.r.time - b.r.time;
    if (d.goal === 'light') return a.n.kcal - b.n.kcal || a.r.time - b.r.time;
    if (d.goal === 'quick') return a.r.time - b.r.time || a.n.kcal - b.n.kcal;
    return a.r.time - b.r.time || a.r.name.localeCompare(b.r.name, 'bg');
  });
  return ranked.slice(0, 5).map(({ r }) => r);
}

/**
 * When nothing fits, show which single optional choice would open the most recipes.
 * The way of eating and allergens are never offered: we do not suggest eating them.
 */
export function relaxHints(d) {
  const tries = [
    ['maxTime', 0, 'Махни лимита за време', 'kitchen'],
    ['maxCalories', 0, 'Махни тавана на калориите', 'menu'],
    ['goal', 'balanced', 'Избери „Балансирано“', 'menu'],
    ['equipment', Object.keys(EQUIPMENT), 'Добави още уреди', 'kitchen'],
    ['dislikes', [], 'Изчисти нехаресваните продукти', 'exclude'],
    ['stores', [...STORES], 'Добави голям магазин', 'stores'],
  ];
  for (const need of d.needs || [])
    tries.push(['needs', d.needs.filter((n) => n !== need), `Без „${NEED_COPY[need][0]}“`, 'eating']);
  const base = candidates(d).length;
  return tries
    .map(([key, value, label, step]) => ({
      label,
      step,
      gain: candidates({ ...d, [key]: value }).length - base,
    }))
    .filter((h) => h.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
}

const coinsFor = (budget) => Math.max(1, Math.min(8, Math.round((Math.min(budget, 300) / 300) * 8)));

/** What the table shows for a step. Pure: tests read it without a browser. */
export function sceneFor(step, d, beat = 0) {
  const name = STEPS[step] || step;
  const needs = d.needs || [];
  const dish = {
    diet: d.diet,
    divided: needs.includes('sensory'),
    lowcarb: needs.includes('lowcarb') || d.diet === 'keto',
  };
  const empty = !liveCount(d).count;
  const sleepy = { mood: 'sleepy', fx: 'zzz' };
  switch (name) {
    case 'welcome':
      return [
        { mood: 'wink', hat: true, bags: ['Lidl', 'Kaufland', 'BILLA'] },
        { mood: 'happy', hat: true, week: 5 },
        { mood: 'open', hat: true, notepad: true },
      ][((beat % 3) + 3) % 3];
    case 'stores':
      return d.stores.length ? { mood: 'determined', bags: d.stores } : { mood: 'curious' };
    case 'eating':
      return empty ? { ...sleepy, dish } : { mood: 'love', dish, kid: needs.includes('kids') };
    case 'menu':
      return empty
        ? { ...sleepy, dish }
        : {
            mood: 'open',
            dish: {
              ...dish,
              flag: goalFlag(d.goal),
              scale: d.maxCalories ? 0.6 + (d.maxCalories - 400) / 1000 : 1,
            },
          };
    case 'kitchen':
      return empty
        ? { ...sleepy, appliances: d.equipment }
        : { mood: d.equipment.length ? 'happy' : 'curious', appliances: d.equipment, timer: d.maxTime };
    case 'exclude':
      return { mood: empty ? 'sleepy' : 'open', dish, floor: d.allergens, fx: empty ? 'zzz' : '' };
    case 'household':
      return { mood: 'happy', plates: d.people, coins: coinsFor(d.budget) };
    case 'result':
      return empty ? sleepy : { mood: 'happy', cloche: 'open', revealed: dish, fx: 'steam' };
    case 'building':
      return { mood: 'happy', cloth: true, week: Math.min(7, d.days), fx: 'confetti', dance: true };
    default:
      return { mood: 'open' };
  }
}

/* ---------- markup ---------- */

const pressed = (key, value, on) =>
  `data-action="wizard-pick" data-key="${esc(key)}" data-value="${esc(value)}" aria-pressed="${on}"`;
const tick = `<span class="ob-tick" aria-hidden="true">${icon('check', 14)}</span>`;
const section = (label, body, note = '') =>
  `<fieldset class="ob-group"><legend>${esc(label)}${note ? ` <span>${esc(note)}</span>` : ''}</legend>${body}</fieldset>`;

function welcome() {
  return `<div class="ob-story" data-story><ol aria-live="polite">${STORY.map(
    ([title, text], i) =>
      `<li class="${i ? '' : 'is-on'}" data-beat="${i}" ${i ? 'aria-hidden="true"' : ''}><b>${esc(title)}</b><span>${esc(text)}</span></li>`,
  ).join('')}</ol><div class="ob-dots">${STORY.map(
    ([title], i) =>
      `<button type="button" class="${i ? '' : 'is-on'}" data-action="story" data-beat="${i}" aria-label="${esc(title)}"><i></i></button>`,
  ).join('')}</div></div><p class="ob-fineprint">Шест кратки въпроса. Без регистрация: всичко остава на това устройство.</p>`;
}

function stores(d) {
  return `<div class="ob-stores">${STORES.map((s) => {
    const on = d.stores.includes(s);
    return `<button type="button" class="ob-store" ${pressed('stores', s, on)} aria-label="${esc(s)}">${storeBadge(s)}${tick}</button>`;
  }).join('')}</div><p class="ob-note">${icon('info', 16)}<span>Цените в приложението са примерни, не са от магазините.</span></p>`;
}

function eating(d) {
  const needs = d.needs || [];
  const diets = Object.entries(DIET_COPY)
    .map(([v, [name, sub]]) => {
      const on = d.diet === v;
      return `<button type="button" class="ob-option" ${pressed('diet', v, on)}><span class="ob-pict">${pictogram('diet', v)}</span><span class="ob-text"><b>${esc(name)}</b><small>${esc(sub)}</small></span><span class="ob-radio" aria-hidden="true"></span></button>`;
    })
    .join('');
  const toggles = Object.entries(NEED_COPY)
    .map(([v, [name, sub]]) => {
      const on = needs.includes(v);
      return `<button type="button" class="ob-toggle" ${pressed('needs', v, on)}><span class="ob-text"><b>${esc(name)}</b><small>${esc(sub)}</small></span><span class="ob-switch" aria-hidden="true"></span></button>`;
    })
    .join('');
  return `<div class="ob-options" role="group" aria-label="Начин на хранене">${diets}</div>${section('Кой сяда на масата', `<div class="ob-toggles">${toggles}</div>`, 'по желание')}`;
}

function segmented(key, values, d, label, render) {
  return `<div class="ob-seg" role="group" aria-label="${esc(label)}" style="--n:${values.length}">${values
    .map((v) => {
      const on = String(d[key]) === String(v);
      const [big, small] = render(v);
      return `<button type="button" class="ob-seg-item" ${pressed(key, v, on)}><b>${esc(big)}</b><small>${esc(small)}</small></button>`;
    })
    .join('')}</div>`;
}

function menu(d) {
  const goals = Object.entries(GOAL_COPY)
    .map(([v, [name, sub]]) => {
      const on = d.goal === v;
      return `<button type="button" class="ob-tile" ${pressed('goal', v, on)}><span class="ob-pict">${pictogram('goal', v)}</span><b>${esc(name)}</b><small>${esc(sub)}</small>${tick}</button>`;
    })
    .join('');
  const kcal = segmented('maxCalories', CALORIE_OPTIONS, d, 'Таван на калориите', (v) =>
    v ? [String(v), 'ккал'] : ['Без', 'таван'],
  );
  return `<div class="ob-tiles" role="group" aria-label="Насока на менюто">${goals}</div>${section('Таван на калориите за порция', kcal)}`;
}

function kitchen(d) {
  const tiles = ['hob', 'oven', 'microwave', 'airfryer']
    .map((k) => {
      const on = d.equipment.includes(k);
      return `<button type="button" class="ob-tile ob-appliance" ${pressed('equipment', k, on)} aria-label="${esc(EQUIPMENT[k])}"><span class="ob-pict">${pictogram('appliance', k)}</span><b>${esc(EQUIPMENT[k])}</b>${tick}</button>`;
    })
    .join('');
  const time = segmented('maxTime', TIME_OPTIONS, d, 'Време за готвене', (v) =>
    v ? [String(v), 'мин'] : ['Без', 'лимит'],
  );
  return `<div class="ob-tiles ob-tiles-4">${tiles}</div>${section('Колко време имаш за готвене', time)}`;
}

function dislikeSummary(d) {
  if (!d.dislikes.length) return 'Нищо не е избрано';
  const names = d.dislikes.slice(0, 3).map((k) => PRODUCTS[k][0]);
  return names.join(', ') + (d.dislikes.length > 3 ? ` и още ${d.dislikes.length - 3}` : '');
}

function exclude(d) {
  const chips =
    `<button type="button" class="ob-chip ob-chip-none" ${pressed('clear', 'allergens', !d.allergens.length)}>Нямаме алергии</button>` +
    Object.entries(ALLERGENS)
      .map(([v, n]) => {
        const on = d.allergens.includes(v);
        return `<button type="button" class="ob-chip" ${pressed('allergens', v, on)}><span class="ob-chip-pict">${pictogram('allergen', v, { size: 22 })}</span>${esc(n)}</button>`;
      })
      .join('');
  return `${section('Алергии', `<div class="ob-chips">${chips}</div>`)}<button type="button" class="ob-row" data-action="dislikes"><span class="ob-text"><b>Продукти, които не обичате</b><small data-dislikes>${esc(dislikeSummary(d))}</small></span>${icon('chevron', 18)}</button><p class="ob-note">${icon('info', 16)}<span>Проверявай етикетите: съставът на продуктите се променя.</span></p>`;
}

function household(d) {
  const value = Math.min(BUDGET.max, Math.max(BUDGET.min, d.budget));
  const people = `<div class="ob-stepper"><button type="button" class="ob-round" data-action="wizard-pick" data-key="people" data-value="${d.people - 1}" data-delta="-1" aria-label="Един човек по-малко" ${d.people <= 1 ? 'disabled' : ''}>${icon('minus', 20)}</button><output class="ob-count" aria-live="polite"><b data-people>${d.people}</b> <span data-people-word>${d.people === 1 ? 'човек' : 'души'}</span></output><button type="button" class="ob-round" data-action="wizard-pick" data-key="people" data-value="${d.people + 1}" data-delta="1" aria-label="Един човек повече" ${d.people >= 12 ? 'disabled' : ''}>${icon('plus', 20)}</button></div>`;
  const days = segmented('days', DAY_OPTIONS, d, 'Колко дни', (v) => [String(v), 'дни']);
  const slots = ['Обяд', 'Вечеря']
    .map((v) => {
      const on = d.slots.includes(v);
      return `<button type="button" class="ob-chip ob-chip-lg" ${pressed('slots', v, on)}>${icon(v === 'Обяд' ? 'sun' : 'moon', 18)}${esc(v)}</button>`;
    })
    .join('');
  const pct = Math.round(((value - BUDGET.min) / (BUDGET.max - BUDGET.min)) * 100);
  const budget = `<div class="ob-budget"><div class="ob-budget-top"><label for="ob-budget" data-budget-label>За ${d.days} дни</label><span class="ob-budget-value"><input id="ob-budget" name="budget" type="number" inputmode="numeric" min="1" max="10000" step="1" value="${d.budget}" data-input="budget"><span>€</span></span></div><input type="range" min="${BUDGET.min}" max="${BUDGET.max}" step="${BUDGET.step}" value="${value}" data-input="budget-range" aria-label="Бюджет в евро" style="--p:${pct}%"></div>`;
  return `${section('Хора на масата', people)}${section('Колко дни', days)}${section('Кои хранения', `<div class="ob-chips">${slots}</div>`)}${section('Бюджет', budget, 'по примерни цени')}`;
}

/** Short summary chips; each one opens the step that set it. */
export function summaryTags(d) {
  return [
    [1, d.stores.length > 2 ? `${d.stores.slice(0, 2).join(', ')} +${d.stores.length - 2}` : d.stores.join(', ')],
    [2, DIET_COPY[d.diet][0]],
    ...(d.needs || []).map((k) => [2, NEED_COPY[k][0]]),
    [3, d.maxCalories ? `${GOAL_COPY[d.goal][0]} · до ${d.maxCalories} ккал` : GOAL_COPY[d.goal][0]],
    [4, d.maxTime ? `До ${d.maxTime} мин` : 'Без лимит за време'],
    ...(d.allergens.length
      ? [[5, `Без ${d.allergens.map((a) => ALLERGENS[a].toLocaleLowerCase('bg')).join(', ')}`]]
      : []),
    ...(d.dislikes.length
      ? [
          [
            5,
            d.dislikes.length < 3
              ? `Без ${d.dislikes.map((k) => PRODUCTS[k][0].toLocaleLowerCase('bg')).join(', ')}`
              : `Без ${d.dislikes.length} продукта, които не обичате`,
          ],
        ]
      : []),
    [6, `${d.people} ${d.people === 1 ? 'човек' : 'души'} · ${d.days} дни`],
  ];
}

function recipeRow(r, i) {
  const n = nutrition(r);
  return `<button type="button" class="ob-recipe" style="--i:${i}" data-action="wizard-recipe" data-id="${esc(r.id)}">${foodArt(r)}<span class="ob-text"><b>${esc(r.name)}</b><small>${r.time} мин · ${num(n.kcal)} ккал · ${num(n.protein)} г протеин</small></span>${icon('chevron', 18)}</button>`;
}

function result(d) {
  const { count, blocked } = liveCount(d);
  if (!count) {
    const hints = blocked ? [] : relaxHints(d);
    return `<div class="ob-empty"><p>Няма да заобиколим режима или алергиите. ${hints.length ? 'Ето какво би отворило рецепти:' : 'Върни се и промени някой избор.'}</p>${hints
      .map(
        (h) =>
          `<button type="button" class="ob-row" data-action="wizard-step" data-step="${STEPS.indexOf(h.step)}"><span class="ob-text"><b>${esc(h.label)}</b><small>+${h.gain} ${plural(h.gain, 'рецепта', 'рецепти', true)}</small></span>${icon('chevron', 18)}</button>`,
      )
      .join('')}</div>`;
  }
  const tags = summaryTags(d)
    .map(([step, text]) => `<button type="button" class="ob-tag" data-action="wizard-step" data-step="${step}">${esc(text)}</button>`)
    .join('');
  return `<div class="ob-tags" aria-label="Твоят избор">${tags}</div><div class="ob-recipes">${previewRecipes(d)
    .map(recipeRow)
    .join('')}</div>`;
}

const PANELS = { welcome, stores, eating, menu, kitchen, exclude, household, result };

export function stepTitle(d, step) {
  const name = STEPS[step];
  if (name === 'result') {
    const { count } = liveCount(d);
    const shown = Math.min(5, count);
    return count
      ? {
          title: COPY.result.title,
          sub: `${count} ${plural(count, 'рецепта пасва', 'рецепти пасват', true)} на всичко, което избра. ${shown === 1 ? 'Ето я.' : `Ето ${['', '', 'две', 'три', 'четири', 'пет'][shown]} от тях.`}`,
        }
      : { title: 'Нито една рецепта не пасва', sub: '' };
  }
  return COPY[name];
}

export function panelView(d, step, dir = 'forward') {
  const { title, sub } = stepTitle(d, step);
  return `<div class="ob-panel is-${dir === 'back' ? 'back' : 'forward'}" data-panel="${STEPS[step]}"><header class="ob-head"><h1 id="ob-title" tabindex="-1">${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</header>${PANELS[STEPS[step]](d)}</div>`;
}

function footerView(d, step, error) {
  const name = STEPS[step];
  const { count, label } = liveCount(d);
  const live =
    name === 'welcome' || name === 'result'
      ? ''
      : `<p class="ob-live ${count ? '' : 'is-empty'}" data-live aria-live="polite"><b data-live-count>${count}</b> <span data-live-label>${esc(label)}</span></p>`;
  const primary = name === 'welcome' ? 'Да подредим масата' : name === 'result' ? 'Подреди седмицата' : 'Продължи';
  const disabled = name === 'result' && !count;
  return `${live}<p class="ob-error" role="alert">${esc(error)}</p><button class="btn btn-primary btn-block" type="submit" ${disabled ? 'disabled' : ''}>${esc(primary)}</button>`;
}

function secondaryView(step, canClose) {
  const name = STEPS[step];
  if (name === 'welcome')
    return canClose
      ? `<button type="button" class="btn btn-plain btn-block" data-action="wizard-close">Затвори</button>`
      : `<button type="button" class="btn btn-plain btn-block" data-action="wizard-explore">Първо разгледай рецептите</button>`;
  if (name === 'result')
    return `<button type="button" class="btn btn-plain btn-block" data-action="wizard-step" data-step="1">Промени избора</button>`;
  return '';
}

export function progressOf(step) {
  return Math.round((Math.max(0, Math.min(step, QUESTIONS)) / QUESTIONS) * 100);
}

function topView(step, canClose) {
  const name = STEPS[step];
  if (name === 'welcome')
    return `<div class="ob-brand">${wordmark('ob-wordmark')}</div>${canClose ? `<button type="button" class="icon-btn" data-action="wizard-close" aria-label="Затвори">${icon('close', 22)}</button>` : ''}`;
  const value = progressOf(step);
  return `<button type="button" class="icon-btn" data-action="wizard-back" aria-label="Назад">${icon('back', 22)}</button><div class="ob-progress" role="progressbar" aria-label="Напредък" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="Въпрос ${Math.min(step, QUESTIONS)} от ${QUESTIONS}"><span style="width:${value}%"></span></div>${
    name === 'result'
      ? `<span class="ob-step-count">Готово</span>`
      : `<button type="button" class="btn btn-plain btn-small" data-action="wizard-step" data-step="${LAST_STEP}">Пропусни</button>`
  }`;
}

/** The whole setup screen. Later steps swap the panel and footer, never the table. */
export function onboardingView(d, step, { error = '', canClose = false, dir = 'forward' } = {}) {
  return `<div class="ob" data-step="${STEPS[step]}">
<header class="ob-top" data-top>${topView(step, canClose)}</header>
<div class="ob-stage" aria-hidden="true"><div class="ob-stage-brand">${wordmark('ob-stage-wordmark')}</div><div class="ob-stage-in">${tableSVG({ uid: 'ob' })}</div></div>
<main class="ob-main" id="main">
<form class="ob-form" data-form="wizard" novalidate>
<div class="ob-body" data-body>${panelView(d, step, dir)}</div>
<footer class="ob-foot"><div class="ob-foot-in" data-foot>${footerView(d, step, error)}</div><div data-secondary>${secondaryView(step, canClose)}</div></footer>
</form>
</main>
</div>`;
}

/** Swap to another step without touching the table, so its items move instead of resetting. */
export function showStep(root, d, step, { error = '', canClose = false, dir = 'forward' } = {}) {
  const ob = root.querySelector('.ob');
  if (!ob) return false;
  ob.setAttribute('data-step', STEPS[step]);
  root.querySelector('[data-top]').innerHTML = topView(step, canClose);
  root.querySelector('[data-body]').innerHTML = panelView(d, step, dir);
  root.querySelector('[data-foot]').innerHTML = footerView(d, step, error);
  root.querySelector('[data-secondary]').innerHTML = secondaryView(step, canClose);
  return true;
}

export function setError(root, text) {
  const node = root.querySelector('.ob-error');
  if (node) node.textContent = text;
}

/** After a tap: update pressed states, counters and the live count in place. */
export function syncStep(root, d) {
  for (const node of root.querySelectorAll('[data-action="wizard-pick"]')) {
    const { key, value } = node.dataset;
    if (key === 'people') continue;
    const on = isSelected(d, key, value);
    if ((node.getAttribute('aria-pressed') === 'true') !== on) node.setAttribute('aria-pressed', String(on));
  }
  const people = root.querySelector('[data-people]');
  if (people) {
    people.textContent = d.people;
    root.querySelector('[data-people-word]').textContent = d.people === 1 ? 'човек' : 'души';
    root.querySelectorAll('[data-key="people"]').forEach((b) => {
      const delta = Number(b.dataset.delta);
      b.dataset.value = String(d.people + delta);
      b.disabled = delta < 0 ? d.people <= 1 : d.people >= 12;
    });
  }
  const budgetLabel = root.querySelector('[data-budget-label]');
  if (budgetLabel) budgetLabel.textContent = `За ${d.days} дни`;
  const dislikes = root.querySelector('[data-dislikes]');
  if (dislikes) dislikes.textContent = dislikeSummary(d);
  const live = root.querySelector('[data-live]');
  if (live) {
    const { count, label } = liveCount(d);
    tween(live.querySelector('[data-live-count]'), count);
    live.querySelector('[data-live-label]').textContent = label;
    live.classList.toggle('is-empty', !count);
  }
}

function tween(el, to) {
  if (!el) return;
  const from = Number(el.textContent) || 0;
  if (from === to) return;
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof requestAnimationFrame !== 'function' || globalThis.document?.hidden) {
    el.textContent = to;
    return;
  }
  const start = performance.now();
  const frame = (now) => {
    const t = Math.min(1, (now - start) / 300);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setTimeout(() => (el.textContent = to), 360);
}

/* ---------- dislikes sheet ---------- */

export function dislikeGroups(d, query = '') {
  const q = query.trim().toLocaleLowerCase('bg');
  const groups = Object.entries(AISLES)
    .map(([aisle, title]) => {
      const items = Object.entries(PRODUCTS)
        .filter(([k]) => (AISLE[k] || 'dry') === aisle && !['salt', 'oil'].includes(k))
        .filter(([, p]) => !q || p[0].toLocaleLowerCase('bg').includes(q))
        .sort((a, b) => a[1][0].localeCompare(b[1][0], 'bg'));
      if (!items.length) return '';
      return `<section class="sheet-group"><h3>${esc(title)}</h3><div class="ob-chips">${items
        .map(([k, p]) => `<button type="button" class="ob-chip" ${pressed('dislikes', k, d.dislikes.includes(k))}>${esc(p[0])}</button>`)
        .join('')}</div></section>`;
    })
    .join('');
  return groups || '<p class="muted">Няма такъв продукт в каталога.</p>';
}

export function dislikesSheet(d, query = '') {
  return `<h2 class="sheet-title">Продукти, които не обичате</h2><p class="sheet-sub">Ястията с тях няма да влизат в менюто.</p><label class="search">${icon('search', 18)}<input type="search" data-input="dislike-search" value="${esc(query)}" placeholder="Търси продукт" autocomplete="off" aria-label="Търси продукт"></label><div class="sheet-groups" data-dislike-groups>${dislikeGroups(d, query)}</div><div class="sheet-actions"><button type="button" class="btn btn-secondary" data-action="wizard-pick" data-key="clear" data-value="dislikes">Изчисти</button><button type="button" class="btn btn-primary" data-action="close-sheet">Готово</button></div>`;
}

/* ---------- building ---------- */

export const BUILD_STEPS = [
  'Избираме ястия без повторения',
  'Пазим бюджета и разнообразието',
  'Събираме списъка по щандове',
];
export function buildingPanel() {
  return `<div class="ob-panel ob-building" role="status" aria-live="polite"><header class="ob-head"><h1 id="ob-title" tabindex="-1">Подреждаме седмицата</h1></header><ol class="ob-build">${BUILD_STEPS.map(
    (s, i) => `<li style="--i:${i}"><span class="ob-build-dot">${icon('check', 14)}</span>${esc(s)}</li>`,
  ).join('')}</ol></div>`;
}
export function showBuilding(root) {
  const ob = root.querySelector('.ob');
  if (!ob) return false;
  ob.setAttribute('data-step', 'building');
  root.querySelector('[data-top]').innerHTML = '';
  root.querySelector('[data-body]').innerHTML = buildingPanel();
  root.querySelector('[data-foot]').innerHTML = '';
  root.querySelector('[data-secondary]').innerHTML = '';
  return true;
}
