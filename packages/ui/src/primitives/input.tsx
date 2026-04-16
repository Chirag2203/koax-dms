import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

// ─── Input field variants ─────────────────────────────────────────────────────

const inputVariants = cva(
  [
    'w-full bg-bg-elevated text-ink-primary font-sans text-sm',
    'border border-line rounded-md px-3 py-2.5',
    'placeholder:text-ink-subtle',
    'transition-colors duration-[120ms]',
    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ],
  {
    variants: {
      hasError: {
        true: 'border-danger focus:border-danger focus:ring-danger/30',
        false: '',
      },
    },
    defaultVariants: {
      hasError: false,
    },
  },
);

// ─── Newsletter inline variant wrapper ────────────────────────────────────────

const newsletterWrapperClass = [
  'flex items-stretch overflow-hidden',
  'rounded-full border border-line',
  'focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30',
  'transition-colors duration-[120ms]',
].join(' ');

const newsletterInputClass = [
  'flex-1 bg-bg-elevated text-ink-primary font-sans text-sm',
  'px-5 py-3 border-0 outline-none placeholder:text-ink-subtle',
].join(' ');

// ─── Props ────────────────────────────────────────────────────────────────────

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>,
    VariantProps<typeof inputVariants> {
  /** Input id — required for label association */
  id: string;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  /** "default" renders a standard labeled input; "newsletter" renders inline pill with slot for a button */
  variant?: 'default' | 'newsletter';
  /** Only used in newsletter variant — renders adjacent to the input inside the pill */
  actionSlot?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      variant = 'default',
      hasError: hasErrorProp,
      className,
      actionSlot,
      ...props
    },
    ref,
  ) => {
    const hasError = hasErrorProp ?? Boolean(errorMessage);

    if (variant === 'newsletter') {
      return (
        <div className={newsletterWrapperClass}>
          <input
            ref={ref}
            id={id}
            aria-label={label ?? props['aria-label'] ?? 'Email address'}
            className={cn(newsletterInputClass, className)}
            {...props}
          />
          {actionSlot}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-mono uppercase tracking-widest text-ink-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={
            errorMessage
              ? `${id}-error`
              : helperText
                ? `${id}-helper`
                : undefined
          }
          className={cn(inputVariants({ hasError: hasError || false }), className)}
          {...props}
        />
        {errorMessage && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs text-danger font-sans"
          >
            {errorMessage}
          </p>
        )}
        {!errorMessage && helperText && (
          <p id={`${id}-helper`} className="text-xs text-ink-muted font-sans">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input, inputVariants };
