'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** id of the element that labels the dialog (for `aria-labelledby`). */
  labelledBy?: string;
  /** Optional id applied to the dialog element (for `aria-describedby` targets). */
  id?: string;
  /** Tailwind max-width class for the panel, e.g. `max-w-lg`. */
  maxWidthClass?: string;
  /** Extra classes appended to the panel. */
  panelClassName?: string;
  /** Element focused on open. Defaults to the first focusable child. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  /** When false, the panel does not scroll itself; children manage their own scroll regions. */
  scrollPanel?: boolean;
  children: React.ReactNode;
}

/**
 * Accessible modal primitive: portal, dialog semantics, Escape-to-close,
 * focus trap, focus restore on close, and body scroll lock. Replaces the
 * repeated overlay markup previously duplicated across every modal.
 */
export function Modal({
  isOpen,
  onClose,
  labelledBy,
  id,
  maxWidthClass = 'max-w-lg',
  panelClassName = '',
  initialFocusRef,
  scrollPanel = true,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  // Focus management + body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const target =
        initialFocusRef?.current ?? getFocusable()[0] ?? panelRef.current ?? null;
      target?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen, initialFocusRef, getFocusable]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose, getFocusable]
  );

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`w-full ${maxWidthClass} ${
          scrollPanel ? 'max-h-[92vh] overflow-y-auto sm:max-h-[90vh]' : 'max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden'
        } rounded-lg border border-slate-800 bg-slate-900 shadow-2xl outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
