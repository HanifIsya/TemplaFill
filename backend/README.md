# TemplaFill Backend

FastAPI backend for TemplaFill — AI-powered PDF to Template extractor & filler.

## Quick Start

```bash
# Create and activate venv (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Configure env
copy ..\.env.example ..\.env
# Edit .env with your GEMINI_API_KEY

# Run server
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/api/health`
API docs: `http://localhost:8000/docs`

## Testing

```bash
pytest
pytest --cov=app --cov-report=term-missing
```

## Project Structure

```
app/
├── main.py              # FastAPI entry point
├── core/config.py       # Settings (pydantic-settings)
├── api/                 # Route handlers (health, upload, jobs)
├── models/              # Pydantic / DB models
├── services/
│   ├── extraction/      # PDF parsing
│   ├── rag/             # Chunking, embeddings, retrieval
│   ├── mapping/         # Template parsing & field mapping
│   └── generation/      # LLM structured output
└── utils/               # Helpers
tests/                   # pytest suite
```
