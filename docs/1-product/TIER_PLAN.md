# TemplaFill Tier Plan — Free (Gemini) vs Account (DeepSeek)

> **Status**: PROPOSED — awaiting user approval before implementation starts.
> **Author**: OpenCode (user-directed, 2026-09-26)
> **Companion**: [TIER_ARCHITECTURE.md](../2-architecture/TIER_ARCHITECTURE.md) (technical design)
> **Approval gate**: Nothing in Phase 6 of [TASKS.md](../4-coordination/TASKS.md) starts until the user says "go".

---

## 1. Why We Are Adding Tiers

| Problem today | How tiers solve it |
|---|---|
| Everything runs on the **Gemini free plan**: strict 15 RPM / 1,500 RPD quota, so jobs randomly fail with 429/404/503 and users see the amber fallback banner | Account tier runs on **DeepSeek V4.1-Flash**, a paid API with no free-tier quota — reliable |
| Google's **free-tier terms allow prompt data to be used to improve products** — documents sent to Gemini may be used for training | Account tier is positioned as **privacy-safe processing** (DeepSeek API terms verified before any public claim — task 6.15) |
| No reason for a user to identify themselves | An account (granted by personal request) unlocks the better, private engine |

---

## 2. Tier Definitions

| | **Free tier** (default, anonymous) | **Account tier** (logged in) |
|---|---|---|
| **AI engine** | Gemini free plan (`gemini-3.6-flash` extraction + `gemini-embedding-001` RAG) | DeepSeek **`deepseek-flash`** (DeepSeek-V4.1-Flash) |
| **Privacy** | ⚠️ Documents are processed through Google's free API — Google may use prompts to improve its products. Selective PII masking still strips NPWP/NIK/account numbers/emails/phones first | ✅ Documents never reach Google: no Gemini extraction **and no Gemini embeddings**. DeepSeek API terms: you retain rights to inputs; no-training claim must be verified (task 6.15) before we publish it |
| **Reliability** | Subject to Google free quota (15 RPM / 1,500 RPD); may fall back to the local heuristic engine and show the amber notice | No free-tier quota; only DeepSeek-side errors. **Never silently falls back to Google** — on DeepSeek failure it uses the local heuristic engine only |
| **Usage limit** | **5 jobs/day per IP** (new, user decision 2026-09-26) | Generous daily cap (cost guard, proposed 50 jobs/day/IP — tunable) |
| **PII masking** | On (ADR-018) | On as defense-in-depth |
| **Cost to user** | Free | Free to the user (host absorbs DeepSeek token cost ≈ $0.002 per typical contract job) |
| **How to get it** | Just open the website | **Email first, then credentials** (see §3) |

### Free-tier disclosures (must be visible, not buried)
1. On the landing/upload screen: free tier is powered by Google Gemini free API → *may be rate-limited* and *prompt data may be used by Google to improve its services*.
2. When the quota runs out: clear "5 jobs/day reached — request an account" state with the contact email.
3. HelpModal privacy tab rewritten to explain both tiers honestly (current text only describes Gemini + masking).

### Account-tier positioning (must be true before it ships)
- "Your documents are not sent to Google on this tier."
- "Processing is powered by DeepSeek (V4.1-Flash)." — engine badge already exists in the UI, add `deepseek`.
- No claim is published until task 6.15 confirms DeepSeek's API no-training / retention terms in writing.

---

## 3. Onboarding Flow (user decision: one fixed shared account)

```
1. Visitor wants the account tier
        ↓
2. Opens the site → clicks "Request an account" → sees email:
        hanif.isya.annafi-2024@fst.unair.ac.id
        ↓
3. Emails the owner (what for: name/organization + intended use — owner's discretion)
        ↓
4. Owner replies manually with the ONE shared username + password
        (single fixed credential, shared with every approved person)
        ↓
5. User opens TemplaFill → Login modal → enters shared credentials
        → backend validates → signed tier token issued (30 days)
        → UI switches to Account tier (badge, DeepSeek engine, no Gemini notice)
```

**Rules of the shared account**
- There is **no self-registration** anywhere in the product.
- The password lives only as a **salted hash on the server** (`TIER_ACCOUNT_PASSWORD_HASH` env var) — never in code, never in git.
- The owner can rotate the password anytime; all users must ask for the new one (no user database to migrate).
- Login attempts are rate-limited (5/min/IP) with a generic "Invalid credentials" error.

**Not in scope (explicit non-goals)**
- ❌ Payments / subscriptions / Stripe
- ❌ Per-user accounts, password reset, email verification
- ❌ Multi-seat admin dashboard
- ❌ Storing user emails or any user profile data — we store nothing about who logs in

---

## 4. Where Documents Live (user decision: browser-local history)

| Data | Location | Lifetime |
|---|---|---|
| Uploaded source PDF + template | Backend **RAM only** (already true today — never written to disk or DB) | ≤ 24 h (TTL eviction, `FILE_RETENTION_HOURS`) |
| Extracted fields / edited values / job metadata | Backend RAM while the job lives; **persisted to the browser** as the session history | ≤ 24 h server-side; browser keeps it until the user clears it |
| Filled document bytes | Backend RAM → streamed to browser for download | ≤ 24 h server-side |
| Session history, results, filled-doc metadata | **`localStorage` only** — never synced to any server/DB | Until user clears browser data |
| Tier token | HttpOnly cookie + `localStorage` fallback (no document content inside it) | 30 days |

**Consequence**: nothing identifiable survives in the backend after 24 h, and history is readable **only inside that user's browser**. Note honestly: files must still cross the network to be processed — "localStorage" means *storage*, not *processing*.

---

## 5. Success Criteria

1. Anonymous user can complete the full flow and sees an honest free-tier privacy/quota notice.
2. Free user blocked after 5 jobs/day/IP with a clear account-request path (email shown).
3. Logged-in user's jobs run on DeepSeek — provably **zero Gemini calls** on that path (asserted by a test with Gemini mocked to explode).
4. DeepSeek outage → local heuristic fallback + notice, never a silent switch to Google.
5. All suites green: backend pytest, frontend tests, lint/build, eval for both provider paths (offline/fake modes).
6. Docs (PRD, USER_GUIDE, API, SECURITY, DATA_PRIVACY, TESTING, FEEDBACK_LOOP) match the shipped behavior.

---

## 6. Rollout

| Stage | Content | Owner |
|---|---|---|
| **0. Plan approval** | User approves this file + TIER_ARCHITECTURE.md | User |
| **1. Backend foundation** | Tier auth, quotas, DeepSeek extractor, provider selection, tests, env | OpenCode |
| **2. Frontend experience** | Login modal, badges, disclosures, localStorage history, tier tests | Antigravity |
| **3. Docs & quality** | PRD/USER_GUIDE/API/SECURITY/privacy docs, TESTING + FEEDBACK_LOOP sync | Antigravity + OpenCode |
| **4. Joint verification** | Live E2E both tiers, eval both providers, privacy-term verification, CHANGELOG | Both |

Risks and mitigations are listed in TIER_ARCHITECTURE.md §9.
