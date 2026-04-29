/**
 * ManualCallOutcomeDialog — record outcome for a manually completed or skipped
 * follow-up step (§5.7).
 *
 * Trigger: "Mark as done" or "Skip" affordance on a follow-up step row in
 * LeadDetailView. Both variants open this dialog with appropriate prefilled
 * outcome values.
 *
 * Form fields:
 *   - outcome enum (COMPLETED_* | SKIPPED_*)
 *   - notes textarea (required, min 10 chars)
 *   - nextActionAt date picker (only when outcome = COMPLETED_FOLLOW_LATER)
 *
 * On submit: calls recordFollowupOutcome store action.
 *
 * Destructive SKIPPED_* outcomes: show a secondary confirmation banner before
 * enabling the submit button.
 *
 * Gate: R09+ enforced at call site via <Gate role="R09">.
 * Spec reference: SPEC-INSURANCE-001 §5.7
 *
 * i18n keys: insurance.followup.dialog.*
 */

'use client';

import { useState, useId } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@dms/ui';
import { Dialog, AlertDialog } from '@/src/components/primitives/dialog';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import type { ManualFollowupOutcome } from '@dms/types';
import type { StoreActor } from '@/src/lib/insurance/insurance-store/types';

// ─── Outcome config ───────────────────────────────────────────────────────────

type OutcomeOption = {
  value: ManualFollowupOutcome;
  label: string;
  description: string;
  destructive: boolean;
};

const OUTCOME_OPTIONS: OutcomeOption[] = [
  {
    value: 'COMPLETED_QUOTE_SHARED',
    label: 'Completed — Quote shared',
    description: 'Called and shared a quote with the customer.',
    destructive: false,
  },
  {
    value: 'COMPLETED_NOT_INTERESTED',
    label: 'Completed — Not interested',
    description: 'Called and customer expressed no interest.',
    destructive: false,
  },
  {
    value: 'COMPLETED_FOLLOW_LATER',
    label: 'Completed — Follow up later',
    description: 'Called and agreed to follow up on a specific date.',
    destructive: false,
  },
  {
    value: 'SKIPPED_NO_REACH',
    label: 'Skipped — Could not reach',
    description: 'Attempted call but could not reach the customer.',
    destructive: true,
  },
  {
    value: 'SKIPPED_OTHER',
    label: 'Skipped — Other reason',
    description: 'Step skipped for another reason (explain in notes).',
    destructive: true,
  },
];

function isDestructive(outcome: ManualFollowupOutcome): boolean {
  return outcome === 'SKIPPED_NO_REACH' || outcome === 'SKIPPED_OTHER';
}

// ─── Props ────────────────────────────────────────────────────────────────────

export type DialogMode = 'mark-done' | 'skip';

