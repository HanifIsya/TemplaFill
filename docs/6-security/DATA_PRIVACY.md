# Data Privacy Policy

> Defines how TemplaFill collects, processes, stores, and deletes user data.

---

## Principles

1. **Minimal Collection** — We collect only what's necessary to provide the service
2. **Transparent Processing** — Users know exactly what happens to their documents
3. **User Control** — Users can delete their data at any time
4. **Short Retention** — Documents are auto-deleted within 24 hours
5. **No Training** — User documents are NEVER used to train AI models

---

## What We Collect

### Document Data (Temporary)
| Data | Purpose | Retention |
|------|---------|-----------|
| Uploaded source PDF | Extract text for field matching | 24 hours, then deleted |
| Uploaded template | Detect placeholders for filling | 24 hours, then deleted |
| Extracted text & chunks | RAG pipeline processing | 24 hours, then deleted |
| Vector embeddings | Similarity search during extraction | 24 hours, then deleted |
| Generated filled document | User download | 24 hours, then deleted |

### Account Data (Persistent — Phase 2+)
| Data | Purpose | Retention |
|------|---------|-----------|
| Email address | Authentication, notifications | Until account deletion |
| Display name | UI personalization | Until account deletion |
| Password hash | Authentication | Until account deletion |
| Processing history (metadata only) | User convenience (re-download) | 7 days, or until deletion |

### Automatically Collected
| Data | Purpose | Retention |
|------|---------|-----------|
| IP address | Rate limiting, abuse prevention | 30 days (server logs) |
| Browser user-agent | Compatibility, debugging | 30 days (server logs) |
| Usage analytics (anonymous) | Product improvement | Aggregated, no PII |

---

## What We DON'T Collect

- ❌ **Document content is NOT logged** — text extracted from PDFs is never written to logs
- ❌ **Documents are NOT used for AI training** — Gemini API is called with `safetySettings`, and we use API mode (not data-sharing mode)
- ❌ **No cookies for tracking** — only functional cookies (auth session)
- ❌ **No third-party analytics that receive document content**

---

## Data Processing

### Third-Party Services

| Service | Data Shared | Purpose | Their Privacy Policy |
|---------|------------|---------|---------------------|
| Gemini API (Google) | Document text chunks (temporary, via API) | AI extraction | [Google AI Privacy](https://ai.google.dev/terms) |
| Hosting provider | Encrypted files on disk | Storage | Varies by provider |

> **Important**: Gemini API free tier data usage policy — Google states that free-tier API data may be used for model improvement. For production/enterprise use, consider upgrading to paid tier with data processing agreements. This is documented in `DECISIONS.md`.

### Data Flow
```
User uploads → Server receives → Encrypted at rest → 
→ Text extracted (in memory) → Chunks sent to Gemini API → 
→ Results stored in DB → User reviews → Document generated → 
→ User downloads → All data deleted after 24h
```

---

## User Rights

| Right | Implementation |
|-------|---------------|
| **Access** | Users can view their processing history and download results |
| **Deletion** | Users can delete any job and its associated files immediately |
| **Portability** | Users can download their filled documents in original format |
| **Rectification** | Users can edit extracted values before generating final document |
| **Objection** | Users can contact support to opt out of anonymous analytics |

---

## Compliance Considerations

| Framework | Status | Notes |
|-----------|--------|-------|
| GDPR (EU) | Aligned | Short retention, user deletion rights, consent-based |
| UU PDP (Indonesia) | Aligned | Data minimization, purpose limitation, user rights |
| CCPA (California) | Aligned | No data selling, deletion rights |
| SOC 2 | Future | Consider for enterprise tier |

---

## Privacy-by-Design Checklist

Before launching any feature, verify:

- [ ] No PII is written to application logs
- [ ] Document content is not stored beyond the retention period
- [ ] File deletion is confirmed (not just unlinked)
- [ ] API responses don't leak other users' data
- [ ] Error messages don't expose document content
- [ ] Gemini API calls don't include unnecessary context
- [ ] New data collection is documented in this file
