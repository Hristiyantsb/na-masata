import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { normalizeProduct } from '../server/worker.js';
import {
  priceChoice,
  validatePrice,
  entitlement,
  subscriptionRecord,
  verifySignature,
} from '../server/billing.js';
const env = {
  STRIPE_MENU_MONTHLY: 'price_menu_month',
  STRIPE_MENU_YEARLY: 'price_menu_year',
  STRIPE_PLUS_MONTHLY: 'price_plus_month',
  STRIPE_PLUS_YEARLY: 'price_plus_year',
};
test('server allowlist cannot accept arbitrary price or amount', () => {
  const c = priceChoice('plus', 'yearly', env);
  assert.equal(c.amount, 29000);
  assert.throws(() => priceChoice('plus', 'weekly', env));
  assert.throws(() => priceChoice('free', 'monthly', env));
  const valid = {
    active: true,
    currency: 'eur',
    unit_amount: 29000,
    type: 'recurring',
    recurring: { interval: 'year', interval_count: 1 },
  };
  assert.equal(validatePrice(valid, c), true);
  assert.equal(validatePrice({ ...valid, unit_amount: 29 }, c), false);
  assert.equal(validatePrice({ ...valid, currency: 'usd' }, c), false);
});
test('entitlements require active provider state, known plan and unexpired period', () => {
  const r = { plan: 'plus', status: 'active', period_end: 200 };
  assert.equal(entitlement(r, 100), true);
  assert.equal(entitlement(r, 201), false);
  for (const status of ['past_due', 'canceled', 'unpaid', 'incomplete'])
    assert.equal(entitlement({ ...r, status }, 100), false);
  assert.equal(entitlement(null), false);
});
test('subscription is mapped from server price IDs, not client claims', () => {
  const s = {
    id: 'sub_123',
    customer: 'cus_123',
    metadata: { user_id: 'u' },
    status: 'active',
    items: { data: [{ price: { id: 'price_plus_year' }, current_period_end: 200 }] },
  };
  assert.equal(subscriptionRecord(s, env).plan, 'plus');
  assert.equal(subscriptionRecord(s, env).interval, 'year');
  assert.equal(
    subscriptionRecord({ ...s, items: { data: [{ price: { id: 'unknown' } }] } }, env),
    null,
  );
});
async function sign(raw, t, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}
test('webhook signatures reject tampering, old timestamps, invalid keys and support rotation', async () => {
  const raw = '{"id":"evt_1"}',
    t = 1000,
    secret = 'test-only',
    sig = await sign(raw, t, secret);
  assert.equal(await verifySignature(raw, `t=${t},v1=${sig}`, secret, t), true);
  assert.equal(await verifySignature(raw + ' ', `t=${t},v1=${sig}`, secret, t), false);
  assert.equal(await verifySignature(raw, `t=${t},v1=${sig}`, secret, 1400), false);
  assert.equal(await verifySignature(raw, `t=${t},v1=garbage,v1=${sig}`, secret, t), true);
  assert.equal(await verifySignature(raw, '', secret, t), false);
});
test('unknown origins and anonymous premium requests fail closed', async () => {
  assert.equal(
    (
      await worker.fetch(
        new Request('https://api.example/me', { headers: { origin: 'https://evil.example' } }),
        { APP_ORIGIN: 'https://good.example' },
        {},
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request('https://api.example/me'),
        { DB: {}, APP_ORIGIN: 'https://good.example' },
        {},
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request('https://api.example/webhooks/stripe', { method: 'POST', body: '{}' }),
        {},
        {},
      )
    ).status,
    503,
  );
});
test('missing nutrition remains unknown, not zero; product names are bounded', () => {
  assert.equal(normalizeProduct({}, '3017620422003'), null);
  const p = normalizeProduct(
    { product: { product_name: 'Test', nutriments: {} } },
    '3017620422003',
  );
  assert.equal(p.kcal, null);
  assert.equal(p.protein, null);
  assert.equal(
    normalizeProduct(
      {
        product: {
          product_name: 'x'.repeat(500),
          nutriments: { 'energy-kcal_100g': 150, proteins_100g: 6 },
        },
      },
      '3017620422003',
    ).name.length,
    120,
  );
});
