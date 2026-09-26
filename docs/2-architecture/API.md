# API Specification

> REST API contract between frontend and backend. Both agents MUST follow this contract.
> Base URL: `/api` (proxied through Next.js in dev, direct in production)

---

## Authentication

**Current (MVP + Phase 6 tiers, 2026-09-26)**: Public endpoints are `GET /api/health` and `POST /api/upload`. Every uploaded job is protected by a **signed per-job session token** (VULN-01 fix):

- `POST /api/upload` returns `data.session_token` and sets an HttpOnly session cookie.
- `GET/PATCH/POST /api/jobs/{job_id}/...` require that token (via the cookie or `X-Session-Token` header). Callers without it receive `404` (not `403`) so job IDs cannot be enumerated.
- `REQUIRE_SESSION_TOKEN` (default `true`) toggles enforcement; the test client is exempt so CI can run without cookie plumbing.

Phase 6 adds a lightweight **tier layer** on top of the anonymous flow (no per-user accounts):
- A single **shared credential** (env `TIER_ACCOUNT_USERNAME` + `TIER_ACCOUNT_PASSWORD_HASH`) issues a signed **tier token** (HMAC, 30d, `purpose:"tier"`) via `POST /api/auth/login`.
- Tier tokens and per-job tokens are **mutually invalid** (the `purpose` claim isolates them).
- `POST /api/upload` accepts the tier token via `X-Session-Token`; a valid token makes the job `tier:"pro"` (DeepSeek), otherwise `tier:"free"` (Gemini). See the **Tiers & Auth** section below.

Full user accounts (per-user IDs, JWT, refresh) remain **not planned** — the tier system deliberately reuses one shared credential:

```
# Legacy/planned only — superseded by shared-credential tier tokens
Authorization: Bearer <jwt_token>  # HS256, 15m access / 7d refresh, double-submit CSRF
```

Each upload creates a `Job` bound to its session token (`manager.py:create_job`). `InMemoryRateLimiter` resolves the client IP from trusted-proxy headers (`get_client_ip`), with `testclient` exempt so CI never 429s; limits are per-IP.

---

## Tiers & Auth (Phase 6)

> Design reference: [TIER_ARCHITECTURE.md](./TIER_ARCHITECTURE.md) · Product: [TIER_PLAN.md](../1-product/TIER_PLAN.md)

| | Free tier (anonymous) | Account tier (logged in) |
|---|---|---|
| Trigger | no tier token on upload | valid tier token on upload |
| Extraction | Gemini `gemini-3.6-flash` | DeepSeek `deepseek-flash` |
| Embeddings | Gemini `gemini-embedding-001` | **none — retrieval bypassed** |
| Fallback | local heuristic | local heuristic **only** (never Gemini) |
| `engine_used` / `extracted_by` | `gemini` / `hybrid` / `heuristic` | `deepseek` / `heuristic` |
| Daily cap | **5 jobs/day per IP** | 50 jobs/day per IP (tunable cost guard) |

### `POST /api/auth/login`

Exchange the shared credential for a signed tier token.

**Request Body**:
```json
{ "username": "shared-user", "password": "shared-password" }
```

**Response** `200` (also sets HttpOnly `tier_token` cookie):
```json
{
  "success": true,
  "data": { "tier": "pro", "token": "eyJ... (signed tier token, 30d)" }
}
```

**Errors**:
- `401 UNAUTHORIZED` — generic `"Invalid credentials"` (constant-time compare; no user enumeration)
- `429 RATE_LIMITED` — `auth` category, **5/min/IP**, with `Retry-After`
- `503` — tier system not configured (missing `TIER_ACCOUNT_PASSWORD_HASH`)

### `POST /api/auth/logout`

Clears the tier cookie and returns `200`. Best-effort client-side: the token is also removed from `localStorage`. Token expiry is the real boundary (no server-side revocation list in v1).

### `GET /api/auth/quota`

Powers the free-tier countdown and confirms the active tier.

**Response** `200`:
```json
{
  "success": true,
  "data": { "free_used_today": 2, "free_limit": 5, "tier": "free" }
}
```

Accepts an optional tier token so a signed-in user sees `"tier":"pro"`.

### `POST /api/upload` (tier additions)

- **Request header** `X-Session-Token: <tier token>` (optional) — when valid, the job is created with `tier:"pro"`.
- **Response** now includes `"tier": "free" | "pro"` alongside `job_id`, `session_token`, etc.
- **Errors**: `429 QUOTA_EXCEEDED` with `Retry-After` when the per-IP daily cap (5 free / 50 pro) is reached. The frontend maps `error.code === "QUOTA_EXCEEDED"` to the account-request screen showing `hanif.isya.annafi-2024@fst.unair.ac.id`.

