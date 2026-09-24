# TemplaFill — User Guide & Operations Manual

> **Version**: 1.0.1 (doc sweep 2026-09-24, code is `gemini-3.6-flash` / `gemini-embedding-001` / `167 tests`)  
> **Target Audience**: End-users, Legal Analysts, Operations Teams, Administrators  
> **Last Updated**: 2026-09-24 · **Code references**: `frontend/src/lib/api.ts:23`, `backend/app/services/mapping/parser.py:32`, `backend/app/services/generation/extractor.py:220`  

---

## 1. Introduction

**TemplaFill** is an AI-powered document automation web application that extracts structured variables, terms, tables, and clauses from source PDF documents (contracts, financial reports, transcripts, resumes, filings) and automatically maps and populates them into multi-format template documents (`.docx`, `.xlsx`, `.pptx`).

Unlike generic chatbot interfaces that hallucinate when fed hundred-page documents, TemplaFill utilizes a localized **Retrieval-Augmented Generation (RAG)** pipeline with semantic chunking and embedding-guided retrieval to pull verbatim facts with exact page and snippet citations.

---

## 2. Supported Template Formats & Syntax

TemplaFill inspects template files and preserves 100% of the original document's typography, styles, branding, headers, and table structures.

### Supported Formats
| Format | Extension | Template Elements Supported |
|--------|-----------|-----------------------------|
| **Microsoft Word** | `.docx` | Paragraphs, tables, headers, footers, callouts |
| **Microsoft Excel** | `.xlsx` | Cells across all worksheets, formatted tables |
| **Microsoft PowerPoint** | `.pptx` | Slide body text frames, title boxes, slide tables |

### Placeholder Syntax Conventions
TemplaFill recognizes **five** standard placeholder syntax styles (`backend/app/services/mapping/parser.py:32` `_PLACEHOLDER_PATTERNS`, priority-ordered with `used_spans` dedup):

1. **Double Braces (Recommended, highest priority)**:
   ```text
   {{client_name}}
   {{effective_date}}
   {{total_consideration}}
   ```
2. **Double Angle Brackets**:
   ```text
   <<client_name>>
   <<governing_law>>
   ```
3. **Square Brackets**:
   ```text
   [client_name]
   [notice_period_days]
   ```
4. **Single Braces**:
   ```text
   {client_name}
   {notice_period}
   ```
5. **Double Underscores**:
   ```text
   __client_name__
   __authorized_signatory__
   ```

- **Case-insensitive + whitespace-normalized**: `{{  Client_Name }}` → `client_name` via `_normalize_field_name` (`[\s.\-]→_`, lower).
- **Validation**: Warnings if 0 placeholders detected or `field_name>50 chars`; duplicate `normalized` names collapse with `occurrences++` (visible as single card, count in tooltip).
- *Naming Tip*: Use snake_case (e.g. `{{party_b_address}}`) for highest precision — `FakeExtractor` term-scoring (`0.85` threshold for distinctive terms) biases toward exact matches.

---

## 3. End-to-End User Flow

### Step 1: Document Upload
1. Navigate to the **TemplaFill** dashboard.
2. In the **Source PDF** dropzone, drop or browse your text-based PDF (up to 50 MB, up to 500 pages).
3. In the **Template Document** dropzone, drop your `.docx`, `.xlsx`, or `.pptx` template (up to 20 MB).
4. *Optional*: Click **Load Demo Dataset** to test with pre-configured legal contract and summary templates.
5. Click **Start AI Extraction Pipeline**.

### Step 2: Processing & Pipeline Stages
The application processes documents through 4 transparent stages with real-time radar + `percent/phase` polling (`GET /api/jobs/{id}`):
1. **Document Parsing & Validation** (`15%→25%`): Extracting text layers + table structures via PyMuPDF (text+metadata) and pdfplumber (tables/layout); validates `%PDF`/`PK` magic beyond extensions; on `PdfExtractionError` job fails with actionable toast.
2. **Semantic Chunking & Embedding** (`35%→55%`): Recursive 800-token chunks with 100-token overlap and header metadata (`rag/chunker.py`), batched embeddings via `gemini-embedding-001` (768d, 100/batch, 4s/15 RPM throttle) → `InMemoryVectorStore` (or `pgvector` prod), with deterministic fake fallback so pipeline never blocks offline.
3. **Template Inspection** (`55%→70%`): Detecting placeholders across Word paragraphs/tables/headers, Excel cells (all sheets), PowerPoint text frames + group shapes — 5 syntaxes, case-insensitive.
4. **Structured RAG Extraction** (`80%→98%` `ai_extraction`, ADR-015): Dedupes top-3 chunks per field (≤10 total), then **single-prompt batch** `gemini-3.6-flash` call (`extractor.py:426`) listing all fields → `{"extractions": [...]}` with `confidence` + `source_page` + `snippet`; candidate fallback `3.6→3.5→3.5-lite→3.7→3.8` with 404 blacklist + 1.2s pacing + 429/503 backoff; missing fields auto-heuristic-recovered; every field records `extracted_by` (`gemini`|`heuristic`|`hybrid`) + `fallback_reason` for the Review banner/badge.

