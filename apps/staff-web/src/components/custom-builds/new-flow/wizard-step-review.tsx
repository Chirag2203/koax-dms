/**
 * Wizard Step 6 — Review + Create.
 *
 * Summary of all collected data before submitting.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 P1.1 Issue 6 Step 6
 */

'use client';

import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { formatINR } from '../shared/format-inr';
import type { WizardData } from './new-build-wizard';

interface Props {
  data: WizardData;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-line last:border-0">
      <dt className="text-[12px] text-ink-muted shrink-0">{label}</dt>
      <dd className="text-[13px] text-ink-primary text-right">{value}</dd>
    </div>
  );
}

export function WizardStepReview({ data }: Props) {
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const vendor = data.vendorId ? vendors.find((v) => v.id === data.vendorId) : undefined;

  const runningTotal = data.selectedParts.reduce(
    (sum, { part, qty }) => sum + (part.bnCost ?? part.listPrice) * qty,
    0,
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-primary">Review & Create</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">
          Confirm the details below. The job will be created at <strong>Enquiry</strong> stage.
        </p>
      </div>

      <div className="rounded-lg border border-line p-5">
        <dl>
          <Row label="Customer" value={data.customerName || '—'} />
          <Row
            label="Vehicle"
            value={
              <span>
                {data.vehicleLabel && <span className="text-ink-secondary">{data.vehicleLabel} · </span>}
                <span className="font-mono text-[11px]">{data.vin || '—'}</span>
              </span>
            }
          />
          <Row label="Job Title" value={data.title || '—'} />
          {data.enquiryNotes && (
            <Row label="Notes" value={<span className="text-ink-secondary text-[12px] leading-relaxed">{data.enquiryNotes}</span>} />
          )}
          {data.targetCompletionDate && (
            <Row
              label="Target Completion"
              value={new Date(data.targetCompletionDate).toLocaleDateString('en-IN')}
            />
          )}
          <Row label="Parts" value={`${data.selectedParts.length} part(s)`} />
          {runningTotal > 0 && (
            <Row
              label="Parts Subtotal"
              value={<span className="font-mono tabular-nums">{formatINR(runningTotal)}</span>}
            />
          )}
          <Row label="Vendor" value={vendor ? vendor.name : <span className="text-ink-muted italic">Not assigned</span>} />
          <Row label="Initial Stage" value={<span className="font-mono text-[11px] text-ink-secondary">ENQUIRY</span>} />
        </dl>
      </div>

      {data.selectedParts.length > 0 && (
        <div className="rounded-lg border border-line p-5 space-y-2">
          <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wider mb-3">Selected Parts</p>
          {data.selectedParts.map(({ part, qty }) => (
            <div key={part.sku} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-ink-secondary truncate">{qty}× {part.name}</span>
              <span className="font-mono text-ink-primary tabular-nums shrink-0">
                {formatINR((part.bnCost ?? part.listPrice) * qty)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
