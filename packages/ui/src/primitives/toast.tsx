'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

// ─── Variants ─────────────────────────────────────────────────────────────────

const toastVariants = cva(
  [
    'relative flex items-start gap-3 w-full max-w-sm',
    'rounded-lg border px-4 py-3 shadow-lg',
    'text-sm font-sans',
    'animate-in slide-in-from-bottom-2 fade-in duration-[240ms]',
  ],
  {
    variants: {
      variant: {
        success: 'bg-bg-elevated border-success/30 text-ink-primary',
        error: 'bg-bg-elevated border-danger/30 text-ink-primary',
        info: 'bg-bg-elevated border-accent/30 text-ink-primary',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

const toastIconClass: Record<NonNullable<ToastVariant>, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = VariantProps<typeof toastVariants>['variant'];

export interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
}

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  message: string;
  onDismiss?: () => void;
}

// ─── Toast Context ────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (message: string, variant?: ToastVariant) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

// ─── Toast Provider ───────────────────────────────────────────────────────────

export interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      // Auto-dismiss after 5 seconds
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return ctx;
}

// ─── Toast Viewport (fixed bottom-right container) ───────────────────────────

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[1300] flex flex-col gap-2"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'info', message, onDismiss, ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <p
        className={cn(
          'flex-1 text-ink-primary',
          toastIconClass[variant ?? 'info'],
        )}
      >
        {message}
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className={cn(
            'shrink-0 rounded-sm text-ink-muted',
            'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
            'hover:text-ink-primary transition-colors duration-[120ms]',
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  ),
);
Toast.displayName = 'Toast';

export { Toast, toastVariants };
