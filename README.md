# Vitalis AI

AI health & fitness assistant: React + Node, Firebase login, PostgreSQL, Gemini.

## Run it

```bash
cp .env.example .env      # fill in the values
docker compose up -d --build
```

Open http://localhost:3001

## What goes in `.env`

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio |
| `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID` | Firebase console → Project settings → Your apps → Web app |
| `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT` | Firebase console → Project settings → Service accounts → Generate new private key |
| `ADMIN_EMAILS` | Your email, to become admin |
| `POSTGRES_PASSWORD` | Any strong password |

In Firebase → Authentication, turn on **Email/Password** and **Google**, and add your domain under **Authorized domains**.

## Features

- **Login:** Firebase (email/password, Google). Every API call is checked on the server.
- **Roles:** `user` and `admin`. Admins can manage users at `/admin`.
- **Database:** PostgreSQL stores users, analyses and coach chat. Tables are created automatically.

## CI/CD

Every push and pull request runs `.github/workflows/ci-cd.yml`:

1. Lint + typecheck
2. Tests (against a real PostgreSQL)
3. Security scan: `npm audit` + **Trivy** (dependencies, secrets, Dockerfile)
4. Build the Docker image and smoke-test it
5. **Trivy** image scan (fails on fixable HIGH/CRITICAL)
6. Push the image to GitHub Container Registry (on `main`/`master` and `v*` tags)

CodeQL and Dependabot also run. Scan results appear under **Security → Code scanning**.

## Deploy: Neon (database) + Render (API) + Vercel (frontend)

1. **Neon** – create a project, then copy the **direct** connection string
   (the host must *not* contain `-pooler`; migrations need a session lock).
   Add `?sslmode=require` if it isn't there. Tables are created on first start.
2. **Render** – New → **Blueprint** → this repo (uses `render.yaml`), or New → Web
   Service → Docker. Health check `/api/health`. Set `DATABASE_URL`, `GEMINI_API_KEY`,
   `FIREBASE_*` (service account base64-encoded), `ADMIN_EMAILS`, and
   `CORS_ORIGINS=https://<your-app>.vercel.app`.
3. **Vercel** – New Project → this repo (uses `vercel.json`, Vite). Set
   `VITE_API_URL=https://<your-api>.onrender.com`, then deploy.
4. **Firebase** → Authentication → Settings → Authorized domains → add the Vercel domain.
5. Put the final Vercel URL in Render's `CORS_ORIGINS` (comma-separate several; a
   `*` may stand for a subdomain fragment, e.g. `https://vitalis-*.vercel.app` for previews).

Render's free plan sleeps after ~15 min idle; the first request then takes ~1 minute.

## Deploy on a server

On any machine with Docker:

```bash
git clone <this repo> && cd <repo>
cp .env.example .env      # fill in, set a strong POSTGRES_PASSWORD
docker compose pull && docker compose up -d
```

To update after a new push: `docker compose pull && docker compose up -d`.

GHCR images are private by default: either make the package public (GitHub → Packages → Package settings), or run `docker login ghcr.io` on the server first.

## Develop

```bash
npm install
docker compose up -d db    # database only
npm run dev:api            # API on :3001
npm run dev                # frontend on :3000
npm run check              # lint + typecheck + tests
```
