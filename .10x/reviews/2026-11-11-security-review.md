# Security-Review — daily-quiz — 2026-11-11

| Thema | Befund |
|---|---|
| XSS | Alle Inhalte werden als Textknoten gesetzt (`h()`), kein `innerHTML`. Fragen stammen aus dem eigenen Bundle. |
| CSP | Im Build: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'`. Im Browser ohne Verstöße geprüft. Dynamische Styles laufen über CSSOM, nicht über style-Attribute. |
| Gespeicherte Daten | `parseSave` validiert Struktur, Indizes und Datumsformat; manipulierte Daten führen zu leerem Zustand, nicht zu Fehlern. Keine personenbezogenen Daten. |
| Netzwerk | Keine Requests an Dritte, keine Analytics, keine externen Fonts. |
| Auth / Secrets | Nicht vorhanden. |
| Abhängigkeiten | Keine Laufzeit-Abhängigkeiten (`npm audit --omit=dev`: 0). Dev-Tooling meldet moderate Hinweise (glob, minimatch, deepmerge), die nicht ausgeliefert werden. |
| Per Meta-Tag nicht setzbar | `frame-ancestors` und weitere Header (z. B. `X-Content-Type-Options`) sollten beim Hosting als HTTP-Header gesetzt werden. |

## Ergebnis
Keine Befunde, die das Release blockieren. Empfehlung fürs Hosting: Security-Header ergänzen.
