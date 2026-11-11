# Engineering Manager — daily-quiz

## Aufgaben (in Reihenfolge)
1. Projektgerüst: Vite, TypeScript, Vitest, PWA-Plugin
2. Fragenpool: 10 JSON-Dateien à ca. 40 Fragen (parallel zu 3–5)
3. `core/*` mit Tests (rng, date, daily, stats)
4. `storage.ts`, `game.ts` mit Tests
5. `data/questions.ts` + Pool-Validierungstest
6. UI: Start, Frage, Ergebnis, Statistik + Styles
7. PWA: Manifest, Icons, Service Worker, CSP
8. Verifikation im Browser (Durchlauf, Reload, Dark Mode, Offline)
9. Delivery-Doku

## Abhängigkeiten
- 5 braucht 2; 6 braucht 3–5; 7 braucht 6.

## Risiken
- Kompatibilität vite-plugin-pwa mit aktueller Vite-Version.
- Qualität der Fragen (inhaltlich nicht automatisch prüfbar).
