import { STORES, PRODUCTS, EQUIPMENT, ALLERGENS } from './catalog.js';
import { GOALS, DIETS, candidates } from './domain.js';
import { nutrition } from './nutrition.js';
import { esc, icon, button, num, foodArt } from './ui.js';
import { mascotArt } from './mascot.js';

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

const timeOptions = [[0,'Без лимит'],[20,'20 мин'],[30,'30 мин'],[45,'45 мин'],[60,'60 мин'],[120,'120 мин']];
function timeStage(d) {
 const index=Math.max(0,timeOptions.findIndex(([v])=>v===d.maxTime));
 return `<div class="nm-time-panel"><div class="nm-time-top"><span>Имаш време за...</span><strong data-time-value>${d.maxTime ? `до ${d.maxTime} мин` : 'колкото е нужно'}</strong></div><input class="nm-time-slider" type="range" min="0" max="5" step="1" value="${index}" data-input="wizard-time" aria-label="Максимално време за готвене" aria-valuetext="${d.maxTime ? d.maxTime+' минути' : 'Без ограничение'}" style="--nm-range:${index*20}%"><div class="nm-time-ticks"><span>Без лимит</span><span>20 мин</span><span>30 мин</span><span>45 мин</span><span>60 мин</span><span>120 мин</span></div></div>`;
}
function stepContent(d,step) {
 switch(step) {
 case 0:
  return `<div class="nm-welcome-art">${mascotArt(0,'nm-mascot-hero')}<span class="nm-welcome-hello">Празна чиния. Големи планове.</span></div><div class="nm-welcome-perks"><div><span>${icon('book',20)}</span><strong>Рецепти</strong><small>Точно за теб</small></div><div><span>${icon('clock',20)}</span><strong>Време</strong><small>Каквото имаш</small></div><div><span>${icon('bag',20)}</span><strong>Покупки</strong><small>Без хаос</small></div></div>`;
 case 1:
  return `<div class="nm-grid nm-goals">${[
  ['quick','Нямам много време','Искам бързи рецепти','clock','01'],
  ['balanced','Чудя се какво да готвя','Дай ми вкусни идеи','book','02'],
  ['protein','Повече протеин','Ястия с повече протеин','protein','03'],
  ['light','По-леки ястия','Без тежки компромиси','leaf','04'],
  ].map(([v,n,s,i,k])=>pick('goal',v,n,s,d.goal===v,i,'nm-goal nm-goal-'+k)).join('')}</div><p class="nm-under-note">Това ще подреди първите ти предложения. Можеш да промениш избора по-късно.</p>`;
 case 2:
  return `<div class="nm-grid nm-diet-grid">${[
    ['all','Хапвам от всичко','Без специален режим','bag'],
    ['veggie','Вегетариански','Без месо и риба','leaf'],
    ['vegan','Изцяло растително','Без животински продукти','leaf'],
    ['pescatarian','Риба, но без месо','Риба и растителни храни','heart'],
  ].map(([v,n,s,i])=>pick('diet',v,n,s,d.diet===v,i,'nm-diet')).join('')}</div><div class="nm-microtip">${icon('info',17)} <span>Хранителният режим е отделен от алергиите — за тях питам след малко.</span></div>`;
 case 3:
  return `<div class="nm-safe-top"><span class="nm-safety-icon">${icon('heart',22)}</span><div><strong>Тук няма компромиси.</strong><small>Избери съставки, които трябва да изключим.</small></div></div><div class="nm-allergen-grid">${Object.entries(ALLERGENS).map(([v,n])=>pick('allergens',v,n,'',d.allergens.includes(v),null,'nm-allergen')).join('')}</div><details class="nm-details nm-optional"><summary>И продукти, които просто не обичам ${icon('plus',16)} <small>${d.dislikes.length ? d.dislikes.length+' избрани' : 'по желание'}</small></summary><div class="nm-grid nm-grid-two nm-dislikes">${Object.entries(PRODUCTS).map(([v,n])=>pick('dislikes',v,n[0],'',d.dislikes.includes(v))).join('')}</div></details><p class="nm-under-note">Алергените остават строго изключени. Провери и етикетите на продуктите.</p>`;
 case 4:
  return `${timeStage(d)}<div class="nm-mini-heading nm-spaced"><strong>Какво имаш в кухнята?</strong><span>Може няколко</span></div><div class="nm-appliance-grid">${Object.entries(EQUIPMENT).map(([v,n])=>pick('equipment',v,n,'',d.equipment.includes(v),v,'nm-appliance')).join('')}</div><p class="nm-under-note">Ще съобразя рецептите с уредите ти, не обратното.</p>`;
 case 5:
  return `<div class="nm-party-card"><div><p>Колко места да приготвя?</p><strong>За ${d.people} ${d.people===1?'човек':'души'}</strong></div>${counter(d)}</div><div class="nm-mini-heading nm-spaced"><strong>За колко дни да планираме?</strong></div><div class="nm-grid nm-grid-three nm-days">${[[3,'3 дни'],[5,'5 дни'],[7,'7 дни']].map(([v,n])=>pick('days',v,n,'',d.days===v,null,'nm-segment')).join('')}</div><div class="nm-mini-heading nm-spaced"><strong>Кога ще се събираме?</strong><span>Може и двете</span></div><div class="nm-grid nm-grid-two nm-meals">${['Обяд','Вечеря'].map((v,i)=>pick('slots',v,v,i?'Спокойна вечеря':'Нещо вкусно по обяд',d.slots.includes(v),i?'plan':'clock','nm-meal')).join('')}</div>`;
 case 6:
  return `<div class="nm-mini-heading"><strong>Любимите ти магазини</strong><span>Може няколко</span></div><div class="nm-store-grid">${STORES.slice(0,6).map((v,i)=>pick('stores',v,v,'',d.stores.includes(v),null,'nm-store nm-store-'+i)).join('')}</div><details class="nm-details nm-optional"><summary>Други магазини ${icon('plus',16)}</summary><div class="nm-grid nm-grid-two nm-dislikes">${STORES.slice(6).map(v=>pick('stores',v,v,'',d.stores.includes(v))).join('')}</div></details><div class="nm-budget-panel"><label for="budget"><strong>Бюджет за ${d.days} дни</strong><span>Ориентировъчно</span></label><div class="nm-budget-line"><input id="budget" name="budget" type="number" inputmode="decimal" min="1" max="10000" step="1" value="${d.budget}" required><span>€</span></div><input type="range" min="10" max="300" step="5" value="${Math.min(300,Math.max(10,d.budget))}" data-input="budget-range" aria-label="Бюджет в евро" style="--nm-range:${Math.round((Math.min(300,Math.max(10,d.budget))-10)/290*100)}%"><div class="nm-budget-ends"><span>10 €</span><span>300 €</span></div></div><p class="nm-under-note">Цените в приложението засега са примерни.</p>`;
 case 7: {
  const list=previewRecipes(d),count=candidates(d).length;
  return `<div class="nm-preview-bar"><span class="nm-preview-badge">${list.length} идеи</span><span>${esc(DIETS[d.diet])} <i>·</i> ${d.maxTime ? `до ${d.maxTime} мин` : 'без ограничение'}</span></div>${list.length ? `<div class="nm-recipe-list">${list.map(previewCard).join('')}</div><p class="nm-under-note nm-preview-foot">Докосни рецепта, за да видиш съставките и стъпките.</p>${count<5 ? `<p class="nm-explain">Намерих ${count} подходящи рецепти. Не добавям неподходящи, за да станат пет.</p>` : ''}` : `<div class="nm-empty"><span>${icon('info',32)}</span><h2>Още нямаме подходяща рецепта.</h2><p>Няма да пренебрегна алергии или режима ти. Можеш да промениш времето или уредите.</p>${button('Промени времето','wizard-step','data-index="4"','nm-inline-link')}${button('Промени ограниченията','wizard-step','data-index="3"','nm-inline-link')}</div>`}`;
 }
 case 8:
  return `<div class="nm-finale"><div class="nm-finale-head"><span>${icon('spark',20)}</span><strong>Готово. Ти избра — аз подреждам.</strong></div><div class="nm-benefits"><div><span>${icon('plan',22)}</span><strong>${d.days} дни подредени</strong><small>Меню според твоя вкус</small></div><div><span>${icon('bag',22)}</span><strong>Един общ списък</strong><small>Без дублирани продукти</small></div><div><span>${icon('swap',22)}</span><strong>Лесна смяна</strong><small>Променяш ястие когато пожелаеш</small></div></div><p class="nm-explain">Това е работещо демо без плащане. 7-дневният пробен период ще се предлага след активиране на абонаментите.</p></div>`;
 default:return '';
 }
}

