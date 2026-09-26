# Closed-Loop Feedback Process

> Defines the iterative development loop that ensures quality through automated testing, evaluation, and revision cycles.

---

## Overview

The Closed-Loop Feedback (CLF) process ensures that every code change is validated against quality criteria before being accepted. It replaces the traditional "write code → commit → hope it works" with a disciplined cycle of **implement → test → evaluate → diagnose → fix → repeat**.

```mermaid
flowchart TD
    START([Agent picks up task]) --> IMPLEMENT[Implement Code Change]
    IMPLEMENT --> UNIT_TEST[Run Unit Tests]

    UNIT_TEST -->|Pass| INTEGRATION_TEST[Run Integration Tests]
    UNIT_TEST -->|Fail| DIAGNOSE_UNIT[Read Error Logs]
    DIAGNOSE_UNIT --> FIX_UNIT[Fix Code]
    FIX_UNIT --> UNIT_TEST

    INTEGRATION_TEST -->|Pass| IS_EXTRACTION{Extraction-related change?}
    INTEGRATION_TEST -->|Fail| DIAGNOSE_INT[Read Error Logs]
    DIAGNOSE_INT --> FIX_INT[Fix Code]
    FIX_INT --> INTEGRATION_TEST

    IS_EXTRACTION -->|No| UPDATE[Update CONTEXT.md + TASKS.md]
    IS_EXTRACTION -->|Yes| PROVIDER{Which provider does this affect?}

    PROVIDER -->|Gemini or shared code| EVAL[Run Eval Suite --provider gemini]
    PROVIDER -->|DeepSeek only| EVALD[Run Eval Suite --provider deepseek]
    PROVIDER -->|Multiple providers| BOTH[Run eval for BOTH providers]

    EVAL -->|Pass thresholds| UPDATE
    EVAL -->|Fail thresholds| DIAGNOSE_EVAL[Analyze Eval Results]
    EVALD -->|Pass thresholds| UPDATE
    EVALD -->|Fail thresholds| DIAGNOSE_EVAL
    BOTH -->|Pass thresholds| UPDATE
    BOTH -->|Any fail| DIAGNOSE_EVAL
    DIAGNOSE_EVAL --> OPTIMIZE[Optimize: prompts, chunking, retrieval, batching]
    OPTIMIZE --> EVAL
    OPTIMIZE --> EVALD
    OPTIMIZE --> BOTH

    UPDATE --> COMMIT[Commit + Push]
    COMMIT --> DONE([Task Complete])

    style DIAGNOSE_UNIT fill:#FEF2F2,stroke:#EF4444
    style DIAGNOSE_INT fill:#FEF2F2,stroke:#EF4444
    style DIAGNOSE_EVAL fill:#FEF2F2,stroke:#EF4444
    style FIX_UNIT fill:#FFFBEB,stroke:#F59E0B
    style FIX_INT fill:#FFFBEB,stroke:#F59E0B
    style OPTIMIZE fill:#FFFBEB,stroke:#F59E0B
    style DONE fill:#F0FDF4,stroke:#22C55E
```

---

## The Loop in Practice

### Step 1: Implement
- Agent picks up a task from `TASKS.md`
- Writes code following conventions in `AGENTS.md`
- Updates relevant documentation if architecture changes

### Step 2: Test (Unit)
```bash
# Backend (tests/ is flat — there is no tests/unit split)
cd backend && pytest -q

# Frontend (node test runner, not Jest)
cd frontend && npm test
```
- **Exit criteria**: All unit tests pass
- **Tier change?** Also run the tier-focused subset: `cd backend && pytest -k "auth or tier or quota or deepseek" -v`
- **Max retry cycles**: 5 (if still failing after 5 fix attempts, escalate to user)

### Step 3: Test (Integration)
```bash
# Backend API + pipeline
cd backend && pytest tests/test_api.py tests/test_security_hardening.py -v

# Full backend suite
cd backend && pytest -q

# Frontend full-flow E2E (API-contract level)
cd frontend && npm test
```
- **Exit criteria**: All integration tests pass, including the tier matrix in `TESTING.md` (login → capped free upload → pro upload with Google mocked to raise)
- **Max retry cycles**: 3

