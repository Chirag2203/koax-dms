/**
 * OutletScopeToggle — multi-select outlet pills.
 *
 * L16: Visible only to R19+. Wrapped in Gate.
 * §9.5: Minimum 1 outlet must remain selected (cannot deselect all).
 * Outlets: BLR-01 | MUM-01 | CHE-01 + "All Outlets" shortcut.
 *
 * Spec reference: SPEC-REPORTS-001 §9.5 (L16)
 */

'use client';

import { useTranslations } from 'next-intl';
import { Gate } from '@/src/components/primitives/gate';
import type { ReportScope } from '@/src/lib/reports/types';

const OUTLETS = [
  { id: 'BLR-01', label: 'BLR' },
  { id: 'MUM-01', label: 'MUM' },
  { id: 'CHE-01', label: 'CHE' },
] as const;

const ALL_OUTLET_IDS = OUTLETS.map((o) => o.id);

interface OutletScopeToggleProps {
  scope:         ReportScope;
  onScopeChange: (scope: ReportScope) => void;
}

export function OutletScopeToggle({ scope, onScopeChange }: OutletScopeToggleProps) {
  const t = useTranslations('reports.scope');

  const isAllSelected = ALL_OUTLET_IDS.every((id) => scope.outletIds.includes(id));

  function toggleOutlet(outletId: string) {
    const current = scope.outletIds;

    if (current.includes(outletId)) {
      // L16: prevent deselecting last outlet
      if (current.length === 1) return;
      onScopeChange({ outletIds: current.filter((id) => id !== outletId) });
    } else {
      onScopeChange({ outletIds: [...current, outletId] });
    }
  }

  function toggleAll() {
    if (isAllSelected) {
      // Keep at least one — default to BLR
      onScopeChange({ outletIds: ['BLR-01'] });
    } else {
      onScopeChange({ outletIds: [...ALL_OUTLET_IDS] });
    }
  }

  const pillBase  = 'inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 cursor-pointer';
  const pillOn    = `${pillBase} bg-accent/10 border-accent text-accent`;
  const pillOff   = `${pillBase} border-line text-ink-secondary hover:border-ink-secondary`;

  return (
    // L16: Gate — visible only to R19+
    <Gate role={['R19', 'R22', 'R24']} fallback="hide">
      <div
        role="group"
        aria-label={t('label')}
        className="flex items-center gap-2 flex-wrap"
      >
        <span className="text-xs text-ink-muted uppercase tracking-wider shrink-0">
          {t('label')}:
        </span>

        {OUTLETS.map((outlet) => {
          const selected = scope.outletIds.includes(outlet.id);
          return (
            <button
              key={outlet.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`${outlet.label} outlet`}
              onClick={() => toggleOutlet(outlet.id)}
              className={selected ? pillOn : pillOff}
            >
              {outlet.label}
            </button>
          );
        })}

        {/* All Outlets shortcut */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isAllSelected}
          aria-label={t('allOutlets')}
          onClick={toggleAll}
          className={isAllSelected ? pillOn : pillOff}
        >
          {t('allOutlets')}
        </button>
      </div>
    </Gate>
  );
}
