# ADR-003: Erinnerung per Web Push über einen Cloudflare Worker

**Status:** Accepted
**Date:** 2026-11-14
**Feature:** push-reminder
**Author:** 10x-Team (Architect + Staff Engineer + Security)
**Ändert:** den Grundsatz „kein Server, keine Requests zur Laufzeit“ aus ADR-001 für genau diesen Zweck

## Context
Der Nutzer will täglich um 22 Uhr erinnert werden, wenn das Quiz noch offen ist. Eine PWA kann sich nicht selbst zu einer Uhrzeit wecken; zuverlässige Benachrichtigungen bei geschlossener App gibt es nur über die Push API, und die braucht einen Absender außerhalb des Geräts. Der Nutzer hat ein Cloudflare-Konto.

## Decision
Ein Cloudflare Worker (`daily-quiz-push`, kostenloser Tarif) mit zwei Cron-Auslösern und Workers KV speichert Push-Anmeldungen und das Datum der letzten beendeten Runde und verschickt um 22 Uhr Berliner Zeit Web-Push-Nachrichten. Web Push (aes128gcm, VAPID) ist mit WebCrypto selbst implementiert. Die App bleibt ohne den Worker voll funktionsfähig; die Erinnerung ist optional und standardmäßig aus.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|-------------|------|------|---------|
| GitHub Actions mit Zeitplan | kein weiteres Konto | unpünktlich, kennt „schon gespielt“ nicht, ein Gerät pro Secret | erfüllt den Wunsch „nur wenn offen“ nicht |
| Lokale Benachrichtigung (Notification Triggers, Periodic Background Sync) | kein Server | nicht standardisiert bzw. nur Chrome und ohne feste Uhrzeit; auf iOS nicht vorhanden | unzuverlässig |
| Fertige Bibliothek `web-push` | weniger eigener Code | braucht Node-Krypto, läuft im Worker nur mit Kompatibilitätsschicht | rund 150 Zeilen WebCrypto genügen |
| Push-Dienstleister (OneSignal o. Ä.) | fertige Zustellung | Dritt-SDK und Tracking in der App | widerspricht „keine Dritten“ |

## Consequences

### Positive
- Pünktliche Erinnerung, die ausbleibt, wenn die Runde erledigt ist; mehrere Geräte möglich.
- Keine laufenden Kosten im erwarteten Umfang (rund 2 Anfragen pro Tag und Gerät).

### Negative
- Erste Server-Komponente: eigenes Deployment (`wrangler deploy`), ein Secret, ein weiterer Ausfallpunkt.
- Die App sendet erstmals Daten nach außen (Geräte-ID, Push-Anmeldung, Datum der letzten Runde).
- Eigene Krypto-Implementierung muss gepflegt werden.

### Risks
- 10 ms CPU-Limit im kostenlosen Tarif könnte beim Verschlüsseln knapp werden → nach dem Deployment messen; Ausweichmöglichkeit: Geräte auf mehrere Aufrufe verteilen.
- Öffentlicher Endpunkt → Allowlist der Push-Dienste, Gerätelimit, ID als Geheimnis (siehe Spec Abschnitt 4).
- Push-Dienste ändern Anforderungen (v. a. Apple) → Test-Knopf macht Fehler sofort sichtbar.

## Dependencies
- Hängt ab von: Cloudflare-Konto des Nutzers, Service Worker aus ADR-001.
- Schränkt ein: Weitere Server-Funktionen (z. B. Sync) sollten denselben Worker nutzen statt einen zweiten Dienst einzuführen.