```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily extraction limit reached. Request an account for a higher limit."
  }
}
```

### `GET /api/jobs/{job_id}` (tier addition)

The status payload adds `"tier": "free" | "pro"` so the UI can render the correct engine context.

### Frontend storage contract

| Key | Contents | Lifetime |
|---|---|---|
| `tf_tier_token` | signed tier token (cookie-blocked fallback) | 30 days |
| `tf_history` | array of history entries (schema below) | until user clears browser data |

```ts
// tf_history entry
{
  sessionId: string;
  createdAt: string;          // ISO
  tier: 'free' | 'pro';
  engineUsed: 'gemini' | 'deepseek' | 'heuristic' | 'hybrid' | 'mock';
  sourceDoc: { filename: string; size: number };
  templateDoc: { filename: string; format: string };
  overallConfidence: number;
  fieldCount: number;
  filledFilename: string;
  downloadExpired: boolean;   // server bytes expire with the job (≤24h)
}
```

---

## Common Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description",
    "details": { ... }
  }
}
```

### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created (new resource) |
| 202 | Accepted (async job started) |
| 400 | Validation error |
| 401 | Unauthorized |
| 404 | Resource not found |
| 413 | File too large |
| 415 | Unsupported file type |
| 429 | Rate limited |
| 500 | Server error |

---

## Endpoints

### Health

#### `GET /api/health`
Health check endpoint — lightweight, no DB (for Render Hobby wake detection).

**Source**: `backend/app/api/health.py:14` `get_settings().app_version` + `ai_configured` + `model`.

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "timestamp": "2026-09-23T14:30:00Z",
    "ai_configured": true,
    "model": "gemini-3.6-flash"
  }
}
```

**Debug** `GET /api/debug/gemini` (only when `DEBUG=true`; otherwise `404`, `health.py:35`). Probes each candidate model plus embedding dims; helpful in production post-deploy smoke (`uvicorn` logs).

---

### File Upload

#### `POST /api/upload`
Upload source PDF and template file. Starts a new processing job.

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_file` | File | Yes | Source PDF document |
| `template_file` | File | Yes | Template document (.docx, .xlsx, .pptx) |
| `X-Session-Token` (header) | string | No | Valid **tier token** → `tier:"pro"` (Phase 6) |

**Validation** (`backend/app/api/upload.py:53`):

- `source_file`: Must be PDF (`.pdf` ext + `%PDF` magic after BOM trim, `upload.py:94`), max `50MB` (`MAX_SOURCE_MB`), max `500` pages (checked in `extract_pdf` → `PdfExtractionError` → `failed`), non-empty
- `template_file`: Must be `.docx`/`.xlsx`/`.pptx` (`ALLOWED_TEMPLATE_EXTS`) + `PK` zip magic (`upload.py:99`), max `20MB`, non-empty
- Filenames sanitized via `sanitize_filename()` (`../`/`null`/unsafe→ `_`) before `create_job`
- Rate limit: `10/hr` per IP (`InMemoryRateLimiter: upload`), `Retry-After` header on 429; `testclient` exempt
- Tier quotas (Phase 6): `free_upload` **5/day** per IP, `pro_upload` 50/day per IP → 429 `QUOTA_EXCEEDED`

**Response** `202`:
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "tier": "free",
    "source_file": {
      "filename": "court_filing.pdf",
      "size_bytes": 2048576,
      "page_count": 150
    },
    "template_file": {
      "filename": "case_summary_template.docx",
      "size_bytes": 45056,
      "format": "docx"
    },
    "estimated_time_seconds": 45,
    "created_at": "2026-09-23T14:30:00Z",
    "session_token": "eyJ... (signed per-job access token; also set as HttpOnly cookie)"
  }
}
```

**Errors**:
- `413`: File too large / request body over `MAX_REQUEST_BODY_MB`
- `415`: Unsupported file type
- `400`: Unsafe template archive (ZIP-bomb guard)
- `400`: Missing required file
- `429 QUOTA_EXCEEDED`: daily per-IP cap reached (free 5 / pro 50), `Retry-After` header set

---

### Job Status

#### `GET /api/jobs/{job_id}`
Get the current status of a processing job.

