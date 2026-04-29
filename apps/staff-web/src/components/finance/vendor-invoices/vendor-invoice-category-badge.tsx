/**
 * Vendor invoice category badge — SPEC-FINANCE-001 L17, L23
 *
 * L17: Five categories: parts, labour, commission, consumable, consignment-payout.
 * L23: parts/labour/consumable = input-credit eligible; commission/consignment-payout = NOT.
 * SPEC-ARCH-UI-001 §StateChip pattern.
 */

'use client';

import type { VendorInvoiceCategory } from '@dms/types';

interface VendorInvoiceCategoryBadgeProps {
  category: VendorInvoiceCategory;
  /** L23: show input-credit eligibility indicator */
  showEligibility?: boolean;
}

// L17: category display labels
const CATEGORY_LABELS: Record<VendorInvoiceCategory, string> = {
  parts: 'Parts',
  labour: 'Labour',
  commission: 'Commission',
  consumable: 'Consumable',
  'consignment-payout': 'Consignment Payout',
};

// L23: input-credit eligibility per category
export const INPUT_CREDIT_ELIGIBLE: Record<VendorInvoiceCategory, boolean> = {
  parts: true,
  labour: true,
  consumable: true,
  commission: false,             // L23: NOT eligible
  'consignment-payout': false,   // L23: NOT eligible
};

export function VendorInvoiceCategoryBadge({
  category,
  showEligibility = false,
}: VendorInvoiceCategoryBadgeProps) {
  const eligible = INPUT_CREDIT_ELIGIBLE[category];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest bg-bg-subtle border border-line text-ink-secondary">
        {CATEGORY_LABELS[category]}
      </span>
      {showEligibility && (
        <span
          className={[
            'rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest',
            eligible
              ? 'bg-[rgb(var(--state-listed)/0.08)] text-[rgb(var(--state-listed))]'
              : 'bg-bg-subtle text-ink-muted border border-line',
          ].join(' ')}
          title={eligible ? 'Input credit eligible (L23)' : 'Not eligible for input credit (L23)'}
        >
          {eligible ? 'ITC' : 'No ITC'}
        </span>
      )}
    </span>
  );
}
