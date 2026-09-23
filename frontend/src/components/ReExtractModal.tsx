'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Sparkles, HelpCircle } from 'lucide-react';
import { FieldMapping } from '../lib/types';

interface ReExtractModalProps {
  field: FieldMapping | null;
  onClose: () => void;
  onSubmitReExtract: (fieldId: string, hint: string) => void;
  isProcessing?: boolean;
}

export const ReExtractModal: React.FC<ReExtractModalProps> = ({
  field,
  onClose,
  onSubmitReExtract,
  isProcessing = false,
}) => {
  const [hint, setHint] = useState<string>('');

  if (!field) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReExtract(field.id, hint);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl glass-panel shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Re-extract Field with AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{field.label}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Value Display */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Current Extracted Value:</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            {field.extractedValue || '(No value extracted yet)'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Prompt / Extraction Hint for Gemini:</span>
            </label>
            <textarea
              rows={3}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g., 'Look specifically in Article 14 for SIAC arbitration', or 'Format the date as DD-MM-YYYY', or 'Find the net amount excluding VAT'."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400 shrink-0" />
              <span>
                Optional: provide a specific section, keyword, or desired output format.
              </span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Re-extracting...' : 'Run Targeted AI Extraction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
