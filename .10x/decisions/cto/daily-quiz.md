# CTO — daily-quiz

- **Problem:** Ein persönliches, tägliches Wissensquiz mit eigenem Themenmix (Allgemeinwissen + Formel 1, Star Trek, Technik). Bestehende Quiz-Apps bieten weder diesen Mix noch Werbefreiheit/Offline-Betrieb.
- **Build vs. Buy:** Build. Umfang ist klein (4 Screens, reine Client-Logik), fertige Apps erfüllen den Themenwunsch nicht.
- **Tech-Richtung:** Statische PWA, Vite + TypeScript, kein UI-Framework, kein Backend. Laufende Kosten: 0 (statisches Hosting).
- **Risiken:** Inhaltliche Fehler im Fragenpool (aus Modellwissen geschrieben); Pool nach ca. 40 Tagen einmal durchgespielt → Nachschub per Update nötig.
- **Bewusst nicht:** KI-Generierung zur Laufzeit, Accounts, Sync.
