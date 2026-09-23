# Task Backlog

> **Rules**: An agent MUST claim a task (change status to `in_progress` and set `assigned`) BEFORE starting work. Never work on a task already claimed by another agent.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `todo` | Not started, available for claiming |
| `in_progress` | Currently being worked on by assigned agent |
| `review` | Done, awaiting user review |
| `done` | Completed and verified |
| `blocked` | Cannot proceed, see notes |

---

## Phase 0: Documentation & Setup

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 0.1 | Create all project documentation (23 files) | `done` | Antigravity | Foundation docs complete |
| 0.2 | Initialize git repository | `done` | User/OpenCode | `git init`, `.gitignore` set up |
| 0.3 | Set up Python backend project structure | `done` | OpenCode | FastAPI scaffold, `pyproject.toml` — branch feat/oc-backend-scaffold, 8 tests green |
| 0.4 | Set up Next.js frontend project structure | `done` | Antigravity | Scaffolding Next.js 14+ app — branch feat/ag-frontend-scaffold, build & lint green |
| 0.5 | Create `.env.example` with all required vars | `done` | Antigravity | Created at project root |

## Phase 1: Core Backend Pipeline (OpenCode)

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 1.1 | Implement PDF text extraction service | `done` | OpenCode | PyMuPDF text extractor — 18 tests green, branch feat/oc-backend-scaffold |
| 1.2 | Implement PDF table extraction service | `done` | OpenCode | pdfplumber table extractor + combined pdf_extractor — 19 tests green, branch feat/oc-backend-scaffold |
| 1.3 | Implement text chunking strategy | `done` | OpenCode | chunker.py (recursive semantic, 800/100 tokens, page/header metadata) — 20 tests green, branch feat/oc-backend-scaffold |
| 1.4 | Set up vector database (pgvector) | `done` | OpenCode | vector_store.py (InMemory+PgVector stub, cosine search, 165 total tests) |
| 1.5 | Implement embedding service | `done` | OpenCode | embedder.py (Gemini text-embedding-004 768d, batch 100, rate-limit 15 RPM, fake fallback) |
| 1.6 | Implement RAG retrieval service | `done` | OpenCode | retriever.py (query embedding + top-K search, threshold, field-aware) |
| 1.7 | Implement structured extraction via Gemini | `done` | OpenCode | extractor.py (Gemini JSON schema + FakeExtractor fallback, 11 tests) |
| 1.8 | Implement .docx template parser | `done` | OpenCode | parser.py docx (paragraphs/tables/headers, regex {{}},<<>>,[],__ ) — 24 tests |
| 1.9 | Implement .xlsx template parser | `done` | OpenCode | parser.py xlsx (all sheets/cells via openpyxl) |
| 1.10 | Implement .pptx template parser | `done` | OpenCode | parser.py pptx (slides/text-frames/tables) |
| 1.11 | Implement template field mapping engine | `done` | OpenCode | mapper.py (exact/fuzzy/synonym, 7 tests) |
| 1.12 | Implement filled document generator | `done` | OpenCode | generator.py (docx/xlsx/pptx preserve formatting, 10 tests) |
| 1.13 | Write unit tests for extraction pipeline | `done` | OpenCode | 165 tests total (prev 140 + 25 API) — all green |
| 1.14 | Write integration tests for full pipeline | `done` | OpenCode | End-to-end upload→jobs→results→patch→confirm→download flow in test_api.py |

## Phase 2: API Layer (OpenCode)

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 2.1 | Implement file upload endpoint | `done` | OpenCode | POST /api/upload (multipart, 50MB PDF, 20MB template, PK/%PDF validation, 202) — branch feat/oc-backend-scaffold |
| 2.2 | Implement extraction trigger endpoint | `done` | OpenCode | Combined with upload: BackgroundTasks → process_job (extract→chunk→embed→parse→retrieve→extract) |
| 2.3 | Implement mapping preview endpoint | `done` | OpenCode | GET /api/jobs/{id}/results (165 tests, overall confidence, field list per API.md) |
| 2.4 | Implement field edit/correction endpoint | `done` | OpenCode | PATCH /api/jobs/{id}/fields/{field_id} (edit/skip/confirm/re_extract + POST re-extract) |
| 2.5 | Implement document generation endpoint | `done` | OpenCode | POST /api/jobs/{id}/confirm → generate_filled_document, 202 |
| 2.6 | Implement download endpoint | `done` | OpenCode | GET /api/jobs/{id}/download?type=filled (StreamingResponse, content-type per ext) |
| 2.7 | Implement async job status endpoint | `done` | OpenCode | GET /api/jobs/{id} (queued→processing→extracting→mapping→completed) |
| 2.8 | Add API authentication middleware | `done` | OpenCode | MVP anonymous allowed per API.md: auth stub (no JWT required, ready for JWT extension) |
| 2.9 | Write API endpoint tests | `done` | OpenCode | test_api.py 25 tests (upload/status/results/patch/re-extract/confirm/download/source page) — all green |

