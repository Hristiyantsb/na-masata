# На маса · Release readiness & Claude handoff (2026-10-26)

## Product and deployment facts
- Production source: `Hristiyantsb/na-masata`, GitHub Pages `main:/docs`.
- Public Pages URL: `https://hristiyantsb.github.io/na-masata/`.
- **Brand name is „На маса“.** Browser tab title, manifest `name` and iOS home-screen label are `На маса`.
- URL `/na-masata/` derives from the **repository name**, not the app title. To obtain `/na-masa/`, rename GitHub repository in Settings → General → Repository name and update the Pages deployment URL and links. Do **not** rename localStorage keys or service-worker scope until a migration is planned. GitHub may redirect previous repository URLs; validate Pages, installation and deep links separately after the rename.
- This is a PWA, not a native App Store binary. A white shortcut corner/badge added by a browser/OS cannot be removed with CSS; install as a PWA (Add to Home Screen / Install App) instead of pinning a plain browser shortcut. Branded favicon now has a solid `#013c26` background and manifest launch background matches.
- User video `Screen Recording 2026-10-25 120143(1).mp4` shows the *mise* reference flow: brief onboarding questions, time saving promise, serving counter, meal preference chips, appliance selection, plan, recipe details, daily menu and settings. Do not copy its proprietary artwork/assets; use it only as UX reference.

## What is implemented
- Existing personalized onboarding with scalable vector mascot, visual choice cards, range slider, equipment, allergy exclusions and five real-recipe preview. Offline-compatible and reduced-motion friendly.
- Plan/recipes/shopping/diary UI, local backups, strict allergy/diet/equipment rules, store-organized list, estimated nutrition and sample prices.
- Supabase OTP + web Apple OAuth/PKCE client adapters and refresh-token restoration.
- Cloudflare Worker/D1 scaffolding for Stripe billing, product search, cloud backup and authenticated per-entry diary sync.
- Per-user `/diary` queue with retry and explicit recovery snapshot of a local diary before existing cloud entries replace it. Recovery snapshots use `na-masa-presync-backup:<userId>` in localStorage and are **not** yet surfaced in the app settings. Do not delete this data.
- `GET /health` exposes service readiness as booleans, never credentials.
- Solid forest-green favicon, PWA startup background, Apple web-app label, mobile safe area and focus improvements.

## Backend wiring checklist — Claude should work in this order
1. Provision **owner-controlled** Supabase and Cloudflare accounts and D1 DB. Never commit API secrets. Review `docs/src/config.js` and `server/`.
2. Deploy the Worker with bindings and run `server/migration.sql` on D1. Set `APP_ORIGIN=https://hristiyantsb.github.io`, `APP_URL=https://hristiyantsb.github.io/na-masata/`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `OFF_USER_AGENT`; use environment secrets for Stripe keys. Domain must be changed only after Pages URL migration.
3. Verify `GET /health` shows `databaseConfigured/authConfigured/productLookupConfigured` as true. This endpoint does **not** prove connectivity or entitlement and must be followed by integration tests.
4. Configure Supabase email OTP and Apple Services ID / Apple web provider + exact redirect allowlist. Test sign-in and restart on iPhone Safari.
5. Exercise authenticated `GET /diary`, `PUT /diary/:uuid`, `DELETE /diary/:uuid` against actual D1, including second user isolation, offline replay, sign out and account switching. Verify old local-only records are not silently lost and expose explicit import/recovery UI before general release.
6. Activate Open Food Facts API only with correctly identified origin, provider license/attribution, rate limits and Plus entitlement.
7. Configure Stripe **test mode** prices and webhook; ensure replay protection and access changes are server verified. No client-only paywall. Do not advertise a working 7-day trial until it is configured in Stripe and validated end to end.
8. Deploy the public front-end config only after preceding services function. Keep preview mode visible until then.
9. Audit privacy/data retention, support, accessibility, PWA install/uninstall behavior, localization and billing disclosures before charging customers.

## Priority QA
- iPhone Safari small/large: 320×568, 375×667, 390×844, 430×932; Android Chrome 360×800; desktop 1440×900.
- No horizontal overflow; safe-area header/footer never overlap touch targets, especially with keyboard and open dialog.
- Onboarding: each step's CTA visible; allergen selection never silently relaxed; 0 candidates explicitly explained.
- Daily menu: reroll, undo, serving counts, store switching, shopping prices, offline persistence, backups.
- Diary: per 100g/100ml macro bases, explicit named-serving quantity, retry, refresh and multiple-device conflicts.
- PWA: icon is uniform green in icon *source*, correct manifest and title, install prompt status, stale offline-cache activation on update.
- Important: currently no automated real-phone screenshot QA or production service credentials. Keep that limitation visible.

## Verification commands
```sh
npm ci
npm test
npm run check
npm run build:offline
npm run check
npm run dev
```
`scripts/build-sw.mjs` regenerates the offline version hash; commit `docs/sw.js` every time `docs/` assets change. GitHub Actions must be green before merging to `main`.

## Repository migration note
Do not directly edit the GitHub Pages URL in `manifest.start_url` or `serviceWorker.scope` to `/na-masa/` while the repository is still `na-masata`: that breaks installations. Rename the actual repository through GitHub Settings when the owner is ready; coordinate URLs and caches as a separate controlled release.
