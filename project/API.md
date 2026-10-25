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

Външните данни се държат в отделен cache с source URL и license. Има лимит на заявките и 24-часов кеш. Не се прави search-as-you-type, не се изпращат изображения, не се маскират липсващи хранителни стойности с нули. Текущият normalization приема basis 100 g; трябва да се доработи и изпита явното разграничаване на 100 ml преди общо търговско използване.
