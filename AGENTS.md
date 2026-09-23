# TemplaFill — Agent Instructions

> **This file is the single source of truth for ALL AI agents working on this repository.**
> Both **Antigravity** and **OpenCode** MUST read this file before performing ANY work.

---

## Project Overview

**TemplaFill** is a general-purpose AI-powered web tool that extracts structured data from source PDF documents and automatically maps/fills that data into user-provided template documents.

- **Input 1**: Source PDF (text-based content — contracts, reports, CVs, invoices, etc.)
- **Input 2**: Template document (.docx, .xlsx, .pptx, or .pdf with form fields)
- **Output**: Filled template with data accurately extracted from the source PDF
- **Core Tech**: RAG (Retrieval-Augmented Generation) + Structured Extraction + Gemini API (free plan)
- **Deployment**: Web application (Next.js frontend + Python backend)

---

## Agent Roster

| Agent | Role | Primary Zone | Tools |
|-------|------|-------------|-------|
| **Antigravity** | Documentation, Architecture, Frontend (Next.js/React), Design System, Integration | `docs/`, `frontend/`, `AGENTS.md`, root configs | Antigravity IDE |
| **OpenCode** | Backend (Python), AI/ML Pipeline, RAG Engine, PDF Extraction, API Implementation | `backend/`, `scripts/`, `tests/` | OpenCode CLI |

---

## Golden Rules (Both Agents MUST Follow)

### 1. Check Before You Work
```
BEFORE starting any task:
1. Read docs/4-coordination/CONTEXT.md — know what's happening NOW
2. Read docs/4-coordination/TASKS.md — find an unclaimed task
3. Read docs/4-coordination/OWNERSHIP.md — confirm you own that file/module
4. Claim the task (mark as in_progress with your name) BEFORE writing code
```

### 2. Stay In Your Lane
- **NEVER** edit files outside your primary zone without explicit user approval
- If you need a change in another agent's zone, document the request in `CONTEXT.md` under "Cross-Agent Requests"
- Shared files (like `package.json`, `.env.example`, root configs) require a note in `CONTEXT.md` before editing

### 3. No Silent Decisions
- All technical decisions MUST be logged in `docs/7-operations/DECISIONS.md`
- If you're choosing between two approaches, document WHY you chose one over the other
- Never reverse a logged decision without user approval

### 4. Commit Convention
```
<type>(<scope>): <short description>

Types: feat, fix, refactor, docs, test, chore, style
Scope: frontend, backend, docs, pipeline, api, config

Examples:
  feat(backend): add PDF text extraction with pdfplumber
  docs(architecture): update RAG pipeline diagram
  fix(frontend): resolve file upload drag-and-drop on Safari
  test(pipeline): add extraction accuracy tests for invoice domain
```

### 5. File Naming Convention
```
Source code:    camelCase (JavaScript/TypeScript), snake_case (Python)
Components:    PascalCase (React components)
Directories:   kebab-case
Docs:          UPPER_CASE.md (for project docs), lowercase.md (for code docs)
Tests:         <module>.test.ts (frontend), test_<module>.py (backend)
```

### 6. Closed-Loop Feedback
After implementing any feature:
1. Write or update tests
2. Run tests — `npm test` (frontend) or `pytest` (backend)
3. If tests fail → read error → fix → re-run → repeat until green
4. Run eval (if extraction-related) — check against `docs/5-quality/EVAL.md` thresholds
5. Update `CONTEXT.md` with what you did and any issues found

### 7. Git Commit & Push at Checkpoints
Agents MUST commit and push using the user's git account at these checkpoints:
```
WHEN to commit & push:
  ✅ After completing a task (or a meaningful sub-task)
  ✅ After completing an entire phase in TASKS.md
  ✅ After creating/updating multiple documentation files
  ✅ After a feature passes all tests and eval
  ✅ Before ending a work session
  ✅ After resolving a bug or critical fix

HOW to commit & push:
  1. Stage changes:  git add -A
  2. Commit:         git commit -m "<type>(<scope>): <description>"
  3. Push:           git push origin <branch-name>

  Use the user's pre-configured git identity (do NOT change git user.name or user.email).
  If no remote is set up yet, initialize with:
    git init && git remote add origin <repo-url>
  and push to `main` for the first commit, then use branches after.
```

