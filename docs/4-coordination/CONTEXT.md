# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: OpenCode
- **Summary**: Phase 2 API layer complete — Tasks 2.1-2.9 done on feat/oc-backend-scaffold: POST /api/upload (multipart validation), job manager (queued→processing→extracting→mapping→completed), GET jobs/results/source/page, PATCH fields + POST re-extract, POST confirm, GET download. 25 API tests, 165 total pytest green. Ready for Phase 4 eval & Phase 5 polish.

---

## Current Project State

### Overall Status: 🟢 Phase 2 Complete — API Layer ✅ (165 tests green)

Phase 0, Phase 1 (1.1-1.14) & Phase 2 (2.1-2.9) done. Next: Phase 4 eval & Phase 5 polish/deploy.

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
- [x] `backend/` — FastAPI backend scaffold (OpenCode - Task 0.3) ✅ branch feat/oc-backend-scaffold
- [ ] `eval/` — Evaluation suite (OpenCode)

### What's Being Worked On Right Now
| Agent | Task | Files | Started |
|-------|------|-------|---------|
| Antigravity | Phase 3 Completed: Frontend scaffold & UI views verified (lint/build 100% green, pushed) | `frontend/` | 2026-09-23 |
| OpenCode | Phase 2 Completed: 165 tests green, pushed | `backend/app/api/` + `backend/app/services/jobs/` | 2026-09-23 |

### What's Next
1. ✅ OpenCode Phase 1 done — 140/140 tests green, pushed.
2. ✅ OpenCode Phase 2 done — 25 API tests (upload/status/results/patch/re-extract/confirm/download/source page), 165 total green, pushed to `feat/oc-backend-scaffold`.
3. ✅ Antigravity Phase 0 & Phase 3 (100% Complete) — Next.js 14+ app, Design System (Midnight Slate / Electric Indigo), Dual Dropzone, Processing View, Split & Table Review with Citation Modal, Re-extract Modal, Add Field Modal, Download View, Toast Notifications, LocalStorage History, and 5/5 unit tests green. Pushed to `feat/ag-frontend-scaffold` (commits `6941de2`, `f4c0c2a`, `c7ca6ae`).
4. Next: OpenCode Phase 4 eval suite + E2E integration test connecting frontend with backend API.

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
