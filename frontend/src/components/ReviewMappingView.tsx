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
  Search,
  Plus,
  RefreshCw,
  SkipForward,
  Eye,
  Columns,
  List,
} from 'lucide-react';
import { FieldMapping, ExtractionResult } from '../lib/types';
import { CitationModal } from './CitationModal';
import { ReExtractModal } from './ReExtractModal';
import { AddFieldModal } from './AddFieldModal';

interface ReviewMappingViewProps {
  extractionResult: ExtractionResult;
  onConfirmAndGenerate: (fields: Record<string, string>) => void;
  onUpdateField: (fieldId: string, newValue: string) => void;
  onReExtractField?: (fieldId: string, hint: string) => void;
  isGenerating?: boolean;
}

export const ReviewMappingView: React.FC<ReviewMappingViewProps> = ({
  extractionResult,
  onConfirmAndGenerate,
  onUpdateField,
  onReExtractField,
  isGenerating = false,
}) => {
  const [filter, setFilter] = useState<'all' | 'review' | 'confirmed' | 'skipped'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');

  // Modals state
  const [citationField, setCitationField] = useState<FieldMapping | null>(null);
  const [reExtractField, setReExtractField] = useState<FieldMapping | null>(null);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);

  // Field editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [fields, setFields] = useState<FieldMapping[]>(extractionResult.fields);

  // Selected field for split side-by-side view
  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    extractionResult.fields[0]?.id || ''
  );

  const startEdit = (field: FieldMapping) => {
    setEditingId(field.id);
    setEditValue(field.extractedValue);
  };

  const saveEdit = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              extractedValue: editValue,
              isEdited: true,
              confidence: 1.0,
              confidenceLevel: 'high',
              isSkipped: false,
            }
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

  const toggleSkip = (fieldId: string) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, isSkipped: !f.isSkipped } : f))
    );
  };

  const confirmAll = () => {
    setFields((prev) => prev.map((f) => ({ ...f, isConfirmed: true })));
  };

  const handleAddField = (newField: FieldMapping) => {
    setFields((prev) => [...prev, newField]);
  };

  const handleReExtractSubmit = async (fieldId: string, hint: string) => {
    setIsReExtracting(true);
    if (onReExtractField) {
      await onReExtractField(fieldId, hint);
    }
    // Simulate AI refinement
    await new Promise((r) => setTimeout(r, 900));

    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          return {
            ...f,
            confidence: 0.95,
            confidenceLevel: 'high',
            isEdited: true,
            isConfirmed: true,
            reExtractHint: hint,
            extractedValue: hint
              ? `[Refined per hint "${hint}"]: ${f.extractedValue || 'Clause found in Section 14'}`
              : f.extractedValue,
          };
        }
        return f;
      })
    );

    setIsReExtracting(false);
    setReExtractField(null);
  };

  // Filter & Search logic
  const filteredFields = fields.filter((f) => {
    const matchesSearch =
      f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.templateField.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.extractedValue.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'review') return (f.confidenceLevel !== 'high' || !f.isConfirmed) && !f.isSkipped;
    if (filter === 'confirmed') return f.isConfirmed && !f.isSkipped;
    if (filter === 'skipped') return f.isSkipped;
    return true;
  });

  const highCount = fields.filter((f) => f.confidenceLevel === 'high' && !f.isSkipped).length;
  const mediumCount = fields.filter((f) => f.confidenceLevel === 'medium' && !f.isSkipped).length;
  const lowCount = fields.filter((f) => f.confidenceLevel === 'low' && !f.isSkipped).length;
  const skippedCount = fields.filter((f) => f.isSkipped).length;

  const handleGenerateClick = () => {
    const overrides: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.isSkipped) {
        overrides[f.templateField] = f.extractedValue;
      }
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
        <span>Low / Not Found ({Math.round(confidence * 100)}%)</span>
      </span>
    );
  };

  const activeSplitField = fields.find((f) => f.id === selectedFieldId) || fields[0];

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
            Verify & Customize Extracted Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Review Gemini RAG extractions, inspect citations, edit values, or prompt the AI to re-extract.
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

      {/* Control Bar: Search, Filters, View Modes, Add Field */}
      <div className="p-3 rounded-2xl glass-panel shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search field names, keys, or values..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
            />
          </div>

          {/* View Mode Toggle & Add Field Button */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">Table</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Side-by-Side Split View"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">Split View</span>
              </button>
            </div>

            <button
              onClick={() => setIsAddFieldOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>
        </div>

        {/* Filter Pills and Bulk Confirm */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Fields ({fields.length})
            </button>
            <button
              onClick={() => setFilter('review')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'review'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Needs Review ({mediumCount + lowCount})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === 'confirmed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Confirmed
            </button>
            {skippedCount > 0 && (
              <button
                onClick={() => setFilter('skipped')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filter === 'skipped'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Skipped ({skippedCount})
              </button>
            )}
          </div>

          <button
            onClick={confirmAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Confirm All Fields</span>
          </button>
        </div>
      </div>

      {/* Main Content: Split View or Table View */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Source Citation Inspector */}
          <div className="lg:col-span-5 p-5 rounded-2xl glass-panel shadow-sm space-y-4 lg:sticky lg:top-20 self-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                Source Document Inspector
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Page {activeSplitField?.sourcePage || 1}
              </span>
            </div>

            {activeSplitField ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {activeSplitField.label}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Template Placeholder: <code className="font-mono text-indigo-600 dark:text-indigo-400">{activeSplitField.templateField}</code>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-serif">
                  &ldquo;{activeSplitField.sourceSnippet || 'No contextual excerpt recorded for this field.'}&rdquo;
                </div>

                <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Extracted Value:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {activeSplitField.extractedValue || '(Not found)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Confidence:</span>
                    {getConfidenceBadge(activeSplitField.confidence, activeSplitField.confidenceLevel)}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setReExtractField(activeSplitField)}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Prompt AI Re-extract</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Select a field on the right to view its citation.</p>
            )}
          </div>

          {/* Right Column: Field list */}
          <div className="lg:col-span-7 space-y-3">
            {filteredFields.map((field) => {
              const isSelected = selectedFieldId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 bg-white dark:bg-slate-900 shadow-md'
                      : field.isSkipped
                      ? 'opacity-50 bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {field.label}
                        </span>
                        {field.isSkipped && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600">
                            Skipped
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1">
                        {field.extractedValue || (
                          <span className="italic text-slate-400">Not found in document</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getConfidenceBadge(field.confidence, field.confidenceLevel)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleConfirm(field.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          field.isConfirmed
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-300'
                            : 'text-slate-400 hover:text-emerald-500 border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View Mode */
        <div className="space-y-3">
          {filteredFields.map((field) => {
            const isEditing = editingId === field.id;

            return (
              <div
                key={field.id}
                className={`p-4 rounded-xl border transition-all ${
                  field.isSkipped
                    ? 'opacity-50 bg-slate-100/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                    : field.isConfirmed
                    ? 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'bg-white dark:bg-slate-900/90 border-amber-200/80 dark:border-amber-900/50 shadow-xs'
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
                      {field.isSkipped && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600">
                          Skipped
                        </span>
                      )}
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
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                          aria-label="Save edit"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                          aria-label="Cancel edit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="group relative flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                          {field.extractedValue || (
                            <span className="italic text-slate-400">Value not found in source document</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                          <button
                            onClick={() => startEdit(field)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Edit value inline"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCitationField(field)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-cyan-600 transition-colors cursor-pointer"
                            title="Inspect source citation"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setReExtractField(field)}
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Prompt AI to re-extract"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleSkip(field.id)}
                            className={`p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                              field.isSkipped ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title={field.isSkipped ? 'Unskip field' : 'Skip this field in output'}
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Source citation snippet snippet */}
                    {field.sourceSnippet && (
                      <div
                        onClick={() => setCitationField(field)}
                        className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-1 cursor-pointer hover:text-indigo-600 transition-colors"
                      >
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
                      className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
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
      )}

      {/* Sticky Bottom Bar for Generate Action */}
      <div className="sticky bottom-4 z-30 p-4 rounded-2xl glass-panel shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-100 dark:border-indigo-950">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>
            {fields.filter((f) => f.isConfirmed && !f.isSkipped).length} of{' '}
            {fields.filter((f) => !f.isSkipped).length} active fields confirmed
          </span>
          {skippedCount > 0 && <span className="text-slate-400">({skippedCount} skipped)</span>}
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

      {/* Modals */}
      <CitationModal
        field={citationField}
        onClose={() => setCitationField(null)}
        onConfirmField={toggleConfirm}
      />

      <ReExtractModal
        field={reExtractField}
        onClose={() => setReExtractField(null)}
        onSubmitReExtract={handleReExtractSubmit}
        isProcessing={isReExtracting}
      />

      <AddFieldModal
        isOpen={isAddFieldOpen}
        onClose={() => setIsAddFieldOpen(false)}
        onAddField={handleAddField}
      />
    </div>
  );
};
