// How a row of the public price list becomes the price of one of our products.
//
// The portal groups products into numbered sets of the "large consumer basket" (1 = white bread,
// 6 = fresh milk, 54 = tomatoes ...). A rule says which sets hold our product, which names
// belong to it, how the amount is measured and what a believable unit price is. Anything that
// cannot be read with confidence is dropped: no price is better than a wrong one.
import { PRODUCTS } from '../../docs/src/catalog.js';

/** Sets sold by weight: the listed price is per kilogram unless the name gives a small fixed pack. */
export const BULK_SETS = new Set([
  8, 10, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 29, 30, 50, 51, 52, 53, 54, 55, 56, 57, 58,
  59, 60, 61, 62,
]);

// unit: 'kg' | 'l' | 'pcs'. range: believable price per unit. fallback: the amount assumed when
// the name gives none, only where the basket definition fixes the size (1 l of milk, 1 kg of rice).
// drained: the share of a can that is left when drained, for names that give only that weight.
const R = (sets, unit, range, include, exclude, extra = {}) => ({
  sets,
  unit,
  range,
  include,
  exclude,
  ...extra,
});

export const RULES = Object.freeze({
  bread: R([1], 'kg', [0.7, 5], /хляб|хл\./, /земел|питк|франзел|багет|чабата|кифл|хамбург|хот.?дог|без ?глутен|протеин|сухар|галета/, { fallback: 0.65 }),
  phyllo: R([5], 'kg', [1.8, 8], /кори/, /тарталет|пица|торт|лазан|юфка|щрудел|бутер|баклава(?!.*баниц)/, { fallback: 0.4 }),
  milk: R([6], 'l', [0.7, 3], /мляко|мл\./, /без лактоза|козе|овче|шоколад|какао|конденз|сухо|бадем|соев|овес|кокос/, { fallback: 1 }),
  yogurt: R([7], 'kg', [0.9, 4.5], /кис|к\.\s?мл/, /продукт|козе|овче|бивол|без лактоза|плод|ягод|праскова|боровин|за пиене|айрян|цедено|скир|гръцк|протеин|кефир/, { fallback: 0.4 }),
  cheese: R([8, 9], 'kg', [3.5, 22], /(крав|кр\.).*сир|сир.*(крав|кр\.)|бяло сал/, /козе|овч|бивол|меко|колумие|камембер|маринов|без лактоза|билк|песто|пикант|натрош|свежо|прясно сир|кубчета|крема|топено|пушено|моцарела|халуми|рикота|извара|кашкавал|имитац|продукт|растител|слайс|намаз|трюфел|чушк|маслин|подправк|протеин|веган/),
  kashkaval: R([10, 11], 'kg', [4.5, 26], /кашкавал|кашк\./, /пушен|овч|козе|бивол|без лактоза|пикантен|подправк|трюфел|маслин|чушк|роле|шунк|настърган|растител|имитац|продукт|веган|протеин|топен|панир|орех/),
  butter: R([12], 'kg', [4.5, 30], /масло/, /маргарин|растител|смес|микс|намаз|гхи|топено|какаов|фъстъч|кокос|билк|чесн|трюфел|без лактоза|козе|овче|бивол/),
  cottage: R([13, 14], 'kg', [2, 12], /извара/, /без лактоза|без лак|плод|ягод|десерт/),
  egg: R([31, 32], 'pcs', [0.15, 0.7], /яйц/, /пъдпъдъч|шоколад|боядис|варен|течн|меланж/),
  chicken: R([16], 'kg', [3.5, 16], /пил.*филе|филе.*пил/, /пуеш|маринов|панир|пушен|шниц|хапк|нагет/),
  chickenleg: R([17], 'kg', [1.2, 8], /пил/, /обезк|без кост|б\.кожа|маринов|пушен|панир|крил|филе|подбедриц|долно/),
  chickenthigh: R([17], 'kg', [3, 14], /пил.*(обезк|без кост)|(обезк|без кост).*пил/, /маринов|пушен|панир/),
  pork: R([18], 'kg', [2.2, 14], /плешка/, /маринов|пушен|мляно|кайма/),
  beef: R([24, 23], 'kg', [6, 30], /телеш|говежд/, /обрезки|кайма|мляно|бургер|кост|език|дроб|шкембе|опашк|джолан|пушен|суджук/),
  mince: R([25], 'kg', [2.5, 14], /кайма/, /пилешк|пуешк|соев|растител|кюфте|кебапче/),
  mackerel: R([29, 30], 'kg', [2, 16], /скумри/, /консерв|пушен|маринов|филе|сафрид|в сос/),
  fish: R([29, 30], 'kg', [4, 20], /пъстърва/, /пушен|филе|консерв|сьомгов|маринов|хайвер/),
  bean: R([33], 'kg', [1.2, 8], /боб/, /мунг|черен|червен|шарен|пъстър|зелен|консерв|нахут|соя|адзуки/, { fallback: 1 }),
  lentil: R([34], 'kg', [1, 8], /леща/, /червена|черна|зелена|белуга|жълта|консерв/, { fallback: 1 }),
  rice: R([35], 'kg', [0.7, 6], /ориз/, /басмати|жасмин|кафяв|парбойл|ризото|арборио|суши|див|черен|червен|пълнозърн|оризов|бланширан|варен|пакетчета|готов|мляко|100% ?нач/, { fallback: 1 }),
  pasta: R([36, 37], 'kg', [0.6, 6], /макарон|спагет|пене|фусили|паста|спирал|рогч|ригатони|фарфале|охлюв|тръбичк|лингуини|талиатели|букатини/, /фиде|кус.?кус|юфка|букви|фигурк|животн|звезд|лазан|нудли|без ?глутен|ньоки|тортелин|равиол|сос|оризов|пълнозър|триколор|яйчн|детск/, { fallback: { 36: 0.4, 37: 0.5 } }),
  sugar: R([38], 'kg', [0.45, 2.5], /захар/, /кафява|пудра|тръстик|ванил|бучки|кубчета|желир|кокос|стевия|подслад|фруктоза/, { fallback: 1 }),
  salt: R([39], 'kg', [0.15, 2], /сол/, /хималай|розова|подправ|билк|чесн|солница|мелничк|диетич|натрий|за баня/, { fallback: 1 }),
  flour: R([40], 'kg', [0.35, 2.5], /брашно/, /царевич|ръжен|пълнозърн|лимец|оризов|бадем|кокос|елда|нахут|типово|кекс|пица|самонабух|без ?глутен|галета|грис/, { fallback: 1 }),
  oil: R([42], 'l', [1, 4.5], /олио|слънч/, /олеин|пържене|фритюр|спрей|рапич|царевич|кокос|сусам|орех|фъстъч|тиквен|ленен|зехтин|маслин/, { fallback: 1 }),
  oliveoil: R([43], 'l', [4.5, 25], /масл|зехтин|olive|virgin/, /кюсп|помас|помач|pomace|sansa|спрей|ароматиз|трюфел|чесън|лимон|босилек|смес|слънчоглед/, { fallback: 1 }),
  vinegar: R([44], 'l', [0.7, 4], /оцет/, /ябълк|балсам|оризов|малин|крем|спрей/, { fallback: 0.7 }),
  // Our pack is a 400 g can (240 g drained); the price is counted for the can as it is sold.
  redbean: R([46], 'kg', [1.2, 6], /червен.*боб|боб.*червен|кидни|kidney/, /чили|сос|печен|салата|микс/, { pack: 0.4, drained: 0.6 }),
  canned: R([48], 'kg', [0.9, 5], /домат/, /пюре|пасир|passata|пасата|сос|кетчуп|чери|сушен|билк|босилек|чесън|лют|паста|концентрат|сок|супа|лютеница/, { drained: 0.6 }),
  lutenitsa: R([49], 'kg', [1.6, 9], /лютеница/, /детск|кьопоолу|айвар|пинджур|апетитка/),
  lemon: R([50], 'kg', [0.6, 5], /лимон/, /лайм|сок|мрежа/),
  orange: R([51], 'kg', [0.6, 4.5], /портокал/, /сок|мрежа/),
  banana: R([52], 'kg', [0.7, 3.5], /банан/, /сушен|чипс/),
  apple: R([53], 'kg', [0.5, 4], /ябълк/, /мрежа|сушен|сок|чипс/),
  tomato: R([54], 'kg', [0.9, 7], /домат/, /зелени|чери|сушен/),
  onion: R([55], 'kg', [0.25, 2.5], /лук/, /червен|пресен|зелен|праз|арпаджик|шалот/),
  carrot: R([56], 'kg', [0.3, 2.5], /морков/, /мрежа|бейби|сок/),
  cabbage: R([57], 'kg', [0.3, 2.5], /зеле/, /червено|китайско|кисело|брюкселско|савойско/),
  cucumber: R([58], 'kg', [0.8, 6], /краставиц/, /корнишон|кисел|туршия/),
  garlic: R([59], 'kg', [2, 14], /чесън/, /пресен|зелен|гранул|прах|маринов/),
  mushroom: R([60], 'kg', [1.8, 9], /печурк|гъби/, /кралска|кладница|шийтаке|консерв|марин|сушен/),
  potato: R([61], 'kg', [0.3, 2.5], /картоф/, /сладк|мрежа/),
  olives: R([62], 'kg', [2.5, 18], /маслин/, /паста|масло/),
});

