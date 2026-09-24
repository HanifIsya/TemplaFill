'use client';

import React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
      title: 'PDF Text and Table Extraction',
      description: 'Extracting content blocks and tabular structures using PyMuPDF and pdfplumber.',
      threshold: 25,
    },
    {
      num: 2,
      title: 'Semantic Chunking and Embedding',
      description: 'Partitioning text into 800-token chunks and computing 768-dimensional embeddings.',
      threshold: 50,
    },
    {
      num: 3,
      title: 'Template Placeholder Inspection',
      description: `Locating target fields and tags within ${templateFilename}.`,
      threshold: 75,
    },
    {
      num: 4,
      title: 'Structured Extraction via Google Gemini 3.6 Flash',
      description: 'Retrieving relevant candidate chunks via vector cosine similarity and scoring confidence.',
      threshold: 100,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Document Extraction in Progress
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Source: <span className="font-semibold">{sourceFilename}</span> | Target: <span className="font-semibold">{templateFilename}</span>
        </p>
      </div>

      {/* Main Status Panel */}
      <div className="p-5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5">
        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Pipeline: {progress.currentStep}
            </span>
            <span className="font-bold text-blue-700 dark:text-blue-400">
              {progress.progressPercent}%
            </span>
          </div>

          <div className="w-full h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-700 dark:bg-blue-500 rounded transition-all duration-200"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Pipeline Phase Steps */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-1">
          {steps.map((s) => {
            const isFinished = progress.progressPercent >= s.threshold;
            const isCurrent =
              progress.progressPercent < s.threshold &&
              progress.progressPercent >= s.threshold - 25;

            return (
              <div key={s.num} className="py-3 flex items-start gap-3 text-xs">
                <div className="mt-0.5 shrink-0">
                  {isFinished ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center font-mono text-[10px] text-slate-400">
                      {s.num}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        isFinished
                          ? 'text-slate-900 dark:text-slate-100'
                          : isCurrent
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {s.num}. {s.title}
                    </span>
                    <span
                      className={`font-mono text-[10px] uppercase ${
                        isFinished
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isCurrent
                          ? 'text-blue-700 dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {isFinished ? 'Completed' : isCurrent ? 'Active' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technical Process Logs */}
      <div className="p-3.5 rounded bg-slate-900 text-slate-300 font-mono text-[11px] border border-slate-800 space-y-1">
        <div className="text-slate-500 pb-1 border-b border-slate-800 flex items-center justify-between">
          <span>Worker Process Execution Logs</span>
          <span>Chunk Size: 800 tokens</span>
        </div>
        <p className="text-slate-400">[INFO] Initializing PyMuPDF text reader and pdfplumber table parser.</p>
        <p className="text-slate-400">[INFO] Generating semantic chunk embeddings via text-embedding-004.</p>
        <p className="text-blue-400">[INFO] Top-K retrieval executing vector cosine search.</p>
      </div>
    </div>
  );
};
