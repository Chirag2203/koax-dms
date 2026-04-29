'use client';

/**
 * UploadDocumentDialog — upload flow with category picker +
 * purpose-of-collection field for PII-heavy categories.
 *
 * DPDP guard: purposeOfCollection required for rc, insurance, noc,
 *             form-29-30, tcs-certificate-27d (L13 + S-V3-9).
 * The slice-level guard (PurposeRequiredError) is the authoritative check;
 * this form adds UI-level validation for better UX.
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, §5, L13
 * LoC budget: ≤260
 */

import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn } from '@dms/ui';
import type { StaffDocumentCategory } from '@dms/types';
import { requiresDownloadPurpose } from '@/src/lib/vehicles/vehicles-store/slices/docs-access-emitter';

// ─── Category options ─────────────────────────────────────────────────────────

interface CategoryOption {
  value: StaffDocumentCategory | string;
  label: string;
  group: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  // Portal-visible categories (map to portal Document.type)
  { value: 'rc',               label: 'Registration Certificate (RC)', group: 'Vehicle' },
  { value: 'insurance',        label: 'Insurance Policy',               group: 'Vehicle' },
  { value: 'puc',              label: 'PUC Certificate',                group: 'Vehicle' },
  { value: 'inspection-report',label: 'Inspection Report',              group: 'Vehicle' },
  // Staff-only categories (L10)
  { value: 'noc',              label: 'NOC',                            group: 'Transfer' },
  { value: 'form-29-30',       label: 'Form 29/30',                     group: 'Transfer' },
  { value: 'tcs-certificate-27d', label: 'TCS Certificate (27D)',       group: 'Tax' },
  { value: 'consignment-agreement', label: 'Consignment Agreement',     group: 'Agreements' },
  { value: 'cpo-certificate',  label: 'CPO Certificate',                group: 'Agreements' },
  { value: 'sale-agreement',   label: 'Sale Agreement',                 group: 'Agreements' },
  { value: 'invoice',          label: 'Invoice',                        group: 'Finance' },
  { value: 'service-record',   label: 'Service Record',                 group: 'Finance' },
  { value: 'purchase-agreement', label: 'Purchase Agreement',           group: 'Finance' },
  { value: 'warranty',         label: 'Warranty Document',              group: 'Finance' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UploadDocumentDialogProps {
  vin: string;
  onUpload: (input: {
    category: string;
    name: string;
    fileUrl: string;
    fileSize: string;
    subtype?: 'financier' | 'rto';
    expiresAt?: string;
    purposeOfCollection?: string;
  }) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UploadDocumentDialog({ vin, onUpload, onClose }: UploadDocumentDialogProps) {
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [subtype, setSubtype] = useState<'financier' | 'rto' | ''>('');
  const [expiresAt, setExpiresAt] = useState('');
  const [purposeOfCollection, setPurposeOfCollection] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isPiiHeavy = category ? requiresDownloadPurpose(category) : false;
  const isNoc = category === 'noc';

  const canSubmit =
    category.trim() !== '' &&
    name.trim() !== '' &&
    (!isPiiHeavy || purposeOfCollection.trim() !== '') &&
    (!isNoc || subtype !== '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      if (isPiiHeavy && !purposeOfCollection.trim()) {
        setError('Purpose of collection is required for this document category (DPDP Act 2023).');
        return;
      }
      return;
    }

    // Simulate a file URL for demo (real upload would return a presigned URL)
    const safeName = name.trim().replace(/\s+/g, '_');
    const fileUrl = `/api/staff/inventory/vehicles/${vin}/documents/${safeName}`;

    onUpload({
      category,
      name: name.trim(),
      fileUrl,
      fileSize: '—',
      ...(subtype ? { subtype: subtype as 'financier' | 'rto' } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
      ...(purposeOfCollection ? { purposeOfCollection: purposeOfCollection.trim() } : {}),
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
      aria-label="Upload document"
      className="rounded-lg border border-line bg-bg-surface p-5 shadow-lg w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-ink-primary">Upload Document</h3>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category */}
        <div>
          <label htmlFor="doc-category" className={labelClass}>
            Category <span className="text-[rgb(var(--state-overdue))]">*</span>
          </label>
          <select
            id="doc-category"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setError(null); }}
            className={cn(inputClass, 'appearance-none')}
            required
          >
            <option value="">Select category…</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.group})
              </option>
            ))}
          </select>
        </div>

        {/* NOC subtype */}
        {isNoc && (
          <div>
            <label htmlFor="doc-subtype" className={labelClass}>
              NOC Type <span className="text-[rgb(var(--state-overdue))]">*</span>
            </label>
            <select
              id="doc-subtype"
              value={subtype}
              onChange={(e) => setSubtype(e.target.value as 'financier' | 'rto')}
              className={cn(inputClass, 'appearance-none')}
              required
            >
              <option value="">Select type…</option>
              <option value="financier">Financier NOC</option>
              <option value="rto">RTO NOC</option>
            </select>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="doc-name" className={labelClass}>
            Document name <span className="text-[rgb(var(--state-overdue))]">*</span>
          </label>
          <input
            id="doc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. RC_Certificate_2026.pdf"
            className={inputClass}
            required
          />
        </div>

        {/* Expiry date (optional) */}
        <div>
          <label htmlFor="doc-expiry" className={labelClass}>
            Expiry date (optional)
          </label>
          <input
            id="doc-expiry"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Purpose of collection — required for PII-heavy categories (S-V3-9) */}
        {isPiiHeavy && (
          <div>
            <label htmlFor="doc-purpose" className={labelClass}>
              Purpose of collection{' '}
              <span className="text-[rgb(var(--state-overdue))]">*</span>
              <span className="ml-1 text-ink-muted font-normal">(DPDP Act 2023)</span>
            </label>
            <textarea
              id="doc-purpose"
              value={purposeOfCollection}
              onChange={(e) => { setPurposeOfCollection(e.target.value); setError(null); }}
              placeholder="e.g. Required for RTO transfer process — RC collected with owner consent"
              rows={2}
              className={cn(inputClass, 'resize-none')}
              required
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs text-[rgb(var(--state-overdue))] bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.25)] rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
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
            Upload
          </button>
        </div>
      </form>
    </div>
  );
}
