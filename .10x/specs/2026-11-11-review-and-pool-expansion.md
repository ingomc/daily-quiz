# Daily Quiz — Nachtrag: Zufallsauswahl, Wiederholung, Pool-Erweiterung

**Datum:** 2026-11-11
**Feature-Slug:** `review-and-pool-expansion`
**Status:** Freigegeben (Plan vom Nutzer bestätigt)
**Ändert:** Abschnitte 4 und 5 der Spec `2026-11-11-daily-quiz-design.md`

## 1. Zufällige Auswahl (ersetzt Abschnitt 4)

Die Tagesrunde wird beim Start zufällig gezogen und in `current` gespeichert; sie bleibt für den Tag stabil. Es gibt keine aus dem Datum berechnete feste Abfolge mehr, verschiedene Geräte bekommen verschiedene Fragen.

Reihenfolge der Auswahl für die 10 Plätze:

1. **Fällige Wiederholungen** (siehe 2), höchstens 3.
2. **Noch nie gesehene Fragen**, zufällig.
3. Wenn nicht genug ungesehene übrig sind: zuletzt richtig beantwortete Fragen, am längsten nicht gesehene zuerst.
4. Letzte Reserve: zuletzt falsch beantwortete, noch nicht fällige Fragen, am längsten nicht gesehene zuerst.

Anschließend werden die 10 Fragen gemischt; die Antwortreihenfolge jeder Frage ist zufällig.

## 2. Wiederholung falsch beantworteter Fragen

- Maßgeblich ist der jüngste Eintrag einer Frage in der Historie.
- Eine Frage ist **fällig**, wenn ihr letzter Versuch falsch war und mindestens 7 Tage zurückliegt.
- Pro Runde höchstens 3 Wiederholungen, die am längsten wartenden zuerst.
- Wird die Wiederholung richtig beantwortet, gilt die Frage als gelernt. Wird sie wieder falsch beantwortet, ist sie nach weiteren 7 Tagen erneut fällig.
- Wiederholungen sind auf dem Frage-Screen mit dem Chip „Wiederholung“ gekennzeichnet. Die Statistik zeigt die Zahl der offenen Wiederholungen (Fragen, deren letzter Versuch falsch war).
- 7 Tage und 3 pro Runde sind feste Werte, nicht einstellbar.

## 3. Pool-Erweiterung (ergänzt Abschnitt 5)

1000 zusätzliche Fragen, erzeugt mit der Codex CLI (`gpt-6-astra`, Effort `max`), Pool danach 1400:

- Die 10 bestehenden Kategorien wachsen um je 60 auf 100 Fragen (IDs 041–100).
- Vier neue Kategorien mit je 100 Fragen: `film` Film & Serien, `nature` Natur & Tiere, `food` Essen & Trinken, `society` Politik & Wirtschaft.

Format und Regeln für Fragen bleiben unverändert.

## 4. Daten

Das Speicherformat (`daily-quiz:v1`) bleibt unverändert. Alles Nötige (zuletzt gesehen, zuletzt richtig) wird aus `history` abgeleitet; vorhandene Spielstände bleiben gültig.

## 5. Tests

Siehe Plan: Auswahlregeln (ungesehen vor gesehen, 7-Tage-Abstand, Obergrenze 3, gelernt nach richtiger Antwort, erschöpfter Pool), Determinismus bei gleicher Zufallsquelle, Pool mit 1400 Fragen in 14 Kategorien.
