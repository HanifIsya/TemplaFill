'use client';

import React from 'react';
import { Tier } from '../lib/types';

interface FooterProps {
  onOpenHelp?: () => void;
  tier?: Tier;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHelp, tier = 'free' }) => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300">TemplaFill</span>
          <span>|</span>
          <span>Extract. Map. Fill.</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Zero Persistent Storage (24h Auto-Purge)</span>
          {onOpenHelp && (
            <>
              <span>|</span>
              <button
                type="button"
                onClick={onOpenHelp}
                className="hover:text-indigo-400 underline cursor-pointer focus-ring"
              >
                User Guide
              </button>
            </>
          )}
        </div>

        <div>
          <span>
            {tier === 'pro'
              ? 'Account tier: DeepSeek + PyMuPDF'
              : 'Free tier: Google Gemini 3.6 Flash + PyMuPDF'}
          </span>
        </div>
      </div>
    </footer>
  );
};
