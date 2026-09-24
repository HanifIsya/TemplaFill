# Changelog

All notable changes to TemplaFill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — v0.2.0 Hardening (2026-09-24 → present)

### Added
- **Batch Extraction & Engine Provenance (ADR-013/014)**: `generation/extractor.py:165` `FakeExtractor.extract_batch()` + `GeminiExtractor.extract_batch()` single-prompt consolidation (all fields in 1 JSON call, >90% fewer requests), `_BLACKLISTED_MODELS`, `_MIN_CALL_INTERVAL=1.2s`, 429/503 exponential backoff, `extracted_by` (`gemini`|`heuristic`) + `fallback_reason` on `ExtractionResult` / `FieldResult` / `Job` (`manager.py:299`, `jobs/models.py:53`), surfaced via `/api/jobs/{id}/results` `engine_used`/`has_fallback` + `GET /api/health` `ai_configured`/`model`, and frontend badges `[Gemini 3.6 Flash]`/`[Fallback]` + amber banner + toasts in `ReviewMappingView.tsx` + `page.tsx:235`
- **Phase-Faithful Pipeline UX (ADR-015, 2026-09-24)**: `JobManager.process_job` now sets `JobStatus.extracting` / `phase="ai_extraction"` / `percent=80` before `extract_batch()` (18% sweep 80→98 over fields) so `ProcessingView` correctly animates *4/4: Structured Extraction via Gemini 3.6 Flash* during 30–60s call; `api.ts:213` maps `pct>=75`/`status=extracting` to the same label
- **Security Hardening Complete (ADR-012, VULN-1→10)**: Rate limiter enforced on upload (10/hr), write (30/min), re-extract (5/min) with `testclient` exemption; `sanitize_filename()` + `sanitize_text_input(max_len=5000/2000)` on all entry points; RFC 5987 `Content-Disposition: filename*=UTF-8''...` + `X-Content-Type-Options: nosniff` on download; no raw `str(e)` leak; `/api/debug/gemini` gated by `DEBUG=True`; `/docs`/`openapi.json` disabled when `DEBUG=False`; CORS restricted to explicit methods/headers; CSP `frame-ancestors 'none'` + `HSTS preload` in `next.config.ts` + `vercel.json`

### Changed
- **Model Standardization**: Default model migrated `gemini-2.0-flash` → `gemini-1.5-flash` (fix 404) → `gemini-3.7-flash`/`3.8` (ADR-011) → `gemini-2.5-flash` (`ADR-015`) → **`gemini-3.6-flash`** (current, `config.py:50`, `render.yaml:30`, `extractor.py:200`). `embedder.py:107` sanitizes legacy `text-embedding-004` → `gemini-embedding-001` (768d, batch 100, 15 RPM). Candidate chain: `3.6 → 3.5 → 3.5-lite → 3.7 → 3.8` (`extractor.py:220`)
- **Frontend Polish**: Demo assets replaced with real binaries (`public/samples/sample_contract.pdf` %PDF, `sample_template.docx` PK), `api.ts` `checkHealth(7s)`/`waitForBackend(5s×12)` added (`BackendWakingBanner.tsx`), mock `downloadUrl` now points to static asset; filter tabs/confidence badges/icons refined; all banner and toast copy switched to professional English (hybrid/fallback notices) for general-audience accessibility
- **Infra Docs**: `render.yaml` python blueprint (`HEALTHCHECK /api/health`, `PORT` dynamic), `docker-compose.yml` comment `hot reload for dev`, `.env.example` Supabase pooling URL `6543?pgbouncer=true`

### Fixed
- **Render Free-Tier Resilience**: Frontend `uploadFiles()` now waits 6×5s when `502/503/timeout` before throwing `Backend is waking up (Render Hobby cold start ~60s)`; `page.tsx:99` wake polling `12×5s` with `Retry now`; `manager.py:133` catches `PdfExtractionError` vs generic `Exception`; `DownloadView` direct asset branch for `demo-` sessions
- **Extraction Reliability**: `_call_gemini_with_fallback()` (2 attempts/candidate) plus `_throttle_call()` eliminates 15 RPM burst 429s; daily quota `20/day` now blacklists and advances rather than backing off in-loop; `FakeExtractor` distinctive-term guard (`0.5→0.85` threshold) prevents hallucination drift that caused initial eval `0.79` → `1.00` after ADR-013

