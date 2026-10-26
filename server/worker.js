import {
  priceChoice,
  validatePrice,
  entitlement,
  subscriptionRecord,
  verifySignature,
} from './billing.js';
import { cloudRoute } from './cloud.js';
import { diaryRoute } from './diary.js';
import { isValidBarcode } from '../docs/src/domain.js';
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
import { normalizeProduct } from './products.js';
export { normalizeProduct } from './products.js';
async function bodyJSON(request) {
  if (Number(request.headers.get('content-length')) > 16384) throw Error('Body too large');
  const text = await request.text();
  if (text.length > 16384) throw Error('Body too large');
  return JSON.parse(text);
}
async function stripe(path, env, method = 'GET', params = null, idempotencyKey = null) {
  if (!env.STRIPE_SECRET_KEY) throw Error('Billing not configured');
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: params ? new URLSearchParams(params) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok) throw Error('Stripe request failed');
  return data;
}
async function userFrom(request, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const token = request.headers.get('Authorization');
  if (!token?.startsWith('Bearer ') || token.length > 8192) return null;
  const url = new URL('/auth/v1/user', env.SUPABASE_URL);
  if (url.protocol !== 'https:') return null;
  const r = await fetch(url, {
    headers: { Authorization: token, apikey: env.SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) return null;
  const u = await r.json();
  return typeof u.id === 'string' && /^[0-9a-f-]{36}$/i.test(u.id) && u.email_confirmed_at
    ? { id: u.id }
    : null;
}
async function rateLimit(env, key, max) {
  const bucket = Math.floor(Date.now() / 60000);
  await env.DB.prepare(
    'INSERT INTO rate_limits (key,bucket,count) VALUES (?, ?, 1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1',
  )
    .bind(key, bucket)
    .run();
  const r = await env.DB.prepare('SELECT count FROM rate_limits WHERE key=? AND bucket=?')
    .bind(key, bucket)
    .first();
  return r.count <= max;
}
async function billingRow(env, id) {
  return env.DB.prepare('SELECT * FROM subscriptions WHERE user_id=?').bind(id).first();
}
async function webhook(request, env) {
  if (!env.DB || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY)
    return json({ error: 'unconfigured' }, 503);
  if (Number(request.headers.get('content-length')) > 262144)
    return json({ error: 'too_large' }, 413);
  const raw = await request.text();
  if (raw.length > 262144) return json({ error: 'too_large' }, 413);
  if (
    !(await verifySignature(
      raw,
      request.headers.get('stripe-signature'),
      env.STRIPE_WEBHOOK_SECRET,
    ))
  )
    return json({ error: 'signature' }, 400);
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'json' }, 400);
  }
  if (!event.id || !Number.isInteger(event.created)) return json({ error: 'event' }, 400);
  if (await env.DB.prepare('SELECT id FROM webhook_events WHERE id=?').bind(event.id).first())
    return json({ received: true, duplicate: true });
  const object = event.data?.object;
  let subId;
  if (event.type.startsWith('customer.subscription.')) subId = object?.id;
  else if (event.type === 'checkout.session.completed') subId = object?.subscription;
  else if (['invoice.paid', 'invoice.payment_failed'].includes(event.type))
    subId = object?.subscription || object?.parent?.subscription_details?.subscription;
  else return json({ received: true, ignored: true });
  if (typeof subId !== 'string' || !/^sub_[a-zA-Z0-9]+$/.test(subId))
    return json({ received: true, ignored: true });
  // Always reconcile the canonical provider state; do not activate from a success redirect.
  const sub = await stripe(`subscriptions/${subId}`, env),
    row = subscriptionRecord(sub, env);
  if (!row?.userId || !row.customerId || !/^[0-9a-f-]{36}$/i.test(row.userId))
    return json({ error: 'unrecognized_subscription' }, 422);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO subscriptions(user_id,customer_id,subscription_id,plan,interval,status,period_end,cancel_at_period_end,event_created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET customer_id=excluded.customer_id,subscription_id=excluded.subscription_id,plan=excluded.plan,interval=excluded.interval,status=excluded.status,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,event_created=excluded.event_created WHERE excluded.event_created>=subscriptions.event_created`,
    ).bind(
      row.userId,
      row.customerId,
      row.subscriptionId,
      row.plan,
      row.interval,
      row.status,
      row.periodEnd,
      row.cancelAtPeriodEnd ? 1 : 0,
      event.created,
    ),
    env.DB.prepare('INSERT INTO webhook_events(id,received_at) VALUES(?,?)').bind(
      event.id,
      Math.floor(Date.now() / 1000),
    ),
  ]);
  return json({ received: true });
}
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url),
      origin = request.headers.get('origin'),
      allowedOrigin = env.APP_ORIGIN;
    const cors =
      origin && origin === allowedOrigin
        ? {
            'Access-Control-Allow-Origin': origin,
            Vary: 'Origin',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        : {};
    const respond = (data, status = 200) => json(data, status, cors);
    if (url.pathname === '/webhooks/stripe' && request.method === 'POST') {
      try {
        return await webhook(request, env);
      } catch {
        return respond({ error: 'webhook_retry' }, 500);
      }
    }
    if (origin && origin !== allowedOrigin) return respond({ error: 'origin' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/health' && request.method === 'GET')
      return respond({
        status: 'ok',
        version: '0.7.0',
        // Booleans only: never return secrets or environment details.
        databaseConfigured: !!env.DB,
        authConfigured: !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
        billingConfigured: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.DB),
        productLookupConfigured: !!(env.OFF_USER_AGENT && env.DB),
        photoAnalysisAvailable: false,
      });
    if (!env.DB) return respond({ error: 'unconfigured' }, 503);
    let user;
    try {
      user = await userFrom(request, env);
    } catch {
      return respond({ error: 'authentication_unavailable' }, 503);
    }
    if (!user) return respond({ error: 'unauthenticated' }, 401);
    try {
      if (url.pathname === '/diary' || url.pathname.startsWith('/diary/')) {
        if (!(await rateLimit(env, `diary:${user.id}`, 60)))
          return respond({error:'rate_limit'},429);
        return diaryRoute(request,env,user.id,respond,url.pathname);
      }
      if (url.pathname === '/account/data' && request.method === 'DELETE') {
        if (!(await rateLimit(env, `delete-data:${user.id}`, 2)))
          return respond({error:'rate_limit'},429);
        const record = await billingRow(env,user.id);
        // An active subscription must be managed first, to avoid unexpected billing.
        if (entitlement(record)) return respond({error:'active_subscription'},409);
        let confirmation;
        try {
          const payload = await bodyJSON(request);
          confirmation = payload?.confirmation;
        } catch { return respond({error:'invalid_confirmation'},400); }
        if (confirmation !== 'DELETE_MY_APP_DATA')
          return respond({error:'invalid_confirmation'},400);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM user_diary WHERE user_id=?').bind(user.id),
          env.DB.prepare('DELETE FROM user_backups WHERE user_id=?').bind(user.id)
        ]);
        // Provider identity and historic payment records are deliberately retained:
        // removing those needs a separate audited, provider-specific workflow.
        return respond({deleted:true,scope:['diary','backup'],authAccountStillExists:true});
      }
      if (url.pathname === '/backup') {
        if (!(await rateLimit(env, `backup:${user.id}`, 10)))
          return respond({ error: 'rate_limit' }, 429);
        return await cloudRoute(request, env, user.id, respond);
      }
      const row = await billingRow(env, user.id);
      if (url.pathname === '/me' && request.method === 'GET')
        return respond({
          userId: user.id,
          entitlement: entitlement(row)
            ? {
                plan: row.plan,
                interval: row.interval,
                periodEnd: row.period_end,
                cancelAtPeriodEnd: !!row.cancel_at_period_end,
              }
            : null,
        });
      if (url.pathname === '/billing/checkout' && request.method === 'POST') {
        if (!(await rateLimit(env, `checkout:${user.id}`, 5)))
          return respond({ error: 'rate_limit' }, 429);
        if (entitlement(row)) return respond({ error: 'use_billing_portal' }, 409);
        const { plan, interval } = await bodyJSON(request);
        let choice;
        try {
          choice = priceChoice(plan, interval, env);
        } catch {
          return respond({ error: 'invalid_price' }, 400);
        }
        const price = await stripe(`prices/${choice.id}`, env);
        if (!validatePrice(price, choice))
          return respond({ error: 'price_configuration_mismatch' }, 503);
        const app = new URL(env.APP_URL);
        if (app.protocol !== 'https:' || app.origin !== env.APP_ORIGIN)
          throw Error('Invalid app URL');
        const params = {
          mode: 'subscription',
          'line_items[0][price]': choice.id,
          'line_items[0][quantity]': '1',
          client_reference_id: user.id,
          'subscription_data[metadata][user_id]': user.id,
          'metadata[user_id]': user.id,
          success_url: `${app.href}#plans`,
          cancel_url: `${app.href}#plans`,
          ...(row?.customer_id ? { customer: row.customer_id } : {}),
        };
        const session = await stripe(
          'checkout/sessions',
          env,
          'POST',
          params,
          `${user.id}:${plan}:${interval}:${Math.floor(Date.now() / 60000)}`,
        );
        return respond({ url: session.url });
      }
      if (url.pathname === '/billing/portal' && request.method === 'POST') {
        if (!row?.customer_id) return respond({ error: 'no_customer' }, 404);
        if (!(await rateLimit(env, `portal:${user.id}`, 5)))
          return respond({ error: 'rate_limit' }, 429);
        const session = await stripe('billing_portal/sessions', env, 'POST', {
          customer: row.customer_id,
          return_url: env.APP_URL,
        });
        return respond({ url: session.url });
      }
      if (url.pathname === '/products/search' && request.method === 'GET') {
        if (!entitlement(row) || row.plan !== 'plus')
          return respond({ error: 'plus_required' }, 403);
        const q = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('bg');
        if (q.length < 2 || q.length > 100) return respond({ error: 'invalid_query' }, 400);
        if (!(await rateLimit(env, `search:${user.id}`, 5)))
          return respond({ error: 'rate_limit' }, 429);
        const cached = await env.DB.prepare(
          'SELECT payload,expires_at FROM product_search_cache WHERE query=?',
        )
          .bind(q)
          .first();
        if (cached && cached.expires_at > Date.now() / 1000)
          return respond(JSON.parse(cached.payload));
        if (!env.OFF_USER_AGENT) return respond({ error: 'product_service_unconfigured' }, 503);
        if (!(await rateLimit(env, 'off:search', 3))) return respond({ error: 'rate_limit' }, 429);
        const search = new URL('https://world.openfoodfacts.org/cgi/search.pl');
        search.search = new URLSearchParams({
          search_terms: q,
          search_simple: '1',
          action: 'process',
          json: '1',
          page_size: '20',
          fields: 'code,product_name,product_name_bg,generic_name,brands,serving_size,nutriments',
        });
        const response = await fetch(search, {
          headers: { 'User-Agent': env.OFF_USER_AGENT },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return respond({ error: 'product_service_unavailable' }, 502);
        const data = await response.json();
        const products = (Array.isArray(data.products) ? data.products : [])
          .slice(0, 20)
          .map((product) => normalizeProduct({ product }, String(product.code || '')))
          .filter(Boolean);
        const payload = { products };
        await env.DB.prepare(
          'INSERT INTO product_search_cache(query,payload,expires_at) VALUES(?,?,?) ON CONFLICT(query) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at',
        )
          .bind(q, JSON.stringify(payload), Math.floor(Date.now() / 1000) + 86400)
          .run();
        return respond(payload);
      }
      if (url.pathname.startsWith('/products/') && request.method === 'GET') {
        if (!entitlement(row) || row.plan !== 'plus')
          return respond({ error: 'plus_required' }, 403);
        const code = url.pathname.slice('/products/'.length);
        if (!isValidBarcode(code)) return respond({ error: 'invalid_barcode' }, 400);
        if (!(await rateLimit(env, `product:${user.id}`, 10)))
          return respond({ error: 'rate_limit' }, 429);
        const cached = await env.DB.prepare(
          'SELECT payload,expires_at FROM product_cache WHERE barcode=?',
        )
          .bind(code)
          .first();
        if (cached && cached.expires_at > Date.now() / 1000)
          return respond(JSON.parse(cached.payload));
        if (!env.OFF_USER_AGENT) return respond({ error: 'product_service_unconfigured' }, 503);
        if (!(await rateLimit(env, 'off:global', 14)))
          return respond({ error: 'rate_limit' }, 429);
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v3.6/product/${code}.json?fields=product_name,product_name_bg,generic_name,brands,serving_size,nutriments`,
          { headers: { 'User-Agent': env.OFF_USER_AGENT }, signal: AbortSignal.timeout(10000) },
        );
        if (response.status === 404) return respond({ error: 'not_found' }, 404);
        if (!response.ok) return respond({ error: 'product_service_unavailable' }, 502);
        const product = normalizeProduct(await response.json(), code);
        if (!product) return respond({ error: 'not_found' }, 404);
        await env.DB.prepare(
          'INSERT INTO product_cache(barcode,payload,expires_at) VALUES(?,?,?) ON CONFLICT(barcode) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at',
        )
          .bind(code, JSON.stringify(product), Math.floor(Date.now() / 1000) + 86400)
          .run();
        return respond(product);
      }
      if (url.pathname === '/food/analyze' && request.method === 'POST')
        return respond({ error: 'photo_analysis_not_configured' }, 501);
      return respond({ error: 'not_found' }, 404);
    } catch {
      return respond({ error: 'service_unavailable' }, 503);
    }
  },
  async scheduled(event, env) {
    if (env.DB)
      await env.DB.batch([
        env.DB.prepare('DELETE FROM rate_limits WHERE bucket<?').bind(
          Math.floor(Date.now() / 60000) - 60,
        ),
        env.DB.prepare('DELETE FROM product_search_cache WHERE expires_at<?').bind(
          Math.floor(Date.now() / 1000),
        ),
        env.DB.prepare('DELETE FROM product_cache WHERE expires_at<?').bind(
          Math.floor(Date.now() / 1000),
        ),
      ]);
  },
};
