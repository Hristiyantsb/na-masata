import { STORES, PRODUCTS, EQUIPMENT, ALLERGENS } from './catalog.js';
import { GOALS, DIETS, candidates } from './domain.js';
import { nutrition } from './nutrition.js';
import { esc, icon, button, num, foodArt } from './ui.js';
import { mascot, wordmark } from './brand.js';
import { storeBadge } from './stores.js';

// Short setup in the order people decide a dinner: where they shop, how they eat,
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
export const STEP_POSES = ['chef', 'hero', 'love', 'curious', 'calm', 'juggle', 'serve'];

const titles = [
  'Вечерите за седмицата, решени',
  'Къде пазаруваш?',
  'Как искаш да се храниш?',
  'Какво има в кухнята ти?',
  'Какво не ядеш?',
  'Колко калории на порция?',
  'Ето какво ще готвиш',
];
const subtitles = [
  'Кажи ни къде пазаруваш и какво обичаш. Ние подреждаме менюто и списъка за покупки.',
  'Списъкът за покупки ще е според тези магазини.',
  'Посока за менюто и режим, който спазваме винаги.',
  'Докосни уредите, които имаш.',
  'Алергените изключваме напълно.',
  'Таван за едно ястие. Под него остават само подходящите рецепти.',
  'Подбрани според всичко, което избра.',
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
const PLATE_SCALE = { 0: 1, 400: 0.58, 500: 0.68, 600: 0.78, 700: 0.88, 800: 0.95 };
const LIST_KEYS = ['stores', 'slots', 'equipment', 'allergens', 'dislikes'];

const attrs = (key, value, selected) =>
  `data-action="wizard-pick" data-key="${esc(key)}" data-value="${esc(value)}" aria-pressed="${selected}"`;
const check = `<span class="nm-check" aria-hidden="true">${icon('check', 14)}</span>`;
const chip = (key, value, name, selected, extra = '') =>
  `<button type="button" class="nm-chip ${selected ? 'is-selected' : ''} ${extra}" ${attrs(key, value, selected)}>${esc(name)}</button>`;
const group = (label, body, note = '') =>
  `<fieldset class="nm-group"><legend>${esc(label)}${note ? `<span>${esc(note)}</span>` : ''}</legend>${body}</fieldset>`;

export function isSelected(d, key, value) {
  if (key === 'clear') return !d[value]?.length;
  if (LIST_KEYS.includes(key)) return d[key].includes(value);
  return String(d[key]) === String(value);
}

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

function previewCard(r, i) {
  const n = nutrition(r);
  return `<button type="button" class="nm-recipe" style="--i:${i}" data-action="wizard-recipe" data-id="${esc(r.id)}" aria-label="Виж рецептата: ${esc(r.name)}">${foodArt(r)}<span class="nm-recipe-info"><strong>${esc(r.name)}</strong><span class="nm-recipe-meta">${r.time} мин · ${num(n.kcal)} ккал · ${num(n.protein)} г протеин</span></span>${icon('arrow', 18)}</button>`;
}

/* ---------- step parts ---------- */

function welcome() {
  return `<div class="nm-welcome"><button type="button" class="nm-hero-mascot" data-action="mascot-poke" aria-label="Здравей от масата">${mascot('chef', 260, 'nm-float')}<span class="nm-hero-shadow"></span></button><ul class="nm-promises"><li>${icon('bag', 20)}<span><strong>Твоите магазини</strong>Lidl, Kaufland, BILLA и още 10</span></li><li>${icon('plan', 20)}<span><strong>Цяла седмица наведнъж</strong>Според режима, уредите и времето ти</span></li><li>${icon('check', 20)}<span><strong>Един списък за покупки</strong>Всичко събрано, без повторения</span></li></ul></div>`;
}

function stores(d) {
  return `<div class="nm-store-grid">${STORES.map((v) => {
    const on = d.stores.includes(v);
    return `<button type="button" class="nm-store ${on ? 'is-selected' : ''}" ${attrs('stores', v, on)} aria-label="${esc(v)}">${storeBadge(v)}${check}</button>`;
  }).join(
    '',
  )}</div><p class="nm-note">Цените в приложението са ориентировъчни, не са от магазина.</p>`;
}

function direction(d) {
  return `<div class="nm-goal-grid">${Object.entries(GOALS)
    .map(([v, [name, sub]]) => {
      const on = d.goal === v;
      return `<button type="button" class="nm-goal ${on ? 'is-selected' : ''}" ${attrs('goal', v, on)}><span class="nm-goal-icon">${icon(GOAL_ICONS[v], 22)}</span><strong>${esc(name)}</strong><small>${esc(sub)}</small>${check}</button>`;
    })
    .join('')}</div>${group(
    'Режим',
    `<div class="nm-segmented" role="group" aria-label="Режим">${Object.entries(DIETS)
      .map(([v, name]) =>
        chip(
          'diet',
          v,
          v === 'all' ? 'Всичко' : v === 'pescatarian' ? 'Риба' : name,
          d.diet === v,
          'nm-seg',
        ),
      )
      .join('')}</div>`,
  )}`;
}

// Appliance line drawings. `.body` is the shape that fills when the appliance is chosen.
const APPLIANCES = {
  microwave: {
    box: [4, 37, 30, 22],
    vb: '0 0 108 55',
    art: '<rect class="body" x="2" y="2" width="104" height="51" rx="7"/><rect x="10" y="9" width="62" height="37" rx="4"/><circle cx="88" cy="16" r="3"/><circle cx="88" cy="27" r="3"/><path d="M82 40h12"/>',
  },
  hob: {
    box: [37, 49.6, 26, 9.6],
    vb: '0 0 94 24',
    art: '<rect class="body" x="2" y="7" width="90" height="15" rx="4"/><ellipse cx="26" cy="14.5" rx="14" ry="4"/><ellipse cx="68" cy="14.5" rx="14" ry="4"/>',
  },
  oven: {
    box: [37, 63, 26, 34],
    vb: '0 0 94 85',
    art: '<rect class="body" x="3" y="3" width="88" height="79" rx="6"/><path d="M3 18h88M24 24h46"/><circle cx="19" cy="10.5" r="2.6"/><circle cx="31" cy="10.5" r="2.6"/><circle cx="63" cy="10.5" r="2.6"/><circle cx="75" cy="10.5" r="2.6"/><rect x="14" y="31" width="66" height="40" rx="4"/>',
  },
  airfryer: {
    box: [71, 33, 20, 26],
    vb: '0 0 72 65',
    art: '<rect class="body" x="12" y="3" width="48" height="59" rx="15"/><rect x="27" y="11" width="18" height="8" rx="2"/><path d="M12 37h48"/><rect x="29" y="42" width="14" height="6" rx="3"/>',
  },
};

function kitchen(d) {
  const room = `<svg class="nm-room" viewBox="0 0 360 250" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="10" y="12" width="112" height="54" rx="6"/><path d="M66 12v54M58 44v10M74 44v10"/><rect x="238" y="12" width="112" height="54" rx="6"/><path d="M294 12v54M286 44v10M302 44v10"/><path d="M152 12h56v24l14 22h-84l14-22z"/><path d="M0 104h360" opacity=".35" stroke-dasharray="2 6"/><rect x="8" y="160" width="124" height="84" rx="5"/><path d="M70 160v84M60 172v12M80 172v12"/><rect x="228" y="160" width="124" height="84" rx="5"/><path d="M290 160v84M280 172v12M300 172v12"/></g><rect x="0" y="148" width="360" height="10" rx="2" fill="#ecc08c"/><rect x="0" y="155" width="360" height="3" fill="#d99c5b"/><g transform="translate(346 112)"><rect x="-9" y="22" width="18" height="14" rx="3" fill="#e9a868"/><path d="M0 22c-2-10-10-12-12-18 6 0 10 6 12 12 1-8 6-14 12-14-2 8-8 12-12 20z" fill="#5b9a46"/></g></svg>`;
  const appliances = Object.entries(APPLIANCES)
    .map(([key, a]) => {
      const on = d.equipment.includes(key);
      const [l, t, w, h] = a.box;
      return `<button type="button" class="nm-appl nm-appl-${key} ${on ? 'is-selected' : ''}" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%" ${attrs('equipment', key, on)} aria-label="${esc(EQUIPMENT[key])}"><svg viewBox="${a.vb}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke">${a.art}</g></svg>${check}</button>`;
    })
    .join('');
  const legend = Object.keys(APPLIANCES)
    .map((k) => chip('equipment', k, EQUIPMENT[k], d.equipment.includes(k), 'nm-legend-chip'))
    .join('');
  return `<div class="nm-kitchen">${room}${appliances}</div><div class="nm-chips nm-legend">${legend}</div>${group('Време за готвене', `<div class="nm-chips">${TIME_OPTIONS.map(([v, n]) => chip('maxTime', v, n, d.maxTime === v)).join('')}</div>`)}`;
}

function exclusions(d) {
  return `${group(
    'Алергии',
    `<div class="nm-chips">${chip('clear', 'allergens', 'Нямам', !d.allergens.length, 'nm-none')}${Object.entries(
      ALLERGENS,
    )
      .map(([v, n]) => chip('allergens', v, n, d.allergens.includes(v)))
      .join('')}</div>`,
  )}<details class="nm-more" ${d.dislikes.length ? 'open' : ''}><summary>Продукти, които не обичаш <span data-dislike-count>${d.dislikes.length ? d.dislikes.length + ' избрани' : 'по желание'}</span>${icon('plus', 16)}</summary><div class="nm-chips">${Object.entries(
    PRODUCTS,
  )
    .map(([v, n]) => chip('dislikes', v, n[0], d.dislikes.includes(v)))
    .join(
      '',
    )}</div></details><p class="nm-note">Провери и етикета. Съставът на продуктите се променя.</p>`;
}

const plateDots = (n) => Array.from({ length: n }, () => '<i class="nm-seat"></i>').join('');

function portions(d) {
  const scale = PLATE_SCALE[d.maxCalories] ?? 1;
  const meter = `<div class="nm-kcal"><svg class="nm-kcal-plate" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="63" r="54" fill="#1f2420" opacity=".06"/><circle cx="60" cy="60" r="54" fill="#fff" stroke="#1f2420" stroke-opacity=".08"/><circle cx="60" cy="60" r="44" fill="none" stroke="#1f2420" stroke-opacity=".06"/><g class="nm-kcal-food" style="--s:${scale}"><circle cx="60" cy="60" r="40" fill="#e9a868"/><circle cx="48" cy="52" r="9" fill="#d9472b"/><circle cx="70" cy="66" r="8" fill="#7fa64a"/><circle cx="66" cy="46" r="6" fill="#f5c542"/><circle cx="50" cy="72" r="6" fill="#3f7a35"/><ellipse cx="74" cy="54" rx="5" ry="3" fill="#fbfaf3"/></g></svg><div class="nm-kcal-copy"><strong data-kcal-value>${d.maxCalories ? num(d.maxCalories) : 'Без лимит'}</strong><span data-kcal-unit>${d.maxCalories ? 'ккал на порция най-много' : 'всякакви порции'}</span></div></div>`;
  const kcal = `<div class="nm-segmented nm-segmented-6" role="group" aria-label="Калории на порция">${CALORIE_OPTIONS.map(([v, n]) => chip('maxCalories', v, v ? n : 'Без', d.maxCalories === v, 'nm-seg')).join('')}</div>`;
  const people = `<div class="nm-people"><button type="button" class="nm-round" data-action="counter" data-key="people" data-delta="-1" aria-label="Един човек по-малко" ${d.people <= 1 ? 'disabled' : ''}>${icon('minus', 18)}</button><div class="nm-people-mid"><output aria-live="polite"><strong data-people>${d.people}</strong> <span data-people-word>${d.people === 1 ? 'човек' : 'души'}</span></output><div class="nm-seats" data-seats aria-hidden="true">${plateDots(d.people)}</div></div><button type="button" class="nm-round" data-action="counter" data-key="people" data-delta="1" aria-label="Един човек повече" ${d.people >= 12 ? 'disabled' : ''}>${icon('plus', 18)}</button></div>`;
  const value = Math.min(300, Math.max(10, d.budget));
  const budget = `<div class="nm-budget"><div class="nm-budget-top"><label for="budget" data-budget-label>Бюджет за ${d.days} дни</label><div class="nm-budget-line"><input id="budget" name="budget" type="number" inputmode="decimal" min="1" max="10000" step="1" value="${d.budget}" required><span>€</span></div></div><input type="range" min="10" max="300" step="5" value="${value}" data-input="budget-range" aria-label="Бюджет в евро" style="--nm-range:${Math.round(((value - 10) / 290) * 100)}%"></div>`;
  return `${meter}${kcal}${group('За колко души', people)}${group('Колко дни', `<div class="nm-segmented" role="group" aria-label="Колко дни">${[3, 5, 7].map((v) => chip('days', v, v + ' дни', d.days === v, 'nm-seg')).join('')}</div>`)}${group('Хранения', `<div class="nm-chips">${['Обяд', 'Вечеря'].map((v) => chip('slots', v, v, d.slots.includes(v))).join('')}</div>`)}${group('Бюджет', budget, 'ориентировъчно')}`;
}

function result(d) {
  const list = previewRecipes(d),
    count = candidates(d).length;
  if (!list.length)
    return `<div class="nm-empty">${mascot('sleepy', 150)}<h2>Няма рецепта за тези условия</h2><p>Не заобикаляме алергии и режим. Разшири времето, уредите или калориите.</p><div class="nm-empty-actions">${button('Промени уредите', 'wizard-step', 'data-index="3"', 'nm-link')}${button('Промени калориите', 'wizard-step', 'data-index="5"', 'nm-link')}</div></div>`;
  const tags = [
    d.stores.slice(0, 2).join(', ') + (d.stores.length > 2 ? ' +' + (d.stores.length - 2) : ''),
    DIETS[d.diet],
    d.maxCalories ? `до ${d.maxCalories} ккал` : 'без калориен лимит',
    `${d.people} ${d.people === 1 ? 'човек' : 'души'} · ${d.days} дни`,
  ];
  return `<div class="nm-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div><p class="nm-count"><strong>${count}</strong> ${count === 1 ? 'рецепта пасва' : 'рецепти пасват'}. Първите пет:</p><div class="nm-recipe-list">${list.map(previewCard).join('')}</div>`;
}

function stepContent(d, step) {
  return [welcome, stores, direction, kitchen, exclusions, portions, result][step]?.(d) ?? '';
}

/* ---------- live parts ---------- */

export function liveCount(d) {
  if (!d.stores.length) return { count: 0, label: 'Избери поне един магазин' };
  if (!d.slots.length) return { count: 0, label: 'Избери поне едно хранене' };
  const count = candidates(d).length;
  return {
    count,
    label:
      count === 0
        ? 'Няма подходящи. Разхлаби малко'
        : count === 1
          ? 'рецепта пасва'
          : 'рецепти пасват',
  };
}
function livePill(d) {
  const { count, label } = liveCount(d);
  return `<div class="nm-live ${count ? '' : 'is-empty'}" data-live aria-live="polite"><span class="nm-live-plate">${icon('book', 16)}</span><strong data-live-count>${count}</strong><span data-live-label>${esc(label)}</span></div>`;
}

const BUILD_STEPS = ['Подбираме рецептите', 'Подреждаме дните', 'Събираме списъка за покупки'];
export function buildingView() {
  return `<div class="nm-onboarding nm-building" role="status" aria-live="polite"><div class="nm-building-inner">${mascot('party', 220, 'nm-bounce')}<h1 class="nm-heading">Подреждаме седмицата</h1><ol class="nm-build-list">${BUILD_STEPS.map((s, i) => `<li style="--i:${i}"><span class="nm-build-dot">${icon('check', 14)}</span>${esc(s)}</li>`).join('')}</ol></div></div>`;
}

export function wizardView(d, step, error = '', canCancel = true, dir = 'forward') {
  const isIntro = step === 0,
    isResult = step === LAST_STEP;
  const progress = Math.round((Math.min(step, QUESTIONS) / QUESTIONS) * 100);
  const submitLabel = isIntro ? 'Да започваме' : isResult ? 'Подреди седмицата' : 'Продължи';
  const disable = isResult && !previewRecipes(d).length;
  const pose = isResult && !previewRecipes(d).length ? 'sleepy' : STEP_POSES[step];
  const secondary = isIntro
    ? canCancel
      ? ''
      : button('Първо разгледай рецептите', 'wizard-explore', '', 'nm-secondary')
    : isResult
      ? button('Промени избора', 'wizard-step', 'data-index="1"', 'nm-secondary')
      : '';
  const top = isIntro
    ? `<div class="nm-top">${wordmark('nm-top-logo')}${canCancel ? button('Затвори', 'wizard-cancel', '', 'nm-close') : ''}</div>`
    : `<div class="nm-top nm-top-progress"><button type="button" data-action="wizard-back" class="nm-back" aria-label="Назад">${icon('back', 20)}</button><div class="nm-progress" role="progressbar" aria-label="Напредък" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><span class="nm-progress-count">${isResult ? 'Готово' : `${step} от ${QUESTIONS}`}</span></div>`;
  const buddy = isIntro
    ? ''
    : `<button type="button" class="nm-buddy" data-action="mascot-poke" aria-label="Маскотът на На маса" tabindex="-1">${mascot(pose, 120, 'nm-buddy-img')}</button>`;
  return `<div class="nm-onboarding nm-step-${step}"><aside class="nm-stage" aria-hidden="true">${wordmark('nm-stage-logo')}<div class="nm-stage-mascot">${mascot(pose, 360, 'nm-float')}<span class="nm-hero-shadow"></span></div><p>Седмично меню по твоя магазин и вкус</p></aside><main class="nm-main" id="onboarding-content">${top}<form id="wizard-form" class="nm-form" data-form="wizard" novalidate><div class="nm-fields nm-enter-${dir === 'back' ? 'back' : 'forward'}"><header class="nm-head">${buddy}<h1 class="nm-heading" id="nm-step-title" tabindex="-1">${esc(titles[step])}</h1><p class="nm-subtitle">${esc(subtitles[step])}</p></header>${stepContent(d, step)}</div><footer class="nm-footer">${step > 0 && !isResult ? livePill(d) : ''}<p class="nm-error" role="alert">${esc(error)}</p><button class="nm-primary" type="submit" ${disable ? 'disabled' : ''}>${esc(submitLabel)}</button>${secondary}</footer></form></main></div>`;
}

/* ---------- in-place updates, so a tap never rebuilds the screen ---------- */

function restart(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function tween(el, to) {
  const from = Number(el.textContent) || 0;
  if (from === to) return;
  const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || typeof requestAnimationFrame !== 'function' || globalThis.document?.hidden) {
    el.textContent = to;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 280);
    el.textContent = Math.round(from + (to - from) * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Background tabs pause animation frames; make sure the final number always lands.
  setTimeout(() => (el.textContent = to), 340);
}

export function syncWizard(root, d, step, changedKey = '') {
  for (const node of root.querySelectorAll('[data-action="wizard-pick"]')) {
    const on = isSelected(d, node.dataset.key, node.dataset.value);
    if (node.classList.contains('is-selected') !== on) {
      node.classList.toggle('is-selected', on);
      node.setAttribute('aria-pressed', String(on));
      if (on && node.dataset.key === changedKey) restart(node, 'is-popping');
    }
  }
  const people = root.querySelector('[data-people]');
  if (people) {
    people.textContent = d.people;
    root.querySelector('[data-people-word]').textContent = d.people === 1 ? 'човек' : 'души';
    const seats = root.querySelector('[data-seats]');
    while (seats.children.length < d.people)
      seats.insertAdjacentHTML('beforeend', '<i class="nm-seat is-new"></i>');
    while (seats.children.length > d.people) seats.lastElementChild.remove();
    root.querySelectorAll('[data-action="counter"]').forEach((b) => {
      b.disabled = Number(b.dataset.delta) < 0 ? d.people <= 1 : d.people >= 12;
    });
  }
  const budgetLabel = root.querySelector('[data-budget-label]');
  if (budgetLabel) budgetLabel.textContent = `Бюджет за ${d.days} дни`;
  const food = root.querySelector('.nm-kcal-food');
  if (food) {
    food.style.setProperty('--s', PLATE_SCALE[d.maxCalories] ?? 1);
    root.querySelector('[data-kcal-value]').textContent = d.maxCalories
      ? num(d.maxCalories)
      : 'Без лимит';
    root.querySelector('[data-kcal-unit]').textContent = d.maxCalories
      ? 'ккал на порция най-много'
      : 'всякакви порции';
  }
  const dislikes = root.querySelector('[data-dislike-count]');
  if (dislikes)
    dislikes.textContent = d.dislikes.length ? d.dislikes.length + ' избрани' : 'по желание';
  const live = root.querySelector('[data-live]');
  if (live) {
    const { count, label } = liveCount(d);
    tween(live.querySelector('[data-live-count]'), count);
    live.querySelector('[data-live-label]').textContent = label;
    live.classList.toggle('is-empty', !count);
    restart(live, 'is-ticking');
    const buddy = root.querySelector('.nm-buddy-img');
    if (buddy) {
      const pose = count ? STEP_POSES[step] : 'sleepy';
      if (buddy.dataset.pose !== pose) {
        buddy.src = `assets/mascot/${pose}.webp`;
        buddy.dataset.pose = pose;
      }
    }
  }
  restart(root.querySelector('.nm-buddy-img'), 'is-hopping');
}
