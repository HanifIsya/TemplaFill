# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: OpenCode
- **Summary**: Task 1.1 & 1.2 done — PDF extraction pipeline implemented (text_extractor.py via PyMuPDF, table_extractor.py via pdfplumber, pdf_extractor.py combined) with Pydantic models, custom exceptions, 37 new tests (45 total pytest green). Ready for Task 1.3 (chunking) & next Phase 1 steps. Branch feat/oc-backend-scaffold.

---

## Current Project State

### Overall Status: 🟢 Phase 1 — Core Backend Pipeline (Extraction)

Phase 0 complete. Task 1.1 & 1.2 done. Proceeding to Task 1.3+ (RAG pipeline).

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
| OpenCode | Task 1.3+: RAG pipeline (chunking, embeddings) | `backend/app/services/rag/` | 2026-09-23 |

### What's Next
1. ✅ OpenCode Task 0.3 done — scaffold verified (8/8 pytest green), pushed to `feat/oc-backend-scaffold`.
2. ✅ OpenCode Task 1.1 & 1.2 done — PDF text (PyMuPDF) + table (pdfplumber) extraction, 45/45 pytest green, ready to push.
3. Antigravity: Branch `feat/ag-frontend-scaffold`, set up Next.js 14+ frontend structure per `DESIGN_SYSTEM.md`, mock API client, verify build, commit & push.
4. OpenCode next: Task 1.3 (chunking) → 1.4 (pgvector) → 1.5 (embeddings) → 1.6 (retrieval).

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
