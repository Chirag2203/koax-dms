/**
 * ClosePolicyDialog — close a lead as won (with policy details) or lost.
 *
 * Triggered from LeadDetailView "Close as Won" / "Close as Lost" buttons.
 * Also called from renewal-pipeline-view when a card is dropped on closed-won.
 *
 * Won path  — requires selectedQuoteId + policyNumber (IRDAI format) + period dates.
 * Lost path — requires reason enum + optional notes.
 *
 * Gate: R10+ (enforced by parent; this component trusts the caller already
 * validated the role. The store action re-validates independently.)
 *
 * Spec reference: SPEC-INSURANCE-001 L_P5_4
 */

'use client';

import { useState, useId } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { cn } from '@dms/ui';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import type { InsuranceLead, InsuranceQuote } from '@dms/types';
import type { StoreActor } from '@/src/lib/insurance/insurance-store/types';

// ─── Lost-reason enum ─────────────────────────────────────────────────────────

export type LostReason =
  | 'better-quote-elsewhere'
  | 'do-not-contact'
  | 'duplicate'
  | 'price-too-high'
  | 'other';

const LOST_REASON_LABELS: Record<LostReason, string> = {
  'better-quote-elsewhere': 'Better quote elsewhere',
  'do-not-contact':         'Do not contact',
  'duplicate':              'Duplicate lead',
  'price-too-high':         'Price too high',
  'other':                  'Other',
};

const LOST_REASONS = Object.keys(LOST_REASON_LABELS) as LostReason[];

// ─── IRDAI policy number format ───────────────────────────────────────────────
// 16-digit numeric (per IRDAI policy number convention)
const POLICY_NUMBER_REGEX = /^\d{16}$/;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ClosePolicyDialogProps {
  open: boolean;
  onClose: () => void;
  lead: InsuranceLead;
  actor: StoreActor;
  /** If provided, pre-fills won form (used by Kanban drop) */
  prefill?: {
    selectedQuoteId?: string;
    totalPremium?: number;
  };
  onSuccess?: (outcome: 'closed-won' | 'closed-lost') => void;
}

// ─── Won form state ───────────────────────────────────────────────────────────

interface WonFormState {
  selectedQuoteId: string;
  policyNumber: string;
  periodStart: string;
  periodEnd: string;
  totalPremium: string;
  selectedAddons: string[];
  policyDocFilename: string;
}

function buildInitialWonState(
  lead: InsuranceLead,
  prefill?: ClosePolicyDialogProps['prefill'],
): WonFormState {
  const defaultQuote: InsuranceQuote | undefined =
    prefill?.selectedQuoteId
      ? lead.quotes.find((q) => q.quoteId === prefill.selectedQuoteId)
      : lead.quotes[0];

  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    selectedQuoteId:  defaultQuote?.quoteId ?? '',
    policyNumber:     '',
    periodStart:      today,
    periodEnd:        nextYear,
    totalPremium:     String(prefill?.totalPremium ?? defaultQuote?.totalPremium ?? ''),
    selectedAddons:   defaultQuote?.selectedAddons ?? [],
    policyDocFilename: '',
  };
}

// ─── Lost form state ──────────────────────────────────────────────────────────

