'use strict';
import { MORE_NUTRIENTS } from './products-more.js';
// Approximate generic values per 100 g/ml (eggs: per piece):
// kcal, protein, carbohydrate, fat, fibre. Modelling assumptions, not retailer labels.
export const NUTRIENTS = {
  tomato: [18, 0.9, 3.9, 0.2, 1.2],
  cucumber: [15, 0.7, 3.6, 0.1, 0.5],
  pepper: [26, 1, 6, 0.3, 2.1],
  onion: [40, 1.1, 9.3, 0.1, 1.7],
  garlic: [149, 6.4, 33, 0.5, 2.1],
  potato: [77, 2, 17, 0.1, 2.2],
  carrot: [41, 0.9, 9.6, 0.2, 2.8],
  zucchini: [17, 1.2, 3.1, 0.3, 1],
  spinach: [23, 2.9, 3.6, 0.4, 2.2],
  mushroom: [22, 3.1, 3.3, 0.3, 1],
  cabbage: [25, 1.3, 5.8, 0.1, 2.5],
  lemon: [29, 1.1, 9.3, 0.3, 2.8],
  parsley: [36, 3, 6.3, 0.8, 3.3],
  dill: [43, 3.5, 7, 1.1, 2.1],
  rice: [360, 7, 79, 0.6, 1.3],
  lentil: [350, 25, 60, 1.1, 11],
  bean: [330, 22, 60, 1.2, 15],
  chickpea: [139, 7, 23, 2.6, 6],
  pasta: [350, 12, 72, 1.5, 3],
  bread: [250, 8, 49, 3, 3],
  flour: [364, 10, 76, 1, 2.7],
  oats: [370, 13, 60, 7, 10],
  phyllo: [300, 8, 60, 2, 2],
  cheese: [265, 15, 4, 21, 0],
  yogurt: [61, 3.5, 4.7, 3.3, 0],
  egg: [72, 6.3, 0.4, 4.8, 0],
  chicken: [120, 23, 0, 2.6, 0],
  mince: [240, 18, 0, 19, 0],
  fish: [148, 20, 0, 7, 0],
  oil: [828, 0, 0, 92, 0],
  salt: [0, 0, 0, 0, 0],
  paprika: [282, 14, 54, 13, 35],
  peppercorn: [251, 10, 64, 3, 25],
  savory: [272, 7, 69, 6, 46],
  canned: [22, 1, 4, 0.2, 1],
  walnut: [654, 15, 14, 65, 7],
  apple: [52, 0.3, 14, 0.2, 2.4],
  banana: [89, 1.1, 23, 0.3, 2.6],
  honey: [304, 0.3, 82, 0, 0],
  tofu: [120, 12, 2, 7, 1],
  ...MORE_NUTRIENTS,
};

const cache = new WeakMap();
const round1 = (n) => Math.round(n * 10) / 10;
/** Per-serving nutrition for a recipe whose quantities are written for two servings. */
export function nutrition(r) {
  if (cache.has(r)) return cache.get(r);
  const sum = [0, 0, 0, 0, 0];
  for (const [k, v] of Object.entries(r.ing)) {
    const values = NUTRIENTS[k];
    if (!values) continue;
    const f = k === 'egg' ? v : v / 100;
    for (let i = 0; i < 5; i++) sum[i] += values[i] * f;
  }
  const [kcal, protein, carbs, fat, fiber] = sum.map((n) => n / 2);
  const result = Object.freeze({
    kcal: Math.round(kcal),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    fiber: round1(fiber),
    netCarbs: round1(Math.max(0, carbs - fiber)),
  });
  cache.set(r, result);
  return result;
}
export function nutritionMatches(r, s) {
  const n = nutrition(r);
  return (
    (!s.maxCalories || n.kcal <= s.maxCalories) &&
    (!s.maxTime || r.time <= s.maxTime) &&
    (s.goal !== 'protein' || n.protein >= 25) &&
    (s.goal !== 'light' || n.kcal <= 500) &&
    (s.goal !== 'quick' || r.time <= 30)
  );
}
