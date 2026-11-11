import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { zipEntries, zipStore } from '../scripts/lib/zip.mjs';
import { eachCsvRow } from '../scripts/lib/csv.mjs';
import { splitLine, eachProductRow, chainFiles, COLUMNS } from '../scripts/lib/kzp.mjs';
import {
  RULES,
  amountIn,
  countIn,
  matchName,
  unitPrice,
  isProduct,
  packOf,
  maxBuyOf,
} from '../scripts/lib/price-rules.mjs';
import {
  CHAINS,
  readArchive,
  cityPrices,
  representative,
  tidyName,
  buildPriceFiles,
  assertUsable,
  cityJson,
  indexJson,
} from '../scripts/lib/price-data.mjs';
import { PLACES } from '../scripts/lib/places.mjs';
import { PRODUCTS, STORES } from '../docs/src/catalog.js';

const HEAD = COLUMNS.join(',');
const quoted = (fields) => fields.map((f) => `"${f}"`).join(',');
const row = (set, name, price, promo = 0) => ({ city: 68134, store: 'S1', name, code: '1', set, price, promo });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.005, `${actual} is not ${expected}`);

test('the zip reader lists and unpacks stored and deflated entries', () => {
  const zip = zipStore({ 'a_131071587.csv': 'първи файл', 'b.txt': 'second' });
  const entries = zipEntries(zip);
  assert.deepEqual(entries.map((e) => e.name), ['a_131071587.csv', 'b.txt']);
  assert.equal(entries[0].read().toString('utf8'), 'първи файл');
  assert.equal(entries[1].size, 6);

  // The same archive with the first entry deflated, as the portal packs it.
  const text = Buffer.from('ред,ред,ред\n'.repeat(200), 'utf8');
  const packed = zlib.deflateRawSync(text);
  const stored = zipStore({ 'x.csv': packed });
  // Patch the method (8) and the real size into the local and the central header.
  const central = stored.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  stored.writeUInt16LE(8, 8);
  stored.writeUInt16LE(8, central + 10);
  stored.writeUInt32LE(text.length, central + 24);
  const [entry] = zipEntries(stored);
  assert.equal(entry.size, text.length);
  assert.equal(entry.read().toString('utf8'), text.toString('utf8'));
  assert.throws(() => zipEntries(Buffer.from('not a zip at all, just some text')), /Not a zip/);
});

test('the CSV reader keeps commas, quotes and line breaks inside quoted fields', () => {
  const rows = [];
  eachCsvRow('﻿a,"b, c","he said ""hi"""\r\n1,,"two\nlines"\n\nlast', (r) => rows.push(r));
  assert.deepEqual(rows, [['a', 'b, c', 'he said "hi"'], ['1', '', 'two\nlines'], ['last']]);
});

test('a chain file is read line by line, whatever its quoting', () => {
  // Every field quoted, with quotes inside a product name that the chain did not escape.
  assert.deepEqual(
    splitLine('"56784","208 - Пловдив/ул. Рогошко шосе 1А","Simid хляб ;"Енергия;"","7204212","3","1.32",""'),
    ['56784', '208 - Пловдив/ул. Рогошко шосе 1А', 'Simid хляб ;"Енергия;"', '7204212', '3', '1.32', ''],
  );
  // Quoted only where needed.
  assert.deepEqual(
    splitLine('68134,"Кауфланд София-Младост -  rp.София,ул. Филип Аврамов 3",Народен Салам 750 гр,00010195,27,5.19,0'),
    ['68134', 'Кауфланд София-Младост -  rp.София,ул. Филип Аврамов 3', 'Народен Салам 750 гр', '00010195', '27', '5.19', '0'],
  );
  assert.equal(splitLine('68134,only,four,fields'), null);

  const text = [
    '﻿' + quoted(COLUMNS),
    quoted(['68134', 'Магазин 1', 'Krina;" Бял боб (ОНТ 400)', '7208918', '46', '1.84', '']),
    quoted(['07079', 'Магазин 2', '  Прясно   мляко 3% 1л ', '1', '6', '1,56', '1.29']),
    'broken line without enough fields',
    quoted(['68134', 'Магазин 1', 'Безплатно', '2', '6', '0', '']),
    '',
  ].join('\r\n');
  const rows = [];
  const result = eachProductRow(text, (r) => rows.push(r));
  // A broken line costs only itself, never the lines after it.
  assert.deepEqual(result, { rows: 2, skipped: 2 });
  assert.deepEqual(rows[0], { city: 68134, store: 'Магазин 1', name: 'Krina;" Бял боб (ОНТ 400)', code: '7208918', set: 46, price: 1.84, promo: 0 });
  assert.deepEqual(rows[1], { city: 7079, store: 'Магазин 2', name: 'Прясно мляко 3% 1л', code: '1', set: 6, price: 1.56, promo: 1.29 });
  assert.throws(() => eachProductRow('a,b,c\n1,2,3', () => {}), /Unexpected header/);
});

