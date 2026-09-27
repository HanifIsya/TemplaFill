# TemplaFill — Cyber Security Audit (2026-09-27)

> **Assessment type:** Static source-code review (white-box) + live black-box verification
> **Scope:** Entire repository — `backend/`, `frontend/`, `scripts/`, `eval/`, CI/CD, Docker/Render/Vercel config, git history, live deployment (`https://templafill-backend.onrender.com`, `https://templa-fill.vercel.app`)
> **Assessor:** OpenCode
> **Date:** 2026-09-27
> **Previous audit:** `CYBER_SECURITY_REPORT.md` (2026-09-26, VULN-01→15 — all remediated)
> **Methodology:** Manual code review, pattern search (secret regexes, XSS sinks, log sinks), full git-history blob scan (1,051 blobs / 76 commits), live HTTP probes (auth rate limit, XFF spoofing, debug endpoints), Render API config inspection.

---

## 1. Executive Summary

This is a **follow-up audit** after the Phase 6 tier system (shared account credential, DeepSeek provider, daily quotas) and the visual tutorial shipped. The focus is credential handling, secret exposure, and the abuse-control guarantees the tier system relies on.

**Overall: the credential story is solid, but the abuse controls had a real hole.**

| Area | Verdict |
|---|---|
| API keys / secrets in source, git history, frontend bundle | ✅ **Clean** — no real credential in any commit (76 commits, 1,051 blobs scanned) |
| Password handling (shared account credential) | ✅ **Clean** — scrypt hash only, constant-time compares, generic 401, 5/min limit |
| Live endpoint exposure | ✅ Debug/docs/OpenAPI disabled in production (404) |
| Client-IP trust for rate limits & quotas | ❌ **BROKEN** — `X-Forwarded-For` spoofing bypasses the 5/day quota, 50/day cap, and 5/min login limit (live-proven) |
| Internal error detail returned to clients | ⚠️ One endpoint returns raw exception text |
| Dependency pinning claim vs reality | ⚠️ 8 direct deps still on `~=` despite "pinned" documentation |

### Risk Summary

| # | Severity | Finding | Location |
|---|----------|---------|----------|
| AUDIT-01 | 🔴 High | **`X-Forwarded-For` spoofing defeats all per-IP controls** (free/pro daily quotas, login brute-force limit, upload/read/write limits). Live-verified: rotating the header creates unlimited fresh quota buckets. | `backend/app/core/security.py:237` + Render `FORWARDED_ALLOW_IPS=*` + uvicorn proxy headers |
| AUDIT-02 | 🟡 Medium | Failed-job results endpoint returns raw internal exception text (`job.error`) to the client | `backend/app/api/jobs.py:85` |
| AUDIT-03 | 🟢 Low | `requirements.txt` claims "pinned to exact, tested versions" but 8 direct dependencies use `~=` ranges (supply-chain reproducibility gap) | `backend/requirements.txt:30-44` |
| AUDIT-04 | 🟢 Low | `SECURITY.md` contains stale/inaccurate implementation claims (uploads path isolation, signed URLs, CORS methods, CSP drift, tier token mechanism) | `docs/6-security/SECURITY.md` |

### Positive Findings (verified)

