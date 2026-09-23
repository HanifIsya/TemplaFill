# Vision

## Mission
Make document filling effortless for everyone — from paralegals handling 200-page contracts to HR teams processing stacks of CVs — by providing an AI tool that accurately extracts data from source documents and fills templates automatically, with full transparency and human control.

---

## Why TemplaFill?

### The Problem is Universal
Every industry has "template filling" workflows. Legal firms fill court filings from case documents. HR departments fill offer letters from candidate CVs. Finance teams fill reports from transaction records. Government offices fill forms from citizen documents. It's the same pattern everywhere: **read a long document, find specific data, paste it into a template**.

### Existing Solutions Fall Short
| Solution | Why it fails |
|----------|-------------|
| Manual copy-paste | Slow, error-prone, soul-crushing for 200-page documents |
| AI chatbots (ChatGPT, Claude, Gemini chat) | Context window limits, "lost in the middle", hallucination — not reliable for critical documents |
| Enterprise tools (Docparser, ABBYY, Nanonets) | Expensive, require technical setup, not designed for template-filling workflow |
| General form fillers (Instafill) | Limited to PDF forms, not template documents |

### TemplaFill's Edge
1. **RAG-powered accuracy** — we don't stuff the whole document into a prompt. We retrieve only the relevant chunks for each field, eliminating "lost in the middle" errors
2. **Source transparency** — every extracted value shows exactly where it came from (page, paragraph), so users can verify in seconds
3. **Multi-format templates** — works with .docx, .xlsx, .pptx — the formats people actually use
4. **General-purpose** — not locked to one industry. Works for legal, HR, finance, education, and anything else with a source document + template workflow
5. **Accessible** — web-based, no setup required, free tier available

---

## Competitive Landscape

```
                High Automation
                     │
         ┌───────────┼───────────┐
         │           │           │
   Docparser    ABBYY Vantage   │
   Nanonets    Document AI      │
         │           │           │
General ─┼───────────┼───────────┼─ Specialized
Purpose  │           │           │
         │      TemplaFill       │
         │      ★ HERE ★        │
         │           │    Instafill
         │           │    Harvey AI
         │           │    Spellbook
         │           │           │
         └───────────┼───────────┘
                     │
                Low Automation
                (Manual / Chatbot)
```

**TemplaFill occupies the sweet spot**: general-purpose (not industry-locked), high automation (not just extraction — full template filling), and accessible (not enterprise-only).

---

## Roadmap

### Phase 1: Foundation (MVP) — v0.1.0
_"One source PDF → one template → one filled document"_
- Single document pair processing
- Text-based PDFs only
- .docx, .xlsx, .pptx template support
- RAG-powered extraction with Gemini
- Source highlighting for verification
- Manual correction UI
- Web app deployment

### Phase 2: Expand — v0.2.0
_"Handle more formats, more documents, smarter"_
- OCR support for scanned PDFs (Tesseract / cloud OCR)
- PDF form field filling
- Batch processing (multiple source documents → same template)
- User accounts, saved projects, processing history
- Custom placeholder format configuration
- Improved extraction accuracy via fine-tuning

### Phase 3: Scale — v0.3.0
_"Platform capabilities"_
- API access for developers / integrations
- Custom template designer (drag & drop field placement)
- Multi-language document support
- Team workspaces with shared templates
- Webhook / automation integrations (Zapier, n8n)

### Phase 4: Intelligence — v0.4.0+
_"Learn from usage"_
- Auto-learning from user corrections (feedback loop → improve extraction)
- Template recommendation based on source document type
- Smart field suggestion (detect fields even without explicit placeholders)
- Industry-specific models (legal, HR, finance packs)

---

## Long-Term Vision

TemplaFill becomes the **standard tool for document-to-template automation** — the "Canva of document filling". Any professional, anywhere, can upload a source document and a template, and get an accurately filled result in under a minute, with full confidence in the data's accuracy.

### Key Principles
1. **Accuracy over speed** — a slightly slower result that's correct beats a fast result that's wrong
2. **Transparency** — always show WHERE data came from; never be a black box
3. **Human in the loop** — AI assists, human decides. Always allow correction before final output
4. **Accessible** — free tier that's genuinely useful, not just a teaser
5. **Privacy-first** — user documents are their property; minimal retention, strong encryption
