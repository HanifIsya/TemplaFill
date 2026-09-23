# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: OpenCode
- **Summary**: Phase 1 pipeline complete — Tasks 1.3-1.14 done on feat/oc-backend-scaffold: chunker (recursive 800/100 + metadata), vector_store (InMemory+PgVector stub), embedder (text-embedding-004 768d, fake fallback), retriever (top-K cosine), extractor (Gemini JSON + Fake), parser (docx/xlsx/pptx 5 placeholder patterns), mapper (exact/fuzzy/synonym), generator (preserve formatting). 140 pytest green (was 45) across 8 test suites. Ready for Phase 2 API layer.

---

## Current Project State

### Overall Status: 🟢 Phase 1 Complete — Core Backend Pipeline ✅

Phase 0 & Phase 1 (Tasks 0.3, 1.1-1.14) done. 140 tests green. Proceeding to Phase 2 API layer (file upload, jobs, mapping preview, generation).

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
- [ ] `frontend/` — Next.js app scaffold (Antigravity - Task 0.4)
- [x] `backend/` — FastAPI backend scaffold (OpenCode - Task 0.3) ✅ branch feat/oc-backend-scaffold
- [ ] `eval/` — Evaluation suite (OpenCode)

### What's Being Worked On Right Now
| Agent | Task | Files | Started |
|-------|------|-------|---------|
| Antigravity | Task 0.4: Next.js Frontend Scaffold with Design System | `frontend/` | 2026-09-23 |
| OpenCode | Phase 2: API layer (upload, jobs, mapping, generation endpoints) | `backend/app/api/` | 2026-09-23 |

### What's Next
1. ✅ OpenCode Phase 1 done — Task 1.3 chunker (20 tests), 1.4 vector_store + 1.5 embedder + 1.6 retriever (19 RAG tests), 1.7 extractor (11 tests, Gemini fake fallback), 1.8-1.10 parser docx/xlsx/pptx (24 tests), 1.11 mapper + 1.12 generator (20 tests), 1.13-1.14 integration — 140/140 green, pushed.
2. Antigravity: Branch `feat/ag-frontend-scaffold`, Next.js scaffold (per DESIGN.md) — may already have frontend/ untracked locally.
3. OpenCode next: Phase 2 API — POST /api/upload, GET /api/jobs, PATCH fields, POST generate, GET download (per API.md), with httpx tests.

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
