'use client';

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  FileText,
  FileSpreadsheet,
  Presentation,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface HeroLandingProps {
  onGetStarted: () => void;
  onTryDemo: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({ onGetStarted, onTryDemo }) => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-16 py-12 px-4 sm:px-6">
      {/* Hero Header */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>General-Purpose PDF to Template AI Engine</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15]">
          Extract. Map. Fill.{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
            Without Hallucinations.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Tired of generic chatbots truncating 100+ page contracts and making up numbers? TemplaFill uses RAG and Gemini 2.0 to extract structured data from source PDFs and fill your exact templates automatically.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onGetStarted}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] transition-all cursor-pointer"
          >
            <span>Upload Documents Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onTryDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Try Interactive Demo</span>
          </button>
        </div>

        {/* Formats Supported */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          <span>Target Template Formats:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            <FileText className="w-3.5 h-3.5 text-indigo-500" /> .docx
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> .xlsx
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            <Presentation className="w-3.5 h-3.5 text-orange-500" /> .pptx
          </span>
        </div>
      </div>

      {/* 3-Step Visual Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel shadow-sm space-y-3 border-t-2 border-t-indigo-500">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            1
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Upload Source & Template
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Drag in your raw PDF (contracts, financial reports, resumes) alongside your existing formatted template.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel shadow-sm space-y-3 border-t-2 border-t-cyan-500">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold">
            2
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            AI Semantic RAG & Mapping
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Gemini 2.0 retrieves exact matching clauses, parses tables, and calculates confidence scores with source citations.
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-panel shadow-sm space-y-3 border-t-2 border-t-emerald-500">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
            3
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Review & Export Filled File
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Inspect mappings with color-coded confidence indicators, tweak values inline, and download the finished document.
          </p>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="p-8 rounded-3xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-slate-900/60 dark:to-slate-900/20 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Engineered for Precision & Confidentiality
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Designed for legal, compliance, procurement, and enterprise reporting workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                100+ Page Handling
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Chunking & vector search avoid LLM context memory limits and context loss.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                Preserves Template Design
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Fonts, branding, styles, cell borders, and layouts remain completely intact.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                24-Hour Auto-Purge
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Zero permanent document storage. Fully compliant with enterprise data policies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
