'use client';

import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { FieldMapping } from '../lib/types';

interface CitationModalProps {
  field: FieldMapping | null;
  onClose: () => void;
  onConfirmField?: (fieldId: string) => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ field, onClose, onConfirmField }) => {
  if (!field) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-xl rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Source Document Citation
            </h3>
            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Page {field.sourcePage || 1} | Field: {field.label} ({field.templateField})
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

        {/* Target Location */}
        <div className="p-2.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-slate-500 font-mono text-[11px]">Template Target:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {field.targetLocation}
          </span>
        </div>

        {/* Source Quote */}
        <div className="space-y-1.5">
          <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">
            Contextual Excerpt from Source Document
          </span>
          <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 leading-relaxed font-mono text-[11px]">
            &ldquo;{field.sourceSnippet || 'Context excerpt not available.'}&rdquo;
          </div>
        </div>

        {/* Values and Retrieval Metrics */}
        <div className="p-3 rounded border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Extracted Value:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {field.extractedValue || 'None'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Cosine Similarity Score:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {(field.confidence * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
          >
            Close
          </button>
          {field.isConfirmed ? (
            <span className="px-3 py-1.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium font-mono text-[11px] flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Already Confirmed</span>
            </span>
          ) : (
            onConfirmField && (
              <button
                onClick={() => {
                  onConfirmField(field.id);
                  onClose();
                }}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Value</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
