# Status

**Feature:** `daily-quiz`
**Aktuelle Phase:** 6 — Delivery abgeschlossen (live auf GitHub Pages)

| Phase | Stand |
|---|---|
| 0 Brainstorming | abgeschlossen, Spec freigegeben |
| 1 Strategie | abgeschlossen |
| 2 Design | abgeschlossen (ADR-001) |
| 3 Planung | abgeschlossen |
| 4 Implementierung | abgeschlossen |
| 5 Verifikation | abgeschlossen (31/31 Tests, Browser-Durchlauf, Security ohne Blocker) |
| 6 Delivery | abgeschlossen — https://ingomc.github.io/daily-quiz/ |

## Aufgaben
- [x] 1 Projektgerüst
- [x] 2 Fragenpool (400)
- [x] 3 core/* + Tests
- [x] 4 storage, game + Tests
- [x] 5 Pool-Loader + Validierung
- [x] 6 UI
- [x] 7 PWA
- [x] 8 Verifikation
- [x] 9 Delivery-Doku

## Offen
- Actions-Versionen im Deploy-Workflow aktualisieren (Node-20-Deprecation)
- Test auf echtem Gerät, Screenreader
- Inhaltliche Stichprobe der Fragen (Liste im QA-Report)

## Feature `review-and-pool-expansion` (2026-11-11)
- [x] Spec-Nachtrag + ADR-002
- [x] Zufällige, historienbasierte Auswahl mit Wiederholung (7 Tage, max. 3 pro Runde)
- [x] 1000 neue Fragen per Codex (Pool 1400, 14 Kategorien)
- [x] Verifikation: 36/36 Tests, Browser-Durchlauf
- [x] Deployment über Push auf `main`

Offen: inhaltliche Prüfung der Fragen nur als Stichprobe; Test auf echtem Gerät.

## Feature `push-reminder` (2026-11-14)
- [x] Spec-Nachtrag + ADR-003
- [x] Worker gebaut, getestet und bei Cloudflare deployt
- [x] App: Schalter, Test, Meldung „erledigt“
- [x] App-Teil gepusht und ausgeliefert (2026-11-14, Worker-Adresse vom Nutzer freigegeben)
- [ ] Zustellung auf echtem Gerät prüfen
