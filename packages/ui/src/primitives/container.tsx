import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

// ─── Variants ─────────────────────────────────────────────────────────────────

const containerVariants = cva(
  // Gutter padding — px-6 → md:px-12 → lg:px-24
  'mx-auto w-full px-6 md:px-12 lg:px-24',
  {
    variants: {
      variant: {
        /** Standard page container — 7xl max width */
        full: 'max-w-7xl',
        /** Editorial long-form reading width */
        editorial: 'max-w-[720px]',
        /** Wide layout — hero sections, full-bleed grids */
        wide: 'max-w-[1280px]',
      },
    },
    defaultVariants: {
      variant: 'full',
    },
  },
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

// ─── Component ────────────────────────────────────────────────────────────────

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(containerVariants({ variant }), className)}
      {...props}
    />
  ),
);

Container.displayName = 'Container';

export { Container, containerVariants };
