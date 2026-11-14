# DevOps — push-reminder

- Worker: `daily-quiz-push` im Cloudflare-Konto des Nutzers (kostenloser Tarif), Konfiguration `worker/wrangler.jsonc`.
- Deploy: `npx wrangler login` (einmalig), dann `npm run deploy:worker`. Nicht Teil der GitHub-Actions-Pipeline.
- Secret: `npx wrangler secret put VAPID_PRIVATE_JWK --cwd worker` (JWK des privaten P-256-Schlüssels). Der öffentliche Schlüssel steht in `wrangler.jsonc` und `src/push-config.ts` und muss zusammenpassen.
- Rollback: `npx wrangler rollback --cwd worker`.
