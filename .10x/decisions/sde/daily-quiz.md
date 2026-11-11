# SDE — daily-quiz

## Gebaut
- `src/core/` rng, date, daily, stats (pure Logik) + `core.test.ts`
- `src/game.ts`, `src/storage.ts` + `game.test.ts`
- `src/data/questions.ts` + 10 JSON-Dateien à 40 Fragen (400 gesamt) + `questions.test.ts`
- `src/ui/` home, question, result, stats, dom-Helfer; `src/main.ts`; `src/style.css`
- PWA: `vite.config.ts` (vite-plugin-pwa, CSP nur im Build), Icons aus `public/icon.svg` via `pwa-assets.config.ts`

## Abweichungen vom Plan
- Service Worker wird per generiertem `registerSW.js` registriert (kein Import im App-Code).
- Die beendete Runde bleibt als `current` gespeichert, damit der Rückblick die gewählten Antworten kennt (Schema unverändert).
- history-023 war ein Duplikat von science-035 und wurde ersetzt (Telefon-Patent 1876).

## Tech Debt
- Fragen sind inhaltlich nicht gegen Quellen geprüft; die Autoren-Agenten haben einzelne Fragen als prüfenswert markiert (siehe QA-Report).
- Kein E2E-Test; Browser-Durchlauf war manuell.
- Dev-Abhängigkeiten melden moderate `npm audit`-Hinweise (nur Build-Tooling).
