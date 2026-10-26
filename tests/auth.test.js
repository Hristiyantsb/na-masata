import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../docs/src/auth.js';
const config = { supabaseUrl: 'https://test.supabase.co', supabasePublicKey: 'public-test' };
const session = (expires_in = 3600) => ({
  access_token: 'short-lived',
  refresh_token: 'refresh',
  expires_in,
  user: { id: 'user-a', email: 'a@example.com' },
});
test('unconfigured auth performs no network call; valid OTP follows official endpoints', async () => {
  const offline = createAuth({}, () => {
    throw Error('must not fetch');
  });
  assert.equal(offline.configured(), false);
  assert.equal(await offline.token(), null);
  await assert.rejects(offline.sendCode('a@example.com'), /активиран/);
  const calls = [];
  const auth = createAuth(config, async (url, opts) => {
    calls.push([String(url), JSON.parse(opts.body)]);
    return Response.json(String(url).endsWith('/verify') ? session() : {});
  });
  await auth.sendCode('a@example.com');
  await assert.rejects(auth.sendCode('a@example.com'), /минута/);
  await auth.verify('a@example.com', '123456');
  assert.equal(await auth.token(), 'short-lived');
  assert.equal(calls[0][1].create_user, true);
  assert.equal(calls[1][1].type, 'email');
});
test('concurrent refresh uses one request and logout cannot be undone by late refresh', async () => {
  let resolveRefresh,
    refreshCount = 0;
  const auth = createAuth(config, async (url) => {
    if (String(url).includes('token?')) {
      refreshCount++;
      return new Promise((resolve) => {
        resolveRefresh = () => resolve(Response.json(session()));
      });
    }
    if (String(url).includes('/logout')) return new Response(null, { status: 204 });
    return Response.json(session(0));
  });
  await auth.verify('a@example.com', '123456');
  const a = auth.token(),
    b = auth.token();
  await Promise.resolve();
  assert.equal(refreshCount, 1);
  await auth.signOut();
  resolveRefresh();
  assert.equal(await a, null);
  assert.equal(await b, null);
  assert.equal(auth.user(), null);
});
test('network failure does not erase session but rejected refresh does', async () => {
  let mode = 'verify';
  const auth = createAuth(config, async () =>
    mode === 'network'
      ? Promise.reject(Error('offline'))
      : mode === 'invalid'
        ? Response.json({}, { status: 401 })
        : Response.json(session(0)),
  );
  await auth.verify('a@example.com', '123456');
  mode = 'network';
  await assert.rejects(auth.token(), /offline/);
  assert.equal(auth.user().id, 'user-a');
  mode = 'invalid';
  await assert.rejects(auth.token());
  assert.equal(auth.user(), null);
});
test('an old refresh never supplies the token of a newly signed-in account', async () => {
  let release,
    verifications = 0;
  const auth = createAuth(config, async (url) => {
    if (String(url).includes('token?'))
      return new Promise((resolve) => {
        release = () => resolve(Response.json(session()));
      });
    if (String(url).includes('/logout')) return new Response(null, { status: 204 });
    verifications++;
    return Response.json(
      verifications === 1
        ? session(0)
        : { ...session(), access_token: 'account-b-token', user: { id: 'user-b' } },
    );
  });
  await auth.verify('a@example.com', '123456');
  const oldRequest = auth.token();
  await auth.signOut();
  await auth.verify('b@example.com', '654321');
  release();
  assert.equal(await oldRequest, null);
  assert.equal(await auth.token(), 'account-b-token');
});