test('only the files of the six chains are taken from the archive, by company number', () => {
  const zip = zipStore({
    'Лидл България_131071587.csv': HEAD,
    'ФАНТАСТИКО (ФАНТАСТИКО ГРУП ООД)_206255903.csv': HEAD,
    'ФАНТАСТИКО (ДАР Г.Н.)_831556063.csv': HEAD,
    'Някой друг търговец_999999999.csv': HEAD,
    'readme.txt': 'x',
  });
  assert.deepEqual(chainFiles(zip).map((f) => f.chain), ['Lidl', 'Фантастико', 'Фантастико']);
});

test('amounts are read from product names; calibres and drained weights are not amounts', () => {
  const kg = (name, drained) => amountIn(matchName(name), 'kg', drained);
  const cases = [
    ['КИСЕЛО МЛЯКО 2% 400Г BILLA', 0.4, false],
    ['Хляб МИО УС България бял нарязан 650г', 0.65, false],
    ['Сирене от краве мляко, 1 кг.', 1, false],
    ['Lacrima Краве сирене екстра 2x350g', 0.7, false],
    ['10Х1КГ БЯЛА КРИСТ.ЗАХАР СЛАДЕЯ', 10, false],
    ['БЕЛ КАШКАВАЛ ГОРИЦА/ 4Х2.1КГ', 8.4, false],
    ['~3КГ ПИЛЕШКО ФИЛЕ КАПКА ОХЛАДЕ', 3, true],
    ['Прясно пилешко бутче ок. 0,660 кг', 0.66, true],
    ['Пилешко филе около 2кг', 2, true],
    ['Свинско месо за готвене, ок.750г-ат', 0.75, true],
    ['Melissa спагети №10 500 гр', 0.5, false],
    ['KLC бял боб 400 г / 250 г', 0.4, false],
    ['Черни Маслини Колосал 121/140, 2,5кг', 2.5, false],
    ['~1КГ 300/500ГР СКУМРИЯ SC.SC П', 1, true],
  ];
  for (const [name, amount, approx] of cases) {
    const found = kg(name);
    assert.ok(found, name);
    near(found.amount, amount);
    assert.equal(found.approx, approx, name);
  }
  // Fish and bean calibres, a count per kilogram and a bare name give no amount.
  for (const name of [
    'СКУМРИЯ ЦЯЛА DAGAMA 300/500 ЗАМР. КГ ПАКЕТ',
    'Vedenemo Скумрия 100-125, кг',
    '200+ГР. ПЪСТЪРВА ИЗЧИСТЕНА',
    'Боб насипен 200-220/100 г',
    'САФРИД 50-60 БР/КГ',
    'Bulgarche Кашкавал от краве мляко',
    'Домати CIRIO белени конс.е.о 4OOг',
  ])
    assert.equal(kg(name), null, name);
  // A drained weight alone: the whole can, when the rule says what share drains.
  assert.equal(kg('Червен боб кидни (ОНТ 255 г)'), null);
  near(kg('Червен боб кидни (ОНТ 255 г)', 0.6).amount, 0.425);
  near(kg('Нарязани домати (OHT 240 г)', 0.6).amount, 0.4);
  // With both, the weight of the can as written wins.
  near(kg('Philicon Домати нарязани, 400 g (ОНТ 240g)', 0.6).amount, 0.4);

  const litres = (name) => amountIn(matchName(name), 'l')?.amount;
  near(litres('ПРЯСНО МЛЯКО 3,5% BILLA 1Л БУТИЛКА'), 1);
  near(litres('Veda оцет винен 6% 700 мл'), 0.7);
  assert.equal(litres('Яйца 10 бр. L от под отгл селен'), undefined);

  assert.equal(countIn(matchName('ЯЙЦА РАЗМЕР M 10 БР ИСКАМ ЯЙЦА')), 10);
  assert.equal(countIn(matchName('ЯЙЦА L10 ПОДОВО ОТГЛЕЖДАНЕ ДОНЧЕВО')), 10);
  assert.equal(countIn(matchName('Мизия Кокоши яйца със селен М6 броя')), 6);
  assert.equal(countIn(matchName('6БР. ЯЙЦА M MCH')), 6);
  assert.equal(countIn(matchName('Пресни яйца,М, от подово отглеждани')), 0);
  // A Latin letter typed inside a Cyrillic word is read as Cyrillic.
  assert.equal(matchName('Kайма смес, 60/40'), 'кайма смес, 60/40');
  assert.equal(matchName('Costa d`Oro EV 1 л'), 'costa d`oro ev 1 л');
});

