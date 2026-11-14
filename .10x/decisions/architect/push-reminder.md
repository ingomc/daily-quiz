# Architect — push-reminder

ADR: `.10x/adrs/003-push-reminder-via-cloudflare-worker.md` · Spec: `.10x/specs/2026-11-14-push-reminder.md`

- **Worker** (`worker/src/index.ts`): `handleRequest` (subscribe, done, test, unsubscribe) und `runReminder` (Cron) als Funktionen mit injizierbarem Speicher und Sender; `worker/src/webpush.ts` kapselt Verschlüsselung und VAPID.
- **App**: `src/push.ts` (Zustand, Netzwerk), `src/ui/reminder.ts` (Karte mit Schalter), `public/push-sw.js` (Push/Klick im Service Worker), `src/push-config.ts` (Worker-Adresse, öffentlicher Schlüssel; auch Quelle für `connect-src` in der CSP).
- **Datenfluss**: Schalter → Push-Anmeldung im Browser → `POST /subscribe`. Runde beendet → `POST /done`. Cron 20/21 Uhr UTC → nur bei 22 Uhr Berlin → Push an alle Geräte ohne heutiges `lastDone`.
- **Grenze**: Die App funktioniert ohne Worker unverändert; Fehler des Workers betreffen nur die Erinnerung.