- **No secret exposure anywhere**: working-tree scan and full git-history blob scan for Gemini (`AIza…`), OpenAI (`sk-…`), kenari (`kn-…`), Render (`rnd_…`), GitHub tokens, AWS keys, Supabase JWTs, private-key blocks, and scrypt hashes → **zero real matches**. Only placeholders (`your_gemini_api_key_here`, `change_this_to_a_random_string_in_production`) exist in tracked files.
- **No secret reaches the frontend**: the only `NEXT_PUBLIC_*` variable used is `NEXT_PUBLIC_API_URL` (a URL). All keys are read server-side via `settings.*` in `backend/app/`.
- **No secret in logs**: pattern scan for `logger.*(api_key|password|token|secret)` / `print(...)` found nothing. The key pool logs masked key suffixes (`...abc123`) only.
- **Live production hardening confirmed**: `GET /api/debug/gemini` → 404, `GET /docs` → 404, `GET /openapi.json` → 404; `GET /api/health` exposes only `status/version/timestamp/ai_configured(bool)/model` (no key material).
- **Login brute-force limit works** (live): 7 rapid attempts → `[429, 429, 429, 401, 401, 401, 401]`; wrong credentials always return a generic `401 INVALID_CREDENTIALS`.
- **Password never stored**: `TIER_ACCOUNT_PASSWORD_HASH` (salted scrypt) is the only credential material; the plaintext exists only with the owner. `scripts/hash_password.py` prints the hash and stores nothing.
- **Token families are structurally isolated**: tier tokens (`tier.<tier>.<exp>.<nonce>`, 4 parts) vs job tokens (`<job_id>.<exp>.<nonce>`, 3 parts) — neither verifies as the other (backend tests T2–T4).
- **Docker**: runs as non-root; no secrets baked into the image.
- **Render env**: 14 variables, all secret values set as secrets (`sync: false`), CORS restricted to the exact Vercel origin, `DEBUG=false`, `APP_ENV=production`.
- **CSP/XSS**: no `dangerouslySetInnerHTML`, `eval(`, `innerHTML`, or `new Function(` in frontend source; React escaping + CSP in `next.config.ts` and `vercel.json`.

---

## 2. Detailed Findings

### AUDIT-01 — 🔴 High: `X-Forwarded-For` spoofing defeats every per-IP control

**CWE:** CWE-348 (Use of Less Trusted Source), CWE-291 (Reliance on IP Address for Authentication)

**Description.**
Rate limits and tier quotas are keyed on `get_client_ip(request)`. On Render, the platform sets `FORWARDED_ALLOW_IPS=*`, which makes uvicorn's proxy-header middleware trust **every** peer and rewrite `request.client.host` from the client-supplied `X-Forwarded-For` header (leftmost entry). The application then treats that rewritten peer as the real client.

Result: an attacker can send a different `X-Forwarded-For` value on every request and obtain a **fresh bucket** each time — unlimited free-tier jobs, unlimited pro-tier jobs (bounded only by the DeepSeek balance), and unlimited login attempts (removing the 5/min brute-force guard on the shared account password).

**Live proof (black-box, 2026-09-27).**

```
GET /api/auth/quota                              -> free_used_today: 2   (real bucket)
GET /api/auth/quota  X-Forwarded-For: 203.0.113.99 -> free_used_today: 0 (spoofed bucket)
GET /api/auth/quota  X-Forwarded-For: 198.51.100.77 -> free_used_today: 0
GET /api/auth/quota  X-Forwarded-For: 203.0.113.99 -> free_used_today: 0 (persistent per spoof)
```

`X-Real-IP` did **not** change the bucket — only `X-Forwarded-For`, confirming the value flows through uvicorn's proxy-header rewriting rather than the application's own fallback.

**Impact.**
- Free-tier 5/day quota and pro-tier 50/day cost guard are bypassable → DeepSeek/Gemini spend abuse.
- Login `5/min` brute-force limit on the **shared account password** is bypassable → offline-speed online guessing.
- All upload/read/write/re-extract limits are bypassable → DoS/abuse.

**Root cause chain.**
1. Render sets `FORWARDED_ALLOW_IPS=*` for Python services.
2. uvicorn's proxy-header middleware (`always_trust=True`) rewrites `request.client.host` from the **leftmost** `X-Forwarded-For` entry — the one an attacker fully controls.
3. `get_client_ip()` returns `request.client.host` when the peer is not in `TRUSTED_PROXIES` — but the "peer" has already been replaced by the spoofable value, and `TRUSTED_PROXIES` is unset on the deployment.

Live testing also showed Render does **not** sanitize/overwrite an inbound `X-Forwarded-For` (a fixed spoofed value produced a stable, fresh bucket across 8 consecutive requests while the real IP bucket stayed at 2), so a naive rightmost-hop-only fix would still be insufficient if the client could control the last hop.

