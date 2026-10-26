/** OFF values are per 100 g/ml. Never infer consumed grams from a serving label. */
export function normalizeProduct(body, code) {
  const p = body.product;
  if (!p) return null;
  const n = p.nutriments || {};
  const finite = (v, max = 200) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? v : null;
  const kcal =
    finite(n['energy-kcal_100g'], 2000) ??
    (finite(n['energy-kj_100g'], 8368) !== null
      ? n['energy-kj_100g'] / 4.184
      : n.energy_unit === 'kJ' && finite(n.energy_100g, 8368) !== null
        ? n.energy_100g / 4.184
        : null);
  return {
    barcode: /^\d{8,14}$/.test(code) ? code : '',
    name: String(p.product_name_bg || p.product_name || p.generic_name || 'Продукт без име').slice(
      0,
      120,
    ),
    brand: String(p.brands || '').slice(0, 120),
    servingLabel: String(p.serving_size || '').slice(0, 120),
    kcal: kcal === null ? null : Math.round(kcal * 10) / 10,
    protein: finite(n.proteins_100g),
    carbs: finite(n.carbohydrates_100g),
    fat: finite(n.fat_100g),
    fiber: finite(n.fiber_100g),
    sugars: finite(n.sugars_100g),
    saturatedFat: finite(n['saturated-fat_100g']),
    sodium: finite(n.sodium_100g, 100) === null ? null : n.sodium_100g * 1000,
    unit: 'г',
    basis: 100,
    unitNeedsConfirmation: true,
    source: 'openfoodfacts',
    sourceUrl: /^\d{8,14}$/.test(code)
      ? `https://world.openfoodfacts.org/product/${code}`
      : 'https://world.openfoodfacts.org',
    license: 'ODbL-1.0',
  };
}
