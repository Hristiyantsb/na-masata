// Where the daily archive of the price portal lives and how the newest one is fetched.

export const ARCHIVE_URL = (date) => `https://kolkostruva.bg/opendata_files/${date}.zip`;

/** The calendar date in Sofia, `back` days before `now`, as YYYY-MM-DD. */
export function sofiaDate(back = 0, now = Date.now()) {
  const day = new Date(now - back * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(day);
}

/**
 * Downloads the newest archive: today's if it is out, else the newest of the days before it.
 * The archive of a day appears late that evening, so in the morning it is usually yesterday's.
 * An answer that is not a zip (an error page, a challenge page) counts as "no archive".
 * Returns { buffer, date }; throws when none of the days has one. Nothing is written to disk.
 */
export async function newestArchive({
  fetcher = globalThis.fetch,
  now = Date.now(),
  days = 4,
  minBytes = 1_000_000,
  log = console.log,
} = {}) {
  for (let back = 0; back < days; back++) {
    const date = sofiaDate(back, now);
    let response;
    try {
      response = await fetcher(ARCHIVE_URL(date), {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; price-reader/1.0)' },
      });
    } catch (error) {
      log(`${date}: the request failed (${error.message})`);
      continue;
    }
    if (!response.ok) {
      log(`${date}: no archive (HTTP ${response.status})`);
      continue;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < minBytes || buffer.readUInt32LE(0) !== 0x04034b50) {
      log(`${date}: the answer is not an archive (${buffer.length} bytes)`);
      continue;
    }
    log(`${date}: downloaded ${(buffer.length / 1e6).toFixed(1)} MB`);
    return { buffer, date };
  }
  throw Error(`No archive could be downloaded for the last ${days} days`);
}
