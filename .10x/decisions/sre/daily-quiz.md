# SRE — daily-quiz

- Kein Server, daher keine SLOs und kein Monitoring; Verfügbarkeit = Verfügbarkeit des statischen Hosts, danach offline aus dem Cache.
- Runbook:
  - **App zeigt alte Version:** App schließen und neu öffnen (Update greift beim nächsten Start); notfalls Website-Daten löschen (löscht auch den Fortschritt).
  - **Fortschritt weg:** Browserdaten wurden gelöscht oder Privatmodus; nicht wiederherstellbar (kein Sync).
  - **Falsche Frage:** JSON in `src/data/questions/` korrigieren, `npm test`, neu ausliefern. IDs nicht ändern.
  - **Pool erweitern:** neue Fragen mit fortlaufenden IDs anhängen; die Auswahl künftiger Tage verschiebt sich.
