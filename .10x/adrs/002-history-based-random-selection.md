# ADR-002: Zufällige, historienbasierte Fragenauswahl mit Wiederholung

**Status:** Accepted
**Date:** 2026-11-11
**Feature:** review-and-pool-expansion
**Author:** 10x-Team (Architect + Staff Engineer)
**Supersedes:** den Teil „Tagesauswahl ohne gespeicherten Zustand“ aus ADR-001 (der Rest von ADR-001 gilt weiter)

## Context
Der Nutzer will, dass die Fragen nicht in einer festen Abfolge kommen und dass falsch beantwortete Fragen frühestens nach 7 Tagen wiederholt werden (höchstens 3 pro Tag, bis sie richtig beantwortet sind). Die Seed-Auswahl aus ADR-001 kennt keinen Spielerzustand und kann das nicht leisten.

## Decision
`pickRound(ids, history, today, rand)` zieht die Runde aus dem Pool anhand der gespeicherten Historie: fällige Wiederholungen zuerst (max. 3), dann ungesehene Fragen zufällig, dann am längsten nicht gesehene. Die Zufallsquelle ist `Math.random`, in Tests injizierbar. „Zuletzt gesehen“ und „zuletzt richtig“ werden bei jedem Ziehen aus `history` abgeleitet; das Speicherformat bleibt unverändert.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|-------------|------|------|---------|
| Seed-Auswahl behalten, Wiederholungen als separate gespeicherte Liste | weiterhin gleiche Fragen für alle | zwei Auswahlmechanismen, neuer gespeicherter Zustand, feste Abfolge bleibt | widerspricht dem Wunsch nach zufälliger Abfolge |
| Pro Frage einen Lernstand speichern (Leitner-Fächer) | flexiblere Intervalle | Schemaänderung und Migration, mehr Regeln | 7 Tage fest reichen; aus Historie ableitbar |
| Seed aus Geräte-ID + Datum | reproduzierbar pro Gerät | bringt keinen Nutzen gegenüber gespeicherter Runde | unnötig |

## Consequences

### Positive
- Keine Wiederholung gesehener Fragen, solange ungesehene existieren (statt nur innerhalb eines Zyklus).
- Pool-Erweiterungen verschieben nichts mehr; neue Fragen kommen einfach in den Topf der ungesehenen.
- Kein neues Speicherformat.

### Negative
- Verschiedene Geräte haben verschiedene Tagesrunden; die Auswahl ist ohne den Spielstand nicht reproduzierbar.
- Die Ableitung läuft bei jedem Rundenstart über die gesamte Historie (10 Einträge pro Tag, vernachlässigbar).
- Gelöschte Browserdaten löschen auch den Wiederholungsstand.

### Risiken
- Viele offene Wiederholungen stauen sich (max. 3 pro Tag) → in der Statistik sichtbar.

## Dependencies
- Hängt ab von: `history` aus ADR-001 (enthält je Tag Frage-ID und richtig/falsch).
- Schränkt ein: Ein späterer Geräte-Sync müsste die Historie synchronisieren, nicht nur Ergebnisse.
