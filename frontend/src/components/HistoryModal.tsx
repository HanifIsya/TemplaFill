'use client';

import React from 'react';
import { X, Download, Trash2 } from 'lucide-react';
import { RecentSession } from '../lib/types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: RecentSession[];
  onClearHistory: () => void;
  onDownloadSessionFile: (session: RecentSession) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onClearHistory,
  onDownloadSessionFile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <div className="w-full max-w-2xl rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Recent Extraction Sessions
            </h3>
            <p className="font-mono text-[11px] text-slate-500 mt-0.5">
              Saved in browser local storage. Auto-purged per 24-hour privacy policy.
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
                className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {s.downloadFilename}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    Source: {s.sourceFilename} | {s.fieldCount} fields | {new Date(s.date).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => onDownloadSessionFile(s)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          {sessions.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-mono text-[11px] cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
