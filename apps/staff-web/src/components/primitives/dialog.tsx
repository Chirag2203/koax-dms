'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@dms/ui';

// ─── Size map ─────────────────────────────────────────────────────────────────

const SIZE_MAX: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-[480px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
};

// ─── Focus trap helpers ───────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;
  dirty?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  dirty = false,
}: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmingClose(true);
    } else {
      onClose();
    }
  }, [dirty, onClose]);

  // ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        if (confirmingClose) {
          setConfirmingClose(false);
        } else {
          requestClose();
        }
      }
      if (containerRef.current && open) {
        trapFocus(containerRef.current, e);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, confirmingClose, requestClose]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Initial focus
  useEffect(() => {
    if (open && containerRef.current) {
      const focusable = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
      focusable?.focus();
    }
  }, [open]);

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] },
      };

  const backdropProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.16, ease: 'easeOut' },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="dialog-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            aria-hidden="true"
            onClick={closeOnBackdrop ? requestClose : undefined}
            {...backdropProps}
          />

          {/* Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-hidden="false">
            <motion.div
              key="dialog-modal"
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
              className={cn(
                'bg-bg-surface border border-line-strong rounded-xl shadow-xl w-full',
                SIZE_MAX[size],
                'flex flex-col max-h-[90vh]',
              )}
              {...animProps}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-line flex items-start justify-between shrink-0">
                <div className="min-w-0 pr-4">
                  <h2 id="dialog-title" className="text-base font-semibold text-ink-primary leading-snug">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="Close dialog"
                  className={cn(
                    'shrink-0 rounded-md p-1 text-ink-muted hover:text-ink-primary',
                    'hover:bg-bg-hover transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  )}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-line flex justify-end gap-2 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>

          {/* Dirty-close confirm */}
          {confirmingClose && (
            <AlertDialog
              open={confirmingClose}
              onClose={() => setConfirmingClose(false)}
              title="Discard changes?"
              description="You have unsaved changes. If you close now, they will be lost."
              confirmLabel="Discard"
              cancelLabel="Keep editing"
              destructive
              onConfirm={() => {
                setConfirmingClose(false);
                onClose();
              }}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

// ─── AlertDialog ──────────────────────────────────────────────────────────────

export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  requireTypeToConfirm?: string;
}

export function AlertDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  requireTypeToConfirm,
}: AlertDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [typeInput, setTypeInput] = useState('');

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const canConfirm = !requireTypeToConfirm || typeInput === requireTypeToConfirm;

  // ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
      if (containerRef.current && open) trapFocus(containerRef.current, e);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus initial element
  useEffect(() => {
    if (open && containerRef.current) {
      const focusable = containerRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
      focusable?.focus();
    }
  }, [open]);

  // Reset type input when closed
  useEffect(() => {
    if (!open) setTypeInput('');
  }, [open]);

  const animProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
        transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] },
      };

  const backdropProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.14 },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="alert-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            aria-hidden="true"
            onClick={onClose}
            {...backdropProps}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              key="alert-modal"
              ref={containerRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="alert-title"
              aria-describedby="alert-desc"
              className={cn(
                'bg-bg-surface border border-line-strong rounded-xl shadow-xl w-full max-w-[480px]',
              )}
              {...animProps}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex gap-4 items-start">
                {destructive && (
                  <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-state-danger/10">
                    <AlertTriangle className="h-5 w-5 text-state-danger" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 id="alert-title" className="text-base font-semibold text-ink-primary">
                    {title}
                  </h2>
                  <p id="alert-desc" className="mt-1 text-sm text-ink-secondary">
                    {description}
                  </p>
                </div>
              </div>

              {/* Type-to-confirm input */}
              {requireTypeToConfirm && (
                <div className="px-6 pb-4">
                  <p className="text-xs text-ink-muted mb-2">
                    Type <span className="font-mono font-semibold text-ink-primary">{requireTypeToConfirm}</span> to confirm
                  </p>
                  <input
                    type="text"
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    className={cn(
                      'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                      'text-sm font-mono text-ink-primary',
                      'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                    )}
                    placeholder={requireTypeToConfirm}
                    autoComplete="off"
                  />
                </div>
              )}

              {/* Footer */}
              <div className={cn(
                'px-6 py-4 border-t border-line flex gap-2',
                destructive ? 'flex-row-reverse' : 'justify-end',
              )}>
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'h-9 px-4 rounded-md text-sm font-medium border border-line',
                    'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  )}
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={!canConfirm}
                  className={cn(
                    'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    destructive
                      ? 'bg-state-danger hover:bg-state-danger/90 focus-visible:ring-state-danger disabled:opacity-40 disabled:cursor-not-allowed'
                      : 'bg-accent hover:bg-accent/90 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
