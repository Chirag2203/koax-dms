/**
 * GrnDiscrepancyCard — sidebar card showing discrepancy notes.
 *
 * Only rendered when grn.threeWayMatchStatus === 'DISCREPANCY'.
 * Spec reference: PLAN-PARTS-006 §5.3
 */

import type { Grn } from '@dms/types';
import { getShortReceiptCount, getDamagedLineCount } from './grn-detail-helpers';

export interface GrnDiscrepancyCardProps {
  grn: Grn;
}

export function GrnDiscrepancyCard({ grn }: GrnDiscrepancyCardProps) {
  if (grn.threeWayMatchStatus !== 'DISCREPANCY') return null;

  const shortCount = getShortReceiptCount(grn);
  const damagedCount = getDamagedLineCount(grn);

  return (
    <div className="rounded-md border border-[rgb(var(--state-overdue)/0.4)] bg-[rgb(var(--state-overdue)/0.06)] p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-[rgb(var(--state-overdue))] mb-3">
        Discrepancy
      </h3>
      <div className="flex flex-col gap-2">
        {shortCount > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-ink-secondary">Short receipt lines</span>
            <span className="font-mono text-[12px] font-semibold text-[rgb(var(--state-overdue))]">
              {shortCount}
            </span>
          </div>
        )}
        {damagedCount > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-ink-secondary">Damaged / wrong lines</span>
            <span className="font-mono text-[12px] font-semibold text-[rgb(var(--state-danger))]">
              {damagedCount}
            </span>
          </div>
        )}
        {grn.discrepancyNotes && (
          <div className="mt-2 pt-2 border-t border-[rgb(var(--state-overdue)/0.2)]">
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted block mb-1">
              Notes
            </span>
            <p className="text-[12px] text-ink-secondary italic">
              &quot;{grn.discrepancyNotes}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
