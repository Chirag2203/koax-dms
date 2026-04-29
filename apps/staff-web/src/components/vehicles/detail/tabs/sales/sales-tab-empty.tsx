'use client';

/**
 * SalesTabEmpty — empty state for the sales tab when no events exist.
 * Spec reference: PLAN-VEHICLES-003 P2 §8
 * LoC budget: ≤60
 */

export function SalesTabEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm font-medium text-ink-secondary">No sales activity</p>
      <p className="text-xs text-ink-muted mt-1">
        No sales events recorded for this VIN yet.
      </p>
    </div>
  );
}
