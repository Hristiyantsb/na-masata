import { RECIPES, PRODUCTS, MEAT, STORES, EQUIPMENT, ALLERGENS } from './catalog.js';
import { nutrition, nutritionMatches } from './nutrition.js';
export const recipe = (id) => RECIPES.find((r) => r.id === id);
export const GOALS = {
  balanced: ['Балансирано', 'Разнообразни домашни ястия'],
  protein: ['Повече протеин', 'Поне 25 г на порция'],
  light: ['По-леко', 'До 500 ккал на порция'],
  quick: ['Бързо', 'Готово до 30 минути'],
};
export const DIETS = {
  all: 'Без ограничения',
  veggie: 'Вегетарианско',
  vegan: 'Веган',
  pescatarian: 'Риба, без месо',
};
export const PLANS = Object.freeze({
  menu: { name: 'Меню', monthly: 9, yearly: 90 },
  plus: { name: 'Меню Плюс', monthly: 29, yearly: 290 },
});
export const MEALS = ['Закуска', 'Обяд', 'Вечеря', 'Междинно'];
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const daysBefore = (iso, delta) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - delta);
  return localDate(d);
};
export function defaults() {
  return {
    version: 3,
    onboarded: false,
    settings: {
      people: 2,
      days: 5,
      budget: 50,
      goal: 'balanced',
      maxCalories: 0,
      maxTime: 0,
      diet: 'all',
      allergens: [],
      equipment: ['hob', 'oven'],
      dislikes: [],
      stores: ['Lidl', 'Kaufland'],
      slots: ['Вечеря'],
    },
    plan: [],
    locked: false,
    prices: {},
    packSizes: {},
    pantry: {},
    checked: {},
    storeFor: {},
    favorites: [],
    notes: {},
    cooked: {},
    diary: [],
    extras: [],
    dailyTarget: 0,
  };
}
export function settingsErrors(s) {
  const errors = [];
  if (!Number.isInteger(s.people) || s.people < 1 || s.people > 12)
    errors.push('Избери от 1 до 12 души.');
  if (!Number.isInteger(s.days) || s.days < 1 || s.days > 7) errors.push('Избери от 1 до 7 дни.');
  if (!Number.isFinite(s.budget) || s.budget < 1 || s.budget > 10000)
    errors.push('Бюджетът трябва да е между 1 и 10 000 евро.');
  if (!Object.hasOwn(DIETS, s.diet) || !Object.hasOwn(GOALS, s.goal))
    errors.push('Избери начин на хранене.');
  if (
    !Number.isFinite(s.maxCalories) ||
    s.maxCalories < 0 ||
    s.maxCalories > 2000 ||
    (s.maxCalories > 0 && s.maxCalories < 100)
  )
    errors.push('Лимитът е от 100 до 2000 ккал или без лимит.');
  if (![0, 20, 30, 45, 60, 120].includes(s.maxTime))
    errors.push('Избери валидно време за готвене.');
  for (const [key, values, required] of [
    ['stores', STORES, true],
    ['slots', ['Обяд', 'Вечеря'], true],
    ['equipment', Object.keys(EQUIPMENT), false],
    ['allergens', Object.keys(ALLERGENS), false],
    ['dislikes', Object.keys(PRODUCTS), false],
  ]) {
    if (
      !Array.isArray(s[key]) ||
      s[key].some((v) => !values.includes(v)) ||
      (required && !s[key].length)
    )
      errors.push(
        `Провери избора: ${key === 'stores' ? 'магазини' : key === 'slots' ? 'хранения' : 'филтри'}.`,
      );
  }
  return errors;
}
export function matches(r, s) {
  const keys = Object.keys(r.ing);
  return (
    nutritionMatches(r, s) &&
    !(s.diet === 'veggie' && keys.some((k) => MEAT.includes(k))) &&
    !(s.diet === 'vegan' && keys.some((k) => PRODUCTS[k][5])) &&
    !(s.diet === 'pescatarian' && keys.some((k) => ['chicken', 'mince'].includes(k))) &&
    !keys.some(
      (k) => s.dislikes.includes(k) || PRODUCTS[k][4].some((a) => s.allergens.includes(a)),
    ) &&
    r.equipment.every((k) => s.equipment.includes(k))
  );
}
export const candidates = (s) =>
  settingsErrors(s).length ? [] : RECIPES.filter((r) => matches(r, s));
