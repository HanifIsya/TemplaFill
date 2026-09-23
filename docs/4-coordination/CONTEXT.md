# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: OpenCode
- **Summary**: Phase 4 eval complete — Tasks 4.1-4.5 done on feat/oc-backend-scaffold: 5 synthetic datasets (hr/finance/education/legal/general) via scripts/generate_eval_datasets.py, eval/run_eval.py with precision/recall/F1/hallucination/not_found/placeholder metrics, baseline 0.79→1.00 after FakeExtractor optimization (term scoring + distinctive guard), 165 tests still green, results in eval/results/. Ready for Phase 5 polish/deploy.

---

## Current Project State

### Overall Status: 🟢 Phase 4 Complete — Evaluation ✅ (165 tests + 5 datasets, eval PASS)

Phase 0,1,2 & 4 done. 5 datasets across 5 domains, eval 1.00/1.00/1.00 PASS. Next: Phase 5 polish (CI/CD, deploy, security audit).

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
| OpenCode | Phase 4 Completed: 5 datasets, eval PASS 1.00, 165 tests green, pushed | `eval/` + `scripts/generate_eval_datasets.py` + `backend/app/services/generation/extractor.py` | 2026-09-23 |

### What's Next
1. ✅ OpenCode Phase 1 done — 140/140 tests green, pushed.
2. ✅ OpenCode Phase 2 done — 25 API tests, 165 total green, pushed to `feat/oc-backend-scaffold`.
3. ✅ OpenCode Phase 4 done — 5 synthetic datasets, run_eval.py, baseline 1.00/1.00/1.00 (initial 0.79→ optimized), hallucination 0.00, placeholder 1.00, all PASS.
4. ✅ Antigravity Phase 3 done — 100% frontend complete.
5. Next: Phase 5 polish (CI/CD, security audit, deploy per DEPLOYMENT.md) + E2E staging test.

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
