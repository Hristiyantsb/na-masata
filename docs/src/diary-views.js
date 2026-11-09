// Food diary (Меню Плюс). Records what was eaten; it never sets a calorie goal by itself.
import { NUTRIENTS, nutritionTotals, weekDates } from './fitness.js';
import { searchLocal } from './foods.js';
import { MEALS, daysBefore, WATER_GLASS_ML, ACTIVITY, WEIGHT_GOALS, PACES, CALORIE_FLOOR, calorieGoal } from './domain.js';
import { measureOptions, displayQuantity, suggestedServingQuantity } from './servings.js';
import { esc, icon, num, SHORT_DAYS, plural } from './ui.js';
import { mascot } from './brand.js';

const MEAL_ICONS = { Закуска: 'sun', Обяд: 'utensils', Вечеря: 'moon', Междинно: 'leaf' };
const dateLabel = (d, opts) => new Date(d + 'T12:00:00').toLocaleDateString('bg-BG', opts);
export const todayLabel = (date, today) =>
  date === today
    ? 'Днес'
    : date === daysBefore(today, 1)
      ? 'Вчера'
      : dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' });

function weekStrip(state, date, today) {
  const days = weekDates(date);
  return `<div class="week-strip" role="group" aria-label="Седмица"><button type="button" class="icon-btn" data-action="diary-jump" data-date="${daysBefore(date, 7)}" aria-label="Предишна седмица">${icon('back', 20)}</button>${days
    .map((d, i) => {
      const has = state.diary.some((e) => e.date === d);
      return `<button type="button" class="wday ${d === date ? 'is-on' : ''} ${d === today ? 'is-today' : ''}" data-action="diary-jump" data-date="${d}" ${d === date ? 'aria-current="date"' : ''} aria-label="${esc(dateLabel(d, { weekday: 'long', day: 'numeric', month: 'long' }))}"><small>${SHORT_DAYS[i]}</small><b>${Number(d.slice(-2))}</b><i class="${has ? 'has' : ''}"></i></button>`;
    })
    .join('')}<button type="button" class="icon-btn" data-action="diary-jump" data-date="${daysBefore(date, -7)}" aria-label="Следваща седмица">${icon('chevron', 20)}</button></div>`;
}

function equation(eaten, target) {
  if (!target) return '';
  const left = Math.round(target - eaten);
  return `<div class="equation" role="group" aria-label="Цел минус храна"><div><b>${num(target)}</b><small>Цел</small></div><i aria-hidden="true">−</i><div><b>${num(eaten)}</b><small>Храна</small></div><i aria-hidden="true">=</i><div class="${left < 0 ? 'is-over' : 'is-left'}"><b>${num(Math.abs(left))}</b><small>${left < 0 ? 'Над целта' : 'Остават'}</small></div></div>`;
}

function ring(eaten, target) {
  const r = 52,
    c = 2 * Math.PI * r,
    p = target ? Math.min(1, eaten / target) : 0;
  return `<div class="ring"><svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="${r}" class="ring-track"/><circle cx="64" cy="64" r="${r}" class="ring-fill ${target && eaten > target ? 'is-over' : ''}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}"/></svg><div class="ring-text"><b>${num(eaten)}</b><small>${target ? `от ${num(target)} ккал` : 'ккал днес'}</small></div></div>`;
}

function macroBars(state, totals) {
  return `<div class="macro-bars">${['protein', 'carbs', 'fat']
    .map((k) => {
      const target = state.macroTargets?.[k] || 0,
        value = totals.known[k];
      return `<div class="mbar mbar-${k}"><span class="mbar-top"><span>${NUTRIENTS[k].label}</span><b>${num(value, 0)}${target ? ` / ${num(target)}` : ''} г${totals.missing[k] ? '*' : ''}</b></span><span class="bar"><i style="width:${target ? Math.min(100, (value / target) * 100) : 0}%"></i></span></div>`;
    })
    .join('')}</div>`;
}