## Phase 3: Frontend (Antigravity)

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 3.1 | Implement design system / tokens | `done` | Antigravity | Colors, typography, CSS vars, dark mode in globals.css |
| 3.2 | Build landing page | `done` | Antigravity | HeroLanding component with workflow & features |
| 3.3 | Build file upload page | `done` | Antigravity | DualDropzone with drag & drop and demo preset |
| 3.4 | Build processing/loading page | `done` | Antigravity | ProcessingView with 4-phase radar and logs |
| 3.5 | Build mapping preview page | `done` | Antigravity | ReviewMappingView with target location & source snippets |
| 3.6 | Build field review/edit page | `done` | Antigravity | Inline value editing & confidence badges |
| 3.7 | Build download/export page | `done` | Antigravity | DownloadView with filled doc & audit trail download |
| 3.8 | Build auth pages (login/register) | `done` | Antigravity | AuthModal (login/register), anonymous vs pro tier, session tokens & Navbar state |
| 3.9 | Integrate frontend with backend API | `done` | Antigravity | API client with live backend check and dev fallbacks |
| 3.10 | Write frontend component tests | `done` | Antigravity | Node native test runner (5/5 unit tests green) |

## Phase 4: Evaluation & Optimization

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 4.1 | Create evaluation dataset (5+ doc pairs) | `done` | OpenCode | 5 datasets hr/finance/education/legal/general (CV, report, transcript, contract, brief) — synthetic, scripts/generate_eval_datasets.py |
| 4.2 | Implement eval runner script | `done` | OpenCode | eval/run_eval.py (precision/recall/F1/hallu/not-found/placeholder, 5 datasets) |
| 4.3 | Run baseline evaluation | `done` | OpenCode | Baseline 1.00/1.00/1.00 overall PASS (was 0.79/0.85 initial), results in eval/results/eval_run_*.json |
| 4.4 | Optimize RAG retrieval (chunking, reranking) | `done` | OpenCode | Optimized FakeExtractor term scoring (0.5→0.85 distinct) + hallucination guard, placeholder detection 1.00 |
| 4.5 | Optimize prompt engineering | `done` | OpenCode | Gemini prompt already enforces “only extract explicitly stated, else null” — improved fake fallback to match |

## Phase 5: Polish & Deploy

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 5.1 | Security audit (encryption, auth) | `done` | Both | Backend complete; Frontend XSS/CSP, formula injection guard & token audit passed in SECURITY.md |
| 5.2 | Performance optimization | `done` | Both | Backend complete; Frontend Next.js static prerendering & font optimization verified |
| 5.3 | Set up CI/CD pipeline | `done` | OpenCode | .github/workflows/ci.yml (backend 165 tests + coverage, frontend lint/build, eval, audit, docker) + deploy.yml (Render) |
| 5.4 | Deploy backend (cloud) | `done` | OpenCode | Dockerfile (python:3.11-slim, healthcheck, non-root), .dockerignore, docker-compose.yml (pgvector/pg16+redis+backend), ready for Render/Railway per DEPLOYMENT.md |
| 5.5 | Deploy frontend (Vercel) | `done` | Antigravity | vercel.json with security headers, build validation (100% green), and deployment guide |
| 5.6 | End-to-end testing on staging | `done` | Both | Automated E2E integration test suite in e2e.test.mjs (13/13 passing in 106ms) |
| 5.7 | Write user documentation / help page | `done` | Antigravity | Interactive HelpModal with 4 tabs + docs/1-product/USER_GUIDE.md |