**Fix (implemented).**
- `--no-proxy-headers` on the uvicorn start command: the socket peer stays authentic (Render's load balancer) and uvicorn no longer rewrites `request.client` from client input.
- `TRUSTED_PROXIES=*` (the app is only reachable via the platform load balancer).
- `get_client_ip()` now resolves in this order when the peer is trusted:
  1. **`CF-Connecting-IP`** — set/overwritten by Cloudflare (Render's DDoS/edge provider), not client-controllable.
  2. Rightmost `X-Forwarded-For` hop (appended by the nearest proxy).
  3. `X-Real-IP`.
  4. Socket peer.
- Regression tests cover all four paths plus spoof-attempt scenarios (`test_security_audit_2026_09_27.py`).

---

### AUDIT-02 — 🟡 Medium: Internal error detail returned to clients

**CWE:** CWE-209 (Generation of Error Message Containing Sensitive Information)

**Description.** When a job fails, `GET /api/jobs/{job_id}/results` returns the raw stored exception text:

```python
# backend/app/api/jobs.py:85
return _error("FAILED", job.error or "Job failed", status=500)
```

`job.error` is populated with `str(e)` / f-strings of internal exceptions in `manager.py` (lines 195, 198, 265, 413), which can include parser internals, file paths, and library exception details. The frontend renders this message verbatim (`api.ts:307` → `page.tsx:320`).

**Impact.** Low-to-moderate information disclosure to an authenticated job owner (and to anyone who can reach a job ID, though job tokens gate that). Inconsistent with the VULN-07 remediation principle ("no raw `str(e)` leak").

**Fix (implemented).** Return a stable, generic message (`"Job failed during processing"`) plus the error code; log the detailed cause server-side with the job ID for operators. `job.error` remains internal.

---

### AUDIT-03 — 🟢 Low: "Pinned dependencies" claim vs `~=` ranges

**Description.** `requirements.txt` states "direct dependencies are pinned to exact, tested versions", but 8 entries use compatible-release ranges: `google-genai~=1.0`, `pgvector~=0.3`, `sqlalchemy[asyncio]~=2.0`, `asyncpg~=0.29`, `alembic~=1.13`, `celery~=5.3`, `redis~=5.0`, `pytest-cov~=5.0`. A `~=1.0` allows any `1.x`, so builds are not byte-reproducible and a future minor release could change behavior without review.

**Impact.** Supply-chain/reproducibility risk; documentation inconsistency. Mitigated by the blocking `pip-audit` CI step, but not by version stability.

**Fix (implemented).** Pin all eight to the exact versions currently resolved and CI-tested.

---

### AUDIT-04 — 🟢 Low: `SECURITY.md` inaccuracies

**Description.** Several claims do not match the shipped implementation:

| Claim in SECURITY.md | Reality |
|---|---|
| "Documents are stored in isolated paths: `uploads/{user_id}/{job_id}/`" | No files are written at all — documents live in process RAM only (`UPLOAD_DIR` is configured but unused by the pipeline). |
| "Served via authenticated API endpoint with signed URLs" | Downloads are authenticated by the per-job session token (not signed URLs). |
| CORS methods "`GET POST PATCH PUT DELETE OPTIONS`" | Actual allow-list is `GET, POST, PATCH, OPTIONS`. |
| CSP `connect-src` "includes `https://*.vercel.app http://localhost:8000`" | `vercel.json` has `*.onrender.com` + `*.vercel.app`; `next.config.ts` has `*.onrender.com` + `localhost:8000`. Neither includes both. |
| Tier tokens carry "a `purpose:"tier"` claim" | Isolation is structural (4-part payload vs 3-part job payload), not a JSON claim. |

**Impact.** Documentation integrity — same class as VULN-15 from the previous audit. Overstated controls create false confidence.

**Fix (implemented).** SECURITY.md revised to match the code, with a note that this audit re-verified it.

---

## 3. Credential & Secret Verification (double-checked)

Two independent passes were run:

1. **Working-tree scan** — regex sweep of every text file for: `AIza[0-9A-Za-z_-]{35}`, `sk-[A-Za-z0-9]{20,}`, `kn-[A-Za-z0-9]{20,}`, `rnd_[A-Za-z0-9]{20,}`, GitHub tokens (`ghp_`/`gho_`/`github_pat_`), AWS `AKIA…`, Supabase JWTs (`eyJhbGciOi…`), private-key blocks, and `scrypt$<salt>$<hash>` → **no real matches** (placeholders excluded).
2. **Full git-history scan** — every blob in all 76 commits / 1,051 text blobs decompressed and scanned with the same patterns → **no real matches**. No secret has ever been committed.

Additional checks:

- `git ls-files` contains no `.env*` file (only `.env.example`).
- Frontend bundle inputs: only `NEXT_PUBLIC_API_URL` is exposed to the browser.
- No key material in any error string, log call, or API response path (only the key pool's masked suffix `...abc123`).
- Render environment: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `TIER_ACCOUNT_PASSWORD_HASH`, `SECRET_KEY` are set as secret values; `GET /api/health` reports only a boolean (`ai_configured`).
- Password: only the scrypt hash is stored; plaintext is never written to disk, logs, or the repository.

**Conclusion: API keys and the account password are not obtainable from the repository, the frontend, logs, or public endpoints.**

---

## 4. Remediation Status

| # | Finding | Status | Change |
|---|---------|--------|--------|
| AUDIT-01 | XFF spoofing bypasses quotas/limits | ✅ Fixed | `--no-proxy-headers` + `TRUSTED_PROXIES=*` + `CF-Connecting-IP`-first resolution; regression tests |
| AUDIT-02 | Raw internal error returned | ✅ Fixed | Generic client message + server-side log with job ID; regression test |
| AUDIT-03 | `~=` ranges vs "pinned" claim | ✅ Fixed | Exact pins for all eight dependencies |
| AUDIT-04 | SECURITY.md inaccuracies | ✅ Fixed | SECURITY.md revised (this audit) |

**Post-fix verification:** full backend suite green (295 tests), CI green, `pip-audit` clean, and a **live re-test on the redeployed service** confirms the fix (see §6).

---

## 5. Residual Risks / Accepted Limitations

| Risk | Status |
|---|---|
| `TRUSTED_PROXIES=*` trusts any direct peer | Accepted — the service is only reachable through Render's load balancer (no public port); `--no-proxy-headers` prevents peer rewriting. Revisit if the service is ever exposed directly. |
| Client-supplied `CF-Connecting-IP` requests are rejected at the edge | Accepted/by design — Cloudflare sanitizes this header; clients cannot spoof it. Browsers never send it. |
| In-memory rate limiter resets on deploy/restart | Accepted (documented) — conservative reset, no persistence requirement at this scale. |
| Shared account password is a single credential | Accepted by design (ADR-020); per-IP quotas remain the cost control. |
| localStorage tier-token fallback is XSS-readable | Accepted — CSP + no DOM injection sinks; token is scoped to the account tier only. |
| No server-side token revocation (logout is cookie-clear + expiry) | Accepted for v1; noted as future hardening in ADR-020. |

---

## 6. Live Verification (post-remediation, 2026-09-27)

After merging the fix and redeploying the production service, the spoof probes were re-run:

| Probe | Before fix | After fix |
|---|---|---|
| Real bucket (no header) | `2` | `1` (after 1 upload) |
| `X-Forwarded-For: 203.0.113.99` (fixed value, 8×) | `0` each (fresh bucket) | `1` each (same bucket) |
| Rotating `X-Forwarded-For: 203.0.113.1..8` | fresh bucket per value | `[1,1,1,1,1,1,1,1]` — constant |
| Client-supplied `CF-Connecting-IP` | (not tested pre-fix) | Connection reset at Cloudflare's edge — not spoofable |

Interpretation: rotating XFF no longer creates fresh buckets, which is only possible because `CF-Connecting-IP` (set by Cloudflare) is present and preferred by `get_client_ip()`. **AUDIT-01 is closed.**

**Deployment note (important):** the production Render service is **not Blueprint-managed** — `render.yaml` changes do not auto-apply. The two required settings were applied via the Render API and must be preserved:
1. `startCommand = uvicorn app.main:app --host 0.0.0.0 --port $PORT --no-proxy-headers`
2. `TRUSTED_PROXIES=*`

The repository `render.yaml` already declares both, so a future Blueprint adoption or manual re-creation inherits them.
