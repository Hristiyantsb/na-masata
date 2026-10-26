import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import { cloudRoute } from '../server/cloud.js';
import worker from '../server/worker.js';
import { defaults } from '../docs/src/domain.js';
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(fs.readFileSync(new URL('../server/migration.sql', import.meta.url), 'utf8'));
  const DB = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              return sqlite.prepare(sql).get(...args) || null;
            },
            async run() {
              const result = sqlite.prepare(sql).run(...args);
              return { meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
  return { DB, close: () => sqlite.close() };
}
const respond = (data, status = 200) => Response.json(data, { status });
const req = (body) =>
  new Request('https://api.example/backup', { method: 'POST', body: JSON.stringify(body) });
test('real SQLite CAS isolates users, rejects stale and missing revisions, keeps deletion tombstones', async () => {
  const env = database();
  try {
    const first = await cloudRoute(
      req({ revision: null, state: defaults() }),
      env,
      'alice',
      respond,
    );
    assert.equal(first.status, 200);
    const { revision } = await first.json();
    assert.equal(
      (await cloudRoute(req({ revision: null, state: defaults() }), env, 'alice', respond)).status,
      409,
    );
    assert.equal(
      (
        await cloudRoute(
          req({ revision: crypto.randomUUID(), state: defaults() }),
          env,
          'alice',
          respond,
        )
      ).status,
      409,
    );
    const other = await cloudRoute(new Request('https://api.example/backup'), env, 'bob', respond);
    assert.equal((await other.json()).state, null);
    const deleted = await cloudRoute(req({ revision, state: null }), env, 'alice', respond);
    assert.equal(deleted.status, 200);
    assert.equal(
      (await cloudRoute(req({ revision, state: defaults() }), env, 'alice', respond)).status,
      409,
    );
    const read = await (
      await cloudRoute(new Request('https://api.example/backup'), env, 'alice', respond)
    ).json();
    assert.equal(read.state, null);
    assert.notEqual(read.revision, revision);
    assert.equal(
      (await cloudRoute(req({ revision: read.revision, state: defaults() }), env, 'alice', respond))
        .status,
      200,
    );
    assert.equal((await cloudRoute(req({ state: defaults() }), env, 'bob', respond)).status, 400);
    assert.equal(
      (
        await cloudRoute(
          req({ revision: null, state: { diary: [{ name: 'invalid' }] } }),
          env,
          'bob',
          respond,
        )
      ).status,
      400,
    );
  } finally {
    env.close();
  }
});
test('worker rejects anonymous cloud access and takes identity only from verified bearer token', async () => {
  const env = database(),
    original = globalThis.fetch;
  Object.assign(env, {
    SUPABASE_URL: 'https://auth.example',
    SUPABASE_ANON_KEY: 'public',
    APP_ORIGIN: 'https://app.example',
  });
  try {
    assert.equal(
      (await worker.fetch(new Request('https://api.example/backup'), env, {})).status,
      401,
    );
    globalThis.fetch = async () =>
      Response.json({
        id: '11111111-1111-4111-8111-111111111111',
        email_confirmed_at: '2026-01-01',
      });
    const request = new Request('https://api.example/backup', {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
      body: JSON.stringify({ revision: null, state: defaults(), userId: 'victim' }),
    });
    assert.equal((await worker.fetch(request, env, {})).status, 200);
    assert.equal(
      await env.DB.prepare('SELECT revision FROM user_backups WHERE user_id=?')
        .bind('victim')
        .first(),
      null,
    );
  } finally {
    globalThis.fetch = original;
    env.close();
  }
});
test('product search returns usable macros, caches results and requires Plus', async () => {
  const env = database(),
    original = globalThis.fetch,
    id = '22222222-2222-4222-8222-222222222222';
  Object.assign(env, {
    SUPABASE_URL: 'https://auth.example',
    SUPABASE_ANON_KEY: 'public',
    OFF_USER_AGENT: 'test-only',
    APP_ORIGIN: 'https://app.example',
  });
  let offCalls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user'))
      return Response.json({ id, email_confirmed_at: '2026-01-01' });
    offCalls++;
    assert.ok(String(url).startsWith('https://world.openfoodfacts.org/cgi/search.pl?'));
    return Response.json({
      products: [
        {
          code: '3017620422003',
          product_name_bg: 'Продукт',
          nutriments: { 'energy-kcal_100g': 100, carbohydrates_100g: 12, fat_100g: 4 },
        },
      ],
    });
  };
  const query = () =>
    new Request('https://api.example/products/search?q=' + encodeURIComponent('мляко'), {
      headers: { Authorization: 'Bearer test' },
    });
  try {
    assert.equal((await worker.fetch(query(), env, {})).status, 403);
    assert.equal(offCalls, 0);
    await env.DB.prepare('INSERT INTO subscriptions VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(
        id,
        'cus_test',
        'sub_test',
        'plus',
        'month',
        'active',
        Math.floor(Date.now() / 1000) + 3600,
        0,
        0,
      )
      .run();
    const first = await worker.fetch(query(), env, {});
    assert.equal(first.status, 200);
    const result = await first.json();
    assert.equal(result.products[0].carbs, 12);
    assert.equal(result.products[0].protein, null);
    assert.equal((await worker.fetch(query(), env, {})).status, 200);
    assert.equal(offCalls, 1);
  } finally {
    globalThis.fetch = original;
    env.close();
  }
});