export function diaryView(state, date, today) {
  const entries = state.diary.filter((e) => e.date === date);
  const totals = nutritionTotals(entries);
  const target = state.dailyTarget;
  const missing = Math.max(...['protein', 'carbs', 'fat'].map((k) => totals.missing[k]));
  const meals = MEALS.map((meal) => {
    const list = entries.filter((e) => e.meal === meal);
    const kcal = nutritionTotals(list).kcal;
    return `<section class="dmeal"><header class="dmeal-head"><span class="list-ic">${icon(MEAL_ICONS[meal], 20)}</span><h2>${meal}</h2><span class="dmeal-kcal">${list.length ? `${num(kcal)} ккал` : ''}</span><button type="button" class="icon-btn icon-btn-sm" data-action="add-food" data-meal="${meal}" aria-label="Добави към ${meal.toLocaleLowerCase('bg')}">${icon('plus', 20)}</button></header>${
      list.length
        ? `<ul class="dlist">${list
            .map(
              (e) =>
                `<li><button type="button" class="dentry" data-action="entry" data-id="${esc(e.id)}"><span class="dentry-text"><b>${esc(e.name)}</b><small>${num(e.amount, 1)} ${esc(e.unit)}${e.brand ? ' · ' + esc(e.brand) : ''}</small></span><span class="dentry-kcal">${num((e.kcal * e.amount) / e.basis)} ккал</span></button></li>`,
            )
            .join('')}</ul>`
        : ''
    }</section>`;
  }).join('');
  const water = state.water[date] || 0;
  const waterCard = `<section class="card water"><header class="card-head"><h2>${icon('water', 20)} Вода</h2><span>${num((water * WATER_GLASS_ML) / 1000, 2)} л</span></header><div class="glasses" role="group" aria-label="Чаши вода">${Array.from(
    { length: 8 },
    (_, i) =>
      `<button type="button" class="glass ${i < water ? 'is-full' : ''}" data-action="water" data-count="${i + 1 === water ? i : i + 1}" aria-pressed="${i < water}" aria-label="${plural(i + 1, 'чаша', 'чаши')}"><span></span></button>`,
  ).join('')}${water > 8 ? `<b class="glass-more">+${water - 8}</b>` : ''}</div><p class="fine">Чаша = ${WATER_GLASS_ML} мл. Докосни, за да отбележиш.</p></section>`;
  return `<header class="page-head"><div class="page-head-text"><p class="eyebrow">Меню Плюс · демо</p><h1>Дневник</h1><p class="page-meta">${esc(todayLabel(date, today))}</p></div><button type="button" class="btn btn-primary btn-small" data-action="add-food">${icon('plus', 18)} Добави</button></header>${weekStrip(state, date, today)}<section class="card day-card">${ring(totals.kcal, target)}<div class="day-side">${macroBars(state, totals)}<div class="day-links"><button type="button" class="btn btn-plain btn-small" data-action="daily-target">${target ? 'Смени целта' : 'Задай цел'}</button><button type="button" class="btn btn-plain btn-small" data-action="macro-targets">Цели за макроси</button></div></div>${equation(totals.kcal, target)}${missing ? `<p class="fine day-note">* Някои записи нямат стойност за всички макроси.</p>` : ''}</section>${meals}${waterCard}${weightCard(state, date)}${weekChart(state, date)}<section class="list-group"><h2>Данни</h2><div class="list"><button type="button" class="list-row" data-action="export-diary"><span class="list-ic">${icon('download', 20)}</span><span class="list-text"><b>Изтегли дневника</b><small>CSV за Excel и Google Sheets</small></span>${icon('chevron', 18)}</button><label class="list-row"><span class="list-ic">${icon('upload', 20)}</span><span class="list-text"><b>Внеси записи</b><small>JSON от приложението adios</small></span>${icon('chevron', 18)}<input type="file" accept="application/json,.json" data-change="import-adios" class="sr-only"></label></div></section><p class="fine">Целта е твоя: въведи я или я пресметни ориентировъчно от „Задай цел“. Числата не са медицински съвет.</p>`;
}

