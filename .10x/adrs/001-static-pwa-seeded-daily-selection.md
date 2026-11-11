# ADR-001: Statische PWA mit gebündeltem Fragenpool und seed-basierter Tagesauswahl

**Status:** Accepted
**Date:** 2026-11-11
**Feature:** daily-quiz
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
Das Quiz ist für eine Einzelperson, soll offline funktionieren, nichts kosten und täglich 10 Fragen aus einem festen Pool liefern. Fragen dürfen sich nicht kurzfristig wiederholen. Der Nutzer hat einen festen Pool und einen zufälligen Themenmix gewählt.

## Decision
- Rein statische PWA (Vite + TypeScript, kein UI-Framework, `vite-plugin-pwa`), Fragen als JSON im Bundle.
- Tagesauswahl ohne gespeicherten Zustand: Der Pool wird pro Zyklus mit einem aus der Zyklusnummer abgeleiteten Seed gemischt (mulberry32 + Fisher-Yates); der Tag wählt per Tagesnummer ein 10er-Fenster.
- Persistenz ausschließlich in `localStorage` unter einem versionierten Schlüssel; Statistiken werden aus der Historie berechnet.
- Reine Logik (`core/*`) ist von DOM und Speicher getrennt.

## Alternatives Considered
| Alternative | Pros | Cons | Why Not |
|-------------|------|------|---------|
| Backend liefert Tagesfragen | Pool ohne App-Update erweiterbar | Server, Kosten, kein Offline-Start | widerspricht „kein Server“ |
| Zufallsauswahl + Liste gesehener Fragen im Speicher | einfache Logik | Zustand geht bei Datenverlust verloren, nicht reproduzierbar | Seed-Verfahren braucht keinen Zustand |
| React/Svelte | bequemes State-Handling | Abhängigkeiten und Bundle für 4 Screens | unnötig |
| IndexedDB | größere Datenmengen | asynchron, mehr Code | Datenmenge ist winzig |

## Consequences

### Positive
- Keine Betriebskosten, vollständig offline, trivial zu hosten.
- Auswahl deterministisch und testbar.

### Negative
- Neue Fragen nur per Deployment.
- Pool-Änderungen verschieben die Auswahl künftiger Tage; an Zyklusgrenzen kann eine Frage nach kurzer Zeit erneut erscheinen.
- Kein Geräte-Sync; gelöschte Browserdaten löschen den Fortschritt.

### Risks
- `localStorage` nicht verfügbar → Betrieb im Speicher mit Hinweis.
- Inhaltliche Fehler im Pool → Korrektur per JSON und Update.

## Dependencies
- Hängt ab von: Vite, vite-plugin-pwa (Workbox).
- Schränkt ein: Ein späterer Sync oder Server-Pool braucht einen neuen ADR.
