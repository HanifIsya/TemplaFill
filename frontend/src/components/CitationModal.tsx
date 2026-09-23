'use client';

import React from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, XCircle, Sparkles, BookOpen } from 'lucide-react';
import { FieldMapping } from '../lib/types';

interface CitationModalProps {
  field: FieldMapping | null;
  onClose: () => void;
  onConfirmField?: (fieldId: string) => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ field, onClose, onConfirmField }) => {
  if (!field) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl glass-panel shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Source Document Citation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {field.sourcePage || 1} • {field.label}
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

        {/* Target Bookmark */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Template Target:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {field.targetLocation}
          </span>
        </div>

        {/* Source Context Block */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            Exact Excerpt from Source PDF
          </span>
          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 font-serif text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            &ldquo;{field.sourceSnippet || 'Context paragraph unavailable'}&rdquo;
          </div>
        </div>

        {/* Extracted Entity and Confidence Explanation */}
        <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Extracted Value:
            </span>
            <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
              {field.extractedValue || 'None'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              RAG Retrieval Confidence:
            </span>
            <div className="flex items-center gap-1.5">
              {field.confidenceLevel === 'high' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : field.confidenceLevel === 'medium' ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {Math.round(field.confidence * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
          {onConfirmField && !field.isConfirmed && (
            <button
              onClick={() => {
                onConfirmField(field.id);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm This Value</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
