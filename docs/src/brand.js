// На маса identity: the approved wordmark and the wooden-table mascot.
// The mascot is drawn in SVG (table.js) so it can move; here it is placed as a still picture
// for empty states and headers. Decorative, so hidden from screen readers.
import { tableSVG } from './table.js';

let count = 0;
export const MASCOT_SCENES = Object.freeze({
  hello: { mood: 'wink', hat: true },
  happy: { mood: 'happy' },
  curious: { mood: 'curious' },
  sleepy: { mood: 'sleepy', fx: 'zzz' },
  serve: { mood: 'happy', cloche: 'open', revealed: { diet: 'all' } },
  list: { mood: 'open', notepad: true },
  done: { mood: 'happy', cloth: true },
});

/** A still table with one of the named scenes (unknown names fall back to "hello"). */
export function mascot(name = 'hello', className = '') {
  const scene = MASCOT_SCENES[name] || MASCOT_SCENES.hello;
  return tableSVG({ uid: `m${++count}`, scene, className: `mascot ${className}` });
}

// Text logo exactly as supplied: green "На", wooden "маса".
export function wordmark(className = '') {
  return `<img class="wordmark-img ${className}" src="assets/wordmark.webp" width="760" height="160" alt="На маса" decoding="async" draggable="false">`;
}
