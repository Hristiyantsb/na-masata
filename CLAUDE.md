# На маса — контекст за Claude

Прочети HANDOFF.md преди работа и отваряй само файловете за конкретната задача. Използвай скриптовете за QA, не предполагай production готовност.

## Репозиторий и продукт
- Hristiyantsb/na-masata, GitHub Pages main:/docs, frontend native JS/CSS, Worker+D1 в server/.
- Видимо име: **На маса**. Името на репото и Pages path /na-masata/ са различно нещо; не замествай технически ключове за localStorage и PWA без migration.
- Одобрен wordmark docs/assets/brand-wordmark.webp, #013c26. Новият browser favicon docs/assets/icon.svg е с плътен зелен фон.
- Без преход към React/Expo без реална нужда. Реалните Stripe/Supabase/Apple/OFF и Worker не са активирани в статичното демо.

## Твърди правила
- Диета, алергени, уреди, време, калории са твърди филтри. Не ги премахвай при нула резултати.
- Без измислени цени, live availability, снимков анализ и работещи trial/subscription.
- Никога не прехвърляй локален дневник към друг акаунт без consent. docs/src/diary-sync.js осигурява защитена опашка и изричен import.
- Без тайни в docs/; Supabase bearer се проверява на всяка приватна заявка; Stripe entitlement се решава на сървъра.
- Запази legacy ключа na-masata-v3 и обратната съвместимост на backup файловете.
- Mobile: минимум 44px touch controls, 16px input, safe areas, bottom-sheet dialogs, без хоризонтален overflow.
- Успешните tests не доказват iPhone visual QA или реален provider E2E.

## Скриптове (изпълнявай при всеки PR)
npm ci
npm run build:offline
npm test
npm run check

Commit-ни docs/sw.js след промяна. Ако CI дава Offline bundle is stale, изпълни build:offline и commit-ни новия bundle.

## Бърз маршрут по файлове
- Onboarding: docs/src/onboarding.js, docs/src/mascot.js, docs/assets/onboarding.css.
- Mobile: docs/assets/mobile-polish.css, docs/assets/app.css, docs/src/views.js.
- Diary: docs/src/fitness.js, docs/src/servings.js, docs/src/diary-sync.js.
- Auth/API: docs/src/auth.js, docs/src/api.js, server/worker.js, server/diary.js, server/cloud.js.
- PWA: docs/manifest.webmanifest, docs/assets/icon.svg, docs/src/pwa.js, scripts/build-sw.mjs.
- Activation & manual QA: HANDOFF.md; detail project/API.md and project/FITNESS-INTEGRATION.md.
