/**
 * Button — canonical button primitive per SPEC-ARCH-UI-001 §4.
 *
 * Variants:
 *   - primary  — solid accent (Approve, Save, Submit)
 *   - secondary — outlined (View, Cancel, Edit-default)
 *   - ghost    — text-only, hover-bg (table-row inline actions, dropdowns)
 *   - danger   — solid red (destructive Delete / Disconnect / Anonymize)
 *   - link     — text + underline (View detail link in tables)
 *
 * Sizes:
 *   - sm  — h-8 px-3 text-xs (table row inline, compact toolbar)
 *   - md  — h-9 px-4 text-sm (default for forms + page actions)
 *   - lg  — h-10 px-5 text-sm (primary page CTA on hubs)
 *
 * RBAC: wrap with `Gate` primitive (do not pass an `r` prop here).
 *
 * Accessibility: all variants include focus-visible ring, disabled state,
 * proper button semantics. Icons (lucide-react) accept via children + a
 * leading- or trailing- icon slot is achieved by simply placing the icon
 * before/after the label inside the button (use `gap-2`).
 *
 * Source-of-truth contract — DO NOT redefine this in any module file.
 * The `ui-canon-drift.test.ts` test will eventually grep for ad-hoc button
 * className patterns and fail builds that don't use this primitive.
 */

'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render an icon before the label (e.g., `<Plus className="h-4 w-4" />`). */
  leadingIcon?: ReactNode;
  /** Render an icon after the label. */
  trailingIcon?: ReactNode;
  /** Stretch to full container width. */
  fullWidth?: boolean;
}

// ─── Variant token map ────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white border border-accent hover:bg-accent/90 disabled:bg-accent/40 disabled:border-accent/40 disabled:cursor-not-allowed',
  secondary:
    'bg-bg-surface text-ink-primary border border-line hover:bg-bg-subtle hover:text-ink-primary disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-ink-secondary border border-transparent hover:bg-bg-subtle hover:text-ink-primary disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'bg-state-danger text-white border border-state-danger hover:bg-state-danger/90 disabled:opacity-50 disabled:cursor-not-allowed',
  link:
    'bg-transparent text-accent border border-transparent underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed px-0 h-auto',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-sm gap-2',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas';

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    leadingIcon,
    trailingIcon,
    fullWidth = false,
    className = '',
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  // `link` variant ignores size (it's text-only); fall back to inline sizing.
  const sizeClass = variant === 'link' ? '' : SIZE_CLASSES[size];
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      className={[
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        sizeClass,
        widthClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leadingIcon && <span className="flex-shrink-0">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="flex-shrink-0">{trailingIcon}</span>}
    </button>
  );
});
