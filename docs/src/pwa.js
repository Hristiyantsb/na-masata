/** Optional browser capabilities: never required for the core app to run. */
let registration = null;
let installPrompt = null;
const state = { ready: false, update: false, installable: false, error: false };
const notify = () => document.dispatchEvent(new CustomEvent('pwa-state'));
export const pwaState = () => ({ ...state, offline: navigator.onLine === false });
export async function initPwa() {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    state.installable = true;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    state.installable = false;
    notify();
  });
  if (!('serviceWorker' in navigator)) return;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // First install need not reload; only an explicitly requested update does.
    if (refreshing) location.reload();
  });
  try {
    registration = await navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), {
      updateViaCache: 'none',
    });
    const check = () => {
      state.update = !!registration.waiting;
      notify();
    };
    check();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed') check();
      });
    });
    navigator.serviceWorker.ready.then(() => {
      state.ready = true;
      notify();
    });
    document.addEventListener('apply-app-update', () => {
      if (registration?.waiting) {
        refreshing = true;
        registration.waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
      }
    });
    window.addEventListener('online', () => registration.update().catch(() => {}));
  } catch {
    state.error = true;
    notify();
  }
}
export async function installApp() {
  if (!installPrompt) return false;
  const prompt = installPrompt;
  installPrompt = null;
  state.installable = false;
  await prompt.prompt();
  await prompt.userChoice;
  notify();
  return true;
}
export async function checkAppUpdate() {
  if (!registration)
    throw Error('Офлайн режимът още не е подготвен. Опитай след първото онлайн зареждане.');
  await registration.update();
}
