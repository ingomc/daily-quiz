# QA — push-reminder

- `npm test`: 52/52 grün, davon 16 für den Worker (Verschlüsselungs-Roundtrip, VAPID-Signatur, Berliner Zeit inkl. Sommer/Winter, Validierung, CORS, Gerätelimit, Test-Ratelimit, Cron-Logik, Aufräumen bei 410).
- Live-Worker per curl: Preflight 204, fremder Origin 403, fremder Push-Host 400, subscribe/done/unsubscribe 200, Test mit erfundenem FCM-Token → FCM antwortet, Worker meldet 410 und löscht den Eintrag (Verschlüsselung und Signatur liefen also im Worker durch, ohne CPU-Abbruch).
- Browser (Produktions-Build): Karte wird angezeigt, Zustand „blockiert“ korrekt (der eingebaute Browser verweigert Benachrichtigungen), CSP enthält die Worker-Adresse, Service Worker lädt `push-sw.js`.
- **Nicht geprüft:** echte Zustellung auf einem Gerät, Zustände „an/aus“ mit Schalter, Klick auf die Benachrichtigung, der Cron-Lauf um 22 Uhr, gemessene CPU-Zeit.