export const packPrice = (k, state) => state.prices[k] ?? PRODUCTS[k][3];
export const packSize = (k, state) => state.packSizes[k] ?? PRODUCTS[k][1];
export function recipeCost(r, people, state) {
  return Object.entries(r.ing).reduce(
    (sum, [k, v]) => sum + ((v * people) / 2 / packSize(k, state)) * packPrice(k, state),
    0,
  );
}
export function quantities(plan) {
  const all = {};
  for (const e of plan) {
    const r = recipe(e.id);
    if (!r) continue;
    for (const [k, v] of Object.entries(r.ing)) all[k] = (all[k] || 0) + (v * e.people) / 2;
  }
  return all;
}
export function groceries(state, plan = state.plan) {
  return Object.entries(quantities(plan))
    .map(([k, need]) => {
      const have = state.pantry[k] || 0,
        missing = Math.max(0, need - have),
        size = packSize(k, state),
        packs = Math.ceil(Math.max(0, missing - 1e-8) / size);
      return {
        k,
        name: PRODUCTS[k][0],
        unit: PRODUCTS[k][2],
        need,
        have,
        missing,
        size,
        packs,
        cost: packs * packPrice(k, state),
        left: have + packs * size - need,
        store: state.settings.stores.includes(state.storeFor[k])
          ? state.storeFor[k]
          : state.settings.stores[0],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'bg'));
}
export const total = (state, plan = state.plan) =>
  groceries(state, plan).reduce((s, r) => s + r.cost, 0);
/** Finite candidate search. Hard dietary/equipment limits are NEVER relaxed. */
export function generatePlan(state, random = Math.random) {
  const pool = candidates(state.settings);
  if (!pool.length)
    return {
      plan: null,
      reason: 'Няма рецепти за тези ограничения. Промени избора си; няма да го пренебрегнем.',
    };
  let best = null,
    bestScore = Infinity;
  for (let attempt = 0; attempt < 24; attempt++) {
    const plan = [],
      used = new Map();
    for (let day = 0; day < state.settings.days; day++)
      for (const slot of state.settings.slots) {
        const unused = pool.filter((r) => !used.has(r.id)),
          options = unused.length ? unused : pool;
        const before = total(state, plan);
        const ranked = options
          .map((r) => {
            const e = { id: r.id, day, slot, people: state.settings.people };
            return {
              e,
              score: total(state, [...plan, e]) - before + (used.get(r.id) || 0) * 8 + random() * 5,
            };
          })
          .sort((a, b) => a.score - b.score);
        const e = ranked[0].e;
        plan.push(e);
        used.set(e.id, (used.get(e.id) || 0) + 1);
      }
    const cost = total(state, plan),
      over = Math.max(0, cost - state.settings.budget),
      previous = new Set(state.plan.map((e) => e.id));
    const score = over * 20 + cost + plan.filter((e) => previous.has(e.id)).length * 0.3;
    if (score < bestScore) {
      best = plan;
      bestScore = score;
    }
  }
  return {
    plan: best,
    cost: total(state, best),
    withinBudget: total(state, best) <= state.settings.budget,
    available: pool.length,
  };
}
export function planSnapshot(state) {
  return structuredClone({
    plan: state.plan,
    settings: state.settings,
    locked: state.locked,
    cooked: state.cooked,
    checked: state.checked,
  });
}
export function isValidBarcode(value) {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(value)) return false;
  const digits = [...value].map(Number);
  let sum = 0;
  for (let i = digits.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3)
    sum += digits[i] * weight;
  return (10 - (sum % 10)) % 10 === digits.at(-1);
}
export function diaryEntry(input) {
  const amount = Number(input.amount),
    basis = Number(input.basis ?? 100),
    kcal = Number(input.kcal),
    protein = input.protein === '' || input.protein == null ? null : Number(input.protein);
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120)
    throw new Error('Въведи име до 120 знака.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    Number.isNaN(Date.parse(input.date)) ||
    new Date(input.date + 'T12:00:00').toISOString().slice(0, 10) !== input.date
  )
    throw new Error('Невалидна дата.');
  if (!MEALS.includes(input.meal) || !['г', 'мл', 'порции'].includes(input.unit))
    throw new Error('Избери хранене и единица.');
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000 || ![1, 100].includes(basis))
    throw new Error('Въведи валидно количество.');
  if (
    !Number.isFinite(kcal) ||
    kcal < 0 ||
    kcal > 2000 ||
    (protein !== null && (!Number.isFinite(protein) || protein < 0 || protein > 200))
  )
    throw new Error('Провери хранителните стойности.');
  return {
    id: typeof input.id === 'string' ? input.id.slice(0, 100) : crypto.randomUUID(),
    name: input.name.trim(),
    date: input.date,
    meal: input.meal,
    amount,
    unit: input.unit,
    basis,
    kcal,
    protein,
    source: ['manual', 'recipe', 'openfoodfacts'].includes(input.source) ? input.source : 'manual',
    barcode:
      typeof input.barcode === 'string' && isValidBarcode(input.barcode) ? input.barcode : null,
  };
}
export function diaryTotals(entries) {
  return entries.reduce(
    (s, e) => ({
      kcal: s.kcal + (e.kcal * e.amount) / e.basis,
      protein: s.protein + ((e.protein ?? 0) * e.amount) / e.basis,
      unknownProtein: s.unknownProtein + (e.protein === null ? 1 : 0),
    }),
    { kcal: 0, protein: 0, unknownProtein: 0 },
  );
}
/** Reject invalid backups atomically; import never executes code or copies arbitrary keys. */
export function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') throw Error('Невалидно копие.');
  const d = defaults();
  d.settings = { ...d.settings, ...raw.settings };
  if (settingsErrors(d.settings).length) throw Error('Копието съдържа невалидни настройки.');
  d.settings = Object.fromEntries(Object.keys(defaults().settings).map((k) => [k, d.settings[k]]));
  for (const k of ['stores', 'slots', 'allergens', 'dislikes', 'equipment'])
    d.settings[k] = [...new Set(d.settings[k])];
  if (!Array.isArray(raw.plan) || raw.plan.length > 14) throw Error('Невалидно меню.');
  d.plan = raw.plan.map((e) => {
    if (
      !recipe(e.id) ||
      !Number.isInteger(e.day) ||
      e.day < 0 ||
      e.day >= d.settings.days ||
      !d.settings.slots.includes(e.slot) ||
      !Number.isInteger(e.people) ||
      e.people < 1 ||
      e.people > 12
    )
      throw Error('Невалидно ястие в менюто.');
    return { id: e.id, day: e.day, slot: e.slot, people: e.people };
  });
  if (new Set(d.plan.map((e) => `${e.day}:${e.slot}`)).size !== d.plan.length)
    throw Error('Дублирани хранения в менюто.');
  for (const [k, p] of Object.entries(PRODUCTS)) {
    for (const field of ['prices', 'pantry', 'packSizes']) {
      const v = raw[field]?.[k];
      if (v !== undefined) {
        if (!Number.isFinite(v) || v < 0 || v > 100000 || (field === 'packSizes' && v === 0))
          throw Error('Невалидни количества или цени.');
        d[field][k] = v;
      }
    }
    d.checked[k] = !!raw.checked?.[k];
    if (d.settings.stores.includes(raw.storeFor?.[k])) d.storeFor[k] = raw.storeFor[k];
  }
  d.favorites = Array.isArray(raw.favorites)
    ? [...new Set(raw.favorites.filter((id) => recipe(id)))]
    : [];
  for (const r of RECIPES)
    if (typeof raw.notes?.[r.id] === 'string') d.notes[r.id] = raw.notes[r.id].slice(0, 4000);
  d.plan.forEach((_, i) => (d.cooked[i] = !!raw.cooked?.[i]));
  d.locked = !!raw.locked;
  d.onboarded = !!raw.onboarded || raw.onboardingVersion === 2;
  if (raw.diary !== undefined && (!Array.isArray(raw.diary) || raw.diary.length > 20000))
    throw Error('Невалиден дневник.');
  d.diary = (raw.diary || []).map(diaryEntry);
  if (new Set(d.diary.map((e) => e.id)).size !== d.diary.length) throw Error('Дублирани записи.');
  if (raw.dailyTarget !== undefined) {
    if (!Number.isFinite(raw.dailyTarget) || raw.dailyTarget < 0 || raw.dailyTarget > 10000)
      throw Error('Невалидна дневна цел.');
    d.dailyTarget = raw.dailyTarget;
  }
  if (raw.extras !== undefined && (!Array.isArray(raw.extras) || raw.extras.length > 200))
    throw Error('Твърде много допълнителни продукти.');
  d.extras = (raw.extras || []).map(extraGrocery);
  if (new Set(d.extras.map((e) => e.id)).size !== d.extras.length)
    throw Error('Дублирани допълнителни продукти.');
  return d;
}
export function recipeJSON(r) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.name,
    recipeYield: '2 порции',
    totalTime: `PT${r.time}M`,
    recipeCuisine: 'Българска',
    recipeIngredient: Object.entries(r.ing).map(
      ([k, v]) => `${v} ${PRODUCTS[k][2]} ${PRODUCTS[k][0]}`,
    ),
    recipeInstructions: r.steps.map((text) => ({ '@type': 'HowToStep', text })),
  };
}

