'use client';

import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
        <div>
          <span className="font-bold text-slate-700 dark:text-slate-300">TemplaFill</span>
          <span className="mx-2">|</span>
          <span>PDF to Template Automation</span>
        </div>

        <div>
          <span>Zero Persistent Storage (24h Auto-Purge)</span>
        </div>

        <div>
          <span>Gemini 2.0 Flash + PyMuPDF</span>
        </div>
      </div>
    </footer>
  );
};
