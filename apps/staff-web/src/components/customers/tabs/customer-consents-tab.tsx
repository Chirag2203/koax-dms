'use client';

/**
 * CustomerConsentsTab — real DPDP consent log + withdrawal flow.
 *
 * Spec: SPEC-CUSTOMERS-001 §3 + GAP-3 / GAP-10
 * Scenarios: S-C-10 (view consent log), S-C-14 (withdrawal)
 * RBAC: Withdraw requires R09+
 */

import { useState, useMemo } from 'react';
import { Shield, AlertCircle, BanIcon } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { Card } from '@/src/components/custom-builds/shared/detail-card';
import type { ConsentEntry, ConsentPurpose, Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomerConsentsTabProps {
  customer: Customer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  WHATSAPP_MARKETING: 'WhatsApp Marketing',
  EMAIL_MARKETING: 'Email Marketing',
  SERVICE_REMINDER: 'Service Reminder',
  DATA_PROCESSING: 'Data Processing (DPDP)',
  INSURANCE_MARKETING: 'Insurance Marketing',
  // DPDP-C2: additional channel purposes added 2026-04-30
  SMS_MARKETING: 'SMS Marketing',
  CALL_MARKETING: 'Call Marketing',
  GENERAL_MARKETING: 'General Marketing',
};

const SOURCE_LABELS: Record<string, string> = {
  PORTAL_SIGNUP: 'Portal Sign-up',
  STAFF_FORM: 'Staff Form',
  IMPORT: 'Legacy Import',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ConsentSkeleton() {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-5 animate-pulse" aria-hidden="true">
      <div className="h-4 w-40 bg-bg-subtle rounded mb-3" />
      <div className="h-3 w-64 bg-bg-subtle rounded mb-2" />
      <div className="h-3 w-48 bg-bg-subtle rounded" />
    </div>
  );
}

// ─── Single consent card ──────────────────────────────────────────────────────

interface ConsentCardProps {
  entry: ConsentEntry;
  isInsuranceOptedOut: boolean;
  onWithdraw: (entry: ConsentEntry) => void;
}

function ConsentCard({ entry, isInsuranceOptedOut, onWithdraw }: ConsentCardProps) {
  const isActive = !entry.revokedAt;
  const showInsuranceSyncWarning =
    entry.purpose === 'WHATSAPP_MARKETING' && isInsuranceOptedOut && isActive;

  return (
    <div
      className={cn(
        'rounded-md border bg-bg-surface p-5',
        isActive ? 'border-line' : 'border-line opacity-70',
      )}
      aria-label={`${PURPOSE_LABELS[entry.purpose]} consent — ${isActive ? 'active' : 'revoked'}`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield
            className={cn('h-4 w-4 shrink-0', isActive ? 'text-[rgb(var(--state-listed))]' : 'text-ink-muted')}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-ink-primary">
            {PURPOSE_LABELS[entry.purpose]}
          </span>
          {/* Source badge */}
          <span
            className={cn(
              'inline-flex items-center rounded px-1.5 py-0.5',
              'font-mono text-[10px] uppercase tracking-widest',
              'bg-bg-subtle text-ink-muted',
            )}
          >
            {SOURCE_LABELS[entry.source] ?? entry.source}
          </span>
          {/* Active / Revoked chip */}
          {isActive ? (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]">
              Revoked
            </span>
          )}
        </div>

        {/* Withdraw button — R09+ only, active entries only */}
        {isActive && (
          <Gate role={['R09', 'R12', 'R15', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={() => onWithdraw(entry)}
              className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded text-xs font-medium',
                'border border-[rgb(var(--state-danger)/0.3)] text-[rgb(var(--state-danger))]',
                'hover:bg-[rgb(var(--state-danger)/0.05)] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--state-danger))]',
              )}
              aria-label={`Withdraw ${PURPOSE_LABELS[entry.purpose]} consent`}
            >
              <BanIcon className="h-3 w-3" aria-hidden="true" />
              Withdraw
            </button>
          </Gate>
        )}
      </div>

      {/* Active since / Revoked at */}
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <div>
          <dt className="text-ink-muted uppercase tracking-wider">
            {isActive ? 'Active since' : 'Captured at'}
          </dt>
          <dd className="text-ink-primary mt-0.5 font-mono">{formatDateTime(entry.capturedAt)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted uppercase tracking-wider">Captured by</dt>
          <dd className="text-ink-primary mt-0.5">{entry.capturedByName}</dd>
        </div>
        {!isActive && entry.revokedAt && (
          <>
            <div>
              <dt className="text-ink-muted uppercase tracking-wider">Revoked at</dt>
              <dd className="text-ink-primary mt-0.5 font-mono">{formatDateTime(entry.revokedAt)}</dd>
            </div>
            {entry.revokedByName && (
              <div>
                <dt className="text-ink-muted uppercase tracking-wider">Revoked by</dt>
                <dd className="text-ink-primary mt-0.5">{entry.revokedByName}</dd>
              </div>
            )}
            {entry.revocationReason && (
              <div className="col-span-2">
                <dt className="text-ink-muted uppercase tracking-wider">Reason</dt>
                <dd className="text-ink-primary mt-0.5">{entry.revocationReason}</dd>
              </div>
            )}
          </>
        )}
      </dl>

      {/* Insurance opt-out sync indicator */}
      {showInsuranceSyncWarning && (
        <div className="mt-3 flex items-center gap-2 rounded bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.2)] px-3 py-2 text-xs text-ink-secondary">
          <AlertCircle className="h-3.5 w-3.5 text-[rgb(var(--state-overdue))] shrink-0" aria-hidden="true" />
          Insurance opt-out registered — this customer will be excluded from WhatsApp insurance campaigns
        </div>
      )}
    </div>
  );
}

// ─── Withdraw modal ───────────────────────────────────────────────────────────

interface WithdrawModalProps {
  open: boolean;
  entry: ConsentEntry | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function WithdrawModal({ open, entry, onClose, onConfirm }: WithdrawModalProps) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 4;

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(reason.trim());
    setReason('');
  };

  if (!open || !entry) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        aria-hidden="true"
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="withdraw-title"
          aria-describedby="withdraw-desc"
          className="bg-bg-surface border border-line-strong rounded-xl shadow-xl w-full max-w-[480px]"
        >
          <div className="px-6 pt-6 pb-4 flex gap-4 items-start">
            <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-state-danger/10">
              <BanIcon className="h-5 w-5 text-state-danger" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="withdraw-title" className="text-base font-semibold text-ink-primary">
                Withdraw consent
              </h2>
              <p id="withdraw-desc" className="mt-1 text-sm text-ink-secondary">
                You are about to withdraw{' '}
                <strong>{PURPOSE_LABELS[entry.purpose]}</strong> consent for this customer.
                This action is logged and cannot be undone without recapturing consent.
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="px-6 pb-4">
            <label htmlFor="withdraw-reason" className="block text-xs text-ink-muted mb-1.5 uppercase tracking-wider">
              Reason <span className="text-state-danger" aria-label="required">*</span>
            </label>
            <textarea
              id="withdraw-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this consent is being withdrawn (min 4 characters)..."
              className={cn(
                'w-full rounded-md border bg-bg-canvas px-3 py-2',
                'text-sm text-ink-primary placeholder:text-ink-muted resize-none',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
                !isValid && reason.length > 0 ? 'border-state-danger' : 'border-line',
              )}
              aria-required="true"
              aria-invalid={!isValid && reason.length > 0}
              aria-describedby={!isValid && reason.length > 0 ? 'withdraw-reason-error' : undefined}
              autoFocus
            />
            {!isValid && reason.length > 0 && (
              <p id="withdraw-reason-error" className="mt-1 text-xs text-state-danger" role="alert">
                Please provide at least 4 characters.
              </p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-line flex flex-row-reverse gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isValid}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
                'bg-state-danger hover:bg-state-danger/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-state-danger',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Withdraw consent
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerConsentsTab({ customer }: CustomerConsentsTabProps) {
  const [withdrawTarget, setWithdrawTarget] = useState<ConsentEntry | null>(null);

  // All hooks before any conditional return
  const { user } = useStaffAuth();
  const consents = useCustomersStore((s) => s.consents);
  const withdrawConsent = useCustomersStore((s) => s.withdrawConsent);
  const insuranceOptOuts = useInsuranceStore((s) => s.optOuts);

  const customerEntries = useMemo(
    () => Object.values(consents).filter((e) => e.customerId === customer.id),
    [consents, customer.id],
  );

  const isInsuranceOptedOut = insuranceOptOuts.has(customer.id);

  // Sort: active first, then by capturedAt desc
  const sorted = useMemo(
    () =>
      [...customerEntries].sort((a, b) => {
        const aActive = !a.revokedAt ? 1 : 0;
        const bActive = !b.revokedAt ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
      }),
    [customerEntries],
  );

  function handleWithdraw(reason: string) {
    if (!withdrawTarget || !user) return;
    try {
      withdrawConsent(withdrawTarget.id, reason, {
        id: user.id,
        name: user.name,
        role: user.role,
      });
      setWithdrawTarget(null);
    } catch (err) {
      // Error surface handled by parent toast; entry may already be revoked
      console.error('[CustomerConsentsTab] withdrawConsent failed:', err);
    }
  }

  // Loading state — store not yet seeded (no consents at all and customer store not hydrated)
  const isLoading = Object.keys(consents).length === 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading consent log">
        {Array.from({ length: 4 }).map((_, i) => (
          <ConsentSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (sorted.length === 0) {
    return (
      <Card title="Consent Log (DPDP Act 2023)">
        <div className="flex flex-col items-center py-10 text-center">
          <Shield className="h-8 w-8 text-ink-muted mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-ink-primary">No consents on file</p>
          <p className="text-xs text-ink-muted mt-1 max-w-xs">
            Consents are captured via the customer portal at sign-up, or by staff using the Capture Consent action.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title="Consent Log (DPDP Act 2023)"
        rightSlot={
          <span className="text-xs text-ink-muted">
            {sorted.filter((e) => !e.revokedAt).length} active ·{' '}
            {sorted.filter((e) => !!e.revokedAt).length} revoked
          </span>
        }
      >
        <div className="flex flex-col gap-4" role="list" aria-label="Customer consents">
          {sorted.map((entry) => (
            <div key={entry.id} role="listitem">
              <ConsentCard
                entry={entry}
                isInsuranceOptedOut={isInsuranceOptedOut}
                onWithdraw={(e) => setWithdrawTarget(e)}
              />
            </div>
          ))}
        </div>
      </Card>

      <WithdrawModal
        open={!!withdrawTarget}
        entry={withdrawTarget}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={handleWithdraw}
      />
    </>
  );
}

