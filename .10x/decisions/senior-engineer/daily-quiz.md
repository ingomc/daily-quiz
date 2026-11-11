# Senior Engineer — daily-quiz

## Umsetzung je Aufgabe
- **Tagesauswahl:** IDs sortieren → `perCycle = floor(n/10)` → Zyklus-Seed `hash("cycle:<z>")` → Shuffle → Fenster. Antwortreihenfolge: Seed `hash("<datum>:<id>")`.
- **Datum:** Tages-Key aus lokalen Datumsfeldern; Differenzen über `Date.UTC`, damit Sommerzeit keine Rolle spielt.
- **Game:** `ensureRound(data, pool, today)` und `answer(data, pool, pick)` als pure Funktionen. Beim 10. Pick wird `history[date]` geschrieben; `current` bleibt für den Rückblick.
- **Storage:** `createStore(storage | null)`; defekte Daten → leerer Zustand, Schreiben erst wieder, wenn eine Runde beendet ist.
- **UI:** Ein `render()` pro Screen ersetzt den Inhalt von `#app`. Antwort-Feedback per Klassen am Button, kein Re-Render der Frage.
- **PWA:** `registerType: 'autoUpdate'`, `base: './'`, CSP wird nur im Build ins HTML injiziert.

## Knifflige Stellen
- Streak, wenn heute noch offen ist (zählt ab gestern).
- Gespeicherte Runde mit unbekannten Frage-IDs nach Pool-Update → neu ziehen.
- Tageswechsel bei offener App → bei `visibilitychange` neu booten, außer mitten in einer Frage.
