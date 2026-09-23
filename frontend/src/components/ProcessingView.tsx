'use client';

import React from 'react';
import {
  Loader2,
  FileSearch,
  Database,
  ScanText,
  Sparkles,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { JobProgress } from '../lib/types';

interface ProcessingViewProps {
  progress: JobProgress;
  sourceFilename: string;
  templateFilename: string;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  progress,
  sourceFilename,
  templateFilename,
}) => {
  const steps = [
    {
      num: 1,
      title: 'PDF Text & Table Extraction',
      description: 'Extracting text streams and tabular matrices using PyMuPDF and pdfplumber.',
      icon: <FileSearch className="w-5 h-5 text-indigo-500" />,
      threshold: 25,
    },
    {
      num: 2,
      title: 'Semantic Chunking & Embedding',
      description: 'Splitting clauses into semantic segments via Gemini text-embedding-004.',
      icon: <Database className="w-5 h-5 text-cyan-500" />,
      threshold: 50,
    },
    {
      num: 3,
      title: 'Template Placeholder Parsing',
      description: `Scanning ${templateFilename} for mustache tags, table cells, and field keys.`,
      icon: <ScanText className="w-5 h-5 text-indigo-400" />,
      threshold: 75,
    },
    {
      num: 4,
      title: 'Gemini 2.0 Flash Structured Mapping',
      description: 'Retrieving relevant context via RAG and validating schema confidence scores.',
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      threshold: 100,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
          <span>Step 2: AI Pipeline in Progress</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Analyzing & Mapping Documents
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          Processing <span className="font-semibold text-slate-800 dark:text-slate-200">{sourceFilename}</span> into{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{templateFilename}</span>
        </p>
      </div>

      {/* Progress Card */}
      <div className="p-6 rounded-2xl glass-panel shadow-md space-y-6">
        {/* Progress Bar & Percent */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>Pipeline Status: {progress.currentStep}</span>
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 text-sm">
              {progress.progressPercent}%
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300 relative animate-shimmer"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Phase Step List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {steps.map((s) => {
            const isFinished = progress.progressPercent >= s.threshold;
            const isCurrent =
              progress.progressPercent < s.threshold &&
              progress.progressPercent >= s.threshold - 25;

            return (
              <div
                key={s.num}
                className={`p-4 rounded-xl border transition-all ${
                  isFinished
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : isCurrent
                    ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm'
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isFinished
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isFinished ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      s.icon
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>{s.num}.</span>
                      <span>{s.title}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {s.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Pulse Indicator */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-300 font-mono text-xs border border-slate-800 shadow-sm space-y-1.5">
        <div className="flex items-center gap-2 pb-1 border-b border-slate-800 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time RAG Engine Logs</span>
        </div>
        <p className="text-slate-400">
          <span className="text-indigo-400">[Worker 0]</span> Parsing source tokens with chunk_size=800, overlap=100
        </p>
        <p className="text-slate-400">
          <span className="text-cyan-400">[Gemini 2.0]</span> Schema generation with top_k=5 nearest semantic vectors
        </p>
        <p className="text-emerald-400">
          <span className="text-slate-500">[Info]</span> Preserving document typography and placeholder bookmarks
        </p>
      </div>
    </div>
  );
};
