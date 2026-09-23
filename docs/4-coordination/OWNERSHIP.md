# Ownership Map

> Defines which agent owns which files/modules. An agent MUST NOT edit files outside their ownership without explicit user approval or a documented cross-agent request in [CONTEXT.md](./CONTEXT.md).

---

## Ownership Table

| Path / Pattern | Owner | Notes |
|----------------|-------|-------|
| `AGENTS.md` | **User Only** | Neither agent may modify without user instruction |
| `CHANGELOG.md` | **Both** | Either agent may append entries for their own work |
| `.env.example` | **Both** | Coordinate via CONTEXT.md before editing |
| `.gitignore` | **Both** | Coordinate via CONTEXT.md before editing |
| `docs/1-product/*` | **Antigravity** | PRD, Vision, User Stories |
| `docs/2-architecture/*` | **Antigravity** | Architecture, Tech Stack, Data Model, API spec |
| `docs/3-design/*` | **Antigravity** | Design, Design System |
| `docs/4-coordination/*` | **Both** | Both agents read & write coordination files |
| `docs/5-quality/*` | **Both** | Both agents contribute to eval & testing docs |
| `docs/6-security/*` | **Antigravity** | Security & Privacy docs |
| `docs/7-operations/*` | **Both** | Setup, Deploy, Decisions — both contribute |
| `frontend/` | **Antigravity** | Next.js app, React components, styling |
| `frontend/src/lib/api*` | **Antigravity** | API client (must match API.md contract) |
| `backend/` | **OpenCode** | Python FastAPI, all backend logic |
| `backend/app/api/` | **OpenCode** | API route handlers (must match API.md contract) |
| `backend/app/services/extraction/` | **OpenCode** | PDF parsing pipeline |
| `backend/app/services/rag/` | **OpenCode** | RAG pipeline (embed, retrieve, rerank) |
| `backend/app/services/mapping/` | **OpenCode** | Template field mapping engine |
| `backend/app/services/generation/` | **OpenCode** | LLM structured output |
| `backend/tests/` | **OpenCode** | Backend unit & integration tests |
| `eval/` | **OpenCode** | Evaluation datasets and scripts |
| `scripts/` | **OpenCode** | Utility scripts |

---

## Shared Files Protocol

For files owned by **Both**, the following protocol applies:

1. **Before editing**: Check `CONTEXT.md` for any in-progress edits by the other agent
2. **While editing**: Add a note to `CONTEXT.md`: `"[AgentName] is editing [filename] — [reason]"`
3. **After editing**: Update `CONTEXT.md` to remove the "editing" note and summarize what changed

---

## Cross-Agent Request Protocol

When Agent A needs a change in Agent B's zone:

1. Agent A writes a request in `CONTEXT.md` under **"Cross-Agent Requests"**:
   ```markdown
   ### Request: [Short Title]
   - **From**: Agent A
   - **To**: Agent B
   - **File(s)**: path/to/file
   - **Description**: What needs to change and why
   - **Priority**: high / medium / low
   - **Status**: pending
   ```
2. Agent B picks up the request, implements it, and marks status as `done`
3. If Agent B disagrees or sees issues, they mark status as `needs_discussion` and add comments

---

## Conflict Resolution

If both agents accidentally edit the same file:

1. **Git conflict**: The agent who committed second must resolve the merge conflict
2. **Logic conflict**: Escalate to user via `CONTEXT.md` with `⚠️ CONFLICT` prefix
3. **Design conflict**: The owner of the file has final say (see Ownership Table)
4. **Shared file conflict**: User mediates
