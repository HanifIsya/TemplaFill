'use client';

import React, { useRef, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ArrowRight,
  FileCheck2,
  Sparkles,
  Info,
} from 'lucide-react';

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

  const getTemplateIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    }
    if (ext === 'pptx' || ext === 'ppt') {
      return <Presentation className="w-8 h-8 text-orange-500" />;
    }
    return <FileText className="w-8 h-8 text-indigo-500" />;
  };

  const handleSourceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setSourceDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onSetSourceFile(file);
      } else {
        alert('Please upload a valid PDF document for the source content.');
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
    <div className="w-full max-w-5xl mx-auto space-y-8 py-6">
      {/* Header Info */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Step 1: Upload Documents</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Select Source PDF & Target Template
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Upload your unstructured source document (contracts, reports, resumes) alongside your formatted template (.docx, .xlsx, .pptx).
        </p>
      </div>

      {/* Dual Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Source PDF */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSourceDragActive(true);
          }}
          onDragLeave={() => setSourceDragActive(false)}
          onDrop={handleSourceDrop}
          className={`relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border-2 ${
            sourceFile
              ? 'border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20'
              : sourceDragActive
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 scale-[1.01]'
              : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600'
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
            {/* Header label */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Input 1: Source Document
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                PDF (Up to 50MB)
              </span>
            </div>

            {sourceFile ? (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950/80 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">
                        {sourceFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(sourceFile.size)} • Source PDF
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onSetSourceFile(null)}
                    aria-label="Remove source file"
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready for deep extraction & RAG indexing</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => sourceInputRef.current?.click()}
                className="py-12 px-4 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                  Click to upload or drag & drop Source PDF
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Contracts, reports, court decisions, bank statements, or CVs.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Text, tables, and clauses supported</span>
            <span className="font-mono text-[10px]">PyMuPDF + pdfplumber</span>
          </div>
        </div>

        {/* Card 2: Template Document */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setTemplateDragActive(true);
          }}
          onDragLeave={() => setTemplateDragActive(false)}
          onDrop={handleTemplateDrop}
          className={`relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border-2 ${
            templateFile
              ? 'border-indigo-500/50 bg-indigo-50/20 dark:bg-indigo-950/20'
              : templateDragActive
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 scale-[1.01]'
              : 'border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600'
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
            {/* Header label */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4" />
                Input 2: Target Template
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                DOCX, XLSX, PPTX
              </span>
            </div>

            {templateFile ? (
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 flex items-center justify-center shrink-0">
                      {getTemplateIcon(templateFile.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 line-clamp-1">
                        {templateFile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                        {formatFileSize(templateFile.size)} • {templateFile.name.split('.').pop()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onSetTemplateFile(null)}
                    aria-label="Remove template file"
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Template placeholders will be auto-detected</span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => templateInputRef.current?.click()}
                className="py-12 px-4 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
                  Click to upload or drag & drop Template
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Supports .docx, .xlsx spreadsheets, .pptx slides, or fillable PDF.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Preserves original styling & layout</span>
            <span className="font-mono text-[10px]">Multi-format engine</span>
          </div>
        </div>
      </div>

      {/* Demo Preset Bar & Action CTA */}
      <div className="p-4 rounded-2xl glass-panel shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onLoadDemoFiles}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Preset (Sample Contract & .docx Template)</span>
          </button>
          <span className="text-xs text-slate-500 hidden md:inline">
            No sample files on hand? Try our preloaded demo instantly.
          </span>
        </div>

        <button
          disabled={!canProceed}
          onClick={onStartExtraction}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer ${
            canProceed
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-500/25 hover:scale-[1.02]'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
          }`}
        >
          <span>Begin AI Extraction</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400" />
        <span>
          Files are processed securely in memory and isolated sessions. No training on user data.
        </span>
      </div>
    </div>
  );
};
