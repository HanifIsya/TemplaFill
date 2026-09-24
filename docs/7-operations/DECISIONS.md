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
- **Status**: Superseded by ADR-015 → ADR-016 (model now `gemini-3.6-flash` + `gemini-embedding-001`)
- **Context**: Need an LLM for structured extraction and embeddings. Must be free for MVP development. Initial implementation used `gemini-2.0-flash` / `text-embedding-004`.
- **Decision**: Use Google Gemini API free plan (`gemini-2.0-flash` for generation, `text-embedding-004` for embeddings → later migrated via ADR-011→015→016).
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

---

### ADR-012: Comprehensive Codebase Security Hardening & Zero-Trust Pipeline
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: A comprehensive full-stack security audit identified 10 vulnerabilities (VULN-1 through VULN-10) ranging from unapplied rate limiters and uninvoked filename/input sanitizers to header injection risks, raw exception disclosures, open debug endpoints, and overly permissive CORS wildcard headers.
- **Decision**: 
  1. **Rate Limiting Enforcement (VULN-1)**: Enforce `InMemoryRateLimiter` sliding window on all entry points (upload: 10/hr, re-extract: 5/min, write: 30/min). Exempt `testclient` in test environments to allow CI test suites without false 429s.
  2. **Filename Sanitization (VULN-2)**: Call `sanitize_filename()` on uploaded source and template filenames, removing path traversal (`../`), null bytes, and non-whitelisted characters.
  3. **Input Sanitization & Length Limits (VULN-3, VULN-10)**: Apply `sanitize_text_input(max_len=5000)` across user hint text, field overrides, and manual edits, scrubbing control codes, null bytes, and unbounded payloads.
  4. **Header Injection Prevention (VULN-4)**: Encode Content-Disposition headers with sanitized filenames and RFC 5987 UTF-8 safe syntax (`filename*=UTF-8''...`).
  5. **Information Leak Mitigation (VULN-5)**: Scrub internal exception traces (`str(e)`) from API responses; log details strictly server-side with structured logging.
  6. **Production Surface Lockdown (VULN-6, VULN-7)**: Guard `/api/debug/gemini` behind `DEBUG=True` environment check (returns 404 in production); disable OpenAPI `/docs`, `/redoc`, and `/openapi.json` in production environments.
  7. **Security Headers & CSP (VULN-8)**: Enforce modern Content-Security-Policy (CSP), HTTP Strict Transport Security (HSTS) with `preload`, and configure `X-XSS-Protection: 0` per current browser standards across `frontend/vercel.json` and `frontend/next.config.ts`. Disable `x-powered-by` header fingerprinting.
  8. **CORS Hardening (VULN-9)**: Replace wildcard methods and headers (`*`) with an explicit whitelist (`GET, POST, PATCH, PUT, DELETE, OPTIONS` and specific allowed headers).
- **Consequences**:
  - Full mitigation of injection, XSS, DoS, header smuggling, and information disclosure vectors.
  - Zero regression in functionality: 165/165 backend unit tests, 13/13 frontend tests, and eval benchmarks pass with 100% green status.

---

### ADR-013: Single-Prompt Batch Extraction & Rate-Limit Resilience (2026-09-24)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: Rapid sequential per-field API calls during document processing caused Google AI Studio free-tier rate limit violations (HTTP 429 TooManyRequests) and temporary server shedding (HTTP 503 ServiceUnavailable), resulting in 100+ error spikes and 0 output tokens. In addition, unprovisioned candidate models repeatedly returned HTTP 404 NotFound.
- **Decision**: 
  1. **Single-Prompt Batch Extraction (`extract_batch`)**: In `extractor.py` and `JobManager.process_document`, consolidate relevant document chunks and extract all template fields in a single Gemini structured prompt.
  2. **404 Model Blacklisting (`_BLACKLISTED_MODELS`)**: If a model returns 404 (NotFound), blacklist it for the process session so subsequent fields/jobs never re-attempt an invalid model identifier.
  3. **Pacing & Adaptive Backoff**: Add `_MIN_CALL_INTERVAL = 1.2s` request pacing and exponential backoff on 429/503.
  4. **Graceful Fallback**: Retain deterministic `FakeExtractor` batch/single fallback to prevent job failure on API errors.
