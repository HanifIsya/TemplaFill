'use client';

import React from 'react';

interface FooterProps {
  onOpenHelp?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHelp }) => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">TemplaFill</span>
          <span>|</span>
          <span>PDF to Template Automation</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Zero Persistent Storage (24h Auto-Purge)</span>
          {onOpenHelp && (
            <>
              <span>|</span>
              <button
                onClick={onOpenHelp}
                className="hover:text-indigo-400 underline cursor-pointer"
              >
                User Guide
              </button>
            </>
          )}
        </div>

        <div>
          <span>Gemini 3.7 / 3.8 Flash + PyMuPDF</span>
        </div>
      </div>
    </footer>
  );
};

