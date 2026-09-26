# TemplaFill 📄✨

> **AI-Powered Document Field Extraction & Multi-Format Template Population Engine**  
> *Extract precise structured data from unstructured PDF documents via Retrieval-Augmented Generation (RAG) and Google Gemini 3.6 Flash (with deterministic heuristic fallback), then automatically map and populate variables into Microsoft Word (`.docx`), Excel (`.xlsx`), and PowerPoint (`.pptx`) templates while preserving 100% of original formatting, layouts, and styles. An optional **account tier** processes documents on DeepSeek with zero Google calls.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203.6%20Flash%20%7C%20DeepSeek-4285F4?logo=google)](https://ai.google.dev/)
[![Embeddings](https://img.shields.io/badge/Embeddings-gemini--embedding--001-blue)](https://ai.google.dev/)
[![Evaluation Benchmark](https://img.shields.io/badge/Evaluation%20F1-1.00%20(5%20Domains)-success)](docs/5-quality/EVAL.md)
[![Test Suite](https://img.shields.io/badge/Tests-214%20Pytest%20%7C%2042%20Frontend-brightgreen)](tests/)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture & Workflow](#-system-architecture--workflow)
- [Template Formats & Placeholder Syntax](#-template-formats--placeholder-syntax)
- [Dual-Engine Resilience & Fallback Strategy](#-dual-engine-resilience--fallback-strategy)
- [User Interface & Verification Workflow](#-user-interface--verification-workflow)
- [Repository Structure](#-repository-structure)
- [Local Installation Guide](#-local-installation-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup (FastAPI)](#1-backend-setup-fastapi)
  - [2. Frontend Setup (Next.js)](#2-frontend-setup-nextjs)
- [Environment Configuration (.env)](#-environment-configuration-env)
- [REST API Reference](#-rest-api-reference)
- [Evaluation Benchmarks & Test Suite](#-evaluation-benchmarks--test-suite)
- [Security, Privacy & Data Compliance](#-security-privacy--data-compliance)
- [Production Deployment](#-production-deployment)
- [License](#-license)

---

## 🌟 Overview

In legal, financial, procurement, and administrative workflows, organizations expend countless hours manually transferring information from unstructured source documents (e.g., commercial agreements, audited financial statements, resumes, vendor invoices, academic transcripts) into standardized institutional templates. This manual transcription is labor-intensive, costly, and inherently prone to human error.

**TemplaFill** automates this end-to-end pipeline with mathematical precision:

1. **Input 1 (Source Document)**: Unstructured PDF document containing domain data.
2. **Input 2 (Template Document)**: Standard office template (`.docx`, `.xlsx`, or `.pptx`) containing placeholder fields (5 syntax variants, case-insensitive).
3. **Automated Pipeline**: High-fidelity PDF text and table parsing (PyMuPDF + pdfplumber) $\rightarrow$ Recursive semantic chunking (800 tokens / 100 overlap, header metadata) $\rightarrow$ Dense semantic vector embedding (`gemini-embedding-001`, 768 dimensions, batched 100) $\rightarrow$ Adaptive retrieval (≤15 chunks: full context, zero retriever calls; >15: sparse top-K 3 for 8 fields, deduped ≤12) $\rightarrow$ **Selective PII Masking** (Sanitize high-entropy identifiers: NPWP, NIK, Bank Accounts, Emails, Phones into surrogate tokens) $\rightarrow$ Single-prompt batch structured extraction via Google Gemini (candidate fallback: `gemini-3-flash-preview` / `gemini-3.6-flash`, multi-key rotation on 429/503/timeout + REST fallback) $\rightarrow$ Deterministic heuristic fallback engine (zero-downtime) $\rightarrow$ Post-extraction restoration (Unmasking real values) $\rightarrow$ Atomic placeholder replacement (whole `{{field}}` → value, brace-free) with style preservation.
4. **Output Document**: Fully populated template document preserving 100% of the original typography, run-level formatting, table designs, formulas, and slide compositions, with per-field citations and engine provenance.

TemplaFill is built with a **Guest-First** philosophy and strict **Zero Data Retention** architecture, eliminating mandatory account registration and ensuring that user documents remain private and ephemeral. Users who need a Google-free, higher-quota engine can request the shared **account tier** (DeepSeek) shown in the tier section below.

---

## ⚡ Key Features

- 🧠 **Dual-Engine Extraction Architecture** (ADR-017/018 verified on 51-field real contract `51/51 gemini`):
  - **Primary**: Google Gemini (`gemini-3-flash-preview` / `gemini-3.6-flash`, auto-blacklisted on 404/503/quota, multi-key rotation pool with 1.2s pacing + 2.0s backoff + 20s timeout + REST fallback via `httpx`/`urllib`) combined with `gemini-embedding-001` (768d, batch 100, 15 RPM). Single-prompt batch reduces API calls by >90%; adaptive 15-chunk bypass drops small-doc embedding calls `51→0` (large: `8`), eliminating the 15 RPM burst that caused 0 output tokens in production.
  - **Zero-Downtime Heuristic Fallback**: Deterministic term-scoring + difflib + email/phone regex takes over instantly on 429/503/404/missing key. Every field records `extracted_by` (`gemini`/`heuristic`/`hybrid`) + `fallback_reason` for full transparency. Document generation never fails — and now brace-free.
- 🔒 **Selective PII Masking (Zero-Leakage AI Processing, ADR-018)**:
  - Automated regex pseudonymization intercepts document text before transmission to Google Gemini. Sensitive personal and financial identifiers (**NPWP, NIK/KTP, Bank Accounts, Emails, Phone numbers**) are converted to surrogate tokens (`[TOKEN_NPWP_1]`, `[TOKEN_REK_1]`). Real data never reaches external AI servers and is automatically unmasked on the local server upon response.
  - **100% Semantic Preservation**: Structural elements (Company names `PT`/`CV`, Representative names & titles, narrative scopes, dates, amounts) remain unmasked so LLM reasoning and role disambiguation stay flawless.
- 🎯 **100% Document Style Preservation (brace-free, ADR-017)**:
  - Populates Word paragraphs and tables, Excel workbooks, and PowerPoint slides without corrupting fonts/weights/colors/formulas/borders. Generator (`generator.py:61`) now replaces whole enclosed placeholders atomically (`{{field}}→value` sorted by length) via `_find_placeholders` + `_normalize_field_name`; validated `{{value}}` residue no longer appears (was `{{SPK/0847}}`, now `SPK/0847`).
- 📝 **Universal Placeholder Syntax**:
  - Supports 5 standard syntax conventions: `{{field_name}}`, `{field_name}`, `[field_name]`, `<<field_name>>`, and `__field_name__` with priority-ordered regex, case-insensitivity, and whitespace normalization (`backend/app/services/mapping/parser.py:32`).
- 🔍 **Granular Citations & Audit Trail**:
  - Generates explicit confidence scores (*High $\ge$ 80%*, *Medium 50%–79%*, *Low < 50%*), exact source PDF page citations, and verbatim snippet excerpts for every extracted variable.
- ✏️ **Human-in-the-Loop Verification**:
  - Review mapped fields in real time, modify values directly via inline editing, or trigger targeted re-extractions using contextual instruction hints.
- 🚀 **Two Tiers — Free & Account (Phase 6)**:
  - **Free tier** (default, anonymous): Google Gemini, capped at **5 jobs/day per IP**, with an honest disclosure that Google's free API may use prompt data.
  - **Account tier** (shared-credential sign-in by request): DeepSeek engine with **zero Google calls** (no Gemini extraction or embeddings), higher daily cap, and a request-an-account flow (`hanif.isya.annafi-2024@fst.unair.ac.id`). Navbar badge shows `Free · Gemini` / `Account · DeepSeek`.
- 🛡️ **Zero Data Retention**:
  - Ephemeral session memory processing. User files and extracted information are purged upon job completion or session termination, with zero data utilized for model training. Session history lives only in the browser (`tf_history`).

---

## 🏗️ System Architecture & Workflow

```mermaid
graph TD
    subgraph Client ["Client Layer (Next.js 16 App Router)"]
        UI["Industrial Dark UI System (IBM Plex Sans/Mono)"]
        Dropzone["Dual-Dropzone File Uploader (PDF + Template)"]
        Review["Review & Verification View (Citations + Confidence + Engine Badge)"]
        Download["Document Export & Audit Summary"]
    end

    subgraph Server ["Application Server (FastAPI Engine)"]
        API["FastAPI REST Controller"]
        RateLimiter["InMemory Rate Limiter (Token Bucket: 10/hr upload, 30/min write)"]
        PDFParser["PDF Parser & Chunker (PyMuPDF + pdfplumber, 800/100 tokens)"]
        Embedder["Vector Embedder (gemini-embedding-001, 768d, batch 100)"]
        RAG["Vector Store (InMemory / pgvector) & Adaptive Retriever (≤15 chunks: 0 calls; >15: Top-K 3 ×8 →12)"]
        GeminiExt["Structured Batch Extractor (Gemini 3.6 Flash, single-prompt, REST fallback)"]
        FallbackExt["Deterministic Heuristic & Regex Matcher (term-scoring + difflib)"]
        DocEngine["Template Population Engine (brace-free atomic replace, style-preserving)"]
    end

    subgraph External ["External Services"]
        GoogleAI["Google AI Studio / Gemini API (candidates 3.6 → 3.5 → 3.7/3.8)"]
        Supabase["Supabase Postgres + pgvector (Optional Persistent Vector Store)"]
    end

    Dropzone -->|1. Multipart Upload (50MB PDF / 20MB template, %PDF/PK validated)| API
    API --> RateLimiter
    RateLimiter --> PDFParser
    PDFParser -->|Extracted Pages + Tables + Chunks (Test source 2 pages)| Embedder
    Embedder -->|768d Vector Embeddings (throttled 15 RPM, bypassed if ≤15 chunks)| GoogleAI
    Embedder --> RAG
    RAG -->|Adaptive Chunks (≤15: all chunks, 0 calls; >15: deduped 12 max)| GeminiExt
    GeminiExt -->|Single JSON Batch Request (all fields, REST fallback, 35s timeout)| GoogleAI
    GeminiExt -.->|Fallback on 404 / 429 / 503 / Missing Key| FallbackExt
    GeminiExt -->|Extracted Fields + Citations + engine_used| Review
    FallbackExt -->|Extracted Fields + Citations + fallback_reason| Review
    Review -->|Confirmed Payload (skipped fields omitted)| DocEngine
    DocEngine -->|Populated Binary Document (brace-free, RFC 5987 filenames)| Download
```

---

## 📐 Template Formats & Placeholder Syntax

TemplaFill provides native support for standard office document file formats:

| Format | Extension | Target Elements | Core Library |
|---|---|---|---|
| **Microsoft Word** | `.docx` | Paragraphs, Data Tables, Text Runs, Headers, Footers, Sections | `python-docx` |
| **Microsoft Excel** | `.xlsx` | Worksheet Cells (all sheets), Named Tables, Structured Grid Columns | `openpyxl` |
| **Microsoft PowerPoint** | `.pptx` | Text Frames, Shape Objects, Slide Layouts, Tables, Group Shapes | `python-pptx` |

### Supported Placeholder Syntaxes

Templates may incorporate placeholder identifiers in any of the following 5 formats (detection is priority-ordered to avoid double-counting, all with whitespace normalization):

```text
1. Double Curly Braces (Recommended):
   {{client_name}}
   {{total_contract_value}}
   {{effective_date}}

2. Square Brackets:
   [client_name]
   [payment_terms]

3. Double Angle Brackets:
   <<client_name>>
   <<vendor_address>>

4. Double Underscores:
   __client_name__
   __authorized_signatory__
```

> **Parsing Highlights:**
> - **Case-Insensitive**: `{{Client_Name}}` matches `{{client_name}}` without manual mapping.
> - **Whitespace Normalization**: Internal padding such as `{{   contract_date   }}` is parsed cleanly as `contract_date`.
> - **Run-Level Style Preservation**: When placeholders contain specific formatting (e.g., bold, italic, custom fonts, or theme colors), TemplaFill injects the replacement text while preserving all original run attributes.

---

## 🤖 Dual-Engine Resilience & Fallback Strategy

TemplaFill is architected for mission-critical reliability and zero-failure operations:

```
                  ┌───────────────────────────────┐
                  │    Field Extraction Request   │
                  └──────────────┬────────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │  Google Gemini 3.6 Flash      │
                 │  (RAG + Single-Prompt Batch)  │
                 │  Candidates: 3.6 → 3.5 → 3.7  │
                 └───────────────┬───────────────┘
                                 │
                   [ Success ] ──┴── [ HTTP 404 / 429 / 503 / Missing Key ]
                        │                        │
                        ▼                        ▼
         ┌────────────────────────┐   ┌────────────────────────┐
         │ Semantic AI Output     │   │ Deterministic Heuristic│
         │ With Citations +       │   │ Engine (Zero Downtime) │
         │ extracted_by=gemini    │   │ extracted_by=heuristic │
         └────────────────────────┘   └────────────────────────┘
                              \ Hybrid (partial gemini + partial heuristic) /
```

1. **Primary AI Engine (Gemini 3.6 Flash, batch-patched ADR-015 + ADR-017 bypass)**:
   - Leverages Google Generative AI for nuanced understanding of legal clauses, financial tables, and semantic nuance in a **single consolidated JSON prompt** for all fields (reduces API calls by >90%). For small-medium docs (≤15 chunks, e.g., your 6-page 51-field contract), **no retriever embedding calls** are made — all chunks are sent directly (`manager.py:224` bypass), eliminating the `51× retrieve→51× embed` burst that caused `15 RPM → 0 output tokens` in your AI Studio screenshot.
   - Vector representations are computed via `gemini-embedding-001` (768 dimensions, batch 100, throttled 4s/15 RPM). Legacy `text-embedding-004` identifiers are auto-sanitized to `gemini-embedding-001` (`backend/app/services/rag/embedder.py:107`).
   - Candidate progression: `gemini-3.5-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite` → `gemini-3.7-flash` (reordered for free-tier availability, `extractor.py:218`), with **404/503 blacklisting** (`_BLACKLISTED_MODELS` + immediate advance) and exponential backoff on 429 + 35s timeout + REST fallback via `httpx`/`urllib` when the SDK client is unavailable (`extractor.py:517`).
   - `/api/health` reports `ai_configured` and active `model` (`backend/app/api/health.py:19`), so the frontend banner can detect waking vs. misconfiguration. `Vercel→Render` routing now auto-detects `templa-fill.vercel.app` via `getApiBaseUrl()` (`frontend/src/lib/api.ts:13`), fixing the `localhost:8000` mock-fallback you observed.
2. **Deterministic Heuristic Fallback Engine (validated `51/51 fallback→gemini` on Test source)**:
   - If Gemini returns 404, 429 (`RESOURCE_EXHAUSTED` or daily `20/day`), 503 (`UNAVAILABLE`), or no `GEMINI_API_KEY`, the system shifts to local term-scoring + difflib + regex matchers. Every `FieldResult` records `extracted_by` and `fallback_reason` (`backend/app/services/generation/extractor.py:45`, `backend/app/services/jobs/models.py:53`), surfaced as `[Gemini 3.6 Flash]` vs `[Fallback]` badges and a hybrid banner in `ReviewMappingView.tsx`. Your 51-field contract now extracts `51/51` with `confidence 1.0` once the 15 RPM bypass is applied, instead of stalling at `0/51`.
   - **Result**: Users never experience fatal halts — they receive an explicit amber notice instead of silent degradation, and the filled document never shows `{{value}}` residue (generator now atomic, `generator.py:61`).

---

## 🖥️ User Interface & Verification Workflow

The frontend is crafted using a **High-Contrast Dark Industrial Theme** prioritizing ergonomics, operational speed, and visual clarity:

- **System Status Bar**: Provides live indication of backend operational state (`API LIVE` / `DEV SIMULATION`) plus engine provenance (`Gemini 3.6 Flash` vs `Fallback`) via `/api/health` (`ai_configured`, `model`).
- **Cold-Start Resilience**: Detects Render Hobby idle-wake cycles (15 min sleep → ~60s wake) and displays an automated countdown banner (`BackendWakingBanner.tsx`) with 5s×12 polling and manual retry triggers (`frontend/src/lib/api.ts:90` `waitForBackend`). Banner now shows `Contacting API at https://templafill-backend.onrender.com/api` on Vercel instead of `localhost:8000` (`api.ts:13` `getApiBaseUrl()`), fixing the prod-mock routing you encountered.
- **Review & Verification Matrix + Engine Transparency (ADR-014)**:
  - 🟢 **High Confidence ($\ge$ 80%)** + `[Gemini 3.6 Flash]` badge: Verbatim match with clear source context.
  - 🟡 **Medium Confidence (50%–79%)**: Inferred from surrounding semantic context.
  - 🔴 **Low Confidence (< 50%) / Not Found**: Ambiguous or missing from source text.
  - **Engine Badges**: Every field shows `[Gemini 3.6 Flash]` or `[Fallback]` with hoverable `fallback_reason`; top banner distinguishes `Gemini 100%` vs `Hybrid (partial AI + heuristic)` vs `Heuristic Fallback` with toast notifications in `frontend/src/app/page.tsx:235`.
- **Direct Inline Editing & Confirm Filters**: Modify any extracted value immediately; filter fields by status (All / Extracted / Not Found / Edited) and trust tier.
- **Contextual Re-Extraction**: Invoke the re-extraction modal with targeted natural language prompts (e.g., *"Extract the second witness signatory from page 4"*), routed to `POST /api/jobs/{id}/fields/{id}/re-extract` (5/min per IP) with sanitized `hint` (max 2000 chars).
- **Pipeline Phase Fidelity (ADR-015)**: `JobManager` now sets `status=extracting` / `percent=80` before `extract_batch()`, so the processing view correctly animates Phase 4 “Structured Extraction via Gemini 3.6 Flash” with spinner during the 30–60s LLM call.
- **Session History Drawer**: Access previously processed sessions directly in the browser via `localStorage` (`templafill_recent_sessions`) without requiring user credentials; download past outputs via `HistoryModal.tsx`.

---

## 📁 Repository Structure

```
e:\TemplaFill\
├── AGENTS.md                          # Single source of truth for AI agents
├── README.md                          # Primary project documentation (this file)
├── CHANGELOG.md                       # Version changelog (Keep a Changelog + SemVer)
├── .env.example                       # Environment configuration template (safe to commit)
├── .gitignore                         # Git exclusion rules (public-repo privacy guard)
├── render.yaml                        # Render Blueprint (python, /api/health, gemini-3.6-flash)
├── docker-compose.yml                 # Local dev stack (pgvector:pg16 + redis + backend)
│
├── docs/                              # Comprehensive engineering documentation
│   ├── 1-product/                     # PRD, Vision, User Stories, User Guide
│   ├── 2-architecture/                # Architecture, Tech Stack, Data Models, API Specs
│   ├── 3-design/                      # UI/UX Specifications and Design System
│   ├── 4-coordination/                # Task Tracker, File Ownership, Agent Workflows, Context Log
│   ├── 5-quality/                     # Testing Strategies and Evaluation Benchmarks
│   ├── 6-security/                    # Security Controls and Data Privacy Principles
│   └── 7-operations/                  # Setup Guides, Deployment Plans, and ADRs (DECISIONS.md)
│
├── frontend/                          # Next.js 16.3.6 Web Application (App Router)
│   ├── src/
│   │   ├── app/                       # Routes (page.tsx, layout.tsx, globals.css)
│   │   ├── components/                # React components (Navbar with tier badge, LoginModal, AccountRequestView, TierDisclosure, DualDropzone, ProcessingView, ReviewMappingView, CitationModal, ReExtractModal, AddFieldModal, HistoryModal, DownloadView, BackendWakingBanner, HelpModal, Toast)
│   │   ├── lib/                       # API client (api.ts with checkHealth/waitForBackend/login/logout/quota + tf_history), types.ts, tier.ts, mockData.ts
│   │   └── tests/                     # node --test suites (models.test.mjs, e2e.test.mjs, tier.test.mjs T13–T18)
│   ├── public/samples/                # Real binary demo assets (sample_contract.pdf, sample_template.docx)
│   ├── vercel.json                    # Vercel deployment headers + CSP/HSTS
│   ├── next.config.ts                 # Next.js config (securityHeaders, poweredByHeader:false)
│   └── package.json                   # Next 16.3.6, React 19.2, Tailwind 4, lucide-react
│
├── backend/                           # Python 3.11+ FastAPI Application
│   ├── app/
│   │   ├── main.py                    # Entrypoint (CORS, GZip, SecurityHeaders, RequestId)
│   │   ├── api/                       # Route handlers (health, upload, jobs: status/results/patch/confirm/download/re-extract/source)
│   │   ├── core/                      # config.py (pydantic-settings, gemini-3.6-flash defaults), security.py (CSP, rate limiter, sanitization)
│   │   ├── models/                    # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── extraction/            # PyMuPDF text & pdfplumber table → ExtractedDocument
│   │   │   ├── rag/                   # chunker.py (800/100), vector_store.py (InMemory/pgvector), embedder.py (gemini-embedding-001 768d), retriever.py (top-K)
│   │   │   ├── mapping/               # parser.py (5 syntaxes, docx/xlsx/pptx), mapper.py, generator.py (style-preserving fill)
│   │   │   ├── jobs/                  # manager.py (queued→processing→extracting→mapping→completed, tier-aware provider selection), models.py (Job/FieldResult with extracted_by)
│   │   │   └── generation/            # extractor.py (Gemini batch + FakeExtractor fallback, 404 blacklist), deepseek_extractor.py (account tier, no Google calls)
│   │   └── utils/                     # Helpers
│   ├── tests/                         # Pytest suite (214 passing tests incl. auth/quota/provider-selection)
│   ├── requirements.txt               # Pinned deps (FastAPI, PyMuPDF, pdfplumber, python-docx, openpyxl, python-pptx, google-genai, pgvector)
│   ├── Dockerfile                     # python:3.11-slim, non-root, HEALTHCHECK, 2 workers
│   └── pyproject.toml                 # Project meta + pytest/ruff/black/mypy config
│
├── eval/                              # Evaluation Datasets and Benchmark Runners
│   ├── datasets/{hr,finance,education,legal,general}/  # Synthetic PDFs + templates + ground_truth_01.json + README
│   ├── results/                       # eval_run_*.json (gitignored, artifact upload in CI)
│   └── run_eval.py                    # F1 benchmark (precision/recall/F1/hallucination/not_found/placeholder, PASS thresholds)
│
└── scripts/                           # Utility scripts (generate_eval_datasets.py: 5 domains, fitz/docx/openpyxl/pptx)
```

---

## 🚀 Local Installation Guide

### Prerequisites
- **Node.js** v18+ (or v20 LTS) & **npm**
- **Python** 3.11+
- **Git**
- *(Optional)* **Google Gemini API Key** obtained from [Google AI Studio](https://aistudio.google.com/apikey)

---

### 1. Backend Setup (FastAPI)

1. Navigate to the project root directory:
   ```bash
   cd e:\TemplaFill
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell:
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # Linux / macOS:
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Initialize the environment file:
   ```bash
   cp .env.example .env
   ```
   Configure your `GEMINI_API_KEY` within `.env` (get a free key from [Google AI Studio](https://aistudio.google.com/apikey)):
   ```env
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-3.6-flash
   GEMINI_EMBEDDING_MODEL=gemini-embedding-001
   DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/templafill
   CORS_ORIGINS=http://localhost:3000
   ```

5. Launch the FastAPI development server:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   *The backend service will be available at `http://localhost:8000`. Interactive OpenAPI documentation is accessible at `http://localhost:8000/docs` in debug mode.*

---

### 2. Frontend Setup (Next.js)

1. Open a new terminal session and navigate to the `frontend` folder:
   ```bash
   cd e:\TemplaFill\frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the local environment configuration:
   ```bash
   # Create frontend/.env.local:
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Open your browser and navigate to `http://localhost:3000`.*

---

## 🔐 Environment Configuration (.env)

The application supports the following configurable environment variables:

| Variable | Required | Default Value | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Optional | `""` | Google AI Studio API key (activates live LLM extraction; without it, heuristic fallback runs and all 214 tests still pass) |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Primary Gemini model (candidates: 3.6 → 3.5 → 3.5-lite → 3.7 → 3.8, auto-blacklisted on 404) |
| `GEMINI_EMBEDDING_MODEL` | No | `gemini-embedding-001` | Semantic embedding model (768 dimensions, batch 100; legacy `text-embedding-004` auto-sanitized) |
| `DEEPSEEK_API_KEY` | Optional | `""` | DeepSeek API key (account tier). Unset → tier system off, all jobs run free |
| `DEEPSEEK_MODEL` | No | `deepseek-flash` | DeepSeek model (account tier) |
| `DEEPSEEK_BASE_URL` | No | `https://api.deepseek.com` | OpenAI-compatible Chat Completions base URL |
| `TIER_ACCOUNT_USERNAME` | Optional | `""` | Shared account username (Phase 6) |
| `TIER_ACCOUNT_PASSWORD_HASH` | Optional | `""` | scrypt hash of the shared password (`scripts/hash_password.py`) |
| `FREE_JOBS_PER_DAY` | No | `5` | Free-tier daily cap per IP |
| `PRO_JOBS_PER_DAY` | No | `50` | Account-tier daily cap per IP (cost guard) |
| `DATABASE_URL` | No | `postgresql+asyncpg://...` | Connection URI for Supabase / PostgreSQL |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Whitelisted frontend origins (comma-separated) |
| `NEXT_PUBLIC_API_URL` | Yes (Frontend) | `http://localhost:8000/api` | Base URL for backend API requests |
| `MAX_SOURCE_FILE_SIZE_MB` | No | `50` | Maximum allowable source PDF size (MB) |
| `MAX_TEMPLATE_FILE_SIZE_MB`| No | `20` | Maximum allowable template document size (MB) |

---

## 📡 REST API Reference

The backend provides structured, type-safe REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health verification, uptime, API version, `ai_configured` + active `model` (no DB, fast wake detection) |
| `GET` | `/api/debug/gemini` | Gemini API connectivity probe (active only when `DEBUG=True`; 404 in production) |
| `POST` | `/api/auth/login` | Shared-credential sign-in → signed 30-day tier token + HttpOnly cookie (generic 401, `5/min/IP`) |
| `POST` | `/api/auth/logout` | Clear the tier cookie/token |
| `GET` | `/api/auth/quota` | `{free_used_today, free_limit, tier}` for the free-tier countdown |
| `POST` | `/api/upload` | Multipart upload for PDF source + template (50MB `%PDF`, 20MB `PK`, 202 + `job_id`); accepts `X-Session-Token` tier token, returns `tier`, `429 QUOTA_EXCEEDED` on daily cap |
| `GET` | `/api/jobs/{job_id}` | Job status, lifecycle stage, progress, and `tier` (`queued→processing→extracting→mapping→completed`) |
| `GET` | `/api/jobs/{job_id}/results` | Extracted fields with `confidence`, `source_reference`, `extracted_by` (`gemini`/`deepseek`/`heuristic`/`hybrid`), `fallback_reason`, overall metrics |
| `PATCH` | `/api/jobs/{job_id}/fields/{field_id}` | Edit / skip / confirm / re-extract (`re_extract` with sanitized `hint`) a field |
| `POST` | `/api/jobs/{job_id}/fields/{field_id}/re-extract` | Dedicated re-extract endpoint (5/min per IP, hint ≤2000 chars, returns `previous_value`/`new_value`) |
| `POST` | `/api/jobs/{job_id}/confirm` | Confirm mapped fields and trigger style-preserving generation (`mapped` skips empty/skipped, RFC5987 download name) |
| `GET` | `/api/jobs/{job_id}/download` | Stream filled document (`filled`/`summary`; correct `Content-Type` per extension, `Content-Disposition: filename*=UTF-8''...`) |
| `GET` | `/api/jobs/{job_id}/source/page/{page_number}` | Retrieve page text + tables for citation provenance (`highlight` param supported) |

---

## 📊 Evaluation Benchmarks & Test Suite

Extraction accuracy and model fidelity are verified across 5 synthetic domains (no PII, regenerated via `scripts/generate_eval_datasets.py`) using our automated benchmark harness (`eval/run_eval.py`, force-fake embeddings so suite is offline-safe):

| Document Domain | Dataset ID | Template | Fields | Precision | Recall | F1 | Hallucination | Status |
|---|---|---|---|---|---|---|---|---|
| **HR / Recruitment** | `hr_cv_01` | `offer_letter_template.docx` | 6 | 1.00 | 1.00 | **1.00** | 0.00 | PASS |
| **Finance / Invoicing** | `finance_01` | `quarterly_summary.xlsx` | 5 | 1.00 | 1.00 | **1.00** | 0.00 | PASS |
| **Education / Transcript** | `education_01` | `certificate_template.docx` | 5 | 1.00 | 1.00 | **1.00** | 0.00 | PASS |
| **Legal / Contracts** | `legal_01` | `summary_template.docx` | 5 | 1.00 | 1.00 | **1.00** | 0.00 | PASS |
| **General / Reporting** | `general_01` | `brief_template.docx` | 5 | 1.00 | 1.00 | **1.00** | 0.00 | PASS |
| **OVERALL BENCHMARK** | **5 Domains** | **37 Fields? 26 mapped*** | **26** | **1.00** | **1.00** | **1.00** | **0.00** | **OPTIMAL** |

> *Field counts are the ground-truth per-domain; overall pipeline covers 26 fields in current synthetic set (migrated from 37-field exploratory set). All metrics exceed `EVAL.md` thresholds: precision ≥0.90, recall ≥0.85, F1 ≥0.87, hallucination ≤0.02, not_found ≥0.95, placeholder_detection ≥0.95.*

### Executing Test Suites

```bash
# Backend Pytest (214 tests, offline-safe, no GEMINI_API_KEY required):
cd backend
pytest -v
pytest --cov=app --cov-report=term-missing   # coverage

# Synthetic dataset regeneration + F1 benchmark (~0.6s):
python scripts/generate_eval_datasets.py
python eval/run_eval.py --dataset eval/datasets --output eval/results

# Frontend (Next 16.3.6, 42 tests via node --test + next build):
cd frontend
npm test                # 42/42 (models.test.mjs + e2e.test.mjs + tier.test.mjs T13–T18)
npm run lint
npm run build           # static prerender + CSP headers

# Full-stack Docker sanity (pgvector:pg16 + redis + backend warm):
docker compose up -d && docker compose logs -f
```

---

## 🛡️ Security, Privacy & Data Compliance

TemplaFill adheres to strict defense-in-depth principles:

- 🔒 **Selective PII Masking (Zero-Leakage AI Architecture, ADR-018)**:
  - Document text chunks pass through automated pseudonymization before reaching Google Gemini endpoints.
  - **Sanitized & Masked**: Indonesian Tax IDs (**NPWP** 15/16 digits), National Citizen IDs (**NIK/KTP**), Bank Account Numbers (**Nomor Rekening**), **Email addresses**, and **Phone / WhatsApp numbers** are substituted with anonymous tokens (e.g. `[TOKEN_NPWP_1]`, `[TOKEN_REK_1]`).
  - **Preserved for 100% Accuracy**: Company names (`PT`/`CV`), authorized representative names & titles, narrative contract scopes, dates, financial amounts, and payment milestone terms remain untouched to ensure the LLM's semantic reasoning is never degraded.
  - **Local Restoration**: Surrogate tokens are safely unmasked on the local server post-extraction before template generation and user display.
- 📜 **Privacy Tiers & Zero Model Training**:
  - *Free Tier*: Google's free Gemini API may use prompt data to improve its products (disclosed in the UI). Selective PII Masking keeps masked identifiers off Google servers.
  - *Account Tier*: Documents are processed on DeepSeek with **zero Google calls** — no Gemini extraction and no Gemini embeddings. DeepSeek retention/training wording stays generic until its API terms are verified in writing (task 6.15).
- 🔒 **Zero Data Retention**: Document binaries, embeddings, and filled outputs are retained exclusively in volatile / ephemeral storage (in-memory jobs, `./uploads` 24h auto-delete, vector store tied to job lifetime; see `SECURITY.md` & `DATA_PRIVACY.md`). Session history is browser-local (`tf_history`) only.
- 🛡️ **Two-Tier Access (Phase 6)**: Free tier is anonymous (`5 jobs/day/IP`); the account tier uses a single shared credential (no self-registration) and issues a signed 30-day tier token (`purpose:"tier"`, mutually invalid with per-job tokens). Login is rate-limited `5/min/IP` with a generic 401.
- 🧱 **Injection & Validation Armor (VULN-1 → 10, ADR-012)**: `sanitize_filename()` strips `../`/null/path traversal; `sanitize_text_input(max_len=5000)` scrubs control codes; `validate_file_magic` enforces `%PDF`/`PK` beyond extensions; `sanitize_text_input` limits hints to 2000 chars; download `Content-Disposition` uses RFC 5987 `filename*=UTF-8''`; raw exception traces are never leaked to clients.
- 🛡️ **Defense-in-Depth Headers**: Enforced via `SecurityHeadersMiddleware` (`backend/app/core/security.py:28`) + `next.config.ts` + `vercel.json`: strict `Content-Security-Policy` (no `frame-ancestors`, limited `connect-src`), `HSTS preload`, `nosniff`, `DENY` frames, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` + `x-powered-by: false`. Rate limiting: 10/hr upload, 30/min write, 5/min re-extract, with `testclient` exemption for CI.

---

## 🚀 Production Deployment

The architecture is configured for **free-forever $0/mo** (Vercel Hobby 100GB + Render Hobby 750h + Supabase 500MB pgvector) and scales to paid plans via a single config change:

| Tier | Frontend | Backend | Database | File Store | Monthly Cost |
|------|----------|---------|----------|------------|--------------|
| **Free-forever (current)** | [Vercel Hobby](https://vercel.com) (edge, `vercel.json` CSP) | [Render Hobby](https://render.com) `$0` (0.1 CPU / 512 MB, `render.yaml` Blueprint, single `BackgroundTasks` worker, `HEALTHCHECK /api/health`) | [Supabase](https://supabase.com) 500 MB + `pgvector` (free forever vs Render Postgres 30-day) | Local `uploads/` or Supabase Storage 1GB | **$0** |
| **Scale** | Vercel Pro $20 | Railway/Render Standard $7+ | Supabase Pro $25 | R2 $0.015/GB | **~$52** |

- **Render Hobby cold-start**: Sleeps after 15 min idle, wakes ~60s. Handled via `BackendWakingBanner.tsx` + `api.ts:70` `waitForBackend(12×5s)` + keep-warm `GET /api/health` polling. Optional UptimeRobot 5-min ping (<720 req/month, within quota).
- **DB setup**: `CREATE EXTENSION IF NOT EXISTS vector;` + `alembic upgrade head` on Supabase; connection via `postgresql+asyncpg://` pooling (6543 pgbouncer).
- **CI/CD**: `.github/workflows/ci.yml` (backend 214 + coverage, frontend lint/build/42 tests, eval, pip-audit, docker sanity) + `deploy.yml` (Render deploy on `main`, Vercel auto-deploy).

---

## 📄 License

This repository is licensed under the terms of the [MIT License](LICENSE).  
Created with dedication by [Hanif Isya](https://github.com/HanifIsya).
