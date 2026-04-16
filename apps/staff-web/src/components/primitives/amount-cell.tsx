import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AmountCellProps {
  amount: number;
  currency?: 'INR';
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─── Formatter ────────────────────────────────────────────────────────────────

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export function AmountCell({
  amount,
  currency = 'INR',
  align = 'right',
  size = 'md',
  className,
}: AmountCellProps) {
  const formatted = currency === 'INR' ? INR_FORMATTER.format(amount) : String(amount);

  return (
    <span
      className={cn(
        'font-mono tabular-nums text-ink-primary',
        align === 'right' ? 'text-right block' : 'text-left',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-base',
        className,
      )}
    >
      {formatted}
    </span>
  );
}
