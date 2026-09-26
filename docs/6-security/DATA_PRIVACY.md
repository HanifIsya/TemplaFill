# Data Privacy Policy

> Defines how TemplaFill collects, processes, stores, and deletes user data.

---

## Principles

1. **Minimal Collection** — We collect only what's necessary to provide the service
2. **Transparent Processing** — Users know exactly what happens to their documents
3. **User Control** — Users can delete their data at any time
4. **Short Retention** — Documents are auto-deleted within 24 hours
5. **No Training by TemplaFill** — We never use user documents to train our own models
6. **Honest Tier Disclosure** — Each tier states plainly which AI provider receives the data

---

## Tiers & Data Handling (Phase 6)

TemplaFill has two tiers with different external data flows. There is one shared account credential; no per-user profile is stored.

| Data | Free tier (Gemini) | Account tier (DeepSeek) |
|------|--------------------|--------------------------|
| Document text → Google (extraction) | ✅ yes (free Gemini API) | ❌ never |
| Document chunks → Google (embeddings) | ✅ yes | ❌ never (retrieval bypassed) |
| Document text → DeepSeek | ❌ n/a | ✅ yes |
| PII masked before any LLM call (ADR-018) | ✅ | ✅ |
| Document persisted server-side | ❌ RAM only, ≤24h TTL | ❌ RAM only, ≤24h TTL |
| History/results storage | browser `localStorage` only | browser `localStorage` only |

- **Free tier**: Google's free-tier terms permit prompt data to be used to improve Google's products. This is disclosed in the UI (landing/upload) and in the Help guide.
- **Account tier**: No Gemini extraction and no Gemini embeddings — documents never reach Google. DeepSeek API retention/training wording stays **generic** until its terms are verified in writing (task 6.15); no specific no-training claim is published before then.
- **Browser-local history** means *storage*, not *processing*: files still cross the network to the server, are held in RAM only for the job, and are purged within 24 hours.

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

### Account Data (Shared Credential — Phase 6)
| Data | Purpose | Retention |
|------|---------|-----------|
| Shared username + password hash | Tier authentication (one fixed credential) | Server env only, until rotation |
| Tier token (signed, 30d) | Keep the user signed in | HttpOnly cookie + `localStorage`; expiry 30d |
| Session history (metadata only) | User convenience | Browser `localStorage` only — never synced |

> **No per-user profile is stored.** TemplaFill does not store emails, names, or any identifier about who logs in.

### Automatically Collected
| Data | Purpose | Retention |
|------|---------|-----------|
| IP address | Rate limiting, abuse prevention | 30 days (server logs) |
| Browser user-agent | Compatibility, debugging | 30 days (server logs) |
| Usage analytics (anonymous) | Product improvement | Aggregated, no PII |

---

## What We DON'T Collect

- ❌ **Document content is NOT logged** — text extracted from PDFs is never written to logs
- ❌ **Documents are NOT used by TemplaFill for AI training** — we use API mode (not data-sharing mode). Note: Google's **free tier** may use Gemini prompt data to improve its products (disclosed in the UI); the account tier never sends documents to Google
- ❌ **No cookies for tracking** — only functional cookies (job session + tier auth)
- ❌ **No third-party analytics that receive document content**

---

## Data Processing

### Third-Party Services

| Service | Data Shared | Purpose | Their Privacy Policy |
|---------|------------|---------|---------------------|
| Gemini API (Google) | Document text chunks (temporary, via API) — **free tier only** | AI extraction + embeddings | [Google AI Privacy](https://ai.google.dev/terms) |
| DeepSeek API | Document text (temporary, via API) — **account tier only** | AI extraction (no embeddings) | DeepSeek API terms (verification pending, task 6.15) |
| Hosting provider | Encrypted files on disk | Storage | Varies by provider |

> **Important**: Gemini API free tier data usage policy — Google states that free-tier API data may be used for model improvement. To protect user privacy under free-tier usage, TemplaFill enforces **Selective PII Masking** before transmitting chunks to external LLM endpoints. Account-tier jobs do not call Google at all.

### Selective PII Masking (Sanitize → Store Map → Call → Restore)
TemplaFill protects confidential identity and financial details through automated client/server pseudonymization:
1. **Pre-Transmission Sanitization**:
   Before text chunks are transmitted to Gemini API, a deterministic regex scanner isolates sensitive high-entropy PII:
   - **NPWP** (Indonesian Tax IDs) $\rightarrow$ replaced with `[TOKEN_NPWP_1]`, `[TOKEN_NPWP_2]`
   - **NIK / KTP** (Citizen IDs) $\rightarrow$ replaced with `[TOKEN_NIK_1]`
   - **Bank Account Numbers** (preceded or labeled by bank/rekening) $\rightarrow$ replaced with `[TOKEN_REK_1]`
   - **Email Addresses** $\rightarrow$ replaced with `[TOKEN_EMAIL_1]`
   - **Phone Numbers** $\rightarrow$ replaced with `[TOKEN_PHONE_1]`
2. **Context Preservation (100% Accuracy Guarantee)**:
   To ensure extraction accuracy is never degraded, semantic contextual elements are **explicitly preserved without masking**:
   - Company names (`PT`/`CV`) remain intact so LLMs accurately distinguish Client from Vendor roles.
   - Representative names and job titles (`Ir. Bambang Wijaya, M.T. — Direktur Utama`) remain intact.
   - Project titles, scopes, narrative clauses, dates, financial amounts, and payment percentages remain untouched.
3. **In-Memory Pseudonymization Map**:
   A mapping table (`token -> real_value`) is kept strictly in volatile server RAM for the duration of the request and is never logged or transmitted over the wire.
4. **Post-Extraction Restoration (Unmasking)**:
   When Gemini returns structured field values containing surrogate tokens, TemplaFill restores the real values prior to template generation and user display.

### Data Flow
```
User uploads → Server receives → (RAM only, never persisted) →
→ Text extracted (in memory) → Selective PII Masker (Tokens generated) →
→ Sanitized chunks sent to the active provider (Gemini free tier | DeepSeek account tier) →
→ Provider extracts tokens → Unmasker restores real PII values →
→ User reviews → Document generated → User downloads → Auto-deleted after 24h
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
- [ ] Account-tier jobs make zero Google calls
- [ ] Any tier privacy claim matches verified provider terms (task 6.15)
- [ ] New data collection is documented in this file
