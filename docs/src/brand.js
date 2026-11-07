// На маса identity: the wooden table with eyes, drawn as vector so it stays sharp at every size.
// `look` moves the pupils: 0 = straight, -1 = left, 1 = right. Pure decoration, hidden from screen readers.
export function mascot(size = 64, look = 0, className = '') {
  const dx = Math.max(-1, Math.min(1, Number(look) || 0)) * 3;
  return `<svg class="mascot ${className}" width="${size}" height="${size}" viewBox="8 36 112 86" aria-hidden="true" focusable="false"><ellipse cx="64" cy="114" rx="40" ry="4" fill="#1f2420" opacity=".08"/><path d="m35 74-7 34q-2 8 5 9t9-8l9-35M89 74l7 34q2 8-5 9t-9-8l-9-35" fill="#f0b373"/><path d="M39 71q1 30 25 30 25 0 26-30" fill="#cf8645"/><ellipse cx="64" cy="71" rx="52" ry="20" fill="#d99452"/><ellipse cx="64" cy="64" rx="52" ry="20" fill="#f3b877"/><path d="M15 58q46-10 99-1M15 70q50-10 98-2" fill="none" stroke="#d58f50" stroke-width="2.5" opacity=".45"/><ellipse cx="92" cy="55" rx="13" ry="5" fill="#fff"/><ellipse cx="92" cy="55" rx="8" ry="2.5" fill="#ede5dd"/><path d="m31 63 19-5m-12-4 3 12m-8-13 3 13" stroke="#fff" stroke-width="4" stroke-linecap="round"/><ellipse cx="52" cy="89" rx="10" ry="12" fill="#fff"/><ellipse cx="78" cy="89" rx="10" ry="12" fill="#fff"/><g class="mascot-eyes" fill="#231b17"><ellipse cx="${55 + dx}" cy="91" rx="6" ry="9"/><ellipse cx="${81 + dx}" cy="91" rx="6" ry="9"/></g></svg>`;
}

// Text logo: the name in the display serif with the table as its mark.
export function wordmark(className = '') {
  return `<span class="wordmark-lockup ${className}">${mascot(34)}<span class="wordmark-text">на маса</span></span>`;
}
