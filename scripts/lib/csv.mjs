// A small RFC 4180 reader: quoted fields, doubled quotes, commas and line breaks inside quotes.

/** Calls onRow(fields) for every record of a CSV text. A leading byte-order mark is ignored. */
export function eachCsvRow(text, onRow, delimiter = ',') {
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const n = text.length;
  let row = [];
  let field = '';
  while (i < n) {
    const ch = text[i];
    if (ch === '"') {
      // A quoted field: read up to the closing quote, taking "" as one quote.
      i++;
      for (;;) {
        const close = text.indexOf('"', i);
        if (close < 0) {
          field += text.slice(i);
          i = n;
          break;
        }
        field += text.slice(i, close);
        if (text[close + 1] === '"') {
          field += '"';
          i = close + 2;
        } else {
          i = close + 1;
          break;
        }
      }
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') onRow(row);
      row = [];
      i += ch === '\r' && text[i + 1] === '\n' ? 2 : 1;
    } else {
      // Plain text up to the next delimiter or line end.
      let stop = i;
      while (stop < n) {
        const c = text[stop];
        if (c === delimiter || c === '\n' || c === '\r' || c === '"') break;
        stop++;
      }
      field += text.slice(i, stop);
      i = stop;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    onRow(row);
  }
}
