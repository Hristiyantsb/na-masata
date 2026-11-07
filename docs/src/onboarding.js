import { STORES, PRODUCTS, EQUIPMENT, ALLERGENS } from './catalog.js';
import { GOALS, DIETS, candidates } from './domain.js';
import { nutrition } from './nutrition.js';
import { esc, icon, button, num, foodArt } from './ui.js';
import { mascot, wordmark } from './brand.js';

// Short setup, in the order people decide a dinner: where they shop, how they eat,
// what they cook with, what is off the table, and how big a portion may be.
export const STEPS = [
  'Добре дошъл',
  'Магазини',
  'Насоченост',
  'Уреди',
  'Без това',
  'Калории и порции',
  'Твоите рецепти',
];
export const LAST_STEP = STEPS.length - 1;
const QUESTIONS = LAST_STEP - 1;

const titles = [
  'Седмично меню по твоя магазин и вкус',
  'Къде пазаруваш?',
  'Как искаш да се храниш?',
  'С какво готвиш?',
  'Какво не ядеш?',
  'Колко калории на порция?',
  'Рецептите, които ти подхождат',
];

const subtitles = [
  'Казваш къде пазаруваш и какво ядеш. Подреждаме вечерите и един общ списък за покупки.',
  'Ще съберем покупките около тези магазини. Може няколко.',
  'Посока за менюто и режим, който спазваме винаги.',
  'Предлагаме само рецепти, които можеш да сготвиш с тях.',
  'Алергените изключваме напълно, без изключения.',
  'Таван за едно ястие. Под него остават само подходящите рецепти.',
  'Подбрани от каталога според всичко, което избра.',
];

const GOAL_ICONS = { balanced: 'book', protein: 'protein', light: 'leaf', quick: 'clock' };
const TIME_OPTIONS = [
  [0, 'Без лимит'],
  [20, '20 мин'],
  [30, '30 мин'],
  [45, '45 мин'],
  [60, '60 мин'],
];
export const CALORIE_OPTIONS = [
  [0, 'Без лимит'],
  [400, '400'],
  [500, '500'],
  [600, '600'],
  [700, '700'],
  [800, '800'],
];

