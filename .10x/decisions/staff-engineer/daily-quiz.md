# Staff Engineer — daily-quiz

## Standards
- TypeScript `strict`; keine `any`.
- DOM nur über den Helfer `h()`; Fragen-Texte ausschließlich als Textknoten.
- Styles in einer CSS-Datei mit Custom Properties für Farben; heller/dunkler Modus über `prefers-color-scheme`.
- Keine Laufzeit-Abhängigkeiten; Dev-Abhängigkeiten: vite, typescript, vitest, vite-plugin-pwa.
- Tests liegen neben dem Code (`*.test.ts`), laufen in der Node-Umgebung; Storage wird injiziert.

## Querschnitt
- Barrierefreiheit: echte `<button>`, sichtbarer Fokus, `aria-live` für Feedback, `prefers-reduced-motion`.
- Sicherheit: CSP per Meta-Tag im Build, keine Dritt-Requests.
- Texte der Oberfläche auf Deutsch, direkt im Code (keine i18n-Schicht).