function weekChart(state, date) {
  const days = Array.from({ length: 7 }, (_, i) => daysBefore(date, 6 - i));
  const values = days.map((d) => nutritionTotals(state.diary.filter((e) => e.date === d)).kcal);
  const max = Math.max(1, ...values, state.dailyTarget || 0);
  if (!values.some(Boolean)) return '';
  return `<section class="card chart"><header class="card-head"><h2>Последните 7 дни</h2><span>ккал</span></header><div class="bars" role="img" aria-label="Калории по дни: ${values.map((v) => num(v)).join(', ')}">${days
    .map(
      (d, i) =>
        `<div class="bars-col ${d === date ? 'is-on' : ''}"><span class="bars-v">${values[i] ? num(values[i]) : ''}</span><i style="height:${Math.max(3, Math.round((values[i] / max) * 100))}%"></i><small>${SHORT_DAYS[(new Date(d + 'T12:00:00').getDay() + 6) % 7]}</small></div>`,
    )
    .join('')}</div></section>`;
}

export function weightCard(state, date) {
  const list = state.weights;
  const last = list[list.length - 1];
  const since = daysBefore(date, 30),
    month = list.filter((e) => e.date >= since && e.date <= date);
  const change = month.length > 1 ? month[month.length - 1].kg - month[0].kg : null;
  let chart = '';
  const points = list.slice(-20);
  if (points.length > 1) {
    const min = Math.min(...points.map((p) => p.kg)) - 0.5,
      max = Math.max(...points.map((p) => p.kg)) + 0.5,
      w = 300,
      h = 80;
    const xy = points.map((p, i) => [
      Math.round((i / (points.length - 1)) * w),
      Math.round(h - ((p.kg - min) / (max - min)) * h),
    ]);
    chart = `<svg class="wchart" viewBox="-6 -6 ${w + 12} ${h + 12}" role="img" aria-label="Тегло: ${points.map((p) => num(p.kg, 1)).join(', ')} кг"><polyline points="${xy.map((p) => p.join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === xy.length - 1 ? 4.5 : 2.6}"/>`).join('')}</svg>`;
  }
  return `<section class="card weight"><header class="card-head"><h2>${icon('weight', 20)} Тегло</h2><button type="button" class="btn btn-plain btn-small" data-action="weight-form">${icon('plus', 18)} Запиши</button></header>${
    last
      ? `<p class="weight-now"><b>${num(last.kg, 1)}</b> кг <small>${change === null ? 'Запиши пак след няколко дни, за да видиш промяната' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${num(Math.abs(change), 1)} кг за последните 30 дни`}</small></p>${chart}`
      : '<p class="muted">Записвай теглото веднъж седмично, по едно и също време.</p>'
  }</section>`;
}

export function weightForm(date, current) {
  return `<h2 class="sheet-title">Тегло</h2><form data-form="weight"><div class="form-grid"><label class="field"><span>Дата</span><input name="date" type="date" value="${date}" required></label><label class="field"><span>Килограми</span><input name="kg" type="number" inputmode="decimal" min="20" max="400" step="0.1" value="${current ?? ''}" required></label></div><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запази</button></form><p class="fine">Само за твоя справка. Приложението не дава медицински съвети.</p>`;
}

const ok = (v) => v !== '' && v !== null && v !== undefined;

