# На маса — финален технически handoff

Цел: Claude да получи същественото за стартиране без излишен контекст. Кодът в main е източникът на истина, не стари чатове.

## Архитектура
- Public vanilla-JS PWA: docs/index.html, docs/src/app.js, docs/src/views.js, docs/assets/*.css, docs/src/domain.js и docs/src/catalog.js.
- Onboarding с 9 стъпки и пет реални preview рецепти: docs/src/onboarding.js. Векторен маскот: docs/src/mascot.js.
- PWA offline: docs/sw.js се генерира от scripts/build-sw.mjs; при промяна на docs/ задължително нов sw.
- Food diary: docs/src/fitness.js, docs/src/servings.js, docs/src/diary-sync.js. Offline first, per-user sync queue, 200 сървърни записа на страница.
- Provider integrations: docs/src/auth.js (email OTP + Apple web PKCE), docs/src/api.js. Server Cloudflare Worker + D1: server/worker.js, server/cloud.js, server/diary.js, server/products.js и server/migration.sql.
- Billing: server/billing.js и Worker Stripe webhook. Няма live trial/paywall докато не бъде активиран и изпитан.

## Направени последни промени
1. Browser title е точно **На маса**. Фавиконът docs/assets/icon.svg е изцяло #013c26 по краищата (без бяло триъгълниче), а PWA startup background е #013c26.
2. docs/assets/mobile-polish.css дава таб навигация с нормални touch targets, fixed safe areas, 16px полета за iOS zoom, mobile bottom-sheet, четими макроси/дневник.
3. docs/src/diary-sync.js никога не качва първоначални гост/друг-акаунт записи без изрично одобрение; UI в account-view.js и action в app.js. Не премахвай consent gate.
4. server/diary.js връща страници по 200 реда с nextCursor; client ги сглобява преди sync. PUT/DELETE на конкретен запис са per-user и idempotent.
5. server/worker.js: DELETE /account/data изтрива app дневник и backup **след потвърждение** и отказва ако има активен абонамент. Това НЕ изтрива Supabase акаунта и платежната история; трябва бъдеща отделна реализация.
6. OFF баркод lookup предпочита кеш преди global quota, за да не харчи лимита за вече известни продукти.

## Подготовка на услугите — в този ред
1. Създай Cloudflare D1 и приложи server/migration.sql. Попълни server/wrangler.example.jsonc с реални nonsecret IDs. Сложи DB binding и secret vars през Cloudflare UI.
2. Supabase: настрой email OTP, site URL/allowed redirects, Apple Services ID, Team ID, Key ID/private key и callbacks. Пускай Apple OAuth само след реални iOS/Android тестове.
3. Worker: APP_ORIGIN=https://hristiyantsb.github.io и APP_URL=https://hristiyantsb.github.io/na-masata/ засега; SUPABASE_URL, SUPABASE_ANON_KEY, OFF_USER_AGENT (реален контакт), Stripe prices и secrets в environment.
4. Docs frontend config.js: apiBase, supabaseUrl, supabasePublicKey са само public стойности. Никога service-role keys/Stripe secrets в docs/.
5. Stripe **test mode**: валидирай prices 9/90 и 29/290 EUR, 7-day trial terms, webhook signature, duplication, renewal, cancellation, portal, refunds and recovery. Когато всичко работи, включи UI paywall. В демото не обещавай активен 7-дневен trial.
6. Open Food Facts: провери ODbL attribution, grams/ml и пропуснати макроси (null ≠ 0), лимити и легитимен User-Agent. OFF търсенето изисква Plus entitlement.

## Името в URL — важен блокер, не поправяй със слепи replace
GitHub Pages project URL е /na-masata/, защото *името на репото* е na-masata. За /na-masa/ трябва собственикът да смени Repository name на na-masa в GitHub Settings или да настрои custom domain. След това:
- Провери Pages deployment, APP_URL, Supabase OAuth allowlist, Stripe return URLs, share/QR links, PWA start_url/scope.
- Не предполагай, че старият Pages URL автоматично redirect-ва.
- Запази legacy localStorage na-masata-v3 и архив/backup миграция; инсталираният service-worker scope остава по стария path и изисква upgrade plan.
- Публичният browser tab/title и бранд могат да бъдат „На маса“ без URL rename.

## Задължителен мобилен QA
- 320×568, 360×740, 390×844, 430×932; Chrome Android, Safari iOS, installed PWA и landscape.
- All onboarding, keyboard input, allergies, recipe preview; scroll and CTA.
- Plan->recipe->swap->grocery list; store change, edit price, pantry and reset; food diary add/edit/copy/CSV.
- Offline launch, reconnect + queue replay; guest diary login => explicit import; два акаунта на един телефон; два tabs race.
- Test actual Apple OTP and Stripe test-mode, D1 migrations, 201+ diary entries, ORIGIN/CORS/authz/rate limit, offline PWA cache.
- OS installed PNG icon може да остане стар кеш: необходимо е pixel-level проверяване/regen на PNG (особено iOS).

## Известни останали ограничения
- Provider credentials/deploy, реален Stripe trial и production E2E, monitoring and logging.
- Full Supabase account deletion/Stripe legal retention; DELETE /account/data умишлено изтрива само app data.
- Same-entry multi-device conflict protocol е последна промяна печели, не versioned CAS; ще изисква versioning и UX.
- Старите installation PNG assets може да имат corner артефакт; SVG browser favicon е поправен.
- Не са изпълнени автоматични visual screenshot regressions или тестове на реален телефон.

## Commands
npm ci
npm run build:offline
npm test
npm run check

Commit-вай генерирания docs/sw.js. Secrets никога в repo.
