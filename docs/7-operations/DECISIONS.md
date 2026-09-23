# Architecture Decision Records (ADR)

> Log of all significant technical decisions. Agents MUST NOT reverse a logged decision without explicit user approval.

---

## ADR Format

```markdown
### ADR-XXX: [Title]
- **Date**: YYYY-MM-DD
- **Status**: Accepted | Pending | Superseded by ADR-XXX | Rejected
- **Context**: Why this decision was needed
- **Decision**: What we decided
- **Alternatives Considered**: What else we looked at
- **Consequences**: What this means for the project
```

---

## Decisions

### ADR-001: Use Gemini API Free Plan as LLM Provider
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need an LLM for structured extraction and embeddings. Must be free for MVP development.
- **Decision**: Use Google Gemini API free plan (`gemini-2.0-flash` for generation, `text-embedding-004` for embeddings).
- **Alternatives Considered**:
  - OpenAI API — No free tier, per-token cost
  - Claude API — No free tier
  - Local LLM (Ollama) — Requires GPU, complex setup, lower quality for structured extraction
  - Groq — Free tier available but less stable, no native embeddings
- **Consequences**:
  - Rate limited to 15 RPM / 1,500 RPD — must implement queuing
  - Free tier data may be used by Google for model improvement — document in privacy policy
  - If scaling, may need to upgrade to paid tier or switch provider

---

### ADR-002: Use pgvector Instead of Dedicated Vector Database
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need vector similarity search for RAG retrieval. Options: Pinecone, Weaviate, Qdrant, ChromaDB, or pgvector.
- **Decision**: Use pgvector as PostgreSQL extension.
- **Alternatives Considered**:
  - Pinecone — Managed, scalable, but paid service adds cost and dependency
  - Weaviate / Qdrant — Self-hosted adds infra complexity
  - ChromaDB — Good for prototyping but not production-ready for our scale
- **Consequences**:
  - Single database for both relational and vector data — simpler ops
  - Performance sufficient for MVP (IVFFlat index)
  - If vector search becomes bottleneck at scale, migrate to dedicated service

---

### ADR-003: FastAPI Over Django for Backend
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need Python web framework for API backend.
- **Decision**: Use FastAPI.
- **Alternatives Considered**:
  - Django + DRF — Heavier, synchronous by default, more opinionated
  - Flask — Lightweight but no async, no auto-generated docs
- **Consequences**:
  - Native async support — important for I/O-bound LLM API calls
  - Auto-generated OpenAPI docs — easier for frontend integration
  - Less batteries-included than Django — need to set up auth, admin, etc. manually

---

### ADR-004: Next.js Over Vite for Frontend
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need React-based frontend framework.
- **Decision**: Use Next.js with App Router.
- **Alternatives Considered**:
  - Vite + React — Lighter, faster dev server, but no SSR
  - Remix — Good, but smaller ecosystem
  - Create React App — Deprecated
- **Consequences**:
  - SSR capability for landing page SEO
  - API routes for BFF pattern if needed
  - Larger bundle than Vite for SPA-only features — acceptable tradeoff

---

### ADR-005: Direct Gemini SDK Over LangChain/LlamaIndex
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Need to orchestrate RAG pipeline (chunk, embed, retrieve, extract).
- **Decision**: Use `google-genai` SDK directly with custom pipeline code.
- **Alternatives Considered**:
  - LangChain — Popular but heavy abstraction, version churn, harder to debug
  - LlamaIndex — Good for RAG but another dependency with its own opinions
- **Consequences**:
  - Full control over pipeline behavior — easier to optimize and debug
  - More code to write initially — but more maintainable long-term
  - No lock-in to framework-specific patterns

---

### ADR-006: Multi-Format Template Support from Day 1
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: User requires .docx, .xlsx, and .pptx template support.
- **Decision**: Support all three formats in MVP.
- **Alternatives Considered**:
  - Start with .docx only, add others later — simpler but limits initial appeal
- **Consequences**:
  - Three separate template parsers needed (python-docx, openpyxl, python-pptx)
  - Three separate document generators needed
  - More testing surface area
  - Broader market appeal from day one

---

### ADR-007: Gemini API Free Tier Data Usage Acknowledgment
- **Date**: 2026-09-23
- **Status**: Accepted
- **Context**: Gemini free tier terms may allow Google to use API data for model improvement.
- **Decision**: Accept this for MVP. Document clearly in DATA_PRIVACY.md. Plan to upgrade to paid tier (with data processing agreement) before public launch with real user data.
- **Consequences**:
  - Development and testing with synthetic/sample data is safe
  - Real user documents should not be processed on free tier in production
  - Budget for paid tier when launching publicly

---

_Add new decisions below this line._
