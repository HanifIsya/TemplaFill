# Development Setup

> Step-by-step guide to set up the TemplaFill development environment from scratch.

---

## Prerequisites

| Software | Version | Installation |
|----------|---------|-------------|
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11+ | [python.org](https://python.org/) |
| **PostgreSQL** | 16+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Redis** | 7+ | [redis.io](https://redis.io/download/) or via Docker |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Optional (Recommended)
| Software | Purpose |
|----------|---------|
| **Docker** | Run PostgreSQL + Redis without local install |
| **VS Code** | IDE with recommended extensions |

---

## Quick Start

### 1. Clone Repository
```bash
git clone <repo-url> TemplaFill
cd TemplaFill
```

### 2. Environment Variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your values (see Environment Variables section below)
```

### 3. Backend Setup
```bash
# Create virtual environment
cd backend
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python -m alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup
```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### 5. Database Setup (with Docker — recommended)
```bash
# Start PostgreSQL with pgvector + Redis
docker compose up -d

# Or without Docker:
# 1. Install PostgreSQL 16+
# 2. Create database: createdb templafill
# 3. Enable pgvector: CREATE EXTENSION vector;
# 4. Install and start Redis
```

### 6. Verify Setup
```bash
# Backend health check
curl http://localhost:8000/api/health

# Frontend
# Open http://localhost:3000 in browser
```

---

## Environment Variables

### `.env.example`
```env
# ============================================================
# TemplaFill Environment Variables
# Copy this file to .env and fill in your values
# ============================================================

# ----- Application -----
APP_ENV=development                    # development | staging | production
APP_NAME=TemplaFill
APP_VERSION=0.1.0
DEBUG=true

# ----- Backend Server -----
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000     # Comma-separated allowed origins

# ----- Frontend -----
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=TemplaFill

# ----- Database -----
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/templafill
DATABASE_ECHO=false                    # Set true to log SQL queries

# ----- Redis -----
REDIS_URL=redis://localhost:6379/0

# ----- Gemini API -----
GEMINI_API_KEY=your_gemini_api_key_here    # Get from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.0-flash             # Model for extraction
GEMINI_EMBEDDING_MODEL=text-embedding-004  # Model for embeddings

# ----- File Storage -----
UPLOAD_DIR=./uploads                   # Local upload directory
MAX_SOURCE_FILE_SIZE_MB=50             # Max source PDF size
MAX_TEMPLATE_FILE_SIZE_MB=20           # Max template file size
MAX_SOURCE_PAGES=500                   # Max PDF pages
FILE_RETENTION_HOURS=24                # Auto-delete after this many hours

# ----- Security -----
SECRET_KEY=change_this_to_a_random_string_in_production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# ----- Rate Limiting -----
RATE_LIMIT_UPLOAD=10/hour              # Upload endpoint limit
RATE_LIMIT_API_READ=60/minute          # Read endpoint limit
RATE_LIMIT_API_WRITE=30/minute         # Write endpoint limit

# ----- RAG Pipeline -----
CHUNK_SIZE=800                         # Tokens per chunk
CHUNK_OVERLAP=100                      # Overlap between chunks
RAG_TOP_K=5                            # Number of chunks to retrieve per field
EMBEDDING_BATCH_SIZE=100               # Chunks per embedding API call
```

---

## Docker Compose (Development)

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: templafill
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Reset database
docker compose down -v && docker compose up -d
```

---

## IDE Setup (Recommended)

### VS Code Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-python.black-formatter"
  ]
}
```

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "python.defaultInterpreterPath": "./backend/venv/Scripts/python",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Common Issues

| Issue | Solution |
|-------|---------|
| `pgvector` extension not found | Use `pgvector/pgvector:pg16` Docker image, or install manually: `CREATE EXTENSION vector;` |
| Redis connection refused | Start Redis: `docker compose up redis -d` or install locally |
| Gemini API key invalid | Get key from [AI Studio](https://aistudio.google.com/apikey), set in `.env` |
| Port 3000 already in use | Kill existing process or change port: `npm run dev -- -p 3001` |
| Python venv activation fails (Windows) | Run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