test('every rule belongs to a product of the catalog and has a believable range', () => {
  assert.ok(Object.keys(RULES).length >= 42);
  for (const [key, rule] of Object.entries(RULES)) {
    assert.ok(PRODUCTS[key], `unknown product ${key}`);
    assert.ok(rule.sets.length && rule.sets.every((set) => Number.isInteger(set) && set >= 1 && set <= 101), key);
    assert.ok(['kg', 'l', 'pcs'].includes(rule.unit), key);
    assert.ok(rule.range[0] > 0 && rule.range[0] < rule.range[1], key);
    assert.ok(packOf(key) > 0 && maxBuyOf(key) >= packOf(key), key);
  }
  assert.equal(packOf('egg'), 10);
  assert.equal(packOf('garlic'), 0.1);
  // A can of beans is counted as it is sold, not by its drained weight.
  assert.equal(packOf('redbean'), 0.4);
  assert.deepEqual([...CHAINS], [...STORES]);
});

test('a row becomes a unit price only when it can be read with confidence', () => {
  const unit = (key, r, chain) => unitPrice(key, r, chain)?.unit;
  // Packaged goods: the pack price divided by the size in the name.
  near(unit('yogurt', row(7, 'КИСЕЛО МЛЯКО 2% 400Г BILLA', 0.49)), 1.225);
  near(unit('cheese', row(9, 'КРАВЕ СИРЕНЕ ЛЕСИДРЕН 400Г', 3.49)), 8.725);
  // The promotion is today's price; the regular one is kept beside it.
  assert.deepEqual(unitPrice('milk', row(6, 'Прясно мляко САЯНА 3% 1л', 1.66, 1.49)), { unit: 1.49, regular: 1.66, promo: true });
  assert.equal(unitPrice('milk', row(6, 'Прясно мляко САЯНА 3% 1л', 1.66, 1.66)).promo, false);
  // The basket fixes the size of milk at one litre, so a name without a size still counts...
  near(unit('milk', row(6, 'Bulgarche Прясно мляко 3,2%масленос', 1.22)), 1.22);
  // ...but cheese, kashkaval, butter and eggs come in many sizes: no size, no figure.
  assert.equal(unit('cheese', row(9, 'Sayana Краве сирене', 2.81)), undefined);
  assert.equal(unit('kashkaval', row(11, 'Bulgarche Кашкавал от краве мляко', 3.06)), undefined);
  assert.equal(unit('butter', row(12, 'Краве масло 82% масленост', 1.39)), undefined);
  assert.equal(unit('egg', row(31, 'Пресни яйца,М, от подово отглеждани', 2.49)), undefined);
  near(unit('egg', row(32, 'Яйца 10 бр. L от под отгл селен', 2.95)), 0.295);

  // Sold by weight: the price is per kilogram, whatever the bucket behind the counter weighs.
  near(unit('cheese', row(8, 'МИЛ СИРЕНЕ КРАВЕ МЛЯКО САЯНА / 8 КГ', 5.49)), 5.49);
  near(unit('tomato', row(54, 'Домати на кг', 2.74)), 2.74);
  near(unit('mackerel', row(29, 'СКУМРИЯ ЦЯЛА DAGAMA 300/500 ЗАМР. КГ ПАКЕТ', 5.2)), 5.2);
  // A small fixed pack in a by-weight set carries a pack price.
  near(unit('fish', row(29, 'ПЪСТЪРВА ЧИСТЕНА BILLA BRAND 500 ГР.', 3.91)), 7.82);
  // An approximate weight is a pack to buy whole: fine for a home, not at restaurant size.
  near(unit('chickenleg', row(17, 'Прясно пилешко бутче ок. 0,660 кг', 2.89)), 2.89);
  assert.equal(unit('chicken', row(16, '~3КГ ПИЛЕШКО ФИЛЕ КАПКА ОХЛАДЕ', 4.42)), undefined);
  assert.equal(unit('chicken', row(16, 'Пилешко филе около 2кг', 5.29)), undefined);
  // A wheel of kashkaval is cut at the counter; in a cash-and-carry it is sold whole.
  near(unit('kashkaval', row(10, 'NN Кашкавал Краве мляко ~6кг', 6.55), 'Kaufland'), 6.55);
  assert.equal(unit('kashkaval', row(10, 'NN Кашкавал Краве мляко ~6кг', 6.55), 'METRO'), undefined);
  // Ten kilograms of sugar in one pack is not a home purchase.
  assert.equal(unit('sugar', row(38, '10Х1КГ БЯЛА КРИСТ.ЗАХАР СЛАДЕЯ', 7.72)), undefined);

  // Other products in the same set are not ours.
  assert.equal(unit('oliveoil', row(43, '1Л МАСЛ МАСЛО COSTA D`ORO КЮСП', 5.34)), undefined);
  assert.equal(unit('cheese', row(9, 'ЯЙЦА L10 ПОДОВО ОТГЛЕЖДАНЕ АКВИЛОН', 2.68)), undefined);
  assert.equal(unit('yogurt', row(7, 'Млечнокисел продукт, 2% XXL', 0.61)), undefined);
  assert.equal(unit('potato', row(61, 'Картофи, сладки на кг', 1.49)), undefined);
  assert.equal(unit('tomato', row(6, 'Домати на кг', 2.74)), undefined, 'wrong set');
  assert.ok(isProduct('butter', row(12, 'Краве масло 82% масленост', 1.39)), 'ours, only unreadable');
  // An unbelievable price is dropped rather than shown.
  assert.equal(unit('lutenitsa', row(49, 'Дерони финос. лютеница без захар 500 г', 3.32, 0.43)), undefined);
  assert.equal(unit('yogurt', row(7, '500Г КИСЕЛО МЛЯКО ЗДРАВЕЦ 3.6%', 0.64, 0.2)), undefined);
  // A can named only by its drained weight is the usual can.
  near(unit('redbean', row(46, 'Червен боб кидни (ОНТ 255 г)', 0.81)) * packOf('redbean'), 0.762);
});

