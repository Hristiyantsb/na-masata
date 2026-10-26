import { NUTRIENTS, nutritionTotals, weekDates, foodHistory } from './fitness.js';
import { MEALS, daysBefore } from './domain.js';
import { esc, icon, button, field, num } from './ui.js';
export function diaryWeek(state, date) {
  return `<div class="fitness-week" aria-label="Седмица в дневника">${button('‹', 'diary-jump', `data-date="${daysBefore(date, 7)}" aria-label="Предишна седмица"`, 'icon-button')}${weekDates(
    date,
  )
    .map(
      (d) =>
        `<button data-action="diary-jump" data-date="${d}" ${d === date ? 'aria-current="date"' : ''}><small>${new Date(d + 'T12:00:00').toLocaleDateString('bg-BG', { weekday: 'short' })}</small><b>${Number(d.slice(-2))}</b><i class="${state.diary.some((e) => e.date === d) ? 'has-entries' : ''}"></i></button>`,
    )
    .join(
      '',
    )}${button('›', 'diary-jump', `data-date="${daysBefore(date, -7)}" aria-label="Следваща седмица"`, 'icon-button')}</div>`;
}
export function macroSummary(state, date) {
  const t = nutritionTotals(state.diary.filter((e) => e.date === date));
  return `<section class="macro-summary" aria-label="Макронутриенти">${['protein', 'carbs', 'fat']
    .map((k) => {
      const target = state.macroTargets?.[k] || 0;
      return `<div><span>${NUTRIENTS[k].label}</span><strong>${num(t.known[k], 1)} <small>г${t.missing[k] ? ' *' : ''}</small></strong><div class="macro-track"><span style="width:${target ? Math.min((t.known[k] / target) * 100, 100) : 0}%"></span></div><small>${target ? `от лична цел ${num(target)} г` : 'Без зададена цел'}</small>${t.missing[k] ? `<small>${t.missing[k]} записа без стойност</small>` : ''}</div>`;
    })
    .join('')}</section>`;
}
export function foodPicker(
  state,
  date,
  meal,
  tab = 'history',
  query = '',
  products = [],
  status = '',
) {
  const local = tab === 'saved' ? state.savedFoods : foodHistory(state.diary, query, 40);
  const rows =
    tab === 'products'
      ? products
      : local.filter((e) =>
          (e.name + ' ' + (e.brand || ''))
            .toLocaleLowerCase('bg')
            .includes(query.toLocaleLowerCase('bg')),
        );
  return `<p class="eyebrow">${esc(meal)} · ${date}</p><h2 class="dialog-title">Добави храна</h2><div class="food-actions">${button(icon('plus', 16) + ' Ръчно', 'manual-food', `data-meal="${meal}"`, 'button outline')}${button(icon('scan', 16) + ' Баркод', 'scanner', `data-meal="${meal}"`, 'button outline')}<a class="button outline" href="#recipes">От рецепта</a></div><div class="food-tabs" role="group" aria-label="Източник на храна">${[
    ['history', 'Последни'],
    ['saved', 'Мои храни'],
    ['products', 'Продуктова база'],
  ]
    .map(([id, name]) =>
      button(
        name,
        'food-tab',
        `data-tab="${id}" aria-pressed="${tab === id}"`,
        tab === id ? 'active' : '',
      ),
    )
    .join(
      '',
    )}</div><form data-form="food-search" class="food-search">${field(tab === 'products' ? 'Търси продукт по име' : 'Търси в списъка', 'query', query, 'search', 'maxlength="100"')}<button type="submit" class="button outline">Търси</button></form><p class="form-error" role="status">${esc(status)}</p>${tab === 'products' ? '<p class="fine">Източник: Open Food Facts · ODbL. Данните са въведени от общността. Баркодът не е гаранция за проверени стойности. Потвърди етикета и количеството.</p>' : ''}<div class="food-results">${rows.map((e, i) => `<button class="food-result" data-action="pick-food" data-index="${i}"><span><b>${esc(e.name)}</b><small>${esc(e.brand || '')}${e.servingLabel ? ' · ' + esc(e.servingLabel) : ''}</small></span><span>${e.kcal == null ? 'Няма ккал' : num(e.kcal) + ' ккал'}<small>/ ${e.basis === 1 ? 'порция' : '100 ' + (e.unit || 'г/мл')}</small></span>${icon('plus', 16)}</button>${tab !== 'products' ? button(icon('plus', 16) + ' Добави ' + num(e.amount, 1) + ' ' + esc(e.unit), 'quick-repeat-food', `data-index="${i}" aria-label="Добави ${esc(e.name)}: ${num(e.amount, 1)} ${esc(e.unit)}"`, 'button outline') : ''}${tab === 'saved' ? button('Премахни от мои храни', 'remove-saved-food', `data-id="${esc(e.id)}"`, 'quiet danger') : ''}`).join('') || '<p class="muted">Няма храни за показване. Добави ръчно или промени търсенето.</p>'}</div>`;
}
export function macroFields(e) {
  return `<details class="nutrition-details"><summary>Макроси и подробни стойности</summary><div class="form-grid">${Object.entries(
    NUTRIENTS,
  )
    .filter(([k]) => k !== 'protein')
    .map(([k, v]) =>
      field(`${v.label} (${v.unit})`, k, e[k] ?? '', 'number', `min="0" max="${v.max}" step="0.1"`),
    )
    .join(
      '',
    )}</div><p class="fine">Всички стойности са за ${e.basis === 1 ? 'една порция' : '100 г / мл'}. Празно = неизвестно. Натрият е в милиграми, а не сол в грамове.</p></details>`;
}
export function foodCopyForm(entry, date) {
  return `<h2 class="dialog-title">Копирай храната</h2><p>${esc(entry.name)}</p><form data-form="copy-food" data-id="${esc(entry.id)}"><label class="field"><span>Хранене</span><select name="meal">${MEALS.map((m) => `<option ${m === entry.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label><fieldset class="copy-days"><legend>Избери дати</legend>${weekDates(
    date,
  )
    .map(
      (d) =>
        `<label><input type="checkbox" name="dates" value="${d}">${new Date(d + 'T12:00:00').toLocaleDateString('bg-BG', { weekday: 'short', day: 'numeric', month: 'short' })}</label>`,
    )
    .join(
      '',
    )}</fieldset>${field('Или добави друга дата', 'otherDate', '', 'date')}<p class="fine">Създава нови записи с текущото количество и стойности.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Копирай в избраните дни</button></form>`;
}
export function entryTools(e) {
  return `<div class="entry-tools">${button('Копирай', 'copy-food', `data-id="${esc(e.id)}"`, 'quiet')}${button('Запази в мои храни', 'save-food', `data-id="${esc(e.id)}"`, 'quiet')}</div>`;
}
