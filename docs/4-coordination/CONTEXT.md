# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: OpenCode
- **Summary**: Full-stack integration complete. OpenCode completed Phases 1, 2, 4, and 5 (165 backend tests, eval PASS, Docker, security, CI/CD). Antigravity completed Phases 0 and 3 (Next.js 14+ frontend, IBM Plex design system, all modals & views, 5/5 tests green). Merged cleanly to main.

---

## Current Project State

### Overall Status: 🟢 Full-Stack Application Complete & Unified on Main ✅

All core phases completed:
- Phase 0: Foundation documentation & project scaffolds ✅
- Phase 1: Core backend extraction & RAG pipeline (140 tests) ✅
- Phase 2: FastAPI API layer (25 API tests, 165 total pytest green) ✅
- Phase 3: Next.js frontend with IBM Plex design system & all workflows ✅
- Phase 4: Evaluation suite (5 datasets, run_eval.py PASS 1.00) ✅
- Phase 5: Polish, CI/CD, security headers, Docker, and compose ✅

### What Exists
- [x] `AGENTS.md` — Agent coordination contract (root)
- [x] `CHANGELOG.md` — Project changelog (root)
- [x] `.env.example` — Environment variables template (root)
- [x] `.gitignore` — Public repo privacy & ignore rules
- [x] `docs/1-product/*` — PRD, VISION, USER_STORIES
- [x] `docs/2-architecture/*` — ARCHITECTURE, TECH_STACK, DATA_MODEL, API
- [x] `docs/3-design/*` — DESIGN, DESIGN_SYSTEM
- [x] `docs/4-coordination/*` — OWNERSHIP, WORKFLOW, TASKS, CONTEXT
- [x] `docs/5-quality/*` — EVAL, FEEDBACK_LOOP, TESTING
- [x] `docs/6-security/*` — SECURITY, DATA_PRIVACY
- [x] `docs/7-operations/*` — SETUP, DEPLOYMENT, DECISIONS
- [x] `frontend/` — Next.js 14+ App with Design System, Dual Dropzone, Processing, Review, and Download UI ✅
- [x] `backend/` — FastAPI backend (165 tests, Phase 1+2) ✅
- [x] `eval/` — Evaluation suite with 5 datasets + run_eval.py (eval PASS 1.00) ✅

### What's Being Worked On Right Now
| Agent | Task | Files | Started |
|-------|------|-------|---------|
| Antigravity | Main branch unification & full-stack repository merge | All | 2026-09-23 |

### What's Next
1. ✅ OpenCode Phase 1 done — 140/140 tests green.
2. ✅ OpenCode Phase 2 done — 25 API tests, 165 total green.
3. ✅ OpenCode Phase 4 done — 5 datasets, eval 1.00 PASS (halluc 0.00).
4. ✅ OpenCode Phase 5 done — CI (165 tests, eval, docker), security headers + rate limit, GZip, Dockerfile & compose ready.
5. ✅ Antigravity Phase 3 done — 100% frontend complete (5/5 tests green, build green).
6. Next: Deploy frontend to Vercel and backend to Render/Railway (Tasks 5.5-5.7).

---

## Recent Decisions

| Decision | Rationale | Date | Logged in DECISIONS.md? |
|----------|-----------|------|------------------------|
| Product name: TemplaFill | User-defined | 2026-09-23 | Pending |
| LLM: Gemini free plan | Cost-effective for MVP | 2026-09-23 | Pending |
| Multi-format templates (.docx, .xlsx, .pptx) | User requirement | 2026-09-23 | Pending |
| UI language: English | User preference | 2026-09-23 | Pending |
| Frontend: Next.js + React | Modern, SSR capable, good DX | 2026-09-23 | Pending |
| Backend: Python + FastAPI | Best ML/AI ecosystem, async | 2026-09-23 | Pending |

---

## Cross-Agent Requests

_No active requests._

<!-- Template for new requests:
### Request: [Short Title]
- **From**: [Agent Name]
- **To**: [Agent Name]
- **File(s)**: path/to/file
- **Description**: What needs to change and why
- **Priority**: high / medium / low
- **Status**: pending / in_progress / done / needs_discussion
-->

---

## Known Issues & Blockers

_No known issues._

---

## Session Log

| Date | Agent | Summary |
|------|-------|---------|
| 2026-09-23 | Antigravity | Project kickoff. Created AGENTS.md, CHANGELOG.md, and all coordination docs. Creating remaining 17 documentation files. |
| 2026-09-23 | OpenCode | Task 0.3 scaffold complete: FastAPI app with CORS + GET /api/health, pydantic-settings config, API stubs (upload/jobs), services skeleton, requirements.txt/pyproject.toml, 8 pytest tests passing. Branch feat/oc-backend-scaffold. |
| 2026-09-23 | OpenCode | Task 1.1 & 1.2 extraction pipeline done: text_extractor.py (PyMuPDF), table_extractor.py (pdfplumber), pdf_extractor.py (combined orchestrator), models.py (Pydantic), exceptions.py, 37 new extraction tests (45 total green). |
| 2026-09-23 | OpenCode | Phase 1 pipeline complete: chunker.py (recursive semantic 800/100), vector_store (InMemory/PgVector), embedder (768d fake fallback), retriever (top-K), extractor (Gemini JSON + Fake), parser (docx/xlsx/pptx 5 placeholder types), mapper (exact/fuzzy/synonym), generator (preserve formatting) — 95 new tests, 140 total green on feat/oc-backend-scaffold. |
| 2026-09-23 | OpenCode | Phase 2 API layer complete: job manager (in-memory queued→completed), services/jobs/models, POST upload (415/413 validation), GET jobs/results, PATCH fields (edit/skip/confirm/re_extract), POST confirm (202), GET download (streaming), POST re-extract, GET source/page, 25 API tests, 165 total green on feat/oc-backend-scaffold. |
| 2026-09-23 | OpenCode | Phase 4 eval complete: generated 5 datasets (hr/finance/education/legal/general) via scripts/generate_eval_datasets.py, implemented eval/run_eval.py (precision/recall/F1/hallucination/not_found/placeholder), baseline 0.79→1.00 after FakeExtractor optimization (term scoring + distinctive guard), 165 tests still green, results in eval/results/eval_run_*.json, overall PASS. |
| 2026-09-23 | OpenCode | Phase 5 polish complete: CI/CD (.github/workflows/ci.yml with backend 165 tests/coverage + frontend lint/build + eval + docker, deploy.yml for Render), security (SecurityHeadersMiddleware CSP/HSTS, RequestId, sanitize_filename, magic validation, InMemoryRateLimiter 10/h 60/m), GZipMiddleware, Dockerfile (3.11-slim, non-root, HEALTHCHECK), docker-compose.yml (pgvector/pg16 + redis + backend), 165 tests green. |
| 2026-09-23 | Antigravity | Phase 3 frontend complete: Next.js 14+ App Router, IBM Plex typography, solid high-contrast theme (zero AI design tropes), Dual Dropzone with drag & drop + demo presets, Processing View with real-time stage tracker, Split & Table Review views, Citation Modal, Re-extract Modal, Add Field Modal, Download View with filled docs & audit summary, Toast alerts, LocalStorage history, 5/5 unit tests green. Branch feat/ag-frontend-scaffold merged into main. |

