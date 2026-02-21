# Managing secrets and removing committed credentials

1) Ensure `.gitignore` contains `firebase-config.js` and `supabase-config.js` (already added).

2) If you previously committed real keys, remove them from the repo index:

```powershell
git rm --cached firebase-config.js supabase-config.js
git commit -m "Remove sensitive configs from repo"
git push origin main
```

3) Use `.env` for local development (see `.env.example`) and do NOT commit it.

4) Configure secrets in your hosting provider instead of committing them:
- Vercel: Project Settings -> Environment Variables
- Netlify: Site settings -> Build & deploy -> Environment
- Firebase Hosting: use CI/CD env vars or Firebase project settings

5) Keep `firebase-config.js.example` and `.env.example` in the repo as templates.