**Path Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `job_id` | UUID | Job identifier |

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "extracting",
    "progress": {
      "phase": "field_extraction",
      "current_field": 8,
      "total_fields": 15,
      "percent": 53
    },
    "created_at": "2026-09-23T14:30:00Z",
    "started_at": "2026-09-23T14:30:02Z",
    "completed_at": null
  }
}
```

**Status values** (`backend/app/services/jobs/models.py:13`): `queued` → `processing` (pdf 15%→25%, embedding 35%→55%) → `mapping` (60%) → `extracting` (80%→98%, ADR-015) → `completed` | `failed` (`generating` is a `202` virtual state set on `POST /confirm`)

`progress.phase` mirrors the same stages (`queued/pdf_extraction/embedding/template_mapping/ai_extraction`); `GET /health` polls `5s×12` for wake detection.

---

### Extraction Results

#### `GET /api/jobs/{job_id}/results`
Get extraction results (mapping preview) for a completed job — with engine provenance (ADR-014).

**Source**: `backend/app/services/jobs/models.py:108` `to_results_dict()` + `backend/app/api/jobs.py:61`.

**Response** `200` (actual shape, superset of early draft — early fields still compatible; new fields are additive):

```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "overall_confidence": 0.87,
    "fields_found": 12,
    "fields_not_found": 3,
    "has_ai_error": false,
    "has_fallback": false,
    "engine_used": "gemini",
    "fallback_reason": null,
    "fields": [
      {
        "field_id": "f1a2b3c4-...",
        "field_name": "full_name",
        "field_label": "Full Name",
        "placeholder": "{{full_name}}",
        "extracted_value": "John Doe",
        "confidence": 0.95,
        "source_reference": {
          "page": 3,
          "snippet": "...the applicant, John Doe, hereby declares..."
        },
        "status": "extracted",
        "is_manually_edited": false,
        "extracted_by": "gemini",
        "fallback_reason": null
      },
      {
        "field_id": "a5b6c7d8-...",
        "field_name": "phone_number",
        "field_label": "Phone Number",
        "placeholder": "{{phone_number}}",
        "extracted_value": null,
        "confidence": 0.0,
        "source_reference": null,
        "status": "not_found",
        "is_manually_edited": false,
        "extracted_by": "heuristic",
        "fallback_reason": "Gemini API Error: 429 Too Many Requests"
      }
    ]
  }
}
```

`engine_used`: `gemini` (all Gemini) | `heuristic` (all fallback) | `hybrid` (mixed). `has_ai_error`/`has_fallback` mirrors whether any field has `extracted_by==heuristic` or snippet contains `AI_ERROR`. Generic `429/404` prefixes are sanitized server-side (`jobs.py:225` never leaks raw trace); frontend renders `[Gemini 3.6 Flash]` vs `[Fallback]` badges.

---

### Field Edit

#### `PATCH /api/jobs/{job_id}/fields/{field_id}`
Edit a specific field value (manual correction).

**Request Body**:
```json
{
  "value": "Jane Doe",
  "action": "edit"
}
```

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `value` | string | No | New value (required if action is "edit") | Sanitized `sanitize_text_input(max_len=5000)`; empty string clears; confidence forced `1.0` on edit (`jobs.py:128`) |
| `action` | string | Yes | `edit`, `skip`, `confirm`, `re_extract` | Validated strictly (`jobs.py:118`) |
| `hint` | string | No | Hint for `re_extract` | Sanitized `max_len=2000` (`jobs.py:168`), controls retriever `field_description` |

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "field_id": "f1a2b3c4-...",
    "field_name": "full_name",
    "extracted_value": "John Doe",
    "user_edited_value": "Jane Doe",
    "status": "edited",
    "is_manually_edited": true
  }
}
```

---

### Confirm All Fields

#### `POST /api/jobs/{job_id}/confirm`
Confirm all field values and trigger style-preserving document generation.

**Source**: `backend/app/api/jobs.py:228` (rate `30/min write`, `sanitize_filename` on output, RFC5987).

**Request Body** (optional):
```json
{
  "include_summary_report": true
}
```

`mapped` is built from `Job.field_results`: `skipped → omitted`, `is_manually_edited?user_edited_value:extracted_value`, empty/whitespace→ omitted (`jobs.py:255`); also adds normalized key `field_name` as alias for replacement. If `mapped` empty → `400 VALIDATION_ERROR: No fields to generate`. Calls `mapping/generator.generate_filled_document()` → stores `filled_doc_bytes` + `filled_doc_filename = "{stem}_Filled_{job_id[:8]}{ext}"`.

