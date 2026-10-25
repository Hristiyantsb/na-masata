import { CONFIG } from './config.js';
import { isValidBarcode } from './domain.js';
/** No credentials in the static bundle. Auth adapter can supply a short-lived token. */
let tokenProvider = async () => null;
export const setTokenProvider = (fn) => {
  tokenProvider = fn;
};
export async function request(path, { method = 'GET', body, signal } = {}) {
  if (!CONFIG.apiBase) throw new Error('Връзката със сървъра още не е активирана.');
  const base = new URL(CONFIG.apiBase);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost')
    throw new Error('Невалидна конфигурация.');
  const token = await tokenProvider();
  const timeout = AbortSignal.timeout(12000);
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    credentials: 'omit',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw Error('Влез в профила си, за да продължиш.');
    if (response.status === 403) throw Error('Тази функция изисква активен план Меню Плюс.');
    if (response.status === 404)
      throw Error('Продуктът не е намерен. Можеш да го въведеш от етикета.');
    if (response.status === 429) throw Error('Твърде много заявки. Опитай след малко.');
    throw Error('Услугата временно не е достъпна. Опитай отново.');
  }
  return data;
}
export async function lookupBarcode(code, signal) {
  if (!isValidBarcode(code)) throw Error('Провери цифрите на баркода.');
  return request(`/products/${code}`, { signal });
}
export async function checkout(plan, interval) {
  if (!['menu', 'plus'].includes(plan) || !['monthly', 'yearly'].includes(interval))
    throw Error('Невалиден план.');
  return request('/billing/checkout', { method: 'POST', body: { plan, interval } });
}
