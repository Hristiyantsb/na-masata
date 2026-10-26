# Backend starter — не е активен в публичното демо

Runtime: Cloudflare Worker + D1. Входът се проверява със Supabase access token. Няма service-role ключ в клиента.

| Метод | Път               | Достъп                         | Резултат                               |
| ----- | ----------------- | ------------------------------ | -------------------------------------- |
| GET   | /health           | публичен                       | статус и конфигурационни флагове       |
| GET   | /me               | verified user                  | server entitlement или null            |
| POST  | /billing/checkout | verified user, без active plan | Stripe hosted Checkout URL             |
| POST  | /billing/portal   | verified user с customer       | Stripe billing portal URL              |
| POST  | /webhooks/stripe  | валиден Stripe signature       | reconcile canonical subscription       |
| GET   | /products/:ean    | active Plus                    | нормализирани OFF данни или явна липса |
| POST  | /food/analyze     | verified user                  | 501, не е реализиран                   |

Checkout body: `{ "plan": "menu" | "plus", "interval": "monthly" | "yearly" }`. Клиентът не подава сума, price ID, user ID, redirect URL или customer ID.

## Secret bindings

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_ANON_KEY`. Публична конфигурация: APP_ORIGIN, APP_URL, SUPABASE_URL, OFF_USER_AGENT, четирите Stripe price IDs. OFF_USER_AGENT трябва да идентифицира реалното приложение и контакт. Example config не е deployable без замяна на placeholders.

## Поведение и граници

- CORS допуска конфигурирания origin. CORS не заменя auth.
- Продуктовите заявки изискват active/trialing Plus и непросрочен period_end.
- Webhook работи с raw body, HMAC-SHA256, timestamp tolerance и D1 event ledger.
- Услугите timeout-ват; не връщат provider secret/error body към клиента.
- Клиентското API очаква бъдещ auth adapter чрез `setTokenProvider`.
- Преди production са нужни integration tests срещу Stripe test mode/D1/Supabase, обработка на account deletion, retention, subscription recovery/reconciliation, мониторинг и надежден idempotent checkout lifecycle.
- Публичният recipe catalog в Pages не е защитено платено съдържание. Премести го зад authenticated API преди търговски старт, ако достъпът трябва да е ограничен.

## Open Food Facts

Външните данни се държат в отделен cache с source URL и license. Има лимит на заявките и 24-часов кеш. При активен API има debounce search-as-you-type, не се изпращат изображения, не се маскират липсващи хранителни стойности с нули. Текущият normalization приема basis 100 g; трябва да се доработи и изпита явното разграничаване на 100 ml преди общо търговско използване.

## v0.6 additions (implemented, not deployed)

- `GET /products/search?q=...`: authenticated active Plus; 2–100 characters, up to 20 products; `{products:[...]}`. Same nullable nutrient schema as barcode lookup, sodium mg, basis 100 and explicit unit confirmation.
- `GET /backup`: authenticated `{revision,updatedAt,state}`. Empty state is null.
- `POST /backup`: authenticated `{revision,state}`; initial revision null, subsequent exact revision required. Full state is normalized. 409 on conflict, 413 above 1.5 MB UTF-8, 400 invalid data. `state:null` removes payload with a new tombstone revision. No automatic sync.
- Backend identity comes only from verified Supabase bearer token; cloud copies do not trust a client userId. Cloud backup is account-level portability, not a paid-content entitlement boundary.

See [FITNESS-INTEGRATION.md](FITNESS-INTEGRATION.md) for OTP template and activation instructions.

## Backend hardening v0.7 (code ready, deployment not activated)

- GET /diary: authenticated cursor pagination, optional after=UUID. Response items array and nextCursor (string/null), up to 200 records. Client fetches every page before merging.
- PUT/DELETE /diary/:uuid: authenticated, one user's entries only, payload limit and validation, idempotent offline retries.
- DELETE /account/data: confirmed body {confirmation: DELETE_MY_APP_DATA}, rate limited, 409 while active subscription, removes only this user's diary and backup. Supabase identity and historic billing are NOT deleted.
- On first authenticated session, guest/other-account local diary requires explicit consent before automatic sync, via account import button.
- Barcode cache hit is checked before the global Open Food Facts request quota; user-scoped limit still applies.
- Multi-device changes to the exact same entry still use last-write-wins. Add version/CAS and reconciliation UX before production.

For secrets, hosting steps and manual QA use HANDOFF.md.