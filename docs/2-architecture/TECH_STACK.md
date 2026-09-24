# Technology Stack

> Rationale for every technology choice. Changes to this stack MUST be logged in [DECISIONS.md](../7-operations/DECISIONS.md).

---

## Stack Overview

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Frontend** | Next.js (App Router) | 16.3.6 (`frontend/package.json`) | App Router + `next/font` (IBM Plex), static prerender, `next.config.ts` security headers; SSR for landing |
| **Frontend Language** | TypeScript | 5.x | Type safety, IDE support, fewer runtime bugs |
| **Styling** | Tailwind CSS | 4.x (`@tailwindcss/postcss`) | Utility-first, design tokens in `globals.css` |
| **Backend** | FastAPI | 0.110+ | Async Python, auto-generated OpenAPI docs, great for ML pipelines, `BackgroundTasks` |
| **Backend Language** | Python | 3.11+ (`python:3.11-slim` in Dockerfile) | Best ML/AI ecosystem, rich PDF/document libs |
| **Database** | PostgreSQL | 16+ (+ `pgvector` via `pgvector/pgvector:pg16`) | Reliable, extensible, `vector` extension for `VECTOR(768)` |
| **Vector Store** | pgvector (PostgreSQL extension) | 0.7+ *or* `InMemoryVectorStore` default for dev | `VECTOR(768)` + `ivfflat vector_cosine_ops`; `InMemory` avoids Postgres for 167 offline tests |
| **ORM** | SQLAlchemy | 2.0+ (`sqlalchemy[asyncio]` + `asyncpg`) | Async support, mature, flexible; `alembic` migrations |
| **LLM** | Gemini API (free plan) | `gemini-3.6-flash` (primary, candidates `3.5/3.5-lite/3.7/3.8` via `extractor.py:220`) | `GenerateContentConfig(response_mime_type="application/json")`, batch single-prompt, 404 blacklist + 1.2s pacing; free-tier 15 RPM/1M TPM/20–1500 RPD |
| **Embeddings** | Gemini Embedding API | `gemini-embedding-001` (sanitized from legacy `text-embedding-004` at `embedder.py:107`) | 768 dims, batch 100, throttled 4s; `_fake_embedding` offline for 167 tests |
| **Job Queue** | FastAPI BackgroundTasks (current) / Celery + Redis (scale) | `celery 5.x` optional | `manager.py:116` `background_tasks.add_task(process_job)` stays within Render Hobby 750h (no separate worker); switch to Celery when traffic > free tier |
| **File Storage** | Local FS (dev) / Supabase Storage 1 GB free (prod) | — | MVP local FS (24h auto-delete), prod Supabase Storage unified with DB per free-forever choice |
| **Auth** | NextAuth.js (frontend) + JWT (API) | 5.x | Simple auth, multiple providers |
| **Deployment (FE)** | Vercel Hobby | — | Free 100 GB/mo, auto-deploy from Git, `vercel.json` headers, global edge |
| **Deployment (BE)** | **Render Hobby `$0` + Supabase Postgres** | — | **Free-forever choice per 2026-09-23**: Render Hobby 512 MB/0.1 CPU 750h (sleep 15m wake 60s) + Supabase 500 MB pgvector free forever (no 30-day expiry) — see `DEPLOYMENT.md` for booting banner handling via `BackendWakingBanner.tsx` |
| **CI/CD** | GitHub Actions | — | Free for public repos, `ci.yml` + `deploy.yml` (Render deploy) |

---

## Frontend Stack Detail

### Core
| Package | Purpose |
|---------|---------|
| `next` | React framework with App Router |
| `react` / `react-dom` | UI library |
| `typescript` | Type safety |

### Styling & UI
| Package | Purpose | Notes |
|---------|---------|-------|
| `tailwindcss` + `@tailwindcss/postcss` | Utility-first CSS | 4.x in `frontend/package.json` |
| `lucide-react` | Icon library | Used for step icons, badges |
| `clsx` + `tailwind-merge` | Conditional class merging | — |
| *(planned, not yet installed)* `@radix-ui/*`, `framer-motion` | Headless primitives / motion | Listed in early spec but deferred; custom modals + Tailwind handle current needs |

### State & Data
| Package | Purpose | Actual |
|---------|---------|--------|
| `@tanstack/react-query` / `zustand` / `zod` | Server/client state + schema | Planned in early MVP spec; current MVP uses `useState` + `localStorage` (`templafill_auth_user`, `templafill_recent_sessions`) + manual polling (`api.getJobProgress`) — see `frontend/src/lib/api.ts:192` |

### File Handling
| Package | Purpose | Actual |
|---------|---------|--------|
| `react-dropzone` / `react-pdf` | Drag & drop + PDF preview | Planned; actual is native HTML5 drag handlers in `DualDropzone.tsx` + `%PDF` magic check — no extra deps yet |

---

## Backend Stack Detail

### Core
| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `pydantic` | Data validation and serialization |
| `python-multipart` | File upload handling |

### PDF Processing
| Package | Purpose |
|---------|---------|
| `PyMuPDF` (fitz) | Fast PDF text extraction with position data |
| `pdfplumber` | Table extraction, layout analysis |

