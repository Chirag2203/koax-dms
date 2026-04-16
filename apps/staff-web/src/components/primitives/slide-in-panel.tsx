'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlideInPanelProps {
  open: boolean;
  onClose: () => void;
  width?: '40%' | '50%' | '60%';
  title?: string;
  children: React.ReactNode;
}

// ─── Width map ────────────────────────────────────────────────────────────────

const WIDTH_CLASS: Record<NonNullable<SlideInPanelProps['width']>, string> = {
  '40%': 'w-[40%]',
  '50%': 'w-[50%]',
  '60%': 'w-[60%]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SlideInPanel({
  open,
  onClose,
  width = '40%',
  title,
  children,
}: SlideInPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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

  // ESC to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap — move focus to panel when it opens
  useEffect(() => {
    if (open && panelRef.current) {
      const focusable = panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Panel'}
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex flex-col',
              'bg-bg-canvas border-l border-line shadow-2xl',
              WIDTH_CLASS[width],
              'min-w-[320px]',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between border-b border-line px-6 py-4 shrink-0">
                <h2 className="text-base font-semibold text-ink-primary">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close panel"
                  className={cn(
                    'rounded p-1.5 text-ink-muted hover:text-ink-primary hover:bg-bg-subtle',
                    'transition-colors focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  )}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