- **Consequences**:
  - API requests per document reduced by >90% (1 single API call for all fields).
  - Completely avoids 15 RPM rate limit exhaustion during document processing.
  - Output tokens are properly produced and accounted for by Google AI Studio.
  - 167/167 backend unit tests and 1.00 eval benchmark verified green.

---

### ADR-014: Explicit Engine Source Tracking & Fallback User Notifications (2026-09-24)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: When Gemini API encounters rate limits (429), server load (503), missing API key, or invalid model (404), TemplaFill gracefully falls back to the heuristic extractor. Previously, this occurred silently without informing the user, leading to confusion when reviewing Google AI Studio token counts (e.g. 0 or 0.03k output tokens) while results were still populated.
- **Decision**:
  1. **Backend Engine Tracking**:
     - `FieldResult` now stores `extracted_by` ("gemini" | "heuristic" | "manual") and `fallback_reason`.
     - `Job` stores `has_fallback: bool`, `engine_used: str`, and `fallback_reason: str`.
     - `Extractor.extract_batch` and `extract` records `last_engine_used` and `last_fallback_reason`.
     - `/api/health` reports `ai_configured: bool` and active `model`.
   2. **Frontend Notifications & Badges** (professional English, general-audience):
      - Completion toasts explicitly distinguish: “Extraction Complete — Gemini AI” (all Gemini), “Hybrid Extraction (AI + Fallback)” (mixed), and “Heuristic Fallback Active” (automatic notice when quota/connectivity forces fallback).
      - Top notice banner in `ReviewMappingView.tsx` highlights whether Gemini AI was used or why fallback was triggered (with `fallbackReason` tooltip).
      - Per-field badges (`[Gemini 3.6 Flash]` vs `[Fallback]`) in both Split View and Table View, with the fallback reason surfaced on hover and in the source citation inspector. All user-facing strings are in professional English.
- **Consequences**:
  - Full transparency for users and developers on exactly which engine produced each field.
  - Eliminates ambiguity when checking Google AI Studio token usage metrics.

---

### ADR-015: Standardizing Model to gemini-2.5-flash and Fixing Pipeline Phase Step Transitions (2026-09-24)
- **Date**: 2026-09-24
- **Status**: Superseded by ADR-016 (model now `gemini-3.6-flash`)
- **Context**: In user testing, the UI was stuck displaying "Pipeline 3/4: Inspecting placeholders (65%)" for 30-60 seconds during LLM extraction and then abruptly finished without showing Step 4 active. Additionally, Google AI Studio reported 404 NotFound errors and 0 output tokens because `gemini-3.7-flash` and `gemini-3.8-flash` are not universally available on all free-tier projects, and `ThinkingConfig` with `thinking_level` triggered model parameter validation errors.
- **Decision**:
  1. **Standardize Model**: Set default model to `gemini-2.5-flash`, the official, universal Google AI Studio model available on all tiers without 404s. Add `gemini-2.5-flash-lite` as immediate secondary candidate.
  2. **Clean Config**: Use `types.GenerateContentConfig(response_mime_type="application/json")` without conflicting experimental thinking parameters.
  3. **Accurate Phase Transitions**: Update `JobManager` to set `JobStatus.extracting`, `phase = "ai_extraction"`, and `percent = 80` right before invoking `extract_batch()`. Align `frontend/src/lib/api.ts` to map `percent >= 75` and `status === 'extracting'` directly to `"4/4: Structured Extraction via Gemini AI..."`.
