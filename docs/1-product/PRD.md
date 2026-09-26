# Product Requirements Document (PRD)

## Product Name
**TemplaFill**

## Tagline
_Extract. Map. Fill. — AI-powered document automation._

---

## 1. Problem Statement

Professionals across industries (legal, HR, finance, education, government) routinely need to extract specific data from lengthy source documents (PDFs, reports, contracts) and fill that data into standardized templates (letters, forms, spreadsheets, presentations).

**Current pain points:**
- **Manual copy-paste** is tedious, error-prone, and time-consuming — especially for documents with hundreds of pages
- **AI chatbots fail** on long documents because of context window limitations, "lost in the middle" effect, and hallucination (the AI invents data that sounds plausible but isn't from the source)
- **Existing tools** (Docparser, Nanonets, etc.) are either too generic, require technical setup, or are priced for enterprise — not accessible to individual professionals
- **No grounding verification** — users can't easily verify WHERE extracted data came from in the source document

---

## 2. Target Users

### Primary Persona: The Template Filler
- **Who**: Professionals who regularly fill templates from source documents
- **Industries**: Legal (paralegals, associates), HR (recruiters, administrators), Finance (accountants, analysts), Education (admissions, administration), Government (clerks, officers)
- **Tech level**: Non-technical. Comfortable with web apps but not with APIs or code
- **Core need**: "I have a long PDF and a template. Fill the template accurately from the PDF without me reading 200 pages."

### Secondary Persona: The Batch Processor
- **Who**: Teams/departments processing high volumes of similar documents
- **Core need**: "I have 50 contracts and one template. Process them all."
- **Note**: This persona is Phase 2+. MVP focuses on single document pairs.

---

## 3. Product Scope

### In Scope (MVP — v0.1.0)
| Feature | Description |
|---------|-------------|
| **Dual file upload** | Upload source PDF + template document (.docx, .xlsx, or .pptx) |
| **PDF text extraction** | Extract text and tables from text-based PDFs (not scanned/image PDFs) |
| **Template field detection** | Auto-detect placeholder fields in templates (e.g., `{{name}}`, `[date]`, `{company}`) |
| **AI-powered extraction** | Use RAG + Gemini to extract relevant data for each template field from the source PDF |
| **Mapping preview** | Show extracted data mapped to template fields, with source highlighting (which page/paragraph the data came from) |
| **Manual correction** | Allow user to edit/correct extracted values before generating the final document |
| **Document generation** | Generate the filled template document for download |
| **Source highlighting** | For each extracted field, show exactly where in the source PDF the data was found |
| **Two-tier access (Phase 6)** | Free tier (anonymous, Google Gemini, 5 jobs/day/IP) vs Account tier (shared-credential login, DeepSeek engine, higher cap) |
| **Tier disclosures & quota** | Honest free-tier Google-training/quota notices, quota countdown, and a request-an-account screen |

### Out of Scope (Future)
| Feature | Phase |
|---------|-------|
| Scanned PDF / image OCR | v0.2.0 |
| Batch processing (multiple documents) | v0.2.0 |
| Custom template creation (drag & drop field designer) | v0.3.0 |
| User accounts / saved projects | v0.2.0 (Phase 6 ships a single shared account, not per-user accounts) |
| API access for developers | v0.3.0 |
| Multi-language document support | v0.3.0 |
| PDF form field filling | v0.2.0 |
| Team collaboration | v0.4.0 |

---

## 4. Feature Requirements

### 4.1 File Upload
- **FR-001**: User can upload a source PDF file (max 50MB, max 500 pages for MVP)
- **FR-002**: User can upload a template file (.docx, .xlsx, or .pptx)
- **FR-003**: System validates file types and sizes before processing
- **FR-004**: Drag-and-drop upload supported
- **FR-005**: Progress indicator during upload

### 4.2 Extraction Pipeline
- **FR-010**: System extracts all text content from source PDF preserving paragraph structure
- **FR-011**: System extracts tables from source PDF preserving row/column structure
- **FR-012**: System chunks extracted text using semantic chunking strategy
- **FR-013**: System creates vector embeddings for each chunk
- **FR-014**: System stores embeddings in vector database for retrieval

### 4.3 Template Analysis
- **FR-020**: System parses template file and detects all placeholder fields
- **FR-021**: Supported placeholder formats: `{{field_name}}`, `{field_name}`, `[field_name]`, `<<field_name>>`, `__field_name__`
- **FR-022**: System generates a human-readable label for each detected field
- **FR-023**: System handles multi-format templates (.docx, .xlsx, .pptx)

### 4.4 AI-Powered Mapping
- **FR-030**: For each template field, system retrieves the most relevant chunks from the source PDF using RAG
- **FR-031**: System uses Gemini API to extract the precise value for each field from the retrieved chunks
- **FR-032**: System returns structured JSON output with field name, extracted value, confidence score, and source reference (page number, paragraph)
- **FR-033**: System handles fields where no matching data exists in the source (marks as "not found" instead of hallucinating)

### 4.5 Review & Correction
- **FR-040**: User sees a side-by-side view: template fields on one side, extracted values on the other
- **FR-041**: Each extracted value shows its source reference (clickable link to the relevant section in the source PDF)
- **FR-042**: User can edit any extracted value manually
- **FR-043**: User can mark a field as "skip" (leave blank in output)
- **FR-044**: Confidence score is visually indicated (green = high, yellow = medium, red = low)

### 4.6 Document Generation & Download
- **FR-050**: System generates the filled template with all confirmed values
- **FR-051**: Generated document preserves original template formatting
- **FR-052**: User can download the filled document in its original format
- **FR-053**: Download includes a summary report of all extracted fields and their sources

### 4.7 Tiers & Access (Phase 6)
- **FR-060**: Anonymous visitors use the **free tier** — Google Gemini extraction + embeddings, capped at **5 jobs/day per IP**
- **FR-061**: The free tier shows an honest disclosure (Google free API may use prompt data; quota can be rate-limited) on the landing and upload screens
- **FR-062**: When the free cap is reached, the system shows a request-an-account screen with contact `hanif.isya.annafi-2024@fst.unair.ac.id` (no self-registration)
- **FR-063**: Approved users sign in with a single shared username/password; the backend issues a signed 30-day tier token (HttpOnly cookie + `localStorage` fallback)
- **FR-064**: Account-tier jobs run on **DeepSeek** with **zero Google calls** (no Gemini extraction and no Gemini embeddings); on DeepSeek failure the job falls back to the local heuristic engine only, never to Google
- **FR-065**: The Navbar shows the active tier badge (`Free · Gemini` / `Account · DeepSeek`) with sign-in/sign-out controls
- **FR-066**: Session history and results are stored in the browser (`tf_history`, `localStorage`) only — never synced to a server database
- **FR-067**: Account-tier privacy wording stays factual and generic until DeepSeek's API no-training/retention terms are verified in writing (task 6.15)

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Extraction + mapping for a 100-page PDF should complete within 60 seconds |
| **Accuracy** | Field extraction precision ≥ 90% on evaluation dataset |
| **Scalability** | Support 100 concurrent users on MVP infrastructure |
| **Security** | All uploaded documents encrypted at rest (AES-256) and in transit (TLS 1.3) |
| **Privacy** | Documents auto-deleted after 24 hours unless user opts in to save |
| **Availability** | 99.5% uptime for production deployment |
| **Compatibility** | Works on Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Accessibility** | WCAG 2.1 AA compliant |
| **Mobile** | Responsive design, functional on mobile (upload + review) |

---

## 6. Success Metrics

### MVP Launch (v0.1.0)
| Metric | Target |
|--------|--------|
| Field extraction accuracy | ≥ 90% precision on eval dataset |
| Average processing time (100-page PDF) | < 60 seconds |
| User task completion rate | ≥ 80% (user successfully downloads filled doc) |
| User satisfaction (post-task survey) | ≥ 4.0 / 5.0 |

### Growth (v0.2.0+)
| Metric | Target |
|--------|--------|
| Monthly active users | 1,000+ within 3 months of launch |
| Documents processed per month | 10,000+ |
| User retention (30-day) | ≥ 40% |
| Organic traffic | 5,000+ monthly visitors |

---

## 7. Assumptions & Constraints

### Assumptions
- Source PDFs are text-based (not scanned images) for MVP
- Template placeholders follow recognizable patterns (brackets, curly braces, etc.)
- Users have a modern web browser with JavaScript enabled
- Gemini free tier API limits are sufficient for free-tier MVP traffic
- Account-tier usage fits the DeepSeek paid API budget (≈ $0.002 per typical contract job)

### Constraints
- **Budget**: Using free tier services where possible (Gemini free plan, Vercel free, Supabase free); DeepSeek token cost absorbed by the host for the account tier
- **LLM Rate Limits**: Gemini free plan has 15 RPM / 1,500 RPD — must design for queuing; free tier additionally capped at 5 jobs/day/IP
- **Shared Credential**: There is one fixed account credential (no per-user accounts, no payments, no password reset)
- **Team**: Development by 2 AI agents (Antigravity + OpenCode) coordinated by 1 human
- **Timeline**: MVP target is 4-6 weeks from development start