/**
 * Sets sold over the counter from a wheel, a bucket or a box: "~6кг" there is the size of the
 * wheel the slice is cut from, not a pack that has to be bought whole. METRO is the exception:
 * a cash-and-carry sells the whole piece.
 */
export const COUNTER_SETS = new Set([8, 10, 13, 62]);

/** Our pack in the rule's unit: kilograms, litres or pieces. */
export function packOf(key) {
  const rule = RULES[key];
  if (rule.pack) return rule.pack;
  const amount = PRODUCTS[key][1];
  return rule.unit === 'pcs' ? amount : amount / 1000;
}

/** The most that is sensible to buy at once; larger packs are for restaurants, not for a home. */
export function maxBuyOf(key) {
  const rule = RULES[key];
  if (rule.maxBuy) return rule.maxBuy;
  return rule.unit === 'pcs' ? 30 : Math.max(1.5, packOf(key) * 3);
}

const LOOKALIKE = { A: 'А', B: 'В', C: 'С', E: 'Е', H: 'Н', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У', a: 'а', c: 'с', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у' };

/**
 * Lower-cases a product name for matching. Chains often type a Latin letter inside a Cyrillic
 * word ("Kайма", "крaве"): in words that contain Cyrillic those letters are read as Cyrillic.
 */
export function matchName(name) {
  return name
    .replace(/[^\s]+/g, (word) =>
      /[а-яА-Я]/.test(word) ? word.replace(/[ABCEHKMOPTXYaceopxy]/g, (ch) => LOOKALIKE[ch]) : word,
    )
    .toLocaleLowerCase('bg');
}

