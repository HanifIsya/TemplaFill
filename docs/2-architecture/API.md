# API Specification

> REST API contract between frontend and backend. Both agents MUST follow this contract.
> Base URL: `/api` (proxied through Next.js in dev, direct in production)

---

## Authentication

All endpoints except health check require authentication via JWT Bearer token.

```
Authorization: Bearer <jwt_token>
```

For MVP, anonymous usage is allowed (no auth required). Auth will be added in Phase 2.

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
Health check endpoint.

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "timestamp": "2026-09-23T14:30:00Z"
  }
}
```

---

### File Upload

#### `POST /api/upload`
Upload source PDF and template file. Starts a new processing job.

**Request**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source_file` | File | Yes | Source PDF document |
| `template_file` | File | Yes | Template document (.docx, .xlsx, .pptx) |

**Validation**:
- `source_file`: Must be PDF, max 50MB, max 500 pages
- `template_file`: Must be .docx, .xlsx, or .pptx, max 20MB

**Response** `202`:
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
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
    "created_at": "2026-09-23T14:30:00Z"
  }
}
```

**Errors**:
- `413`: File too large
- `415`: Unsupported file type
- `400`: Missing required file

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

**Status values**: `queued` → `processing` → `extracting` → `mapping` → `completed` | `failed`

---

### Extraction Results

#### `GET /api/jobs/{job_id}/results`
Get extraction results (mapping preview) for a completed job.

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "overall_confidence": 0.87,
    "fields_found": 12,
    "fields_not_found": 3,
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
        "is_manually_edited": false
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
        "is_manually_edited": false
      }
    ]
  }
}
```

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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `value` | string | No | New value (required if action is "edit") |
| `action` | string | Yes | `edit`, `skip`, `confirm`, `re_extract` |
| `hint` | string | No | Hint for re-extraction (only when action is "re_extract") |

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
Confirm all field values and trigger document generation.

**Request Body** (optional):
```json
{
  "include_summary_report": true
}
```

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

---

### Download

#### `GET /api/jobs/{job_id}/download`
Download the filled document.

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | `filled` | `filled` (filled template) or `summary` (extraction summary report) |

**Response** `200`:
- Content-Type: `application/vnd.openxmlformats-officedocument.*` (or PDF for summary)
- Content-Disposition: `attachment; filename="Template_Name_Filled_2026-09-23.docx"`
- Body: Binary file

**Errors**:
- `404`: Job not found or not yet completed
- `410`: Files expired (past retention period)

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

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/upload` | 10 requests | per hour per IP |
| `GET /api/jobs/*` | 60 requests | per minute per IP |
| `PATCH /api/jobs/*/fields/*` | 30 requests | per minute per IP |
| `POST /api/jobs/*/fields/*/re-extract` | 5 requests | per minute per IP |

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
