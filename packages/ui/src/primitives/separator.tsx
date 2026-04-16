import * as React from 'react';
import { cn } from '../lib/cn';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  /** "horizontal" renders a full-width hairline; "vertical" renders a 1px tall block */
  orientation?: 'horizontal' | 'vertical';
  /** Accessible label for screen readers (optional) */
  decorative?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref,
  ) => (
    <hr
      ref={ref}
      role={decorative ? 'presentation' : 'separator'}
      aria-orientation={!decorative ? orientation : undefined}
      className={cn(
        'border-0 bg-line shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...props}
    />
  ),
);

Separator.displayName = 'Separator';

export { Separator };
