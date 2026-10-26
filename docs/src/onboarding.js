import { STORES, PRODUCTS, EQUIPMENT, ALLERGENS } from './catalog.js';
import { GOALS, DIETS, candidates } from './domain.js';
import { nutrition } from './nutrition.js';
import { esc, icon, button, num, money, foodArt } from './ui.js';

export const STEPS = [
  'Добре дошъл',
  'Твоята цел',
  'Хранене',
  'Ограничения',
  'Твоето време',
  'За колко души',
  'Магазини и бюджет',
  'Твоите рецепти',
  'Готово за седмицата',
];

const titles = [
  'Какво ще сложиш на мен днес?',
  'Кое да направим по-лесно?',
  'Какво обичаш да хапваш?',
  'Какво да НЕ слагаме на масата?',
  'Колко време ти се готви?',
  'За колко души готвим?',
  'Къде пазаруваш най-често?',
  'Ето какво ти подхожда.',
  'Вкусът е избран. Ред е на седмицата.',
];

const subtitles = [
  'Нека ти намеря рецепти по твой вкус. Ти избираш, аз подреждам.',
  'Няма грешен отговор. Ще се водим по най-важното за теб.',
  'Така няма да ти предлагам неща, които не ядеш.',
  'Тук слушам внимателно. Особено за алергените.',
  'Няма да те пращам за три часа в кухнята. Освен ако ти не искаш.',
  'Ще наглася количествата. Всеки има място на масата.',
  'Ще организирам списъка според избора ти. Цените са примерни.',
  'Не са случайни. Подбрах ги от истинските рецепти в приложението.',
  'От идеите за вечеря до списъка за пазаруване — всичко на едно място.',
];

const jokes = [
  'Аз съм Масата. Чинията е празна, но имам план.',
  'Обещавам да не предлагам „каквото има в хладилника“ за пети път.',
  'Добре, значи не всичко с кашкавал. Записвам си.',
  'Алергиите не са шега. Аз съм сериозна маса, когато трябва.',
  'Аз съм готова по всяко време. Ти кажи кога.',
  'Ако сме повече, ще се разтегна. Образно казано.',
  'Няма да ти броя касовите бележки. Поне засега.',
  'Е, вече има какво да сложим на мен!',
  'Хайде да махнем и въпроса „Какво ще ядем?“ от утрешния ден.',
];

const mascotMoods = [
  'Приветлива масичка, готова да започнем',
  'Готвачът намига — готов е с идеи',
  'Любопитна масичка разглежда вкусовете',
  'Замислена масичка слуша ограниченията',
  'Сънлива масичка мечтае за бърза рецепта',
  'Усмихната масичка с чиния-сърце',
  'Масичка сервира любимите магазини и покупки',
  'Масичка се радва на готовите предложения',
  'Масичка подскача от радост за готовото меню',
];
const mascot = (mood, className = '') =>
  `<span class="nm-mascot nm-mood-${mood} ${className}" role="img" aria-label="${esc(mascotMoods[mood])}"></span>`;

function pick(key, value, name, subtitle, selected, glyph, extra = '') {
  return `<button type="button" class="nm-pick ${selected ? 'is-selected' : ''} ${extra}" data-action="wizard-pick" data-key="${esc(key)}" data-value="${esc(value)}" aria-pressed="${selected}">${glyph ? `<span class="nm-pick-icon">${icon(glyph, 21)}</span>` : ''}<span class="nm-pick-copy"><strong>${esc(name)}</strong>${subtitle ? `<small>${esc(subtitle)}</small>` : ''}</span><span class="nm-pick-check">${icon('check', 16)}</span></button>`;
}

export function previewRecipes(d) {
  const pool = candidates(d);
  const ranked = pool.map((r) => ({ r, n: nutrition(r) }));
  ranked.sort((a, b) => {
    if (d.goal === 'protein') return b.n.protein - a.n.protein || a.r.time - b.r.time;
    if (d.goal === 'light') return a.n.kcal - b.n.kcal || a.r.time - b.r.time;
    if (d.goal === 'quick') return a.r.time - b.r.time || a.n.kcal - b.n.kcal;
    return a.r.time - b.r.time || a.r.name.localeCompare(b.r.name, 'bg');
  });
  return ranked.slice(0, 5).map(({ r }) => r);
}

