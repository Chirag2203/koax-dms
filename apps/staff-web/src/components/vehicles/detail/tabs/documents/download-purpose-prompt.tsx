'use client';

/**
 * DownloadPurposePrompt — required purpose selector before downloading
 * PII-heavy categories (L13): rc, insurance, noc, form-29-30, tcs-certificate-27d.
 *
 * Appears as an inline dialog overlay. Blocks download until purpose is selected.
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, L13, S-V3-12
 * LoC budget: ≤120
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@dms/ui';
import type { DownloadPurpose } from '@dms/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPOSE_OPTIONS: { value: DownloadPurpose; label: string }[] = [
  { value: 'CUSTOMER_HANDOFF', label: 'Customer handoff' },
  { value: 'RTO_FILING',       label: 'RTO filing / transfer' },
  { value: 'AUDIT',            label: 'Internal audit' },
  { value: 'OTHER',            label: 'Other (specify below)' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DownloadPurposePromptProps {
  docName: string;
  onConfirm: (purpose: DownloadPurpose, purposeNote?: string) => void;
  onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DownloadPurposePrompt({
  docName,
  onConfirm,
  onCancel,
}: DownloadPurposePromptProps) {
  const [selected, setSelected] = useState<DownloadPurpose | ''>('');
  const [note, setNote] = useState('');

  const needsNote = selected === 'OTHER';
  const canConfirm = selected !== '' && (!needsNote || note.trim().length > 0);

  function handleConfirm() {
    if (!canConfirm || !selected) return;
    onConfirm(selected as DownloadPurpose, needsNote ? note.trim() : undefined);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Download purpose required"
      className="rounded-lg border border-line bg-bg-surface p-5 shadow-lg max-w-sm w-full"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-[rgb(var(--state-stale))] shrink-0" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink-primary">Purpose required</h3>
      </div>

      <p className="text-xs text-ink-secondary mb-4">
        <span className="font-medium text-ink-primary">{docName}</span> contains PII.
        Select the reason for this download to comply with DPDP Act 2023.
      </p>

      <div className="space-y-2 mb-4">
        {PURPOSE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors',
              selected === opt.value
                ? 'border-accent bg-[rgb(var(--accent)/0.08)] text-ink-primary'
                : 'border-line bg-bg-canvas text-ink-secondary hover:border-accent/50',
            )}
          >
            <input
              type="radio"
              name="download-purpose"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="accent-[rgb(var(--accent))]"
            />
            {opt.label}
          </label>
        ))}
      </div>

      {needsNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Describe the purpose…"
          rows={2}
          className={cn(
            'w-full mb-4 rounded-md border border-line bg-bg-canvas px-3 py-2',
            'text-sm text-ink-primary placeholder:text-ink-muted',
            'focus:outline-none focus:ring-1 focus:ring-accent resize-none',
          )}
        />
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-md text-xs border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className={cn(
            'h-8 px-4 rounded-md text-xs font-medium transition-colors',
            canConfirm
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-bg-subtle text-ink-muted cursor-not-allowed',
          )}
        >
          Download
        </button>
      </div>
    </div>
  );
}
