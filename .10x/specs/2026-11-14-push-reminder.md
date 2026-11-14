# Daily Quiz — Nachtrag: Erinnerung per Push um 22 Uhr

**Datum:** 2026-11-14
**Feature-Slug:** `push-reminder`
**Status:** Freigegeben (Entwurf präsentiert, Nutzer hat das dafür nötige Cloudflare-Login ausgeführt)

## 1. Verhalten

- Auf der Startseite gibt es einen Schalter „Erinnerung um 22 Uhr“. Einschalten fragt die Benachrichtigungs-Erlaubnis ab und meldet das Gerät beim Push-Dienst an.
- Um 22:00 Uhr deutscher Zeit (Europe/Berlin, Sommer- und Winterzeit) erhält jedes angemeldete Gerät eine Benachrichtigung, sofern für diesen Tag noch keine beendete Runde gemeldet wurde.
- Antippen der Benachrichtigung öffnet die App bzw. holt sie in den Vordergrund.
- „Test senden“ schickt sofort eine Test-Benachrichtigung an das eigene Gerät (höchstens alle 10 Sekunden).
- Ausschalten meldet das Gerät ab und löscht seine Daten beim Worker.
- Wo Push nicht verfügbar ist (z. B. iPhone im Safari-Tab statt als installierte App, Dev-Server ohne Service Worker), zeigt die App statt des Schalters einen Hinweis. Wurde die Erlaubnis verweigert, erklärt ein Hinweis, dass sie in den Systemeinstellungen freigegeben werden muss.
- Die Uhrzeit ist fest; nicht einstellbar.

## 2. Komponenten

### Worker `daily-quiz-push` (Ordner `worker/`)

| Endpunkt | Body | Wirkung |
|---|---|---|
| `POST /subscribe` | `{ id, subscription, lastDone }` | legt den Geräteeintrag an oder ersetzt ihn |
| `POST /done` | `{ id, date }` | merkt sich den Tag der letzten beendeten Runde |
| `POST /test` | `{ id }` | sendet sofort eine Test-Benachrichtigung |
| `POST /unsubscribe` | `{ id }` | löscht den Geräteeintrag |

- Cron: `0 20 * * *` und `0 21 * * *` (UTC). Der Worker sendet nur, wenn es in Berlin gerade 22 Uhr ist.
- Speicher: Workers KV, Schlüssel `dev:<id>`, Wert `{ subscription, lastDone, lastTest }`.
- Versand: Web Push nach RFC 8291 (aes128gcm) und VAPID nach RFC 8292, mit WebCrypto im Worker implementiert, ohne Laufzeit-Abhängigkeit.
- Antwortet der Push-Dienst mit 404 oder 410, wird der Geräteeintrag gelöscht.

### App

- `src/push.ts`: Zustand (`unsupported`, `off`, `on`, `denied`), Ein-/Ausschalten, Test, Meldung „Runde erledigt“. Lokaler Zustand unter `daily-quiz:push` (`{ id, endpoint, reported }`).
- Die Meldung „erledigt“ geht beim Beenden der Runde raus und wird beim nächsten App-Start nachgeholt, falls sie offline nicht ankam.
- `public/push-sw.js`: Push- und Klick-Handler, vom generierten Service Worker per `importScripts` geladen.
- CSP: `connect-src 'self' <Worker-Adresse>`.

## 3. Daten und Datenschutz

Den Rechner des Nutzers verlassen ausschließlich: die Push-Anmeldung des Geräts (Adresse beim Push-Dienst plus zwei öffentliche Schlüssel), eine zufällige Geräte-ID und das Datum der letzten beendeten Runde. Keine Antworten, keine Statistik. Der private VAPID-Schlüssel liegt als Secret bei Cloudflare.

## 4. Schutz gegen Missbrauch

- Push-Adressen nur bei bekannten Diensten: `fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`; nur HTTPS.
- Höchstens 20 Geräteeinträge.
- Die Geräte-ID (128 Bit Zufall) ist zugleich das Geheimnis; ohne sie lässt sich kein Eintrag ändern, löschen oder testen.
- Anfragen mit `Origin`-Header werden nur von der Quiz-Adresse und den lokalen Entwicklungsadressen angenommen; Body höchstens 4 KB.
- Der Benachrichtigungstext kommt vom Worker; die beim Klick geöffnete Adresse ist immer der eigene Geltungsbereich des Service Workers, nie ein Wert aus der Nachricht.

## 5. Fehlerfälle

- Worker nicht erreichbar beim Einschalten: Schalter bleibt aus, Hinweis „Einschalten fehlgeschlagen“.
- Meldung „erledigt“ schlägt fehl: wird beim nächsten Start nachgeholt; schlimmstenfalls kommt eine überflüssige Erinnerung.
- Anmeldung beim Push-Dienst abgelaufen oder geändert: beim App-Start erkannt; die App meldet die neue Anmeldung oder zeigt den Schalter wieder als aus.

## 6. Tests

- Worker: Verschlüsselung per Roundtrip (Entschlüsseln mit dem Empfängerschlüssel), VAPID-Signatur verifiziert, Validierung der Endpunkte, Cron-Logik (nur 22 Uhr Berlin, nur wenn nicht erledigt, Löschen bei 410), Gerätelimit.
- App: Zustandslogik von `push.ts` soweit ohne Browser prüfbar; manuell im Browser: Schalter, Hinweistexte, CSP ohne Verstöße.
- Nicht automatisiert prüfbar: tatsächliche Zustellung auf einem Handy.
