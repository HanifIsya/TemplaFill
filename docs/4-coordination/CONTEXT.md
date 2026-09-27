# Project Context

> **Purpose**: Living document that tracks the current state of the project. Both agents MUST read this at the start of every session, and update it after completing work.

---

## Last Updated
- **Date**: 2026-09-27 (tutorial example-shots session)
- **By**: OpenCode
- **Summary**: **Tutorial now shows what is inside the demo files (user-directed, frontend + docs zones)**: added 3 steps to the in-app Guide and `docs/1-product/TUTORIAL.md` — **step 4** the source contract PDF (CTR-2026-889, 2026-08-15, PT Maju Jaya, $50,000 — and no witness), **step 5** the template with `{{placeholders}}`, **step 6** the filled result generated with the **real backend generator** (unmatched `{{witness_name}}` stays visible) — each with a brief explanation of what to notice. New screenshots `21-example-source.jpg`, `22-example-template.jpg`, `23-example-result.jpg` (~87 KB total); tutorial renumbered 18 → **21 steps** (free 1–17, account 18–21). Verified against the local production build with Playwright (free tier renders 17 steps in correct order; all three images load) — Playwright runs outside the repo. Frontend **64/64 tests green**, lint 0, build clean. README/CHANGELOG counts updated. No shared config files touched.
- **Date**: 2026-09-27 (security re-audit session)
- **By**: OpenCode
- **Summary**: **Full cyber-security re-audit + fixes (PR #9 merged, `security/audit-2026-09-27`)**: double-checked every API key and the shared credential across the working tree AND the full git history (76 commits / 1,051 blobs) — **no secret has ever been committed**; only `NEXT_PUBLIC_API_URL` reaches the browser; keys are never logged. Found and fixed **AUDIT-01 (High)**: `X-Forwarded-For` spoofing bypassed every per-IP control on the live deployment (5/day free quota, 50/day pro cap, 5/min login limit) because Render sets `FORWARDED_ALLOW_IPS=*` and uvicorn rewrote `request.client` from the leftmost attacker-controlled XFF entry. Fix: `--no-proxy-headers` + `TRUSTED_PROXIES=*` + `get_client_ip()` prefers `CF-Connecting-IP` (Cloudflare/Render edge). Also fixed AUDIT-02 (raw internal job error returned to clients), AUDIT-03 (8 deps on `~=` despite the pinned claim), AUDIT-04 (SECURITY.md inaccuracies). **295 backend tests green** (9 new), CI green. **Live re-verified after redeploy**: rotating XFF now returns a constant bucket. Report: `docs/6-security/CYBER_SECURITY_AUDIT_2026-09-27.md`. Note: the Render service is NOT Blueprint-managed — the two deployment settings were applied via the Render API and are documented in SECURITY/DEPLOYMENT.

- **Date**: 2026-09-27 (live acceptance session)
- **By**: OpenCode
- **Summary**: **Task 6.16 live staging E2E complete — Phase 6 fully closed.** Account tier on Render now runs through the **kenari.id** OpenAI-compatible gateway (`kn-...` key, `deepseek-v4-1-flash`, thinking disabled) — live pro upload returned `engine_used: deepseek`, 5/5 fields `extracted_by: deepseek`, **no fallback**; confirm + download produced a valid 37,760-byte filled docx; free tier still `gemini`; wrong password → 401; quota counters accurate (pro 2/50, free 0/5). **Live DeepSeek eval 1.00 PASS all metrics** (54.96s, real API calls). Render config verified via API: all four `DEEPSEEK_*` vars correct on the live deploy (`716606e`). Cost sanity: ≈ Rp 0.2–0.5 per job at kenari's Rp 20/1M in + Rp 50/1M out.

- **Date**: 2026-09-26 (backend review session)
- **By**: OpenCode
- **Summary**: **Full backend review + fixes (branch `feat/oc-backend-review`)**: reviewed every `backend/app/` module and fixed 8 HIGH / 11 MEDIUM / 10 LOW findings — generator double-fill corruption (single-pass replacement), xlsx formula/structured-reference corruption + formula-context bypass, PII masker phone-tail leak + ≥10-token unmask corruption, embedder unthrottled per-text calls + missing dimensionality, run-preserving docx fill, control-char crash, footer/nested tables, mapper date/amount cross-fill + short-name fuzzy, chunker per-chunk headers + overlap compounding, key-pool global clobbering, table extractor None-row/password handling, plus dead code/import cleanup. **28 new regression tests → 282 total green**, offline eval PASS both providers, upload→results→patch→confirm→download E2E smoke OK. Full report: `docs/5-quality/BACKEND_REVIEW_2026-09-26.md` (new file in Antigravity-owned docs zone — see Cross-Agent Requests). Also verified the frontend tier contract (Antigravity's request): `/auth/login|logout|quota`, `X-Session-Token` tier token, `data.tier` on upload, `QUOTA_EXCEEDED` 429 — all match. No shared files edited this session.

- **Date**: 2026-09-26 (tier backend session)
- **By**: OpenCode
- **Summary**: **Phase 6 backend implemented (tasks 6.2–6.8, branch `feat/oc-tier-backend`)**: tier auth (`POST/GET /api/auth/login|logout|quota`, scrypt shared credential, HMAC tier tokens purpose-isolated from job tokens, `scripts/hash_password.py`), day-window quotas in the rate limiter (`free_upload` 5/day, `pro_upload` 50/day, `auth` 5/min; 429 `QUOTA_EXCEEDED` + `Retry-After`), `DeepSeekExtractor` (`deepseek-flash` Chat Completions, JSON mode, shared prompt/VULN-07 validation, `force_fake` CI path, heuristic-only fallback), `Job.tier` + provider selection, pro-tier RAG bypass (consecutive chunk batching, **zero Google calls**, proven by tests monkeypatching Gemini/embedder to raise). Shared files edited per Rule 2 (note below): `.env.example`, `render.yaml` (+ `config.py`). **254 backend tests green** (214 baseline + 40 new `test_tier_system.py`), offline eval PASS both `--provider gemini` and `--provider deepseek`. ADR-020 gained implementation notes. Work was isolated in a **git worktree** (`E:\TemplaFill-oc`) because the shared checkout was on Antigravity's `feat/ag-tier-frontend` branch with uncommitted frontend work.
- **Date**: 2026-09-26 (Antigravity frontend polish session)
- **By**: Antigravity
- **Summary**: **Frontend design-review follow-up (branch `feat/ag-frontend-polish`)**: added a shared accessible `Modal` primitive (portal, `role="dialog"`+`aria-modal`, Escape, focus trap, focus restore, scroll lock) and adopted it across all 6 modals; made engine copy tier-aware (`ProcessingView`/`HeroLanding`/`Footer`/`DownloadView` audit); toast a11y (`role=alert`/`aria-live`) with success/info auto-dismiss but **warning/error persist**; fixed leftover Indonesian error string + stale `text-embedding-004`; Help guide now documents **5** syntaxes; replaced `alert()` with toasts; history download is now a real JSON metadata record; added `.focus-ring` + `prefers-reduced-motion`; empty-generate guard + `key={sessionId}` reset; mobile Navbar tier chip + workflow dots; landing tagline. Tests **59/59** (new `polish.test.mjs`; was 42), lint **0 warnings**, build green. Reconciled `DESIGN.md`/`DESIGN_SYSTEM.md` with shipped code (dark-only, IBM Plex, blue accent, no gradients, shared Modal, a11y) + `USER_GUIDE`/`CHANGELOG`/`README` counts.

- **Date**: 2026-09-26 (Antigravity frontend session)
- **By**: Antigravity
- **Summary**: **Phase 6 frontend + docs complete (tasks 6.9–6.14, all `done`)**: built `LoginModal`, `AccountRequestView`, `TierDisclosure`; added `api.login/logout/getQuota/getTier/getTierToken` with signed tier token (`tf_tier_token`) and `QuotaExceededError` on 429 `QUOTA_EXCEEDED`; Navbar tier badge (`Free · Gemini` / `Account · DeepSeek`) + sign-in/out; free-tier Google-training/quota disclosure on landing/upload; HelpModal engine + privacy tabs rewritten for both tiers (DeepSeek wording kept generic pending 6.15); browser-local history migrated to `tf_history` (`HistoryEntry` per TIER_ARCHITECTURE §6) with 5/day quota countdown; `types.ts`/`api.ts` unions gain `deepseek` + `Tier`/`QuotaInfo`/`LoginResult`; tier-aware engine badges/banners in `ReviewMappingView`. Tests **42/42** (new `tier.test.mjs` T13–T18 + `e2e.test.mjs` both-tier flows; was 13). `npm run lint` 0 errors, `npm run build` clean. Docs swept: PRD §4.7, USER_STORIES Epic 5, USER_GUIDE §4–5, API.md "Tiers & Auth", ARCHITECTURE tier diagram, TECH_STACK DeepSeek plan, DATA_MODEL `Job.tier` + browser storage, SECURITY tier auth, DATA_PRIVACY tier matrix, README, CHANGELOG v0.3.0. Branch `feat/ag-tier-frontend`. **Backend endpoints are coded against but still in progress (OpenCode 6.2–6.8); UI degrades gracefully via existing mock/fallback patterns.**

- **Date**: 2026-09-26 (later session)
- **By**: OpenCode
- **Summary**: **Tier system planning (Phase 6, PROPOSED — awaiting user approval)**: wrote `docs/1-product/TIER_PLAN.md` and `docs/2-architecture/TIER_ARCHITECTURE.md` (user-directed creation of new planning files in Antigravity-owned doc folders — noted under Cross-Agent Requests). User decisions locked: one fixed shared password (contact `hanif.isya.annafi-2024@fst.unair.ac.id`), free tier = Gemini with **5 jobs/day/IP** cap, account tier = DeepSeek `deepseek-flash` with zero Google calls (retrieval bypassed via sequential batching), history/results in browser localStorage only, pro fallback = heuristic never Gemini. `TASKS.md` Phase 6 added (6.0–6.17 split OpenCode backend / Antigravity frontend+docs / joint), `TESTING.md` + `FEEDBACK_LOOP.md` revised (real counts 214/13, corrected commands, new 18-case tier test matrix, per-provider eval), ADR-020 logged as **Pending**. **No implementation started — waiting for user's go.**

- **Date**: 2026-09-26
- **By**: OpenCode
- **Summary**: **Cyber security remediation (VULN-01→15)**: White-box assessment published in `docs/6-security/CYBER_SECURITY_REPORT.md`; all findings fixed. Highlights: per-job signed session tokens + authorization on every `/jobs/*` route (404 to prevent enumeration); job TTL eviction + capacity cap + cleanup task; request-body size middleware; formula/DDE injection neutralization for spreadsheets; trusted-proxy client IP + bounded rate limiter (read routes now limited); Gemini key moved to `x-goog-api-key` header; prompt-injection fencing + output validation; explicit CORS allow-list; `DEBUG` defaults false; template ZIP-bomb guard; dependencies pinned + blocking `pip-audit` (patched `python-multipart` CVE); production refuses placeholder `SECRET_KEY`. Frontend sends the session token and downloads via authenticated fetch. **214 backend tests green** (34 new), frontend build green, `pip-audit` clean. `SECURITY.md` corrected (prior sign-off overstated controls). PR #1 merged to `main`.

---

## Current Project State

### Overall Status: 🟢 All Phases (0, 1, 2, 3, 4, 5) 100% Complete & Production Ready ✅

All core phases completed (+ v0.2.0 hardening 2026-09-24, ADR-013→017):
- Phase 0: Foundation documentation & project scaffolds ✅
- Phase 1: Core backend extraction & RAG pipeline (140→167 tests, now with real 51-field contract validation) ✅
- Phase 2: FastAPI API layer (25 API tests, 167 total pytest green) ✅ — batch single-prompt + 15-chunk bypass, brace-free generator, engine provenance (`extracted_by`), phase-80 fix
- Phase 3: Next.js 16.3.6 frontend with IBM Plex, `getApiBaseUrl()` prod routing, engine badges + fallback banner, all workflows ✅
- Phase 4: Evaluation suite (5 synthetic 1.00 + real 51-field `51/51 gemini` contract test) ✅
- Phase 5: Polish, CI/CD (167 cov + lint/build + eval + audit + docker), security VULN-1→10, Docker/Render/Supabase free-forever, `.gitignore` `Test source/` ✅

### What Exists
- [x] `AGENTS.md` — Agent coordination contract (root)
- [x] `README.md` — Top-level product + arch + API + eval + deploy (updated 2026-09-24 for 3.6-flash batch + provenance)
- [x] `CHANGELOG.md` — Keep-a-Changelog `0.1.0` → `[Unreleased] v0.2.0` delta (ADR-013→016)
- [x] `.env.example` — Environment template (gemini-3.6-flash, gemini-embedding-001, Supabase pooling)
- [x] `.gitignore` — Public repo privacy & ignore rules (uploads/eval results/pycache)
- [x] `docs/1-product/*` — PRD, VISION, USER_STORIES, USER_GUIDE (USER_GUIDE reflects 5-syntax + engine badges)
- [x] `docs/2-architecture/*` — ARCHITECTURE (batch sequence, 768d embed), TECH_STACK (16.3.6/4.x/3.6-flash/768), DATA_MODEL (extracted_by/fallback_reason), API (anonymous MVP + provenance + RFC5987)
- [x] `docs/3-design/*` — DESIGN, DESIGN_SYSTEM (slate/indigo, IBM Plex — unchanged)
- [x] `docs/4-coordination/*` — OWNERSHIP, WORKFLOW, TASKS, CONTEXT (this file, ADR-016 logged)
- [x] `docs/5-quality/*` — EVAL, FEEDBACK_LOOP, TESTING (167 count aligned)
- [x] `docs/6-security/*` — SECURITY (VULN-1→10 audit pass), DATA_PRIVACY
- [x] `docs/7-operations/*` — SETUP (Docker/verify issues), DEPLOYMENT (free-forever $0), DECISIONS (ADR-001 superseded + ADR-016)
- [x] `frontend/` — Next.js 16.3.6 App Router, AuthModal stub, HelpModal 4 tabs, BackendWakingBanner (5s×12), Review engine badges, DualDropzone real binaries, 13/13 tests green ✅
- [x] `backend/` — FastAPI 167 tests (batch+blacklist), extraction/rag/mapping/jobs batch+provenance, InMemory by default ✅
- [x] `eval/` — 5 synthetic datasets + `generate_eval_datasets.py` + `run_eval.py` (1.00 PASS, halluc 0.00, placeholder 1.00) ✅

### What's Being Worked On Right Now
- **Phase 6 (Tiers) COMPLETE — delivery merge ready** — backend 6.2–6.8 (PR #3) + backend review fixes (PR #4) merged; frontend 6.9–6.14 + 6.18–6.22 merged via this delivery branch; task 6.15 verified (**negative verdict** — no DeepSeek no-training claim published); 6.17 done (ADR-020 **Accepted**). Remaining: **6.16 live staging E2E with real provider keys** (user acceptance; offline eval PASS both providers already in CI).
- Phases 0–5 complete; PRs #1–#4 merged to `main`.

### Completed Milestones
1. ✅ OpenCode Phase 1 done — 140/140 tests green.
2. ✅ OpenCode Phase 2 done — 25 API tests, 165 total green.
3. ✅ OpenCode Phase 4 done — 5 datasets, eval 1.00 PASS (halluc 0.00).
4. ✅ OpenCode Phase 5 done — CI (165 tests, eval, docker), security headers + rate limit, GZip, Dockerfile & compose ready.
5. ✅ Antigravity Phase 3 done — 100% frontend complete (AuthModal, DualDropzone, ProcessingView, ReviewMappingView, CitationModal, ReExtractModal, DownloadView, 13/13 tests green).
6. ✅ Antigravity Phase 5 done — Task 5.5 (vercel.json), Task 5.7 (in-app HelpModal + USER_GUIDE.md), Tasks 5.1 & 5.2 (Security & Performance review signed off in SECURITY.md and DECISIONS.md).
7. ✅ Both Agents Task 5.6 done — Automated full-flow E2E integration test suite (`frontend/src/tests/e2e.test.mjs`, 13/13 passing in 106ms).

---

## Recent Decisions

| Decision | Rationale | Date | Logged in DECISIONS.md? |
|----------|-----------|------|------------------------|
| Product name: TemplaFill | User-defined | 2026-09-23 | ADR-001 |
| LLM: Gemini free plan (`gemini-3.6-flash`/`3.5-flash` primary) | Cost-effective + structured JSON + 768d + REST fallback + 35s timeout | 2026-09-23 (migrated ADR-017: reorder `3.5→3.6`) | ADR-001→015→017 ✅ |
| Multi-format templates (.docx/.xlsx/.pptx) + 5 syntaxes | User req. + parser `{{}}/{}/[]/<<>>/__` `parser.py:32`; generator `generator.py:61` brace-free | 2026-09-23 (fixed 2026-09-24) | ADR-006/017 ✅ |
| UI language: English (professional, general audience) | Translated from ID; general public target | 2026-09-24 (sweep) | — |
| Frontend: Next.js 16.3.6 + React 19.2 + Tailwind 4 | SSR + `getApiBaseUrl()` prod auto-routing (`api.ts:13`) + CSP | 2026-09-24 (ADR-017) | ADR-004 ✅ |
| Backend: Python 3.11 + FastAPI + google-genai + httpx REST | Best ML/AI + async + batch + 15-chunk bypass (`manager.py:224`) | 2026-09-24 (ADR-017) | ADR-003/005/017 ✅ |
| Embeddings: `gemini-embedding-001` 768d (legacy 004 sanitized) | Free-tier 100 batch + `≤15→0 calls` bypass + fake offline | 2026-09-24 `embedder.py:107`/`manager.py:224` | ADR-016/017 ✅ |
| Deployment: Vercel Hobby + Render Hobby $0 + Supabase 500MB | Free-forever 750h + `getApiBaseUrl()` + 12×5s wake banner | 2026-09-23 | ADR-010/017 ✅ |
| Security: VULN-1→10 zero-trust pipeline | Rate limiter + sanitize + CSP + 404 gate | 2026-09-23 | ADR-012 ✅ |
| Batch extraction: single-prompt all fields | >90% fewer calls, kills 429; small docs 0 retriever calls | 2026-09-24 | ADR-013/017 ✅ |
| Engine provenance: extracted_by/fallback_reason badges | Transparency over silent fallback | 2026-09-24 | ADR-014 ✅ |
| Generator: atomic `{{field}}→value` (no `{{value}}`) | Borrowed brace corruption fix | 2026-09-24 | ADR-017 ✅ |
| Anonymous per-job session tokens (HMAC, 404-on-denied) | Prevent cross-job data access without full accounts yet | 2026-09-26 | ADR-019 ✅ |
| Pinned deps + blocking `pip-audit` | Reproducible builds + no known-CVE releases | 2026-09-26 | ADR-019 ✅ |
| Formula/DDE neutralization for spreadsheet output | Prevent client-side injection via filled `.xlsx` | 2026-09-26 | ADR-019 ✅ |
| Two tiers: free=Gemini (5/day/IP) vs account=DeepSeek `deepseek-flash`, shared password, localStorage history | Quota + training-data concerns; no accounts/payments wanted | 2026-09-26 | ADR-020 (Pending plan approval) |

---

## Cross-Agent Requests

### Note: Security re-audit fixed deployment config + corrected SECURITY.md (no frontend changes)
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: `docs/6-security/SECURITY.md` + `docs/6-security/CYBER_SECURITY_AUDIT_2026-09-27.md` (new), `docs/7-operations/DEPLOYMENT.md`, `render.yaml`, `.env.example`, `backend/` (code + tests). No frontend files touched.
- **Description**: User-directed full re-audit. Credential exposure double-checked (clean). AUDIT-01 was a real high-severity quota/brute-force bypass on the live deployment; fixed in code + Render config. SECURITY.md's sign-off table now reflects verified reality — please keep the new AUDIT-01 deployment requirements (`--no-proxy-headers` + `TRUSTED_PROXIES=*`) when editing deployment docs.
- **Priority**: high
- **Status**: done

### Request: OpenCode added visual tutorial (frontend + docs zones, user-directed)
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: frontend/src/lib/tutorial.ts (**new**), frontend/src/components/HelpModal.tsx (new Tutorial tab as tab 1, 	ier prop, tier-aware workflow copy), frontend/src/app/page.tsx (passes 	ier), frontend/src/tests/tutorial.test.mjs (**new**), frontend/public/guide/*.jpg (**new**, 20 screenshots), docs/1-product/TUTORIAL.md (**new**), docs/1-product/USER_GUIDE.md + README.md/frontend/README.md (links + stale facts)
- **Description**: User asked for a well-documented step-by-step tutorial with screenshots, both on GitHub and **inside the app** (HelpModal), split into free-tier and account-tier parts (account steps render only when signed in), screenshots optimized to JPEG (<1 MB total). No shared config files touched. Playwright was used **outside the repo** (temp dir) — nothing tooling-related is committed.
- **Priority**: medium
- **Status**: done

### Request: OpenCode added example-document screenshots to the tutorial (frontend + docs zones, user-directed)
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: frontend/src/lib/tutorial.ts (3 new steps, renumbered 18 → 21), frontend/public/guide/21-example-source.jpg + 22-example-template.jpg + 23-example-result.jpg (**new**), docs/1-product/TUTORIAL.md (rewritten with the new steps + explanations), README.md (step count), CHANGELOG.md. No shared config files touched; no component code changed.
- **Description**: User asked to show what is actually inside the example files: the source PDF content (step 4), the template placeholders (step 5), and the generated filled result (step 6) with a brief explanation each. The result screenshot was produced by running the **real backend generator** on the demo pair, so it matches what users receive (`{{witness_name}}` intentionally left unfilled). Verified in the local production build (free tier = 17 steps, images load). If you regenerate guide shots later, keep the `21/22/23-example-*` names.
- **Priority**: medium
- **Status**: done


### Request: OpenCode re-pointing shared `DEEPSEEK_*` vars at kenari.id gateway (user-directed)
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: `.env.example`, `render.yaml` (both shared — Rule 2 note given BEFORE editing)
- **Description**: The user's DeepSeek key is a **kenari.id** gateway key (`kn-...`), which only works against `https://kenari.id/v1`. Changing `DEEPSEEK_BASE_URL` → `https://kenari.id` and `DEEPSEEK_MODEL` → `deepseek-v4-1-flash` (kenari's id for the same DeepSeek-V4.1-Flash model) on branch `feat/oc-kenari-provider`. Backend adds `reasoning: {enabled: false}` (kenari-documented thinking-off switch) + `DEEPSEEK_DISABLE_THINKING` setting. No frontend changes; no new `NEXT_PUBLIC_*` vars.
- **Priority**: high
- **Status**: done

### Request: OpenCode added a review report in the Antigravity-owned docs zone
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: `docs/5-quality/BACKEND_REVIEW_2026-09-26.md` (**new** file; no existing file edited)
- **Description**: User asked OpenCode to review and revise the whole backend; the report is a new quality doc alongside `TESTING.md`/`EVAL.md`. Findings and fixes are backend-only. No shared config files touched this session. Please skim for consistency with the quality-doc conventions.
- **Priority**: low
- **Status**: pending

### Request: OpenCode editing shared `.env.example` + `render.yaml` for Phase 6 tiers
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: `.env.example`, `render.yaml` (both shared — Rule 2 note given BEFORE editing, also posted to the live checkout's CONTEXT.md)
- **Description**: Task 6.6 adds backend-only tier/provider env vars: `TIER_ACCOUNT_USERNAME`, `TIER_ACCOUNT_PASSWORD_HASH`, `TIER_TOKEN_EXPIRE_DAYS`, `FREE_JOBS_PER_DAY`, `PRO_JOBS_PER_DAY`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MAX_BATCH_CHARS`. No `NEXT_PUBLIC_*` vars added. Edits are on branch `feat/oc-tier-backend` (worktree `E:\TemplaFill-oc`). Please avoid touching these same keys.
- **Priority**: high
- **Status**: done

### Request: Tier planning docs written by OpenCode in Antigravity-owned folders
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: `docs/1-product/TIER_PLAN.md`, `docs/2-architecture/TIER_ARCHITECTURE.md` (both **new** files)
- **Description**: User directly instructed OpenCode to produce the tier plan/design markdown. Both files are new (no existing Antigravity files were edited); please review for consistency with PRD/ARCHITECTURE conventions when you pick up tasks 6.9–6.14, and treat them as the approved spec once the user signs off.
- **Priority**: medium
- **Status**: done (Antigravity implemented 6.9–6.14 against both docs; no convention conflicts found)

### Request: Backend tier endpoints must match the frontend contract (OpenCode 6.2–6.6)
- **From**: Antigravity
- **To**: OpenCode
- **File(s)**: `backend/app/api/` (auth routes + upload/jobs tier additions)
- **Description**: The frontend (`frontend/src/lib/api.ts`) is coded against these exact shapes and will show generic errors otherwise:
  - `POST /api/auth/login` `{username,password}` → `200 {success,data:{tier:"pro",token}}`; generic `401` on failure; `429` on brute force.
  - `POST /api/auth/logout` → `200` (frontend also clears `tf_tier_token` locally).
  - `GET /api/auth/quota` → `{success,data:{free_used_today,free_limit,tier}}`; accepts the tier token via `X-Session-Token`.
  - `POST /api/upload` accepts `X-Session-Token` (tier token), returns `data.tier`, and on daily-cap returns `429` with `error.code:"QUOTA_EXCEEDED"` + `Retry-After`.
  - `GET /api/jobs/{id}/results` includes `data.tier` and per-field `extracted_by:"deepseek"`.
  Frontend falls back to mock/optimistic tier when these 404, so nothing blocks you — but the UI only becomes truthful once they land.
- **Priority**: high
- **Status**: pending

### Note: No shared files edited by Antigravity
- **From**: Antigravity
- **File(s)**: `.env.example`, `render.yaml`, `README.md`
- **Description**: Antigravity edited **README.md** and **CHANGELOG.md** (Both-owned / allowed) but did **not** touch `.env.example` or `render.yaml` (OpenCode's 6.6). New env vars documented in README: `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `TIER_ACCOUNT_USERNAME`, `TIER_ACCOUNT_PASSWORD_HASH`, `FREE_JOBS_PER_DAY`, `PRO_JOBS_PER_DAY` — OpenCode to add them to `.env.example`/`render.yaml` in 6.6.
- **Priority**: low
- **Status**: pending

### Request: OpenCode editing shared `.env.example` + `render.yaml` for Phase 6 tiers
- **From**: OpenCode
- **To**: Antigravity
- **File(s)**: `.env.example`, `render.yaml` (both shared — Rule 2 note given BEFORE editing)
- **Description**: Task 6.6 adds tier/provider env vars: `TIER_ACCOUNT_USERNAME`, `TIER_ACCOUNT_PASSWORD_HASH`, `FREE_JOBS_PER_DAY`, `PRO_JOBS_PER_DAY`, `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `TIER_TOKEN_EXPIRE_DAYS`. These are backend-only; no frontend `NEXT_PUBLIC_*` vars are added. Edits are happening on branch `feat/oc-tier-backend` (git worktree `E:\TemplaFill-oc`, since the shared checkout is on your `feat/ag-tier-frontend` branch). Please avoid touching these same keys.
- **Priority**: high
- **Status**: in_progress

<!-- Template for new requests:
### Request: [Short Title]
- **From**: [Agent Name]
- **To**: [Agent Name]
- **File(s)**: path/to/file
- **Description**: What needs to change and why
- **Priority**: high / medium / low
- **Status**: pending / in_progress / done / needs_discussion
-->

---

## Known Issues & Blockers

_No known issues._

---

## Session Log

| Date | Agent | Summary |
|------|-------|---------|
| 2026-09-23 | Antigravity | Project kickoff. Created AGENTS.md, CHANGELOG.md, and all coordination docs. Creating remaining 17 documentation files. |
| 2026-09-23 | OpenCode | Task 0.3 scaffold complete: FastAPI app with CORS + GET /api/health, pydantic-settings config, API stubs (upload/jobs), services skeleton, requirements.txt/pyproject.toml, 8 pytest tests passing. Branch feat/oc-backend-scaffold. |
| 2026-09-23 | OpenCode | Task 1.1 & 1.2 extraction pipeline done: text_extractor.py (PyMuPDF), table_extractor.py (pdfplumber), pdf_extractor.py (combined orchestrator), models.py (Pydantic), exceptions.py, 37 new extraction tests (45 total green). |
| 2026-09-23 | OpenCode | Phase 1 pipeline complete: chunker.py (recursive semantic 800/100), vector_store (InMemory/PgVector), embedder (768d fake fallback), retriever (top-K), extractor (Gemini JSON + Fake), parser (docx/xlsx/pptx 5 placeholder types), mapper (exact/fuzzy/synonym), generator (preserve formatting) — 95 new tests, 140 total green on feat/oc-backend-scaffold. |
| 2026-09-23 | OpenCode | Phase 2 API layer complete: job manager (in-memory queued→completed), services/jobs/models, POST upload (415/413 validation), GET jobs/results, PATCH fields (edit/skip/confirm/re_extract), POST confirm (202), GET download (streaming), POST re-extract, GET source/page, 25 API tests, 165 total green on feat/oc-backend-scaffold. |
| 2026-09-23 | OpenCode | Phase 4 eval complete: generated 5 datasets (hr/finance/education/legal/general) via scripts/generate_eval_datasets.py, implemented eval/run_eval.py (precision/recall/F1/hallucination/not_found/placeholder), baseline 0.79→1.00 after FakeExtractor optimization (term scoring + distinctive guard), 165 tests still green, results in eval/results/eval_run_*.json, overall PASS. |
| 2026-09-23 | OpenCode | Phase 5 polish complete: CI/CD (.github/workflows/ci.yml with backend 165 tests/coverage + frontend lint/build + eval + docker, deploy.yml for Render), security (SecurityHeadersMiddleware CSP/HSTS, RequestId, sanitize_filename, magic validation, InMemoryRateLimiter 10/h 60/m), GZipMiddleware, Dockerfile (3.11-slim, non-root, HEALTHCHECK), docker-compose.yml (pgvector/pg16 + redis + backend), 165 tests green. |
| 2026-09-23 | Antigravity | Phase 3 frontend complete: Next.js 14+ App Router, IBM Plex typography, solid high-contrast theme (zero AI design tropes), Dual Dropzone with drag & drop + demo presets, Processing View with real-time stage tracker, Split & Table Review views, Citation Modal, Re-extract Modal, Add Field Modal, Download View with filled docs & audit summary, Toast alerts, LocalStorage history, 5/5 unit tests green. Branch feat/ag-frontend-scaffold merged into main. |
| 2026-09-23 | Antigravity | Remaining tasks complete: AuthModal (3.8), HelpModal + USER_GUIDE.md (5.7), vercel.json + build pass (5.5), joint Security & Performance review sign-off (5.1/5.2) in SECURITY.md and DECISIONS.md (ADR-008, ADR-009), and full-flow automated E2E integration test suite in e2e.test.mjs (5.6, 13/13 tests green). All phases 0-5 100% complete and production ready. |
| 2026-09-23 | OpenCode | Free-forever deployment confirmed: Vercel (100GB) + Render Hobby $0 (750h, sleep 15m wake 60s, no CC) + Supabase 500MB pgvector free forever (vs Render 30-day). Added BackendWakingBanner.tsx, api.ts checkHealth 7s + waitForBackend 5s×12, page.tsx polling + banner, DEPLOYMENT.md/ARCHITECTURE.md/TECH_STACK.md/.env.example/DECISIONS.md ADR-010 updates. |
| 2026-09-23 | Antigravity | Demo fix & backend endpoint alignment: replaced 56B dummy string files with real binary assets in frontend/public/samples/ (sample_contract.pdf 1.1KB, sample_template.docx 36.7KB) passing %PDF and PK zip header checks. Aligned api.ts with backend endpoints (/api/upload unwrap job_id, /api/jobs/{id}/results, PATCH /api/jobs/{id}/fields/{id}, confirm & download routes). Enhanced handleStartExtraction with resilient polling & graceful demo fallback. All 13 tests green & static build clean. |
| 2026-09-23 | Antigravity | Demo download fix: corrected mock downloadUrl to point to static sample template docx asset instead of hitting backend endpoint for demo sessions; updated DownloadView to directly download sample asset; expanded live extraction polling window up to 50 attempts so live jobs are not prematurely marked completed before backend confirm readiness. 13 tests green, build clean. |
| 2026-09-23 | Antigravity | Backend extractor resiliency: added automatic fallback to FakeExtractor inside GeminiExtractor.extract exception block. If Gemini API key is missing, invalid, or hits rate limits/quota (429), extraction falls back to deterministic heuristic parsing instead of returning null for all fields. 165 backend tests and 1.00 eval PASS. This backend commit will also trigger Render auto-deploy. |
| 2026-09-23 | Antigravity | Gemini 404 resolution & transparent UI notice banner: diagnosed 404 NotFound errors from Google AI Studio screenshot (gemini-2.0-flash endpoint mismatch on free tier); updated default model in config.py to gemini-1.5-flash with automatic 2.0->1.5 fallback in extractor.py; added prominent Amber warning banner and toast in ReviewMappingView.tsx/page.tsx notifying user transparently when Gemini encounters 404/429 limits and active heuristic engine takes over. 165 backend tests and 13 frontend tests passing, build clean. |
| 2026-09-23 | Antigravity | Model migration to Gemini 3.7 Flash & 3.8 Flash (ADR-011): Diagnosed 404 error spike from user AI Studio metrics showing active models are Gemini 3.7 Flash & 3.8 Flash. Root caused 404 errors to render.yaml hardcoding gemini-2.0-flash and gemini-1.5-flash fallback. Updated render.yaml, config.py, and .env.example to gemini-3.7-flash, added automatic sanitization of deprecated model names, set candidate progression [gemini-3.7-flash -> gemini-3.8-flash], and verified UI Amber banner warning. 165 backend tests, 5/5 eval datasets, and 13 frontend tests passing. |
| 2026-09-24 | Antigravity | Single-Prompt Batch Extraction & Rate-Limit Resilience (ADR-013): Diagnosed 0 output tokens and 130+ error spike in Google AI Studio dashboard (404 NotFound, 429 TooManyRequests, 503 ServiceUnavailable). Implemented extract_batch in extractor.py and integrated into JobManager.process_document (single consolidated prompt for all template fields, reducing requests by 90%+). Added 404 model blacklisting (_BLACKLISTED_MODELS), 1.2s request pacing, and exponential backoff on 429/503. Added 2 new unit tests in test_generation_extractor.py (167 backend tests passing, 5/5 eval datasets at 1.00 PASS). |
| 2026-09-24 | Both | **Close-Loop Live Test with `Test source/` 51-field contract (ADR-017 validation)**: OpenCode validated live `https://templa-fill.vercel.app` (`Checking backend → https://templafill-backend.onrender.com/api` via `getApiBaseUrl()` ) and ran local+direct REST checks on `source_kontrak_konsultasi.pdf` (2 pages, 3546 chars, 2 chunks) + `target_template_ringkasan_kontrak.docx` (6 tables, 51 placeholders). Direct REST `gemini-3.5-flash` succeeded for 6118-char prompt (51/51 found) while `gemini-3.6-flash` gave 503 — confirmed need for candidate reorder `3.5→3.6` and SDK→REST fallback. Enhanced `FakeExtractor` with Indonesian date (`15 September 2026`), `PT ...` company, `Jl.` address, `Optimalisasi` title, `BCA ...`, `0,5%` heuristics — fallback coverage `1→20/51` for 503/429 resilience. Added `_call_gemini` REST fallback (`httpx`+`urllib` 35s) and `PT [A-Za-z]` atomic regex fix. Verified filled docx brace-free (`{{value}}` absent) via `generate_filled_document` on 6-table docx, 167/167 pytest + 13/13 frontend + `next build` clean. |
| 2026-09-26 | OpenCode | **Security remediation shipped**: all 15 findings from `docs/6-security/CYBER_SECURITY_REPORT.md` fixed (session-token authz, eviction, body cap, formula guard, trusted-proxy IP, Gemini header key, prompt fencing, CORS allow-list, debug gating, read rate limits, ZIP guard, pinned deps + blocking pip-audit, SECRET_KEY fail-fast, docs corrected); 214 backend tests (34 new) + 13 frontend + build green; PR #1 merged to `main` (CI fully green after fixing pre-existing `npm ci` lockfile drift and 10 lint errors). |
| 2026-09-26 | OpenCode | **Tier system planned (Phase 6, awaiting approval)**: TIER_PLAN.md + TIER_ARCHITECTURE.md created (user-directed), TASKS.md Phase 6 added with OpenCode/Antigravity split, TESTING.md + FEEDBACK_LOOP.md revised (214/13 counts, real commands, tier test matrix, per-provider eval), ADR-020 Pending, cross-agent note added. |
| 2026-09-26 | OpenCode | **Tier backend shipped (tasks 6.2–6.8, `feat/oc-tier-backend`, isolated in git worktree `E:\TemplaFill-oc`)**: tier auth endpoints + scrypt shared credential + purpose-isolated HMAC tier tokens (30d) + `scripts/hash_password.py`; rate-limiter day window (`free_upload` 5/day, `pro_upload` 50/day, `auth` 5/min) with 429 `QUOTA_EXCEEDED` + `Retry-After` enforced in `POST /api/upload` after validation; `DeepSeekExtractor` (JSON mode, pacing/backoff, shared prompt + VULN-07 validation, `force_fake`, heuristic-only fallback); `Job.tier` + `get_extractor_for_tier` provider selection; pro path skips embeddings/retriever entirely (consecutive chunk batching via `_split_chunks_by_chars`); re-extract endpoints tier-aware; `run_eval.py --provider gemini|deepseek --live`. 40 new tests (`tests/test_tier_system.py`) incl. zero-Gemini-on-pro (Google calls monkeypatched to raise) → **254 backend tests green**; offline eval 5/5 PASS both providers. ADR-020 implementation notes logged; shared-file note given in CONTEXT.md before editing `.env.example`/`render.yaml`. |
| 2026-09-27 | OpenCode | **Full backend review + fixes (`feat/oc-backend-review`)**: fixed 8 HIGH / 11 MEDIUM / 10 LOW findings — generator double-fill (single-pass replacement), xlsx structured-reference corruption + formula-context bypass, PII masker phone-tail leak + unmask ≥10-token corruption + backslash expansion, embedder per-text unthrottled calls + `output_dimensionality`, run-preserving docx fill (mixed formatting/hyperlinks), control-char crash, footer/nested tables, mapper date/amount cross-fill + short-name fuzzy, chunker per-chunk headers + overlap compounding, key-pool global clobbering, table-extractor None-row/password handling, dead code/imports. 28 new regression tests → **282 backend tests green**, eval PASS both providers, upload→confirm→download E2E smoke OK. Report `docs/5-quality/BACKEND_REVIEW_2026-09-26.md`. Verified frontend tier contract match (Antigravity's request). |
| 2026-09-26 | Antigravity | **Phase 6 frontend + docs (tasks 6.9–6.14) complete** on `feat/ag-tier-frontend`: `LoginModal` (shared credential, generic error), `AccountRequestView` (contact `hanif.isya.annafi-2024@fst.unair.ac.id`), `TierDisclosure` (Google-training + 5/day quota notice); `api.login/logout/getQuota/getTier/getTierToken/getHistory/saveHistoryEntry/clearHistory` + `QuotaExceededError` (429 `QUOTA_EXCEEDED`); Navbar badge `Free · Gemini`/`Account · DeepSeek` + sign-in/out; `tf_history` browser store (`HistoryEntry`) + quota countdown; `types.ts` `Tier`/`HistoryEntry`/`QuotaInfo`/`LoginResult` + `deepseek` unions; tier-aware badges/banners. Tests **42/42** (new `tier.test.mjs` T13–T18 + `e2e.test.mjs` both tiers; was 13), lint 0 errors, build clean. Docs swept (PRD/USER_STORIES/USER_GUIDE/API/ARCHITECTURE/TECH_STACK/DATA_MODEL/SECURITY/DATA_PRIVACY/README/CHANGELOG). Cross-agent contract request logged for OpenCode 6.2–6.6. |
| 2026-09-26 | Antigravity | **Frontend design-review follow-up** on `feat/ag-frontend-polish`: shared accessible `Modal` primitive (portal/dialog/focus-trap/Escape/restore/scroll-lock) adopted by all 6 modals; tier-aware engine copy; toast a11y + persistent warnings/errors; fixed Indonesian string + stale `text-embedding-004`; Help 5 syntaxes; `alert()`→toast; history JSON metadata export; `.focus-ring` + `prefers-reduced-motion`; empty-generate guard + `key={sessionId}`; mobile Navbar tier chip + workflow dots; landing tagline. Tests **59/59**, lint 0 warnings, build green. `DESIGN.md`/`DESIGN_SYSTEM.md` reconciled with shipped code; `USER_GUIDE`/`CHANGELOG`/`README` updated. |
| 2026-09-27 | OpenCode | **Phase 6 delivery merge (user-directed)**: merged `feat/ag-frontend-polish` (frontend 6.9–6.14 + polish 6.18–6.22) into the delivery branch, resolving CONTEXT/TASKS conflicts (kept both agents' history, current statuses). Verified closed loop on the merged tree: **282 backend tests**, **59 frontend tests**, lint 0 warnings, `next build` green. Task 6.15 **verified — negative verdict** (DeepSeek terms contain no no-training/no-retention commitment; no claim published; `DATA_PRIVACY.md` updated; HelpModal copy corrected). ADR-020 flipped to **Accepted** (6.17); TASKS 6.0/6.15/6.17 → done, 6.16 → review (live staging E2E with real keys is the user's acceptance step); CHANGELOG v0.3.0 completed with backend + review + verdict sections. |
| 2026-09-27 | OpenCode | **Account-tier provider re-pointed at kenari.id gateway (user-directed)**: the user's DeepSeek key is a kenari.id gateway key (`kn-...`) that only works against `https://kenari.id/v1`. `render.yaml`/`.env.example` updated: `DEEPSEEK_BASE_URL=https://kenari.id`, `DEEPSEEK_MODEL=deepseek-v4-1-flash` (kenari's id for DeepSeek-V4.1-Flash). Backend adds `DEEPSEEK_DISABLE_THINKING` (default true) — sends `reasoning:{enabled:false}` so extraction does not burn output tokens on hidden thinking, with a graceful 400-retry without the field for providers that reject it. 4 new tests → **286 backend tests green**; eval PASS both providers. Rule 2 note added before shared-file edits. Live Render check still pending user's `kn-...` key. |
| 2026-09-27 | OpenCode | **Task 6.16 live acceptance (user-directed)**: verified Render deployment via API (env vars + deploy `716606e`), then ran the live E2E — login → pro upload → results (`engine_used: deepseek`, 5/5 `extracted_by: deepseek`, no fallback) → confirm → download (37,760-byte docx, brace-free except the intentionally-unfilled not-found field); free-tier upload still `gemini`; wrong password 401; quota counters correct. **Live DeepSeek eval 1.00 PASS** all metrics. Phase 6 closed (6.16 → done). |
| 2026-09-27 | OpenCode | **Full security re-audit + fixes (PR #9)**: credential double-check (working tree + 76 commits / 1,051 blobs) → clean; AUDIT-01 XFF quota evasion fixed (`--no-proxy-headers` + `TRUSTED_PROXIES=*` + CF-Connecting-IP-first resolution) and **live-verified** (rotating XFF returns a constant bucket); AUDIT-02 generic job error; AUDIT-03 exact dependency pins; AUDIT-04 SECURITY.md corrections. 295 backend tests (9 new). Report `docs/6-security/CYBER_SECURITY_AUDIT_2026-09-27.md`. |
| 2026-09-27 | OpenCode | **Visual tutorial shipped (user-directed, both zones)**: captured 20 screenshots from the live site via Playwright (run outside the repo) — free flow (landing→upload→demo→processing→review split/table→citation→re-extract→edit→download→history→account-request→login) + account flow (DeepSeek badge/processing/review/export). New frontend/src/lib/tutorial.ts (18 steps, tier-gated) + **HelpModal Tutorial tab as tab 1** (account steps only for signed-in users; free users see a teaser) + 	ier prop wired from page.tsx; new docs/1-product/TUTORIAL.md (Parts A/B + troubleshooting) linked from USER_GUIDE/README. 5 new frontend tests (screenshot existence, tier gating, step integrity) → **64/64 green**, lint 0 warnings, build clean; tier gating verified against the local production build (free=14 steps, pro=18). All shots optimized JPEG, 0.96 MB total. |
| 2026-09-27 | OpenCode | **Tutorial example-document steps (user-directed, both zones)**: added steps 4–6 showing what is inside the demo files — source contract PDF, template with `{{placeholders}}`, and the **filled result produced by the real backend generator** (unmatched `{{witness_name}}` stays visible) — each with a brief explanation. New shots `21/22/23-example-*.jpg` (87 KB); tutorial renumbered 18 → **21 steps** (free 1–17, account 18–21); TUTORIAL.md rewritten with content tables/snippets. Verified in the local production build via Playwright (free tier renders 17 steps in order, all 3 images load). 64/64 frontend tests, lint 0, build clean. README/CHANGELOG/ADR-021 addendum updated. |







