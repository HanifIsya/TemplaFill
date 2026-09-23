# Technology Stack

> Rationale for every technology choice. Changes to this stack MUST be logged in [DECISIONS.md](../7-operations/DECISIONS.md).

---

## Stack Overview

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Frontend** | Next.js (App Router) | 14.x | SSR, file-based routing, React Server Components, great DX |
| **Frontend Language** | TypeScript | 5.x | Type safety, better IDE support, fewer runtime bugs |
| **Styling** | Tailwind CSS | 3.x | Rapid UI development, consistent design tokens |
| **Backend** | FastAPI | 0.110+ | Async Python, auto-generated OpenAPI docs, great for ML pipelines |
| **Backend Language** | Python | 3.11+ | Best ML/AI ecosystem, rich PDF/document libraries |
| **Database** | PostgreSQL | 16+ | Reliable, extensible, pgvector for embeddings |
| **Vector Store** | pgvector (PostgreSQL extension) | 0.7+ | No separate service needed, embedded in PostgreSQL |
| **ORM** | SQLAlchemy | 2.0+ | Async support, mature, flexible |
| **LLM** | Gemini API (free plan) | gemini-2.0-flash | Free tier, structured output, function calling, fast |
| **Embeddings** | Gemini Embedding API | text-embedding-004 | Free tier, 768 dimensions, good quality |
| **Job Queue** | Celery + Redis | 5.x | Async task processing for long PDF extractions |
| **File Storage** | Local FS (dev) / S3-compatible (prod) | — | Simple for dev, scalable for prod |
| **Auth** | NextAuth.js (frontend) + JWT (API) | 5.x | Simple auth, multiple providers |
| **Deployment (FE)** | Vercel | — | Free tier, automatic deployments, edge network |
| **Deployment (BE)** | Railway / Render / VPS | — | Easy Python hosting, free tier available |
| **CI/CD** | GitHub Actions | — | Free for public repos, integrated with GitHub |

---

## Frontend Stack Detail

### Core
| Package | Purpose |
|---------|---------|
| `next` | React framework with App Router |
| `react` / `react-dom` | UI library |
| `typescript` | Type safety |

### Styling & UI
| Package | Purpose |
|---------|---------|
| `tailwindcss` | Utility-first CSS |
| `@radix-ui/*` | Accessible, unstyled UI primitives (dialogs, dropdowns, etc.) |
| `lucide-react` | Icon library |
| `framer-motion` | Animations and micro-interactions |
| `clsx` + `tailwind-merge` | Conditional class merging |

### State & Data
| Package | Purpose |
|---------|---------|
| `@tanstack/react-query` | Server state management, caching, polling |
| `zustand` | Lightweight client state (UI state) |
| `zod` | Schema validation (form inputs, API responses) |

### File Handling
| Package | Purpose |
|---------|---------|
| `react-dropzone` | Drag-and-drop file upload |
| `react-pdf` | PDF preview in browser |

---

## Backend Stack Detail

### Core
| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `pydantic` | Data validation and serialization |
| `python-multipart` | File upload handling |

### PDF Processing
| Package | Purpose |
|---------|---------|
| `PyMuPDF` (fitz) | Fast PDF text extraction with position data |
| `pdfplumber` | Table extraction, layout analysis |

### Template Processing
| Package | Purpose |
|---------|---------|
| `python-docx` | .docx reading, writing, placeholder replacement |
| `openpyxl` | .xlsx reading, writing, cell manipulation |
| `python-pptx` | .pptx reading, writing, text frame manipulation |

### RAG Pipeline
| Package | Purpose |
|---------|---------|
| `google-genai` | Official Gemini SDK — LLM calls + embeddings |
| `pgvector` | PostgreSQL vector similarity search |
| `sqlalchemy[asyncio]` | Async database access |
| `asyncpg` | Async PostgreSQL driver |

### Task Processing
| Package | Purpose |
|---------|---------|
| `celery` | Distributed task queue |
| `redis` | Message broker for Celery |

### Testing
| Package | Purpose |
|---------|---------|
| `pytest` | Test framework |
| `pytest-asyncio` | Async test support |
| `httpx` | Async HTTP client for API testing |
| `pytest-cov` | Coverage reporting |

---

## Gemini API Usage Plan

### Free Tier Limits (as of 2026)
| Resource | Limit |
|----------|-------|
| Requests per minute (RPM) | 15 |
| Tokens per minute (TPM) | 1,000,000 |
| Requests per day (RPD) | 1,500 |

### Usage Strategy
| Operation | Model | Est. calls per document |
|-----------|-------|------------------------|
| Generate embeddings | `text-embedding-004` | 1-5 calls (batched, 100 chunks each) |
| Extract field value | `gemini-2.0-flash` | 1 call per field (5-50 fields typical) |
| Re-extract on user request | `gemini-2.0-flash` | 1 call per re-extraction |

### Rate Limiting Strategy
- Queue all LLM calls through a rate limiter (max 15 RPM)
- Batch embedding calls (up to 100 chunks per call)
- For extraction: process fields sequentially with 4-second intervals to stay within RPM
- If rate limited: exponential backoff with jitter
- For high traffic: implement user-level queuing (first-come-first-served)

---

## Development Environment

### Required Software
| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS | Frontend runtime |
| Python | 3.11+ | Backend runtime |
| PostgreSQL | 16+ | Database (with pgvector extension) |
| Redis | 7+ | Celery message broker |
| Git | Latest | Version control |

### Recommended IDE Setup
| Tool | Extensions |
|------|-----------|
| VS Code / Cursor | Python, Pylance, Prettier, ESLint, Tailwind CSS IntelliSense |
| Antigravity IDE | Built-in AI assistance |

---

## Why NOT These Alternatives?

| Rejected Option | Reason |
|----------------|--------|
| LangChain / LlamaIndex | Too much abstraction for our specific pipeline; raw Gemini SDK + custom code gives more control and less dependency bloat |
| Pinecone / Weaviate | Separate vector DB service adds complexity and cost; pgvector is built into PostgreSQL, zero additional infra |
| OpenAI API | No free tier; Gemini free plan is sufficient for MVP |
| Django | FastAPI is lighter, async-native, better for API-first architecture |
| MongoDB | PostgreSQL + pgvector handles both relational data AND vectors in one DB |
| Supabase | Good option but we want more control over the backend; may consider for auth later |
| tRPC | Adds coupling between frontend/backend; REST is simpler for multi-team (multi-agent) development |
