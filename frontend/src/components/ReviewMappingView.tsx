'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit2,
  Check,
  X,
  FileText,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { FieldMapping, ExtractionResult } from '../lib/types';

interface ReviewMappingViewProps {
  extractionResult: ExtractionResult;
  onConfirmAndGenerate: (fields: Record<string, string>) => void;
  onUpdateField: (fieldId: string, newValue: string) => void;
  isGenerating?: boolean;
}

export const ReviewMappingView: React.FC<ReviewMappingViewProps> = ({
  extractionResult,
  onConfirmAndGenerate,
  onUpdateField,
  isGenerating = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'review' | 'confirmed'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [fields, setFields] = useState<FieldMapping[]>(extractionResult.fields);

  const startEdit = (field: FieldMapping) => {
    setEditingId(field.id);
    setEditValue(field.extractedValue);
  };

  const saveEdit = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, extractedValue: editValue, isEdited: true, confidence: 1.0, confidenceLevel: 'high' }
          : f
      )
    );
    onUpdateField(fieldId, editValue);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const toggleConfirm = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, isConfirmed: !f.isConfirmed } : f))
    );
  };

  const confirmAll = () => {
    setFields((prev) => prev.map((f) => ({ ...f, isConfirmed: true })));
  };

  const filteredFields = fields.filter((f) => {
    if (filter === 'review') return f.confidenceLevel !== 'high' || !f.isConfirmed;
    if (filter === 'confirmed') return f.isConfirmed;
    return true;
  });

  const highCount = fields.filter((f) => f.confidenceLevel === 'high').length;
  const mediumCount = fields.filter((f) => f.confidenceLevel === 'medium').length;
  const lowCount = fields.filter((f) => f.confidenceLevel === 'low').length;

  const handleGenerateClick = () => {
    const overrides: Record<string, string> = {};
    fields.forEach((f) => {
      overrides[f.templateField] = f.extractedValue;
    });
    onConfirmAndGenerate(overrides);
  };

  const getConfidenceBadge = (confidence: number, level: FieldMapping['confidenceLevel']) => {
    if (level === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>High ({Math.round(confidence * 100)}%)</span>
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Review Suggested ({Math.round(confidence * 100)}%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
        <XCircle className="w-3.5 h-3.5" />
        <span>Low Confidence ({Math.round(confidence * 100)}%)</span>
      </span>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 py-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Step 3: Review Field Mappings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Verify Extracted Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Review values retrieved by Gemini RAG before generating the filled template document.
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-2 sm:gap-3 bg-white/80 dark:bg-slate-900/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Total: <span className="font-bold">{fields.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-medium">
            🟢 High: <span className="font-bold">{highCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-medium">
            🟡 Review: <span className="font-bold">{mediumCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-medium">
            🔴 Low: <span className="font-bold">{lowCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Bulk Action Bar */}
      <div className="p-3 rounded-xl glass-panel shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Fields ({fields.length})
          </button>
          <button
            onClick={() => setFilter('review')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'review'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Needs Review ({mediumCount + lowCount})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'confirmed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Confirmed
          </button>
        </div>

        <button
          onClick={confirmAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Confirm All High Confidence Fields</span>
        </button>
      </div>

      {/* Field Mapping Rows */}
      <div className="space-y-3">
        {filteredFields.map((field) => {
          const isEditing = editingId === field.id;

          return (
            <div
              key={field.id}
              className={`p-4 rounded-xl border transition-all ${
                field.isConfirmed
                  ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900/90 border-amber-200/80 dark:border-amber-900/50 shadow-sm'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Field Identifier & Target */}
                <div className="lg:w-1/3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {field.label}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {field.templateField}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Template Target: <span className="font-medium text-slate-600 dark:text-slate-300">{field.targetLocation}</span>
                  </p>
                </div>

                {/* Extracted Value Box */}
                <div className="lg:w-1/2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(field.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                        aria-label="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="group relative flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs">
                      <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                        {field.extractedValue || (
                          <span className="italic text-slate-400">Value not found in source document</span>
                        )}
                      </span>
                      <button
                        onClick={() => startEdit(field)}
                        className="opacity-70 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-all shrink-0 ml-2"
                        aria-label="Edit value"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Source citation snippet */}
                  {field.sourceSnippet && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-1">
                      <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="italic line-clamp-1">
                        Page {field.sourcePage}: &ldquo;{field.sourceSnippet}&rdquo;
                      </span>
                    </div>
                  )}
                </div>

                {/* Confidence Badge & Confirm Toggle */}
                <div className="flex items-center justify-between lg:justify-end gap-3 lg:w-1/4">
                  {getConfidenceBadge(field.confidence, field.confidenceLevel)}

                  <button
                    onClick={() => toggleConfirm(field.id)}
                    className={`p-1.5 rounded-xl border transition-all ${
                      field.isConfirmed
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-500'
                    }`}
                    title={field.isConfirmed ? 'Confirmed' : 'Click to confirm'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky Bottom Bar for Generate Action */}
      <div className="sticky bottom-4 z-30 p-4 rounded-2xl glass-panel shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-100 dark:border-indigo-950">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            {fields.filter((f) => f.isConfirmed).length} of {fields.length} fields confirmed
          </span>
        </div>

        <button
          disabled={isGenerating}
          onClick={handleGenerateClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-500/25 hover:scale-[1.02] transition-all cursor-pointer"
        >
          <span>{isGenerating ? 'Generating Document...' : 'Generate Filled Document'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