interface LostFormState {
  reason: LostReason | '';
  notes: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClosePolicyDialog({
  open,
  onClose,
  lead,
  actor,
  prefill,
  onSuccess,
}: ClosePolicyDialogProps) {
  const closeLead = useInsuranceStore((s) => s.closeLead);

  const [mode, setMode] = useState<'won' | 'lost'>('won');
  const [wonForm, setWonForm] = useState<WonFormState>(() => buildInitialWonState(lead, prefill));
  const [lostForm, setLostForm] = useState<LostFormState>({ reason: '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const idBase = useId();

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedQuote = lead.quotes.find((q) => q.quoteId === wonForm.selectedQuoteId);
  const availableAddons = selectedQuote?.availableAddons ?? [];

  function handleQuoteSelect(quoteId: string) {
    const q = lead.quotes.find((x) => x.quoteId === quoteId);
    setWonForm((f) => ({
      ...f,
      selectedQuoteId: quoteId,
      totalPremium: q ? String(q.totalPremium) : f.totalPremium,
      selectedAddons: q?.selectedAddons ?? [],
    }));
  }

  function handlePeriodStartChange(val: string) {
    const start = new Date(val);
    const end = new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    setWonForm((f) => ({
      ...f,
      periodStart: val,
      periodEnd: end.toISOString().slice(0, 10),
    }));
  }

  function toggleAddon(code: string) {
    setWonForm((f) => ({
      ...f,
      selectedAddons: f.selectedAddons.includes(code)
        ? f.selectedAddons.filter((a) => a !== code)
        : [...f.selectedAddons, code],
    }));
  }

  // ── Validation ───────────────────────────────────────────────────────────

  function validateWon(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!wonForm.selectedQuoteId) errs.selectedQuoteId = 'Select a quote.';
    if (!POLICY_NUMBER_REGEX.test(wonForm.policyNumber))
      errs.policyNumber = 'Policy number must be 16 digits (IRDAI format).';
    if (!wonForm.periodStart) errs.periodStart = 'Period start is required.';
    if (!wonForm.periodEnd)   errs.periodEnd   = 'Period end is required.';
    if (wonForm.periodEnd <= wonForm.periodStart)
      errs.periodEnd = 'Period end must be after period start.';
    const premium = parseFloat(wonForm.totalPremium);
    if (isNaN(premium) || premium <= 0) errs.totalPremium = 'Enter a valid premium amount.';
    return errs;
  }

  function validateLost(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!lostForm.reason) errs.reason = 'Select a reason.';
    return errs;
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  function handleSubmit() {
    setErrors({});
    const errs = mode === 'won' ? validateWon() : validateLost();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'won') {
        closeLead(
          lead.leadId,
          'won',
          {
            quoteId:      wonForm.selectedQuoteId,
            policyNumber: wonForm.policyNumber,
          },
          actor,
        );
        onSuccess?.('closed-won');
      } else {
        // Map LostReason to store-accepted reason
        const storeReason =
          lostForm.reason === 'do-not-contact' ? 'do-not-contact'
          : lostForm.reason === 'duplicate'     ? 'duplicate'
          : 'lost';

        closeLead(
          lead.leadId,
          storeReason as 'won' | 'lost' | 'duplicate' | 'do-not-contact',
          {},
          actor,
        );
        onSuccess?.('closed-lost');
      }
      handleClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to close lead.' });
      setSubmitting(false);
    }
  }

  function handleClose() {
    setErrors({});
    setSubmitting(false);
    setMode('won');
    setWonForm(buildInitialWonState(lead, prefill));
    setLostForm({ reason: '', notes: '' });
    onClose();
  }