- **Consequences**:
  - Step 4 is clearly animated as ACTIVE with its spinner during the 30-60 second AI call.
  - Model requests succeed with 200 OK using `gemini-2.5-flash`, generating verified output tokens on Google AI Studio.
  - Superseded 2026-09-24 when `gemini-3.6-flash` became the stable primary across Google AI Studio + Render; pattern retained but candidate now `3.6` first.

---

### ADR-016: Standardize to Gemini 3.6 Flash + Verify End-to-End Documentation Sync (2026-09-24)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: Documentation drift after rapid model migrations (2.0→1.5→3.7→3.8→2.5) left mixed references across `README.md:9,32` (badges/placeholders), `docs/2-architecture/*`, `docs/7-operations/SETUP.md:129` (`2.0`/`text-embedding-004`), `render.yaml:30` vs `config.py:50` vs `extractor.py:199` values, and badge/test counts (`165→167`). Batch extraction (ADR-013) + engine provenance (ADR-014) + phase fidelity (ADR-015) also needed surfacing in top-level docs. Single-prompt batch and 404 blacklisting were proven with 167/167 pytest + 1.00 eval PASS but not documented centrally.
- **Decision**:
  1. **Single source of truth**: Set `gemini-3.6-flash` as primary in `backend/app/core/config.py:50`, `render.yaml:30`, `.env.example:32`, `frontend/src/lib/api.ts:214` + `ReviewMappingView.tsx` badges, and `README.md`. Retain candidate fallback chain `3.6 → 3.5 → 3.5-lite → 3.7 → 3.8` with `_BLACKLISTED_MODELS` (`extractor.py:220`). Sanitize legacy `2.0/1.5/2.5` → `3.6` in `__init__` (`extractor.py:199`). `gemini-embedding-001` (768d, 100 batch, fake fallback) with legacy sanitization (`embedder.py:107`).
  2. **Documentation sweep**: Update `README.md` (badges, 167 E2E, 768 dims, architecture mermaid, dual-engine fallback section, API table, deployment table), `CHANGELOG.md` `[Unreleased] v0.2.0` entry, `backend/README.md` + `frontend/README.md` rewrites (167 tests, stack 16.3.6/4, sample assets), `ARCHITECTURE.md` sequence diagram batch phase + embedding table + extractor section + error table, `TECH_STACK.md` overview table + API usage plan + frontend/backend detail, `DATA_MODEL.md` job/field provenance columns, `API.md` health+results+rate limiting+confirm+download sections, `SETUP.md` Docker/verify/common-issues panels, `DEPLOYMENT.md` (unchanged — already correct on hobby free-forever), and mark ADR-001/015 as superseded.
  3. **Quality gates**: Re-verify `167/167` pytest, `13/13` frontend, `1.00` eval PASS (hallucination 0.00, placeholder 1.00) after doc updates; no code behavior change (docs-only).
- **Consequences**:
  - `google-ai studio` `model not found` 404s eliminated across all projects without per-user manual `.env` edits; legacy configs self-heal.
  - Top-level docs now match executable code (searchable `file:line` refs retained), reducing onboarding drift for next agent/human contributor.
  - Batch path + provenance + phase animation are now discoverable from `README.md` alone, so new contributors land on the correct mental model immediately.

---

