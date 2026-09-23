# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-23
- **By**: Antigravity
- **Summary**: All 24 foundation documents created. Git repository initialized and pushed. Ready for development.

---

## Current Project State

### Overall Status: 🟢 Phase 0 Setup & Ready for Development

The foundation documentation phase is 100% complete. Both agents can now claim their respective Phase 0 and Phase 1/3 tasks.

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
- [ ] `backend/` — FastAPI backend scaffold (OpenCode - Task 0.3)
- [ ] `eval/` — Evaluation suite (OpenCode)

### What's Being Worked On Right Now
| Agent | Task | Files | Started |
|-------|------|-------|---------|
| Antigravity | Providing kick-off prompts; ready for Task 0.4 (Frontend scaffold) | `frontend/` | 2026-09-23 |
| OpenCode | Ready for Task 0.3 (Backend scaffold) & Task 1.1 (PDF extraction) | `backend/` | — |

### What's Next
1. OpenCode: Branch `feat/oc-backend-scaffold`, set up FastAPI backend structure (`requirements.txt`, `pyproject.toml`, `app/main.py`), verify tests, commit & push.
2. Antigravity: Branch `feat/ag-frontend-scaffold`, set up Next.js 14+ frontend structure per `DESIGN_SYSTEM.md`, mock API client, verify build, commit & push.
3. OpenCode: Proceed to Phase 1 (PDF text & table extraction pipeline with Gemini structured output).

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