### Step 4: Evaluate (Extraction changes only)
```bash
# Offline/CI (fake extractors, no API keys)
cd eval && python run_eval.py --dataset datasets/ --output results/ --provider gemini
cd eval && python run_eval.py --dataset datasets/ --output results/ --provider deepseek

# Live run before release (real keys, local only — never in CI)
python run_eval.py --provider gemini --live
python run_eval.py --provider deepseek --live
```
- **Exit criteria**: All metrics meet thresholds in `EVAL.md` **for every provider touched by the change**
- **Rule**: a change to shared prompt/validation code must pass **both** provider runs; a provider-specific change needs only its own
- **Max retry cycles**: 5 (each cycle involves optimizing prompts, chunking, or batching)
- **Note**: the `--provider` flag ships with Phase 6 task 6.8; until then the runner uses the default Gemini path

### Step 5: Diagnose & Fix
When a test or eval fails, the agent MUST:

1. **Read the error** — full stack trace, assertion message, or eval report
2. **Identify root cause** — is it a code bug, a prompt issue, a data issue, or a design flaw?
3. **Fix the smallest thing** — don't refactor everything; fix the specific failing case
4. **Re-run** — only the failing tests, not the full suite (unless the fix was broad)
5. **Log the diagnosis** — what failed, why, and how it was fixed (in commit message or `DECISIONS.md` if significant)

### Step 6: Update & Commit
After all tests/evals pass:
1. Update `TASKS.md` — mark task as `done`
2. Update `CONTEXT.md` — summarize what was done
3. Commit with descriptive message
4. Push to feature branch

---

## Feedback Sources

| Source | What It Tells Us | When to Check |
|--------|-----------------|---------------|
| **Unit tests** | Individual function correctness | Every code change |
| **Integration tests** | System component interaction | Every feature completion |
| **Eval suite (per provider)** | Extraction accuracy vs. ground truth for Gemini **and** DeepSeek paths | Extraction/RAG/batching changes |
| **Quota & auth responses** | 429 `QUOTA_EXCEEDED`, login 401s, rate-limit `Retry-After` behaving as designed | Tier flow changes |
| **Zero-Google-on-pro assertion** | Proves account-tier jobs never touch a Google endpoint | Any provider-selection or fallback change |
| **User corrections** | Where AI gets it wrong in real usage | Post-launch |
| **Error logs** | Runtime failures, provider API errors (Gemini 404/429/503, DeepSeek 4xx/5xx) | During testing & production |
| **Provider API responses** | Model quality, response format, renamed/retired model ids | Extraction changes |

---

## Escalation Policy

| Situation | Action |
|-----------|--------|
| Test fails after 5 fix attempts | Agent stops, logs issue in `CONTEXT.md`, asks user for help |
| Eval metrics are close but don't meet threshold | Agent documents the gap, proposes solutions, asks user to accept or iterate |
| A provider-specific eval passes but the other regresses | Treat as a **fail** — shared prompt/validation code must satisfy both providers |
| Provider privacy/terms claim can't be verified (e.g. no-training wording) | Hold the UI copy, log in `CONTEXT.md`, ask user — never ship an unverified privacy claim |
| Test passes but behavior seems wrong | Agent adds more test cases to cover the suspicious behavior |
| Conflicting requirements discovered | Agent logs in `DECISIONS.md` with status `PENDING`, asks user |

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do |
|----------|------|
| Skip tests to save time | Run all relevant tests before commit |
| Disable failing tests | Fix the root cause or document why it's deferred |
| Ignore eval metrics | Treat them as hard gates |
| Make changes without re-running tests | Always re-run after every fix |
| Fix symptoms instead of causes | Diagnose root cause before patching |
| Refactor unrelated code during a fix cycle | Stay focused on the failing test |
| Let the pro tier silently fall back to Gemini | Fallback is heuristic only — the zero-Gemini test must stay green |
