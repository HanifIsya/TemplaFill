'use client';

import React from 'react';

interface HeroLandingProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({ onGetStarted, onTryDemo }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 py-8 px-4 sm:px-6">
      {/* Primary Headline & Description */}
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Document Field Extraction and Template Population
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          TemplaFill extracts structured data from multi-page source PDFs and maps values directly into Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) template documents using Retrieval-Augmented Generation.
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto text-center px-5 py-2.5 rounded bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Start Document Processing
          </button>
          <button
            onClick={onTryDemo}
            className="w-full sm:w-auto text-center px-5 py-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Load Sample Contract & Template
          </button>
        </div>
      </div>

      {/* Technical Specifications Workbench Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            System Specifications & Supported Formats
          </span>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            Engine: Google Gemini 3.6 Flash + PyMuPDF
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 p-4 gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 md:col-span-1">
              Source Documents
            </span>
            <span className="text-slate-600 dark:text-slate-300 md:col-span-3">
              Standard and scanned PDFs up to 50MB and 500 pages. Extracts narrative clauses, legal definitions, headers, tables, and form fields.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 p-4 gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 md:col-span-1">
              Target Templates
            </span>
            <span className="text-slate-600 dark:text-slate-300 md:col-span-3">
              Microsoft Word (.docx), Excel (.xlsx), PowerPoint (.pptx), and fillable PDF forms. Preserves original typography, formatting, and styles.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 p-4 gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 md:col-span-1">
              Retrieval Pipeline
            </span>
            <span className="text-slate-600 dark:text-slate-300 md:col-span-3">
              Semantic text chunking (800 tokens, 100 overlap) indexed with 768-dimensional embeddings. Extracts values with confidence scoring and exact page citations.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 p-4 gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100 md:col-span-1">
              Privacy &amp; PII Protection
            </span>
            <span className="text-slate-600 dark:text-slate-300 md:col-span-3">
              Automated <strong>Selective PII Masking</strong> shields sensitive identifiers (NPWP, NIK/KTP, Bank Accounts, Emails, Phones) with surrogate tokens before AI transmission. 24-hour ephemeral auto-purge with zero persistent document retention.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
