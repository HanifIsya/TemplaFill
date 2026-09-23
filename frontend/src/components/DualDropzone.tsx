'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, Trash2, ArrowRight } from 'lucide-react';

interface DualDropzoneProps {
  sourceFile: File | null;
  templateFile: File | null;
  onSetSourceFile: (file: File | null) => void;
  onSetTemplateFile: (file: File | null) => void;
  onStartExtraction: () => void;
  onLoadDemoFiles: () => void;
  isLoading?: boolean;
}

export const DualDropzone: React.FC<DualDropzoneProps> = ({
  sourceFile,
  templateFile,
  onSetSourceFile,
  onSetTemplateFile,
  onStartExtraction,
  onLoadDemoFiles,
  isLoading = false,
}) => {
  const [sourceDragActive, setSourceDragActive] = useState(false);
  const [templateDragActive, setTemplateDragActive] = useState(false);

  const sourceInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSourceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSourceDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onSetSourceFile(file);
      } else {
        alert('Please upload a valid PDF document.');
      }
    }
  };

  const handleTemplateDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setTemplateDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['docx', 'xlsx', 'pptx', 'pdf'].includes(ext || '')) {
        onSetTemplateFile(file);
      } else {
        alert('Please upload a supported template (.docx, .xlsx, .pptx, or .pdf).');
      }
    }
  };

  const canProceed = sourceFile !== null && templateFile !== null && !isLoading;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Upload Documents
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Select a source PDF document containing extraction data and a destination template.
        </p>
      </div>

      {/* Dual Upload Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Source PDF */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSourceDragActive(true);
          }}
          onDragLeave={() => setSourceDragActive(false)}
          onDrop={handleSourceDrop}
          className={`rounded border p-5 flex flex-col justify-between transition-colors ${
            sourceDragActive
              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <input
            ref={sourceInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onSetSourceFile(e.target.files[0]);
              }
            }}
          />

          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Source Document
              </span>
              <span className="font-mono text-[11px] text-slate-500">PDF, Max 50MB</span>
            </div>

            {sourceFile ? (
              <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                      {sourceFile.name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatFileSize(sourceFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => onSetSourceFile(null)}
                    aria-label="Remove source file"
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready for text and table extraction</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => sourceInputRef.current?.click()}
                className="py-10 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-600"
              >
                <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                <p className="font-medium text-xs text-slate-800 dark:text-slate-200">
                  Click or drag source PDF here
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Contracts, reports, court filings, financial sheets
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Extractor: PyMuPDF + pdfplumber</span>
          </div>
        </div>

        {/* Card 2: Target Template */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setTemplateDragActive(true);
          }}
          onDragLeave={() => setTemplateDragActive(false)}
          onDrop={handleTemplateDrop}
          className={`rounded border p-5 flex flex-col justify-between transition-colors ${
            templateDragActive
              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <input
            ref={templateInputRef}
            type="file"
            accept=".docx,.xlsx,.pptx,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onSetTemplateFile(e.target.files[0]);
              }
            }}
          />

          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Target Template
              </span>
              <span className="font-mono text-[11px] text-slate-500">DOCX, XLSX, PPTX</span>
            </div>

            {templateFile ? (
              <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                      {templateFile.name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase">
                      {formatFileSize(templateFile.size)} ({templateFile.name.split('.').pop()})
                    </p>
                  </div>
                  <button
                    onClick={() => onSetTemplateFile(null)}
                    aria-label="Remove template file"
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Placeholders detected and ready for mapping</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => templateInputRef.current?.click()}
                className="py-10 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-600"
              >
                <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                <p className="font-medium text-xs text-slate-800 dark:text-slate-200">
                  Click or drag target template here
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  .docx documents, .xlsx sheets, or .pptx presentations
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Preserves original typography and cell borders</span>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onLoadDemoFiles}
          className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
        >
          Load Sample Contract and Template Pair
        </button>

        <button
          disabled={!canProceed}
          onClick={onStartExtraction}
          className={`w-full sm:w-auto px-5 py-2.5 rounded font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            canProceed
              ? 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>Begin Extraction</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
