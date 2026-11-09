// Weekly planner. Hard rules (diet, allergens, needs, appliances, time, calories, stores) are
// applied by `candidates` and are never relaxed. Inside that set the planner searches for the
// week with the lowest score, where the score adds up:
//   - the real shopping bill (whole packages, minus what is already at home);
//   - a strong penalty for going over the budget;
//   - fit to the chosen direction (protein, lighter, quicker) and to the daily calorie goal;
//   - variety: no repeated dishes, no same main protein or cuisine on neighbouring meals;
//   - food waste: opened fresh packages that are left half used;
//   - favourites and dishes that were not in last week's menu.
// Search: several randomised greedy builds, then local improvement until no single swap helps.
import { PRODUCTS } from './catalog.js';
import { candidates, recipe, packPrice, packSize, recipeCost, total, isBreakfast, fitsSlot } from './domain.js';
import { nutrition } from './nutrition.js';
import { AISLE } from './products-more.js';
import { dayName, money } from './ui.js';

const FAMILIES = [
  ['shrimp', 'seafood', 1],
  ['salmon', 'fish', 1],
  ['mackerel', 'fish', 1],
  ['hake', 'fish', 1],
  ['tuna', 'fish', 1],
  ['fish', 'fish', 1],
  ['beef', 'beef', 1],
  ['pork', 'pork', 1],
  ['bacon', 'pork', 0.6],
  ['turkey', 'poultry', 1],
  ['chicken', 'poultry', 1],
  ['chickenthigh', 'poultry', 1],
  ['mince', 'mince', 1],
  ['tofu', 'tofu', 1],
  ['chickpea', 'legume', 0.8],
  ['redbean', 'legume', 0.8],
  ['bean', 'legume', 2],
  ['lentil', 'legume', 2],
  ['redlentil', 'legume', 2],
  ['egg', 'egg', 55],
  ['cottage', 'dairy', 0.8],
  ['cheese', 'dairy', 0.8],
  ['kashkaval', 'dairy', 0.8],
  ['mozzarella', 'dairy', 0.8],
];
/** Main protein family of a dish, used to keep neighbouring meals different. */
export function mainProtein(r) {
  let best = 'veg',
    weight = 0;
  for (const [k, family, factor] of FAMILIES) {
    const w = (r.ing[k] || 0) * factor;
    if (w > weight) {
      weight = w;
      best = family;
    }
  }
  return best;
}

const PERISHABLE = new Set(['produce', 'meat', 'fish', 'dairy', 'bakery']);
const perishable = (k) => PERISHABLE.has(AISLE[k]);

/** Seeded generator so a plan can be reproduced in tests. */
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Lean version of `total(groceries(...))`: same whole-package arithmetic, no sorting or labels.
function bill(state, plan) {
  const need = {};
  for (const e of plan) {
    const r = recipe(e.id);
    for (const [k, v] of Object.entries(r.ing)) need[k] = (need[k] || 0) + (v * e.people) / 2;
  }
  let cost = 0,
    waste = 0;
  for (const [k, amount] of Object.entries(need)) {
    const size = packSize(k, state),
      missing = Math.max(0, amount - (state.pantry[k] || 0)),
      packs = Math.ceil(Math.max(0, missing - 1e-8) / size),
      price = packPrice(k, state);
    cost += packs * price;
    if (packs && perishable(k)) {
      const left = (state.pantry[k] || 0) + packs * size - amount;
      waste += (left / size) * price;
    }
  }
  return { cost, waste };
}

function mealTarget(state, breakfast = false) {
  if (!(state.dailyTarget > 0)) return 0;
  if (breakfast) return state.dailyTarget * 0.25;
  const mains = state.settings.slots.filter((slot) => slot !== 'Закуска').length;
  return state.dailyTarget * (mains > 1 ? 0.35 : 0.4);
}

function dishScore(state, r, ctx) {
  const n = nutrition(r),
    s = state.settings;
  let score = 0;
  if (s.goal === 'protein') score -= 0.12 * (n.protein - 25);
  if (s.goal === 'light') score += 0.01 * Math.max(0, n.kcal - 420);
  if (s.goal === 'quick') score += 0.08 * Math.max(0, r.time - 20);
  if (s.goal === 'balanced')
    score += 0.006 * Math.abs(n.kcal - 560) + 0.08 * Math.max(0, 18 - n.protein);
  const target = isBreakfast(r) ? ctx.breakfastTarget : ctx.target;
  if (target) score += Math.abs(n.kcal - target) / 120;
  if (state.favorites.includes(r.id)) score -= 1.5;
  if (ctx.previous.has(r.id)) score += 1.5;
  if ((s.needs || []).includes('kids') && r.tags?.includes('kids')) score -= 1;
  if (r.prepNote) score += 0.4;
  // People who choose fish-but-no-meat expect fish on the table, not only beans.
  const family = mainProtein(r);
  if (s.diet === 'pescatarian' && (family === 'fish' || family === 'seafood')) score -= 2.5;
  return score;
}

