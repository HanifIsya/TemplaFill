'use client';

import React from 'react';
import { X } from 'lucide-react';
import { ToastMessage } from '../lib/types';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let tag = 'INFO';
        let badgeColor = 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';

        if (toast.type === 'success') {
          tag = 'SUCCESS';
          badgeColor = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        } else if (toast.type === 'warning') {
          tag = 'WARNING';
          badgeColor = 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
        } else if (toast.type === 'error') {
          tag = 'ERROR';
          badgeColor = 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
        }

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-2.5 p-3 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md text-xs"
          >
            <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border uppercase shrink-0 ${badgeColor}`}>
              {tag}
            </span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                {toast.title}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
