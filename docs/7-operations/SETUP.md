# Development Setup

> Step-by-step guide to set up the TemplaFill development environment from scratch.

---

## Prerequisites

| Software | Version | Installation |
|----------|---------|-------------|
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11+ | [python.org](https://python.org/) |
| **PostgreSQL** | 16+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Redis** | 7+ | [redis.io](https://redis.io/download/) or via Docker |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Optional (Recommended)
| Software | Purpose |
|----------|---------|
| **Docker** | Run PostgreSQL + Redis without local install |
| **VS Code** | IDE with recommended extensions |

---

## Quick Start

### 1. Clone Repository
```bash
git clone <repo-url> TemplaFill
cd TemplaFill
```

### 2. Environment Variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values (see Environment Variables section below)
```

### 3. Backend Setup
```bash
# Create virtual environment (repo uses .venv at root in README; backend/venv also supported)
cd backend
python -m venv .venv
# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
# Activate (Windows CMD / Linux/Mac)
# .\.venv\Scripts\activate  /  source .venv/bin/activate

# Install dependencies (pinned, includes google-genai, PyMuPDF, pdfplumber, python-docx, openpyxl, python-pptx)
pip install -r requirements.txt

# Optional: run database migrations (only if DATABASE_URL points to Postgres; InMemory works without DB for MVP)
python -m alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Docs open at http://localhost:8000/docs when DEBUG=true (auto-disabled in production, main.py:24)
```

### 4. Frontend Setup
```bash
# Install dependencies (Next 16.3.6, React 19.2, Tailwind 4)
cd frontend
npm install

# Configure API URL (defaults to http://localhost:8000/api if not set)
# PowerShell: Set-Content -Path .env.local -Value "NEXT_PUBLIC_API_URL=http://localhost:8000/api"
# Bash:      echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Start development server
npm run dev
# Build + lint check (verifies CSP headers in next.config.ts)
npm run build && npm run lint
npm test   # 13/13 (models + e2e, 106ms)
```

### 5. Database Setup (with Docker — recommended for prod-like, optional for MVP)

> **MVP note**: All 167 backend tests + `eval/run_eval.py` run on `InMemoryVectorStore` with no Postgres/Redis required. Docker is only needed if you want persistent `pgvector` or to reproduce production.

```bash
# Start PostgreSQL (pgvector:pg16) + Redis + backend (with hot-reload mount)
docker compose up -d
docker compose logs -f

# Or without Docker:
# 1. Install PostgreSQL 16+
# 2. Create database: createdb templafill
# 3. Enable pgvector: CREATE EXTENSION IF NOT EXISTS vector;
# 4. Install and start Redis (optional — InMemoryRateLimiter works without it)

# Supabase alternative (free-forever prod, per DEPLOYMENT.md):
# Use Connection URI: postgresql+asyncpg://postgres.[project]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 6. Verify Setup
```bash
# Backend health check — should return {ai_configured, model: gemini-3.6-flash, status: healthy} without DB
curl http://localhost:8000/api/health | jq
curl "http://localhost:8000/api/health" -H "X-Request-ID: test123"

# Frontend — banner shows API LIVE (green) or Backend is waking up (amber) if Render sleeps
# Open http://localhost:3000 in browser

# Quick smoke for pipeline (requires no GEMINI_API_KEY — uses fallback)
curl -F "source_file=@frontend/public/samples/sample_contract.pdf" \
     -F "template_file=@frontend/public/samples/sample_template.docx" \
     http://localhost:8000/api/upload
# → {job_id, status: queued} ; poll GET /api/jobs/{id} → GET /api/jobs/{id}/results
```

---

## Environment Variables

### `.env.example`
```env
# ============================================================
# TemplaFill Environment Variables
# Copy this file to .env and fill in your values
# ============================================================

# ----- Application -----
APP_ENV=development                    # development | staging | production
APP_NAME=TemplaFill
APP_VERSION=0.1.0
DEBUG=true

# ----- Backend Server -----
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000     # Comma-separated allowed origins

# ----- Frontend -----
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=TemplaFill

# ----- Database -----
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/templafill
DATABASE_ECHO=false                    # Set true to log SQL queries

# ----- Redis -----
REDIS_URL=redis://localhost:6379/0

# ----- Gemini API -----
GEMINI_API_KEY=               # empty = heuristic fallback (167 tests still PASS); set to enable live Gemini 3.6 Flash
GEMINI_MODEL=gemini-3.6-flash             # candidates: gemini-3.6-flash → gemini-3.5-flash → gemini-3.5-flash-lite → gemini-3.7/3.8 (auto-blacklist on 404)
GEMINI_EMBEDDING_MODEL=gemini-embedding-001  # sanitized from legacy text-embedding-004 at embedder.py:107, 768 dims, batch 100

# ----- File Storage -----
UPLOAD_DIR=./uploads                   # Local upload directory
MAX_SOURCE_FILE_SIZE_MB=50             # Max source PDF size
MAX_TEMPLATE_FILE_SIZE_MB=20           # Max template file size
MAX_SOURCE_PAGES=500                   # Max PDF pages
FILE_RETENTION_HOURS=24                # Auto-delete after this many hours

# ----- Security -----
SECRET_KEY=change_this_to_a_random_string_in_production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ----- Rate Limiting -----
RATE_LIMIT_UPLOAD=10/hour              # Upload endpoint limit
RATE_LIMIT_API_READ=60/minute          # Read endpoint limit
RATE_LIMIT_API_WRITE=30/minute         # Write endpoint limit

# ----- RAG Pipeline -----
CHUNK_SIZE=800                         # Tokens per chunk
CHUNK_OVERLAP=100                      # Overlap between chunks
RAG_TOP_K=5                            # Number of chunks to retrieve per field
EMBEDDING_BATCH_SIZE=100               # Chunks per embedding API call
```

---

## Docker Compose (Development)

### `docker-compose.yml` (actual `e:\TemplaFill\docker-compose.yml:1`, includes healthchecks + backend service)

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: templafill
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck: { test: ["CMD-SHELL","pg_isready -U postgres"], interval: 5s }

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck: { test: ["CMD","redis-cli","ping"], interval: 5s }

  backend:
    build: { context: ./backend, dockerfile: Dockerfile }
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/templafill
      REDIS_URL: redis://redis:6379/0
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
      CORS_ORIGINS: http://localhost:3000
    env_file: [.env]
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
    volumes: ["./backend:/app", "backend_uploads:/app/uploads"]  # hot reload in dev
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

volumes: { pgdata:, redisdata:, backend_uploads: }
```

```bash
# Start services (Postgres + Redis + backend with healthchecks)
docker compose up -d
docker compose logs -f

# Stop services
docker compose down

# Reset database (wipes pgdata + redisdata)
docker compose down -v && docker compose up -d

# Single-service alternative (skip Postgres/Redis, InMemory only)
docker build -t templafill-backend ./backend && docker run -p 8000:8000 --env-file .env templafill-backend
```

---

## IDE Setup (Recommended)

### VS Code Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-python.black-formatter"
  ]
}
```

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "python.defaultInterpreterPath": "./backend/venv/Scripts/python",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Common Issues

| Issue | Solution |
|-------|---------|
| `pgvector` extension not found | Use `pgvector/pgvector:pg16` Docker image, or Supabase `SQL Editor → CREATE EXTENSION IF NOT EXISTS vector;` |
| Redis connection refused | `docker compose up redis -d` or ignore — `InMemoryRateLimiter` works without Redis (MVP) |
| Gemini API key missing → heuristic fallback | Intentional if `GEMINI_API_KEY` empty — all 167 tests still PASS. Banner in Review shows `[Fallback]`. Set key to enable live `gemini-3.6-flash`.|
| Gemini 404 `NotFound` / model unavailable | Auto-sanitized in `extractor.py:199` (legacy→3.6) + `_BLACKLISTED_MODELS` advances to next candidate (`3.6→3.5→3.7/3.8`); verify `render.yaml` `GEMINI_MODEL=gemini-3.6-flash` |
| 429 `RESOURCE_EXHAUSTED` / 503 `UNAVAILABLE` | Expected on free tier bursts; batch path reduces calls >90% + 1.2s pacing + 2.5s backoff (`extractor.py:337`). Daily quota `20/day` blacklists without sleep. |
| `npm run build` fails with CSP | Verify `next.config.ts:24` `headers()` + `vercel.json:33` CSP syntax (no stray commas in `connect-src`). |
| Port 3000/8000 already in use | Kill existing process or change port: `npm run dev -- -p 3001` / `uvicorn app.main:app --port 8001` |
| Python venv activation fails (Windows) | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` then `.\.venv\Scripts\Activate.ps1` |
| Minimal sample PDFs fail `missing %PDF` | Use real binaries in `frontend/public/samples/` (1.1KB PDF/36.7KB DOCX); dummy string files were replaced (CONTEXT 2026-09-23). |
| `GET /api/health` timeout on Render | Hobby sleeps 15min→ wake ~60s; frontend polls `checkHealth(7s)` + `waitForBackend(5s×12)` and shows amber banner — wait or `Retry now`. |
