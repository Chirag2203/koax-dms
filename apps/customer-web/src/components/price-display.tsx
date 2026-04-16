import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceDisplayProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ─── Formatter ────────────────────────────────────────────────────────────────

const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const sizeClasses: Record<NonNullable<PriceDisplayProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-4xl',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceDisplay({
  amount,
  className,
  size = 'md',
}: PriceDisplayProps) {
  return (
    <span
      className={cn(
        'font-mono tabular-nums text-ink-primary',
        sizeClasses[size],
        className,
      )}
    >
      {formatter.format(amount)}
    </span>
  );
}
