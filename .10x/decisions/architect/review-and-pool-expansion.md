# Architect — review-and-pool-expansion

ADR: `.10x/adrs/002-history-based-random-selection.md` · Spec: `.10x/specs/2026-11-11-review-and-pool-expansion.md`

- `core/daily.ts`: `pickRound(ids, history, today, rand)` ersetzt `pickDaily`. Reihenfolge: fällige Wiederholungen (max. 3, älteste zuerst) → ungesehene zufällig → am längsten nicht gesehene richtige → übrige falsche. Ergebnis wird gemischt.
- `lastAttempts(history, before?)` leitet je Frage den jüngsten Versuch ab; genutzt von Auswahl, Statistik (`openReviews`) und Frage-Screen (Chip „Wiederholung“).
- Kein neuer gespeicherter Zustand; `history` ist die einzige Quelle.
- Zufallsquelle ist injizierbar (`Math.random` als Standard), `core/*` bleibt pur.