/** Total score of a week; lower is better. */
export function planScore(state, plan, ctx = context(state)) {
  const { cost, waste } = bill(state, plan);
  // The budget is a limit, not the goal: under it, price only breaks ties between similar weeks.
  let score = cost * 0.35 + Math.max(0, cost - state.settings.budget) * 8 + waste * 0.2;
  const seen = new Map(),
    families = new Map();
  let prev = null;
  let mains = 0;
  for (const e of plan) {
    const r = recipe(e.id);
    score += ctx.dish.get(e.id) ?? dishScore(state, r, ctx);
    seen.set(e.id, (seen.get(e.id) || 0) + 1);
    if (isBreakfast(r)) continue;
    mains++;
    const family = mainProtein(r);
    families.set(family, (families.get(family) || 0) + 1);
    if (prev) {
      if (prev.family === family && family !== 'veg') score += 8;
      if (prev.r.cuisine && prev.r.cuisine === r.cuisine) score += 1.5;
    }
    prev = { r, family };
  }
  // A repeat costs more each time: twice in a week is acceptable, five times is not.
  for (const count of seen.values()) score += (count - 1) ** 2 * 30;
  const cap = Math.ceil(mains / 3);
  // Same idea for the main protein: one family over the cap is a nudge, a week of it is not.
  for (const count of families.values()) score += Math.max(0, count - cap) ** 2 * 8;
  score -= families.size * 0.8;
  return score;
}

function context(state) {
  return {
    target: mealTarget(state),
    breakfastTarget: mealTarget(state, true),
    previous: new Set(state.plan.map((e) => e.id)),
    dish: new Map(),
  };
}

