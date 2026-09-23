'use client';

import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-lg rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Targeted Field Re-extraction
            </h3>
            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Field: {field.label} ({field.templateField})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Extracted Value */}
        <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-1">
          <span className="text-slate-500 font-mono text-[11px]">Current Extracted Value:</span>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {field.extractedValue || '(No value extracted)'}
          </p>
        </div>

        {/* Re-extraction Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Extraction Directive / Context Hint for Model:
            </label>
            <textarea
              rows={3}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="e.g., Look specifically in Section 14.4 for SIAC arbitration, or format date as DD/MM/YYYY"
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
            <p className="text-[11px] text-slate-500">
              Instruct Gemini where in the source PDF to search or specify formatting rules.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Running Extraction...' : 'Execute Targeted Extraction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