test('a store speaks for a product only when enough of its shelf could be read', () => {
  const best = { unit: 1, regular: 1, promo: false, name: 'x' };
  assert.equal(representative({ best, matched: 16, readable: 1 }), false, 'one sized butter among sixteen');
  assert.equal(representative({ best, matched: 3, readable: 1 }), true);
  assert.equal(representative({ best, matched: 30, readable: 5 }), true);
  assert.equal(representative({ best: null, matched: 4, readable: 0 }), false);
});

// A small town in three chains: Lidl with three stores, Kaufland with one, METRO with one.
const lidl = (store, name, set, price, promo = '') => quoted(['68134', store, name, '1', String(set), String(price), String(promo)]);
const ARCHIVE = zipStore({
  'Лидл България_131071587.csv': [
    quoted(COLUMNS),
    // Milk: the cheapest per store is 1.22, 1.22 and 1.49 (a store without the cheap one).
    lidl('L1', 'Bulgarche Прясно мляко 3,2%', 6, 1.22),
    lidl('L1', 'Vereya Прясно мляко 3%', 6, 1.66, 1.49),
    lidl('L2', 'Bulgarche Прясно мляко 3,2%', 6, 1.22),
    lidl('L3', 'Vereya Прясно мляко 3%', 6, 1.66, 1.49),
    // Tomatoes only in two of the three stores.
    lidl('L1', 'Домати на кг', 54, 2.74),
    lidl('L2', 'Домати на кг', 54, 2.74),
    // Butter: fifteen names without a size and one sized premium one, in every store.
    ...['L1', 'L2', 'L3'].flatMap((store) => [
      ...Array.from({ length: 15 }, (_, i) => lidl(store, `Краве масло марка ${i}`, 12, 1.39 + i / 100)),
      lidl(store, 'Lurpak Датско масло без сол 200 гр.', 12, 2.96),
    ]),
    // Something that is not in the basket of the app still tells us the store exists.
    lidl('L3', 'Aquafresh Паста', 81, 2.49),
    quoted(['07079', 'L9', 'Домати на кг', '1', '54', '2.10', '']),
    quoted(['99999', 'L8', 'Домати на кг', '1', '54', '2.10', '']),
  ].join('\r\n'),
  'Кауфланд България_131129282.csv': [
    HEAD,
    '68134,"Кауфланд София, ул. Първа 1",Домати кг,2,54,3.25,2.49',
    '68134,"Кауфланд София, ул. Първа 1",KLC Прясно мляко 3% 1л,3,6,1.42,0',
    '68134,"Кауфланд София, ул. Първа 1",NN Кашкавал Краве мляко ~6кг,4,10,6.55,0',
  ].join('\n'),
  'Метро България_121644736.csv': [
    quoted(COLUMNS),
    quoted(['68134', 'Метро София 1', '~3КГ ПИЛЕШКО ФИЛЕ', '5', '16', '4.42', '0']),
    quoted(['68134', 'Метро София 1', '~1КГ ФИЛЕ ПИЛ. ПЕПЕРУДА ОХЛ', '6', '16', '6.12', '4.98']),
  ].join('\n'),
  'Друг търговец_111111111.csv': `${HEAD}\n68134,X,Домати,1,54,0.10,0`,
});

