'use client';

import React from 'react';
import { Mail, ArrowLeft, ShieldCheck, Gauge } from 'lucide-react';
import { ACCOUNT_REQUEST_EMAIL, FREE_DAILY_LIMIT } from '../lib/tier';

interface AccountRequestViewProps {
  onBack: () => void;
  onOpenLogin: () => void;
  retryAfterSeconds?: number;
}

export const AccountRequestView: React.FC<AccountRequestViewProps> = ({
  onBack,
  onOpenLogin,
  retryAfterSeconds,
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-8 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to upload</span>
        </button>
      </div>

      <div className="rounded border border-amber-800/70 bg-amber-950/30 p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2.5">
          <Gauge className="w-5 h-5 text-amber-400 shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
            Free Daily Limit Reached
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          The free tier is capped at <strong>{FREE_DAILY_LIMIT} extraction jobs per day</strong> to
          keep the shared Gemini free quota available for everyone.
          {retryAfterSeconds
            ? ` You can try again in about ${Math.ceil(retryAfterSeconds / 60)} minute(s).`
            : ' Your limit resets at the start of the next day (server time).'}
        </p>
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          <h3 className="text-sm sm:text-base font-semibold text-slate-100">
            Request an Account
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          The account tier runs on DeepSeek instead of Google Gemini, has a much higher daily limit,
          and keeps your documents off Google entirely. Accounts are granted by personal request — send
          an email and the owner will reply with the shared credentials.
        </p>

        <div className="p-4 rounded border border-slate-800 bg-slate-950 space-y-2">
          <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-500">
            Contact
          </span>
          <a
            href={`mailto:${ACCOUNT_REQUEST_EMAIL}?subject=TemplaFill%20account%20request`}
            className="inline-flex items-center gap-2 text-sm font-mono text-blue-400 hover:underline break-all"
          >
            <Mail className="w-4 h-4 shrink-0" />
            {ACCOUNT_REQUEST_EMAIL}
          </a>
          <p className="text-[11px] text-slate-500">
            Include your name/organization and intended use. There is no self-registration.
          </p>
        </div>

        <button
          onClick={onOpenLogin}
          className="w-full sm:w-auto px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white font-medium text-sm transition-colors cursor-pointer"
        >
          I already have credentials — Sign In
        </button>
      </div>
    </div>
  );
};
