'use client';

import React from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { HistoryEntry } from '../lib/types';
import { Modal } from './Modal';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: HistoryEntry[];
  onClearHistory: () => void;
  onDownloadSessionFile: (session: HistoryEntry) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onClearHistory,
  onDownloadSessionFile,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="history-modal-title" maxWidthClass="max-w-2xl">
      <div className="space-y-4 p-4 text-xs sm:p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 id="history-modal-title" className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Recent Extraction Sessions
            </h3>
            <p className="font-mono text-[11px] text-slate-500 mt-0.5">
              Saved in browser local storage (tf_history). Server files auto-purge per 24-hour policy.
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

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-mono text-xs">
            No recent sessions recorded in local storage.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded">
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {s.filledFilename}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500 break-words">
                    Source: {s.sourceDoc.filename} | {s.fieldCount} fields |{' '}
                    {new Date(s.createdAt).toLocaleDateString()} |{' '}
                    {s.tier === 'pro' ? 'Account · DeepSeek' : 'Free · Gemini'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDownloadSessionFile(s)}
                  title="Download the session metadata record (JSON)"
                  className="w-full sm:w-auto justify-center px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1 cursor-pointer shrink-0 focus-ring"
                >
                  <Download className="w-3 h-3" />
                  <span>Metadata</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-mono text-[11px] cursor-pointer focus-ring"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer ml-auto text-center focus-ring"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
