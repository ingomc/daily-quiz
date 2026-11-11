# DevOps — daily-quiz

- Build: `npm ci && npm test && npm run build` → `dist/` (relative Pfade, läuft an Domain-Root und in Unterordnern).
- Hosting: noch nicht entschieden (Nutzerentscheidung). Geeignet: GitHub Pages, Netlify, Cloudflare Pages, eigener Webspace. Voraussetzung: HTTPS (für Service Worker und Installation).
- CI/CD: noch nicht eingerichtet; hängt vom Hosting ab.
- Caching-Hinweis für den Host: `sw.js` und `index.html` nicht langfristig cachen; `assets/*` sind gehasht.
- Rollback: vorherigen Commit bauen und erneut ausliefern; der Service Worker aktualisiert sich beim nächsten Start (`autoUpdate`).
