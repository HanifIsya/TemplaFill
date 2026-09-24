# Testing Strategy

> Defines testing approach, structure, and commands for both frontend and backend.

---

## Testing Pyramid

```
        ┌─────────┐
        │  E2E    │  Few, slow, high confidence
        │ Tests   │  (Playwright / Cypress)
        ├─────────┤
        │ Integr- │  Moderate count, medium speed
        │ ation   │  (API + pipeline tests)
        ├─────────┤
        │  Unit   │  Many, fast, focused
        │ Tests   │  (pytest + Jest/Vitest)
        └─────────┘
```

| Level | Scope | Speed | Count (actual) | Tool |
|-------|-------|-------|---------------|------|
| Unit | Single function/component | < 1 sec each | 167 backend (`test_*` 8+ suites) / 13 frontend | `pytest` (BE), `node --test` FE (`models.test.mjs` 5/5 + `e2e.test.mjs` 8/8, 106ms) |
| Integration | Multi-component interaction | < 10 sec each | 25 API + pipeline via `manager.process_job` + `generate_filled_document` | `pytest + httpx` (`test_api.py` covers upload/status/results/patch/re-extract/confirm/download/source page) |
| E2E | Full user flow | < 60 sec each | 13 lightweight (node) — Playwright planned but deferred; current `e2e.test.mjs` is full-flow via API contracts | `node --test` (see `frontend/src/tests/e2e.test.mjs`) |
| Eval | Extraction accuracy | < 120 sec total (actual 0.6s) | 5 synthetic datasets (26 fields) PASS `1.00` (halluc 0.00) | `eval/run_eval.py` `force_fake` offline |

---

## Backend Testing

### Test Directory Structure (actual `backend/tests/` flat, 167 collected)

```
backend/
├── tests/
│   ├── test_health.py                 # 8 tests: /health (status/model/ai_configured/timestamp) + /debug gate
│   ├── test_pdf_extraction.py         # 37 tests: fitz blocks/bbox + pdfplumber tables + PdfExtractionError paths
│   ├── test_chunker.py                # 20 tests: recursive 800/100, header metadata, page-aware overlap, char fallback
│   ├── test_rag.py                    # 19 tests: InMemory add/search (cosine), embedder fake dims 768, retriever top-K threshold
│   ├── test_generation_extractor.py   # 13 tests: FakeExtractor term-scoring (distinctive 0.85 guard) + Gemini batch + blacklist
│   ├── test_template_parser.py        # 24 tests: 5-syntax regex, docx/xlsx/pptx, header/footer, duplicate occurrences, warnings
│   ├── test_mapping_generator.py      # 20 tests: mapper exact/fuzzy/synonym + generator docx/xlsx/pptx style-preserving
│   ├── test_api.py                    # 25 tests: upload (%PDF/PK/size/415/413) → status → results (extracted_by) → PATCH edit/skip/confirm/re_extract → confirm/202 → download (RFC5987) → source/page
│   └── __init__.py
└── (no conftest/fixtures split yet — shared helpers inline; frontend tests live in frontend/src/tests/*.mjs)
```

### Running Backend Tests (offline-safe, no GEMINI_API_KEY required)

```bash
# All 167 tests
cd backend && pytest -v
# 167 collected in ~3s — every Embedder/Extractor uses force_fake=True fallback; InMemoryVectorStore needs no Postgres.

# With coverage
cd backend && pytest --cov=app --cov-report=term-missing --cov-report=xml -v

# Specific file
cd backend && pytest tests/test_generation_extractor.py -v
cd backend && pytest tests/test_api.py::TestUpload -v

# Match pattern (e.g., batch/blacklist)
cd backend && pytest -k "batch or blacklist or extract" -v

# Eval harness (reads regenerated datasets, uses same fake fallback)
python ../scripts/generate_eval_datasets.py
python ../eval/run_eval.py --dataset ../eval/datasets --output ../eval/results
# → TemplaFill Evaluation Report (5/5 PASS, 1.00 F1, 0.6s) + eval_run_*.json
```

