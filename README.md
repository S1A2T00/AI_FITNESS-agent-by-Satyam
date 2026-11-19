
# Vitalis AI – Authentication & Authorization (Firebase)

- **Authentication:** Firebase Auth (email/password with verification + password reset, and Google sign-in). Every page except `/login` requires a signed-in user.
- **API protection:** the browser sends the Firebase ID token as `Authorization: Bearer <token>`; `server/auth.mjs` verifies it with `firebase-admin` on every `/api/*` call (except `/api/health` and `/api/auth-config`). Revoked/disabled users are rejected.
- **Authorization:** roles (`user`, `admin`) are stored as a Firebase **custom claim**. Admins see `/admin`, list users and change roles; the server enforces this on `/api/admin/*`.
- **Per-user data:** saved analysis history is keyed by the user's uid.

## Setup
1. Firebase console → create a project → **Authentication → Sign-in method**: enable *Email/Password* and *Google*.
2. **Authentication → Settings → Authorized domains**: add your production domain (`localhost` is there by default).
3. **Project settings → General → Your apps** → add a Web app → copy `apiKey`, `authDomain`, `projectId`, `appId`.
4. **Project settings → Service accounts → Generate new private key** (keep it secret).
5. Copy `.env.example` to `.env.local` and fill it in. Put your email in `ADMIN_EMAILS` to become the first admin, or run:
   `node --env-file=.env.local scripts/set-role.mjs you@example.com admin`

## Database (PostgreSQL)
The server stores users, analyses and AI-coach chat in PostgreSQL (`server/db.mjs`). Tables are created automatically on startup (versioned migrations in `schema_migrations`), so there is no manual SQL step. Every query is scoped to the signed-in user's Firebase uid.

| Table | Contents |
|---|---|
| `users` | uid, email, name, role, last seen |
| `analyses` | each AI analysis (summary, metrics, recommendations); images are **not** stored |
| `coach_messages` | AI-coach conversation, used as context for the next reply |

`GET /api/health` returns 503 when the database is unreachable, so hosting platforms can use it as a health check.

## Run locally
```bash
cp .env.example .env.local          # fill in Gemini + Firebase values
docker compose up --build           # app + Postgres → http://localhost:3001
```
For hot-reload development instead: `docker compose up -d db`, then `npm run dev:api` and `npm run dev` (http://localhost:3000). If port 5432 is taken, set `POSTGRES_HOST_PORT=5433` and use that port in `DATABASE_URL`.

## CI/CD pipeline (GitHub Actions + Docker)

```
PR / push ─► Lint & typecheck ─┐
             Tests + Postgres ─┼─► Build image ─► Smoke test ─► Trivy image scan ─► SBOM
             Security scan ────┘   (npm audit, Trivy fs: deps + secrets + Dockerfile)

push to main ─► Publish to GHCR (cosign-signed, SBOM + provenance) ─► Deploy staging
tag vX.Y.Z  ─► Publish ─► GitHub Release ─► Deploy production (manual approval)
```

| File | Purpose |
|---|---|
| `.github/workflows/ci-cd.yml` | Main pipeline above |
| `.github/workflows/deploy.yml` | SSH deploy to a Docker host; also runnable by hand (Actions → Deploy) to redeploy any image or **roll back** |
| `.github/workflows/codeql.yml` | CodeQL static analysis on PRs, pushes and weekly |
| `.github/dependabot.yml` | Weekly updates for npm, the Docker base image and GitHub Actions |
| `deploy/docker-compose.prod.yml` | Production stack: app + Postgres (+ Caddy for HTTPS), read-only container, dropped capabilities, log rotation, memory limits |
| `deploy/deploy.sh` | Pulls the image, waits for the container HEALTHCHECK, **rolls back automatically** if it fails |

**Quality gates (any failure blocks the merge/deploy):** ESLint with zero warnings, TypeScript, 20 tests against a real PostgreSQL, `npm audit` (runtime high+, all critical), **Trivy** filesystem scan (dependencies, leaked secrets, Dockerfile misconfig), image must run as non-root and turn healthy, **Trivy** image scan (fixable HIGH/CRITICAL). Trivy and CodeQL results appear in the repo's **Security → Code scanning** tab. Trivy runs from the official image pinned by digest.

Local equivalent: `npm run check` (lint + typecheck + tests; tests that need Postgres skip without `DATABASE_URL`).

### One-time setup to enable deploys
1. **Server:** any Linux VM with Docker + Compose plugin. Create a deploy user in the `docker` group, then:
   ```bash
   sudo mkdir -p /opt/vitalis && sudo chown deploy: /opt/vitalis
   # copy deploy/.env.production.example to /opt/vitalis/.env, fill it in, chmod 600
   ```
2. **GitHub → Settings → Environments:** create `staging` and `production` (add *Required reviewers* on `production`). On each:
   - Variables: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` (default `/opt/vitalis`), `APP_URL` (e.g. `https://vitalis.example.com`)
   - Secrets: `DEPLOY_SSH_KEY` (private key of the deploy user), `DEPLOY_KNOWN_HOSTS` (output of `ssh-keyscan <host>`)
3. **GitHub → Settings → Variables (repository):** `ENABLE_STAGING_DEPLOY=true`, `ENABLE_PRODUCTION_DEPLOY=true` when ready. Until then the pipeline still builds, scans and publishes.
4. **Branch protection** on the default branch: require the *Lint*, *Tests*, *Security scan*, *Build* and *CodeQL* checks.
5. Optional: `DOCKERHUB_USERNAME` + `DOCKERHUB_TOKEN` secrets also mirror the image to Docker Hub.

Release to production: `git tag v1.0.0 && git push origin v1.0.0`, then approve the deployment in the Actions run.

## Deploy without CI (manual)
The app is one Docker image (`Dockerfile`) plus a PostgreSQL database.

**Option A – one server/VPS:** copy the repo, create `.env.local`, set a strong `POSTGRES_PASSWORD`, run `docker compose up -d --build`, and put HTTPS (Caddy/Nginx) in front of port 3001. Data persists in the `pgdata` volume. Remove the `db` port mapping on a public server.

**Option B – managed (Render, Railway, Fly.io, Cloud Run, …):**
1. Create a PostgreSQL database (Neon, Supabase, or the platform's own) and copy its connection URL.
2. Create a web service from this repo using the `Dockerfile`; port `3001`, health check path `/api/health`.
3. Set environment variables: `DATABASE_URL` (add `?sslmode=require` or `DATABASE_SSL=true` for external providers), `GEMINI_API_KEY`, `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_SERVICE_ACCOUNT` (the service-account JSON, base64-encoded: `base64 -w0 key.json`), `ADMIN_EMAILS`.
4. In Firebase → Authentication → Settings → **Authorized domains**, add your deployed domain, or Google sign-in will fail.
