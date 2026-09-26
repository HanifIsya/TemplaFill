'use client';

import React, { useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FieldMapping } from '../lib/types';
import { Modal } from './Modal';

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
  const labelRef = useRef<HTMLInputElement>(null);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="addfield-modal-title"
      maxWidthClass="max-w-lg"
      initialFocusRef={labelRef}
    >
      <div className="space-y-4 p-4 text-xs sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 id="addfield-modal-title" className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Add Template Field Mapping
            </h3>
            <p className="font-mono text-[11px] text-slate-500 mt-0.5">
              Define a placeholder or custom extraction mapping
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus-ring"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="addfield-label" className="font-semibold text-slate-700 dark:text-slate-300">
              Field Label *
            </label>
            <input
              id="addfield-label"
              ref={labelRef}
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Governing Law, Penalty Interest Rate, DPO Email"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600 focus-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="addfield-key" className="font-semibold text-slate-700 dark:text-slate-300">
                Placeholder Key (Optional)
              </label>
              <input
                id="addfield-key"
                type="text"
                value={templateField}
                onChange={(e) => setTemplateField(e.target.value)}
                placeholder="e.g., governing_law"
                className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] focus:outline-none focus:border-blue-600 focus-ring"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="addfield-type" className="font-semibold text-slate-700 dark:text-slate-300">
                Field Data Type
              </label>
              <select
                id="addfield-type"
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as FieldMapping['fieldType'])}
                className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600 focus-ring"
              >
                <option value="text">Text / String</option>
                <option value="date">Date</option>
                <option value="currency">Currency</option>
                <option value="number">Number</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="addfield-location" className="font-semibold text-slate-700 dark:text-slate-300">
              Template Target Location
            </label>
            <input
              id="addfield-location"
              type="text"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              placeholder="e.g., Header, Section 14.1, or Sheet 1 Cell C10"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600 focus-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="addfield-value" className="font-semibold text-slate-700 dark:text-slate-300">
              Initial Value (Optional)
            </label>
            <input
              id="addfield-value"
              type="text"
              value={extractedValue}
              onChange={(e) => setExtractedValue(e.target.value)}
              placeholder="Enter value if known"
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-blue-600 focus-ring"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer text-center focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto justify-center px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs focus-ring"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
