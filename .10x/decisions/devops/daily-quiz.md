# DevOps — daily-quiz

- **Hosting:** GitHub Pages, öffentliches Repository `ingomc/daily-quiz`, live unter https://ingomc.github.io/daily-quiz/
- **CI/CD:** `.github/workflows/deploy.yml` — bei jedem Push auf `main` (und manuell): `npm ci` → `npm test` → `npm run build` → Deployment von `dist/`. Schlägt ein Test fehl, wird nicht ausgeliefert.
- **Build:** relative Pfade (`base: './'`), läuft daher im Unterordner `/daily-quiz/`.
- **Rollback:** fehlerhaften Commit per `git revert` zurücknehmen und pushen; der Service Worker aktualisiert sich beim nächsten App-Start.
- **Einschränkungen:** GitHub Pages erlaubt keine eigenen HTTP-Header; `frame-ancestors` und `X-Content-Type-Options` sind daher nicht gesetzt (CSP kommt per Meta-Tag).
- **Wartung:** Die verwendeten Actions (`checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`) melden eine Node-20-Deprecation und sollten bei Gelegenheit auf neuere Major-Versionen gehoben werden.
- **Git-Absender:** Für dieses Repository ist die GitHub-noreply-Adresse konfiguriert; die Historie wurde vor der Veröffentlichung darauf umgeschrieben.
