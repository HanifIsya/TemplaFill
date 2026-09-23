# Deployment

> How to deploy TemplaFill to production and staging environments.

---

## Architecture Overview

```mermaid
graph LR
    subgraph Production
        VERCEL["Vercel (Frontend)"]
        RAILWAY["Railway / Render (Backend)"]
        SUPABASE["Supabase PostgreSQL + pgvector"]
        UPSTASH["Upstash Redis"]
        R2["Cloudflare R2 (File Storage)"]
    end

    USER([User]) --> VERCEL
    VERCEL -->|API Proxy| RAILWAY
    RAILWAY --> SUPABASE
    RAILWAY --> UPSTASH
    RAILWAY --> R2
    RAILWAY -->|API| GEMINI[Gemini API]
```

---

## Hosting Choices

### Free-Tier Friendly (MVP) — Current Choice: Vercel + Render Hobby + Supabase (Free Forever)

> **User-confirmed 2026-09-23**: Free plan is sustainable indefinitely. Stack is Vercel (frontend), Render Hobby `$0` (backend, 750h/mo, no CC required) + Supabase Postgres 500 MB + pgvector (free forever, not 30-day expiry like Render Postgres) + Upstash Redis. This is the **recommended free-forever deployment** for TemplaFill.

| Component | Provider | Free Tier Limit | Notes |
|-----------|----------|----------------|-------|
| Frontend | **Vercel** | 100GB bandwidth/month, auto-deploy from Git | Hobby, global edge, `vercel.json` headers |
| Backend | **Render Hobby** | 512 MB RAM, 0.1 CPU, **750 hours/month**, **sleeps after 15 min idle**, **cold start ~60s** | `backend/Dockerfile`, `HEALTHCHECK /api/health`, no CC required, `render.com` 2026 |
| Database | **Supabase** | 500 MB, **pgvector included**, 50k MAU, 1 GB storage — **free forever** | Prefer over Render Postgres (1 GB/30-day expiry) for retention, `CREATE EXTENSION vector` |
| Redis | **Upstash** | 10,000 commands/day | Or in-memory fallback for MVP (no Redis required for hobby) |
| File Storage | **Local FS (hobby) / Supabase Storage** | Supabase 1 GB free — prefer over R2 for unified Supabase | `uploads/` gitignored, 24h auto-delete per `SECURITY.md` |
| Domain | **Cloudflare** | Free DNS, SSL |  |

**Render Hobby Cold Start — Booting Mode:**
- Free web services **sleep after 15 min inactivity** and need **~60s to wake** on next `POST /api/upload` or `GET /api/health` (502/503 or timeout). Frontend handles this via `frontend/src/components/BackendWakingBanner.tsx:1` + `frontend/src/lib/api.ts:22` `checkHealth()`/`waitForBackend()` (7s probe, 5s poll, 12×60s) + `frontend/src/app/page.tsx:100` polling + banner `Backend is waking up — Render Hobby sleeps… Retrying 1/12`.
- UX: Banner at top shows `Checking backend` → `Backend is waking up (Retrying 3/12) — your upload will be enabled once live` with `Retry now` button; upload button throws `Backend is waking up (Render Hobby cold start ~60s)` instead of silent mock fallback, so user does not lose data. Health `GET /api/health` is lightweight (no DB) for fast wake detection.
- **Free-forever viable?** Yes — Hobby `$0` with 750h covers 1 service always-on (~720h/mo). Need 1 web service only (no separate worker for MVP — `BackgroundTasks` in FastAPI, not Celery). Keep 1 service to stay within free quota. No credit card, no expiry (unlike Render Postgres). Supabase DB is free forever, so stack is sustainable indefinitely.

### Scaling Up (Post-MVP)

| Component | Provider | Pricing |
|-----------|----------|---------|
| Frontend | Vercel Pro | $20/month |
| Backend | Railway | $5/month base + usage |
| Database | Supabase Pro | $25/month |
| Redis | Upstash Pro | $10/month |
| File Storage | R2 | $0.015/GB/month |

---

## Deployment Steps

### Frontend (Vercel)

```bash
# 1. Connect repo to Vercel
#    Go to vercel.com → New Project → Import Git Repository

# 2. Set environment variables in Vercel dashboard:
#    NEXT_PUBLIC_API_URL=https://api.templafill.com/api

# 3. Configure build settings:
#    Root Directory: frontend
#    Build Command: npm run build
#    Output Directory: .next

# 4. Deploy
#    Automatic on push to `main` branch
```

### Backend (Render)

```bash
# 1. Create Web Service on render.com
#    Connect Git repository

# 2. Build settings:
#    Root Directory: backend
#    Build Command: pip install -r requirements.txt
#    Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT

# 3. Set environment variables:
#    DATABASE_URL, REDIS_URL, GEMINI_API_KEY, SECRET_KEY, etc.

# 4. Add Celery worker:
#    Create separate Background Worker service
#    Start Command: celery -A app.worker worker --loglevel=info
```

### Database (Supabase)

```bash
# 1. Create project on supabase.com
# 2. Enable pgvector extension:
#    SQL Editor → run: CREATE EXTENSION IF NOT EXISTS vector;
# 3. Run migrations:
#    alembic upgrade head
# 4. Copy connection string to backend env vars
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Backend tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest -v
      - name: Frontend tests
        run: |
          cd frontend
          npm ci
          npm test -- --watchAll=false

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}

  # Frontend deploys automatically via Vercel Git integration
```

---

## Environment Management

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| Development | `develop` | localhost:3000 / localhost:8000 | Local development |
| Staging | `develop` (auto-deploy) | staging.templafill.com | Pre-production testing |
| Production | `main` | templafill.com | Live users |

---

## Monitoring & Logging

### Application Monitoring
| Tool | Purpose | Free Tier |
|------|---------|-----------|
| **Sentry** | Error tracking | 5K events/month |
| **Better Stack (Logtail)** | Log aggregation | 1GB/month |
| **UptimeRobot** | Uptime monitoring | 50 monitors |

### Health Checks & Cold-Start Handling
- Backend: `GET /api/health` — lightweight, returns `{status, version, timestamp}` without DB (for fast Render wake detection). `HEAD` also supported via `api.ts:checkHealth`.
- Frontend: `BackendWakingBanner` polls `GET /api/health` every 5s for up to 60s when `502/503` or timeout (Render waking). See `frontend/src/app/page.tsx:100` + `frontend/src/lib/api.ts:22`.
- Cron: UptimeRobot check every 5 min via `GET /api/health` also keeps Render warm (optional free keep-alive, 12 req/hour < 750h quota).
- Alert: email if downtime >5 min outside expected sleep window.

---

## Rollback Procedure

```bash
# 1. Identify the last working deployment
#    Check Vercel/Render deployment history

# 2. Rollback frontend (Vercel)
#    Vercel Dashboard → Deployments → find last working → Promote to Production

# 3. Rollback backend (Render)
#    Render Dashboard → Events → find last working deploy → Manual Deploy from that commit

# 4. Rollback database (if migration issues)
#    alembic downgrade -1

# 5. Post-mortem
#    Document what went wrong in DECISIONS.md
```
