'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FieldMapping } from '../lib/types';

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddField: (newField: FieldMapping) => void;
}

export const AddFieldModal: React.FC<AddFieldModalProps> = ({
  isOpen,
  onClose,
  onAddField,
}) => {
  const [label, setLabel] = useState('');
  const [templateField, setTemplateField] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [extractedValue, setExtractedValue] = useState('');
  const [fieldType, setFieldType] = useState<FieldMapping['fieldType']>('text');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const generatedKey =
      templateField.trim() ||
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const newField: FieldMapping = {
      id: `custom-${Date.now().toString(36)}`,
      label: label.trim(),
      templateField: generatedKey,
      targetLocation: targetLocation.trim() || 'General Document Scope',
      extractedValue: extractedValue.trim(),
      confidence: extractedValue.trim() ? 1.0 : 0.4,
      confidenceLevel: extractedValue.trim() ? 'high' : 'low',
      isEdited: true,
      isConfirmed: Boolean(extractedValue.trim()),
      fieldType,
    };

    onAddField(newField);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-lg rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Add Template Field Mapping
            </h3>
            <p className="font-mono text-[11px] text-slate-500 mt-0.5">
              Define a placeholder or custom extraction mapping
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Field Label *
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Governing Law, Penalty Interest Rate, DPO Email"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Placeholder Key (Optional)
              </label>
              <input
                type="text"
                value={templateField}
                onChange={(e) => setTemplateField(e.target.value)}
                placeholder="e.g., governing_law"
                className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Field Data Type
              </label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as FieldMapping['fieldType'])}
                className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600"
              >
                <option value="text">Text / String</option>
                <option value="date">Date</option>
                <option value="currency">Currency</option>
                <option value="number">Number</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Template Target Location
            </label>
            <input
              type="text"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              placeholder="e.g., Header, Section 14.1, or Sheet 1 Cell C10"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Initial Value (Optional)
            </label>
            <input
              type="text"
              value={extractedValue}
              onChange={(e) => setExtractedValue(e.target.value)}
              placeholder="Enter value if known"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600"
            />
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
              className="px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