const MASS = '(кг|kg|гр|г|gr|g)';
const VOLUME = '(мл|ml|л|l)';
const NUMBER = '(\\d+(?:[.,]\\d+)?)';
const END = '(?![a-zа-я0-9])';
const toNumber = (text) => Number(text.replace(',', '.'));
const scale = (unit) => (/^(кг|kg|л|l)$/.test(unit) ? 1 : 0.001);

/**
 * The amount written in a name, in kilograms or litres: { amount, approx } or null.
 * "~3КГ", "ок. 0,660 кг" and "около 2кг" are approximate weights of goods priced per kilogram.
 * Fish and olive calibres ("300/500", "100-125", "200+ГР") are not amounts. A drained weight
 * ("ОНТ 240 г") becomes the weight of the whole can when the rule says what share drains.
 */
export function amountIn(lowerName, unit, drained = 0) {
  const units = unit === 'l' ? VOLUME : MASS;
  const DRAINED = /\(?(?:онт|oht|atg|атг)\s*(\d+)\s*(?:гр|г|g)?\)?/;
  const net = lowerName.match(DRAINED);
  const text = lowerName.replace(new RegExp(DRAINED, 'g'), ' ');
  const multi = text.match(new RegExp(`(\\d+)\\s*[xх]\\s*${NUMBER}\\s*${units}${END}`));
  if (multi) return { amount: Number(multi[1]) * toNumber(multi[2]) * scale(multi[3]), approx: false };
  const single = new RegExp(`(~\\s*|ок\\.?\\s*|около\\s*)?${NUMBER}\\s*${units}${END}`, 'g');
  for (const match of text.matchAll(single)) {
    const before = text.slice(0, match.index).trimEnd();
    // "300/500гр", "200-220/100 г": the number after a slash or a dash that follows a digit
    // is the second half of a calibre.
    if (/\d\s*[/\-–]$/.test(before)) continue;
    const amount = toNumber(match[2]) * scale(match[3]);
    if (amount > 0) return { amount, approx: Boolean(match[1]) };
  }
  if (net && drained) return { amount: Number(net[1]) / 1000 / drained, approx: false };
  return null;
}

