'use client';

/**
 * ReplaceDocumentDialog — upload a new version that supersedes the current one.
 *
 * Increments version number + sets old.supersededBy (S-V3-11, L22).
 * The old doc moves to "Older versions" disclosure on DocumentCard.
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, §5, S-V3-11, L22
 * LoC budget: ≤180
 */

import { useState } from 'react';
import { RefreshCw, X, FileText } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Document, StaffDocumentMetadata } from '@dms/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ReplaceDocumentDialogProps {
  doc: Document;
  meta: StaffDocumentMetadata | undefined;
  vin: string;
  onReplace: (input: {
    name: string;
    fileUrl: string;
    fileSize: string;
    expiresAt?: string;
    purposeOfCollection?: string;
  }) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReplaceDocumentDialog({
  doc,
  meta,
  vin,
  onReplace,
  onClose,
}: ReplaceDocumentDialogProps) {
  const currentVersion = meta?.version ?? 1;
  const nextVersion = currentVersion + 1;

  const [name, setName] = useState(doc.name);
  const [expiresAt, setExpiresAt] = useState('');
  const [purposeOfCollection, setPurposeOfCollection] = useState(
    meta?.purposeOfCollection ?? '',
  );
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() !== '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    const safeName = name.trim().replace(/\s+/g, '_');
    const fileUrl = `/api/staff/inventory/vehicles/${vin}/documents/replace_${safeName}`;

    onReplace({
      name: name.trim(),
      fileUrl,
      fileSize: '—',
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      ...(purposeOfCollection.trim() ? { purposeOfCollection: purposeOfCollection.trim() } : {}),
    });
  }

  const inputClass = cn(
    'w-full rounded-md border border-line bg-bg-canvas px-3 py-2',
    'text-sm text-ink-primary placeholder:text-ink-muted',
    'focus:outline-none focus:ring-1 focus:ring-accent',
  );
  const labelClass = 'block text-xs font-medium text-ink-secondary mb-1';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Replace document"
      className="rounded-lg border border-line bg-bg-surface p-5 shadow-lg w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink-primary">Replace Document</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-7 w-7 flex items-center justify-center rounded text-ink-muted hover:text-ink-secondary hover:bg-bg-subtle transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Current doc info */}
      <div className="flex items-center gap-2 rounded-md bg-bg-subtle border border-line px-3 py-2.5 mb-4">
        <FileText className="h-4 w-4 text-ink-muted shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-ink-primary truncate">{doc.name}</p>
          <p className="text-[10px] text-ink-muted">
            Current: v{currentVersion} → New: v{nextVersion}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="replace-name" className={labelClass}>
            New document name <span className="text-[rgb(var(--state-overdue))]">*</span>
          </label>
          <input
            id="replace-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="replace-expiry" className={labelClass}>
            New expiry date (optional)
          </label>
          <input
            id="replace-expiry"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {meta?.purposeOfCollection !== undefined && (
          <div>
            <label htmlFor="replace-purpose" className={labelClass}>
              Purpose of collection (DPDP Act 2023)
            </label>
            <textarea
              id="replace-purpose"
              value={purposeOfCollection}
              onChange={(e) => setPurposeOfCollection(e.target.value)}
              rows={2}
              className={cn(inputClass, 'resize-none')}
            />
          </div>
        )}

        <p className="text-xs text-ink-muted bg-bg-subtle rounded-md px-3 py-2 border border-line">
          The current version will be moved to "Older versions" and remain accessible for reference.
        </p>

        {error && (
          <p className="text-xs text-[rgb(var(--state-overdue))]">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-md text-xs border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'h-8 px-4 rounded-md text-xs font-medium transition-colors',
              canSubmit
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-bg-subtle text-ink-muted cursor-not-allowed',
            )}
          >
            Replace (v{nextVersion})
          </button>
        </div>
      </form>
    </div>
  );
}
