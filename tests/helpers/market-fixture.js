// Price files as the site serves them, small enough to read: two towns and their list.

/** Варна: Lidl in 4 stores, BILLA in 10, T MARKET in 6. Some rows are deliberately wrong. */
export const TOWN = {
  v: 1,
  date: '2026-11-12',
  city: 10135,
  place: 'Варна',
  stores: { Lidl: 4, BILLA: 10, 'T MARKET': 6, Непозната: 3 },
  products: {
    tomato: {
      Lidl: [2.69, 4, 'Домати на кг'],
      BILLA: [2.99, 9, 'Домати червени'],
      'T MARKET': [1.99, 2, 'Домати кг', 2.49],
    },
    chicken: { Lidl: [3.32, 4, 'Прясно пилешко филе XXL'], BILLA: [2.85, 10, 'Пилешко филе', 4.09] },
    rice: { BILLA: [2.38, 10, '1кг ориз бисерен'] },
    unicorn: { Lidl: [1, 1, 'няма такъв продукт'] },
    onion: { Lidl: [-1, 4, 'x'], BILLA: ['0.5', 4, 'x'], METRO: [0.4, 2, 'няма такава верига в града'] },
    milk: { Lidl: [1.22, 99, 'Мляко'.repeat(40)] },
    egg: { Lidl: [2.95, 4, 'Яйца 10 бр.'] },
    bread: { Lidl: [0.76, 4, 'Бял хляб'] },
    yogurt: { Lidl: [0.46, 4, 'Кисело мляко'] },
    cheese: { Lidl: [3.08, 4, 'Сирене'] },
    potato: { Lidl: [1.58, 4, 'Картофи'] },
    apple: { Lidl: [1.29, 4, 'Ябълки'] },
  },
};

/** Айтос: one Lidl. */
export const SMALL_TOWN = {
  v: 1,
  date: '2026-11-12',
  city: 151,
  place: 'Айтос',
  stores: { Lidl: 1 },
  products: Object.fromEntries(
    ['tomato', 'chicken', 'rice', 'milk', 'egg', 'bread', 'yogurt', 'cheese', 'potato', 'apple', 'onion'].map(
      (k, i) => [k, { Lidl: [1 + i / 10, 1, `Продукт ${i}`] }],
    ),
  ),
};

export const TOWNS = {
  v: 1,
  date: '2026-11-12',
  source: 'https://kolkostruva.bg',
  places: [
    [151, 'Айтос', 'Айтос', 'Бургас', { Lidl: 1 }],
    [10135, 'Варна', 'Варна', 'Варна', { Lidl: 4, BILLA: 10, 'T MARKET': 6 }],
    [21539, 'Добрич', 'Димитровград', 'Хасково', { 'T MARKET': 1 }],
    [72624, 'Добрич', 'Добрич', 'Добрич', { Lidl: 2, Kaufland: 1 }],
    [68134, 'София', 'Столична', 'София (столица)', { Lidl: 43, Kaufland: 21, BILLA: 56 }],
  ],
};