### Coverage Target
| Module | Target |
|--------|--------|
| `services/extraction/` | ≥ 90% |
| `services/rag/` | ≥ 85% |
| `services/mapping/` | ≥ 90% |
| `services/generation/` | ≥ 85% |
| `api/` | ≥ 80% |
| **Overall** | **≥ 85%** |

### Key Test Cases (Backend)

**PDF Extraction**:
- Extract text from single-page PDF
- Extract text from multi-page PDF
- Extract tables from PDF with tables
- Handle PDF with no text (graceful error)
- Handle corrupt PDF file (graceful error)
- Handle password-protected PDF (clear error message)

**Template Parsing**:
- Detect `{{field}}` placeholders in .docx
- Detect `{field}` placeholders in .docx
- Detect `[field]` placeholders in .xlsx cells
- Detect placeholders across multiple sheets (.xlsx)
- Detect placeholders in .pptx text frames
- Handle template with no placeholders (clear message)
- Handle template with duplicate placeholder names

**RAG Pipeline**:
- Chunking produces reasonable chunk sizes (500-1000 tokens)
- Chunks retain page number metadata
- Embedding dimensions match expected (768)
- Retrieval returns top-K chunks sorted by relevance
- Retrieval for absent field returns low-confidence chunks

**Structured Extraction**:
- Extract simple text field (name)
- Extract date field with format parsing
- Extract numeric field (amount, percentage)
- Return null for field not in source
- Not hallucinate values

**Document Generation**:
- Replace placeholders in .docx preserving formatting
- Replace placeholders in .xlsx preserving cell formatting
- Replace placeholders in .pptx preserving slide layout
- Leave unreplaced placeholders for skipped fields

---

## Frontend Testing

### Test Structure (actual)

```
frontend/
├── src/
│   ├── app/page.tsx                 # Integration orchestrator under test via e2e
│   ├── components/*.tsx             # Navbar, DualDropzone, ProcessingView, ReviewMappingView, DownloadView, BackendWakingBanner, HelpModal, HistoryModal, Toast, ReExtract/Citation/AddField
│   ├── lib/{api.ts,types.ts,mockData.ts}
│   └── tests/
│       ├── models.test.mjs          # 5/5: type invariants, mapping helpers
│       └── e2e.test.mjs             # 8/8 full-flow 106ms (upload → polling batch → results engineUsed hybrid/fallback → edit/generate)
```

*No `__tests__/setup.ts` / per-component `*.test.tsx` split yet — deferred per early spec; build verified via `next build` + `eslint`.*

### Running Frontend Tests
```bash
# All tests
cd frontend && npm test

# Watch mode
cd frontend && npm test -- --watch

# Coverage
cd frontend && npm test -- --coverage

# Specific file
cd frontend && npm test -- FileUpload
```

### Key Test Cases (Frontend)
- File upload accepts valid PDF
- File upload rejects invalid file types
- File upload shows progress bar
- Processing page shows phase progression
- Review page renders all fields
- Field edit updates value inline
- Confidence badge shows correct color
- Source reference panel opens on click
- Download button triggers file download
- Responsive layout adapts to mobile

---

## E2E Testing

### Tool: Playwright

### Test Scenarios
```
e2e/
├── tests/
│   ├── upload-and-process.spec.ts     # Full happy path
│   ├── field-editing.spec.ts          # Edit, skip, re-extract
│   ├── download.spec.ts              # Download filled document
│   ├── error-handling.spec.ts         # Invalid files, network errors
│   └── responsive.spec.ts            # Mobile viewport tests
```

### Running E2E Tests
```bash
# Run all E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test upload-and-process
```

---

## CI/CD Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest --cov=app -v

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --watchAll=false --coverage

  eval:
    runs-on: ubuntu-latest
    needs: backend-tests
    if: contains(github.event.head_commit.message, '[eval]') || contains(github.event.pull_request.labels.*.name, 'eval')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - run: pip install -r backend/requirements.txt
      - run: cd eval && python run_eval.py --dataset datasets/ --output results/
```
