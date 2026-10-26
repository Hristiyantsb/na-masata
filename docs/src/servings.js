/** Display conversions do not change the canonical nutrition basis (100 g/ml or 1 recipe portion). */
export const WEIGHT_MEASURES = Object.freeze({ 'г': 1, 'кг': 1000, 'oz': 28.349523125 });
export const VOLUME_MEASURES = Object.freeze({ 'мл': 1, 'л': 1000, 'fl oz': 29.5735295625 });
export const measureOptions = (unit, basis, label = '') => {
  if (basis === 1) return ['порции'];
  return unit === 'мл' ? [...Object.keys(VOLUME_MEASURES), ...(label ? ['именувана порция'] : [])]
    : [...Object.keys(WEIGHT_MEASURES), ...(label ? ['именувана порция'] : [])];
};
export function suggestedServingQuantity(label, unit = 'г') {
  if (typeof label !== 'string' || !label) return null;
  const match = label.match(/(?:^|\s|\()([0-9]+(?:[.,][0-9]+)?)\s*(г|гр|g|мл|ml)(?=$|\s|\))/i);
  if (!match) return null;
  const qty = Number(match[1].replace(',', '.'));
  const isVolume = ['мл', 'ml'].includes(match[2].toLowerCase());
  if ((unit === 'мл') !== isVolume || !Number.isFinite(qty) || qty <= 0 || qty > 10000) return null;
  return qty;
}
export function convertQuantity({ amount, measure, unit, basis, servingQuantity, confirmed }) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0 || n > 10000) throw Error('Въведи валидно количество.');
  if (basis === 1) {
    if (measure !== 'порции') throw Error('Тази рецепта се отчита в порции.');
    return { amount: n, unit: 'порции', displayUnit: 'порции', displayAmount: n, servingGrams: null };
  }
  const factors = unit === 'мл' ? VOLUME_MEASURES : WEIGHT_MEASURES;
  if (measure === 'именувана порция') {
    const q = Number(servingQuantity);
    if (!confirmed || !Number.isFinite(q) || q <= 0 || q > 10000)
      throw Error('Потвърди грамажа/милилитрите на една порция от етикета.');
    const canonical = n * q;
    if (canonical > 10000) throw Error('Количеството е твърде голямо.');
    return { amount: canonical, unit, displayUnit: measure, displayAmount: n, servingGrams: q };
  }
  if (!Object.hasOwn(factors, measure)) throw Error('Несъвместима мерна единица.');
  const canonical = n * factors[measure];
  if (canonical > 10000) throw Error('Количеството е твърде голямо.');
  return { amount: canonical, unit, displayUnit: measure, displayAmount: n, servingGrams: null };
}
export function displayQuantity(entry) {
  if (entry.displayUnit === 'именувана порция' && entry.servingGrams > 0)
    return { measure: entry.displayUnit, amount: entry.displayAmount ?? entry.amount / entry.servingGrams };
  const options = entry.unit === 'мл' ? VOLUME_MEASURES : WEIGHT_MEASURES;
  if (entry.unit === 'порции') return { measure: 'порции', amount: entry.amount };
  const measure = Object.hasOwn(options, entry.displayUnit) ? entry.displayUnit : entry.unit;
  return { measure, amount: entry.amount / options[measure] };
}
