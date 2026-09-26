'use client';

import React, { useRef, useState } from 'react';
import { Lock, User, AlertCircle, X } from 'lucide-react';
import { api } from '../lib/api';
import { ACCOUNT_REQUEST_EMAIL } from '../lib/tier';
import { Modal } from './Modal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.login(username, password);
      setUsername('');
      setPassword('');
      setIsSubmitting(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      labelledBy="login-modal-title"
      maxWidthClass="max-w-md"
      initialFocusRef={usernameRef}
    >
      <div className="flex items-start justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h2 id="login-modal-title" className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Account Login
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Enter the shared account credentials to use the DeepSeek engine.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-100 cursor-pointer focus-ring"
          aria-label="Close login dialog"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-username" className="block text-xs font-mono text-slate-300">
            Username
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="login-username"
              ref={usernameRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 rounded border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-600 focus-ring"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-xs font-mono text-slate-300">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 rounded border border-slate-700 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-600 focus-ring"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 p-2.5 rounded border border-rose-800 bg-rose-950/50 text-rose-200 text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 focus-ring"
        >
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-800 pt-3">
          No self-registration. To request the shared account, email{' '}
          <a
            href={`mailto:${ACCOUNT_REQUEST_EMAIL}`}
            className="text-blue-400 hover:underline break-all"
          >
            {ACCOUNT_REQUEST_EMAIL}
          </a>
          .
        </p>
      </form>
    </Modal>
  );
};
