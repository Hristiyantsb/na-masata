/** Supabase email OTP adapter. Session tokens stay in memory, never in backups/localStorage. */
export function createAuth(config, fetcher = (...args) => fetch(...args)) {
  let session = null,
    refreshing = null,
    generation = 0,
    lastEmailAt = 0;
  const configured = () => Boolean(config.supabaseUrl && config.supabasePublicKey);
  async function call(path, body, token) {
    if (!configured()) throw Error('Входът с имейл още не е активиран.');
    const base = new URL(config.supabaseUrl);
    if (base.protocol !== 'https:') throw Error('Невалидна конфигурация за вход.');
    const r = await fetcher(new URL('/auth/v1/' + path, base), {
      method: 'POST',
      headers: {
        apikey: config.supabasePublicKey,
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12000),
      credentials: 'omit',
    });
    const data = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) {
      const error = Error(
        r.status === 429
          ? 'Изчакай малко, преди да опиташ отново.'
          : 'Входът не успя. Провери кода или поискай нов.',
      );
      error.status = r.status;
      throw error;
    }
    return data;
  }
  function accept(data) {
    if (
      !data.access_token ||
      !data.refresh_token ||
      !data.user?.id ||
      !Number.isFinite(data.expires_in)
    )
      throw Error('Невалиден отговор при вход.');
    session = { ...data, expires_at: Date.now() / 1000 + data.expires_in };
  }
  return {
    configured,
    user: () => session?.user || null,
    async sendCode(email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
        throw Error('Провери имейл адреса.');
      if (Date.now() - lastEmailAt < 60000)
        throw Error('Изчакай една минута, преди да поискаш нов код.');
      lastEmailAt = Date.now();
      await call('otp', { email, create_user: true });
    },
    async verify(email, token) {
      if (!/^\d{6,10}$/.test(token)) throw Error('Въведи кода от имейла.');
      const current = ++generation;
      const data = await call('verify', { email, token, type: 'email' });
      if (current !== generation) throw Error('Входът е прекратен.');
      accept(data);
      return session.user;
    },
    async token() {
      if (!session) return null;
      if (session.expires_at > Date.now() / 1000 + 60) return session.access_token;
      if (!refreshing) {
        const current = generation;
        refreshing = call('token?grant_type=refresh_token', {
          refresh_token: session.refresh_token,
        })
          .then((data) => {
            if (current !== generation) return null;
            accept(data);
            return session.access_token;
          })
          .catch((error) => {
            if (current === generation && [400, 401, 403].includes(error.status)) session = null;
            throw error;
          })
          .finally(() => {
            refreshing = null;
          });
      }
      return refreshing;
    },
    async signOut() {
      const token = session?.access_token;
      generation++;
      session = null;
      if (token) await call('logout?scope=local', null, token);
    },
  };
}
