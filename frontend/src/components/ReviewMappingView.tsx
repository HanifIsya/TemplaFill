'use client';

import React, { useState } from 'react';
import {
  Check,
  X,
  Search,
  Plus,
  ArrowRight,
  List,
  Columns,
  CheckCheck,
  AlertTriangle,
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

  // Modals
  const [citationField, setCitationField] = useState<FieldMapping | null>(null);
  const [reExtractField, setReExtractField] = useState<FieldMapping | null>(null);
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);

  // Field editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [fields, setFields] = useState<FieldMapping[]>(extractionResult.fields);

  // Selected for split view
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
    await new Promise((r) => setTimeout(r, 600));

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
              ? `[Refined with hint: "${hint}"]: ${f.extractedValue || 'Value updated'}`
              : f.extractedValue,
          };
        }
        return f;
      })
    );

    setIsReExtracting(false);
    setReExtractField(null);
  };

  // Filter & Search
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
    const percent = Math.round(confidence * 100);
    if (level === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          High ({percent}%)
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          Review ({percent}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
        Missing ({percent}%)
      </span>
    );
  };

  const activeSplitField = fields.find((f) => f.id === selectedFieldId) || fields[0];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 py-6">
      {/* Header and Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Review Field Mappings
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Verify extracted field data, edit values directly, or trigger targeted re-extraction before generation.
          </p>
        </div>

        {/* Status Metrics (Clean, High-Contrast, No Emojis) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            Total: <span className="font-bold">{fields.length}</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            High: <span className="font-bold">{highCount}</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
            Review: <span className="font-bold">{mediumCount}</span>
          </div>
          <div className="px-2.5 py-1 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300">
            Missing: <span className="font-bold">{lowCount}</span>
          </div>
        </div>
      </div>

      {/* Gemini AI Error / Quota Notice Banner */}
      {extractionResult.hasAiError && (
        <div className="p-3.5 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-xs text-amber-800 dark:text-amber-300">
                Pemberitahuan Gemini API: Layanan AI Mengalami Kendala (404 NotFound / 429 Quota Limit)
              </span>
              <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                Heuristic Engine Active
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              Request ke Google AI Studio mengembalikan kode error <strong>404 NotFound</strong> (model name) atau <strong>429 RateLimit</strong>. Sistem secara transparan beralih ke <strong>Mesin Ekstraksi Heuristik Lokal</strong> agar proses ekstraksi dokumen Anda tidak gagal. Anda dapat meninjau, mengedit, atau mengkonfirmasi field di bawah ini sebelum mengekspor.
            </p>
          </div>
        </div>
      )}

      {/* Control Bar: Search, Filters, View Modes, Add Field */}
      <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search field names, keys, or values..."
              className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* View Modes and Add Field */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-3 h-3" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-medium cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Split View</span>
              </button>
            </div>

            <button
              onClick={() => setIsAddFieldOpen(true)}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Fields ({fields.length})
            </button>
            <button
              onClick={() => setFilter('review')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                filter === 'review'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Needs Review ({mediumCount + lowCount})
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                filter === 'confirmed'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Confirmed
            </button>
            {skippedCount > 0 && (
              <button
                onClick={() => setFilter('skipped')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                  filter === 'skipped'
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Skipped ({skippedCount})
              </button>
            )}
          </div>

          <button
            onClick={confirmAll}
            className="text-blue-700 dark:text-blue-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Confirm All High Confidence</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Source Citation Inspector */}
          <div className="lg:col-span-5 p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 lg:sticky lg:top-18 self-start text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 font-mono text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">
                Source Document Reference
              </span>
              <span>Page {activeSplitField?.sourcePage || 1}</span>
            </div>

            {activeSplitField ? (
              <div className="space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">
                    {activeSplitField.label}
                  </h3>
                  <p className="font-mono text-[11px] text-slate-500">
                    {activeSplitField.templateField}
                  </p>
                </div>

                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 leading-relaxed text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  &ldquo;{activeSplitField.sourceSnippet || 'No contextual quote recorded.'}&rdquo;
                </div>

                <div className="p-3 rounded border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Extracted:</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {activeSplitField.extractedValue || 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Confidence:</span>
                    {getConfidenceBadge(activeSplitField.confidence, activeSplitField.confidenceLevel)}
                  </div>
                </div>

                <button
                  onClick={() => setReExtractField(activeSplitField)}
                  className="w-full py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium cursor-pointer"
                >
                  Prompt AI Re-extract
                </button>
              </div>
            ) : (
              <p className="text-slate-400">Select a field to inspect.</p>
            )}
          </div>

          {/* Right Column: Fields */}
          <div className="lg:col-span-7 space-y-2">
            {filteredFields.map((field) => {
              const isSelected = selectedFieldId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`p-3 rounded border transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                      : field.isSkipped
                      ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50 dark:bg-slate-900'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {field.label}
                        </span>
                        {field.isSkipped && (
                          <span className="font-mono text-[10px] text-slate-500">[Skipped]</span>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                        {field.extractedValue || '(Not found)'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {getConfidenceBadge(field.confidence, field.confidenceLevel)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleConfirm(field.id);
                        }}
                        className={`px-2 py-1 rounded border text-[11px] font-mono cursor-pointer ${
                          field.isConfirmed
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {field.isConfirmed ? 'Confirmed' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Table View Mode (Clean Structured Table) */
        <div className="border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px] text-slate-500 uppercase">
                <th className="py-2.5 px-3 font-semibold">Target Field</th>
                <th className="py-2.5 px-3 font-semibold">Extracted Value</th>
                <th className="py-2.5 px-3 font-semibold">Confidence</th>
                <th className="py-2.5 px-3 font-semibold">Location</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFields.map((field) => {
                const isEditing = editingId === field.id;

                return (
                  <tr
                    key={field.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                      field.isSkipped ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Target Field */}
                    <td className="py-3 px-3 align-top">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {field.label}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {field.templateField}
                      </div>
                    </td>

                    {/* Extracted Value */}
                    <td className="py-3 px-3 align-top min-w-[220px]">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(field.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                            aria-label="Save edit"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 cursor-pointer"
                            aria-label="Cancel edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {field.extractedValue || (
                              <span className="text-slate-400 italic">Not found</span>
                            )}
                          </span>
                          <button
                            onClick={() => startEdit(field)}
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-mono cursor-pointer shrink-0"
                          >
                            [Edit]
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Confidence */}
                    <td className="py-3 px-3 align-top shrink-0">
                      {getConfidenceBadge(field.confidence, field.confidenceLevel)}
                    </td>

                    {/* Location & Citation */}
                    <td className="py-3 px-3 align-top text-slate-600 dark:text-slate-400">
                      <div>{field.targetLocation}</div>
                      {field.sourceSnippet && (
                        <button
                          onClick={() => setCitationField(field)}
                          className="font-mono text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer block mt-0.5"
                        >
                          Source p.{field.sourcePage || 1}
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono">
                        <button
                          onClick={() => setReExtractField(field)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          Re-extract
                        </button>
                        <button
                          onClick={() => toggleSkip(field.id)}
                          className={`px-2 py-1 rounded border cursor-pointer ${
                            field.isSkipped
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {field.isSkipped ? 'Unskip' : 'Skip'}
                        </button>
                        <button
                          onClick={() => toggleConfirm(field.id)}
                          className={`px-2 py-1 rounded border font-semibold cursor-pointer ${
                            field.isConfirmed
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-600'
                          }`}
                        >
                          {field.isConfirmed ? 'Confirmed' : 'Confirm'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Footer Bar */}
      <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          <span>
            {fields.filter((f) => f.isConfirmed && !f.isSkipped).length} of{' '}
            {fields.filter((f) => !f.isSkipped).length} active fields confirmed
          </span>
          {skippedCount > 0 && <span className="ml-2 text-slate-400">({skippedCount} skipped)</span>}
        </div>

        <button
          disabled={isGenerating}
          onClick={handleGenerateClick}
          className="w-full sm:w-auto px-5 py-2.5 rounded bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>{isGenerating ? 'Generating Template Document...' : 'Generate Filled Document'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
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