export interface ManualCallOutcomeDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  stepIndex: number;
  mode: DialogMode;
  actor: StoreActor;
  onSuccess?: (outcome: ManualFollowupOutcome) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManualCallOutcomeDialog({
  open,
  onClose,
  leadId,
  stepIndex,
  mode,
  actor,
  onSuccess,
}: ManualCallOutcomeDialogProps) {
  const recordFollowupOutcome = useInsuranceStore((s) => s.recordFollowupOutcome);
  const idBase = useId();

  // Default outcome by mode
  const defaultOutcome: ManualFollowupOutcome =
    mode === 'mark-done' ? 'COMPLETED_QUOTE_SHARED' : 'SKIPPED_NO_REACH';

  const [outcome, setOutcome] = useState<ManualFollowupOutcome>(defaultOutcome);
  const [notes, setNotes] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  // Confirmation state for destructive outcomes
  const [showDestructiveConfirm, setShowDestructiveConfirm] = useState(false);

  // Reset form when dialog opens/closes
  function resetForm() {
    setOutcome(mode === 'mark-done' ? 'COMPLETED_QUOTE_SHARED' : 'SKIPPED_NO_REACH');
    setNotes('');
    setNextActionAt('');
    setErrors({});
    setSubmitting(false);
    setShowDestructiveConfirm(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (notes.trim().length < 10) {
      errs.notes = 'Notes must be at least 10 characters.';
    }
    if (outcome === 'COMPLETED_FOLLOW_LATER' && !nextActionAt) {
      errs.nextActionAt = 'A follow-up date is required for this outcome.';
    }
    return errs;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmitIntent() {
    setErrors({});
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    // Show confirmation for destructive outcomes
    if (isDestructive(outcome)) {
      setShowDestructiveConfirm(true);
      return;
    }
    doSubmit();
  }

  function doSubmit() {
    setSubmitting(true);
    try {
      recordFollowupOutcome(
        leadId,
        stepIndex,
        outcome,
        notes.trim(),
        actor,
        outcome === 'COMPLETED_FOLLOW_LATER' ? new Date(nextActionAt).toISOString() : undefined,
      );
      onSuccess?.(outcome);
      handleClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Failed to record outcome.' });
      setSubmitting(false);
    }
  }

  const isDirty = notes.trim().length > 0 || nextActionAt !== '';
  const selectedConfig = OUTCOME_OPTIONS.find((o) => o.value === outcome);
  const needsNextAction = outcome === 'COMPLETED_FOLLOW_LATER';

  // Minimum date for nextActionAt = tomorrow
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={mode === 'mark-done' ? 'Mark step as done' : 'Skip follow-up step'}
        subtitle={`Lead ${leadId} — Step ${stepIndex + 1}`}
        size="md"
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
              onClick={handleSubmitIntent}
              disabled={submitting}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isDestructive(outcome)
                  ? 'bg-state-danger hover:bg-state-danger/90 focus-visible:ring-state-danger'
                  : 'bg-accent hover:bg-accent/90 focus-visible:ring-accent',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {submitting ? 'Saving…' : 'Save outcome'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Submit error */}
          {errors.submit && (
            <p className="text-[13px] text-state-danger bg-state-danger/8 border border-state-danger/20 rounded-md px-3 py-2">
              {errors.submit}
            </p>
          )}

          {/* Destructive outcome warning */}
          {isDestructive(outcome) && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-warning/8 border border-warning/20">
              <AlertTriangle
                size={15}
                className="text-warning shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-[12px] text-warning leading-relaxed">
                This step will be marked as skipped and cannot be undone.
                Provide a reason in the notes below.
              </p>
            </div>
          )}

          {/* Outcome selector */}
          <fieldset>
            <legend className="text-[13px] font-semibold text-ink-primary mb-2">
              Outcome <span className="text-state-danger">*</span>
            </legend>
            <div className="space-y-2">
              {OUTCOME_OPTIONS.filter((o) =>
                mode === 'mark-done' ? !o.destructive : o.destructive,
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors',
                    outcome === opt.value
                      ? opt.destructive
                        ? 'border-state-danger bg-state-danger/5'
                        : 'border-accent bg-accent/5'
                      : 'border-line hover:bg-bg-hover',
                  )}
                >
                  <input
                    type="radio"
                    name={`${idBase}-outcome`}
                    value={opt.value}
                    checked={outcome === opt.value}
                    onChange={() => setOutcome(opt.value)}
                    className="mt-0.5 accent-accent"
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink-primary">{opt.label}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Notes */}
          <div>
            <label
              htmlFor={`${idBase}-notes`}
              className="block text-[13px] font-semibold text-ink-primary mb-1"
            >
              Notes <span className="text-state-danger">*</span>
              <span className="ml-2 text-[11px] font-normal text-ink-muted">
                (min. 10 characters)
              </span>
            </label>
            <textarea
              id={`${idBase}-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={
                selectedConfig?.destructive
                  ? 'Explain why this step is being skipped…'
                  : 'Describe the outcome of this call…'
              }
              className={cn(
                'w-full px-3 py-2 rounded-md border bg-bg-subtle text-[13px] text-ink-primary',
                'placeholder:text-ink-muted',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                'resize-none',
                errors.notes ? 'border-state-danger' : 'border-line',
              )}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.notes ? (
                <p className="text-[11px] text-state-danger">{errors.notes}</p>
              ) : (
                <span />
              )}
              <span
                className={cn(
                  'text-[11px] tabular-nums',
                  notes.trim().length < 10 ? 'text-ink-muted' : 'text-success',
                )}
                aria-live="polite"
              >
                {notes.trim().length}/10 min
              </span>
            </div>
          </div>

          {/* Next action date — only for COMPLETED_FOLLOW_LATER */}
          {needsNextAction && (
            <div>
              <label
                htmlFor={`${idBase}-next-action`}
                className="block text-[13px] font-semibold text-ink-primary mb-1"
              >
                Follow-up date <span className="text-state-danger">*</span>
              </label>
              <input
                id={`${idBase}-next-action`}
                type="date"
                value={nextActionAt}
                min={tomorrow}
                onChange={(e) => setNextActionAt(e.target.value)}
                className={cn(
                  'h-9 w-full px-3 rounded-md border bg-bg-subtle text-[13px] text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent',
                  errors.nextActionAt ? 'border-state-danger' : 'border-line',
                )}
              />
              {errors.nextActionAt && (
                <p className="mt-1 text-[11px] text-state-danger">{errors.nextActionAt}</p>
              )}
            </div>
          )}
        </div>
      </Dialog>

      {/* Destructive confirmation */}
      <AlertDialog
        open={showDestructiveConfirm}
        onClose={() => setShowDestructiveConfirm(false)}
        title="Skip this follow-up step?"
        description={`You're about to skip step ${stepIndex + 1}. The outcome will be recorded as "${selectedConfig?.label ?? outcome}" and this cannot be undone.`}
        confirmLabel="Yes, skip step"
        cancelLabel="Go back"
        destructive
        onConfirm={() => {
          setShowDestructiveConfirm(false);
          doSubmit();
        }}
      />
    </>
  );
}
