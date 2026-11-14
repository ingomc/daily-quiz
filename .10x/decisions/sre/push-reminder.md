# SRE — push-reminder

- Logs: Cloudflare-Dashboard → Workers → daily-quiz-push → Logs (Observability ist aktiv) oder `npx wrangler tail --cwd worker`.
- **Keine Erinnerung angekommen:** in der App „Test senden“. Kommt der Test nicht: Schalter aus- und wieder einschalten; Benachrichtigungen in den Geräteeinstellungen prüfen; auf dem iPhone muss die App vom Home-Bildschirm gestartet sein.
- **Erinnerung trotz gespielter Runde:** die Meldung „erledigt“ kam nicht an (offline); App einmal öffnen holt sie nach.
- **„Das hat nicht geklappt“ beim Einschalten:** Worker nicht erreichbar oder 20 Geräte belegt; Einträge ansehen mit `npx wrangler kv key list --binding SUBS --cwd worker --remote`.
- **Limits:** 100.000 Anfragen/Tag, 10 ms CPU pro Aufruf; bei Fehler 1102 in den Logs reicht die CPU-Zeit nicht.
