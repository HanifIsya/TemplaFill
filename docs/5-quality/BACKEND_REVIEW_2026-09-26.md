# Backend Review — 2026-09-26

> **Author**: OpenCode · **Branch**: `feat/oc-backend-review` · **Scope**: full `backend/app/` review after Phase 6 tier work.
> Companion tests: `backend/tests/test_review_fixes.py` (28 regression tests).

## Summary

| Severity | Found | Fixed | Deferred |
|---|---|---|---|
| HIGH | 8 | 8 | 0 |
| MEDIUM | 15 | 11 | 4 |
| LOW | 20 | 10 | 10 |

Closed-loop verification: **282 backend tests green** (254 + 28 new), offline eval PASS for both `--provider gemini` and `--provider deepseek`, upload→results→patch→confirm→download E2E smoke OK.

---

## HIGH — fixed

| # | File | Finding | Fix |
|---|------|---------|-----|
| H1 | `generation/extractor.py`, `mapping/generator.py` | Double-fill: a substituted value containing another placeholder was re-scanned and rewritten (the "brace-in-value" class ADR-017 claimed fixed). | `_replace_in_text` now performs ONE left-to-right pass over the original text; replacement output is never re-scanned. Exact caller keys are regex alternatives (longest first) so `<<<a>>>` no longer leaves `<V>` residue. |
| H2 | `mapping/generator.py`, `mapping/parser.py` | xlsx structured references (`=SUM(Table1[Amount])`) were parsed as `[Amount]` fields and rewritten to `=SUM(Table1100)` — silent corruption. | Formula cells are skipped unless they contain an unambiguous `{{ }}`/`<< >>`/`__` placeholder. |
| H3 | `mapping/generator.py` | Formula/DDE neutralization bypassed when the template cell is itself a formula (`={{x}}` stayed a live formula). | If the substituted result starts with `=`, the cell is stored as literal text (`data_type='s'`). |
| H4 | `privacy/masker.py` | Prefixed phone numbers leaked their tail (`Telepon: (031) 567-8901` → `[TOKEN_PHONE_1]-8901` sent to the LLM). | Phone pattern now consumes full multi-segment numbers; regression tests assert no digit tail survives. |
| H5 | `privacy/masker.py` | With ≥10 tokens of one category, `unmask` rewrote `TOKEN_PHONE_1` inside `TOKEN_PHONE_10` (substring match), corrupting values. | Longest-token-first + word-boundary regex; also fixed backslash/`\1` expansion via lambda replacement. |
| H6 | `rag/embedder.py` | Live embedding path issued one HTTP call per text (100/batch) with only one rate-limit slot per batch → free-tier 429 bursts; batch path effectively dead. | One batched request preferred; per-text fallback rate-limits each call individually. |
| H7 | `rag/embedder.py` | `gemini-embedding-001` dimensionality (3072 default) never requested; fake 768-dim vectors silently excluded from live search. | `output_dimensionality=self.dims` is requested; fakes honour `dims`. |
| H8 | `mapping/generator.py` | Docx fill collapsed all runs into one and lost mixed formatting + hyperlinks (README claimed style preservation). | Run-preserving in-place replacement for single-run matches; multi-run spans keep the first run's formatting without nuking others. |

## MEDIUM — fixed

