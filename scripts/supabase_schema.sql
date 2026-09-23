-- ==============================================================================
-- TemplaFill — Supabase PostgreSQL Schema with pgvector
-- Target: Supabase SQL Editor
-- Description: Creates all tables, extensions, foreign keys, and vector indexes
-- Reference: docs/2-architecture/DATA_MODEL.md
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- 4. Source Documents Table
CREATE TABLE IF NOT EXISTS source_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    page_count INTEGER,
    total_chars INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_docs_job ON source_documents(job_id);

-- 5. Document Chunks Table
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID REFERENCES source_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    section_header VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chunks_source_doc ON document_chunks(source_document_id);

-- 6. Chunk Embeddings Table (pgvector 768-dimensions for text-embedding-004)
CREATE TABLE IF NOT EXISTS chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE UNIQUE,
    embedding VECTOR(768) NOT NULL
);

-- Vector Cosine Similarity Index (HNSW for high-speed top-K search)
CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_hnsw 
ON chunk_embeddings 
USING hnsw (embedding vector_cosine_ops);

-- 7. Template Documents Table
CREATE TABLE IF NOT EXISTS template_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_format VARCHAR(10) NOT NULL,
    file_size_bytes INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_docs_job ON template_documents(job_id);

-- 8. Template Fields Table
CREATE TABLE IF NOT EXISTS template_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_document_id UUID REFERENCES template_documents(id) ON DELETE CASCADE,
    placeholder_raw VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_label VARCHAR(255),
    field_type VARCHAR(50) DEFAULT 'text',
    location_description TEXT,
    field_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_document_id);

-- 9. Extraction Results Table
CREATE TABLE IF NOT EXISTS extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    overall_confidence FLOAT,
    fields_found INTEGER DEFAULT 0,
    fields_not_found INTEGER DEFAULT 0,
    fields_edited INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extraction_results_job ON extraction_results(job_id);

-- 10. Field Values Table
CREATE TABLE IF NOT EXISTS field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_result_id UUID REFERENCES extraction_results(id) ON DELETE CASCADE,
    template_field_id UUID REFERENCES template_fields(id) ON DELETE SET NULL,
    extracted_value TEXT,
    user_edited_value TEXT,
    confidence_score FLOAT DEFAULT 0.0,
    source_page INTEGER,
    source_text_snippet TEXT,
    is_manually_edited BOOLEAN DEFAULT false,
    is_skipped BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'extracted'
);

CREATE INDEX IF NOT EXISTS idx_field_values_result ON field_values(extraction_result_id);

-- 11. Helper Function: Cosine Similarity Vector Search
CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  content TEXT,
  page_number INT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id AS chunk_id,
    dc.content,
    dc.page_number,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM chunk_embeddings ce
  JOIN document_chunks dc ON dc.id = ce.chunk_id
  WHERE 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