### 8. Public Repository Awareness
This repository is **PUBLIC**. Be extra careful:
- **NEVER** commit `.env` files containing real API keys or secrets
- **NEVER** commit user-uploaded documents, eval datasets with real data, or any PII
- **ALWAYS** check `.gitignore` before committing — sensitive files are listed there
- All documentation in `docs/` is fine for public — it contains no secrets
- See `.gitignore` for the full list of excluded files and directories

---

## Project Structure (Target)

```
e:\TemplaFill\
├── AGENTS.md                          # THIS FILE — agent instructions
├── CHANGELOG.md                       # Release changelog
├── .env.example                       # Environment variables template
├── .gitignore
│
├── docs/                              # All project documentation
│   ├── 1-product/                     # Product requirements
│   │   ├── PRD.md
│   │   ├── VISION.md
│   │   └── USER_STORIES.md
│   ├── 2-architecture/                # Technical architecture
│   │   ├── ARCHITECTURE.md
│   │   ├── TECH_STACK.md
│   │   ├── DATA_MODEL.md
│   │   └── API.md
│   ├── 3-design/                      # UI/UX design
│   │   ├── DESIGN.md
│   │   └── DESIGN_SYSTEM.md
│   ├── 4-coordination/                # Multi-agent coordination
│   │   ├── OWNERSHIP.md
│   │   ├── WORKFLOW.md
│   │   ├── TASKS.md
│   │   └── CONTEXT.md
│   ├── 5-quality/                     # Testing & evaluation
│   │   ├── EVAL.md
│   │   ├── FEEDBACK_LOOP.md
│   │   └── TESTING.md
│   ├── 6-security/                    # Security & privacy
│   │   ├── SECURITY.md
│   │   └── DATA_PRIVACY.md
│   └── 7-operations/                  # Setup, deploy, decisions
│       ├── SETUP.md
│       ├── DEPLOYMENT.md
│       └── DECISIONS.md
│
├── frontend/                          # Next.js web application
│   ├── src/
│   │   ├── app/                       # App router pages
│   │   ├── components/                # React components
│   │   ├── lib/                       # Utilities & API client
│   │   └── styles/                    # CSS / design tokens
│   ├── public/                        # Static assets
│   ├── package.json
│   └── next.config.js
│
├── backend/                           # Python FastAPI backend
│   ├── app/
│   │   ├── api/                       # API route handlers
│   │   ├── core/                      # Config, security, deps
│   │   ├── models/                    # Pydantic models / DB models
│   │   ├── services/                  # Business logic
│   │   │   ├── extraction/            # PDF parsing & text extraction
│   │   │   ├── rag/                   # RAG pipeline (embed, retrieve)
│   │   │   ├── mapping/               # Template field mapping
│   │   │   └── generation/            # LLM structured output
│   │   └── utils/                     # Helper functions
│   ├── tests/                         # pytest tests
│   ├── requirements.txt
│   └── pyproject.toml
│
├── eval/                              # Evaluation datasets & scripts
│   ├── datasets/                      # Test PDFs and templates
│   ├── results/                       # Eval run outputs
│   └── run_eval.py                    # Evaluation runner
│
└── scripts/                           # Utility scripts
    ├── setup.sh / setup.ps1
    └── seed_data.py
```

---

## Communication Protocol

When an agent needs to communicate something to the other agent:

1. **Immediate**: Write to `docs/4-coordination/CONTEXT.md` under the appropriate section
2. **Task request**: Add a new entry to `docs/4-coordination/TASKS.md` with `assigned: <other-agent>`
3. **Decision needed**: Add to `docs/7-operations/DECISIONS.md` with status `PENDING`
4. **Blocking issue**: Add `⚠️ BLOCKED` prefix in `CONTEXT.md` — the user will mediate

---

## Forbidden Actions

- ❌ Do NOT delete or overwrite another agent's code without user approval
- ❌ Do NOT install dependencies outside your zone without documenting in `DECISIONS.md`
- ❌ Do NOT hardcode API keys, secrets, or credentials anywhere — use `.env`
- ❌ Do NOT skip writing tests for new features
- ❌ Do NOT modify `AGENTS.md` without explicit user instruction
- ❌ Do NOT work on a task already marked `in_progress` by the other agent
- ❌ Do NOT push directly to `main` — always use feature branches (except first initial commit)
- ❌ Do NOT commit files in `.gitignore` — especially `.env`, `uploads/`, `eval/datasets/` with real data
- ❌ Do NOT commit files containing API keys, passwords, tokens, or user PII
- ❌ Do NOT forget to push — always commit AND push at checkpoints (see Rule 7)