/** The number of eggs in a box: "M 10бр", "L10", "М6 броя". */
export function countIn(lowerName) {
  const match = lowerName.match(/(\d+)\s*бр/) || lowerName.match(/(?:^|[^a-zа-я])[mмlл]\s?(\d+)(?!\d)/);
  const count = match ? Number(match[1]) : 0;
  return count >= 4 && count <= 60 ? count : 0;
}

const within = (value, [low, high]) => value >= low && value <= high;

/** True when the row is our product by its set and its name, whether or not a price can be read. */
export function isProduct(key, row, name = matchName(row.name)) {
  const rule = RULES[key];
  return (
    rule.sets.includes(row.set) &&
    rule.include.test(name) &&
    !(rule.exclude && rule.exclude.test(name))
  );
}

/**
 * The price per unit (kg, l or piece) that a row gives for a product, or null when the row is
 * another product, cannot be read, is too large to buy for a home or has an unbelievable price.
 * Returns { unit, regular, promo } where regular is the unit price without the promotion.
 */
export function unitPrice(key, row, chain = '') {
  const rule = RULES[key];
  const name = matchName(row.name);
  if (!isProduct(key, row, name)) return null;
  const promo = row.promo > 0 && row.promo < row.price;
  const price = promo ? row.promo : row.price;
  const maxBuy = maxBuyOf(key);

  let divisor = 0;
  if (rule.unit === 'pcs') {
    divisor = countIn(name);
    if (!divisor || divisor > maxBuy) return null;
  } else {
    const found = amountIn(name, rule.unit, rule.drained);
    const bulk = BULK_SETS.has(row.set);
    const counter = COUNTER_SETS.has(row.set) && chain !== 'METRO';
    if (found?.approx) {
      // Variable weight: the price is per kilogram and the pack has to be bought whole,
      // unless it is a wheel or a bucket that the counter cuts from.
      if (found.amount > maxBuy && !counter) return null;
      divisor = 1;
    } else if (bulk) {
      // Sold by weight. A small fixed pack ("500 ГР.") carries a pack price; a large number is
      // the size of the bucket or the box behind the counter.
      const perPack = found ? price / found.amount : 0;
      if (found && found.amount < 1 && within(perPack, rule.range)) divisor = found.amount;
      else if (within(price, rule.range)) divisor = 1;
      else if (found && within(perPack, rule.range) && found.amount <= maxBuy) divisor = found.amount;
      else return null;
    } else {
      const fallback = typeof rule.fallback === 'object' ? rule.fallback[row.set] : rule.fallback;
      divisor = found ? found.amount : fallback || 0;
      if (!divisor || divisor > maxBuy) return null;
    }
  }
  const unit = price / divisor;
  if (!within(unit, rule.range)) return null;
  return { unit, regular: row.price / divisor, promo };
}

/** Set number -> the products whose rules read that set. */
export const PRODUCTS_BY_SET = (() => {
  const map = new Map();
  for (const [key, rule] of Object.entries(RULES))
    for (const set of rule.sets) map.set(set, [...(map.get(set) || []), key]);
  return map;
})();
