// Reads the daily open-data archive of the public price portal kolkostruva.bg (Consumer
// Protection Commission): one CSV per retail company, one row per product in every store.
import { zipEntries } from './zip.mjs';
import { eachCsvRow } from './csv.mjs';

/** Company id (ЕИК) at the end of the file name -> the chain as the app names it. */
export const CHAIN_FILES = Object.freeze({
  131071587: 'Lidl',
  131129282: 'Kaufland',
  130007884: 'BILLA',
  121644736: 'METRO',
  206255903: 'Фантастико',
  831556063: 'Фантастико',
  131324923: 'T MARKET',
});

export const COLUMNS = Object.freeze([
  'Населено място',
  'Търговски обект',
  'Наименование на продукта',
  'Код на продукта',
  'Категория',
  'Цена на дребно',
  'Цена в промоция',
]);

const number = (text) => {
  const value = Number(String(text).trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
};

/**
 * Splits one line of a chain file into its seven fields.
 * Some chains quote every field but do not escape quotes inside product names, so a line that
 * starts and ends with a quote is cut at the "," separators instead of being parsed strictly.
 */
export function splitLine(line) {
  if (line.length > 1 && line[0] === '"' && line[line.length - 1] === '"') {
    const parts = line.slice(1, -1).split('","');
    if (parts.length === COLUMNS.length) return parts.map((part) => part.replaceAll('""', '"'));
  }
  let fields = null;
  eachCsvRow(line, (row) => {
    fields ||= row;
  });
  return fields && fields.length === COLUMNS.length ? fields : null;
}

/**
 * Calls onRow({ city, store, name, code, set, price, promo }) for every product row of a chain
 * file. Returns { rows, skipped }. Prices are in euro; promo is 0 when there is no promotion.
 */
export function eachProductRow(text, onRow) {
  let rows = 0;
  let skipped = 0;
  let header = true;
  let start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const length = text.length;
  while (start < length) {
    let end = text.indexOf('\n', start);
    if (end < 0) end = length;
    const line = text.slice(start, text[end - 1] === '\r' ? end - 1 : end);
    start = end + 1;
    if (!line) continue;
    const fields = splitLine(line);
    if (header) {
      header = false;
      if (!fields || fields[0].trim() !== COLUMNS[0])
        throw Error(`Unexpected header: ${line.slice(0, 120)}`);
      continue;
    }
    if (!fields) {
      skipped++;
      continue;
    }
    const city = Number(fields[0]);
    const set = Number(fields[4]);
    const price = number(fields[5]);
    if (!city || !set || !(price > 0)) {
      skipped++;
      continue;
    }
    rows++;
    onRow({
      city,
      store: fields[1].trim(),
      name: fields[2].replace(/\s+/g, ' ').trim(),
      code: fields[3].trim(),
      set,
      price,
      promo: number(fields[6]),
    });
  }
  return { rows, skipped };
}

/** The chain files inside the archive: [{ chain, name, text() }]. */
export function chainFiles(zipBuffer) {
  const files = [];
  for (const entry of zipEntries(zipBuffer)) {
    const id = entry.name.match(/_(\d{9,13})\.csv$/i)?.[1];
    const chain = CHAIN_FILES[id];
    if (chain) files.push({ chain, name: entry.name, text: () => entry.read().toString('utf8') });
  }
  return files;
}
