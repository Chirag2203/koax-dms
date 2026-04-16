import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

// ─── Variants ─────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full',
  {
    variants: {
      variant: {
        /** Default: accent background with white text */
        default: 'bg-accent text-white',
        /** CPO certified badge: success (forest green) */
        certified: 'bg-success text-white',
        /** Outline only — no fill */
        outline: 'border border-line-strong text-ink-secondary bg-transparent',
        /** Monospace label style — muted, uppercase, wide tracking */
        mono: 'font-mono uppercase tracking-widest text-ink-muted bg-bg-subtle',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

// ─── Component ────────────────────────────────────────────────────────────────

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
