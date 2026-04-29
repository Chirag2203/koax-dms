/**
 * Discrepancy alert chip — SPEC-FINANCE-001 L20
 *
 * L20: If stored gstMargin != recomputed (margin × 18/118) by > ₹1 tolerance,
 *      render an alert chip: "Stored ₹X · Recomputed ₹Y · Diff ₹Z".
 *      R22+ can acknowledge. Acknowledged rows show grey chip.
 *      PLAN-VEHICLES-003 L4; Doc 06 §reconciliation.
 */

'use client';

import { AlertTriangle, Check } from 'lucide-react';
import { formatINR } from '@/src/lib/finance/math/rounding';

interface DiscrepancyAlertProps {
  storedGstPaise: number | null;
  computedGstPaise: number;
  ack: { reason: string; actorId: string; ackedAt: string } | null;
  /** Called when R22+ clicks Acknowledge. Only rendered if provided. */
  onAcknowledge?: () => void;
}

/**
 * Amber chip for detected discrepancy; grey chip when acknowledged.
 * L20: PLAN-VEHICLES-003 L4; Doc 06 §reconciliation.
 */
export function DiscrepancyAlert({
  storedGstPaise,
  computedGstPaise,
  ack,
  onAcknowledge,
}: DiscrepancyAlertProps) {
  if (storedGstPaise === null) return null;

  const diff = computedGstPaise - storedGstPaise;
  const absDiff = Math.abs(diff);

  if (absDiff <= 100) return null; // L20: within ₹1 tolerance — no discrepancy

  // ── Acknowledged state ────────────────────────────────────────────────────
  if (ack) {
    return (
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 bg-bg-subtle border border-line text-xs text-ink-muted">
        <Check size={10} aria-hidden="true" />
        Acknowledged
      </span>
    );
  }

  // ── Active discrepancy ────────────────────────────────────────────────────
  const sign = diff > 0 ? '+' : '-';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)] text-xs text-[rgb(var(--state-pending))]"
      role="alert"
      aria-label={`GST discrepancy: stored ${formatINR(storedGstPaise)}, recomputed ${formatINR(computedGstPaise)}`}
    >
      {/* L20: PLAN-VEHICLES-003 L4; Doc 06 §reconciliation */}
      <AlertTriangle size={11} aria-hidden="true" />
      <span className="font-mono tabular-nums">
        Stored {formatINR(storedGstPaise)} · Recomputed {formatINR(computedGstPaise)} · Diff {sign}{formatINR(absDiff)}
      </span>
      {onAcknowledge && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
          className="ml-1 underline hover:no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent text-xs"
          aria-label="Acknowledge discrepancy"
        >
          Acknowledge
        </button>
      )}
    </span>
  );
}
