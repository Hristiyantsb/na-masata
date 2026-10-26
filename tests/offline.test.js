import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync('docs/sw.js', 'utf8');
function harness(failDownload = false) {
  const handlers = {},
    stores = new Map(),
    calls = { network: [], downloads: [], deleted: [], claimed: 0, skipped: 0 };
  const scope = 'https://example.org/na-masata/';
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const map = stores.get(name);
      return {
        async addAll(requests) {
          calls.downloads.push(...requests.map((r) => r.url));
          if (failDownload) throw Error('download failed');
          for (const r of requests) map.set(r.url, new Response(r.url));
        },
        async match(key) {
          const found = map.get(typeof key === 'string' ? key : key.url);
          return found?.clone();
        },
      };
    },
    async delete(name) {
      calls.deleted.push(name);
      return stores.delete(name);
    },
    async keys() {
      return [...stores.keys()];
    },
  };
  const self = {
    registration: { scope },
    clients: {
      async claim() {
        calls.claimed++;
      },
    },
    skipWaiting() {
      calls.skipped++;
    },
    addEventListener(name, handler) {
      handlers[name] = handler;
    },
  };
  vm.runInNewContext(source, {
    self,
    caches,
    URL,
    Request,
    fetch: async (req) => {
      calls.network.push(req.url);
      return new Response('network');
    },
  });
  async function event(type, values = {}) {
    let response = null,
      waiting = null;
    handlers[type]({
      ...values,
      waitUntil(p) {
        waiting = p;
      },
      respondWith(p) {
        response = p;
      },
    });
    if (waiting) await waiting;
    return response ? await response : null;
  }
  return { event, calls, stores, scope };
}
test('offline install precaches the complete local release including Cyrillic fonts and decoder', async () => {
  const h = harness();
  await h.event('install');
  assert.ok(h.calls.downloads.includes(h.scope + 'index.html'));
  assert.ok(h.calls.downloads.includes(h.scope + 'src/app.js'));
  assert.ok(h.calls.downloads.includes(h.scope + 'assets/fonts/lora-cyrillic-700-normal.woff2'));
  assert.ok(h.calls.downloads.includes(h.scope + 'vendor/zxing-browser.min.js'));
  assert.ok(h.calls.downloads.every((url) => url.startsWith(h.scope)));
  assert.equal(h.calls.skipped, 0);
});
test('failed offline installation removes the incomplete release cache', async () => {
  const h = harness(true);
  await assert.rejects(h.event('install'), /download failed/);
  assert.equal(h.stores.size, 0);
});
test('offline navigation and assets use one cached release, while APIs and POST bypass it', async () => {
  const h = harness();
  await h.event('install');
  const navigation = await h.event('fetch', {
    request: { url: h.scope, method: 'GET', mode: 'navigate' },
  });
  assert.equal(await navigation.text(), h.scope + 'index.html');
  const script = await h.event('fetch', { request: new Request(h.scope + 'src/app.js') });
  assert.equal(await script.text(), h.scope + 'src/app.js');
  assert.equal(h.calls.network.length, 0);
  for (const request of [
    new Request(h.scope + 'api/me'),
    new Request(h.scope + 'src/app.js', { method: 'POST' }),
    new Request('https://stripe.example/checkout'),
  ])
    assert.equal(await h.event('fetch', { request }), null);
});
test('activation deletes only old caches owned by this app and scope', async () => {
  const h = harness();
  h.stores.set('unrelated-cache', new Map());
  h.stores.set('na-masata:/other-app/:old', new Map());
  h.stores.set('na-masata:/na-masata/:old', new Map());
  await h.event('install');
  await h.event('activate');
  assert.deepEqual(h.calls.deleted, ['na-masata:/na-masata/:old']);
  assert.equal(h.calls.claimed, 1);
});
test('an update requires an explicit message from a scoped app client', async () => {
  const h = harness();
  await h.event('message', {
    data: { type: 'ACTIVATE_UPDATE' },
    source: { url: 'https://other.org/' },
  });
  assert.equal(h.calls.skipped, 0);
  await h.event('message', { data: { type: 'ACTIVATE_UPDATE' }, source: { url: h.scope } });
  assert.equal(h.calls.skipped, 1);
});
