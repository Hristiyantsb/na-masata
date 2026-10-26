# Проверки преди пускане

## Автоматизирани

32 автоматизирани теста минават с `npm test`; `npm run check` проверява 13 модула, imports и assets. Пакетите са фиксирани в lockfile. Тестовете не извършват плащания, не използват истински токени и не стартират камера.

Покрити сценарии: строг режим/алергени/уреди/калории/време, липса на съвпадения, 14 хранения, разнообразие, обединяване на количества и опаковки, наличности, редактируеми цени, бюджетно превишение, backup validation, legacy migration, storage failure, diary units/dates/null nutrition, barcode checksum, HTML escaping, pricing allowlist, entitlement expiry, webhook signature/tampering/replay window, CORS/auth boundary и missing-product data. Допълнително: HTML структура/етикети, точни цени в екрана и mock тестове за освобождаване на камерата при затваряне/грешка. Това не заменя проверка с истинска камера.

## Ръчна матрица — остава за изпълнение

| Сценарий                                               | iPhone Safari | Android Chrome | Desktop Chrome/Firefox |
| ------------------------------------------------------ | ------------- | -------------- | ---------------------- |
| Всички onboarding стъпки, назад, преглед, генериране   | Неизпитан     | Неизпитан      | Неизпитан              |
| Смяна, undo, lock, любими, бележки                     | Неизпитан     | Неизпитан      | Неизпитан              |
| Покупки, цена/опаковка, наличности                     | Неизпитан     | Неизпитан      | Неизпитан              |
| Дневник, edit/delete/undo, дати, цел                   | Неизпитан     | Неизпитан      | Неизпитан              |
| Export/import, quota, private browsing                 | Неизпитан     | Неизпитан      | Неизпитан              |
| Камера allow/deny, close during prompt, photo decoding | Неизпитан     | Неизпитан      | Неизпитан              |
| Keyboard, Escape, focus return, screen reader, zoom    | Неизпитан     | Неизпитан      | Неизпитан              |
| Размери 320–1440px, safe area, keyboard viewport       | Неизпитан     | Неизпитан      | Неизпитан              |

Браузърната проверка не е извършена в тази среда: предишният опит за отваряне на Pages беше отказан от автоматичния преглед поради изчерпан лимит. Не е заобикалян този отказ. Статусът на GitHub deployment не доказва визуален или камера QA.

## Backend / billing integration — непроверено с реални услуги

- Test-mode покупка за четирите цени; картов отказ; SCA/3DS; отменен checkout.
- Webhook duplicate, delayed, out-of-order, invalid signature, timeout/retry и concurrent delivery.
- Cancel at period end, expired subscription, invoice failure, recovery, portal return.
- Не може да се зададе чужд user/customer/price от клиента.
- Auth expiry/refresh/logout и account deletion.
- OFF 404/429/503, incomplete nutrition, bad checksum, grams vs ml.
- Никога не активирай достъп само по redirect или localStorage флаг.