### Tests & Eval
- **Backend**: `165 → 167` pytest (added `test_generation_extractor.py:2` batch+blacklist, all suites still offline-safe via `get_extractor(force_fake=True)` / `get_embedder(force_fake=True)`)
- **Frontend**: `13/13` (`models.test.mjs` 5/5 + `e2e.test.mjs` 8/8, 106ms) + `next build` + `eslint` green; `eval` 1.00 PASS (5 datasets, hallucination 0.00, placeholder 1.00) in 0.6s via GitHub Actions
- **CI**: `ci.yml` now runs `pytest --cov` + `npm ci`/`lint`/`build` + `eval` (5 datasets) + `pip-audit` + `docker/build-push-action` (gha cache); `deploy.yml` renders service on `main`

---

## [0.1.0] - 2026-09-23 — MVP Release

### Added — Backend (OpenCode, `feat/oc-backend-scaffold`)
- **Phase 0 Scaffold**: FastAPI `app/main.py:1` (CORS `localhost:3000`, GZip, SecurityHeaders), `app/core/config.py:1` (pydantic-settings), `requirements.txt` + `pyproject.toml`, `GET /api/health` — 8 tests `tests/test_health.py:1`
- **Phase 1 Pipeline**: PDF text `extraction/text_extractor.py:1` (PyMuPDF blocks/metadata) + table `table_extractor.py:1` (pdfplumber lattice/text) → `pdf_extractor.py:1` (ExtractedDocument) — 37 tests; chunker `rag/chunker.py:1` (recursive 800/100, header metadata) 20 tests; vector store `rag/vector_store.py:1` (InMemory+PgVector stub, cosine) + embedder `rag/embedder.py:1` (text-embedding-004 768d, fake fallback) + retriever `rag/retriever.py:1` (top-K) 19 tests; extractor `generation/extractor.py:1` (Gemini JSON + Fake term-scoring, 11 tests); parser `mapping/parser.py:1` (docx/xlsx/pptx `{{}}`/`<<>>`/`[]`/`__` 24 tests); mapper `mapping/mapper.py:1` (exact/fuzzy/synonym) + generator `mapping/generator.py:1` (preserve formatting) 20 tests
- **Phase 2 API**: `app/services/jobs/manager.py:1` (queued→completed), `app/api/upload.py:1` (50MB PDF/20MB template, %PDF/PK, 202) + `app/api/jobs.py:1` (status/results/patch/re-extract/confirm/download/source page) — 25 tests; total **165 pytest green**
- **Phase 4 Eval**: 5 synthetic datasets `eval/datasets/{hr,finance,education,legal,general}` via `scripts/generate_eval_datasets.py:1` + `eval/run_eval.py:1` (precision/recall/F1/hallu/not-found/placeholder) — baseline 0.79→1.00 after hallucination guard, `eval PASS 1.00` in 0.6s
- **Phase 5 Polish**: CI/CD `.github/workflows/ci.yml:1` (backend 165+cov, frontend lint/build, eval, docker) + `deploy.yml`, Docker `backend/Dockerfile:1` (3.11-slim, HEALTHCHECK, non-root) + `docker-compose.yml:1` (pgvector+redis+backend), security `app/core/security.py:1` (CSP/HSTS, RequestId, sanitization, rate limiter)

### Added — Frontend (Antigravity, `feat/ag-frontend-scaffold`)
- **Phase 0/3**: Next.js 16.3.6 scaffolding, Design System (IBM Plex, slate/indigo), `DualDropzone.tsx` (drag&drop), `ProcessingView.tsx` (4-phase radar), `ReviewMappingView.tsx` (citation), `ReExtractModal`/`AddFieldModal`/`HistoryModal`, `DownloadView`, `Navbar`/`Footer`, `AuthModal.tsx:1` (login/register/anonymous) + `HelpModal.tsx:1` (4 tabs)
- **Quality**: `frontend/src/tests/models.test.mjs:1` 5/5 + `e2e.test.mjs:1` 8/8 pass, `next build` & `eslint` 100% green, `vercel.json:1` (headers, Next.js)

### Infrastructure
- Repository initialized with documentation-first approach
- Git branching `main` ← `feat/oc-*` + `feat/ag-*` per `WORKFLOW.md:9`, 140→165 tests, eval 1.00, Docker ready

## Version History

- **v0.1.0** (2026-09-23): Initial MVP — end-to-end PDF → template fill, RAG pipeline, multi-format, API, eval, CI/CD, Docker, security audit pass
