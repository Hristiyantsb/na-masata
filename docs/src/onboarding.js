import { STORES, PRODUCTS, EQUIPMENT, ALLERGENS } from './catalog.js';
import { GOALS, DIETS, candidates } from './domain.js';
import { esc, icon, button, num, money, field } from './ui.js';
export const STEPS = [
  'Магазини',
  'Домакинство',
  'Бюджет',
  'Хранене',
  'Кухня',
  'Без тези продукти',
  'Лимити',
  'Твоят избор',
];
const titles = [
  'Къде пазаруваш?',
  'За кого е масата?',
  'Колко искаш да отделиш?',
  'Как обичаш да се храниш?',
  'Какво има в кухнята ти?',
  'Какво да оставим настрана?',
  'В твоя ритъм.',
  'Всичко е по твой вкус.',
];
const subtitles = [
  'Един или повече магазини. Един общ списък.',
  'Ще нагласим порциите и дните за теб.',
  'Бюджетът е за всички избрани хранения.',
  'Избери посока, после хранителен режим.',
  'Ще подбираме само рецепти за твоите уреди.',
  'Отбележи алергени и продукти, които не ядеш.',
  'Време за готвене и калории на една порция.',
  'Прегледай настройките, преди да създадем менюто.',
];
function option(key, value, title, sub, selected, ico) {
  return `<button type="button" class="option ${selected ? 'selected' : ''}" data-action="wizard-pick" data-key="${key}" data-value="${esc(value)}" aria-pressed="${selected}">${ico ? `<span class="option-icon">${icon(ico, 25)}</span>` : ''}<span><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="option-check">${icon('check', 14)}</span></button>`;
}
export function wizardView(d, step, error = '', canCancel = true) {
  let content = '';
  switch (step) {
    case 0:
      content = `<div class="store-options">${STORES.map((s, i) => option('stores', s, s, '', d.stores.includes(s))).join('')}</div><p class="fine">Изборът организира покупките. Цените и наличностите на магазините все още не са свързани.</p>`;
      break;
    case 1:
      content = `<div class="counter">${button('−', 'counter', 'data-key="people" data-delta="-1" aria-label="По-малко хора"')}<span><b>${d.people}</b><small>${d.people === 1 ? 'човек' : 'души'}</small></span>${button('+', 'counter', 'data-key="people" data-delta="1" aria-label="Повече хора"')}</div><h3>Колко дни планираме?</h3><div class="day-options">${[1, 2, 3, 4, 5, 6, 7].map((v) => option('days', v, String(v), '', d.days === v)).join('')}</div><h3>Кои хранения?</h3><div class="options two">${['Обяд', 'Вечеря'].map((v) => option('slots', v, v, '', d.slots.includes(v), 'plan')).join('')}</div>`;
      break;
    case 2:
      content = `<div class="budget-field"><label for="budget">Общ бюджет</label><div><input id="budget" name="budget" type="number" min="1" max="10000" step="1" value="${d.budget}" required><span>€</span></div><small>${d.days} дни · ${d.people} души</small></div><div class="small-picks">${[30, 50, 75, 100, 150].map((v) => button(`${v} €`, 'wizard-budget', `data-value="${v}"`, d.budget === v ? 'selected' : '')).join('')}</div><div class="notice">Ще смятаме цели опаковки, след като приспаднем наличното вкъщи. Началните цени са примерни и могат да се редактират.</div>`;
      break;
    case 3:
      content = `<div class="options two">${Object.entries(GOALS)
        .map(([k, v], i) =>
          option('goal', k, v[0], v[1], d.goal === k, ['leaf', 'protein', 'leaf', 'clock'][i]),
        )
        .join('')}</div><h3>Хранителен режим</h3><div class="options two compact">${Object.entries(
        DIETS,
      )
        .map(([k, v]) => option('diet', k, v, '', d.diet === k))
        .join('')}</div>`;
      break;
    case 4:
      content = `<div class="kitchen-art" aria-hidden="true">${icon('hob', 68)}<span></span>${icon('oven', 68)}</div><div class="options two">${Object.entries(
        EQUIPMENT,
      )
        .map(([k, v]) => option('equipment', k, v, '', d.equipment.includes(k), k))
        .join(
          '',
        )}</div><p class="fine">Без избран уред ще търсим ястия без термична обработка. Всяка рецепта изисква точно посочените уреди.</p>`;
      break;
    case 5:
      content = `<h3>Алергени</h3><div class="small-picks">${Object.entries(ALLERGENS)
        .map(([k, v]) => option('allergens', k, v, '', d.allergens.includes(k)))
        .join(
          '',
        )}</div><h3>Не ям / не обичам</h3><div class="small-picks exclusion-options">${Object.entries(
        PRODUCTS,
      )
        .map(([k, v]) => option('dislikes', k, v[0], '', d.dislikes.includes(k)))
        .join(
          '',
        )}</div><p class="fine">Проверявай етикетите за следи от алергени. Филтърът отчита само съставките в рецептата.</p>`;
      break;
    case 6:
      content = `<h3>Време за готвене</h3><div class="small-picks">${[20, 30, 45, 60, 0].map((v) => option('maxTime', v, v ? `До ${v} мин` : 'Без лимит', '', d.maxTime === v)).join('')}</div><h3>Калории на порция</h3><label class="switch-row"><input type="checkbox" name="calorieLimit" ${d.maxCalories ? 'checked' : ''} data-change="calorie-limit">Искам да задам горна граница</label>${d.maxCalories ? field('До колко ккал на порция?', 'maxCalories', d.maxCalories, 'number', 'min="100" max="2000" step="10" required') : ''}<p class="fine">Това е лимит за едно хранене, не дневна препоръка. Стойностите са изчислителни оценки от съставките.</p>`;
      break;
    case 7: {
      const count = candidates(d).length;
      content = `<div class="summary-list">${[
        [0, 'Магазини', d.stores.join(', ')],
        [1, 'Домакинство', `${d.people} души · ${d.days} дни · ${d.slots.join(' и ')}`],
        [2, 'Бюджет', money(d.budget)],
        [3, 'Хранене', `${GOALS[d.goal][0]} · ${DIETS[d.diet]}`],
        [4, 'Кухня', d.equipment.map((k) => EQUIPMENT[k]).join(', ') || 'Без уреди'],
        [5, 'Изключени', `${d.dislikes.length} продукта · ${d.allergens.length} алергена`],
        [
          6,
          'Лимити',
          `${d.maxCalories ? d.maxCalories + ' ккал' : 'Без калориен лимит'} · ${d.maxTime ? d.maxTime + ' мин' : 'без лимит за време'}`,
        ],
      ]
        .map(
          ([i, k, v]) =>
            `<button type="button" data-action="wizard-step" data-index="${i}"><span>${k}</span><b>${esc(v)}</b>${icon('arrow', 16)}</button>`,
        )
        .join(
          '',
        )}</div><div class="notice ${count ? 'positive' : 'warning'}">${count ? `${count} подходящи рецепти. ${count < d.days * d.slots.length ? 'В менюто ще има повторения.' : ''}` : 'Няма рецепти за тези ограничения. Върни се и промени избора — няма да го пренебрегваме.'}</div>`;
      break;
    }
  }
  return `<div class="wizard-layout"><aside class="wizard-aside"><a class="wordmark" href="#plan">на масата<span>•</span></a><div><p class="eyebrow">МАЛКО ПЛАНИРАНЕ.<br>ПОВЕЧЕ СПОКОЙСТВИЕ.</p><h2>Твоята кухня.<br>Твоите правила.</h2><ol>${STEPS.map((s, i) => `<li class="${i === step ? 'current' : i < step ? 'complete' : ''}"><span>${i < step ? icon('check', 13) : i + 1}</span>${s}</li>`).join('')}</ol></div><p class="fine">Създадено за ежедневието в България.</p></aside><section class="wizard-panel"><div class="wizard-top">${button(icon('back'), 'wizard-back', `aria-label="Назад" ${!step && !canCancel ? 'disabled' : ''}`, 'icon-button')}<div class="progress-track"><span style="width:${((step + 1) / STEPS.length) * 100}%"></span></div><small>${step + 1} / ${STEPS.length}</small>${canCancel ? button('Затвори', 'wizard-cancel', '', 'quiet') : ''}</div><form id="wizard-form" data-form="wizard"><div class="wizard-content"><p class="eyebrow">${STEPS[step]}</p><h1 tabindex="-1">${titles[step]}</h1><p class="muted">${subtitles[step]}</p>${content}</div><div class="wizard-bottom"><p class="form-error" role="alert">${esc(error)}</p><button class="button primary full" type="submit" ${step === 7 && !candidates(d).length ? 'disabled' : ''}>${step === 7 ? 'Намери моето меню' : 'Продължи'}${icon('arrow')}</button><p class="fine">Без плащане в демонстрационната версия.</p></div></form></section></div>`;
}