test('a town gets the price in the typical store of each chain and how many stores sell it', () => {
  const { cities, stats } = readArchive(ARCHIVE);
  assert.deepEqual(Object.keys(stats).sort(), ['Kaufland', 'Lidl', 'METRO']);
  assert.equal(stats.Lidl.files, 1);
  const { stores, products } = cityPrices(cities.get(68134));
  assert.deepEqual(stores, { Lidl: 3, Kaufland: 1, METRO: 1 });

  // The middle store of the three sells milk at 1.22: one dearer store does not move the price.
  assert.deepEqual(products.milk.Lidl, [1.22, 3, 'Bulgarche Прясно мляко 3,2%']);
  assert.deepEqual(products.milk.Kaufland, [1.42, 1, 'KLC Прясно мляко 3% 1л']);
  // Sold in two of the three stores; a promotion carries the regular price.
  assert.deepEqual(products.tomato.Lidl, [2.74, 2, 'Домати на кг']);
  assert.deepEqual(products.tomato.Kaufland, [2.49, 1, 'Домати кг', 3.25]);
  // Our pack of kashkaval is 400 g, of chicken 500 g.
  assert.deepEqual(products.kashkaval, { Kaufland: [2.62, 1, 'NN Кашкавал Краве мляко ~6кг'] });
  assert.deepEqual(products.chicken, { METRO: [2.49, 1, '~1кг филе пил. пеперуда охл', 3.06] });
  // Butter: the only readable row is not the cheapest butter, so the chain gives no figure.
  assert.equal(products.butter, undefined);
  // Products keep the order of the rules, chains the order of the app.
  assert.deepEqual(Object.keys(products), ['milk', 'kashkaval', 'chicken', 'tomato']);
  assert.deepEqual(Object.keys(products.milk), ['Lidl', 'Kaufland']);
});

test('names are shown as sentences, without counter codes', () => {
  assert.equal(tidyName('285 SOC ПРЯСНО ПИЛЕШКО ФИЛЕ БЕЗ КОЖА'), 'SOC прясно пилешко филе без кожа');
  assert.equal(tidyName('КРАВЕ СИРЕНЕ ЛЕСИДРЕН 400Г'), 'Краве сирене лесидрен 400г');
  assert.equal(tidyName('700ГР БЯЛ ХЛЯБ СТРАЖИЦА'), '700гр бял хляб стражица');
  assert.equal(tidyName('  ** ХЛЯБ  БЯЛ Ф ВКУС '), 'Хляб бял ф вкус');
  assert.equal(tidyName('Bulgarche Прясно мляко 3,2%'), 'Bulgarche Прясно мляко 3,2%');
  assert.ok(tidyName('А'.repeat(200)).length <= 64);
});

