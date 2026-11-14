# SDE — push-reminder

## Gebaut
- Worker `daily-quiz-push` mit KV-Namespace `daily-quiz-push-subs`, zwei Cron-Auslösern, Secret `VAPID_PRIVATE_JWK`. Deploy: `npm run deploy:worker`.
- Web Push (RFC 8291/8292) mit WebCrypto, keine Laufzeit-Abhängigkeit.
- App: Karte „Erinnerung um 22 Uhr“ auf der Startseite, „Test senden“, Meldung „erledigt“ beim Rundenende und nachgeholt beim Start.
- Build: `importScripts: ['push-sw.js']` im generierten Service Worker, `connect-src` in der CSP, Typecheck für `worker/`.

## Abweichungen
- Keine Unit-Tests für `src/push.ts` (fast nur Browser-APIs); stattdessen Worker-Tests und manueller Check.

## Tech Debt
- Worker wird von Hand deployt, nicht über CI.
- CPU-Zeit des Workers nicht gemessen (siehe QA).
- Neuer privater Schlüssel = alle Geräte müssen die Erinnerung neu einschalten.
