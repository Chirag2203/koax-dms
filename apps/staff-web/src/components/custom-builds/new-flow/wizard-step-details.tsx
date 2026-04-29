/**
 * Wizard Step 3 — Build details.
 *
 * Fields: title (required), description/notes, target completion date, priority.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 P1.1 Issue 6 Step 3
 */

'use client';

import type { WizardData } from './new-build-wizard';

interface Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

export function WizardStepDetails({ data, onUpdate }: Props) {
  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-primary">Build Details</h2>
        <p className="text-[13px] text-ink-muted mt-0.5">Describe what this build job involves.</p>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="build-title" className="block text-[12px] font-medium text-ink-secondary mb-1.5">
          Job Title <span className="text-state-danger" aria-hidden="true">*</span>
        </label>
        <input
          id="build-title"
          type="text"
          value={data.title}
          onChange={(e) => onUpdate({ ...data, title: e.target.value })}
          placeholder="e.g. Aero Package + Stage 2 ECU Tune"
          className="w-full h-9 px-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          aria-required="true"
          autoFocus
        />
        {!data.title.trim() && (
          <p className="text-[11px] text-ink-muted mt-1">Required</p>
        )}
      </div>

      {/* Enquiry notes */}
      <div>
        <label htmlFor="build-notes" className="block text-[12px] font-medium text-ink-secondary mb-1.5">
          Enquiry Notes
        </label>
        <textarea
          id="build-notes"
          value={data.enquiryNotes}
          onChange={(e) => onUpdate({ ...data, enquiryNotes: e.target.value })}
          rows={4}
          placeholder="Customer's requirements, preferences, reference links..."
          className="w-full rounded-md bg-bg-subtle border border-line px-3 py-2 text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          aria-label="Enquiry notes"
        />
      </div>

      {/* Target completion date */}
      <div>
        <label htmlFor="target-date" className="block text-[12px] font-medium text-ink-secondary mb-1.5">
          Target Completion Date
        </label>
        <input
          id="target-date"
          type="date"
          value={data.targetCompletionDate}
          onChange={(e) => onUpdate({ ...data, targetCompletionDate: e.target.value })}
          className="w-48 h-9 px-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          aria-label="Target completion date"
        />
      </div>
    </div>
  );
}
