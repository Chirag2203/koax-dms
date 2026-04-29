/**
 * GSTIN display — SPEC-FINANCE-001 L6, L13
 *
 * L6: Canonical 15-char GSTIN render — format validated on entry.
 * L13: Vendor GSTIN is public business data per IT Act §139A — shown in full.
 *      Customer PAN is PII — use pan-mask.ts, NOT shown here.
 *
 * SPEC-ARCH-UI-001 §Field: font-mono for identifiers.
 */

'use client';

import { isValidGstin } from '@/src/lib/finance/math/gstin-format';
import { AlertCircle } from 'lucide-react';

interface GstinDisplayProps {
  gstin: string | null | undefined;
  /** Show validation chip when invalid. */
  showValidation?: boolean;
  className?: string;
}

/**
 * Render a GSTIN with formatting. Invalid GSTINs show an alert chip.
 * L6: CBIC GSTN format; L13: vendor GSTIN is public.
 */
export function GstinDisplay({ gstin, showValidation = false, className = '' }: GstinDisplayProps) {
  if (!gstin) {
    return <span className="text-ink-muted">—</span>;
  }

  const valid = isValidGstin(gstin);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* L6: 15-char GSTIN in canonical segments: state(2) + PAN(10) + entity(1) + Z + check(1) */}
      <span className="font-mono text-sm tabular-nums text-ink-primary">
        {/* Break into readable segments */}
        <span className="text-accent">{gstin.slice(0, 2)}</span>
        <span>{gstin.slice(2, 12)}</span>
        <span className="text-ink-secondary">{gstin.slice(12)}</span>
      </span>
      {showValidation && !valid && (
        <span
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-[rgb(var(--state-overdue)/0.08)] text-[rgb(var(--state-overdue))] text-xs"
          role="alert"
          aria-label="Invalid GSTIN format"
        >
          <AlertCircle size={11} aria-hidden="true" />
          Invalid
        </span>
      )}
    </span>
  );
}