| # | File | Finding | Fix |
|---|------|---------|-----|
| M1 | `mapping/generator.py` | Control characters in extracted values crashed docx/xlsx generation (500 on confirm). | XML-illegal control chars stripped in `_clean_field_value`. |
| M2 | `mapping/generator.py` | Single-asterisk markdown stripping corrupted arithmetic (`5 * 3 * 2` → `5  3  2`). | Only `**bold**` is stripped. |
| M3 | `mapping/parser.py`, `mapping/generator.py` | Footer tables and nested tables were neither parsed nor filled. | Both now scanned recursively (parity with header tables). |
| M4 | `mapping/mapper.py` | Date/amount synonym families collapsed into each other, cross-filling `due_date`/`invoice_date`, `amount`/`total`. | Families separated; regression tests pin non-cross-fill. |
| M5 | `mapping/mapper.py` | Fuzzy matching at 0.7 mapped unrelated short names (`date` ← `rate`). | Short targets (<8 chars) require ≥0.85. |
| M6 | `rag/chunker.py` | Header metadata was the last header on the page (often a `key: value` line), mislabelling every chunk. | Header detected per chunk from its own start position; `key: value` lines rejected as headers. |
| M7 | `rag/chunker.py` | Overlap was taken from the already-overlapped previous chunk, compounding across chunks. | Overlap taken from the original chunk. |
| M8 | `core/key_pool.py` | Constructing any component with an explicit key silently clobbered the shared global key pool (and its quota state). | Explicit keys create an isolated per-instance pool; the global pool is settings-only. |
| M9 | `extraction/table_extractor.py` | `_table_to_extracted([None, ...])` raised `TypeError` before its own None guard; fallback loop was unwrapped. | Emptiness test tolerates None rows; fallback conversion wrapped. |
| M10 | `extraction/table_extractor.py` | `extract_tables_with_fallback` swallowed `PdfPasswordProtectedError`, returning `[]` for protected PDFs. | Password errors re-raised. |
| M11 | `extraction/pdf_extractor.py` | Dead `if not pdf_bytes: pass` block + redundant `except PdfCorruptError` with contradictory comment. | Collapsed into one documented handler. |

## MEDIUM — deferred (documented)

| # | File | Finding | Why deferred |
|---|------|---------|--------------|
| D1 | `mapping/generator.py` | Docx theme colours (`w:themeColor`) not reapplied when `rgb` is None. | Cosmetic; needs theme XML handling. |
| D2 | `mapping/parser.py` | Single-brace/square patterns can false-positive on prose (`{ to open }`, `[Smith 2020]`). | Changing pattern strictness risks breaking the documented 5-syntax contract; needs a product decision. |
| D3 | `mapping/parser.py`, `generator.py` | pptx group tables and slide notes not scanned. | Low real-world frequency; follow-up task. |
| D4 | `rag/chunker.py` | `_split_by_chars` can exceed `chunk_size` for dense-token text (CJK/base64). | Needs token-aware re-slicing; current behavior is bounded by config and tested with slack. |

## LOW — fixed

- `rag/vector_store.py`: async/sync search now share one body (consistent dim-mismatch skip); misleading `[0,1]` cosine comment corrected; unused imports removed.
- `rag/retriever.py`: default embedder no longer forced fake (dimension mismatch with real stores); dead `RetrievalResult` removed.
- `rag/embedder.py`: legacy `text-embedding-004` docstring corrected; `print` replaced with `logging`; unused `os`/numpy/`types` cleanup.
- `rag/chunker.py`: unreachable `step <= 0` guard removed; unused dataclass imports removed; dead `_detect_header` removed.
- `extraction/text_extractor.py`: dead `PdfEmptyError` import and stale docstring line removed.
- `mapping/generator.py`: `Any` now imported (annotation resolution); dead `_FORMULA_TRIGGERS` and dead `norm in direct_map` branch removed; BOM added to formula triggers.
- `privacy/masker.py`: labeled bank-account bound widened to 24 digits; unlabeled-NIK limitation documented explicitly (by design — avoids masking order/reference numbers).

## LOW — deferred (documented)

- `PgVectorStore` remains an in-memory stub (unreachable until a no-arg `get_vector_store()` caller exists).
- `retrieve_sync`/`embed_texts_sync` raise inside a running event loop (script/test convenience only).
- Per-table/per-block exceptions still swallowed silently (best-effort by design; now at least consistent).

## Verification commands

```bash
cd backend && python -m pytest -q          # 282 passed
cd eval && python run_eval.py --dataset datasets --output results                    # PASS
cd eval && python run_eval.py --provider deepseek --dataset datasets --output results # PASS
```