test('the files for the app list only named towns and refuse a thin day', () => {
  // A town with a handful of products is not offered: the app would refuse its file.
  assert.equal(buildPriceFiles(ARCHIVE, '2026-11-10').cities.size, 0);
  const built = buildPriceFiles(ARCHIVE, '2026-11-10', { minProducts: 1 });
  assert.deepEqual([...built.cities.keys()].sort((a, b) => a - b), [7079, 68134]);
  assert.deepEqual(built.unknown, [99999]);
  assert.equal(built.index.date, '2026-11-10');
  assert.deepEqual(built.index.places, [
    [7079, 'Бургас', 'Бургас', 'Бургас', { Lidl: 1 }],
    [68134, 'София', 'Столична', 'София (столица)', { Lidl: 3, Kaufland: 1, METRO: 1 }],
  ]);
  const sofia = built.cities.get(68134);
  assert.equal(sofia.place, 'София');
  // What is written is what is read back, one product per line.
  const json = cityJson(sofia);
  assert.deepEqual(JSON.parse(json), sofia);
  assert.equal(json.split('\n').filter((line) => line.startsWith('    "')).length, Object.keys(sofia.products).length);
  assert.deepEqual(JSON.parse(indexJson(built.index)), built.index);
  // Three chains and four products are not enough to replace yesterday's prices.
  assert.throws(() => assertUsable(built), /no usable data/);
  assert.equal(PLACES.get(68134).name, 'София');
  assert.ok(PLACES.size >= 250);
});

test('the newest archive is the first day that really has one', async () => {
  const { newestArchive, sofiaDate, ARCHIVE_URL } = await import('../scripts/lib/archive.mjs');
  // 02:00 in Sofia on 12 November 2026 is still 11 November in UTC.
  const now = Date.UTC(2026, 10, 12, 0, 0);
  assert.equal(sofiaDate(0, now), '2026-11-12');
  assert.equal(sofiaDate(1, now), '2026-11-11');
  assert.equal(sofiaDate(0, Date.UTC(2026, 10, 11, 21, 30)), '2026-11-11');
  assert.equal(sofiaDate(0, Date.UTC(2026, 10, 11, 22, 30)), '2026-11-12');
  assert.equal(ARCHIVE_URL('2026-11-10'), 'https://kolkostruva.bg/opendata_files/2026-11-10.zip');

  const zip = zipStore({ 'a.csv': 'x'.repeat(64) });
  const asked = [];
  const lines = [];
  const page = (body, ok = true, status = 200) => ({ ok, status, arrayBuffer: async () => body });
  const fetcher = async (url, options) => {
    asked.push(url.slice(-14, -4));
    assert.match(options.headers['user-agent'], /price-reader/);
    if (url.includes('2026-11-12')) return page(Buffer.alloc(0), false, 404); // not published yet
    if (url.includes('2026-11-11')) return page(Buffer.from('<html>checking your browser</html>')); // not a zip
    if (url.includes('2026-11-10')) throw Error('socket hang up');
    return page(zip);
  };
  const found = await newestArchive({ fetcher, now, minBytes: 32, log: (line) => lines.push(line) });
  assert.equal(found.date, '2026-11-09');
  assert.deepEqual(zipEntries(found.buffer).map((e) => e.name), ['a.csv']);
  assert.deepEqual(asked, ['2026-11-12', '2026-11-11', '2026-11-10', '2026-11-09']);
  assert.match(lines[0], /2026-11-12: no archive \(HTTP 404\)/);
  assert.match(lines[1], /not an archive/);
  assert.match(lines[2], /the request failed \(socket hang up\)/);
  // Nothing on any of the days: the run stops and yesterday's prices stay.
  await assert.rejects(
    newestArchive({ fetcher: async () => page(Buffer.alloc(0), false, 403), now, days: 2, log: () => {} }),
    /No archive could be downloaded for the last 2 days/,
  );
});

test('an organic line never stands for the ordinary product', () => {
  const r = (set, name, price) => ({ city: 68134, store: 'S1', name, code: '1', set, price, promo: 0 });
  assert.equal(unitPrice('banana', r(52, 'K-Bio Банани кг', 2.49)), null);
  assert.equal(unitPrice('milk', r(6, 'БИО 1Л ПР.МЛЯКО OLYMPUS 3.7%', 1.54)), null);
  assert.equal(isProduct('banana', r(52, 'Био банани на кг', 2.04)), false);
  // A word that only contains the letters is not organic.
  assert.ok(unitPrice('banana', r(52, 'Банани Биография кг', 1.29)));
  assert.equal(unitPrice('onion', r(55, 'Лук, воден', 2.48)), null);
  assert.ok(unitPrice('onion', r(55, 'Кромид лук, България, кг.ОПС', 0.66)));
});