export function wizardView(d,step,error='',canCancel=true){
 const isIntro=step===0,isResult=step>=7;
 const progress=isIntro?0:Math.round((Math.min(step,7)/7)*100);
 const submitLabel=['Да намерим моите рецепти','Продължи','Продължи','Продължи','Продължи','Продължи','Покажи ми рецептите','Подреди цялата седмица','Създай моето меню'][step];
 const disable=step===7&&!previewRecipes(d).length;
 const tagline=['Хайде да сготвим нещо хубаво.','Какво ще ти улесни живота?','За всеки вкус има място.','Това го приемам сериозно.','Бързо, вкусно и възможно.','Колкото повече, толкова по-вкусно.','Пазаруването също е част от плана.','Мисия: вкусна седмица.','Масата е готова.'][step];
 return `<div class="nm-onboarding nm-step-${step}"><div class="nm-shell"><aside class="nm-story"><a class="nm-story-brand" href="#plan" aria-label="На маса"><img src="assets/brand-wordmark.webp" width="480" height="94" alt="На маса"></a><div class="nm-story-copy"><span>ПО-МАЛКО ЧУДЕНЕ. ПОВЕЧЕ ВКУС.</span><h2>Твоята маса.<br><em>Твоите правила.</em></h2><p>${esc(tagline)}</p></div><div class="nm-story-art">${mascotArt(step,'nm-story-mascot')}</div><div class="nm-story-caption"><span class="nm-story-dot"></span> Малките решения правят вкусна седмица.</div></aside><main class="nm-main" id="onboarding-content"><div class="nm-top"><img src="assets/brand-wordmark.webp" alt="На маса" width="480" height="94" class="nm-top-logo"><span class="nm-top-small">ТВОЯТА МАСА</span><div class="nm-top-actions">${canCancel ? button('Затвори','wizard-cancel','','nm-close') : ''}</div></div>${!isIntro ? `<div class="nm-progress-head"><button type="button" data-action="wizard-back" class="nm-back" aria-label="Предишна стъпка">${icon('back',18)}</button><div class="nm-progress" role="progressbar" aria-label="Напредък на настройката" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><span class="nm-progress-count">${isResult?'Готово':`${step} / 6`}</span></div>` : '<div class="nm-intro-spacer"></div>'}<form id="wizard-form" class="nm-form" data-form="wizard"><section class="nm-screen" aria-labelledby="nm-step-title" key="${step}"><div class="nm-page">${!isIntro ? `<div class="nm-guide"><div class="nm-guide-art">${mascotArt(step,'nm-mascot-small')}</div><span>${esc(jokes[step])}</span></div>` : ''}<header class="nm-head"><p class="nm-kicker">${isIntro?'ЗАПОЗНАЙ СЕ С МАСАТА':isResult?'ТВОЯТА ПЕРСОНАЛНА МАСА':`СТЪПКА 0${step}`}</p><h1 class="nm-heading" id="nm-step-title" tabindex="-1">${esc(titles[step])}</h1><p class="nm-subtitle">${esc(subtitles[step])}</p></header><div class="nm-fields">${stepContent(d,step)}</div></div></section><footer class="nm-footer"><p class="nm-error" role="alert">${esc(error)}</p><button class="nm-primary" type="submit" ${disable?'disabled':''}>${esc(submitLabel)} ${icon('arrow',19)}</button>${step===0?button('Разгледай без настройка','wizard-explore','','nm-secondary'):step===7?button('Промени предпочитанията','wizard-step','data-index="1"','nm-secondary'):step===8?button('Назад към рецептите','wizard-step','data-index="7"','nm-secondary'):'<span class="nm-footer-note">Изборите можеш да промениш по всяко време.</span>'}</footer></form></main></div></div>`;
}