### Step 3: Review & Edit Mapping
TemplaFill offers two layout modes:
- **Split Preview**: Displays field cards on the left side with a live source citation snippet and page preview on the right side.
- **Table View**: Compact spreadsheet-style overview ideal for templates with 20+ fields.

#### Working with Fields:
- **Inline Value Editing**: Click any value or the pencil icon → `PATCH /jobs/{id}/fields/{id}` `action=edit` + `sanitize_text_input(5000)`; confidence resets to `1.0`; progress toast `Field Updated`.
- **Confidence Badge** (`confidenceLevel` derived: `≥0.8 high`, `0.5–0.8 medium`, `<0.5 low`):
  - 🟢 **High (≥80%)** + `[Gemini 3.6 Flash]` badge: Verbatim `extracted_by=gemini`
  - 🟡 **Medium (50%–79%)**: Check snippet — often heuristic-recovered (`extracted_by=heuristic`)
  - 🔴 **Low (<50%) / Not Found**: `status=not_found`, `confidence=0.0` — needs manual entry or skip
- **Engine Provenance Banner (ADR-014)**: Top amber notice distinguishes `Gemini 100%` vs `Hybrid (partial AI + local)` vs `Heuristic Fallback` + `fallback_reason` tooltip (`GEMINI_API_KEY missing` / `404 Not Found` / `429 quota`); per-field hover shows the same.
- **View Source Citation**: **View Citation** → `GET /jobs/{id}/source/page/{n}?highlight=…` modal with `page_number/total_pages + content + tables[{headers, rows}]`; verbatim `≤200 char` snippet highlighted.
- **Re-Extract with Hint**: **Re-Extract** → `POST /jobs/{id}/fields/{id}/re-extract` (`hint` ≤2000 chars, `5/min` rate limit) with targeted prompt (e.g., *"Look at Schedule C on page 12"*); returns `previous_value`→`new_value` + confidence; toast `Field Re-extracted`.
- **Add Custom Field**: **Add Field** (`AddFieldModal`) inserts an ad-hoc field not originally templated — mapped for `confirm` generation.
- **Skip Field**: Toggle **Skip** (`action=skip`) — field omitted from `mapped` on `POST /confirm`; visual gray strike-through. **Filter Tabs** (All / Extracted / Not Found / Edited / Skipped) and **Confirm** checkboxes added 2026-09-24.

### Step 4: Confirm & Export
1. Click **Confirm & Generate Document**.
2. Download your generated file:
   - **Filled Document**: Preserves all native formatting with fields populated.
   - **Audit Trail Summary**: JSON/PDF log of all extracted values, confidence scores, and manual edits.

---

## 4. User Accounts & Session Modes

TemplaFill offers both guest anonymous access and registered accounts:

| Feature | Anonymous Guest | Registered Pro Account |
|---------|-----------------|------------------------|
| Account Required | No | Yes (Email + Password) |
| Daily Extractions | 3 fills / day | Unlimited |
| Local Session History | Last 5 sessions | Cloud persistent history |
| Custom Presets | Local only | Synchronized presets |
| Cost | Free | Free tier (MVP) / Pro |

---

## 5. Security & Privacy Safeguards (see `SECURITY.md` + `DATA_PRIVACY.md` + ADR-012 VULN-1→10)

- **Zero AI Training / Logging**: User documents never written to logs; free-tier Gemini data may be used by Google for improvement per `ADR-007` (upgrade to paid+DPA for production). 167 backend tests + eval pass without any live Gemini key via fake fallback.
- **In-Memory & Ephemeral Storage**: InMemory jobs + `./uploads` (24h auto-delete) + pgvector lifetime tied to job; `CLEANUP` via hourly cron in prod (`SECURITY.md`), currently in-memory boards clear on restart.
- **In-Flight Encryption & Headers**: TLS 1.3 + strict CSP (`default-src 'self'; frame-ancestors 'none'`), `nosniff`/`DENY`/`HSTS preload`/`Referrer-Policy`/`Permissions-Policy` triple-enforced in `backend/app/core/security.py:28` + `frontend/next.config.ts:24` + `frontend/vercel.json:33`.
- **OWASP & Validation Compliance (ADR-012)**: `sanitize_filename()` strips `../`/null/path traversal + `sanitize_text_input` scrubs control codes (5000 edit / 2000 hint) + `validate_file_magic` (`%PDF`/`PK`) + `sanitize_filename` on `Content-Disposition: filename*=UTF-8''...` (RFC 5987) + no `str(e)` leak + `DEBUG` gates `/api/debug/gemini` + `docs` disabled when `DEBUG=False` + CORS whitelist + rate limit `10/hr, 30/min, 5/min` (CI exempt). Formula injection `= + - @` stripped on xlsx.

---

## 6. Frequently Asked Questions (FAQ)

#### Q: Can TemplaFill handle scanned PDFs?
**A**: TemplaFill requires digital text layers. For scanned physical papers, ensure you run standard optical character recognition (OCR) beforehand.

#### Q: What happens if a placeholder in the template is not found in the PDF?
**A**: The field is marked with low confidence / `not_found`. You can either manually enter the value, skip the field, or provide a re-extract hint.

#### Q: Are tables in Excel and Word supported?
**A**: Yes. Placeholders inside table cells (e.g. `{{q1_revenue}}`) are fully supported and populated without breaking column widths or cell borders.
