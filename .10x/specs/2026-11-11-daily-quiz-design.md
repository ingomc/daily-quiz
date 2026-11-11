# Daily Quiz — Design-Spec

**Datum:** 2026-11-11
**Feature-Slug:** `daily-quiz`
**Status:** Zur Freigabe

## 1. Ziel

Ein tägliches Quiz als installierbare PWA für eine Einzelperson. Jeden Tag gibt es genau eine Runde mit 10 Multiple-Choice-Fragen (je 4 Antworten, genau eine richtig), die nacheinander beantwortet werden. Themen: breites Allgemeinwissen plus die Spezialthemen Formel 1, Star Trek und Technik. Sprache der App und der Fragen: Deutsch.

## 2. Nicht-Ziele

- Kein Konto, kein Server, keine Synchronisation zwischen Geräten
- Kein Zeitlimit, keine Bonuspunkte
- Kein Teilen des Ergebnisses
- Keine KI-Generierung von Fragen zur Laufzeit
- Keine einstellbare Kategorie-Gewichtung
- Kein Nachspielen verpasster Tage

## 3. Spielregeln

- Eine Runde pro Kalendertag (lokale Zeit des Geräts). Der Tag wird als `YYYY-MM-DD` bestimmt.
- 10 Fragen, feste Reihenfolge, eine Frage pro Screen.
- Tippen auf eine Antwort ist endgültig. Danach werden richtige Antwort (grün) und ggf. die falsch gewählte (rot) markiert und die Erklärung eingeblendet. Weiter geht es per Button „Weiter“.
- Punktzahl = Anzahl richtiger Antworten (0–10).
- Wird die App mitten in der Runde geschlossen, geht es beim nächsten Öffnen am selben Tag bei der nächsten unbeantworteten Frage weiter. Eine am Vortag begonnene, nicht beendete Runde verfällt.
- Nach Abschluss zeigt der Startscreen das heutige Ergebnis und einen Hinweis, dass morgen die nächste Runde kommt. Die Runde kann nicht wiederholt werden.

## 4. Tagesauswahl

- Alle Fragen aller Kategorien liegen in einem Topf; der Themenmix pro Tag ist zufällig.
- Der Pool wird in „Zyklen“ durchgespielt: Für Zyklus `z` wird die nach ID sortierte Fragenliste mit einem aus `z` abgeleiteten Seed gemischt (Fisher-Yates mit seeded PRNG, mulberry32). Tag `n` (Tage seit dem festen Epoch-Datum 2026-01-01) nimmt aus dem Zyklus `floor(n / tageProZyklus)` die 10 Fragen ab Position `(n mod tageProZyklus) * 10`. `tageProZyklus = floor(poolGröße / 10)`.
- Folge: Keine Frage wiederholt sich innerhalb eines Zyklus; jeder Nutzer bekommt am selben Tag dieselben Fragen; die Auswahl ist ohne gespeicherten Zustand reproduzierbar.
- Die Reihenfolge der 4 Antworten wird pro Frage und Tag ebenfalls seeded gemischt.
- Wächst der Pool durch ein Update, verschiebt sich die Auswahl künftiger Tage. Die bereits begonnene oder beendete Runde von heute ist davon nicht betroffen, weil sie mit Fragen-IDs gespeichert ist.

## 5. Fragenpool

- Startumfang: ca. 400 Fragen, je ca. 40 pro Kategorie.
- Kategorien (ID → Anzeigename): `science` Naturwissenschaft, `math` Mathematik, `geography` Geografie, `history` Geschichte, `language` Sprache & Literatur, `arts` Kunst & Musik, `sports` Sport, `f1` Formel 1, `startrek` Star Trek, `tech` Technik.
- Ablage: eine JSON-Datei pro Kategorie unter `src/data/questions/<kategorie>.json`, ins Bundle eingebunden (offline verfügbar).
- Format einer Frage:

```json
{
  "id": "science-001",
  "question": "Wie lautet die chemische Formel von Wasser?",
  "answers": ["H₂O", "CO₂", "O₂", "NaCl"],
  "correct": 0,
  "explanation": "Ein Wassermolekül besteht aus zwei Wasserstoffatomen und einem Sauerstoffatom."
}
```

- Die Kategorie ergibt sich aus der Datei. IDs sind stabil und werden nie wiederverwendet.
- Fragen sollen zeitlos formuliert sein (keine „aktueller Weltmeister“-Fragen), damit sie nicht veralten.

## 6. Screens

1. **Start** — Titel, aktuelle Streak, Button „Heute spielen“ / „Weiterspielen“; nach Abschluss stattdessen das heutige Ergebnis. Zugang zur Statistik.
2. **Frage** — Fortschrittsanzeige (10 Segmente, gefärbt nach richtig/falsch), Kategorie-Chip in Kategoriefarbe, Fragetext, 4 Antwortkarten. Nach der Antwort: Markierung, Erklärung, „Weiter“.
3. **Ergebnis** — Punktzahl, kurzer Kommentar je nach Ergebnis, Konfetti ab 8/10, Streak, Rückblick auf alle 10 Fragen mit eigener und richtiger Antwort.
4. **Statistik** — gespielte Tage, aktuelle und längste Streak, Gesamt-Trefferquote, Ergebnisse der letzten 14 Tage als Balken, Trefferquote pro Kategorie.

