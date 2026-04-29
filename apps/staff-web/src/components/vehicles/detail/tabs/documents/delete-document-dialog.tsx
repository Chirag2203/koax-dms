'use client';

/**
 * DeleteDocumentDialog — soft-delete confirmation.
 *
 * Shows a BLOCKED state (with "Upload replacement" CTA) when the document is
 * linked to a closed sales order (L14 immutable-after-sale guard).
 * When not blocked, shows a reason text input + confirm button (R12+).
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, §6, L14, S-V3-10
 * LoC budget: ≤140
 */

import { useState } from 'react';
import { Trash2, Lock, X, AlertTriangle } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Document, StaffDocumentMetadata } from '@dms/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DeleteDocumentDialogProps {
  doc: Document;
  meta: StaffDocumentMetadata | undefined;
  /** Whether this doc is linked to a SOLD (closed) sales order (L14) */
  isBlockedBySale: boolean;
  salesOrderId?: string;
  onDelete: (reason: string) => void;
  onReplaceInstead: () => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteDocumentDialog({
  doc,
  isBlockedBySale,
  salesOrderId,
  onDelete,
  onReplaceInstead,
  onClose,
}: DeleteDocumentDialogProps) {
  const [reason, setReason] = useState('');

  const inputClass = cn(
    'w-full rounded-md border border-line bg-bg-canvas px-3 py-2',
    'text-sm text-ink-primary placeholder:text-ink-muted',
    'focus:outline-none focus:ring-1 focus:ring-accent resize-none',
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Delete document"
      className="rounded-lg border border-line bg-bg-surface p-5 shadow-lg w-full max-w-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isBlockedBySale
            ? <Lock className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
            : <Trash2 className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          }
          <h3 className="text-sm font-semibold text-ink-primary">
            {isBlockedBySale ? 'Delete blocked' : 'Delete document'}
          </h3>
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

      {/* Document name */}
      <p className="text-sm font-medium text-ink-primary mb-3 truncate">{doc.name}</p>

      {isBlockedBySale ? (
        /* Blocked state (L14, S-V3-10) */
        <>
          <div className="flex items-start gap-2 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.25)] px-3 py-3 mb-4">
            <AlertTriangle
              className="h-4 w-4 text-[rgb(var(--state-overdue))] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-medium text-ink-primary">
                Document linked to a completed sale
              </p>
              <p className="text-xs text-ink-secondary mt-0.5">
                This document supports sales order{' '}
                <span className="font-mono">{salesOrderId}</span>. Deleting documents
                linked to closed sales is not permitted (compliance requirement).
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-md text-xs border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onReplaceInstead}
              className="h-8 px-4 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              Upload replacement
            </button>
          </div>
        </>
      ) : (
        /* Normal delete flow */
        <>
          <div className="mb-4">
            <label htmlFor="delete-reason" className="block text-xs font-medium text-ink-secondary mb-1">
              Reason for deletion (optional)
            </label>
            <textarea
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Uploaded incorrect file…"
              rows={2}
              className={inputClass}
            />
          </div>

          <p className="text-xs text-ink-muted mb-4">
            This is a soft-delete. The document will be hidden from the main list
            but remains on the audit trail.
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-md text-xs border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onDelete(reason)}
              className="h-8 px-4 rounded-md text-xs font-medium bg-[rgb(var(--state-overdue))] text-white hover:opacity-90 transition-colors"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