function previewCard(r, index) {
  const n = nutrition(r);
  return `<button type="button" class="nm-recipe" data-action="wizard-recipe" data-id="${esc(r.id)}" aria-label="Виж рецептата: ${esc(r.name)}"><span class="nm-recipe-number">0${index + 1}</span>${foodArt(r)}<span class="nm-recipe-info"><strong>${esc(r.name)}</strong><span class="nm-recipe-meta">${r.time} мин <i></i> ≈${num(n.kcal)} ккал <i></i> ${num(n.protein, 1)} г протеин</span></span>${icon('arrow', 18)}</button>`;
}

function counter(d) {
  return `<div class="nm-counter"><button type="button" data-action="counter" data-key="people" data-delta="-1" aria-label="Един човек по-малко" ${d.people <= 1 ? 'disabled' : ''}>−</button><span><strong>${d.people}</strong><small>${d.people === 1 ? 'човек' : 'души'}</small></span><button type="button" data-action="counter" data-key="people" data-delta="1" aria-label="Един човек повече" ${d.people >= 12 ? 'disabled' : ''}>+</button></div>`;
}

function stepContent(d, step) {
  switch (step) {
    case 0:
      return `<div class="nm-welcome-art">${mascot(0, 'nm-mascot-hero')}<span class="nm-welcome-hello">Приятно ми е! Аз съм Масата.</span></div><div class="nm-welcome-points"><span>${icon('check', 17)} Рецепти по твой вкус</span><span>${icon('check', 17)} Реален избор, не анкета без край</span><span>${icon('check', 17)} Може да започнеш без регистрация</span></div>`;
    case 1:
      return `<div class="nm-grid nm-grid-one">${[
        ['quick', 'Искам да готвя по-бързо', 'По-малко време, повече вкус.', 'clock'],
        ['balanced', 'Искам да знам какво да сготвя', 'Свежи идеи за всеки ден.', 'book'],
        ['protein', 'Искам повече протеин', 'Предложения с поне 25 г на порция.', 'protein'],
        ['light', 'Искам по-леки ястия', 'Предложения до 500 ккал на порция.', 'leaf'],
      ].map(([v,n,s,i]) => pick('goal', v, n, s, d.goal === v, i)).join('')}</div>`;
    case 2:
      return `<div class="nm-grid nm-grid-two">${Object.entries(DIETS).map(([v,n])=>pick('diet',v,n,'',d.diet===v,'leaf')).join('')}</div><p class="nm-under-note">Можеш да промениш режима си по всяко време. Няма изпит по хранене.</p>`;
    case 3:
      return `<div class="nm-mini-heading"><strong>Алергени и съставки за изключване</strong><span>Избери всички приложими</span></div><div class="nm-grid nm-grid-two">${Object.entries(ALLERGENS).map(([v,n])=>pick('allergens',v,n,'',d.allergens.includes(v))).join('')}</div><details class="nm-details" ${d.dislikes.length ? 'open' : ''}><summary>Има и продукти, които не харесвам ${icon('plus',16)} <small>${d.dislikes.length || ''}</small></summary><div class="nm-grid nm-grid-two nm-dislikes">${Object.entries(PRODUCTS).map(([v,n])=>pick('dislikes',v,n[0],'',d.dislikes.includes(v))).join('')}</div></details><p class="nm-under-note">Не премахваме алергени автоматично, дори ако остават по-малко рецепти. Винаги проверявай етикетите и кръстосания контакт.</p>`;
    case 4:
      return `<div class="nm-mini-heading"><strong>Време за готвене</strong><span>Приблизително на ястие</span></div><div class="nm-grid nm-grid-two nm-time">${[[20,'До 20 мин'],[30,'До 30 мин'],[45,'До 45 мин'],[60,'До 60 мин'],[0,'Без значение']].map(([v,n])=>pick('maxTime',v,n,'',d.maxTime===v,'clock')).join('')}</div><div class="nm-mini-heading nm-spaced"><strong>Какво имаш в кухнята?</strong><span>Само отбелязаните уреди</span></div><div class="nm-grid nm-grid-two">${Object.entries(EQUIPMENT).map(([v,n])=>pick('equipment',v,n,'',d.equipment.includes(v),v)).join('')}</div><p class="nm-under-note">Ако не избереш уред, ще търсим рецепти, които не изискват такъв.</p>`;
    case 5:
      return `<div class="nm-mini-heading"><strong>Колко души ще седнат?</strong></div>${counter(d)}<div class="nm-mini-heading nm-spaced"><strong>За колко дни да подредя менюто?</strong></div><div class="nm-grid nm-grid-three">${[[3,'3 дни'],[5,'5 дни'],[7,'7 дни']].map(([v,n])=>pick('days',v,n,'',d.days===v)).join('')}</div><div class="nm-mini-heading nm-spaced"><strong>За кое хранене?</strong><span>Може и двете</span></div><div class="nm-grid nm-grid-two">${['Обяд','Вечеря'].map(v=>pick('slots',v,v,'',d.slots.includes(v),'plan')).join('')}</div>`;
    case 6:
      return `<div class="nm-grid nm-grid-two nm-stores">${STORES.slice(0,6).map(v=>pick('stores',v,v,'',d.stores.includes(v),'bag')).join('')}</div><details class="nm-details"><summary>Пазарувам и другаде ${icon('plus',16)}</summary><div class="nm-grid nm-grid-two nm-dislikes">${STORES.slice(6).map(v=>pick('stores',v,v,'',d.stores.includes(v))).join('')}</div></details><div class="nm-budget"><label for="budget">Ориентировъчен общ бюджет <small>за ${d.days} дни</small></label><div class="nm-budget-input"><input id="budget" name="budget" type="number" inputmode="decimal" min="1" max="10000" step="1" value="${d.budget}" required><span>€</span></div><input type="range" min="10" max="300" step="5" value="${Math.min(300,Math.max(10,d.budget))}" data-input="budget-range" aria-label="Ориентировъчен бюджет"><p class="nm-under-note">Оценките са по примерни цени и цели опаковки, не по актуални оферти на веригите.</p></div>`;
    case 7: {
      const list = previewRecipes(d), count = candidates(d).length;
      return `<div class="nm-preview-heading"><div class="nm-preview-number"><b>${list.length}</b><span>идеи за теб</span></div><div><strong>${esc(GOALS[d.goal][0])}</strong><span>${esc(DIETS[d.diet])} · ${d.maxTime ? `до ${d.maxTime} мин` : 'без лимит за време'}</span></div></div>${list.length ? `<div class="nm-recipe-list">${list.map(previewCard).join('')}</div><p class="nm-under-note">Докосни рецепта, за да видиш съставките и стъпките. Хранителните стойности са ориентировъчни.</p>${count < 5 ? `<p class="nm-explain">Имаме ${count} подходящи рецепти за тези ограничения, затова не добавяме неподходящи само за да станат пет.</p>` : ''}` : `<div class="nm-empty"><span>${icon('info',32)}</span><h2>Не открих рецепти с всички тези условия.</h2><p>Няма да пренебрегвам алергени или хранителния ти режим. Можеш да промениш времето или уредите и да опитаме отново.</p>${button('Промени времето и уредите','wizard-step','data-index="4"','nm-inline-link')}${button('Промени ограниченията','wizard-step','data-index="3"','nm-inline-link')}</div>`}`;
    }
    case 8:
      return `<div class="nm-finale"><div class="nm-finale-mascot">${mascot(8, 'nm-mascot-finale')}<span>Така вече прилича на вечеря!</span></div><div class="nm-benefits"><div><span>${icon('plan',22)}</span><strong>Меню за ${d.days} дни</strong><small>По твоя режим и време</small></div><div><span>${icon('bag',22)}</span><strong>Един общ списък</strong><small>Съставки и количества</small></div><div><span>${icon('swap',22)}</span><strong>Смяна с едно докосване</strong><small>Не ти харесва? Сменяме го.</small></div></div><p class="nm-explain">В момента разглеждаш работещото демо без плащане. 7-дневният пробен период ще се предлага след активиране на абонаментите.</p></div>`;
    default: return '';
  }
}

