# Daily Quiz

Tägliches Quiz als PWA: jeden Tag 10 Multiple-Choice-Fragen aus einem Pool von 400 Fragen (Allgemeinwissen, Formel 1, Star Trek, Technik). Läuft komplett im Browser, speichert lokal, funktioniert offline.

```bash
npm install
npm run dev      # Entwicklung
npm test         # Tests inkl. Fragen-Validierung
npm run build    # statischer Build nach dist/
npm run preview  # Build lokal ansehen
```

## Fragen ergänzen oder korrigieren

Die Fragen liegen in `src/data/questions/<kategorie>.json`. Neue Fragen mit fortlaufender ID anhängen, bestehende IDs nie ändern, danach `npm test` ausführen.

Design, Entscheidungen und Reviews stehen unter `.10x/`.