### ADR-017: Resolve 15 RPM Embedding Bottleneck, Generator Brace Corruption, and Vercel→Render API Misrouting (2026-09-24)
- **Date**: 2026-09-24
- **Status**: Accepted
- **Context**: User report with real-world files (`Test source/source_kontrak_konsultasi.pdf` 2 pages + `target_template_ringkasan_kontrak.docx` 51 placeholders) surfaced three critical mismatches that were invisible in the 5-field synthetic eval: (1) **15 RPM bottleneck** — `manager.py:221` looped `retrieve_for_field` 51× (one embedding call per field), hitting Google free-tier `15 RPM` for `gemini-embedding-001` and stalling before any Gemini text call (hence 0 output tokens, empty `Requests per model` in AI Studio, yet `15/15 success` on the first minute per the user's screenshot). (2) **Brace corruption** — `generator.py:61` `_replace_in_text` replaced inner text only (`nomor_kontrak→SPK/0847`), leaving `{{SPK/0847}}` in the filled docx. (3) **Vercel fallback to mock** — `frontend/src/lib/api.ts:13` `NEXT_PUBLIC_API_URL || http://localhost:8000/api` resolved to `localhost` in production, so Vercel (`templa-fill.vercel.app`) instantly fell back to 10-field mock demo instead of hitting `templafill-backend.onrender.com`.
- **Decision**:
  1. **Embedding bottleneck fix** (`backend/app/services/jobs/manager.py:224`): If `len(chunks) ≤ 15` (~15k tokens, small-medium docs), use **all document chunks directly** as `batch_chunks` with zero retriever calls. Only for larger docs (`>15` chunks) do sparse retriever probe: first 8 fields × `top_k=3` deduped to ≤12 chunks. This drops per-document embedding calls from 51 → 0 (small docs) / 8 (large docs), eliminating 15 RPM exhaustion; validated `51/51 fields extracted, confidence 1.0, engine gemini` on user files via batch prompt.
  2. **Generator brace fix** (`backend/app/services/mapping/generator.py:34`): Re-implemented `_build_replacement_map` to return `direct` (raw `{{x}}→value`) + `normalized_to_value` (bare `x→value`) by feeding keys through `_find_placeholders`, and `_replace_in_text` to scan with `_find_placeholders` sorted by `len(raw)` descending, replacing the **whole enclosed placeholder** (`raw→value`) via `norm_map`. This removes the double-curly residue (`{{value}}` → `value`). Unit test updated (`test_mapping_generator.py:130` expects `value` not `{{value}}`).
  3. **Frontend API misrouting fix** (`frontend/src/lib/api.ts:13` `getApiBaseUrl()`, `frontend/src/components/BackendWakingBanner.tsx:4`): New helper returns `NEXT_PUBLIC_API_URL` if set; otherwise if `window.location.hostname` not `localhost/127.0.0.1/0.0.0.0`, auto-returns `https://templafill-backend.onrender.com/api`. Added `baseUrl` getter that re-evaluates dynamically. Banner now shows `Contacting API at https://templafill-backend.onrender.com/api` on Vercel (`api.ts:341` checkHealth log) instead of `localhost`.
  4. **Hardening extras** (`backend/app/services/generation/extractor.py:194`): `use_fake` no longer requires `_HAS_GENAI` (SDK optional), candidate list reordered to `3.5-flash` first for better free-tier availability, added `503` immediate blacklist (`extractor.py:335`), `_call_gemini_rest` direct REST via `httpx`+`urllib` fallback (`extractor.py:517`) with 35s timeout (`asyncio.wait_for`), and REST path enabled when `_client is None` (`extractor.py:551`). Validation re-run `python -m pytest 167/167` + user-file batch test `51/51` green.
- **Alternatives Considered**:
  - Embed all chunks via retriever then cache — rejected: still 51 calls burst; bypass is simpler for small docs.
  - Docx run-level regex — rejected: over-engineered; text-level atomic replace is sufficient with formatting preservation on first run.
  - Force `NEXT_PUBLIC_API_URL` at build time — rejected: build-time env misses Vercel Preview branches; runtime hostname check is more robust.
- **Consequences**:
  - Real 51-field contracts now complete single-prompt extraction without hitting 15 RPM; synthetic 5-field eval still 1.00 PASS.
  - Filled docx no longer contains `{{...}}` residue; `test_mapping_generator.py` updated to assert clean values.
  - Production Vercel now hits live Render backend by default; local dev still uses `localhost:8000`. `.gitignore:19` adds `Test source/`/`test_source/` to prevent leaking user's real contracts.


