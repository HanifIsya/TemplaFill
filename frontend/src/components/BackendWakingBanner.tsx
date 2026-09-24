'use client';

import React from 'react';
import { getApiBaseUrl } from '@/lib/api';

interface BackendWakingBannerProps {
  status: 'checking' | 'waking' | 'live' | 'offline' | 'mock';
  retryCount: number;
  onRetry: () => void;
}

export function BackendWakingBanner({ status, retryCount, onRetry }: BackendWakingBannerProps) {
  if (status === 'live' || status === 'mock') return null;

  const isWaking = status === 'waking';
  const isChecking = status === 'checking';

  return (
    <div
      className={`w-full border-b px-4 py-3 flex items-center justify-center gap-3 text-xs font-mono ${
        isWaking
          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
          : isChecking
          ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-2">
        {isWaking || isChecking ? (
          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
        )}
        <strong className="uppercase tracking-wider">
          {isWaking
            ? 'Backend is waking up'
            : isChecking
            ? 'Checking backend'
            : 'Backend offline'}
        </strong>
      </span>

      <span className="hidden sm:inline text-slate-500 dark:text-slate-400">—</span>

      <span className="text-center">
        {isWaking ? (
          <>
            Render Hobby sleeps after 15 min idle. Cold start ~60s. Retrying {retryCount}/12…
            <span className="hidden md:inline"> Your upload will be enabled once live.</span>
          </>
        ) : isChecking ? (
          'Contacting API at ' + getApiBaseUrl()
        ) : (
          'Backend unreachable. Check Render dashboard or try mock mode.'
        )}
      </span>

      {(isWaking || status === 'offline') && (
        <button
          onClick={onRetry}
          className="ml-2 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 text-xs font-mono uppercase tracking-wider hover:bg-slate-800 dark:hover:bg-slate-700 border border-slate-800"
        >
          Retry now
        </button>
      )}
    </div>
  );
}
