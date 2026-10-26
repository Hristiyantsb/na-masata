import { RECIPES, PRODUCTS, ALLERGENS, EQUIPMENT, STORES } from './catalog.js';
import { nutrition } from './nutrition.js';
import {
  recipe,
  GOALS,
  DIETS,
  PLANS,
  MEALS,
  groceries,
  total,
  recipeCost,
  candidates,
  diaryTotals,
  localDate,
  daysBefore,
  packPrice,
  packSize,
  SHOPPING_UNITS,
  shoppingSummary,
} from './domain.js';
import { esc, icon, button, money, num, heading, foodArt, empty, field, badge } from './ui.js';
export function shell(page, content, connectivity = {}) {
  const items = [
    ['plan', 'plan', 'Меню'],
    ['recipes', 'book', 'Рецепти'],
    ['shopping', 'bag', 'Покупки'],
    ['diary', 'diary', 'Дневник'],
  ];
  return `<a class="skip-link" href="#content">Към съдържанието</a><aside class="sidebar"><a class="wordmark" href="#plan"><img class="brand-wordmark" src="assets/brand-wordmark.webp" alt="На маса" width="480" height="94" decoding="async" /></a><p class="sidebar-caption">Меню, рецепти и покупки.</p><nav aria-label="Основно меню">${items.map(([id, i, n]) => `<a href="#${id}" ${id === page ? 'aria-current="page"' : ''}>${icon(i)}<span>${n}</span>${id === 'diary' ? '<small>ПЛЮС</small>' : ''}</a>`).join('')}</nav><div class="sidebar-bottom"><a class="plan-link" href="#plans"><span class="plan-seal">НМ</span><span><b>Избери своя план</b><small>От 9 € на месец</small></span>${icon('arrow', 16)}</a><a class="settings-link" href="#settings">${icon('settings', 18)}Настройки и данни</a></div></aside><main id="content" tabindex="-1"><div class="topbar"><a class="mobile-wordmark" href="#plan" aria-label="На маса"><img class="brand-wordmark" src="assets/brand-wordmark.webp" alt="На маса" width="480" height="94" decoding="async" /></a><span class="preview-label"><i></i> Работна версия</span><a href="#plans">Планове ${icon('arrow', 14)}</a></div><div id="connection-status" class="connection-status" role="status" ${!connectivity.offline && !connectivity.update ? 'hidden' : ''}>${connectivity.offline ? '<span>Без интернет · локален режим</span>' : ''}${connectivity.update ? button('Нова версия · Обнови', 'app-update', '', 'quiet') : ''}</div>${content}<footer><span>На масата · България</span><a href="#privacy">Поверителност</a><span>България · EUR</span></footer></main><nav class="mobile-nav" aria-label="Мобилно меню">${items.map(([id, i, n]) => `<a href="#${id}" ${id === page ? 'aria-current="page"' : ''}>${icon(i)}<span>${n}</span></a>`).join('')}<a href="#settings" ${page === 'settings' ? 'aria-current="page"' : ''}>${icon('settings')}<span>Още</span></a></nav>`;
}
export function planView(state, undo) {
  const s = state.settings,
    cost = total(state),
    rows = groceries(state).filter((r) => r.packs);
  const days = [...new Set(state.plan.map((e) => e.day))];
  return (
    heading(
      'СЕДМИЧНО МЕНЮ',
      'Тази седмица на масата',
      `${s.people} ${s.people === 1 ? 'човек' : 'души'} · ${s.days} дни`,
      button(icon('settings', 16) + ' Предпочитания', 'wizard', '', 'button outline'),
    ) +
    (!state.plan.length
      ? empty(
          'Какво ще сготвим?',
          'Избери магазини, бюджет и какво обичаш да ядеш.',
          button('Създай меню', 'wizard', '', 'button primary'),
        )
      : `
  <div class="plan-store-line">${icon('bag', 16)}<span>${s.stores.map(esc).join(' · ')}</span></div>
  <section class="week-overview"><div><p class="eyebrow">ПРИМЕРНА СМЕТКА</p><div class="budget-total">${money(cost)} <span>/ ${money(s.budget)}</span></div><div class="budget-track"><span style="width:${Math.min((cost / s.budget) * 100, 100)}%;${cost > s.budget ? 'background:var(--coral)' : ''}"></span></div><p>${cost > s.budget ? 'Над бюджета с ' + money(cost - s.budget) : 'За цели опаковки'}</p></div><a class="shopping-shortcut" href="#shopping"><div><small>ЗА ПАЗАРУВАНЕ</small><h3>Списъкът ти ${icon('arrow', 18)}</h3><p>${rows.filter((r) => state.checked[r.k]).length} / ${rows.length} продукта</p></div></a></section>
  <div class="section-bar plan-tools"><p>${esc(GOALS[s.goal][0])} · ${esc(DIETS[s.diet])}</p><div class="inline-actions">${undo ? button(icon('back', 16) + ' Върни', 'undo', '', 'quiet') : ''}${button(icon('lock', 16) + (state.locked ? ' Отключи' : ' Заключи'), 'lock', '', 'quiet')}</div></div>
  ${state.locked ? '<p class="notice compact">Менюто е заключено. Отключи го, за да местиш или сменяш ястия.</p>' : ''}
  <div class="week-days">${days
    .map(
      (day) =>
        `<section class="plan-day"><h2 class="day-heading"><span>Ден ${day + 1}</span><span>${state.plan
          .filter((e) => e.day === day)
          .map((e) => e.slot)
          .join(' и ')}</span></h2>${state.plan
          .map((e, i) => {
            if (e.day !== day) return '';
            const r = recipe(e.id),
              n = nutrition(r);
            return `<article class="planned-meal ${state.cooked[i] ? 'is-cooked' : ''}"><div class="meal-row"><button class="meal-main" data-action="recipe" data-id="${r.id}" data-index="${i}">${foodArt(r)}<span class="meal-copy"><span class="recipe-category">${esc(r.type)}</span><b>${esc(r.name)}</b><span class="recipe-meta">${r.time} мин <i></i>${e.people} порции <i></i>≈ ${n.kcal} ккал</span></span></button>${button(icon('check', 17), 'cooked', `data-index="${i}" aria-label="${state.cooked[i] ? 'Отмени сготвено' : 'Отбележи като сготвено'}" aria-pressed="${!!state.cooked[i]}"`, 'icon-button done-button')}</div><div class="meal-actions"><span>${money(recipeCost(r, e.people, state))}<small> съставки</small></span><div>${button('Премести', 'move-meal', `data-index="${i}" ${state.locked ? 'disabled' : ''}`, 'quiet')}${button('Повтори', 'repeat-meal', `data-index="${i}" ${state.locked ? 'disabled' : ''}`, 'quiet')}${button(icon('swap', 14) + ' Смени', 'swap', `data-index="${i}" ${state.locked ? 'disabled' : ''}`, 'quiet')}</div></div></article>`;
          })
          .join('')}</section>`,
    )
    .join('')}</div>
  <div class="plan-bottom">${button(icon('swap', 18) + ' Ново меню', 'regenerate', state.locked ? 'disabled' : '', 'button primary')}${button(icon('download', 17) + ' Изтегли', 'export-plan', '', 'quiet')}</div><p class="fine">${RECIPES.length} рецепти. Цените са примерни, а хранителните стойности — приблизителни. Сметката за покупките включва цели опаковки.</p>`)
  );
}
export function recipeCards(list, state, swapIndex = null) {
  return list
    .map((r) => {
      const n = nutrition(r);
      return `<article class="recipe-card"><button class="recipe-card-open" data-action="${swapIndex === null ? 'recipe' : 'choose-swap'}" data-id="${r.id}" ${swapIndex !== null ? `data-index="${swapIndex}"` : ''}>${foodArt(r)}<span class="recipe-category">${r.type}</span><h3>${r.name}</h3><span class="recipe-meta">${r.time} мин <i></i>≈ ${n.kcal} ккал <i></i>${n.protein} г протеин</span></button>${swapIndex === null ? button(icon('heart', 18), 'favorite', `data-id="${r.id}" aria-label="Любима рецепта: ${esc(r.name)}" aria-pressed="${state.favorites.includes(r.id)}"`, 'icon-button favorite') : ''}</article>`;
    })
    .join('');
}
export function recipesView(state, query, favorites) {
  const list = candidates(state.settings).filter(
    (r) =>
      (!favorites || state.favorites.includes(r.id)) &&
      r.name.toLocaleLowerCase('bg').includes(query.toLocaleLowerCase('bg')),
  );
  return (
    heading(
      'РЕЦЕПТИ',
      'Книгата с рецепти',
      'Рецепти, съобразени с твоите предпочитания.',
      button(icon('settings', 16) + ' Филтри', 'wizard', '', 'button outline'),
    ) +
    `<div class="search-toolbar"><label class="search-field">${icon('search')}<input type="search" data-input="recipe-search" value="${esc(query)}" placeholder="Потърси ястие…" aria-label="Търси рецепта"></label>${button(icon('heart', 17) + ' Любими', 'favorites-filter', `aria-pressed="${favorites}"`, 'button outline')}</div><div class="section-bar"><p>${list.length} подходящи рецепти</p><p class="fine">Калории и протеин за една порция</p></div><div class="recipe-grid">${recipeCards(list, state)}</div>${!list.length ? empty('Няма съвпадения.', 'Промени търсенето или филтрите.') : ''}`
  );
}
export function recipeDetail(r, state, index = null) {
  const n =
      index === null ? state.settings.people : state.plan[index]?.people || state.settings.people,
    allergens = [...new Set(Object.keys(r.ing).flatMap((k) => PRODUCTS[k][4]))],
    macros = nutrition(r);
  return `<p class="eyebrow">${r.type}</p><h2 class="dialog-title">${r.name}</h2><div class="recipe-detail-meta"><span>${icon('clock', 16)}${r.time} мин${r.prepNote ? ' + накисване' : ''}</span><span>${n} порции</span><span>${r.equipment.map((k) => EQUIPMENT[k]).join(' + ') || 'Без уреди'}</span></div>${index !== null ? `<form data-form="servings" data-index="${index}" class="servings-form"><label>Порции за това хранене <select name="people" ${state.locked ? 'disabled' : ''}>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${n === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label><button type="submit" class="button outline" ${state.locked ? 'disabled' : ''}>Преизчисли</button><p class="form-error" role="alert"></p></form>` : ''}<div class="nutrition-strip"><div><b>≈ ${macros.kcal}</b><small>ккал / порция</small></div><div><b>${macros.protein} г</b><small>протеин / порция</small></div><div><b>${money(recipeCost(r, n, state))}</b><small>съставки за ${n} порции</small></div></div>${r.prepNote ? `<div class="notice">${esc(r.prepNote)}</div>` : ''}<div class="recipe-columns"><section><h3>Съставки</h3>${Object.entries(
    r.ing,
  )
    .map(
      ([k, v]) =>
        `<label class="ingredient-line"><input type="checkbox"><span>${PRODUCTS[k][0]}</span><b>${num((v * n) / 2, 1)} ${PRODUCTS[k][2]}</b></label>`,
    )
    .join(
      '',
    )}<p class="fine">Алергени: ${allergens.map((k) => ALLERGENS[k]).join(', ') || 'няма от отбелязаните'}. Проверявай етикетите.</p></section><section><h3>Стъпка по стъпка</h3>${r.steps.map((s, i) => `<div class="recipe-step"><span>${String(i + 1).padStart(2, '0')}</span><p>${esc(s.replace(/(\d+) мл/g, (_, v) => num((Number(v) * n) / 2, 1) + ' мл').replace(/ за 2 порции/g, ''))}</p></div>`).join('')}<p class="fine">Количествата са за ${n} порции. При части от яйце го разбий и отмери съответната част. При повече порции времето може да се увеличи.</p></section></div><div class="inline-actions">${button(icon('heart', 16) + (state.favorites.includes(r.id) ? ' В любими' : ' Запази'), 'favorite', `data-id="${r.id}"`, 'button outline')}${button(icon('plus', 16) + ' В дневника', 'diary-recipe', `data-id="${r.id}"`, 'button primary')}${button('JSON', 'export-recipe', `data-id="${r.id}"`, 'quiet')}</div><form data-form="note" data-id="${r.id}" class="note-form"><label class="field"><span>Моята бележка</span><textarea name="note" maxlength="4000" rows="3" placeholder="Следващия път…">${esc(state.notes[r.id] || '')}</textarea></label><button class="button outline" type="submit">Запази бележка</button></form>`;
}
export function shoppingView(state) {
  const rows = groceries(state),
    summary = shoppingSummary(state);
  return (
    heading(
      'ПОКУПКИ',
      'Списък за пазаруване',
      'Количествата са събрани за цялото меню.',
      button(icon('download', 17) + ' Списък', 'export-shopping', '', 'button outline'),
    ) +
    `<section class="shopping-overview"><div><small>ЦЕЛИ ОПАКОВКИ</small><strong>${money(summary.knownTotal)}</strong><span>${summary.unknownPrices ? `+ ${summary.unknownPrices} продукта без цена` : 'Известна сума за покупките'}</span></div><div><small>ПРОДУКТИ</small><strong>${rows.filter((r) => r.packs).length}</strong><span>${rows.filter((r) => r.packs && state.checked[r.k]).length} отметнати</span></div><div><small>ПЪРВО ПОГЛЕДНИ ВКЪЩИ</small><p>Наличностите се приспадат автоматично.</p>${button('Моите наличности ' + icon('arrow', 16), 'pantry', '', 'quiet')}</div></section><div class="notice compact">Примерни цени, не оферти на магазините. Редактирай цената и размера на опаковката от сумата вдясно.</div>${state.settings.stores
      .map((store) => {
        const list = rows.filter((r) => r.store === store && r.packs);
        if (!list.length) return '';
        return `<section class="shopping-group"><div class="section-bar"><h2>${esc(store)}</h2><span>${money(list.reduce((s, r) => s + r.cost, 0))}</span></div>${list.map((r) => `<div class="shopping-row ${state.checked[r.k] ? 'checked' : ''}"><label class="shopping-check"><input type="checkbox" data-change="purchased" data-id="${r.k}" ${state.checked[r.k] ? 'checked' : ''}><span class="check-display">${icon('check', 14)}</span><span><b>${r.name}</b><small>${r.packs} × ${num(r.size, 1)} ${r.unit} <i>·</i> За менюто ${num(r.need, 1)} ${r.unit}</small></span></label><select class="store-select" aria-label="Магазин за ${r.name}" data-change="store" data-id="${r.k}">${state.settings.stores.map((s) => `<option ${s === r.store ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>${button(money(r.cost) + '<small>Редактирай</small>', 'price', `data-id="${r.k}"`, 'price-button')}</div>`).join('')}</section>`;
      })
      .join('')}${
      rows.some((r) => !r.packs)
        ? `<details class="owned-products"><summary>Имаш достатъчно вкъщи (${rows.filter((r) => !r.packs).length})</summary>${rows
            .filter((r) => !r.packs)
            .map((r) => `<p>${r.name} <span>${num(r.need, 1)} ${r.unit}</span></p>`)
            .join('')}</details>`
        : ''
    }${!rows.length ? empty('Списъкът чака твоето меню.', 'Избери ястия, за да съберем съставките.', button('Създай меню', 'wizard', '', 'button primary')) : ''}${extraGroceriesView(state)}<div class="inline-actions">${button('Копирай списъка', 'copy-shopping', '', 'button outline')}${button('Изчисти отметките', 'uncheck-all', '', 'quiet')}</div><p class="fine">Отмятането отбелязва покупката; не добавя автоматично наличност. След готвене актуализирай количествата вкъщи.</p>`
  );
}
export function pantryView(state) {
  return (
    heading(
      'ПРЕДИ ДА ПАЗАРУВАШ',
      'Какво имаш вкъщи?',
      'Въведи количества, а не брой опаковки.',
      `<a class="button outline" href="#shopping">Към списъка ${icon('arrow', 16)}</a>`,
    ) +
    `<form data-form="pantry"><div class="pantry-grid">${Object.entries(PRODUCTS)
      .map(([k, p]) =>
        field(
          `${p[0]} <small>(${p[2]})</small>`,
          k,
          state.pantry[k] || 0,
          'number',
          `min="0" max="100000" step="${p[2] === 'бр.' ? '1' : '.1'}"`,
        ),
      )
      .join(
        '',
      )}</div><button class="button primary" type="submit">Запази наличностите</button></form>`
  );
}
export function diaryView(state, date) {
  const entries = state.diary.filter((e) => e.date === date),
    totals = diaryTotals(entries),
    target = state.dailyTarget;
  return (
    heading(
      'ХРАНЕНЕТО В КОНТЕКСТ',
      'Моят дневник.',
      'Без догадки. Записваш количеството, виждаш сметката.',
      button(icon('plus', 17) + ' Добави храна', 'add-food', '', 'button primary'),
    ) +
    `<div class="diary-date-bar"><label class="date-field">${icon('diary', 18)}<input type="date" value="${date}" data-change="diary-date" aria-label="Дата в дневника"></label><span class="pill">Меню Плюс · демо</span></div><section class="diary-overview"><div class="calorie-ring" style="--progress:${target ? Math.min((totals.kcal / target) * 100, 100) : 0}%"><div><strong>${num(totals.kcal)}</strong><span>ккал записани</span></div></div><div class="diary-totals"><h2>${entries.length ? 'Денят ти дотук.' : 'Всяко хранене има място.'}</h2><p>${target ? (totals.kcal <= target ? `${num(target - totals.kcal)} ккал до твоята цел` : `${num(totals.kcal - target)} ккал над твоята цел`) : 'Задай лична цел, ако искаш да следиш напредък.'}</p><div><span><b>${num(totals.protein, 1)} г</b> протеин${totals.unknownProtein ? ' *' : ''}</span>${button(target ? 'Промени целта' : 'Задай цел', 'daily-target', '', 'quiet')}</div>${totals.unknownProtein ? '<p class="fine">* Някои записи нямат стойност за протеин.</p>' : ''}</div><button class="scan-card" data-action="scanner">${icon('scan', 32)}<b>Сканирай баркод</b><span>От опаковката към дневника</span>${icon('arrow', 18)}</button></section><div class="diary-list">${MEALS.map(
      (meal) => {
        const list = entries.filter((e) => e.meal === meal),
          t = diaryTotals(list);
        return `<section class="diary-meal"><div class="section-bar"><h2>${meal}</h2><span>${num(t.kcal)} ккал ${button(icon('plus', 16), 'add-food', `data-meal="${meal}" aria-label="Добави в ${meal}"`, 'icon-button')}</span></div>${list.length ? list.map((e) => `<div class="diary-entry"><span class="entry-mark">${icon(e.source === 'recipe' ? 'book' : e.source === 'openfoodfacts' ? 'scan' : 'leaf', 20)}</span><div><b>${esc(e.name)}</b><small>${num(e.amount, 1)} ${e.unit} · ${e.source === 'recipe' ? 'Оценка по рецепта' : e.source === 'openfoodfacts' ? 'Open Food Facts' : 'Въведено от теб'}</small></div><strong>${num((e.kcal * e.amount) / e.basis)}<small>ккал</small></strong>${button('Редактирай', 'edit-food', `data-id="${esc(e.id)}"`, 'quiet')}${button(icon('trash', 16), 'delete-food', `data-id="${esc(e.id)}" aria-label="Изтрий ${esc(e.name)}"`, 'icon-button')}</div>`).join('') : '<p class="meal-empty">Още няма записано хранене.</p>'}</section>`;
      },
    ).join(
      '',
    )}</div><section class="week-chart"><div class="section-bar"><h2>Последните 7 дни</h2><p class="fine">Записани калории, не оценка на режима</p></div><div class="chart-bars">${Array.from(
      { length: 7 },
      (_, i) => {
        const d = daysBefore(date, 6 - i),
          n = diaryTotals(state.diary.filter((e) => e.date === d)).kcal;
        const max = Math.max(
          1,
          ...Array.from(
            { length: 7 },
            (_, j) => diaryTotals(state.diary.filter((e) => e.date === daysBefore(date, j))).kcal,
          ),
        );
        return `<div><span>${num(n)}</span><i style="height:${Math.max(2, (n / max) * 100)}px" title="${d}: ${num(n)} ккал"></i><small>${new Date(d + 'T12:00:00').toLocaleDateString('bg-BG', { weekday: 'short' })}</small></div>`;
      },
    ).join(
      '',
    )}</div></section><p class="fine">Дневникът е достъпен за изпробване. Няма активен абонамент или плащане. Не определяме автоматично дневна калорийна цел.</p>`
  );
}
export function foodForm(date, meal = 'Обяд', entry = null) {
  const e = entry || {
    name: '',
    date,
    meal,
    unit: 'г',
    amount: 100,
    basis: 100,
    kcal: '',
    protein: '',
    source: 'manual',
  };
  return `<p class="eyebrow">ХРАНИТЕЛЕН ДНЕВНИК</p><h2 class="dialog-title">${entry ? 'Редактирай храната.' : 'Какво хапна?'}</h2><form data-form="food" ${entry ? `data-id="${esc(e.id)}"` : ''} data-source="${e.source}" data-basis="${e.basis}" data-barcode="${e.barcode || ''}">${field('Име на храната', 'name', e.name, 'text', 'maxlength="120" required')}<div class="form-grid">${field('Дата', 'date', e.date, 'date', 'required')}<label class="field"><span>Хранене</span><select name="meal">${MEALS.map((m) => `<option ${m === e.meal ? 'selected' : ''}>${m}</option>`).join('')}</select></label>${field('Изядено количество', 'amount', e.amount, 'number', 'min="0.1" max="10000" step="0.1" required')}<label class="field"><span>Мерна единица</span><select name="unit">${(e.source === 'recipe' ? ['порции'] : ['г', 'мл']).map((u) => `<option ${e.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>${field(`Ккал на ${e.basis === 1 ? 'порция' : '100 г / мл'}`, 'kcal', e.kcal, 'number', 'min="0" max="2000" step="0.1" required')}${field(`Протеин (г) на ${e.basis === 1 ? 'порция' : '100 г / мл'}`, 'protein', e.protein ?? '', 'number', 'min="0" max="200" step="0.1"')}</div><p class="fine">${e.source === 'recipe' ? 'Стойностите са приблизителни оценки от рецептата.' : 'Въведи стойностите от етикета за 100 г или 100 мл. Празното поле за протеин означава „неизвестно“, не нула.'}</p><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Запази в дневника ${icon('check', 18)}</button></form>`;
}
export function pricingView(interval) {
  const annual = interval === 'yearly';
  return (
    heading('АБОНАМЕНТИ', 'Двата плана', 'Меню за седмицата или поглед върху цялото ти хранене.') +
    `<div class="billing-toggle" role="group" aria-label="Период на плащане">${button('Месечно', 'billing-period', 'data-value="monthly" aria-pressed="' + !annual + '"', !annual ? 'active' : '')}${button('Годишно <span>2 месеца по-малко</span>', 'billing-period', 'data-value="yearly" aria-pressed="' + annual + '"', annual ? 'active' : '')}</div><div class="pricing-grid">${Object.entries(
      PLANS,
    )
      .map(
        ([id, p]) =>
          `<article class="pricing-card ${id === 'plus' ? 'plus-plan' : ''}"><div class="pricing-label"><span>${id === 'plus' ? 'ЦЯЛАТА КАРТИНА' : 'ЕЖЕДНЕВИЕТО, ПОДРЕДЕНО'}</span>${icon(id === 'plus' ? 'scan' : 'book', 25)}</div><h2>${p.name}</h2><p>${id === 'plus' ? 'Менюто и хранителният ти дневник на едно място.' : 'По-малко време в чудене какво да сготвиш.'}</p><div class="plan-price">${p[interval]} €<span>/ ${annual ? 'година' : 'месец'}</span></div><p class="price-detail">${annual ? `${money(p.yearly / 12)} на месец · ${p.yearly} € наведнъж годишно` : 'Плащане всеки месец'}${annual ? `<br>Спестяваш ${p.monthly * 12 - p.yearly} € спрямо 12 месечни плащания` : ''}</p><ul>${(id === 'menu' ? ['Персонално седмично меню', 'Филтри за хранене, уреди и съставки', 'Общ списък и бюджет за покупки', 'Любими рецепти и лични бележки'] : ['Всичко от план Меню', 'Хранителен дневник и калории', 'Баркод скенер и данни за продукти', 'Проследяване на протеин и лична цел']).map((t) => `<li>${icon('check', 16)}${t}</li>`).join('')}</ul>${button('За този план ' + icon('arrow', 16), 'plan-info', `data-plan="${id}"`, 'button ' + (id === 'plus' ? 'primary' : 'outline') + ' full')}${id === 'plus' ? '<div class="planned-feature">Следващ етап: оценка на ястие по снимка с потвърждение на порцията.</div>' : ''}</article>`,
      )
      .join(
        '',
      )}</div><div class="pricing-status"><span class="status-dot"></span><div><b>В момента разглеждаш демонстрационната версия.</b><p>Не събираме плащания. Цените са зададени за бъдещото пускане. Преди покупка ще виждаш точната сума, периода и условията.</p></div></div><section class="pricing-faq"><h2>Преди да избереш</h2><details><summary>Какво означава годишен план?</summary><p>Едно плащане от 90 € за Меню или 290 € за Меню Плюс за 12 месеца. Месечната равностойност е само за сравнение.</p></details><details><summary>Готово ли е разпознаването на храна по снимка?</summary><p>Не. Подготвена е отделна връзка за тази услуга. Няма да показваме измислени стойности. Баркодът и ръчното въвеждане са различни от оценката на готово ястие по снимка.</p></details><details><summary>Точни ли са калориите?</summary><p>За рецепти са приблизителни сметки от съставките. За продукти използвай етикета и действително изяденото количество. Външните продуктови данни могат да са непълни.</p></details></section>`
  );
}
export function settingsView(state, offline = {}) {
  return (
    heading('МОЯТ ПРОФИЛ', 'Настройки', 'Настройките и данните са под твой контрол.') +
    `<div class="settings-sections"><section class="settings-card"><div><h2>Приложението на телефона</h2><p>Добави го на началния екран. След първото успешно онлайн зареждане менюто, рецептите, покупките и дневникът могат да работят без интернет, докато браузърът пази данните.</p><p id="offline-readiness" class="fine" role="status">${offline.ready ? 'Офлайн копието е готово на това устройство.' : offline.error ? 'Не успяхме да подготвим офлайн копие. Приложението остава достъпно онлайн.' : 'Офлайн копието се подготвя при онлайн зареждане.'}</p><div class="inline-actions">${button('Добави на началния екран', 'install-app', '', 'button outline')}${button('Провери за обновление', 'check-update', '', 'quiet')}</div></div></section><section class="settings-card"><span class="round-icon">${icon('user', 24)}</span><div><h2>Моето домакинство</h2><p>${state.settings.people} души · ${state.settings.days} дни · ${DIETS[state.settings.diet]}</p>${button('Промени предпочитанията', 'wizard', '', 'button outline')}</div></section><section class="settings-card"><span class="round-icon">${icon('book', 24)}</span><div><h2>Моят план</h2><p>Демонстрационен достъп. Нямаш активен платен абонамент.</p><a class="button outline" href="#plans">Разгледай плановете ${icon('arrow', 16)}</a></div></section><section class="settings-card"><span class="round-icon">${icon('lock', 24)}</span><div><h2>Твоите данни</h2><p>Запазват се в този браузър. Няма синхронизация между устройства.</p><div class="inline-actions">${button('Изтегли копие', 'backup', '', 'button outline')}<label class="button outline file-label">Възстанови копие<input id="restore-input" type="file" accept="application/json,.json" data-change="restore" hidden></label></div><p class="fine">Копието включва менюто, предпочитанията, бележките и дневника. Изтегляй го на устройство, на което имаш доверие.</p>${button('Изтрий локалните данни', 'reset', '', 'quiet danger')}</div></section><section class="settings-card"><span class="round-icon">${icon('info', 24)}</span><div><h2>За „На масата“</h2><p>Български рецепти и спокойно планиране. Работна версия 0.5.0.</p><a href="https://github.com/Hristiyantsb/na-masata" target="_blank" rel="noopener">Проектът в GitHub ↗</a></div></section></div>`
  );
}
export function privacyView() {
  return (
    heading(
      'ПРОЗРАЧНО ОТ САМОТО НАЧАЛО',
      'Данните остават при теб.',
      'Как работи тази демонстрационна версия.',
    ) +
    `<div class="prose"><h2>Локално съхранение</h2><p>Предпочитанията, менюто, наличностите и дневникът се пазят в localStorage на този браузър. Изчистването на данните на браузъра ги премахва. Използвай резервно копие преди смяна на устройство.</p><h2>Работа без интернет</h2><p>Приложението пази локално копие на своите файлове за офлайн работа. В този кеш няма карти, платежни заявки или снимки. Изчистването на данните на сайта премахва и това копие. Външните услуги изискват интернет.</p><h2>Камера и снимки</h2><p>Камерата се включва само след твое действие. Разчитането на баркод е на устройството. Кадрите не се записват и не се изпращат към AI. Достъпът се спира при затваряне на скенера.</p><h2>Външни услуги</h2><p>Публикуването е чрез GitHub Pages. При бъдещо включване на продуктово търсене баркодът ще се изпраща към API на приложението и Open Food Facts. Ще виждаш източника и ще потвърждаваш количеството преди запис. Не е включен рекламен тракинг.</p><h2>Плащания</h2><p>Платежната услуга още не е активирана. Тази версия не събира картови данни и не създава платени абонаменти.</p><h2>Експорт и изтриване</h2><p>От „Настройки“ можеш да изтеглиш копие или да изтриеш локалните данни. Това не изтрива файлове, които вече си изтеглил.</p><p class="fine">Това е описание на настоящото поведение. Преди търговско пускане операторът трябва да добави своите контакти, условия и приложимата информация за обработката на данни.</p></div>`
  );
}

export function extraGroceriesView(state) {
  return `<section class="extra-groceries"><div class="section-bar"><div><h2>И още за вкъщи</h2><p>Продукти извън рецептите. Остават при смяна на менюто.</p></div>${button(icon('plus', 16) + ' Добави', 'extra-add', '', 'button primary')}</div>${(state.extras || []).map((e) => `<div class="extra-row ${e.checked ? 'checked' : ''}"><label><input type="checkbox" data-change="extra-checked" data-id="${esc(e.id)}" ${e.checked ? 'checked' : ''}><span><b>${esc(e.name)}</b><small>${num(e.amount, 2)} ${e.unit} · ${esc(e.store)}</small></span></label><span class="extra-price">${e.price === null ? 'Без цена' : money(e.price)}</span>${button(icon('settings', 16), 'extra-edit', `data-id="${esc(e.id)}" aria-label="Редактирай ${esc(e.name)}"`, 'icon-button')}${button(icon('close', 16), 'extra-delete', `data-id="${esc(e.id)}" aria-label="Изтрий ${esc(e.name)}"`, 'icon-button')}</div>`).join('') || '<p class="muted">Кафе, плодове, препарати — добави каквото липсва.</p>'}<p class="fine">Въведените цени са за целия ред. Продуктите без цена не се броят за нула в крайната сметка — показваме ги отделно.</p></section>`;
}
export function extraGroceryForm(state, entry = null) {
  const e = entry || {
    name: '',
    amount: 1,
    unit: 'бр.',
    price: null,
    store: state.settings.stores[0],
  };
  return `<h2 class="dialog-title">${entry ? 'Редактирай продукта' : 'Добави към покупките'}</h2><form data-form="extra" ${entry ? `data-id="${esc(entry.id)}"` : ''}>${field('Продукт', 'name', e.name, 'text', 'maxlength="100" required')}<div class="form-grid">${field('Количество', 'amount', e.amount, 'number', 'min="0.01" max="100000" step="0.01" required')}<label class="field"><span>Единица</span><select name="unit">${SHOPPING_UNITS.map((u) => `<option ${u === e.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label>${field('Обща цена за този ред (€), ако я знаеш', 'price', e.price ?? '', 'number', 'min="0" max="100000" step="0.01"')}<label class="field"><span>Магазин</span><select name="store">${[...new Set([...state.settings.stores, e.store])].map((store) => `<option ${store === e.store ? 'selected' : ''}>${esc(store)}</option>`).join('')}</select></label></div><p class="form-error" role="alert"></p><button class="button primary full" type="submit">Запази продукта</button></form>`;
}
