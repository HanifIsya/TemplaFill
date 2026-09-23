# Changelog

All notable changes to TemplaFill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing pending — v0.1.0 released to `main`._

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