## 7. Look & Feel

- Verspielt und bunt: kräftige Farben, jede Kategorie mit eigener Farbe, große runde Karten, federnde Animationen beim Tippen und beim Fragenwechsel.
- Für Handy im Hochformat optimiert; auf breiten Bildschirmen zentrierte Spalte (max. ca. 480 px).
- Heller und dunkler Modus folgen der Systemeinstellung.
- `prefers-reduced-motion` schaltet Animationen und Konfetti ab.
- Tastatur- und Screenreader-bedienbar (echte Buttons, Fokus-Stile, Ergebnis der Antwort per `aria-live`).

## 8. Architektur

Vite + TypeScript, kein UI-Framework, `vite-plugin-pwa`. Rein statisch.

| Modul | Aufgabe | Abhängigkeiten |
|---|---|---|
| `core/rng.ts` | seeded PRNG, Shuffle | — |
| `core/date.ts` | lokaler Tages-Key, Tagesnummer, Tagesdifferenz | — |
| `core/daily.ts` | Tagesauswahl aus dem Pool (Abschnitt 4) | rng, date |
| `core/stats.ts` | Streak und Statistik aus der Historie berechnen | date |
| `data/questions.ts` | Pool laden, Kategorien-Metadaten | JSON-Dateien |
| `storage.ts` | Lesen/Schreiben in `localStorage`, Versionierung | — |
| `game.ts` | Zustand der laufenden Runde (Start, Antwort, Abschluss) | daily, storage |
| `ui/*` | ein Modul pro Screen, rendert in `#app` | game, stats |
| `main.ts` | Start, Screen-Wechsel, Service-Worker-Registrierung | alles |

`core/*` ist reine Logik ohne DOM und ohne Speicherzugriff und damit direkt testbar.

## 9. Daten im `localStorage`

Ein Schlüssel `daily-quiz:v1` mit:

```ts
{
  version: 1,
  current: { date: string, questionIds: string[], answerOrders: number[][], picks: number[] } | null,
  history: { [date: string]: { score: number, results: { id: string, category: string, correct: boolean }[] } }
}
```

- `picks` enthält den Index der gewählten Antwort in der Originalreihenfolge der Frage.
- Streak und Statistiken werden aus `history` berechnet, nicht separat gespeichert.
- Streak: Anzahl aufeinanderfolgender gespielter Tage bis heute; ist heute noch nicht gespielt, zählt die Serie bis gestern weiter.

## 10. Fehlerfälle

- `localStorage` nicht verfügbar oder Daten defekt: App läuft mit leerem Zustand im Speicher weiter und zeigt einen Hinweis, dass der Fortschritt nicht gespeichert wird. Defekte Daten werden nicht überschrieben, bevor eine Runde beendet ist.
- Gespeicherte Runde verweist auf eine nicht mehr vorhandene Frage-ID: Runde für heute wird neu gezogen.
- Tageswechsel bei offener App: Beim Zurückkehren zum Startscreen und beim Sichtbarwerden der App wird das Datum neu geprüft.
- Neue App-Version: Service Worker aktualisiert im Hintergrund; die neue Version greift beim nächsten Start.

## 11. PWA

- Manifest mit Name „Daily Quiz“, Icons (192, 512, maskable), `display: standalone`, Hochformat.
- Service Worker cached alle Assets vorab; App ist nach dem ersten Laden vollständig offline spielbar.
- Keine externen Requests zur Laufzeit (keine Fonts oder Skripte von Dritten).

## 12. Tests

- Unit (Vitest): `rng`, `date`, `daily` (10 eindeutige Fragen, deterministisch, keine Wiederholung im Zyklus), `stats` (Streak-Fälle inkl. Lücke und „heute noch offen“), `game` (Fortsetzen, Abschluss), `storage` (defekte Daten).
- Pool-Validierung als Test: eindeutige IDs, genau 4 unterschiedliche Antworten, `correct` in 0–3, nicht-leere Erklärung, keine doppelten Fragetexte.
- Manuell im Browser: kompletter Durchlauf, Fortsetzen nach Reload, heller/dunkler Modus, Offline-Betrieb, Installierbarkeit.

## 13. Auslieferung

Statischer Build (`dist/`). Das Hosting (z. B. GitHub Pages oder Netlify) wird in der Delivery-Phase mit dem Nutzer entschieden; der Build verwendet relative Pfade, damit beides ohne Umbau funktioniert.

## 14. Bekanntes Risiko

Die Fragen werden aus Modellwissen geschrieben. Einzelne Fakten können trotz Validierung falsch sein; die Validierung prüft nur die Form, nicht den Inhalt. Fehlerhafte Fragen werden per JSON-Korrektur und App-Update behoben.
