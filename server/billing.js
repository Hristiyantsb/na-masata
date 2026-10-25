/** Server-only price allowlist. Amounts are cents, not values accepted from the client. */
export const BILLING = {
  menu_monthly: { plan: 'menu', interval: 'month', amount: 900, key: 'STRIPE_MENU_MONTHLY' },
  menu_yearly: { plan: 'menu', interval: 'year', amount: 9000, key: 'STRIPE_MENU_YEARLY' },
  plus_monthly: { plan: 'plus', interval: 'month', amount: 2900, key: 'STRIPE_PLUS_MONTHLY' },
  plus_yearly: { plan: 'plus', interval: 'year', amount: 29000, key: 'STRIPE_PLUS_YEARLY' },
};
export function priceChoice(plan, interval, env) {
  const key = `${plan}_${interval}`,
    choice = BILLING[key];
  if (!choice || !env[choice.key]) throw Error('Price not configured');
  return { ...choice, id: env[choice.key] };
}
export function validatePrice(price, choice) {
  return (
    price.active === true &&
    price.currency === 'eur' &&
    price.unit_amount === choice.amount &&
    price.type === 'recurring' &&
    price.recurring?.interval === choice.interval &&
    price.recurring?.interval_count === 1
  );
}
export function entitlement(row, now = Math.floor(Date.now() / 1000)) {
  return (
    !!row &&
    ['active', 'trialing'].includes(row.status) &&
    Number(row.period_end) > now &&
    ['menu', 'plus'].includes(row.plan)
  );
}
export function subscriptionRecord(sub, env) {
  const items = sub.items?.data || [];
  if (items.length !== 1) return null;
  const choice = Object.values(BILLING).find((c) => env[c.key] === items[0].price?.id);
  if (!choice) return null;
  return {
    userId: sub.metadata?.user_id,
    subscriptionId: sub.id,
    customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    plan: choice.plan,
    interval: choice.interval,
    status: sub.status,
    periodEnd: items[0].current_period_end ?? sub.current_period_end ?? 0,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  };
}
/** Stripe requires the original, untouched request body. Multiple v1 signatures support rotation. */
export async function verifySignature(raw, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || !header) return false;
  const parts = header.split(',').map((x) => x.trim().split('=')),
    time = Number(parts.find(([k]) => k === 't')?.[1]);
  if (!Number.isInteger(time) || Math.abs(now - time) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  for (const [, sig] of parts.filter(([k, v]) => k === 'v1' && /^[a-f0-9]{64}$/i.test(v || ''))) {
    const bytes = Uint8Array.from(sig.match(/.{2}/g), (x) => parseInt(x, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(`${time}.${raw}`)))
      return true;
  }
  return false;
}