/** Live preview of the calculated goal; neutral until the numbers are filled in. */
export function goalPreview(values) {
  if (!ok(values.age) || !ok(values.height) || !ok(values.weight))
    return '<p class="goal-line">Попълни възраст, ръст и тегло, за да видиш целта.</p>';
  try {
    const g = calorieGoal(values);
    const change = g.change
      ? `${g.change < 0 ? 'минус' : 'плюс'} ${num(Math.abs(g.change))} ккал за ${num(g.profile.pace, 2)} кг седмично`
      : 'без промяна на теглото';
    return `<p class="eyebrow">Твоята цел</p><p class="goal-kcal"><b>${num(g.target)}</b> ккал на ден</p><p class="goal-line">За поддържане около ${num(g.maintenance)} ккал, ${change}.</p>${
      g.floorApplied
        ? `<p class="goal-line is-warn">Не предлагаме цел под ${num(CALORIE_FLOOR[g.profile.sex])} ккал на ден. За по-бързо отслабване говори с лекар.</p>`
        : ''
    }<div class="goal-macros" aria-label="Макроси на ден"><div><b>${g.macros.protein} г</b><small>протеин</small></div><div><b>${g.macros.carbs} г</b><small>въглехидрати</small></div><div><b>${g.macros.fat} г</b><small>мазнини</small></div></div>`;
  } catch (error) {
    return `<p class="goal-line is-warn">${esc(error.message)}</p>`;
  }
}

