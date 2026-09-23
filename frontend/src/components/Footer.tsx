'use client';

import React from 'react';
import { ShieldCheck, Cpu, GitBranch } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">TemplaFill</span>
          <span>•</span>
          <span>AI-Powered Document Extraction & Template Filling</span>
        </div>

        {/* Center: Privacy Notice */}
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Zero Persistent Data Retention (Documents auto-cleared in 24h)</span>
        </div>

        {/* Right: Architecture & Tech */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gemini 2.0 Flash + FastAPI</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <GitBranch className="w-3.5 h-3.5 text-cyan-500" />
            <span>Multi-Agent Architecture</span>
          </span>
        </div>
      </div>
    </footer>
  );
};
