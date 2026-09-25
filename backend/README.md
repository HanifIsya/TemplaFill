# TemplaFill Backend

FastAPI backend for TemplaFill — AI-powered PDF → template extractor & filler (dual-engine: Gemini 3.6 Flash batch + deterministic heuristic fallback).

## Quick Start

```bash
# Create and activate venv (Windows)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Install deps (pinned in requirements.txt)
pip install -r requirements.txt

# Configure env (free-tier: GEMINI_API_KEY optional — fallback still passes 167 tests)
cp ../.env.example ../.env
# Edit .env: GEMINI_API_KEY, GEMINI_MODEL=gemini-3.6-flash, GEMINI_EMBEDDING_MODEL=gemini-embedding-001,
#           DATABASE_URL, CORS_ORIGINS=http://localhost:3000

# Run server (docs at /docs when DEBUG=true)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health check (lightweight, no DB — used for Render cold-start detection):  
`GET http://localhost:8000/api/health` → `{status, version, ai_configured, model, timestamp}`

Debug Gemini (only when `DEBUG=true`, 404 otherwise):  
`GET http://localhost:8000/api/debug/gemini`

API docs (debug mode): `http://localhost:8000/docs` · `http://localhost:8000/openapi.json`

## Testing

```bash
pytest -v                          # 180 tests (all offline-safe; no API key needed)
pytest --cov=app --cov-report=term-missing
pytest tests/test_api.py -v        # 25 API tests (upload/status/results/patch/re-extract/confirm/download)
pytest tests/test_privacy_masker.py -v # 8 PII masking tests
pytest tests/test_generation_extractor.py -v  # 14 batch/pii-masking/blacklist tests
```

Eval harness (force-fake embeddings, hallucination guard 1.00 PASS):

```bash
python ../scripts/generate_eval_datasets.py   # regenerates 5 synthetic domains (no PII)
python ../eval/run_eval.py --dataset ../eval/datasets --output ../eval/results
```

## Project Structure

```
app/
├── main.py                         # FastAPI entry (CORS localhost:3000, GZip 1KB+, SecurityHeaders, RequestId)
├── core/
│   ├── config.py                   # pydantic-settings (gemini-3-flash-preview, gemini-embedding-001 768d, enable_pii_masking)
│   ├── key_pool.py                 # Multi-key rotation pool with automatic failover
│   └── security.py                 # CSP/HSTS/RequestId, sanitize_filename/text, InMemoryRateLimiter (10/hr upload, 30/min write, 5/min re-extract)
├── api/
│   ├── health.py                   # GET /api/health + GET /api/debug/gemini (DEBUG gate)
│   ├── upload.py                   # POST /api/upload (multipart, %PDF/PK magic, 202)
│   └── jobs.py                     # GET /jobs/{id}, /results, PATCH /fields/{id}, POST confirm/download/re-extract/source/page/{n}
├── services/
│   ├── privacy/                    # masker.py (SelectivePIIMasker: NPWP, NIK, Bank Accounts, Emails, Phone numbers)
│   ├── extraction/                 # text_extractor.py (PyMuPDF blocks/bbox/metadata), table_extractor.py (pdfplumber), pdf_extractor.py (ExtractedDocument)
│   ├── rag/                        # chunker.py (recursive 800/100 + header), embedder.py (gemini-embedding-001 768d batch 100 / fake fallback), vector_store.py (InMemory+PgVector cosine), retriever.py (top-K)
│   ├── mapping/                    # parser.py (docx/xlsx/pptx, 5 syntaxes {{}} {}/<<>>/[]/__), mapper.py (exact/fuzzy/synonym), generator.py (preserve formatting)
│   ├── generation/                 # extractor.py (Gemini batch single-prompt + Fake term-scoring, 404/503 blacklist, multi-key pool, PII masking)
│   └── jobs/                       # manager.py (queued→processing→extracting(80%)→mapping→completed + BackgroundTasks), models.py (Job/FieldResult extracted_by, has_fallback)
├── models/                         # Pydantic schemas
└── utils/                          # Helpers
tests/                              # pytest: 180 total green tests (privacy, extractor, chunker, rag, pdf, template, generator, api, health)
```

### Key Behaviors (stay in sync with docs/2-architecture/* & ADR-012→018)

- **Selective PII Masking** (`privacy/masker.py`, ADR-018): Masks NPWP, NIK, Bank Accounts, Emails, Phone numbers into surrogate tokens before calling Gemini API, then restores real values on extraction. Preserves company names, titles, scopes, dates, and amounts for 100% extraction accuracy.
- **Batch extraction** (`extractor.py:560`): `extract_batch(fields, chunks)` consolidates all field prompts into 1 Gemini JSON call, reducing 429 risk by >90%; per-field fallback to heuristic if batch JSON incomplete.
- **Model candidates & Multi-Key Pool** (`extractor.py` + `key_pool.py`): Prioritizes `gemini-3-flash-preview` and `gemini-3.6-flash`, auto-rotates across comma-separated keys in `GEMINI_API_KEY` upon 429/quota exhaustion.
- **Embedding sanitization** (`embedder.py:107`): legacy `text-embedding-004` → `gemini-embedding-001`.
- **Phase tracking** (`manager.py:210`): sets `status=extracting, percent=80, phase=ai_extraction` before batch, so frontend spinner for Phase 4 is faithful.
- **Rate & safety** (`security.py` + `jobs.py`): every write path applies `sanitize_text_input(max_len=5000/2000)` and `sanitize_filename`; download uses RFC 5987 `filename*=UTF-8''`; raw exception `str(e)` never leaves the API.

## Docker

```bash
docker build -t templafill-backend ./backend
docker run -p 8000:8000 --env-file .env templafill-backend
# or full stack (pgvector:pg16 + redis + backend with hot reload in dev)
docker compose up -d && docker compose logs -f
```

Production start (Render Blueprint reads `render.yaml`):

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
```
