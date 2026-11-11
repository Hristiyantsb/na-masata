// Refreshes docs/data/prices from the open data of the public price portal kolkostruva.bg
// (Consumer Protection Commission). The portal publishes one archive a day with the prices
// every large chain reports for every store.
//
//   node scripts/fetch-prices.mjs                     download the newest archive and rebuild
//   node scripts/fetch-prices.mjs --zip <file> --date 2026-11-10
//   node scripts/fetch-prices.mjs --zip <file> --explain cheese [--city 68134]
//
// Nothing is written when the day's data is unusable (a chain missing, too few products):
// the app then keeps showing yesterday's prices with yesterday's date.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chainFiles, eachProductRow } from './lib/kzp.mjs';
import { RULES, unitPrice, packOf } from './lib/price-rules.mjs';
import {
  CHAINS,
  SOFIA,
  buildPriceFiles,
  assertUsable,
  cityJson,
  indexJson,
} from './lib/price-data.mjs';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const OUT = option('out') || 'docs/data/prices';
const ARCHIVE = (date) => `https://kolkostruva.bg/opendata_files/${date}.zip`;

/** The calendar date in Sofia, `back` days ago. */
function sofiaDate(back = 0) {
  const day = new Date(Date.now() - back * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(day);
}

async function download() {
  // The archive of a day appears late that evening, so the newest one is usually yesterday's.
  for (let back = 0; back <= 3; back++) {
    const date = sofiaDate(back);
    const response = await fetch(ARCHIVE(date), {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; price-reader/1.0)' },
    });
    if (!response.ok) {
      console.log(`${date}: no archive (HTTP ${response.status})`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1_000_000 || buffer.readUInt32LE(0) !== 0x04034b50) {
      console.log(`${date}: the answer is not an archive (${buffer.length} bytes)`);
      continue;
    }
    const file = path.join(os.tmpdir(), `kzp-${date}.zip`);
    fs.writeFileSync(file, buffer);
    console.log(`${date}: downloaded ${(buffer.length / 1e6).toFixed(1)} MB`);
    return { buffer, date };
  }
  throw Error('No archive could be downloaded for the last four days');
}

function explain(buffer, key, city) {
  if (!RULES[key]) throw Error(`No rule for "${key}". Known: ${Object.keys(RULES).join(', ')}`);
  const pack = packOf(key);
  const seen = {};
  for (const file of chainFiles(buffer)) {
    eachProductRow(file.text(), (row) => {
      if (row.city !== city || !RULES[key].sets.includes(row.set)) return;
      const found = unitPrice(key, row, file.chain);
      const item = ((seen[file.chain] ||= {})[row.name] ||= { stores: 0, found, price: row.price });
      item.stores++;
    });
  }
  for (const chain of CHAINS) {
    const items = Object.entries(seen[chain] || {});
    const taken = items.filter(([, item]) => item.found).sort((a, b) => a[1].found.unit - b[1].found.unit);
    const dropped = items.filter(([, item]) => !item.found);
    console.log(`\n${chain}: ${taken.length} matching names, ${dropped.length} dropped`);
    for (const [name, item] of taken.slice(0, 8))
      console.log(`  ${(item.found.unit * pack).toFixed(2).padStart(6)} за опаковка · ${item.found.unit.toFixed(2)}/${RULES[key].unit}${item.found.promo ? ' · промо' : ''} · ${item.stores} маг. · ${name}`);
    for (const [name, item] of dropped.slice(0, 6))
      console.log(`       –  ${item.price.toFixed(2)} · ${item.stores} маг. · ${name}`);
  }
}

const zipPath = option('zip');
let buffer;
let date = option('date');
if (zipPath) {
  buffer = fs.readFileSync(zipPath);
  date ||= path.basename(zipPath).match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) throw Error('Give the date of the archive: --date YYYY-MM-DD');
} else {
  ({ buffer, date } = await download());
}

if (option('explain')) {
  explain(buffer, option('explain'), Number(option('city') || SOFIA));
  process.exit(0);
}

const built = buildPriceFiles(buffer, date);
assertUsable(built);
fs.mkdirSync(OUT, { recursive: true });
const keep = new Set(['index.json']);
for (const [code, file] of built.cities) {
  keep.add(`${code}.json`);
  fs.writeFileSync(path.join(OUT, `${code}.json`), cityJson(file));
}
fs.writeFileSync(path.join(OUT, 'index.json'), indexJson(built.index));
for (const name of fs.readdirSync(OUT)) if (!keep.has(name)) fs.rmSync(path.join(OUT, name));

const sofia = built.cities.get(SOFIA);
console.log(`${OUT}: ${built.cities.size} settlements, ${date}`);
console.log('rows per chain:', JSON.stringify(built.stats));
if (built.unknown.length) console.log('settlements without a name (left out):', built.unknown.join(', '));
console.log(`София: ${Object.keys(sofia.products).length} products, stores ${JSON.stringify(sofia.stores)}`);
