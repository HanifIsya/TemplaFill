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
| Unit | Single function/component | < 1 sec each | **214 backend** (11 suites) / **13 frontend** | `pytest` (BE), `node --test` FE (`models.test.mjs` 5/5 + `e2e.test.mjs` 8/8, 106ms) |
| Integration | Multi-component interaction | < 10 sec each | 25 API + 34 security-hardening (`test_security_hardening.py`) + pipeline via `manager.process_job` + `generate_filled_document` | `pytest` (`test_api.py` covers upload/status/results/patch/re-extract/confirm/download/source page + auth 404s) |
| E2E | Full user flow | < 60 sec each | 13 lightweight (node) — Playwright still deferred; `e2e.test.mjs` is full-flow via API contracts | `node --test` (see `frontend/src/tests/e2e.test.mjs`) |
| Eval | Extraction accuracy | < 120 sec total (actual 0.6s) | 5 synthetic datasets (26 fields) PASS `1.00` (halluc 0.00) | `eval/run_eval.py` `force_fake` offline (per-provider `--provider gemini\|deepseek` ships with task 6.8) |

---

## Backend Testing

### Test Directory Structure (actual `backend/tests/` flat, 214 collected)

```
backend/
├── tests/
│   ├── test_health.py                 # /health (status/model/ai_configured/timestamp) + /debug gate (404 when DEBUG=false)
│   ├── test_pdf_extraction.py         # 37 tests: fitz blocks/bbox + pdfplumber tables + PdfExtractionError paths
│   ├── test_chunker.py                # 20 tests: recursive 800/100, header metadata, page-aware overlap, char fallback
│   ├── test_rag.py                    # 19 tests: InMemory add/search (cosine), embedder fake dims 768, retriever top-K threshold
│   ├── test_generation_extractor.py   # Gemini batch + blacklist + FakeExtractor term-scoring
│   ├── test_template_parser.py        # 24 tests: 5-syntax regex, docx/xlsx/pptx, header/footer, duplicate occurrences, warnings
│   ├── test_mapping_generator.py      # mapper exact/fuzzy/synonym + generator docx/xlsx/pptx style-preserving + formula guard
│   ├── test_api.py                    # 25 tests: upload → status → results → PATCH → confirm → download → source/page + TestAuthorization (404 without job token)
│   ├── test_security_hardening.py     # 34 tests: session tokens, rate limits, body cap, ZIP guard, CORS, debug gate, quotas
│   └── __init__.py
└── (no conftest/fixtures split — shared helpers inline; frontend tests live in frontend/src/tests/*.mjs)
```

### Running Backend Tests (offline-safe, no API keys required)

