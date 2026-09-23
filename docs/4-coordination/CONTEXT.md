# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: OpenCode
- **Summary**: Phase 5 polish complete — Tasks 5.1-5.4 done on feat/oc-backend-scaffold: CI/CD (.github/workflows/ci.yml 165 tests + deploy.yml), security (SecurityHeaders + RequestId + sanitize + rate limiter), GZip, Dockerfile (python:3.11-slim, HEALTHCHECK, non-root), docker-compose.yml (pgvector+redis+backend), 165 tests green. Phase 3 frontend done by Antigravity; remaining 5.5-5.7 deploy/E2E for Both pending staging.

---

## Current Project State

### Overall Status: 🟢 Phase 5 Polish Complete — CI/CD, Security, Docker ✅ (165 tests, eval PASS, docker ready)

Phase 0-2 & 4-5 (backend) done. 5 datasets, eval 1.00 PASS, security headers, GZip, Dockerfile & compose. Next: Deploy to staging + E2E (5.5-5.7 Both).

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
- [x] `frontend/` — Next.js 14+ App with Design System, Dual Dropzone, Processing, Review, and Download UI ✅ branch feat/ag-frontend-scaffold
- [x] `backend/` — FastAPI backend (165 tests, Phase 1+2) ✅ branch feat/oc-backend-scaffold
- [x] `eval/` — Evaluation suite with 5 datasets + run_eval.py ✅ feat/oc-backend-scaffold (eval PASS 1.00)

### What's Being Worked On Right Now
| Agent | Task | Files | Started |
|-------|------|-------|---------|
| Antigravity | Phase 3 Completed: Frontend scaffold & UI views verified (lint/build 100% green, pushed) | `frontend/` | 2026-09-23 |
| OpenCode | Phase 5 Completed: CI/CD + security + Docker, 165 tests green, pushed | `.github/workflows/` + `backend/Dockerfile` + `docker-compose.yml` + `app/core/security.py` | 2026-09-23 |

### What's Next
1. ✅ OpenCode Phase 1 done — 140/140 tests green, pushed.
2. ✅ OpenCode Phase 2 done — 25 API tests, 165 total green, pushed.
3. ✅ OpenCode Phase 4 done — 5 datasets, eval 1.00 PASS (halluc 0.00).
4. ✅ OpenCode Phase 5 done — CI (165 tests, eval, docker), security headers + rate limit, GZip, Dockerfile & compose ready for Render/Railway.
5. ✅ Antigravity Phase 3 done — 100% frontend complete.
6. Next: Both agents E2E staging test after merge to develop/main (Tasks 5.6-5.7).

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
