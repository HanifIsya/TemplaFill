# Architecture Decision Records (ADR)

> Log of all significant technical decisions. Agents MUST NOT reverse a logged decision without explicit user approval.

---

## ADR Format

```markdown
### ADR-XXX: [Title]
- **Date**: YYYY-MM-DD
- **Status**: Accepted | Pending | Superseded by ADR-XXX | Rejected
- **Context**: Why this decision was needed
- **Decision**: What we decided
- **Alternatives Considered**: What else we looked at
- **Consequences**: What this means for the project
```

---

## Decisions

### ADR-001: Use Gemini API Free Plan as LLM Provider
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need an LLM for structured extraction and embeddings. Must be free for MVP development.
- **Decision**: Use Google Gemini API free plan (`gemini-2.0-flash` for generation, `text-embedding-004` for embeddings).
- **Alternatives Considered**:
  - OpenAI API — No free tier, per-token cost
  - Claude API — No free tier
  - Local LLM (Ollama) — Requires GPU, complex setup, lower quality for structured extraction
  - Groq — Free tier available but less stable, no native embeddings
- **Consequences**:
  - Rate limited to 15 RPM / 1,500 RPD — must implement queuing
  - Free tier data may be used by Google for model improvement — document in privacy policy
  - If scaling, may need to upgrade to paid tier or switch provider

---

### ADR-002: Use pgvector Instead of Dedicated Vector Database
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need vector similarity search for RAG retrieval. Options: Pinecone, Weaviate, Qdrant, ChromaDB, or pgvector.
- **Decision**: Use pgvector as PostgreSQL extension.
- **Alternatives Considered**:
  - Pinecone — Managed, scalable, but paid service adds cost and dependency
  - Weaviate / Qdrant — Self-hosted adds infra complexity
  - ChromaDB — Good for prototyping but not production-ready for our scale
- **Consequences**:
  - Single database for both relational and vector data — simpler ops
  - Performance sufficient for MVP (IVFFlat index)
  - If vector search becomes bottleneck at scale, migrate to dedicated service

---

### ADR-003: FastAPI Over Django for Backend
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need Python web framework for API backend.
- **Decision**: Use FastAPI.
- **Alternatives Considered**:
  - Django + DRF — Heavier, synchronous by default, more opinionated
  - Flask — Lightweight but no async, no auto-generated docs
- **Consequences**:
  - Native async support — important for I/O-bound LLM API calls
  - Auto-generated OpenAPI docs — easier for frontend integration
  - Less batteries-included than Django — need to set up auth, admin, etc. manually

---

### ADR-004: Next.js Over Vite for Frontend
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need React-based frontend framework.
- **Decision**: Use Next.js with App Router.
- **Alternatives Considered**:
  - Vite + React — Lighter, faster dev server, but no SSR
  - Remix — Good, but smaller ecosystem
  - Create React App — Deprecated
- **Consequences**:
  - SSR capability for landing page SEO
  - API routes for BFF pattern if needed
  - Larger bundle than Vite for SPA-only features — acceptable tradeoff

---

### ADR-005: Direct Gemini SDK Over LangChain/LlamaIndex
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need to orchestrate RAG pipeline (chunk, embed, retrieve, extract).
- **Decision**: Use `google-genai` SDK directly with custom pipeline code.
- **Alternatives Considered**:
  - LangChain — Popular but heavy abstraction, version churn, harder to debug
  - LlamaIndex — Good for RAG but another dependency with its own opinions
- **Consequences**:
  - Full control over pipeline behavior — easier to optimize and debug
  - More code to write initially — but more maintainable long-term
  - No lock-in to framework-specific patterns

---

### ADR-006: Multi-Format Template Support from Day 1
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: User requires .docx, .xlsx, and .pptx template support.
- **Decision**: Support all three formats in MVP.
- **Alternatives Considered**:
  - Start with .docx only, add others later — simpler but limits initial appeal
- **Consequences**:
  - Three separate template parsers needed (python-docx, openpyxl, python-pptx)
  - Three separate document generators needed
  - More testing surface area
  - Broader market appeal from day one

---

### ADR-007: Gemini API Free Tier Data Usage Acknowledgment
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Gemini free tier terms may allow Google to use API data for model improvement.
- **Decision**: Accept this for MVP. Document clearly in DATA_PRIVACY.md. Plan to upgrade to paid tier (with data processing agreement) before public launch with real user data.
- **Consequences**:
  - Development and testing with synthetic/sample data is safe
  - Real user documents should not be processed on free tier in production
  - Budget for paid tier when launching publicly

