# Security — push-reminder

- **Neue Angriffsfläche:** öffentlicher Worker-Endpunkt; die App sendet erstmals Daten nach außen (Geräte-ID, Push-Anmeldung, Datum).
- **Maßnahmen:** Allowlist der Push-Hosts (verhindert, dass der Worker als Proxy für beliebige POSTs dient), nur HTTPS ohne Port/Userinfo, Schlüssel-Längenprüfung, Limit 20 Geräte, Body ≤ 4 KB, ID als 128-Bit-Geheimnis, Test höchstens alle 10 s, Origin-Prüfung, privater VAPID-Schlüssel nur als Cloudflare-Secret.
- **Service Worker:** Klick öffnet ausschließlich den eigenen Scope; Text aus der Nachricht wird nur als Notification-Text verwendet.
- **CSP:** `connect-src 'self' <Worker>`; sonst unverändert.
- **Restrisiken:** Wer eine Geräte-ID kennt, kann Tests auslösen oder abmelden (ID liegt nur im localStorage des Geräts). Die 20 Plätze lassen sich von außen mit gültig geformten Anmeldungen füllen (dann schlägt Einschalten mit „fehlgeschlagen“ fehl; ungültige Einträge verschwinden beim nächsten 22-Uhr-Lauf). Kein Rate-Limit pro IP.
- **Datenschutz:** Die Worker-Adresse enthält den Namen der workers.dev-Subdomain des Kontos und steht in Repository und Seite.
