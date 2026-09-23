'use client';

import React from 'react';
import { Sun, Moon, History } from 'lucide-react';
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
    { key: 'upload', label: 'Upload', num: 1 },
    { key: 'processing', label: 'Extraction', num: 2 },
    { key: 'review', label: 'Review Fields', num: 3 },
    { key: 'download', label: 'Export', num: 4 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => onNavigateStep?.('landing')}
        >
          <div className="w-7 h-7 rounded bg-blue-700 dark:bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs">
            TF
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
              TemplaFill
            </span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              v0.1.0
            </span>
          </div>
        </div>

        {/* Structured Workflow Steps Bar */}
        {currentStep !== 'landing' && (
          <nav aria-label="Workflow progress" className="hidden md:flex items-center gap-2">
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
                      className={`w-3 h-px ${
                        isPast ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        : isPast
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    <span className="font-mono">{s.num}.</span>
                    <span>{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Backend Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBackendLive ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-amber-600 dark:bg-amber-400'
              }`}
            />
            <span>{isBackendLive ? 'API LIVE' : 'DEV SIMULATION'}</span>
          </div>

          {/* History Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              aria-label="Recent Sessions"
              title="Recent Sessions"
              className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <History className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/HanifIsya/TemplaFill"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
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
