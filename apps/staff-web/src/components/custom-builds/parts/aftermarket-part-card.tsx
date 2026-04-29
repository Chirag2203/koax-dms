/**
 * AftermarketPartCard — grid tile for a single aftermarket part.
 *
 * bnCost is masked for roles below R10 (blur treatment).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §7
 */

'use client';

import { cn } from '@dms/ui';
import type { CustomBuildPart } from '@dms/types';
import { formatINR } from '../shared/format-inr';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';

interface AftermarketPartCardProps {
  part: CustomBuildPart;
  onClick?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  aero: 'bg-[rgb(var(--state-cpo)/0.1)] text-[rgb(var(--state-cpo))]',
  wheels: 'bg-[rgb(var(--state-reserved)/0.1)] text-[rgb(var(--state-reserved))]',
  suspension: 'bg-[rgb(var(--state-in-refurb)/0.1)] text-[rgb(var(--state-in-refurb))]',
  exhaust: 'bg-[rgb(var(--state-overdue)/0.1)] text-[rgb(var(--state-overdue))]',
  paint: 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]',
  interior: 'bg-[rgb(var(--state-pending)/0.1)] text-[rgb(var(--state-pending))]',
  ecu: 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
  lighting: 'bg-[rgb(var(--state-draft)/0.1)] text-[rgb(var(--state-draft))]',
};

export function AftermarketPartCard({ part, onClick }: AftermarketPartCardProps) {
  const { user } = useStaffAuth();
  const canSeeCost = user && hasRank(user.role, 'R10');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left w-full rounded-lg border border-line bg-bg-surface p-4 space-y-3',
        'hover:border-accent/40 transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
      )}
      aria-label={`${part.name} by ${part.brand}`}
    >
      {/* Category + brand */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'px-2 py-0.5 rounded font-mono text-[10px] uppercase tracking-widest',
            CATEGORY_COLORS[part.category] ?? 'bg-bg-subtle text-ink-muted',
          )}
        >
          {part.category}
        </span>
        <span className="text-[11px] text-ink-muted truncate">{part.brand}</span>
      </div>

      {/* Name */}
      <p className="text-[14px] font-medium text-ink-primary leading-snug line-clamp-2">
        {part.name}
      </p>

      {/* SKU */}
      <p className="font-mono text-[10px] text-ink-muted">{part.sku}</p>

      {/* Pricing */}
      <div className="flex items-end justify-between gap-2 pt-1 border-t border-line">
        <div>
          <p className="text-[10px] text-ink-muted">List price</p>
          <p className="font-mono text-[13px] text-ink-primary tabular-nums mt-0.5">
            {formatINR(part.listPrice)}
          </p>
        </div>
        {canSeeCost ? (
          <div className="text-right">
            <p className="text-[10px] text-ink-muted">BN cost</p>
            <p className="font-mono text-[12px] text-ink-secondary tabular-nums mt-0.5">
              {formatINR(part.bnCost)}
            </p>
          </div>
        ) : (
          <div className="text-right">
            <p className="text-[10px] text-ink-muted">BN cost</p>
            <p className="font-mono text-[12px] text-ink-secondary blur-sm select-none mt-0.5">
              ₹••,•••
            </p>
          </div>
        )}
      </div>

      {/* Compatibility + install hours */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
        <span className="truncate">
          {part.compatibility.makes.slice(0, 3).join(', ')}
          {part.compatibility.makes.length > 3 && ` +${part.compatibility.makes.length - 3}`}
        </span>
        <span className="shrink-0">{part.installHours}h install</span>
      </div>
    </button>
  );
}
