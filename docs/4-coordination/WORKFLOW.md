# Workflow & Git Convention

> Defines branching strategy, commit convention, PR flow, and sync checkpoints for multi-agent development.

---

## Branching Strategy

```
main                          ← Production-ready code (protected)
├── develop                   ← Integration branch (both agents merge here)
│   ├── feat/ag-*             ← Antigravity feature branches
│   ├── feat/oc-*             ← OpenCode feature branches
│   ├── fix/ag-*              ← Antigravity bugfix branches
│   ├── fix/oc-*              ← OpenCode bugfix branches
│   ├── docs/ag-*             ← Antigravity documentation branches
│   └── docs/oc-*             ← OpenCode documentation branches
```

### Branch Naming Convention
```
<type>/<agent-prefix>-<short-description>

Agent Prefixes:
  ag = Antigravity
  oc = OpenCode

Examples:
  feat/oc-pdf-extraction-pipeline
  feat/ag-upload-page-ui
  fix/oc-rag-retrieval-accuracy
  docs/ag-architecture-update
```

---

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]

[optional footer — references, breaking changes]
```

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructure without behavior change |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Build, config, tooling changes |
| `style` | Formatting, whitespace (no logic change) |
| `perf` | Performance improvement |

### Scopes
| Scope | Description |
|-------|-------------|
| `frontend` | Next.js app |
| `backend` | Python FastAPI |
| `pipeline` | Extraction / RAG / mapping pipeline |
| `api` | API endpoints or contracts |
| `docs` | Documentation files |
| `config` | Configuration files |
| `eval` | Evaluation scripts & datasets |
| `ci` | CI/CD pipeline |

---

## Merge Protocol

### Standard Flow
```
1. Agent creates branch from `develop`
2. Agent works on feature/fix
3. Agent runs all relevant tests locally
4. Agent pushes branch
5. (Optional) Agent creates PR for user review
6. Merge into `develop` (fast-forward or squash)
7. Agent updates CONTEXT.md
```

### Release Flow
```
1. User reviews `develop` branch
2. User creates release branch: release/v0.x.0
3. Final testing on release branch
4. Merge to `main` + tag
5. Update CHANGELOG.md
```

### Merge Rules
- **NEVER** push directly to `main`
- **NEVER** force push to `develop`
- Before merging to `develop`, pull latest `develop` and resolve conflicts
- If conflicts involve the other agent's code, check `CONTEXT.md` or ask user

---

## Sync Checkpoints

Agents should sync state at these natural breakpoints:

| Checkpoint | Action |
|-----------|--------|
| **Start of session** | Read `CONTEXT.md`, `TASKS.md` |
| **Before starting new task** | Check `TASKS.md` for conflicts, claim task |
| **After completing task** | Update `TASKS.md` (mark done), update `CONTEXT.md` |
| **Before editing shared file** | Check `CONTEXT.md` for locks |
| **After editing shared file** | Note in `CONTEXT.md` what changed |
| **Before merging to develop** | Pull latest, check for conflicts |
| **After making a design decision** | Log in `DECISIONS.md` |

---

## Git Push Checkpoints

> **⚠️ IMPORTANT**: Agents MUST `git commit` AND `git push` at these checkpoints using the user's pre-configured git account. Do NOT change `git user.name` or `git user.email`.

### When to Commit & Push

| Trigger | Commit Message Example |
|---------|----------------------|
| **Task completed** | `feat(backend): implement PDF text extraction service` |
| **Phase completed** | `feat(docs): complete Phase 0 documentation` |
| **Multiple docs updated** | `docs(architecture): update ARCHITECTURE.md and API.md` |
| **Feature passes all tests** | `feat(pipeline): add RAG retrieval with passing tests` |
| **Bug/critical fix resolved** | `fix(frontend): resolve file upload validation error` |
| **Before ending work session** | `chore(<scope>): WIP - save progress on <task>` |

### Push Commands
```bash
# Standard commit & push
git add -A
git commit -m "<type>(<scope>): <description>"
git push origin <branch-name>

# First time setup (if no remote exists yet)
git init
git remote add origin <repo-url>
git add -A
git commit -m "chore(config): initial project setup"
git push -u origin main
```

### Rules
- Use the user's **existing git identity** — never run `git config user.name` or `git config user.email`
- First commit can go to `main`, after that always use feature branches
- If push fails due to conflicts, `git pull --rebase` first, then push
- Never force push (`git push --force`) unless explicitly told by user

---

## Public Repository — Privacy Guard

> **⚠️ This repo is PUBLIC.** All committed files are visible to everyone on the internet.

### Files That MUST NEVER Be Committed
These are listed in `.gitignore` but agents must be vigilant:

| File / Pattern | Why |
|---------------|-----|
| `.env` | Contains real API keys (GEMINI_API_KEY, SECRET_KEY, DB passwords) |
| `.env.local`, `.env.production` | Environment-specific secrets |
| `uploads/` | User-uploaded documents — PII, confidential content |
| `eval/datasets/*.pdf` | Real test documents may contain sensitive data |
| `eval/results/` | Extraction results may contain PII from test docs |
| `backend/venv/` | Python virtual environment |
| `node_modules/` | npm packages |
| `__pycache__/` | Python bytecode |
| `.next/` | Next.js build output |

### Files That ARE Safe to Commit
| File / Pattern | Why Safe |
|---------------|----------|
| All `docs/**/*.md` | Documentation only, no secrets |
| `.env.example` | Template with placeholder values, no real keys |
| `AGENTS.md`, `CHANGELOG.md` | Project metadata |
| Source code (`frontend/src/`, `backend/app/`) | No embedded secrets |
| `eval/run_eval.py` | Script code, not data |
| `docker-compose.yml` | Uses env vars, no hardcoded secrets |

### Pre-Push Safety Check
Before every `git push`, mentally verify:
```
□ No .env file is staged (check: git diff --cached --name-only | grep .env)
□ No files in uploads/ are staged
□ No real PDF/docx test files with PII are staged
□ No API keys appear in any committed file (check: git diff --cached | grep -i "api_key\|secret\|password")
```

---

## Code Review Checklist

Before merging any feature, verify:

- [ ] Code follows naming conventions (see `AGENTS.md`)
- [ ] Tests are written and passing
- [ ] No hardcoded secrets or API keys
- [ ] No files from `.gitignore` are staged
- [ ] `CONTEXT.md` is updated with summary of changes
- [ ] `TASKS.md` task status is updated
- [ ] Changes are committed AND pushed to remote
- [ ] If extraction-related: eval metrics checked against `EVAL.md` thresholds
- [ ] If API-related: `API.md` contract is followed or updated
- [ ] If new dependency: documented in `DECISIONS.md` with rationale
