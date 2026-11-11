# Product Manager — daily-quiz

Spec: `.10x/specs/2026-11-11-daily-quiz-design.md`

## User Stories
- Als Spieler will ich jeden Tag 10 neue Multiple-Choice-Fragen nacheinander beantworten.
- Als Spieler will ich nach jeder Antwort sehen, was richtig war und warum.
- Als Spieler will ich meine Serie und meine Trefferquote (gesamt, pro Kategorie) sehen.
- Als Spieler will ich die App installieren und offline spielen können.
- Als Spieler will ich eine unterbrochene Runde am selben Tag fortsetzen.

## Scope
- Drin: 4 Screens (Start, Frage, Ergebnis, Statistik), ca. 400 Fragen in 10 Kategorien, zufälliger Themenmix, Streak, Erklärungen, heller/dunkler Modus.
- Draußen: Zeitlimit, Teilen, Kategorie-Einstellungen, Accounts, Nachspielen.

## Erfolgskriterien
- Kompletter Tagesdurchlauf ohne Netz möglich.
- Keine Fragenwiederholung innerhalb eines Pool-Zyklus.
- Fortschritt übersteht Reload und App-Neustart.
- Lighthouse-/Browser-Kriterien für Installierbarkeit erfüllt (Manifest, Service Worker, Icons).