### Template Processing
| Package | Purpose |
|---------|---------|
| `python-docx` | .docx reading, writing, placeholder replacement |
| `openpyxl` | .xlsx reading, writing, cell manipulation |
| `python-pptx` | .pptx reading, writing, text frame manipulation |

### RAG Pipeline
| Package | Purpose |
|---------|---------|
| `google-genai` | Official Gemini SDK — LLM calls + embeddings |
| `pgvector` | PostgreSQL vector similarity search |
| `sqlalchemy[asyncio]` | Async database access |
| `asyncpg` | Async PostgreSQL driver |

### Task Processing
| Package | Purpose |
|---------|---------|
| `celery` | Distributed task queue |
| `redis` | Message broker for Celery |

### Testing
| Package | Purpose |
|---------|---------|
| `pytest` | Test framework |
| `pytest-asyncio` | Async test support |
| `httpx` | Async HTTP client for API testing |
| `pytest-cov` | Coverage reporting |

---

## Gemini API Usage Plan

### Free Tier Limits (as of 2026-09-24, Google AI Studio console)

| Resource | Limit | Observed |
|----------|-------|----------|
| Requests per minute (RPM) | 15 | Enforced by embedder 4s `MIN_INTERVAL_S` + extractor 1.2s `_MIN_CALL_INTERVAL` |
| Tokens per minute (TPM) | 1,000,000 | — |
| Requests per day (RPD) | 1,500 (some projects `20/day` on newer free tier) | `quota limit: 20 / RESOURCE_EXHAUSTED per day` now blacklists + advances (`extractor.py:332`) |
| Models available | `gemini-3.6-flash` (primary) + fallbacks | Legacy `2.0/1.5/2.5` auto-sanitized to `3.6` (`extractor.py:199`) |

### Usage Strategy (actual `backend/app/services/generation/extractor.py:426`)

| Operation | Model | Calls per document | Notes |
|-----------|-------|-------------------|-------|
| Generate embeddings | `gemini-embedding-001` (sanitized from `text-embedding-004`) | 1–5 calls (batched, 100 chunks each, 4s throttle) | Fake fallback if key missing; offline-safe for CI |
| **Batch extraction (current)** | `gemini-3.6-flash` → `3.5-flash` → `3.5-flash-lite` → `3.7` → `3.8` | **1 call per document (all fields in one JSON)** | ADR-013: consolidates deduped chunks ≤10 + all placeholders → `{"extractions": [...]}`; reduces 429 by >90% |
| Legacy per-field (fallback `re_extract` only) | same candidates | 1 call per re-extraction | `PATCH /jobs/{id}/fields/{id}` with `hint` |
| Re-extract on user request | `gemini-3.6-flash` candidates | 1 call per hint | 5/min per IP (`security.py:118` `re_extract`) |

### Rate Limiting Strategy (implemented)

- Embedder: sliding-window check `_last_call_ts` + `asyncio.Lock` (`embedder.py:123`) — 4s between live calls
- Extractor: `_throttle_call` 1.2s + per-candidate `2.5s×attempt` exponential backoff (`extractor.py:236`); 404 → immediate blacklist `*_BLACKLISTED_MODELS*` + advance (`extractor.py:325`); daily quota `20/day` → blacklist + advance without sleep (`extractor.py:332`)
- HTTP layer: `InMemoryRateLimiter` 10/hr upload / 30/min write / 5/min re_extract (`security.py:98`); `testclient` exempt so CI 167 tests never 429
- High traffic: single `BackgroundTasks` worker keeps Hobby 750h; queue semantics via `JobStatus` (`queued→processing→extracting→mapping→completed`) + 18% progress sweep over batch fields (`manager.py:261`)

---

## Development Environment

### Required Software
| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS | Frontend runtime |
| Python | 3.11+ | Backend runtime |
| PostgreSQL | 16+ | Database (with pgvector extension) |
| Redis | 7+ | Celery message broker |
| Git | Latest | Version control |

### Recommended IDE Setup
| Tool | Extensions |
|------|-----------|
| VS Code / Cursor | Python, Pylance, Prettier, ESLint, Tailwind CSS IntelliSense |
| Antigravity IDE | Built-in AI assistance |

---

## Why NOT These Alternatives?

| Rejected Option | Reason |
|----------------|--------|
| LangChain / LlamaIndex | Too much abstraction for our specific pipeline; raw Gemini SDK + custom code gives more control and less dependency bloat |
| Pinecone / Weaviate | Separate vector DB service adds complexity and cost; pgvector is built into PostgreSQL, zero additional infra |
| OpenAI API | No free tier; Gemini free plan is sufficient for MVP |
| Django | FastAPI is lighter, async-native, better for API-first architecture |
| MongoDB | PostgreSQL + pgvector handles both relational data AND vectors in one DB |
| Supabase (full backend) | Edge Functions Deno cannot run PyMuPDF/pdfplumber (need Python) — keep FastAPI for pipeline, use Supabase only for Postgres+pgvector/Auth/Storage (hybrid) |
| tRPC | Adds coupling between frontend/backend; REST is simpler for multi-team (multi-agent) development |
