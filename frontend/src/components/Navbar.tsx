'use client';

import React from 'react';
import { Sparkles, Sun, Moon, History } from 'lucide-react';
import { WorkflowStep } from '../lib/types';

interface NavbarProps {
  currentStep: WorkflowStep;
  onNavigateStep?: (step: WorkflowStep) => void;
  isBackendLive?: boolean;
  onToggleTheme: () => void;
  isDark: boolean;
  onOpenHistory?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  onNavigateStep,
  isBackendLive = false,
  onToggleTheme,
  isDark,
  onOpenHistory,
}) => {
  const steps: { key: WorkflowStep; label: string; num: number }[] = [
    { key: 'upload', label: 'Upload Files', num: 1 },
    { key: 'processing', label: 'AI Extraction', num: 2 },
    { key: 'review', label: 'Map & Review', num: 3 },
    { key: 'download', label: 'Download', num: 4 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onNavigateStep?.('landing')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
                TemplaFill
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                v0.1
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Extract. Map. Fill.
            </p>
          </div>
        </div>

        {/* Workflow Steps Indicator */}
        {currentStep !== 'landing' && (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-full border border-slate-200/80 dark:border-slate-800">
            {steps.map((s, idx) => {
              const isActive = currentStep === s.key;
              const isPast =
                (currentStep === 'processing' && s.key === 'upload') ||
                (currentStep === 'review' && ['upload', 'processing'].includes(s.key)) ||
                (currentStep === 'download' && ['upload', 'processing', 'review'].includes(s.key));

              return (
                <React.Fragment key={s.key}>
                  {idx > 0 && (
                    <div
                      className={`w-4 h-0.5 ${
                        isPast ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isPast
                        ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : isPast
                          ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.num}
                    </span>
                    <span>{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          {/* Backend Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            {isBackendLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Backend Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Interactive Dev Mode</span>
              </>
            )}
          </div>

          {/* Recent Sessions History */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              aria-label="View Recent Sessions"
              title="Recent Sessions History"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* GitHub Repo */}
          <a
            href="https://github.com/HanifIsya/TemplaFill"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};
