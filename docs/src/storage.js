import { defaults, normalizeState } from './domain.js';
export const STORAGE_KEY = 'na-masata-v3';
export function loadState(storage) {
  try {
    const current = storage.getItem(STORAGE_KEY);
    if (current) return { state: normalizeState(JSON.parse(current)), warning: null };
    const old = storage.getItem('na-masata-v1');
    if (old)
      return {
        state: normalizeState(JSON.parse(old)),
        warning: 'Прехвърлихме настройките ти от предишната версия.',
      };
    return { state: defaults(), warning: null };
  } catch {
    return {
      state: defaults(),
      warning:
        'Запазените данни не могат да се прочетат. Не са изтрити. Можеш да възстановиш резервно копие.',
    };
  }
}
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function parseBackup(text) {
  if (text.length > 5_000_000) throw Error('Копието е твърде голямо.');
  const b = JSON.parse(text);
  if (b.app !== 'na-masata' || ![1, 3].includes(b.version))
    throw Error('Файлът не е резервно копие на „На масата“.');
  return normalizeState(b.state);
}
