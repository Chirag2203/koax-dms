import * as React from 'react';
import { cn } from '../lib/cn';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

// ─── Component ────────────────────────────────────────────────────────────────

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('bg-bg-subtle animate-pulse rounded-md', className)}
      aria-hidden="true"
      {...props}
    />
  ),
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
