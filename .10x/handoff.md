# Handoff

**Stand:** Live unter https://ingomc.github.io/daily-quiz/ (Repository `ingomc/daily-quiz`, öffentlich).

- Deployment: Push auf `main` → GitHub Actions → Pages. Details: `.10x/decisions/devops/daily-quiz.md`
- Runbook: `.10x/decisions/sre/daily-quiz.md`
- QA-Report und Security-Review: `.10x/reviews/`
- Dashboards/Eskalation: entfällt (kein Server, Einzelnutzer); Deploy-Status unter „Actions“ im Repository.
- Offen: Test auf echtem Gerät, inhaltliche Stichprobe der Fragen, Actions-Versionen aktualisieren.

## Nachtrag 2026-11-11
- Auswahl ist jetzt zufällig und historienbasiert (ADR-002); falsche Fragen kommen nach 7 Tagen wieder.
- Pool: 1400 Fragen in 14 Kategorien. Details: `.10x/decisions/*/review-and-pool-expansion.md`.