export function wizardView(d, step, error = '', canCancel = true) {
  const isIntro = step === 0;
  const isResult = step >= 7;
  const progress = isIntro ? 0 : Math.min(100, Math.round((step / 7) * 100));
  const submitLabel = [
    'Да намерим моите рецепти','Продължи','Продължи','Продължи',
    'Продължи','Продължи','Намери моите рецепти','Подреди цялата седмица','Създай моето меню',
  ][step];
  const disable = step === 7 && !previewRecipes(d).length;
  return `<div class="nm-onboarding nm-step-${step}"><div class="nm-shell"><aside class="nm-story"><a class="nm-story-brand" href="#plan" aria-label="На маса"><img src="assets/brand-wordmark.webp" width="480" height="94" alt="На маса"></a><div class="nm-story-body"><p class="nm-story-kicker">ТВОЯТА МАСА. ТВОИТЕ ПРАВИЛА.</p><h2>По-малко чудене.<br>Повече <em>вкус.</em></h2><p>Едно удобно място за рецепти, меню и покупки — по твой начин.</p></div><div class="nm-story-bottom">${mascot(step, 'nm-story-mascot')}<span>Една маса. Много вкусни идеи.</span></div></aside><main class="nm-main" id="onboarding-content"><div class="nm-top"><img src="assets/brand-wordmark.webp" alt="На маса" width="480" height="94" class="nm-top-logo"><div class="nm-top-actions">${canCancel ? button('Затвори','wizard-cancel','','nm-close') : ''}</div></div>${!isIntro ? `<div class="nm-progress-head"><button type="button" data-action="wizard-back" class="nm-back" aria-label="Предишна стъпка">${icon('back',18)}</button><div class="nm-progress" role="progressbar" aria-label="Напредък на настройката" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><span class="nm-progress-count">${isResult ? 'Готово' : `${step} / 6`}</span></div>` : '<div class="nm-intro-spacer"></div>'}<form id="wizard-form" class="nm-form" data-form="wizard"><section class="nm-screen" aria-labelledby="nm-step-title" key="${step}"><div class="nm-page">${!isIntro && step !== 8 ? `<div class="nm-guide">${mascot(step, 'nm-mascot-small')}<span>${esc(jokes[step])}</span></div>` : ''}<header class="nm-head"><p class="nm-kicker">${isIntro ? 'ДОБРЕ ДОШЪЛ' : isResult ? 'ПО ТВОЙ ВКУС' : `СТЪПКА 0${step}`}</p><h1 class="nm-heading" id="nm-step-title" tabindex="-1">${esc(titles[step])}</h1><p class="nm-subtitle">${esc(subtitles[step])}</p></header><div class="nm-fields">${stepContent(d,step)}</div></div></section><footer class="nm-footer"><p class="nm-error" role="alert">${esc(error)}</p><button class="nm-primary" type="submit" ${disable ? 'disabled' : ''}>${esc(submitLabel)} ${icon('arrow',19)}</button>${step === 0 ? button('Разгледай първо без настройка','wizard-explore','','nm-secondary') : step === 7 ? button('Промени предпочитанията','wizard-step','data-index="1"','nm-secondary') : step === 8 ? button('Върни се към рецептите','wizard-step','data-index="7"','nm-secondary') : '<span class="nm-footer-note">Можеш да промениш избора си по всяко време.</span>'}</footer></form></main></div></div>`;
}
