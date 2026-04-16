import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export type OutletCode = 'bangalore' | 'mumbai' | 'chennai' | 'all';

export interface OutletPillProps {
  outlet: OutletCode;
  /** When true, adds an accent ring to signal cross-outlet context */
  crossOutlet?: boolean;
  className?: string;
}

// ─── Outlet abbreviations ─────────────────────────────────────────────────────

const OUTLET_ABBR: Record<OutletCode, string> = {
  bangalore: 'BLR',
  mumbai: 'MUM',
  chennai: 'CHE',
  all: 'ALL',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OutletPill({ outlet, crossOutlet = false, className }: OutletPillProps) {
  const abbr = OUTLET_ABBR[outlet];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5',
        'font-mono text-[11px] uppercase text-ink-secondary bg-bg-subtle',
        crossOutlet && 'ring-1 ring-accent',
        className,
      )}
      title={outlet === 'all' ? 'All Outlets' : outlet.charAt(0).toUpperCase() + outlet.slice(1)}
    >
      {abbr}
    </span>
  );
}
