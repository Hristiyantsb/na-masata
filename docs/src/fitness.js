import { diaryEntry, MEALS, daysBefore } from './domain.js';
export const NUTRIENTS = Object.freeze({
  protein: { label: 'Протеин', unit: 'г', max: 200 },
  carbs: { label: 'Въглехидрати', unit: 'г', max: 200 },
  fat: { label: 'Мазнини', unit: 'г', max: 200 },
  fiber: { label: 'Фибри', unit: 'г', max: 200 },
  sugars: { label: 'Захари', unit: 'г', max: 200 },
  saturatedFat: { label: 'Наситени мазнини', unit: 'г', max: 200 },
  sodium: { label: 'Натрий', unit: 'мг', max: 100000 },
});
export function nutritionTotals(entries) {
  const result = { kcal: 0, known: {}, missing: {} };
  for (const key of Object.keys(NUTRIENTS)) {
    result.known[key] = 0;
    result.missing[key] = 0;
  }
  for (const e of entries) {
    const scale = e.amount / e.basis;
    result.kcal += e.kcal * scale;
    for (const key of Object.keys(NUTRIENTS)) {
      if (e[key] == null) result.missing[key]++;
      else result.known[key] += e[key] * scale;
    }
  }
  return result;
}
export function weekDates(date) {
  if (!validDate(date)) throw Error('Невалидна дата.');
  const day = new Date(date + 'T12:00:00').getDay();
  const monday = daysBefore(date, (day + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => daysBefore(monday, -i));
}
export function validDate(date) {
  return (
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date + 'T12:00:00').toISOString().slice(0, 10) === date
  );
}
export function foodHistory(entries, query = '', limit = 20) {
  const seen = new Set(),
    list = [];
  for (const e of [...entries].reverse()) {
    const key = JSON.stringify([
      e.name.toLocaleLowerCase('bg'),
      e.brand || '',
      e.barcode,
      e.unit,
      e.basis,
      e.kcal,
      ...Object.keys(NUTRIENTS).map((k) => e[k] ?? null),
    ]);
    if (
      !seen.has(key) &&
      (e.name + ' ' + (e.brand || ''))
        .toLocaleLowerCase('bg')
        .includes(query.toLocaleLowerCase('bg'))
    ) {
      seen.add(key);
      list.push(e);
    }
    if (list.length >= limit) break;
  }
  return list;
}
export function copiesForDates(entries, dates, meal = null) {
  const unique = [...new Set(dates)];
  if (!unique.length || unique.length > 31 || unique.some((d) => !validDate(d)))
    throw Error('Избери от 1 до 31 валидни дати.');
  if (meal !== null && !MEALS.includes(meal)) throw Error('Невалидно хранене.');
  if (!entries.length || entries.length > 200) throw Error('Избери от 1 до 200 записа.');
  return unique.flatMap((date) =>
    entries.map((e) => diaryEntry({ ...e, id: crypto.randomUUID(), date, meal: meal || e.meal })),
  );
}
export function parseAdiosExport(text) {
  if (text.length > 5_000_000) throw Error('Файлът е твърде голям.');
  const value = JSON.parse(text),
    items = Array.isArray(value) ? value : value.items;
  if (!Array.isArray(items) || items.length > 20000)
    throw Error('Очаква се масив от записи или обект с items.');
  const mealMap = { breakfast: 'Закуска', lunch: 'Обяд', dinner: 'Вечеря', snacks: 'Междинно' };
  return items.map((e) =>
    diaryEntry({
      name: e.name,
      brand: e.brand,
      barcode: e.barcode,
      meal: mealMap[e.meal],
      date: e.loggedDate,
      amount: Number(e.numberOfServings),
      unit: 'порции',
      basis: 1,
      kcal: e.caloriesPerServing,
      protein: e.proteinPerServing,
      carbs: e.carbsPerServing,
      fat: e.fatPerServing,
      fiber: e.fiberPerServing,
      sugars: e.sugarsPerServing,
      saturatedFat: e.saturatedFatPerServing,
      sodium: e.sodiumMgPerServing,
      servingLabel: e.servingLabel,
      source: 'manual',
    }),
  );
}
