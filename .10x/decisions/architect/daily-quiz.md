# Architect — daily-quiz

ADR: `.10x/adrs/001-static-pwa-seeded-daily-selection.md`

## Komponenten
| Modul | Aufgabe |
|---|---|
| `src/core/rng.ts` | mulberry32, String-Hash, Shuffle |
| `src/core/date.ts` | lokaler Tages-Key, Tagesnummer |
| `src/core/daily.ts` | Tagesauswahl + Antwortreihenfolge |
| `src/core/stats.ts` | Streak, Statistik aus Historie |
| `src/data/questions.ts` | Pool aus JSON, Kategorien-Metadaten |
| `src/storage.ts` | versionierte Persistenz, tolerant gegen defekte Daten |
| `src/game.ts` | Zustandsübergänge der Runde (pure Funktionen über `SaveData`) |
| `src/ui/*` | Screens, rendern per DOM-Helfer (kein innerHTML mit Daten) |
| `src/main.ts` | Boot, Navigation, Tageswechsel |

## Datenfluss
`main` lädt `SaveData` → `game.ensureRound` (fortsetzen oder neu ziehen) → UI ruft `game.answer` → neues `SaveData` → `store.save` → UI rendert neu.

## Grenzen
- `core/*` kennt weder DOM noch Storage.
- `game.ts` ist pur; nur `main`/`storage` haben Seiteneffekte.

## Fehlerfälle
Siehe Spec Abschnitt 10. Eine beendete Runde bleibt als `current` (10 Picks) bis zum Folgetag erhalten, damit der Rückblick die gewählten Antworten zeigen kann.
