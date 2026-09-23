# Evaluation Criteria

> Defines how we measure extraction accuracy. ALL extraction-related changes MUST be evaluated against these criteria before merge.

---

## Core Metrics

### Per-Field Metrics

| Metric | Formula | Target (MVP) |
|--------|---------|-------------|
| **Precision** | (correct extractions) / (total extractions attempted) | ≥ 90% |
| **Recall** | (correct extractions) / (total fields that have values in source) | ≥ 85% |
| **F1 Score** | 2 × (P × R) / (P + R) | ≥ 87% |
| **Hallucination Rate** | (fabricated values) / (total extractions) | ≤ 2% |
| **Not-Found Accuracy** | (correctly identified as absent) / (total truly absent fields) | ≥ 95% |

### System Metrics

| Metric | Target (MVP) |
|--------|-------------|
| **Processing time** (100-page PDF, 15 fields) | < 60 seconds |
| **Processing time** (50-page PDF, 10 fields) | < 30 seconds |
| **Template format preservation** | 100% (formatting must not break) |
| **Placeholder detection rate** | ≥ 95% of template fields detected |

---

## What Counts as "Correct"?

An extraction is **correct** if:
1. The value matches the source document **exactly** (for names, numbers, IDs) or **semantically** (for descriptions, addresses — minor formatting differences OK)
2. The source reference points to the **correct page and section**
3. The field is mapped to the **correct template placeholder**

An extraction is a **hallucination** if:
1. The value does NOT appear anywhere in the source document
2. The value is a combination/remix of different source data that creates a new meaning
3. The value is plausible-sounding but fabricated

---

## Evaluation Dataset

### Structure
```
eval/
├── datasets/
│   ├── hr/
│   │   ├── cv_sample_01.pdf          # Source PDF
│   │   ├── offer_letter_template.docx # Template
│   │   ├── ground_truth_01.json       # Expected field values
│   │   └── README.md                  # Dataset description
│   ├── finance/
│   │   ├── financial_report_01.pdf
│   │   ├── quarterly_summary.xlsx
│   │   └── ground_truth_01.json
│   ├── education/
│   │   ├── transcript_01.pdf
│   │   ├── certificate_template.docx
│   │   └── ground_truth_01.json
│   ├── legal/
│   │   ├── contract_01.pdf
│   │   ├── summary_template.docx
│   │   └── ground_truth_01.json
│   └── general/
│       ├── report_01.pdf
│       ├── brief_template.docx
│       └── ground_truth_01.json
├── results/
│   └── eval_run_YYYY-MM-DD_HHMMSS.json
└── run_eval.py
```

### Ground Truth Format
```json
{
  "dataset_id": "hr_cv_01",
  "source_file": "cv_sample_01.pdf",
  "template_file": "offer_letter_template.docx",
  "fields": [
    {
      "field_name": "full_name",
      "placeholder": "{{full_name}}",
      "expected_value": "John Doe",
      "source_page": 1,
      "is_present_in_source": true
    },
    {
      "field_name": "phone_number",
      "placeholder": "{{phone_number}}",
      "expected_value": null,
      "source_page": null,
      "is_present_in_source": false
    }
  ]
}
```

### Minimum Dataset Size
- **MVP**: At least 5 document pairs across 3+ domains
- **v0.2.0**: At least 20 document pairs across 5+ domains
- **v0.3.0**: At least 50 document pairs with edge cases

---

## Evaluation Runner

`eval/run_eval.py` performs automated evaluation:

```
python eval/run_eval.py --dataset eval/datasets/ --output eval/results/

Output:
┌─────────────────────────────────────────────────┐
│ TemplaFill Evaluation Report                     │
│ Date: 2026-09-23 14:30:00                        │
│ Total datasets: 5                                │
├──────────────┬──────────┬────────┬──────────────┤
│ Dataset      │Precision │ Recall │ Hallucination│
├──────────────┼──────────┼────────┼──────────────┤
│ hr_cv_01     │  0.93    │  0.87  │   0.00       │
│ finance_01   │  0.88    │  0.82  │   0.03       │
│ education_01 │  0.95    │  0.90  │   0.00       │
│ legal_01     │  0.85    │  0.80  │   0.05       │
│ general_01   │  0.90    │  0.85  │   0.02       │
├──────────────┼──────────┼────────┼──────────────┤
│ OVERALL      │  0.90    │  0.85  │   0.02       │
│ TARGET       │  ≥0.90   │  ≥0.85 │   ≤0.02      │
│ STATUS       │  ✅ PASS │ ✅ PASS│   ✅ PASS     │
└──────────────┴──────────┴────────┴──────────────┘
```

---

## Evaluation Triggers

Run evaluation:
- Before merging any PR that changes extraction/RAG/mapping logic
- After updating the Gemini model version
- After changing chunking strategy or embedding model
- After modifying prompt templates
- Weekly as a regression check (CI/CD)

---

## Regression Policy

- If any metric drops below the target threshold after a change, the PR is **blocked**
- The developer must either fix the regression or provide justification + user approval
- All eval results are logged in `eval/results/` with timestamps for historical tracking
