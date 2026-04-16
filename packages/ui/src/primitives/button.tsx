import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ArrowRight } from 'lucide-react';
import { cn } from '../lib/cn';

// ─── Variants ─────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  // Base styles shared across all variants
  [
    'inline-flex items-center justify-center gap-2',
    'font-mono uppercase tracking-widest',
    'transition-all duration-[240ms]',
    'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
    'focus-visible:shadow-[0_0_0_4px_white]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-accent text-white rounded-full',
          'hover:bg-accent-hover',
        ],
        secondary: [
          'border border-line-strong bg-transparent text-ink-primary rounded-full',
          'hover:bg-bg-hover hover:border-ink-muted',
        ],
        ghost: [
          'bg-transparent text-ink-primary border-0',
          'hover:bg-bg-hover',
        ],
        link: [
          'bg-transparent text-ink-primary border-0 underline underline-offset-4 px-0 py-0',
          'hover:text-accent',
        ],
      },
      size: {
        sm: 'px-4 py-2 text-xs',
        md: 'px-8 py-4 text-sm',
        lg: 'px-10 py-5 text-sm',
      },
    },
    compoundVariants: [
      // link variant overrides padding from size — zero it out
      {
        variant: 'link',
        size: 'sm',
        className: 'px-0 py-0',
      },
      {
        variant: 'link',
        size: 'md',
        className: 'px-0 py-0',
      },
      {
        variant: 'link',
        size: 'lg',
        className: 'px-0 py-0',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Append a trailing ArrowRight icon */
  withArrow?: boolean;
  asChild?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, withArrow = false, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
        {withArrow && (
          <ArrowRight
            className="h-[1em] w-[1em] shrink-0"
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
