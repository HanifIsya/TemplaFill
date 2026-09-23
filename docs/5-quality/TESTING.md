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

| Level | Scope | Speed | Count (target) | Tool |
|-------|-------|-------|-----------------|------|
| Unit | Single function/component | < 1 sec each | 100+ | pytest (BE), Vitest (FE) |
| Integration | Multi-component interaction | < 10 sec each | 30+ | pytest + httpx (BE) |
| E2E | Full user flow | < 60 sec each | 10+ | Playwright |
| Eval | Extraction accuracy | < 120 sec total | 5+ datasets | Custom eval runner |

---

## Backend Testing

### Test Directory Structure
```
backend/
├── tests/
│   ├── conftest.py                    # Shared fixtures
│   ├── unit/
│   │   ├── test_pdf_extractor.py      # PDF text/table extraction
│   │   ├── test_chunker.py            # Text chunking
│   │   ├── test_embedder.py           # Embedding generation
│   │   ├── test_retriever.py          # RAG retrieval
│   │   ├── test_extractor.py          # Structured extraction
│   │   ├── test_template_parser.py    # Template field detection
│   │   ├── test_field_mapper.py       # Field mapping logic
│   │   └── test_doc_generator.py      # Document generation
│   ├── integration/
│   │   ├── test_pipeline.py           # Full extraction pipeline
│   │   ├── test_api_upload.py         # Upload endpoint
│   │   ├── test_api_extract.py        # Extraction endpoint
│   │   ├── test_api_download.py       # Download endpoint
│   │   └── test_api_fields.py         # Field edit endpoints
│   └── fixtures/
│       ├── sample_source.pdf          # Test PDF (small, 5 pages)
│       ├── sample_template.docx       # Test template with placeholders
│       ├── sample_template.xlsx       # Test spreadsheet template
│       └── expected_output.json       # Expected extraction results
```

### Running Backend Tests
```bash
# All tests
cd backend && pytest -v

# Unit tests only
cd backend && pytest tests/unit/ -v

# Integration tests only
cd backend && pytest tests/integration/ -v

# With coverage
cd backend && pytest --cov=app --cov-report=html -v

# Specific test file
cd backend && pytest tests/unit/test_pdf_extractor.py -v

# Run tests matching a pattern
cd backend && pytest -k "test_extract" -v
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

### Test Structure
```
frontend/
├── src/
│   ├── __tests__/                     # Global test utilities
│   │   └── setup.ts
│   ├── components/
│   │   ├── FileUpload/
│   │   │   ├── FileUpload.tsx
│   │   │   └── FileUpload.test.tsx
│   │   ├── FieldReview/
│   │   │   ├── FieldReview.tsx
│   │   │   └── FieldReview.test.tsx
│   │   └── ...
│   └── lib/
│       ├── api.ts
│       └── api.test.ts
```

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