```bash
# All tests
cd backend && pytest -q
# 214 collected in ~10s — Embedder/Extractor use force_fake=True fallback; InMemoryVectorStore needs no Postgres.

# With coverage
cd backend && pytest --cov=app --cov-report=term-missing --cov-report=xml -v

# Specific file / tier subset (Phase 6)
cd backend && pytest tests/test_generation_extractor.py -v
cd backend && pytest -k "auth or tier or quota or deepseek" -v

# Eval harness (offline fake; --provider flag arrives with task 6.8)
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
# All tests (node test runner — no watch/coverage flags; use the exact script)
cd frontend && npm test

# Lint + typecheck/build (CI does all three)
cd frontend && npm run lint
cd frontend && npm run build

# Single file
cd frontend && node --test src/tests/e2e.test.mjs
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

## Tier System Test Matrix (Phase 6)

> Design reference: `docs/2-architecture/TIER_ARCHITECTURE.md` §8.
> Rules: CI runs **offline** (no real API keys); the pro path must prove **zero Google calls**.

| # | Scenario | Layer | Expected | Owner |
|---|----------|-------|----------|-------|
| T1 | Login with correct shared credentials | BE integration | 200 + `{tier:"pro", token}` + HttpOnly cookie | OpenCode |
| T2 | Login with wrong password / unknown user | BE integration | generic 401, constant-time compare, no user enumeration | OpenCode |
| T3 | Login brute force | BE unit | `auth` limiter → 429 + `Retry-After` after 5/min/IP | OpenCode |
| T4 | Tier token used as job token (and vice versa) | BE unit | rejected — `purpose` claim isolation | OpenCode |
| T5 | Upload without tier token | BE integration | `Job.tier = "free"`, Gemini path, response `"tier":"free"` | OpenCode |
| T6 | Upload with valid tier token | BE integration | `Job.tier = "pro"`, DeepSeek path, response `"tier":"pro"` | OpenCode |
| T7 | **Zero-Google-on-pro** | BE integration | Gemini extractor/embedder monkeypatched to raise; pro job still completes | OpenCode |
| T8 | Free quota: 6th upload in a day per IP | BE integration | 429 `QUOTA_EXCEEDED` + `Retry-After`, quota endpoint counts down | OpenCode |
| T9 | Pro daily cap reached | BE integration | 429 `QUOTA_EXCEEDED` (cost guard) | OpenCode |
| T10 | DeepSeek API failure on pro job | BE integration | heuristic fallback + `engine_used:"heuristic"`, **never** `gemini` | OpenCode |
| T11 | Sequential batching merge (large doc, pro) | BE unit | consecutive batches merge to all requested fields | OpenCode |
| T12 | DeepSeek fake extractor accuracy | Eval | meets `EVAL.md` thresholds (`--provider deepseek`) | OpenCode |
| T13 | Login modal happy path + wrong password UI | FE test | badge switches to `Account · DeepSeek` | Antigravity |
| T14 | Quota banner at 5/day + account-request email shown | FE test | contact email `hanif.isya.annafi-2024@fst.unair.ac.id` visible | Antigravity |
| T15 | Free-tier Google disclosure on landing/upload | FE test | notice rendered for anonymous users | Antigravity |
| T16 | `tf_history` localStorage write/read/clear | FE test | schema per TIER_ARCHITECTURE §6 | Antigravity |
| T17 | Engine badge renders `deepseek` | FE test | badge + provenance mapping | Antigravity |
| T18 | Full flow both tiers | FE E2E (`e2e.test.mjs`) | free flow + login→pro flow green | Antigravity |

---

## E2E Testing

### Current tool: node test runner (`frontend/src/tests/e2e.test.mjs`)
- 8 full-flow scenarios against API contracts, 106 ms, runs in CI.
- Phase 6 extends it with the T18 tier flows (free + logged-in).

### Planned tool (still deferred): Playwright
```
e2e/
├── tests/
│   ├── upload-and-process.spec.ts     # Full happy path
│   ├── field-editing.spec.ts          # Edit, skip, re-extract
│   ├── download.spec.ts              # Download filled document
│   ├── tier-login.spec.ts             # Login modal → pro tier badge (Phase 6)
│   ├── quota-exceeded.spec.ts         # 5/day free cap → account request (Phase 6)
│   ├── error-handling.spec.ts         # Invalid files, network errors
│   └── responsive.spec.ts            # Mobile viewport tests
```

```bash
npx playwright test          # when adopted
npx playwright test --ui
npx playwright test upload-and-process
```

---

## CI/CD Test Pipeline (actual: `.github/workflows/ci.yml`)

Runs on every push and PR; all jobs are required and **offline** (no API keys):

| Job | What it runs |
|-----|--------------|
| **Backend tests** | `pip install -r backend/requirements.txt` → `pytest --cov=app` (214 tests) + coverage upload |
| **Frontend tests** | `npm ci` → `npm run lint` → `npm run build` (typecheck) → `npm test` (13) |
| **Evaluation** | regenerate datasets → `run_eval.py` (5/5 PASS, offline fake) |
| **Security audit** | `pip-audit -r backend/requirements.txt` — **blocking** (VULN-13) |
| **Docker build sanity** | image build (no push) |

`deploy.yml` (push to `main`) deploys backend → Render, frontend → Vercel; Vercel runs its own preview deployment per PR.

Phase 6 additions: tier/auth/quota tests land inside the Backend job; eval gains `--provider deepseek` (fake mode) inside the Evaluation job — no workflow redesign needed.
