'use client';

import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'workflow' | 'syntax' | 'engine' | 'review' | 'privacy';

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('workflow');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <h2 id="help-modal-title" className="text-sm font-semibold text-slate-100 uppercase tracking-wider font-mono">
                TemplaFill Documentation & User Guide
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Complete guide to workflows, template syntax, the Gemini extraction engine, and data security
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-sm font-mono px-2 py-1 rounded border border-slate-800 hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            ESC / [✕]
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto scrollbar-thin">
          {[
            { id: 'workflow', label: '1. Workflow' },
            { id: 'syntax', label: '2. Template Syntax' },
            { id: 'engine', label: '3. Dual Engine' },
            { id: 'review', label: '4. Review & Edit' },
            { id: 'privacy', label: '5. Privacy & Security' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabKey)}
              className={`px-4 py-2.5 text-xs font-mono font-medium tracking-wide transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {/* TAB 1: WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-2">
                  Document Processing Steps
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  TemplaFill intelligently extracts structured data from your source PDF and maps it directly into your template placeholders — preserving every font, table, and layout detail.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">1</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Upload Documents</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Select or drag & drop your <strong>Source PDF</strong> (contracts, financial reports, invoices, resumes) and your <strong>Template</strong> (.docx, .xlsx, or .pptx) containing placeholders.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">2</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">RAG & AI Extraction</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      PyMuPDF parses the PDF text, creates semantic chunks, generates vector embeddings, and calls <strong>Google Gemini 3.6 Flash</strong> to locate the exact data you need.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">3</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Review & Verify</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Inspect every extracted value alongside its confidence score, source page, and citation snippet. Edit inline or request a targeted re-extraction with a custom hint.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[11px] font-mono font-bold flex items-center justify-center">4</span>
                      <h4 className="text-xs font-mono font-bold text-slate-200 uppercase">Export Filled Document</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Confirm your fields and download a new Word, Excel, or PowerPoint file with every placeholder filled accurately and original formatting intact.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded text-xs space-y-1">
                <span className="font-mono text-blue-400 font-semibold uppercase">Guest Mode — No Account Required:</span>
                <p className="text-slate-400">
                  TemplaFill works instantly without sign-up or credentials. Your processing session is stored locally in your browser for quick access.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SYNTAX */}
          {activeTab === 'syntax' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Supported Template Formats
                </h3>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                    <span className="text-blue-400 font-mono font-bold text-xs">Microsoft Word</span>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">.DOCX</p>
                    <p className="text-[10px] text-slate-500 mt-1">Paragraphs & Tables</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                    <span className="text-emerald-400 font-mono font-bold text-xs">Microsoft Excel</span>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">.XLSX</p>
                    <p className="text-[10px] text-slate-500 mt-1">Cells & Formulas</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                    <span className="text-amber-400 font-mono font-bold text-xs">PowerPoint</span>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">.PPTX</p>
                    <p className="text-[10px] text-slate-500 mt-1">Text Boxes & Shapes</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  4 Placeholder Syntax Options
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  Use any of the following placeholder styles in your template — all are supported interchangeably:
                </p>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-blue-300 font-bold">{'{{field_name}}'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">e.g. {'{{client_name}}'}, {'{{total_amount}}'}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">Highly Recommended</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 font-bold">{'[field_name]'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">e.g. [effective_date], [vendor_name]</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Square Brackets</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 font-bold">{'<<field_name>>'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">e.g. &lt;&lt;contract_title&gt;&gt;</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Double Angle Brackets</span>
                  </div>

                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-indigo-300 font-bold">{'__field_name__'}</span>
                      <span className="text-slate-500 ml-2 text-[11px] font-sans">e.g. __invoice_number__</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Double Underscores</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                <span className="font-mono text-slate-200 font-semibold uppercase">Matching Flexibility:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-1 mt-1">
                  <li><strong>Case-insensitive:</strong> {'{{Client_Name}}'} matches field `client_name` automatically.</li>
                  <li><strong>Whitespace-tolerant:</strong> Extra spaces like {'{{  total_amount  }}'} are normalized.</li>
                  <li><strong>Style preservation:</strong> Text color, font size, bold, and italic applied to a placeholder are carried over to the extracted value.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: ENGINE */}
          {activeTab === 'engine' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Dual Extraction Engine Architecture
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  TemplaFill uses a resilient dual-pipeline architecture that guarantees your document is always processed — even when the external AI service hits rate limits.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-400 uppercase">
                      1. Primary Engine: Google Gemini 3.6 Flash + RAG
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      Primary AI
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Powered by Google&apos;s latest Gemini Flash model with semantic vector retrieval via <code>gemini-embedding-001</code> (768 dimensions). It understands complex legal clauses, financial tables, and nuanced semantic context with high accuracy.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-emerald-400 uppercase">
                      2. Fallback Engine: Local Heuristic (Zero-Downtime)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Auto Fallback
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    If your Google AI Studio quota is exceeded (429 Too Many Requests) or the service is temporarily overloaded (503 Service Unavailable), TemplaFill automatically switches to its local deterministic engine (pattern matching, regex, and structural parsing). Your extraction still completes successfully with no error screen.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs">
                <span className="font-mono text-slate-300 font-semibold uppercase">Source Transparency:</span>
                <p className="text-slate-400 mt-1">
                  When the fallback engine takes over, an informative banner appears on the review screen so you always know which engine processed your data.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEW & CONFIDENCE */}
          {activeTab === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Confidence Scores
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  Every extracted field includes a confidence indicator to help you audit data quickly:
                </p>

                <div className="space-y-2 mt-2 text-xs">
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/60 rounded">
                    <div className="flex items-center justify-between font-mono font-bold text-emerald-400">
                      <span>HIGH CONFIDENCE (80% - 100%)</span>
                      <span className="text-[10px] uppercase font-sans text-emerald-300">Ready to Use</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Value found as an exact, unambiguous match in the source PDF with clear surrounding context.
                    </p>
                  </div>

                  <div className="p-2.5 bg-amber-950/30 border border-amber-800/60 rounded">
                    <div className="flex items-center justify-between font-mono font-bold text-amber-400">
                      <span>MEDIUM CONFIDENCE (50% - 79%)</span>
                      <span className="text-[10px] uppercase font-sans text-amber-300">Review Recommended</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Value inferred from nearby context or implicit formatting. Check the source citation to verify accuracy.
                    </p>
                  </div>

                  <div className="p-2.5 bg-rose-950/30 border border-rose-800/60 rounded">
                    <div className="flex items-center justify-between font-mono font-bold text-rose-400">
                      <span>LOW CONFIDENCE / NOT FOUND (&lt; 50%)</span>
                      <span className="text-[10px] uppercase font-sans text-rose-300">Needs Attention</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Value not found explicitly in the source. Enter it manually or try re-extraction with a hint.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Correction & Re-Extraction
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="font-mono text-slate-200 font-bold block mb-1">Inline Edit</span>
                    <p className="text-slate-400">
                      Click any field value in the review table to edit it directly and correct the value as needed.
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                    <span className="font-mono text-slate-200 font-bold block mb-1">Re-Extract with Hint</span>
                    <p className="text-slate-400">
                      Click &quot;Re-Extract&quot; and enter a hint (e.g., <em>&quot;Look for the contract number in the header on page 1&quot;</em>) to re-run extraction with focused context.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold mb-1">
                  Zero Data Retention Policy
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  TemplaFill is built to strict privacy standards aligned with GDPR principles. Your documents remain your confidential property.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">1. No Login Required:</span>
                  <p className="text-slate-400 mt-1">
                    No email, phone, or personal credentials are needed. Use the platform instantly as a guest.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">2. Never Used for AI Training:</span>
                  <p className="text-slate-400 mt-1">
                    Your PDFs and template values are never used to train or fine-tune any public AI models.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">3. Automatic Purging:</span>
                  <p className="text-slate-400 mt-1">
                    Temporary files in backend memory are deleted automatically after the job completes or within one hour of session expiry.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-blue-400 font-semibold uppercase">4. End-to-End Encryption:</span>
                  <p className="text-slate-400 mt-1">
                    All data exchanged between your browser and the server is protected with industry-standard HTTPS TLS 1.3 encryption.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs font-mono text-slate-400">
          <span>TemplaFill v0.1.0 • Google Gemini 3.6 Flash</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium uppercase tracking-wider text-[11px] transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