/** Exchange recipes between existing slots, or repeat one into a chosen slot.
 * Slot day, meal and household servings never change. Returns a new snapshot.
 */
export function rearrangePlan(state, from, to, mode = 'move') {
  if (state.locked) throw Error('Отключи менюто преди промяна.');
  if (
    !['move', 'repeat'].includes(mode) ||
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    !state.plan[from] ||
    !state.plan[to] ||
    from === to
  )
    throw Error('Избери друго хранене.');
  const result = planSnapshot(state);
  result.plan[to].id = state.plan[from].id;
  if (mode === 'move') result.plan[from].id = state.plan[to].id;
  delete result.cooked[to];
  if (mode === 'move') delete result.cooked[from];
  result.checked = {};
  return result;
}

export const SHOPPING_UNITS = ['бр.', 'опаковки', 'г', 'кг', 'мл', 'л'];
export function extraGrocery(input) {
  if (!input || typeof input !== 'object') throw Error('Невалиден продукт.');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const amount = Number(input.amount);
  const price = input.price === '' || input.price == null ? null : Number(input.price);
  if (!name || name.length > 100) throw Error('Името трябва да е от 1 до 100 знака.');
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 100000 ||
    !SHOPPING_UNITS.includes(input.unit)
  )
    throw Error('Провери количеството и единицата.');
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000))
    throw Error('Провери общата цена за този ред.');
  if (!STORES.includes(input.store)) throw Error('Избери магазин.');
  if (
    input.id !== undefined &&
    (typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.id))
  )
    throw Error('Невалиден идентификатор.');
  return {
    id: input.id || crypto.randomUUID(),
    name,
    amount,
    unit: input.unit,
    price,
    store: input.store,
    checked: input.checked === true,
  };
}
export function shoppingSummary(state) {
  const extras = state.extras || [];
  const fromMenu = total(state);
  const extraCost = extras.reduce((s, e) => s + (e.price ?? 0), 0);
  return {
    fromMenu,
    extraCost,
    knownTotal: fromMenu + extraCost,
    unknownPrices: extras.filter((e) => e.price === null).length,
  };
}
export function changeServings(state, index, people) {
  if (state.locked) throw Error('Отключи менюто преди промяна.');
  if (
    !Number.isInteger(index) ||
    !state.plan[index] ||
    !Number.isInteger(people) ||
    people < 1 ||
    people > 12
  )
    throw Error('Избери от 1 до 12 порции.');
  const result = planSnapshot(state);
  result.plan[index].people = people;
  delete result.cooked[index];
  result.checked = {};
  return result;
}
