# TemplaFill — User Guide & Operations Manual

> **Version**: 1.0.0  
> **Target Audience**: End-users, Legal Analysts, Operations Teams, Administrators  
> **Last Updated**: 2026-09-23  

---

## 1. Introduction

**TemplaFill** is an AI-powered document automation web application that extracts structured variables, terms, tables, and clauses from source PDF documents (contracts, financial reports, transcripts, resumes, filings) and automatically maps and populates them into multi-format template documents (`.docx`, `.xlsx`, `.pptx`).

Unlike generic chatbot interfaces that hallucinate when fed hundred-page documents, TemplaFill utilizes a localized **Retrieval-Augmented Generation (RAG)** pipeline with semantic chunking and embedding-guided retrieval to pull verbatim facts with exact page and snippet citations.

---

## 2. Supported Template Formats & Syntax

TemplaFill inspects template files and preserves 100% of the original document's typography, styles, branding, headers, and table structures.

### Supported Formats
| Format | Extension | Template Elements Supported |
|--------|-----------|-----------------------------|
| **Microsoft Word** | `.docx` | Paragraphs, tables, headers, footers, callouts |
| **Microsoft Excel** | `.xlsx` | Cells across all worksheets, formatted tables |
| **Microsoft PowerPoint** | `.pptx` | Slide body text frames, title boxes, slide tables |

### Placeholder Syntax Conventions
TemplaFill recognizes four standard placeholder syntax styles. You can use any of them interchangeably:

1. **Double Braces (Recommended)**:
   ```text
   {{client_name}}
   {{effective_date}}
   {{total_consideration}}
   ```
2. **Double Angle Brackets**:
   ```text
   <<client_name>>
   <<governing_law>>
   ```
3. **Square Brackets**:
   ```text
   [client_name]
   [notice_period_days]
   ```
4. **Double Underscores**:
   ```text
   __client_name__
   __authorized_signatory__
   ```

*Naming Tip*: Use snake_case or clean alphanumeric labels (e.g. `{{party_b_address}}`) for the highest mapping precision.

---

## 3. End-to-End User Flow

### Step 1: Document Upload
1. Navigate to the **TemplaFill** dashboard.
2. In the **Source PDF** dropzone, drop or browse your text-based PDF (up to 50 MB, up to 500 pages).
3. In the **Template Document** dropzone, drop your `.docx`, `.xlsx`, or `.pptx` template (up to 20 MB).
4. *Optional*: Click **Load Demo Dataset** to test with pre-configured legal contract and summary templates.
5. Click **Start AI Extraction Pipeline**.

### Step 2: Processing & Pipeline Stages
The application processes documents through 4 transparent stages with real-time radar feedback:
1. **Document Parsing**: Extracting text layers and table structures using PyMuPDF and pdfplumber.
2. **Semantic Chunking & Embedding**: Breaking text into 800-token chunks with 100-token overlap, indexed in vector storage.
3. **Template Inspection**: Detecting placeholders across all paragraphs, cells, and slides.
4. **Structured RAG Extraction**: Querying the vector index per field and generating structured extraction with confidence metrics.

### Step 3: Review & Edit Mapping
TemplaFill offers two layout modes:
- **Split Preview**: Displays field cards on the left side with a live source citation snippet and page preview on the right side.
- **Table View**: Compact spreadsheet-style overview ideal for templates with 20+ fields.

#### Working with Fields:
- **Inline Value Editing**: Click any field value or the edit button to correct or type an alternative value.
- **Confidence Badge**:
  - 🟢 **High (>= 80%)**: Verbatim match with clear source context.
  - 🟡 **Medium (50% - 79%)**: Inferred from surrounding text. Check snippet.
  - 🔴 **Low (< 50%) / Not Found**: Requires user verification.
- **View Source Citation**: Click the **View Citation** button to view the exact page number and text snippet from which the value was extracted.
- **Re-Extract with Hint**: If an extraction missed a detail, click **Re-Extract** and provide a hint (e.g., *"Look at Schedule C on page 12 for the indemnification clause"*).
- **Add Custom Field**: Click **Add Field** to insert an ad-hoc placeholder mapping on the fly.
- **Skip Field**: Toggle a field as skipped if you wish to leave the template placeholder blank.

### Step 4: Confirm & Export
1. Click **Confirm & Generate Document**.
2. Download your generated file:
   - **Filled Document**: Preserves all native formatting with fields populated.
   - **Audit Trail Summary**: JSON/PDF log of all extracted values, confidence scores, and manual edits.

---

## 4. User Accounts & Session Modes

TemplaFill offers both guest anonymous access and registered accounts:

| Feature | Anonymous Guest | Registered Pro Account |
|---------|-----------------|------------------------|
| Account Required | No | Yes (Email + Password) |
| Daily Extractions | 3 fills / day | Unlimited |
| Local Session History | Last 5 sessions | Cloud persistent history |
| Custom Presets | Local only | Synchronized presets |
| Cost | Free | Free tier (MVP) / Pro |

---

## 5. Security & Privacy Safeguards

- **Zero AI Training**: User documents and extracted variables are strictly confidential and are never used to train public models.
- **In-Memory & Ephemeral Storage**: Files uploaded are held in isolated temporary scratchpads that are automatically purged upon session completion or after 1 hour.
- **In-Flight Encryption**: All network traffic is encrypted via TLS 1.3 with strict Content Security Policy (CSP) headers.
- **OWASP Compliance**: Automated input sanitization prevents formula injection in `.xlsx` and template injection attacks.

---

## 6. Frequently Asked Questions (FAQ)

#### Q: Can TemplaFill handle scanned PDFs?
**A**: TemplaFill requires digital text layers. For scanned physical papers, ensure you run standard optical character recognition (OCR) beforehand.

#### Q: What happens if a placeholder in the template is not found in the PDF?
**A**: The field is marked with low confidence / `not_found`. You can either manually enter the value, skip the field, or provide a re-extract hint.

#### Q: Are tables in Excel and Word supported?
**A**: Yes. Placeholders inside table cells (e.g. `{{q1_revenue}}`) are fully supported and populated without breaking column widths or cell borders.
