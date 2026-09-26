'use client';

import React from 'react';
import { Info, Gauge, Sparkles, ShieldCheck } from 'lucide-react';
import { Tier } from '../lib/types';
import { ACCOUNT_REQUEST_EMAIL, FREE_DAILY_LIMIT } from '../lib/tier';

interface TierDisclosureProps {
  tier: Tier;
  remaining?: number;
  freeLimit?: number;
  onRequestAccount?: () => void;
  onOpenLogin?: () => void;
}

export const TierDisclosure: React.FC<TierDisclosureProps> = ({
  tier,
  remaining,
  freeLimit = FREE_DAILY_LIMIT,
  onRequestAccount,
  onOpenLogin,
}) => {
  if (tier === 'pro') {
    return (
      <div className="p-3 rounded border border-blue-900/60 bg-blue-950/30 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span className="text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Account tier active.</strong> Processing runs on
            DeepSeek — your documents are not sent to Google on this tier.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded border border-amber-900/60 bg-amber-950/20 text-xs flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="text-slate-300 leading-relaxed">
            <strong className="text-slate-100">Free tier — powered by Google Gemini free API.</strong>{' '}
            Prompts may be used by Google to improve its services, and the free quota can be
            rate-limited.
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <Gauge className="w-3 h-3" />
            {typeof remaining === 'number'
              ? `${remaining} of ${freeLimit} free jobs remaining today`
              : `Limited to ${freeLimit} jobs/day per network`}
          </span>
        </div>
      </div>
      {onRequestAccount && (
        <button
          onClick={onRequestAccount}
          className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-800 bg-blue-950/50 text-blue-300 hover:bg-blue-900/60 font-mono text-[11px] cursor-pointer"
          title={`Request an account: ${ACCOUNT_REQUEST_EMAIL}`}
        >
          <Sparkles className="w-3 h-3" />
          Request an account
        </button>
      )}
      {onOpenLogin && (
        <button
          onClick={onOpenLogin}
          className="shrink-0 px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 font-mono text-[11px] cursor-pointer"
        >
          Sign in
        </button>
      )}
    </div>
  );
};
