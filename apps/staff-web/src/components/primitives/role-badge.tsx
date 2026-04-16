import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoleBadgeProps {
  roleCode: string;
  roleName?: string;
  size?: 'sm' | 'md';
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoleBadge({ roleCode, roleName, size = 'md', className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-bg-subtle px-2 py-0.5',
        'border border-line',
        className,
      )}
    >
      <span
        className={cn(
          'font-mono font-semibold text-ink-primary',
          size === 'sm' ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        {roleCode}
      </span>
      {roleName && (
        <>
          <span
            className={cn(
              'text-ink-muted select-none',
              size === 'sm' ? 'text-[10px]' : 'text-[11px]',
            )}
            aria-hidden="true"
          >
            &middot;
          </span>
          <span
            className={cn(
              'text-ink-muted',
              size === 'sm' ? 'text-[10px]' : 'text-xs',
            )}
          >
            {roleName}
          </span>
        </>
      )}
    </span>
  );
}
