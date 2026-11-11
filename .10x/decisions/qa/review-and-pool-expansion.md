# QA — review-and-pool-expansion

- `npm test`: 36/36 grün (10 neue Auswahl-Tests: 7-Tage-Abstand, Obergrenze 3, gelernt nach richtiger Antwort, erschöpfter Pool, Zufall/Determinismus). Build grün.
- Pool geprüft: 1400 Fragen, 14 Kategorien à 100; Originale bytegleich (außer tech-023); richtige Antwort bei den neuen Fragen exakt gleichverteilt; keine überlangen Texte, keine geraden Anführungszeichen.
- Fragen mit gleicher richtiger Antwort: 11 Gruppen gesichtet, keine inhaltliche Dublette.
- Stichprobe von 54 neuen Fragen gelesen: keine Fehler gefunden. Codex meldet keine unsicheren Fakten und hat nach eigenen Angaben per Websuche geprüft; das ist nicht unabhängig bestätigt.
- Browser: Wiederholung mit präparierter Historie (5 fällige, 2 zu frische → genau die 3 ältesten erscheinen, Chip sichtbar); Reload behält die Runde; neuer Spielstand zieht andere Fragen; 14 Themen auf der Startseite; keine Konsolenfehler im Produktions-Build.
- Nicht geprüft: die übrigen rund 950 neuen Fragen inhaltlich; Verhalten auf echtem Gerät.
- Hinweis: Einige Formel-1-Fragen betreffen Rennen bis 2024 (feste Ergebnisse, kein Veralten).
