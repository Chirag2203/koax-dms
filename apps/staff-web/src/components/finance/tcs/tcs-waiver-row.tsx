/**
 * TCS waiver row — SPEC-FINANCE-001 L3, §1.2
 *
 * L3: Waivers appear in Waivers tab. Finance reads waivers — cannot create/revoke.
 *     Columns: VIN, saleDate, customer, invoiceValue, waivedReason, waivedBy.
 *     PLAN-VEHICLES-003 L18 inheritance.
 */

'use client';

import { VinBadge } from '@/src/components/primitives';
import { INRAmount } from '../shared/inr-amount';

interface TcsWaiverRowProps {
  eventId: string;
  vin: string;
  saleDate: string;
  customerPanLast4: string;
  invoiceValuePaise: number;
  tcsWaivedReason?: string;
  tcsWaivedBy?: string;
}

/**
 * Single row in the TCS waivers tab.
 * L3: PLAN-VEHICLES-003 L18; Doc 06 §TCS.
 */
export function TcsWaiverRow({
  vin,
  saleDate,
  customerPanLast4,
  invoiceValuePaise,
  tcsWaivedReason,
  tcsWaivedBy,
}: TcsWaiverRowProps) {
  return (
    <tr className="hover:bg-bg-hover transition-colors">
      <td className="px-4 py-3">
        <VinBadge vin={vin} size="sm" />
      </td>
      <td className="px-4 py-3 text-sm text-ink-secondary">
        {new Date(saleDate).toLocaleDateString('en-IN')}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
        {customerPanLast4}
      </td>
      <td className="px-4 py-3 text-right">
        <INRAmount paise={invoiceValuePaise} className="text-sm" />
      </td>
      <td className="px-4 py-3 text-sm text-ink-secondary max-w-xs truncate" title={tcsWaivedReason}>
        {tcsWaivedReason ?? '—'}
      </td>
      <td className="px-4 py-3 text-xs text-ink-muted">
        {/* L13: waivedBy is a staff role code + name; no PAN */}
        {tcsWaivedBy ?? '—'}
      </td>
    </tr>
  );
}