function shuffled(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build a week. `keep` lists indexes of the current menu to leave in place ("keep these, change
 * the rest"); a kept dish that no longer passes the hard rules is replaced like any other.
 */
export function generatePlan(state, random = Math.random, { keep = [] } = {}) {
  const all = candidates(state.settings);
  const breakfasts = all.filter(isBreakfast),
    mainsPool = all.filter((r) => !isBreakfast(r));
  const wantsBreakfast = state.settings.slots.includes('Закуска'),
    wantsMains = state.settings.slots.some((slot) => slot !== 'Закуска');
  if (wantsMains && !mainsPool.length)
    return {
      plan: null,
      reason: 'Няма рецепти за тези ограничения. Промени избора си; няма да го пренебрегнем.',
    };
  if (wantsBreakfast && !breakfasts.length)
    return {
      plan: null,
      reason: 'Няма закуска, която пасва на тези правила. Махни закуската от храненията или промени избора.',
    };
  const pool = [...(wantsMains ? mainsPool : []), ...(wantsBreakfast ? breakfasts : [])];
  const s = state.settings,
    ctx = context(state);
  // A small per-run bias: every new menu explores a different good week, never a worse rule.
  for (const r of pool) ctx.dish.set(r.id, dishScore(state, r, ctx) + random() * 2.5);
  const slots = [];
  for (let day = 0; day < s.days; day++)
    for (const slot of s.slots) slots.push({ day, slot, people: s.people });
  const allowed = new Set(pool.map((r) => r.id));
  const fixed = new Map();
  for (const i of keep) {
    const e = state.plan[i];
    if (e && allowed.has(e.id)) fixed.set(`${e.day}:${e.slot}`, e);
  }
  const locked = new Set();
  const before = new Map(state.plan.map((e) => [`${e.day}:${e.slot}`, e.id]));
  slots.forEach((place, i) => {
    const e = fixed.get(`${place.day}:${place.slot}`);
    if (e) {
      place.people = e.people;
      place.keep = e.id;
      locked.add(i);
    } else if (keep.length) place.old = before.get(`${place.day}:${place.slot}`);
  });
  const banned = new Map(slots.map((place, i) => [i, place.old]).filter(([, id]) => id));
  const keptIds = new Set([...fixed.values()].map((e) => e.id));
  // Best-first shortlist keeps the search fast without losing good dishes.
  const rankedAll = pool.slice().sort((a, b) => ctx.dish.get(a.id) - ctx.dish.get(b.id));
  const rankedFor = { breakfast: rankedAll.filter(isBreakfast), main: rankedAll.filter((r) => !isBreakfast(r)) };
  const kind = (slot) => (slot === 'Закуска' ? 'breakfast' : 'main');
  let best = null,
    bestScore = Infinity;
  const starts = pool.length > 1 ? 8 : 1;
  for (let attempt = 0; attempt < starts; attempt++) {
    const plan = [];
    for (const { keep: kept, old, ...place } of slots) {
      if (kept) {
        plan.push({ id: kept, ...place });
        continue;
      }
      // No dish twice in one week while the allowed set is large enough.
      const ranked = rankedFor[kind(place.slot)];
      const width = Math.min(ranked.length, 36);
      const used = new Set([...plan.map((e) => e.id), ...keptIds]);
      // "Change the rest" means change: the dish that was here is not offered again.
      const fresh = ranked.filter((r) => !used.has(r.id) && r.id !== old);
      const source = fresh.length ? fresh : ranked;
      const options = new Set([
        ...source.slice(0, Math.ceil(width / 2)),
        ...shuffled(source, random).slice(0, width),
      ]);
      let choice = null,
        choiceScore = Infinity;
      for (const r of options) {
        const e = { id: r.id, ...place };
        const score = planScore(state, [...plan, e], ctx) + random() * 1.5;
        if (score < choiceScore) {
          choice = e;
          choiceScore = score;
        }
      }
      plan.push(choice);
    }
    const score = planScore(state, plan, ctx);
    if (score < bestScore) {
      best = plan;
      bestScore = score;
    }
  }
  improve(state, best, pool, ctx, locked, banned);
  const cost = total(state, best);
  return {
    plan: best,
    cost,
    withinBudget: cost <= s.budget,
    available: pool.length,
  };
}

// Local search: replace one meal at a time while that lowers the score.
function improve(state, plan, pool, ctx, locked = new Set(), banned = new Map()) {
  let current = planScore(state, plan, ctx);
  // Breakfasts swap with breakfasts, main dishes with main dishes.
  const byKind = { breakfast: pool.filter(isBreakfast), main: pool.filter((r) => !isBreakfast(r)) };
  const kindOf = (e) => (e.slot === 'Закуска' ? 'breakfast' : 'main');
  const unique = {
    breakfast: byKind.breakfast.length >= plan.filter((e) => kindOf(e) === 'breakfast').length,
    main: byKind.main.length >= plan.filter((e) => kindOf(e) === 'main').length,
  };
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let i = 0; i < plan.length; i++)
      for (const r of locked.has(i) ? [] : byKind[kindOf(plan[i])]) {
        const keep = plan[i];
        if (r.id === keep.id || r.id === banned.get(i) || (unique[kindOf(keep)] && plan.some((e) => e.id === r.id)))
          continue;
        plan[i] = { ...keep, id: r.id };
        const score = planScore(state, plan, ctx);
        if (score < current - 1e-9) {
          current = score;
          changed = true;
        } else plan[i] = keep;
      }
    if (!changed) break;
  }
  return current;
}

/** Up to three short, true reasons why a planned meal was chosen. */
export function explainEntry(state, index) {
  const e = state.plan[index],
    r = e && recipe(e.id);
  if (!r) return [];
  const n = nutrition(r),
    s = state.settings,
    reasons = [];
  if (s.goal === 'protein') reasons.push(`${Math.round(n.protein)} г протеин`);
  if (s.diet === 'keto' || (s.needs || []).includes('lowcarb'))
    reasons.push(`${Math.round(n.netCarbs)} г нетни въглехидрати`);
  else if (s.goal === 'light' || s.maxCalories) reasons.push(`${n.kcal} ккал`);
  if (s.goal === 'quick' || r.time <= 20) reasons.push(`${r.time} мин`);
  if (state.favorites.includes(r.id)) reasons.push('Любима');
  for (const [k] of Object.entries(r.ing)) {
    if (!perishable(k) || ['salt', 'oil', 'garlic', 'onion'].includes(k)) continue;
    const other = state.plan.find((x, j) => j !== index && recipe(x.id)?.ing[k]);
    if (other) {
      const day = dayName(other.day).toLowerCase();
      reasons.push(`Общи продукти ${/^[сз]/.test(day) ? 'със' : 'с'} ${day}`);
      break;
    }
  }
  if (reasons.length < 3)
    reasons.push(`≈ ${money(recipeCost(r, e.people, state) / e.people)} на порция`);
  return reasons.slice(0, 3);
}
