'use client';

/**
 * IntakeSummaryCard — read-only intake inspection summary on JC detail.
 *
 * L11: For R11 (Workshop Tech): customerSignatureDataUrl and saSignatureDataUrl
 *      are REDACTED. Shows "✓ Signed by customer on {date}" instead of image.
 * L14: Photos are pii_sensitivity:medium — R11 sees thumbnail-only count,
 *      not raw dataUrls.
 * L8: Version > 1 shows amendment count.
 * SPEC-ARCH-UI-001 §3.1: Card + Field from detail-card, not redefined.
 * SPEC-ARCH-UI-001 §3.10: Gate for RBAC.
 */

import { useTranslations } from 'next-intl';
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { Gate } from '@/src/components/primitives/gate';
import { useServiceStore } from '@/src/lib/service/service-store';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fuelLabel(f: string): string {
  const map: Record<string, string> = {
    EMPTY: 'Empty', Q1: '1/4', Q2: '1/2', Q3: '3/4', FULL: 'Full',
  };
  return map[f] ?? f;
}

function presenceLabel(p: string): string {
  const map: Record<string, string> = {
    PRESENT: 'Present', ABSENT: 'Absent', NOT_VERIFIED: 'Not Verified',
  };
  return map[p] ?? p;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const STATE_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  CUSTOMER_SIGNED: 'Customer Signed',
  SHEET_UPLOADED: 'Sheet Uploaded',
  COMPLETED: 'Completed',
  AMENDED: 'Amended',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  intakeId: string;
  /** If true, shows R11 redacted view (no signature images, no photo dataUrls) */
  redacted?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntakeSummaryCard({ intakeId, redacted = false }: Props) {
  const t = useTranslations('serviceIntake');

  const intake = useServiceStore((s) => s.intakeInspections.find((i) => i.id === intakeId));
  const callouts = useServiceStore((s) => s.selectDamageCalloutsForIntake(intakeId));
  const photos = useServiceStore((s) => s.selectIntakePhotosForIntake(intakeId));
  const jobCard = useServiceStore((s) => s.jobCards.find((jc) => jc.id === intake?.jobCardId));

  if (!intake) {
    return (
      <div className="p-4 text-sm text-ink-muted" role="status">
        Intake record not found.
      </div>
    );
  }

  // ── Amendment count ────────────────────────────────────────────────────────
  const hasAmendments = intake.version > 1;

  return (
    <div className="space-y-4">
      {/* Version / amendment chip */}
      {hasAmendments && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)]" role="alert">
          <AlertTriangle size={18} className="text-[rgb(var(--state-pending))] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink-primary">
              Intake v{intake.version} — {intake.amendments.length} amendment{intake.amendments.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-ink-secondary mt-0.5">
              Last amended: {intake.amendments.at(-1)?.at ? formatDate(intake.amendments.at(-1)!.at) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Section A */}
      <Card title="Section A — Vehicle Identification">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Registration No." value={intake.regNumber} />
          <Field label="VIN" value={<span className="font-mono text-xs">{jobCard?.vin ?? '—'}</span>} />
          <Field label="Odometer (km)" value={<span className="font-mono tabular-nums">{intake.odometerKm.toLocaleString('en-IN')} km</span>} />
          <Field label="Fuel Level" value={fuelLabel(intake.fuelLevel)} />
          <Field label="Outlet" value={intake.outletId} />
          <Field label="Inspection Date" value={formatDate(intake.inspectionAt)} />
          <Field label="State" value={STATE_LABEL[intake.state] ?? intake.state} />
          <Field label="Version" value={`v${intake.version}`} />
        </dl>
      </Card>

      {/* Section B — Damage callouts */}
      <Card title={`Section B — Body Damage (${callouts.length} item${callouts.length !== 1 ? 's' : ''})`}>
        {callouts.length === 0 ? (
          <p className="text-sm text-ink-muted italic">No damage recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="Damage callouts">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3 w-8">#</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3">View</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3">Location</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2">Code / Sev</th>
                </tr>
              </thead>
              <tbody>
                {callouts.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs text-ink-muted">{c.number}</td>
                    <td className="py-2 pr-3 text-sm text-ink-primary">{c.view}</td>
                    <td className="py-2 pr-3 text-sm text-ink-primary max-w-[160px] truncate">{c.locationText}</td>
                    <td className="py-2 text-xs text-ink-secondary">
                      <span className="font-mono font-semibold text-ink-primary">{c.code}</span>
                      {' '}· Sev {c.severity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Section C — Inventory */}
      <Card title="Section C — Inventory">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Spare Tyre" value={intake.spareTyrePresent ? 'Present' : 'Absent'} />
          <Field label="Tool Kit" value={intake.toolKitPresent ? 'Present' : 'Absent'} />
          <Field label="Service Book" value={intake.serviceBookPresent ? 'Present' : 'Absent'} />
          <Field label="Keys" value={`${intake.keyCount} ${intake.keyType ? `(${intake.keyType.replace(/_/g, ' ')})` : ''}`} />
          <Field label="RC (MV §130)" value={presenceLabel(intake.rcInVehicle)} />
          <Field label="Insurance (MV §145)" value={presenceLabel(intake.insuranceCertInVehicle)} />
          {intake.cabinAccessoriesNote && (
            <div className="col-span-2">
              <Field label="Cabin Accessories" value={intake.cabinAccessoriesNote} />
            </div>
          )}
        </dl>
      </Card>

      {/* Section D — Functional */}
      <Card title="Section D — Functional Checks">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="AC" value={intake.acFunctional ? 'Functional' : 'Not Functional'} />
          <Field label="Wipers" value={intake.wipersFunctional ? 'Functional' : 'Not Functional'} />
          <Field label="Lights" value={intake.lightsFunctional ? 'Functional' : 'Not Functional'} />
          {intake.infotainmentFunctional !== undefined && (
            <Field label="Infotainment" value={intake.infotainmentFunctional ? 'Functional' : 'Not Functional'} />
          )}
          <Field label="12V Battery" value={intake.battery12VCondition.replace('_', ' ')} />
          <Field
            label="Tyre Condition"
            value={<span className="font-mono text-xs">
              FL:{intake.tyreCondition.FL} FR:{intake.tyreCondition.FR}{' '}
              RL:{intake.tyreCondition.RL} RR:{intake.tyreCondition.RR}
            </span>}
          />
          {intake.dashboardWarningLightsNote && (
            <div className="col-span-2">
              <Field label="Dashboard Warning Lights" value={intake.dashboardWarningLightsNote} />
            </div>
          )}
        </dl>
      </Card>

      {/* Section E — Signatures */}
      <Card title="Section E — Signatures">
        {redacted ? (
          // L11/L14: R11 sees redacted indicator, not the signature image
          <div className="space-y-3">
            {intake.customerSignedAt ? (
              <div className="flex items-center gap-2 text-sm text-ink-primary">
                <CheckCircle2 className="h-4 w-4 text-[rgb(var(--state-listed))]" aria-hidden="true" />
                Signed by customer on {formatDate(intake.customerSignedAt)}
                <Lock className="h-3 w-3 text-ink-muted ml-1" aria-label="Signature redacted for Workshop Tech role" />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">Customer signature not yet captured.</p>
            )}
            <div className="flex items-center gap-2 text-sm text-ink-primary">
              <CheckCircle2 className="h-4 w-4 text-[rgb(var(--state-listed))]" aria-hidden="true" />
              SA: {intake.saName} (ID: {intake.saEmployeeId}) — signed {formatDate(intake.saSignedAt)}
              <Lock className="h-3 w-3 text-ink-muted ml-1" aria-label="Signature redacted for Workshop Tech role" />
            </div>
          </div>
        ) : (
          // Full signature view for R09/R03/R19+ (Gate wraps this Card in jobcard-detail-view)
          <Gate role={['R09', 'R03', 'R19', 'R24']} fallback="hide">
            <div className="space-y-4">
              {/* Customer signature */}
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-2">Customer Signature</p>
                {intake.customerSignatureDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={intake.customerSignatureDataUrl}
                      alt={`Customer signature — ${intake.saName}`}
                      className="h-16 w-auto border border-line rounded-md bg-white"
                    />
                    {intake.customerSignedAt && (
                      <p className="text-xs text-ink-muted mt-1">
                        Signed: {formatDate(intake.customerSignedAt)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-ink-muted italic">Not yet captured.</p>
                )}
              </div>

              {/* SA signature */}
              <div>
                <p className="text-xs text-ink-muted uppercase tracking-wider mb-2">Service Advisor Signature</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={intake.saSignatureDataUrl}
                  alt={`SA signature — ${intake.saName}`}
                  className="h-16 w-auto border border-line rounded-md bg-white"
                />
                <p className="text-xs text-ink-muted mt-1">
                  {intake.saName} (ID: {intake.saEmployeeId}) — {formatDate(intake.saSignedAt)}
                </p>
              </div>
            </div>
          </Gate>
        )}
      </Card>

      {/* Photos summary */}
      <Card title={`Vehicle Photos (${photos.length}/10 captured)`}>
        {photos.length === 0 ? (
          <p className="text-sm text-ink-muted italic">No photos captured yet.</p>
        ) : (
          <>
            {/* L14: R11 sees count/thumbnails only, no full dataUrls */}
            {redacted ? (
              <p className="text-sm text-ink-secondary">
                {photos.length} photo{photos.length !== 1 ? 's' : ''} captured.
                <Lock className="inline h-3 w-3 text-ink-muted ml-1 align-text-bottom" aria-label="Full photos restricted — requires SA role or above" />
              </p>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="aspect-[4/3] rounded-md overflow-hidden border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.dataUrl}
                      alt={`Vehicle photo — ${p.slot}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
