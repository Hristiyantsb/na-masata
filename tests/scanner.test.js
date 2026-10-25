import test from 'node:test';
import assert from 'node:assert/strict';
import { Scanner } from '../docs/src/scanner.js';
function mockCamera(t, getUserMedia, decodeFromStream) {
  t.mock.method(globalThis, 'setTimeout', setTimeout);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      ZXingBrowser: {
        BrowserMultiFormatReader: class {
          decodeFromStream(...args) {
            return decodeFromStream(...args);
          }
        },
      },
    },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia } },
  });
  t.after(() => {
    for (const [key, descriptor] of [
      ['window', originalWindow],
      ['navigator', originalNavigator],
    ]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}
test('closing during pending permission stops the late camera stream', async (t) => {
  let allow,
    stopped = 0,
    decoded = 0;
  const granted = new Promise((resolve) => {
    allow = resolve;
  });
  mockCamera(
    t,
    () => granted,
    () => {
      decoded++;
    },
  );
  const scanner = new Scanner();
  const pending = scanner.start({}, () => assert.fail('unexpected result'));
  await Promise.resolve();
  scanner.stop();
  allow({ getTracks: () => [{ stop: () => stopped++ }] });
  await pending;
  assert.equal(stopped, 1);
  assert.equal(decoded, 0);
  assert.equal(scanner.stream, null);
});
test('stopping an active scanner releases both controls and tracks idempotently', async (t) => {
  let tracks = 0,
    controls = 0;
  mockCamera(
    t,
    async () => ({ getTracks: () => [{ stop: () => tracks++ }] }),
    async () => ({ stop: () => controls++ }),
  );
  const scanner = new Scanner();
  await scanner.start({}, () => {});
  scanner.stop();
  scanner.stop();
  assert.equal(tracks, 1);
  assert.equal(controls, 1);
});
test('decoder setup failure releases an already acquired stream', async (t) => {
  let stopped = 0;
  mockCamera(
    t,
    async () => ({ getTracks: () => [{ stop: () => stopped++ }] }),
    async () => {
      throw Error('decoder failed');
    },
  );
  const scanner = new Scanner();
  await assert.rejects(
    scanner.start({}, () => {}),
    /decoder failed/,
  );
  assert.equal(stopped, 1);
  assert.equal(scanner.stream, null);
});
