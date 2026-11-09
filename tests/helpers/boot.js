// Boots the real app.js inside linkedom with an in-memory localStorage.
// Each test file runs in its own process, so the module boots once per file.
import { parseHTML } from 'linkedom';
import { STORAGE_KEY } from '../../docs/src/storage.js';

export async function boot({ state = null, hash = '#menu', reducedMotion = true } = {}) {
  const { document, window } = parseHTML(
    '<html><body><div id="app"></div><dialog id="sheet"></dialog><div id="toast"></div></body></html>',
  );
  const data = new Map(state ? [[STORAGE_KEY, JSON.stringify(state)]] : []);
  const localStorage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  const location = {
    _hash: hash,
    get hash() {
      return this._hash;
    },
    set hash(value) {
      const next = value.startsWith('#') ? value : '#' + value;
      if (next === this._hash) return;
      this._hash = next;
      window.dispatchEvent(new window.Event('hashchange'));
    },
  };
  Object.assign(globalThis, { document, window, location, localStorage, CustomEvent: window.CustomEvent });
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  window.localStorage = localStorage;
  window.scrollTo = () => {};
  window.matchMedia = globalThis.matchMedia = () => ({ matches: reducedMotion });
  const sheet = document.getElementById('sheet');
  sheet.showModal = () => (sheet.open = true);
  sheet.close = () => (sheet.open = false);
  globalThis.URL.createObjectURL ??= () => 'blob:test';
  globalThis.URL.revokeObjectURL ??= () => {};
  const downloads = [];
  const realCreate = document.createElement.bind(document);
  document.createElement = (tag) => {
    const el = realCreate(tag);
    if (tag === 'a') el.click = () => downloads.push(el.download);
    return el;
  };
  globalThis.FormData = class {
    constructor(form) {
      this.pairs = [...form.querySelectorAll('input[name],select[name],textarea[name]')]
        // linkedom leaves .checked undefined for markup like <input checked>: fall back to the attribute.
        .filter((e) => !['checkbox', 'radio'].includes(e.type) || (e.checked ?? e.hasAttribute('checked')))
        .map((e) => [
          e.name,
          e.tagName === 'SELECT'
            ? (e.querySelector('option[selected]') || e.querySelector('option'))?.getAttribute('value') ??
              (e.querySelector('option[selected]') || e.querySelector('option')).textContent
            : e.value,
        ]);
    }
    get(name) {
      return this.pairs.find(([k]) => k === name)?.[1] ?? null;
    }
    getAll(name) {
      return this.pairs.filter(([k]) => k === name).map(([, v]) => v);
    }
    [Symbol.iterator]() {
      return this.pairs[Symbol.iterator]();
    }
  };
  await import('../../docs/src/app.js');
  const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
  const app = document.getElementById('app');
  async function click(selectorOrAction, extra = null) {
    let el;
    if (extra || !/[[.#\s]/.test(selectorOrAction)) {
      el = document.createElement('button');
      el.dataset.action = selectorOrAction;
      Object.assign(el.dataset, extra || {});
      document.body.append(el);
    } else el = document.querySelector(selectorOrAction);
    if (!el) throw Error('Nothing to click: ' + selectorOrAction);
    el.dispatchEvent(new window.Event('click', { bubbles: true }));
    await tick();
    if (extra || !/[[.#\s]/.test(selectorOrAction)) el.remove();
  }
  async function submit(selector) {
    const form = document.querySelector(selector);
    if (!form) throw Error('No form: ' + selector);
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await tick();
  }
  async function change(el, checked) {
    if (checked !== undefined) el.checked = checked;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
    await tick();
  }
  const saved = () => JSON.parse(data.get(STORAGE_KEY) || 'null');
  return { document, window, app, sheet, location, click, submit, change, tick, saved, data, downloads };
}