function pick(key, value, name, sub, selected, glyph, extra = '') {
  return `<button type="button" class="nm-pick ${selected ? 'is-selected' : ''} ${extra}" data-action="wizard-pick" data-key="${esc(key)}" data-value="${esc(value)}" aria-pressed="${selected}">${glyph ? `<span class="nm-pick-icon">${icon(glyph, 20)}</span>` : ''}<span class="nm-pick-copy"><strong>${esc(name)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
}
const chip = (key, value, name, selected, extra = '') =>
  `<button type="button" class="nm-chip ${selected ? 'is-selected' : ''} ${extra}" data-action="wizard-pick" data-key="${esc(key)}" data-value="${esc(value)}" aria-pressed="${selected}">${selected ? icon('check', 16) : ''}${esc(name)}</button>`;
const group = (label, body, note = '') =>
  `<fieldset class="nm-group"><legend>${esc(label)}${note ? `<span>${esc(note)}</span>` : ''}</legend>${body}</fieldset>`;

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

function previewCard(r) {
  const n = nutrition(r);
  return `<button type="button" class="nm-recipe" data-action="wizard-recipe" data-id="${esc(r.id)}" aria-label="Виж рецептата: ${esc(r.name)}">${foodArt(r)}<span class="nm-recipe-info"><strong>${esc(r.name)}</strong><span class="nm-recipe-meta">${r.time} мин · ${num(n.kcal)} ккал · ${num(n.protein)} г протеин</span></span>${icon('arrow', 18)}</button>`;
}

function counter(d) {
  return `<div class="nm-counter"><button type="button" data-action="counter" data-key="people" data-delta="-1" aria-label="Един човек по-малко" ${d.people <= 1 ? 'disabled' : ''}>${icon('minus', 18)}</button><output aria-live="polite"><strong>${d.people}</strong> ${d.people === 1 ? 'човек' : 'души'}</output><button type="button" data-action="counter" data-key="people" data-delta="1" aria-label="Един човек повече" ${d.people >= 12 ? 'disabled' : ''}>${icon('plus', 18)}</button></div>`;
}

function budgetField(d) {
  const value = Math.min(300, Math.max(10, d.budget));
  return `<div class="nm-budget"><label for="budget">Бюджет за ${d.days} дни</label><div class="nm-budget-line"><input id="budget" name="budget" type="number" inputmode="decimal" min="1" max="10000" step="1" value="${d.budget}" required><span>€</span></div><input type="range" min="10" max="300" step="5" value="${value}" data-input="budget-range" aria-label="Бюджет в евро" style="--nm-range:${Math.round(((value - 10) / 290) * 100)}%"></div>`;
}

function welcome() {
  return `<figure class="nm-hero"><img src="assets/lentil-stew.webp" alt="Домашна леща със зеленчуци" width="900" height="1200" decoding="async"><figcaption>${mascot(64, 1, 'nm-hero-mascot')}</figcaption></figure><ul class="nm-promises"><li>${icon('bag', 20)}<span><strong>Твоите магазини</strong>Lidl, Kaufland, BILLA и още</span></li><li>${icon('plan', 20)}<span><strong>Цяла седмица</strong>Вечери според режима и уредите ти</span></li><li>${icon('check', 20)}<span><strong>Един списък</strong>Всички продукти, без повторения</span></li></ul>`;
}

function stepContent(d, step) {
  switch (step) {
    case 0:
      return welcome();
    case 1: {
      const main = STORES.slice(0, 9),
        more = STORES.slice(9);
      const extraSelected = more.filter((v) => d.stores.includes(v)).length;
      return `<div class="nm-store-grid">${main.map((v) => pick('stores', v, v, '', d.stores.includes(v), null, 'nm-store')).join('')}</div><details class="nm-more" ${extraSelected ? 'open' : ''}><summary>Квартални магазини ${icon('plus', 16)}</summary><div class="nm-chips">${more.map((v) => chip('stores', v, v, d.stores.includes(v))).join('')}</div></details><p class="nm-note">Цените са ориентировъчни. Не са взети от сайта на магазина.</p>`;
    }
    case 2:
      return `<div class="nm-grid-2">${Object.entries(GOALS)
        .map(([v, [name, sub]]) =>
          pick('goal', v, name, sub, d.goal === v, GOAL_ICONS[v], 'nm-goal'),
        )
        .join('')}</div>${group(
        'Режим',
        `<div class="nm-chips">${Object.entries(DIETS)
          .map(([v, name]) => chip('diet', v, v === 'all' ? 'Ям от всичко' : name, d.diet === v))
          .join('')}</div>`,
      )}`;
    case 3:
      return `<div class="nm-grid-2">${Object.entries(EQUIPMENT)
        .map(([v, name]) =>
          pick('equipment', v, name, '', d.equipment.includes(v), v, 'nm-appliance'),
        )
        .join(
          '',
        )}</div>${group('Време за готвене', `<div class="nm-chips">${TIME_OPTIONS.map(([v, n]) => chip('maxTime', v, n, d.maxTime === v)).join('')}</div>`)}`;
    case 4: {
      const none = !d.allergens.length;
      return `${group(
        'Алергии',
        `<div class="nm-chips">${chip('clear', 'allergens', 'Нямам', none)}${Object.entries(
          ALLERGENS,
        )
          .map(([v, n]) => chip('allergens', v, n, d.allergens.includes(v)))
          .join('')}</div>`,
      )}<details class="nm-more" ${d.dislikes.length ? 'open' : ''}><summary>Продукти, които не обичаш <span>${d.dislikes.length ? d.dislikes.length + ' избрани' : 'по желание'}</span>${icon('plus', 16)}</summary><div class="nm-chips">${Object.entries(
        PRODUCTS,
      )
        .map(([v, n]) => chip('dislikes', v, n[0], d.dislikes.includes(v)))
        .join(
          '',
        )}</div></details><p class="nm-note">Провери и етикета. Съставът на продуктите се променя.</p>`;
    }
    case 5:
      return `<div class="nm-segments nm-segments-3">${CALORIE_OPTIONS.map(([v, n]) => chip('maxCalories', v, v ? `до ${n} ккал` : n, d.maxCalories === v, 'nm-segment')).join('')}</div>${group('За колко души', counter(d))}${group('Колко дни', `<div class="nm-segments nm-segments-3">${[3, 5, 7].map((v) => chip('days', v, v + ' дни', d.days === v, 'nm-segment')).join('')}</div>`)}${group('Хранения', `<div class="nm-chips">${['Обяд', 'Вечеря'].map((v) => chip('slots', v, v, d.slots.includes(v))).join('')}</div>`)}${group('Бюджет', budgetField(d), 'ориентировъчно')}`;
    case 6: {
      const list = previewRecipes(d),
        count = candidates(d).length;
      const summary = [
        d.stores.slice(0, 2).join(', ') + (d.stores.length > 2 ? ' +' + (d.stores.length - 2) : ''),
        DIETS[d.diet],
        d.maxCalories ? `до ${d.maxCalories} ккал` : 'без калориен лимит',
        d.maxTime ? `до ${d.maxTime} мин` : 'без лимит за време',
      ];
      if (!list.length)
        return `<div class="nm-empty">${mascot(88, -1)}<h2>Няма рецепта за тези условия</h2><p>Не заобикаляме алергии и режим. Разшири времето, уредите или калориите.</p><div class="nm-empty-actions">${button('Промени уредите', 'wizard-step', 'data-index="3"', 'nm-link')}${button('Промени калориите', 'wizard-step', 'data-index="5"', 'nm-link')}</div></div>`;
      return `<p class="nm-summary">${summary.map(esc).join(' · ')}</p><p class="nm-count"><strong>${count}</strong> ${count === 1 ? 'подходяща рецепта' : 'подходящи рецепти'}</p><div class="nm-recipe-list">${list.map(previewCard).join('')}</div>`;
    }
    default:
      return '';
  }
}

const BUILD_STEPS = ['Подбираме рецептите', 'Подреждаме дните', 'Събираме списъка за покупки'];
export function buildingView(name = '') {
  return `<div class="nm-onboarding nm-building" role="status" aria-live="polite"><div class="nm-building-inner">${mascot(120, 0, 'nm-building-mascot')}<h1 class="nm-heading">${esc(name ? name + ', подреждаме седмицата' : 'Подреждаме седмицата')}</h1><ol class="nm-build-list">${BUILD_STEPS.map((s, i) => `<li style="--i:${i}"><span class="nm-build-dot">${icon('check', 14)}</span>${esc(s)}</li>`).join('')}</ol></div></div>`;
}

export function wizardView(d, step, error = '', canCancel = true) {
  const isIntro = step === 0,
    isResult = step === LAST_STEP;
  const progress = Math.round((Math.min(step, QUESTIONS) / QUESTIONS) * 100);
  const submitLabel = isIntro ? 'Започни' : isResult ? 'Подреди седмицата' : 'Продължи';
  const disable = isResult && !previewRecipes(d).length;
  const secondary = isIntro
    ? canCancel
      ? ''
      : button('Разгледай рецептите', 'wizard-explore', '', 'nm-secondary')
    : isResult
      ? button('Промени избора', 'wizard-step', 'data-index="1"', 'nm-secondary')
      : '';
  const top = isIntro
    ? `<div class="nm-top">${wordmark()}${canCancel ? button('Затвори', 'wizard-cancel', '', 'nm-close') : ''}</div>`
    : `<div class="nm-top nm-top-progress"><button type="button" data-action="wizard-back" class="nm-back" aria-label="Назад">${icon('back', 20)}</button><div class="nm-progress" role="progressbar" aria-label="Напредък" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><span class="nm-progress-count">${isResult ? 'Готово' : `${step} от ${QUESTIONS}`}</span></div>`;
  return `<div class="nm-onboarding nm-step-${step}"><aside class="nm-aside" aria-hidden="true"><img src="assets/lentil-stew.webp" alt="" width="900" height="1200" decoding="async"><div class="nm-aside-brand">${wordmark('is-light')}</div></aside><main class="nm-main" id="onboarding-content">${top}<form id="wizard-form" class="nm-form" data-form="wizard" novalidate><div class="nm-fields"><header class="nm-head"><h1 class="nm-heading" id="nm-step-title" tabindex="-1">${esc(titles[step])}</h1><p class="nm-subtitle">${esc(subtitles[step])}</p></header>${stepContent(d, step)}</div><footer class="nm-footer"><p class="nm-error" role="alert">${esc(error)}</p><button class="nm-primary" type="submit" ${disable ? 'disabled' : ''}>${esc(submitLabel)}</button>${secondary}</footer></form></main></div>`;
}
