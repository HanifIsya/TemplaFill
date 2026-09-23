'use client';

import React from 'react';
import { X, History, FileText, Download, Clock, Trash2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl glass-panel shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Recent Extraction Sessions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saved locally on your browser (auto-clears per privacy retention policy)
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

        {/* List of Sessions */}
        {sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p>No recent sessions found.</p>
            <p className="text-[11px] text-slate-400">
              Completed extractions and generated documents will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
            {sessions.map((s) => (
              <div
                key={s.sessionId}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>{s.downloadFilename}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Source: <span className="font-medium">{s.sourceFilename}</span> •{' '}
                    <span>{s.fieldCount} fields mapped</span> •{' '}
                    <span>{new Date(s.date).toLocaleDateString()}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDownloadSessionFile(s)}
                    className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
          {sessions.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