  const hasQuotes = lead.quotes.length > 0;
  const isDirty =
    mode === 'won'
      ? wonForm.policyNumber !== '' || wonForm.policyDocFilename !== ''
      : lostForm.reason !== '' || lostForm.notes !== '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Close Lead"
      subtitle={`Lead ${lead.leadId} — VIN ${lead.vin}`}
      size="lg"
      dirty={isDirty}
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              mode === 'won'
                ? 'bg-success hover:bg-success/90 focus-visible:ring-success'
                : 'bg-state-danger hover:bg-state-danger/90 focus-visible:ring-state-danger',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {submitting ? 'Closing…' : mode === 'won' ? 'Close as Won' : 'Close as Lost'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex rounded-md border border-line overflow-hidden text-[13px] font-medium">
          {(['won', 'lost'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setErrors({}); }}
              className={cn(
                'flex-1 h-9 transition-colors',
                mode === m
                  ? m === 'won'
                    ? 'bg-success/15 text-success'
                    : 'bg-state-danger/15 text-state-danger'
                  : 'bg-bg-canvas text-ink-muted hover:bg-bg-hover',
              )}
            >
              {m === 'won' ? 'Won' : 'Lost'}
            </button>
          ))}
        </div>

        {/* Global submit error */}
        {errors.submit && (
          <p className="text-[13px] text-error bg-error/8 border border-error/20 rounded-md px-3 py-2">
            {errors.submit}
          </p>
        )}

        {/* ── Won form ── */}
        {mode === 'won' && (
          <div className="space-y-4">
            {/* Quote selection */}
            {!hasQuotes ? (
              <p className="text-[13px] text-warning bg-warning/8 border border-warning/20 rounded-md px-3 py-2">
                No quotes saved on this lead. Add a quote before closing as won.
              </p>
            ) : (
              <fieldset>
                <legend className="text-[13px] font-semibold text-ink-primary mb-2">
                  Select Quote <span className="text-error">*</span>
                </legend>
                <div className="space-y-2">
                  {lead.quotes.map((q) => (
                    <label
                      key={q.quoteId}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                        wonForm.selectedQuoteId === q.quoteId
                          ? 'border-accent bg-accent/5'
                          : 'border-line hover:bg-bg-hover',
                      )}
                    >
                      <input
                        type="radio"
                        name={`${idBase}-quote`}
                        value={q.quoteId}
                        checked={wonForm.selectedQuoteId === q.quoteId}
                        onChange={() => handleQuoteSelect(q.quoteId)}
                        className="accent-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink-primary">{q.providerId}</p>
                        <p className="text-[11px] text-ink-muted font-mono">
                          &#8377;{new Intl.NumberFormat('en-IN').format(q.totalPremium)} total premium
                          {q.discountPct ? ` · ${q.discountPct}% discount` : ''}
                        </p>
                      </div>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-medium',
                        q.status === 'active' ? 'bg-success/10 text-success' : 'bg-bg-subtle text-ink-muted',
                      )}>
                        {q.status}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.selectedQuoteId && (
                  <p className="mt-1 text-[11px] text-error">{errors.selectedQuoteId}</p>
                )}
              </fieldset>
            )}

            {/* Policy number */}
            <div>
              <label htmlFor={`${idBase}-policy-number`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                Policy Number <span className="text-error">*</span>
                <span className="ml-2 text-[11px] font-normal text-ink-muted">(16-digit IRDAI format)</span>
              </label>
              <input
                id={`${idBase}-policy-number`}
                type="text"
                value={wonForm.policyNumber}
                onChange={(e) => setWonForm((f) => ({ ...f, policyNumber: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                placeholder="0123456789012345"
                maxLength={16}
                className={cn(
                  'h-9 w-full px-3 rounded-md border bg-bg-subtle text-[13px] font-mono text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.policyNumber ? 'border-error' : 'border-line',
                )}
              />
              {errors.policyNumber && (
                <p className="mt-1 text-[11px] text-error">{errors.policyNumber}</p>
              )}
            </div>

            {/* Period start + end */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${idBase}-period-start`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                  Period Start <span className="text-error">*</span>
                </label>
                <input
                  id={`${idBase}-period-start`}
                  type="date"
                  value={wonForm.periodStart}
                  onChange={(e) => handlePeriodStartChange(e.target.value)}
                  className={cn(
                    'h-9 w-full px-3 rounded-md border bg-bg-subtle text-[13px] text-ink-primary',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.periodStart ? 'border-error' : 'border-line',
                  )}
                />
                {errors.periodStart && (
                  <p className="mt-1 text-[11px] text-error">{errors.periodStart}</p>
                )}
              </div>
              <div>
                <label htmlFor={`${idBase}-period-end`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                  Period End <span className="text-error">*</span>
                  <span className="ml-1 text-[11px] font-normal text-ink-muted">(auto +1yr)</span>
                </label>
                <input
                  id={`${idBase}-period-end`}
                  type="date"
                  value={wonForm.periodEnd}
                  onChange={(e) => setWonForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  className={cn(
                    'h-9 w-full px-3 rounded-md border bg-bg-subtle text-[13px] text-ink-primary',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                    errors.periodEnd ? 'border-error' : 'border-line',
                  )}
                />
                {errors.periodEnd && (
                  <p className="mt-1 text-[11px] text-error">{errors.periodEnd}</p>
                )}
              </div>
            </div>

            {/* Total premium */}
            <div>
              <label htmlFor={`${idBase}-premium`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                Total Premium (&#8377;) <span className="text-error">*</span>
                <span className="ml-2 text-[11px] font-normal text-ink-muted">(auto-filled from quote, editable)</span>
              </label>
              <input
                id={`${idBase}-premium`}
                type="number"
                min={1}
                value={wonForm.totalPremium}
                onChange={(e) => setWonForm((f) => ({ ...f, totalPremium: e.target.value }))}
                className={cn(
                  'h-9 w-full px-3 rounded-md border bg-bg-subtle text-[13px] font-mono text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.totalPremium ? 'border-error' : 'border-line',
                )}
              />
              {errors.totalPremium && (
                <p className="mt-1 text-[11px] text-error">{errors.totalPremium}</p>
              )}
            </div>

            {/* Selected addons */}
            {availableAddons.length > 0 && (
              <fieldset>
                <legend className="text-[13px] font-semibold text-ink-primary mb-2">
                  Addons
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {availableAddons.map((code) => (
                    <label
                      key={code}
                      className="flex items-center gap-2 text-[13px] text-ink-secondary cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={wonForm.selectedAddons.includes(code)}
                        onChange={() => toggleAddon(code)}
                        className="accent-accent"
                      />
                      <span className="capitalize">{code.replace(/-/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Policy document stub */}
            <div>
              <label htmlFor={`${idBase}-policy-doc`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                Insurance Policy PDF
                <span className="ml-2 text-[11px] font-normal text-ink-muted">(filename reference)</span>
              </label>
              <input
                id={`${idBase}-policy-doc`}
                type="text"
                value={wonForm.policyDocFilename}
                onChange={(e) => setWonForm((f) => ({ ...f, policyDocFilename: e.target.value }))}
                placeholder="policy-document.pdf"
                className="h-9 w-full px-3 rounded-md border border-line bg-bg-subtle text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* ── Lost form ── */}
        {mode === 'lost' && (
          <div className="space-y-4">
            <div>
              <label htmlFor={`${idBase}-lost-reason`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                Reason <span className="text-error">*</span>
              </label>
              <select
                id={`${idBase}-lost-reason`}
                value={lostForm.reason}
                onChange={(e) => setLostForm((f) => ({ ...f, reason: e.target.value as LostReason }))}
                className={cn(
                  'h-9 w-full px-3 rounded-md border bg-bg-subtle text-[13px] text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.reason ? 'border-error' : 'border-line',
                )}
              >
                <option value="">Select a reason…</option>
                {LOST_REASONS.map((r) => (
                  <option key={r} value={r}>{LOST_REASON_LABELS[r]}</option>
                ))}
              </select>
              {errors.reason && (
                <p className="mt-1 text-[11px] text-error">{errors.reason}</p>
              )}
            </div>

            <div>
              <label htmlFor={`${idBase}-lost-notes`} className="block text-[13px] font-semibold text-ink-primary mb-1">
                Notes
                <span className="ml-2 text-[11px] font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id={`${idBase}-lost-notes`}
                value={lostForm.notes}
                onChange={(e) => setLostForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Add context for the team…"
                className="w-full px-3 py-2 rounded-md border border-line bg-bg-subtle text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
