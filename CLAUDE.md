# На маса — контекст за Claude

Прочети HANDOFF.md преди работа и отваряй само файловете за конкретната задача. Използвай скриптовете за QA, не предполагай production готовност.

Текуща версия 0.11.0: локален режим. Не активирай Cloudflare; следвай HANDOFF.md.

## Репозиторий и продукт
- Hristiyantsb/na-masata, GitHub Pages main:/docs, frontend native JS/CSS, Worker+D1 в server/.
- Видимо име: **На маса**. Името на репото и Pages path /na-masata/ са различно нещо; не замествай технически ключове за localStorage и PWA без migration.
- Бранд: wordmark assets/wordmark.webp и иконка brand-icon-*.png от потребителя; маскотът (дървена маса с очи) е в 10 пози в assets/mascot/*.webp, ползвай brand.js mascot(pose). Чисто бял фон, системен шрифт (SF на Apple), акцент #013c26. Токените са в docs/assets/brand.css. Магазините са 6 (Lidl, Kaufland, BILLA, METRO, Фантастико, T MARKET) с официални логота в docs/assets/stores, вързани в docs/src/stores.js. Без eDish имена.
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
- Каталог: 118 рецепти (docs/src/catalog.js + recipes-more.js), 94 продукта (products-more.js: хранителни стойности kcal/протеин/въглехидрати/мазнини/фибри, щанд AISLE, LARGE_ONLY = само в големите вериги). Всяка рецепта е за 2 порции и ползва само продукти от каталога. Не внасяй текст от пиратски PDF книги.
- Алгоритъм: docs/src/planner.js (твърди филтри в domain.matches; оценка = сметка, бюджет, цел, калории, разнообразие, отпадък; много стартове + локално подобрение; explainEntry дава причините). Режими: DIETS (вкл. keto) и NEEDS (kids, sensory, lowcarb) — твърди правила.
- Onboarding (7 екрана): docs/src/onboarding.js, docs/src/brand.js, docs/src/stores.js, docs/assets/onboarding.css. Изборите се обновяват на място чрез syncWizard (без повторен render), за да не се губят анимации и фокус.
- Mobile: docs/assets/mobile-polish.css, docs/assets/app.css, docs/src/views.js.
- Diary: docs/src/fitness.js, docs/src/servings.js, docs/src/diary-sync.js.
- Auth/API: docs/src/auth.js, docs/src/api.js, server/worker.js, server/diary.js, server/cloud.js.
- PWA: docs/manifest.webmanifest, docs/assets/icon.svg, docs/src/pwa.js, scripts/build-sw.mjs.
- Activation & manual QA: HANDOFF.md; detail project/API.md and project/FITNESS-INTEGRATION.md.