**Response** `202`:
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "generating",
    "message": "Document generation started"
  }
}
```

Frontend immediately treats the job as ready for `GET /download?type=filled` (no second polling needed).

---

### Download

#### `GET /api/jobs/{job_id}/download`
Download the filled document.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `filled` | `filled` (filled template) or `summary` (extraction summary report) |

**Response** `200` (`jobs.py:294`):
- Content-Type mapped per `template_filename` ext: `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `.xlsx` → `...spreadsheetml.sheet`, `.pptx` → `...presentationml.presentation`
- Content-Disposition `attachment; filename="..." ; filename*=UTF-8''...` (RFC 5987 encoded via `quote(sanitize_filename(...))` + `X-Content-Type-Options: nosniff` to prevent MIME sniff)
- Body: Binary `filled_doc_bytes`

**Errors**:
- `404 NOT_FOUND` job unknown or `NOT_COMPLETED` if `status != completed` or `filled_doc_bytes == null` (message `"Call POST /api/jobs/{id}/confirm first."`)
- `501 NOT_IMPLEMENTED` for `type=summary` (planned; `include_summary_report` flag is stored as `_include_summary` but report not yet emitted)
- `410` reserved for future file expiry after 24h retention (current in-memory store has no TTL; expiry documented in `SECURITY.md`)

---

### Re-extract Field

#### `POST /api/jobs/{job_id}/fields/{field_id}/re-extract`
Re-run extraction for a specific field, optionally with a user hint.

**Request Body**:
```json
{
  "hint": "Look for the date near the signature section on the last page"
}
```

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "field_id": "f1a2b3c4-...",
    "field_name": "signing_date",
    "previous_value": null,
    "new_value": "2026-08-15",
    "confidence": 0.88,
    "source_reference": {
      "page": 45,
      "snippet": "...signed on this 15th day of August, 2026..."
    },
    "status": "extracted"
  }
}
```

---

### Source Preview

#### `GET /api/jobs/{job_id}/source/page/{page_number}`
Get source PDF page content for verification.

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `highlight` | string | Text to highlight on the page |

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "page_number": 3,
    "total_pages": 150,
    "content": "Full text content of page 3...",
    "tables": [
      {
        "table_index": 0,
        "headers": ["Name", "Date", "Amount"],
        "rows": [["John Doe", "2026-01-15", "$5,000"]]
      }
    ]
  }
}
```

---

## Rate Limiting (`backend/app/core/security.py:98` `InMemoryRateLimiter`)

| Endpoint | Limit | Window | Key | Returns |
|----------|-------|--------|-----|---------|
| `POST /api/upload` | 10 | per hour per IP | `upload` | `429 RATE_LIMITED` + `Retry-After` header |
| `POST /api/upload` (free tier) | **5** | **per day per IP** | `free_upload` | `429 QUOTA_EXCEEDED` + `Retry-After` (Phase 6) |
| `POST /api/upload` (account tier) | **50** | **per day per IP** | `pro_upload` | `429 QUOTA_EXCEEDED` + `Retry-After` (cost guard, Phase 6) |
| `POST /api/auth/login` | **5** | **per minute per IP** | `auth` | `429 RATE_LIMITED` + `Retry-After` (Phase 6) |
| `GET /api/jobs/*` (`/jobs/{id}`, `/results`, `/source/page/{n}`) | 60 | per minute per IP | `read` | internal category (not yet enforced on GET path, but polling is cheap `/health`→ no limit) |
| `PATCH /api/jobs/*/fields/*` & `POST /api/jobs/*/confirm` | 30 | per minute per IP | `write` | `429` after 30/min (`jobs.py:89,232`) |
| `POST /api/jobs/*/fields/*/re-extract` & alias `PATCH action=re_extract` | 5 | per minute per IP | `re_extract` | `429` + sanitized hint limit |
| Embeddings & extraction bursts | `15 RPM` Gemini free tier | global | Gemini throttle | `4s` embedder + `1.2s` extractor + `2.5s×attempt` backoff |

`is_allowed` exempts `ip in ("testclient","test")` so CI 167 tests never 429. Buckets are sliding-window `deque` (`security.py:122`), `retry_after` computes oldest+window−now.

---

## WebSocket Events (Optional Enhancement)

For real-time progress updates instead of polling:

```
WS /api/ws/jobs/{job_id}
```

**Events**:
```json
{"event": "status_change", "data": {"status": "processing"}}
{"event": "progress", "data": {"phase": "extraction", "current": 5, "total": 15}}
{"event": "field_extracted", "data": {"field_name": "full_name", "value": "John Doe"}}
{"event": "completed", "data": {"overall_confidence": 0.87}}
{"event": "error", "data": {"message": "Gemini API rate limited, retrying..."}}
```
