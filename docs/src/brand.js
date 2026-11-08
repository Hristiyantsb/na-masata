// На маса identity: the approved wordmark and the wooden-table mascot in its poses.
// Every pose is a transparent WebP in assets/mascot. Decorative, so hidden from screen readers.
export const POSES = Object.freeze([
  'chef',
  'hero',
  'love',
  'curious',
  'calm',
  'juggle',
  'serve',
  'party',
  'sleepy',
  'toss',
]);

export function mascot(pose = 'calm', size = 96, className = '') {
  const name = POSES.includes(pose) ? pose : 'calm';
  return `<img class="mascot ${className}" src="assets/mascot/${name}.webp" width="${size}" height="${size}" alt="" aria-hidden="true" decoding="async" draggable="false" data-pose="${name}">`;
}

// Text logo exactly as supplied: green "На", wooden "маса".
export function wordmark(className = '') {
  return `<img class="wordmark-img ${className}" src="assets/wordmark.webp" width="760" height="160" alt="На маса" decoding="async" draggable="false">`;
}