const pick = (name, value, label, sub, checked) =>
  `<label class="pick"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
export const paceOptions = (goal, current) =>
  (PACES[goal] || PACES.lose).map((v) => pick('pace', v, `${num(v, 2)} кг`, 'на седмица', Number(current) === v)).join('');

export function goalValues(state) {
  const p = state.profile || {};
  return {
    sex: p.sex || 'female',
    age: p.age ?? '',
    height: p.height ?? '',
    weight: state.weights.at(-1)?.kg ?? p.weight ?? '',
    activity: p.activity || 'light',
    goal: p.goal || 'keep',
    pace: p.pace || 0.5,
  };
}

export function goalSheet(state, mode = 'calc') {
  const tabs = `<div class="seg seg-2" role="group" aria-label="Как да зададеш целта"><button type="button" class="seg-item" data-action="goal-mode" data-mode="calc" aria-pressed="${mode !== 'manual'}">Пресметни</button><button type="button" class="seg-item" data-action="goal-mode" data-mode="manual" aria-pressed="${mode === 'manual'}">Въведи сам</button></div>`;
  if (mode === 'manual') return `<h2 class="sheet-title">Дневна цел</h2>${tabs}${manualTarget(state)}`;
  const values = goalValues(state);
  return `<h2 class="sheet-title">Дневна цел</h2><p class="sheet-sub">Пресмятаме ориентировъчно колко калории на ден ти трябват. Числото можеш да смениш по всяко време.</p>${tabs}<form data-form="goal-calc" novalidate><fieldset class="field"><legend>Целта ти</legend><div class="picks picks-3">${Object.entries(WEIGHT_GOALS)
    .map(([k, label]) => pick('goal', k, label, '', values.goal === k))
    .join('')}</div></fieldset><fieldset class="field" data-pace ${values.goal === 'keep' ? 'hidden' : ''}><legend>Темпо</legend><div class="picks picks-3" data-pace-options>${paceOptions(values.goal === 'gain' ? 'gain' : 'lose', values.pace)}</div></fieldset><div class="form-grid"><label class="field"><span>Пол</span><select name="sex"><option value="female" ${values.sex === 'female' ? 'selected' : ''}>Жена</option><option value="male" ${values.sex === 'male' ? 'selected' : ''}>Мъж</option></select></label><label class="field"><span>Възраст</span><input name="age" type="number" inputmode="numeric" min="18" max="100" step="1" value="${esc(values.age)}"></label><label class="field"><span>Ръст, см</span><input name="height" type="number" inputmode="numeric" min="120" max="230" step="1" value="${esc(values.height)}"></label><label class="field"><span>Тегло, кг</span><input name="weight" type="number" inputmode="decimal" min="35" max="300" step="0.1" value="${esc(values.weight)}"></label></div><fieldset class="field"><legend>Колко се движиш</legend><div class="picks">${Object.entries(ACTIVITY)
    .map(([k, [, label, sub]]) => pick('activity', k, label, sub, values.activity === k))
    .join('')}</div></fieldset><div class="goal-preview" data-goal-preview aria-live="polite">${goalPreview(values)}</div><p class="fine">Ориентир по формулата на Mifflin–St Jeor и нивото на движение, не медицински съвет. При бременност, кърмене, заболяване или специален режим се посъветвай с лекар. Макросите са разпределени 20% протеин, 50% въглехидрати, 30% мазнини; можеш да ги смениш в „Цели за макроси“.</p><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запази целта</button></form>`;
}

function manualTarget(state) {
  return `<p class="sheet-sub">Въведи цел, която вече си избрал, например с лекар или треньор.</p><form data-form="target"><label class="field"><span>Ккал на ден</span><input name="target" type="number" inputmode="numeric" min="0" max="10000" step="1" value="${state.dailyTarget || ''}" placeholder="Без цел"></label><p class="fine">Празно или 0 маха целта.</p><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запази</button></form>`;
}

/** The manual form on its own (kept for older links and tests). */
export function targetSheet(state) {
  return goalSheet(state, 'manual');
}

export function macroTargetsSheet(state) {
  return `<h2 class="sheet-title">Цели за макроси</h2><p class="sheet-sub">Грамове на ден. Празно означава без цел.</p><form data-form="macro-targets"><div class="form-grid form-grid-3">${['protein', 'carbs', 'fat']
    .map(
      (k) =>
        `<label class="field"><span>${NUTRIENTS[k].label}</span><input name="${k}" type="number" inputmode="numeric" min="0" max="2000" step="1" value="${state.macroTargets[k] || ''}"></label>`,
    )
    .join('')}</div><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запази</button></form>`;
}

const per = (e) => (e.basis === 1 ? (e.servingLabel ? e.servingLabel : 'порция') : `100 ${e.unit === 'мл' ? 'мл' : 'г'}`);
const SECTION_TITLES = {
  mine: 'Твои храни',
  recent: 'Последни',
  basic: 'Основни продукти',
  recipes: 'Рецепти от „На маса“',
  online: 'От Open Food Facts',
};

/** Rows of the picker in display order; the controller resolves taps by the same index. */
export function pickerRows(state, picker) {
  const local = searchLocal(state, picker.query, { tab: picker.tab });
  const rows = [];
  const push = (section, list) => list.forEach((e) => rows.push({ section, e }));
  push(picker.query.trim() ? 'mine' : 'recent', local.mine);
  push('basic', local.basic);
  push('recipes', local.recipes);
  const online = picker.online || {};
  if (picker.tab !== 'saved' && online.status === 'done' && online.query === picker.query.trim()) push('online', online.results);
  return rows;
}

function onlineBlock(picker) {
  const q = picker.query.trim();
  if (picker.tab === 'saved' || q.length < 2) return '';
  const online = picker.online || {};
  if (online.query !== q || online.status === 'idle')
    return `<button type="button" class="online-row" data-action="food-online">${icon('search', 20)}<span class="list-text"><b>Търси „${esc(q)}“ в Open Food Facts</b><small>Хиляди продукти от магазините, с марка и калории</small></span>${icon('chevron', 18)}</button>`;
  if (online.status === 'loading') return `<p class="online-status" role="status">Търсим в Open Food Facts…</p>`;
  if (online.status === 'error')
    return `<p class="online-status is-error" role="alert">${esc(online.error)} Баркодът работи отделно: сканирай опаковката или въведи храната ръчно.</p><button type="button" class="btn btn-secondary btn-small" data-action="food-online">Опитай пак</button>`;
  if (!online.results.length)
    return `<p class="online-status">Open Food Facts не намери „${esc(q)}“. Въведи храната ръчно и тя ще остане в „Твои храни“.</p>`;
  return '';
}

export function foodPicker(state, date, picker) {
  const rows = pickerRows(state, picker);
  let section = null,
    list = '';
  rows.forEach(({ section: sec, e }, i) => {
    if (sec !== section) {
      list += `${section ? '</ul>' : ''}<h3 class="food-section">${SECTION_TITLES[sec]}</h3><ul class="food-results">`;
      section = sec;
    }
    const mine = sec === 'mine' || sec === 'recent';
    const sub = [e.brand, e.kcal == null ? 'без ккал' : `${num(e.kcal)} ккал / ${per(e)}`].filter(Boolean).map(esc).join(' · ');
    list += `<li class="food-row"><button type="button" class="food-pick" data-action="pick-food" data-index="${i}"><span class="list-text"><b>${esc(e.name)}</b><small>${sub}</small></span></button>${
      mine
        ? `<button type="button" class="pill" data-action="quick-repeat-food" data-index="${i}" aria-label="Добави ${esc(e.name)}: ${num(e.amount, 1)} ${esc(e.unit)}">${icon('plus', 16)} ${num(e.amount, 1)} ${esc(e.unit)}</button>`
        : `<button type="button" class="icon-btn icon-btn-sm add-btn" data-action="pick-food" data-index="${i}" aria-label="Добави ${esc(e.name)}">${icon('plus', 20)}</button>`
    }${picker.tab === 'saved' ? `<button type="button" class="icon-btn icon-btn-sm" data-action="remove-saved-food" data-id="${esc(e.id)}" aria-label="Махни от моите храни">${icon('trash', 18)}</button>` : ''}</li>`;
  });
  if (section) list += '</ul>';
  const hasOnline = rows.some((r) => r.section === 'online');
  const emptyText =
    picker.tab === 'saved'
      ? 'Тук стоят храните, които запазиш. Отвори запис в дневника и избери „Запази в „Мои храни“.'
      : picker.query.trim()
        ? 'Нищо при теб и в основните продукти.'
        : 'Последните ти храни ще се появяват тук за бързо добавяне.';
  return `<p class="eyebrow">${esc(dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' }))}</p><h2 class="sheet-title">Добави храна</h2><div class="seg seg-meals" role="group" aria-label="Хранене">${MEALS.map((m) => `<button type="button" class="seg-item" data-action="picker-meal" data-meal="${m}" aria-pressed="${m === picker.meal}">${m}</button>`).join('')}</div><form class="search" data-form="food-search" role="search">${icon('search', 18)}<input type="search" name="query" data-input="food-search" value="${esc(picker.query)}" placeholder="Храна, марка или рецепта" aria-label="Търси храна" autocomplete="off" enterkeyhint="search"></form><div class="quick-add"><button type="button" class="qa" data-action="scanner">${icon('scan', 22)}<span>Баркод</span></button><button type="button" class="qa" data-action="quick-kcal">${icon('flame', 22)}<span>Бързи калории</span></button><button type="button" class="qa" data-action="manual-food">${icon('edit', 22)}<span>Ръчно</span></button></div><div class="seg seg-2" role="group" aria-label="Източник"><button type="button" class="seg-item" data-action="food-tab" data-tab="all" aria-pressed="${picker.tab !== 'saved'}">Всички</button><button type="button" class="seg-item" data-action="food-tab" data-tab="saved" aria-pressed="${picker.tab === 'saved'}">Мои храни</button></div><div data-picker-results>${list || `<p class="food-empty">${emptyText}</p>`}${onlineBlock(picker)}${hasOnline ? '<p class="fine">Данни от Open Food Facts, лиценз ODbL. Въведени са от хора и може да се различават от етикета.</p>' : ''}</div>`;
}

export function quickKcalForm(date, meal) {
  return `<p class="eyebrow">Дневник</p><h2 class="sheet-title">Бързи калории</h2><p class="sheet-sub">Когато знаеш само калориите, например от менюто в ресторант.</p><form data-form="quick-kcal"><input type="hidden" name="date" value="${esc(date)}"><div class="form-grid"><label class="field"><span>Хранене</span><select name="meal">${MEALS.map((m) => `<option ${m === meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="field"><span>Ккал</span><input name="kcal" type="number" inputmode="numeric" min="1" max="2000" step="1" required></label></div><label class="field"><span>Какво беше</span><input name="name" maxlength="120" autocomplete="off" placeholder="Бързо добавяне"></label><details class="more-fields"><summary>Макроси, ако ги знаеш</summary><div class="form-grid form-grid-3">${['protein', 'carbs', 'fat']
    .map((k) => `<label class="field"><span>${NUTRIENTS[k].label}, г</span><input name="${k}" type="number" inputmode="decimal" min="0" max="200" step="0.1"></label>`)
    .join('')}</div></details><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запиши</button></form>`;
}

function macroFields(e) {
  return `<details class="more-fields"><summary>Още стойности от етикета</summary><div class="form-grid">${Object.entries(NUTRIENTS)
    .filter(([k]) => k !== 'protein')
    .map(
      ([k, v]) =>
        `<label class="field"><span>${v.label}, ${v.unit}</span><input name="${k}" type="number" inputmode="decimal" min="0" max="${v.max}" step="0.1" value="${e[k] ?? ''}"></label>`,
    )
    .join('')}</div><p class="fine">Стойностите са за ${e.basis === 1 ? 'една порция' : '100 г или мл'}. Празно означава неизвестно. Натрият е в милиграми.</p></details>`;
}

export function foodForm(date, meal = 'Обяд', entry = null) {
  const e = entry || { name: '', date, meal, unit: 'г', amount: 100, basis: 100, kcal: '', protein: '', source: 'manual' };
  const q = displayQuantity(e);
  const options = measureOptions(e.unit, e.basis, e.servingLabel || '');
  if (e.basis === 100 && !options.includes('именувана порция')) options.push('именувана порция');
  const servingQuantity = e.servingGrams || suggestedServingQuantity(e.servingLabel, e.unit) || '';
  const per = e.basis === 1 ? 'една порция' : e.unit === 'мл' ? '100 мл' : '100 г';
  return `<p class="eyebrow">Дневник</p><h2 class="sheet-title">${entry?.id && entry.date ? 'Промени записа' : 'Какво хапна?'}</h2><form data-form="food" ${entry?.id ? `data-id="${esc(e.id)}"` : ''} data-source="${esc(e.source || 'manual')}" data-basis="${e.basis}" data-unit="${esc(e.unit)}" data-barcode="${esc(e.barcode || '')}" data-brand="${esc(e.brand || '')}"><label class="field"><span>Храна</span><input name="name" value="${esc(e.name)}" maxlength="120" required autocomplete="off" placeholder="Например кисело мляко 2%"></label><div class="form-grid"><label class="field"><span>Дата</span><input name="date" type="date" value="${esc(e.date)}" required></label><label class="field"><span>Хранене</span><select name="meal">${MEALS.map((m) => `<option ${m === e.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label><label class="field"><span>Изядено количество</span><input name="amount" type="number" inputmode="decimal" min="0.01" max="10000" step="any" value="${num(q.amount, 2).replace(/\s/g, '').replace(',', '.')}" required></label><label class="field"><span>Мярка</span><select name="measure">${options.map((u) => `<option ${q.measure === u ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></label></div><div class="serving" data-serving-details ${q.measure === 'именувана порция' ? '' : 'hidden'}><label class="field"><span>Име на порцията от етикета</span><input name="servingLabel" value="${esc(e.servingLabel || '')}" maxlength="120" placeholder="Например 1 купичка"></label><label class="field"><span>${e.unit === 'мл' ? 'Милилитри' : 'Грамове'} в една порция</span><input name="servingQuantity" type="number" inputmode="decimal" min="0.01" max="10000" step="any" value="${servingQuantity}"></label><label class="check-line"><input type="checkbox" name="servingConfirmed" value="yes"> Проверих ${e.unit === 'мл' ? 'милилитрите' : 'грамажа'} на етикета или с везна</label></div><div class="form-grid"><label class="field"><span>Ккал за ${per}</span><input name="kcal" type="number" inputmode="decimal" min="0" max="2000" step="0.1" value="${esc(e.kcal ?? '')}" required></label><label class="field"><span>Протеин за ${per}, г</span><input name="protein" type="number" inputmode="decimal" min="0" max="200" step="0.1" value="${esc(e.protein ?? '')}"></label></div><div class="food-preview" data-food-preview role="status" aria-live="polite"></div>${macroFields(e)}<p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Запиши</button></form>`;
}

export function entrySheet(e) {
  return `<p class="eyebrow">${esc(e.meal)}</p><h2 class="sheet-title">${esc(e.name)}</h2><p class="sheet-sub">${num(e.amount, 1)} ${esc(e.unit)} · ${num((e.kcal * e.amount) / e.basis)} ккал${e.protein != null ? ` · ${num((e.protein * e.amount) / e.basis, 1)} г протеин` : ''}</p><div class="list"><button type="button" class="list-row" data-action="edit-food" data-id="${esc(e.id)}"><span class="list-ic">${icon('edit', 20)}</span><span class="list-text"><b>Промени</b></span>${icon('chevron', 18)}</button><button type="button" class="list-row" data-action="copy-food" data-id="${esc(e.id)}"><span class="list-ic">${icon('copy', 20)}</span><span class="list-text"><b>Копирай в други дни</b></span>${icon('chevron', 18)}</button><button type="button" class="list-row" data-action="save-food" data-id="${esc(e.id)}"><span class="list-ic">${icon('star', 20)}</span><span class="list-text"><b>Запази в „Мои храни“</b><small>За бързо добавяне следващия път</small></span>${icon('chevron', 18)}</button><button type="button" class="list-row is-danger" data-action="delete-food" data-id="${esc(e.id)}"><span class="list-ic">${icon('trash', 20)}</span><span class="list-text"><b>Изтрий записа</b></span>${icon('chevron', 18)}</button></div>`;
}

export function foodCopyForm(entry, date) {
  return `<h2 class="sheet-title">Копирай в други дни</h2><p class="sheet-sub">${esc(entry.name)} · ${num(entry.amount, 1)} ${esc(entry.unit)}</p><form data-form="copy-food" data-id="${esc(entry.id)}"><label class="field"><span>Хранене</span><select name="meal">${MEALS.map((m) => `<option ${m === entry.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label><fieldset class="field"><legend>Дни от тази седмица</legend><div class="day-picks">${weekDates(date)
    .map(
      (d, i) =>
        `<label class="day-pick"><input type="checkbox" name="dates" value="${d}"><span><small>${SHORT_DAYS[i]}</small><b>${Number(d.slice(-2))}</b></span></label>`,
    )
    .join('')}</div></fieldset><label class="field"><span>Или друга дата</span><input name="otherDate" type="date"></label><p class="form-error" role="alert"></p><button class="btn btn-primary btn-block" type="submit">Копирай</button></form>`;
}

export function scannerSheet() {
  return `<p class="eyebrow">Баркод</p><h2 class="sheet-title">От етикета в дневника</h2><p class="sheet-sub">Насочи камерата към баркода на опаковката. Разчитаме го на телефона и търсим продукта в Open Food Facts; изпращаме само цифрите.</p><div class="scanner"><video id="scan-video" autoplay muted playsinline></video><div class="scanner-guide">${icon('scan', 56)}<span>Баркодът в рамката</span></div></div><div class="sheet-actions"><button type="button" class="btn btn-primary" data-action="start-camera">${icon('camera', 18)} Включи камерата</button><label class="btn btn-secondary">${icon('upload', 18)} Снимка<input type="file" accept="image/*" capture="environment" data-change="scan-image" class="sr-only"></label></div><form data-form="barcode" class="barcode-form"><label class="field"><span>Или въведи цифрите</span><input name="barcode" inputmode="numeric" pattern="[0-9]{8}|[0-9]{12,14}" maxlength="14" required autocomplete="off"></label><button class="btn btn-secondary" type="submit">Провери</button><p class="form-error" role="alert"></p></form><p class="fine">Продукт, който си записвал веднъж, познаваме и без интернет. Ако го няма в Open Food Facts, въведи стойностите от етикета веднъж.</p>`;
}

export function emptyDiaryArt() {
  return mascot('list', 'empty-art');
}
