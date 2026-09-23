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
| 0.4 | Set up Next.js frontend project structure | `in_progress` | Antigravity | Scaffolding Next.js 14+ app — branch feat/ag-frontend-scaffold |
| 0.5 | Create `.env.example` with all required vars | `done` | Antigravity | Created at project root |

## Phase 1: Core Backend Pipeline (OpenCode)

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 1.1 | Implement PDF text extraction service | `todo` | OpenCode | PyMuPDF + pdfplumber |
| 1.2 | Implement PDF table extraction service | `todo` | OpenCode | pdfplumber / camelot |
| 1.3 | Implement text chunking strategy | `todo` | OpenCode | Semantic chunking for RAG |
| 1.4 | Set up vector database (pgvector) | `todo` | OpenCode | Embeddings storage |
| 1.5 | Implement embedding service | `todo` | OpenCode | Gemini embedding API |
| 1.6 | Implement RAG retrieval service | `todo` | OpenCode | Query → relevant chunks |
| 1.7 | Implement structured extraction via Gemini | `todo` | OpenCode | JSON schema output |
| 1.8 | Implement .docx template parser | `todo` | OpenCode | python-docx, detect placeholders |
| 1.9 | Implement .xlsx template parser | `todo` | OpenCode | openpyxl, detect placeholders |
| 1.10 | Implement .pptx template parser | `todo` | OpenCode | python-pptx, detect placeholders |
| 1.11 | Implement template field mapping engine | `todo` | OpenCode | Match extracted data → placeholders |
| 1.12 | Implement filled document generator | `todo` | OpenCode | Write extracted data into template |
| 1.13 | Write unit tests for extraction pipeline | `todo` | OpenCode | pytest |
| 1.14 | Write integration tests for full pipeline | `todo` | OpenCode | End-to-end source→template |

## Phase 2: API Layer (OpenCode)

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 2.1 | Implement file upload endpoint | `todo` | OpenCode | POST /api/upload |
| 2.2 | Implement extraction trigger endpoint | `todo` | OpenCode | POST /api/extract |
| 2.3 | Implement mapping preview endpoint | `todo` | OpenCode | GET /api/mapping/{id} |
| 2.4 | Implement field edit/correction endpoint | `todo` | OpenCode | PATCH /api/mapping/{id}/fields |
| 2.5 | Implement document generation endpoint | `todo` | OpenCode | POST /api/generate |
| 2.6 | Implement download endpoint | `todo` | OpenCode | GET /api/download/{id} |
| 2.7 | Implement async job status endpoint | `todo` | OpenCode | GET /api/jobs/{id} |
| 2.8 | Add API authentication middleware | `todo` | OpenCode | JWT or session-based |
| 2.9 | Write API endpoint tests | `todo` | OpenCode | pytest + httpx |

## Phase 3: Frontend (Antigravity)

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 3.1 | Implement design system / tokens | `todo` | Antigravity | Colors, typography, components |
| 3.2 | Build landing page | `todo` | Antigravity | Hero, features, CTA |
| 3.3 | Build file upload page | `todo` | Antigravity | Drag & drop, dual file upload |
| 3.4 | Build processing/loading page | `todo` | Antigravity | Progress indicator, job status |
| 3.5 | Build mapping preview page | `todo` | Antigravity | Side-by-side source ↔ template |
| 3.6 | Build field review/edit page | `todo` | Antigravity | Edit extracted values, source highlight |
| 3.7 | Build download/export page | `todo` | Antigravity | Download filled document |
| 3.8 | Build auth pages (login/register) | `todo` | Antigravity | If auth is needed for MVP |
| 3.9 | Integrate frontend with backend API | `todo` | Antigravity | API client matching API.md |
| 3.10 | Write frontend component tests | `todo` | Antigravity | Jest / Vitest |

## Phase 4: Evaluation & Optimization

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 4.1 | Create evaluation dataset (5+ doc pairs) | `todo` | OpenCode | Source PDF + template pairs |
| 4.2 | Implement eval runner script | `todo` | OpenCode | Precision/recall per field |
| 4.3 | Run baseline evaluation | `todo` | OpenCode | Record initial metrics |
| 4.4 | Optimize RAG retrieval (chunking, reranking) | `todo` | OpenCode | Based on eval results |
| 4.5 | Optimize prompt engineering | `todo` | OpenCode | Improve extraction accuracy |

## Phase 5: Polish & Deploy

| # | Task | Status | Assigned | Notes |
|---|------|--------|----------|-------|
| 5.1 | Security audit (encryption, auth) | `todo` | Both | Follow SECURITY.md |
| 5.2 | Performance optimization | `todo` | Both | Frontend + backend |
| 5.3 | Set up CI/CD pipeline | `todo` | OpenCode | GitHub Actions |
| 5.4 | Deploy backend (cloud) | `todo` | OpenCode | Follow DEPLOYMENT.md |
| 5.5 | Deploy frontend (Vercel) | `todo` | Antigravity | Follow DEPLOYMENT.md |
| 5.6 | End-to-end testing on staging | `todo` | Both | Full user flow |
| 5.7 | Write user documentation / help page | `todo` | Antigravity | In-app help |
