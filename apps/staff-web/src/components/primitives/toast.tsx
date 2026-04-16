'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Toast, ToastVariant } from '@/src/hooks/use-toast';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOUR: Record<ToastVariant, string> = {
  success: 'text-[rgb(var(--state-listed))]',
  error: 'text-state-danger',
  warning: 'text-[rgb(var(--state-stale))]',
  info: 'text-accent',
};

// ─── Single toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICONS[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-line-strong',
        'bg-bg-surface px-4 py-3 shadow-xl min-w-[280px] max-w-[380px]',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0 mt-0.5', COLOUR[toast.variant])}
        aria-hidden="true"
      />
      <p className="flex-1 text-[13px] text-ink-primary leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

// ─── Toast container ──────────────────────────────────────────────────────────

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-2"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