### ADR-008: Elimination of AI Design Tropes in Favor of Industrial Typography
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Standard AI designs frequently rely on low-contrast glassmorphism, purple-to-blue gradients, decorative emojis in section headers, and generic cards. User specifically mandated removing these tropes for high-trust professional utility.
- **Decision**: Adopt IBM Plex Sans + IBM Plex Mono typography, solid slate contrast surfaces (`#0f172a` / `#1e293b`), crisp single-pixel borders (`#334155`), and electric indigo focal action highlights without decorative gradients or icons spam.
- **Consequences**:
  - Uncompromising legibility for legal and corporate analysts.
  - High performance with minimal CSS footprint and instant paint times.
  - Clean distinction as a serious enterprise-grade developer/analyst tool.

---

### ADR-009: Joint Security and Performance Sign-Off (Task 5.1 & 5.2)
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Pre-deployment quality gate required for full-stack TemplaFill application across backend FastAPI and Next.js frontend.
- **Decision**: Sign off on both backend and frontend audits:
  - Backend: GZipMiddleware 1KB+, InMemoryRateLimiter, SecurityHeadersMiddleware (CSP, HSTS), magic byte validation, non-root Docker container.
  - Frontend: Zero-vulnerability bundle, static page pre-rendering, safe string interpolation, Vercel security headers.
- **Consequences**:
  - Safe for public staging and demonstration.
  - Full adherence to zero persistent storage and GDPR ephemeral data requirements.

---

### ADR-010: Free-Forever Stack — Vercel + Render Hobby + Supabase (2026-09-23)
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: User asked if Render Hobby free tier is viable forever and requested Vercel (frontend) + Render (backend) + Supabase (DB) as free-forever deployment, with handling for Render 15-min sleep / ~60s cold start. Need sustainable $0/mo without expiry vs Render Postgres 30-day expiry.
- **Decision**: Adopt Vercel Hobby (100 GB) + Render Hobby $0 (512 MB/0.1 CPU, 750h/mo, sleep 15m, wake ~60s, no CC) + Supabase Postgres 500 MB + pgvector (free forever, 50k MAU, 1 GB storage) + Upstash Redis 10k/day (or in-memory fallback). Single Render web service using `BackgroundTasks` (not separate Celery worker) to stay within 750h. Implement frontend cold-start UX: `frontend/src/components/BackendWakingBanner.tsx` + `frontend/src/lib/api.ts:22` `checkHealth()` with 7s timeout, `isWaking` detection for 502/503/timeout, `waitForBackend()` 5s×12 poll (60s), `frontend/src/app/page.tsx:100` polling + banner `Backend is waking up — Render Hobby sleeps after 15 min idle — Retrying 3/12` + `Retry now` + upload guard that throws `Backend is waking up…` instead of silent mock. Backend health `GET /api/health` lightweight (no DB) for fast wake detection. Documented in `DEPLOYMENT.md`, `ARCHITECTURE.md` infra diagram, `TECH_STACK.md` deployment row, `.env.example` Supabase pooling URL.
- **Alternatives Considered**:
  - Render Postgres free (1 GB/30-day expiry) — not free forever, data deleted after 30 days, unsuitable for retention
  - Full Supabase Edge Functions (Deno) — cannot run `PyMuPDF`/`pdfplumber` (need Python), would require JS pdf libs with 30-40% lower table accuracy, 10s/150 MB Edge limit
  - Railway/ Fly.io — also free but Render Hobby has simplest git-push deploy and no CC
- **Consequences**:
  - $0/mo indefinitely for MVP/prototype (1 web service ~720h/mo within 750h). Supabase DB free forever vs Render 30-day.
  - Cold start UX handled explicitly — no silent data loss, user sees waking state and can retry or use mock demo mode.
  - UptimeRobot 5-min `GET /api/health` ping optional to keep warm (12 req/hour < quota, 720 req/month).
  - If traffic grows beyond free 750h or 15-min sleep becomes UX issue, upgrade to Render Starter $7 (always-on) — single config change, no code.

---

### ADR-011: Migrate Primary Extraction Model to Gemini 3.7 Flash with 3.8 Fallback
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Google AI Studio accounts on current GA expose `Gemini 3.7 Flash` and `Gemini 3.8 Flash`. Prior configuration targeting `gemini-2.0-flash` and `gemini-1.5-flash` caused 404 NotFound errors on extraction requests, leading to rate counter spikes and extraction failures.
- **Decision**: 
  1. Set `gemini-3.7-flash` as the default model across `backend/app/core/config.py`, `render.yaml`, and `.env.example`.
  2. Implement candidate model progression in `extractor.py`: try `gemini-3.7-flash`, fall back to `gemini-3.8-flash` on 404, and auto-sanitize legacy model identifiers.
  3. Fall back to heuristic extraction with transparent UI notice banner (Amber alert) and toast message when AI API quota/limits are reached instead of silently redirecting.
- **Consequences**:
  - Eliminates 404 NotFound errors from Google AI Studio.
  - Extraction requests align with active models in the user's Google AI Studio project.
  - Transparent user experience when API limits or network errors occur.

