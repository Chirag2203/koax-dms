/**
 * Outlet scope toggle — SPEC-FINANCE-001 L27
 *
 * L27: R12 sees their own outlet only.
 *      R19+/R22+ can switch to "All outlets".
 *      The picker is hidden for R12 (only their outlet shown).
 *      SPEC-ARCH-UI-001 §RBAC: Gate primitive.
 *      Doc 14 §R12, §R19, §R22.
 */

'use client';

import { Gate } from '@/src/components/primitives';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import type { OutletScope } from '@/src/lib/finance/selectors/margin-reconciliation';

interface OutletScopeToggleProps {
  value: OutletScope;
  onChange: (scope: OutletScope) => void;
  className?: string;
}

const OUTLET_OPTIONS: Array<{ value: OutletScope; label: string }> = [
  { value: 'BLR', label: 'Bangalore' },
  { value: 'MUM', label: 'Mumbai' },
  { value: 'CHE', label: 'Chennai' },
  { value: 'ALL', label: 'All Outlets' },
];

/**
 * Outlet scope picker.
 * L27: R12 only sees their outlet; R19+/R22+ see all options.
 * Doc 14 §R12, §R19, §R22; SPEC-ARCH-UI-001 §Gate.
 */
export function OutletScopeToggle({ value, onChange, className = '' }: OutletScopeToggleProps) {
  const { user } = useStaffAuth();

  // L27: R12 is locked to their own outlet — picker hidden
  // R19+ can see all outlet options
  const isR12Only = user && !['R19', 'R22', 'R24'].some((r) => user.role === r) &&
    !['R20', 'R21', 'R23'].some((r) => user.role === r);

  // For R12, show only their outlet label (no toggle)
  if (isR12Only) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-xs text-ink-muted uppercase tracking-wider">Outlet</span>
        <span className="h-8 px-3 rounded-md text-xs font-medium bg-accent text-white inline-flex items-center">
          {OUTLET_OPTIONS.find((o) => o.value === value)?.label ?? value}
        </span>
      </div>
    );
  }

  return (
    <Gate role={['R19', 'R22', 'R24']} fallback="disable">
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <span className="text-xs text-ink-muted uppercase tracking-wider">Outlet</span>
        {OUTLET_OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={[
                'h-8 px-3 rounded-md text-xs font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active
                  ? 'bg-accent text-white'
                  : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover hover:text-ink-primary border border-line',
              ].join(' ')}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </Gate>
  );
}
