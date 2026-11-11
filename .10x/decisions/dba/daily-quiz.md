# DBA — daily-quiz

Keine Datenbank. Persistenz: ein `localStorage`-Eintrag `daily-quiz:v1` (Schema in Spec Abschnitt 9, Typen in `src/types.ts`).

- Größe: ca. 700 Byte pro gespieltem Tag → rund 250 KB pro Jahr, weit unter dem 5-MB-Limit.
- Migration: Bei Schemaänderung neue `version` + Migrationsschritt in `parseSave`; unbekannte Versionen werden derzeit als defekt behandelt und nicht überschrieben, bis eine Runde beendet ist.
- Abgeleitete Werte (Streak, Quoten) werden nicht gespeichert.
