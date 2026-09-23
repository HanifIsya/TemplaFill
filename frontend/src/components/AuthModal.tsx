'use client';

import React, { useState } from 'react';
import { UserAccount } from '@/lib/types';
import { api } from '@/lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserAccount) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (tab === 'register' && !name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const auth = await api.login(email, password);
        onAuthSuccess(auth.user);
        onClose();
      } else {
        const auth = await api.register(name, email, password);
        onAuthSuccess(auth.user);
        onClose();
      }
    } catch {
      setError('Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAnonymous = () => {
    const anon = api.getAnonymousUser();
    onAuthSuccess(anon);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div>
            <h2 id="auth-modal-title" className="text-base font-semibold text-slate-100 uppercase tracking-wider font-mono">
              {tab === 'login' ? 'Account Sign In' : 'Register New Account'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Access your saved sessions, custom mappings, and template presets
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg font-mono p-1"
            aria-label="Close dialog"
          >
            [X]
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-medium tracking-wide uppercase transition-colors ${
              tab === 'login'
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-mono font-medium tracking-wide uppercase transition-colors ${
              tab === 'register'
                ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono rounded">
              ERROR: {error}
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 text-sm rounded focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@organization.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 text-sm rounded focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 text-slate-100 text-sm rounded focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-wider font-semibold rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In to Workspace' : 'Complete Registration'}
            </button>
          </div>

          {/* Anonymous usage alternative */}
          <div className="pt-3 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              No account required for quick extractions.
            </p>
            <button
              type="button"
              onClick={handleContinueAnonymous}
              className="text-xs text-slate-300 hover:text-white font-mono underline"
            >
              Continue as Anonymous Guest (3 free fills/day)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
