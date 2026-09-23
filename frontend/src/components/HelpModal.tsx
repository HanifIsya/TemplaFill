'use client';

import React, { useState } from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'placeholders' | 'sources' | 'review' | 'privacy'>('placeholders');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 id="help-modal-title" className="text-base font-semibold text-slate-100 uppercase tracking-wider font-mono">
              TemplaFill User Guide & Documentation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Standards, template syntax, confidence metrics, and data privacy
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-mono p-1"
            aria-label="Close dialog"
          >
            [X]
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 overflow-x-auto">
          {[
            { id: 'placeholders', label: '1. Placeholders' },
            { id: 'sources', label: '2. Source PDFs' },
            { id: 'review', label: '3. Confidence & Edit' },
            { id: 'privacy', label: '4. Privacy & Retention' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 text-xs font-mono font-medium tracking-wide uppercase transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 text-sm text-slate-300">
          {activeTab === 'placeholders' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold mb-1">
                  Supported Template Formats
                </h3>
                <p className="text-xs text-slate-400">
                  TemplaFill parses and fills documents while strictly preserving all original typography, table layouts, margins, and branding.
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-center">
                    <span className="text-blue-400 font-bold">.DOCX</span>
                    <p className="text-[11px] text-slate-500 mt-1">Word Documents</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-center">
                    <span className="text-emerald-400 font-bold">.XLSX</span>
                    <p className="text-[11px] text-slate-500 mt-1">Excel Spreadsheets</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-center">
                    <span className="text-amber-400 font-bold">.PPTX</span>
                    <p className="text-[11px] text-slate-500 mt-1">PowerPoint Slides</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold mb-1">
                  Placeholder Syntax
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  You can use any of the following 4 syntax formats inside paragraphs, table cells, or slide text frames:
                </p>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded flex justify-between">
                    <span className="text-indigo-300">{'{{field_name}}'}</span>
                    <span className="text-slate-500">Double curly braces (Recommended)</span>
                  </div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded flex justify-between">
                    <span className="text-indigo-300">{'<<field_name>>'}</span>
                    <span className="text-slate-500">Double angle brackets</span>
                  </div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded flex justify-between">
                    <span className="text-indigo-300">{'[field_name]'}</span>
                    <span className="text-slate-500">Square brackets</span>
                  </div>
                  <div className="p-2 bg-slate-950 border border-slate-800 rounded flex justify-between">
                    <span className="text-indigo-300">{'__field_name__'}</span>
                    <span className="text-slate-500">Double underscore wrapping</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold mb-1">
                  Document Requirements
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                  <li><strong>Format:</strong> Standard PDF (.pdf).</li>
                  <li><strong>Size Limit:</strong> Up to 50 MB per source document.</li>
                  <li><strong>Page Range:</strong> Up to 500 pages processed per session.</li>
                  <li><strong>Content:</strong> Contracts, financial reports, CVs, research filings, transcripts, and tables.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                <span className="font-mono text-emerald-400 font-semibold uppercase">Searchable PDF Extraction:</span>
                <p className="text-slate-400">
                  PyMuPDF fast semantic chunking processes native PDF text directly. For scanned papers, ensure standard OCR has been applied so text layers are accessible to the RAG retriever.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold mb-1">
                  Confidence Score Guide
                </h3>
                <div className="space-y-2 mt-2 text-xs">
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded">
                    <div className="flex items-center gap-2 font-mono font-bold text-emerald-400">
                      <span>HIGH CONFIDENCE (80% - 100%)</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Direct verbatim match located with unambiguous context in source text.
                    </p>
                  </div>
                  <div className="p-2.5 bg-amber-950/40 border border-amber-800/80 rounded">
                    <div className="flex items-center gap-2 font-mono font-bold text-amber-400">
                      <span>MEDIUM CONFIDENCE (50% - 79%)</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Inferred from surrounding paragraphs or complex phrasing. Recommended to verify against the source snippet citation.
                    </p>
                  </div>
                  <div className="p-2.5 bg-red-950/40 border border-red-800/80 rounded">
                    <div className="flex items-center gap-2 font-mono font-bold text-red-400">
                      <span>LOW CONFIDENCE / NOT FOUND (&lt; 50%)</span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Target field was not explicitly found or ambiguous. You can manually edit the value, skip the field, or click &quot;Re-extract&quot; with a custom hint.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold mb-1">
                  Re-Extraction with Prompt Hints
                </h3>
                <p className="text-xs text-slate-400">
                  If an extraction missed a detail, click the <strong>Re-Extract</strong> button and provide a prompt hint (e.g., &quot;Check the execution block on page 14 near the witness signature&quot;) to trigger focused re-querying.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-100 font-semibold mb-1">
                  Zero Data Retention Policy
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  TemplaFill is built with strict privacy controls in adherence with GDPR and PDPA principles. Uploaded PDFs and generated documents reside in transient execution memory during your active browser session.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-indigo-300 font-semibold uppercase">No AI Training:</span>
                  <p className="text-slate-400 mt-1">
                    Your confidential documents and extracted fields are never used to train public AI models.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-indigo-300 font-semibold uppercase">In-Flight Encryption:</span>
                  <p className="text-slate-400 mt-1">
                    All file transfers are transmitted via HTTPS with TLS 1.3 encryption and CSP security headers.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                  <span className="font-mono text-indigo-300 font-semibold uppercase">Automatic Purging:</span>
                  <p className="text-slate-400 mt-1">
                    Temporary backend scratchpads are cleaned up automatically after job completion or 1 hour of inactivity.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 text-xs font-mono text-slate-400">
          <span>Need more assistance? Consult docs/1-product/USER_GUIDE.md</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold uppercase transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
