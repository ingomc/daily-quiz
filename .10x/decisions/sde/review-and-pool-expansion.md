# SDE — review-and-pool-expansion

## Gebaut
- `pickRound` + `lastAttempts` in `src/core/daily.ts`; `ensureRound` (`src/game.ts`) übergibt die Historie.
- `openReviews` in `src/core/stats.ts`, Anzeige in `src/ui/stats.ts`; Chip „Wiederholung“ in `src/ui/question.ts`.
- Vier neue Kategorien (`film`, `nature`, `food`, `society`) in `src/data/questions.ts` und `src/style.css`.
- Entfernt: `hashString`, `EPOCH`, `dayNumber` (nur von der alten Seed-Auswahl genutzt).
- Pool: 1000 neue Fragen von Codex CLI (`gpt-6-astra`, Effort `max`, 14 Subagenten, höchstens 3 gleichzeitig) → 1400 Fragen, 100 je Kategorie. Die 400 Originalfragen sind unverändert, bis auf tech-023.

## Abweichungen
- tech-023 (Binärzahl 1010) war ein inhaltliches Duplikat von math-034 aus dem ursprünglichen Pool und wurde durch eine Gray-Code-Frage ersetzt.

## Tech Debt
- JS-Bundle wächst mit dem Pool auf 463 KB (153 KB gzip); bei weiterem Wachstum Fragen pro Kategorie nachladen.
- Der Duplikat-Test erkennt nur wortgleiche Fragen, keine inhaltlichen Dubletten.
