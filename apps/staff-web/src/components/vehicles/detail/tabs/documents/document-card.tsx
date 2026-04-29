'use client';

/**
 * DocumentCard — single document card with icon, name, version, expiry chip, actions.
 *
 * Actions:
 *   View/Download — R09+ (PII-heavy opens DownloadPurposePrompt)
 *   Replace        — R09+
 *   Delete         — R12+ (shows blocked dialog if SOLD-linked)
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, §5, §6 RBAC table
 * LoC budget: ≤160
 */

import { useState } from 'react';
import { FileText, Download, RefreshCw, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@dms/ui';
import { documentExpiryChip } from '@dms/vehicles-core';
import type { Document, StaffDocumentMetadata } from '@dms/types';
import { Gate } from '@/src/components/primitives';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocumentCardProps {
  doc: Document;
  meta: StaffDocumentMetadata | undefined;
  supersededVersions?: Document[];
  onDownload: (doc: Document) => void;
  onReplace: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

// ─── Expiry chip ──────────────────────────────────────────────────────────────

function ExpiryChip({ expiresAt }: { expiresAt?: string }) {
  const chip = documentExpiryChip(expiresAt, new Date().toISOString());
  if (!chip) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
        chip === 'expired'
          ? 'bg-[rgb(var(--state-overdue)/0.12)] text-[rgb(var(--state-overdue))] border-[rgb(var(--state-overdue)/0.25)]'
          : 'bg-[rgb(var(--state-stale)/0.12)] text-[rgb(var(--state-stale))] border-[rgb(var(--state-stale)/0.25)]',
      )}
    >
      {chip === 'expired' ? 'Expired' : 'Expiring soon'}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentCard({
  doc,
  meta,
  supersededVersions = [],
  onDownload,
  onReplace,
  onDelete,
}: DocumentCardProps) {
  const [showOlder, setShowOlder] = useState(false);
  const version = meta?.version ?? 1;
  const isSuperseded = Boolean(doc.supersededBy);

  return (
    <div
      className={cn(
        'rounded-md border border-line bg-bg-surface overflow-hidden',
        isSuperseded && 'opacity-60',
      )}
    >
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-md bg-bg-subtle border border-line text-ink-muted">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-ink-primary truncate max-w-[200px]" title={doc.name}>
              {doc.name}
            </p>
            <span className="text-[10px] font-mono text-ink-muted bg-bg-subtle border border-line px-1.5 py-0.5 rounded">
              v{version}
            </span>
            {isSuperseded && (
              <span className="text-[10px] font-medium text-ink-muted border border-line px-1.5 py-0.5 rounded">
                Replaced
              </span>
            )}
            <ExpiryChip expiresAt={doc.expiresAt} />
          </div>
          <p className="text-xs text-ink-muted mt-0.5">{doc.fileSize}</p>
          {doc.expiresAt && (
            <p className="text-xs text-ink-muted">
              Expires{' '}
              {new Date(doc.expiresAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Gate role={['R09', 'R10', 'R12', 'R13', 'R16', 'R19', 'R22', 'R24']}>
            <button
              type="button"
              onClick={() => onDownload(doc)}
              aria-label="View / Download document"
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded text-ink-secondary',
                'hover:bg-bg-subtle hover:text-ink-primary transition-colors',
              )}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Gate>

          <Gate role={['R09', 'R10', 'R12', 'R13', 'R16', 'R19', 'R22', 'R24']}>
            <button
              type="button"
              onClick={() => onDownload(doc)}
              aria-label="Download document"
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded text-ink-secondary',
                'hover:bg-bg-subtle hover:text-ink-primary transition-colors',
              )}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Gate>

          <Gate role={['R09', 'R10', 'R12', 'R13', 'R16', 'R19', 'R22', 'R24']}>
            <button
              type="button"
              onClick={() => onReplace(doc)}
              aria-label="Replace document"
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded text-ink-secondary',
                'hover:bg-bg-subtle hover:text-ink-primary transition-colors',
              )}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Gate>

          <Gate role={['R12', 'R13', 'R16', 'R19', 'R22', 'R24']}>
            <button
              type="button"
              onClick={() => onDelete(doc)}
              aria-label="Delete document"
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded text-ink-secondary',
                'hover:bg-bg-subtle hover:text-[rgb(var(--state-overdue))] transition-colors',
              )}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </Gate>
        </div>
      </div>

      {/* Older versions disclosure (L22) */}
      {supersededVersions.length > 0 && (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setShowOlder((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs text-ink-muted hover:text-ink-secondary transition-colors"
          >
            <span>Older versions ({supersededVersions.length})</span>
            {showOlder
              ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            }
          </button>
          {showOlder && (
            <div className="px-4 pb-3 space-y-1">
              {supersededVersions.map((old) => (
                <div key={old.id} className="flex items-center gap-2 text-xs text-ink-muted py-1">
                  <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate flex-1">{old.name}</span>
                  <span className="font-mono text-[10px]">v{(old.id)}</span>
                  <span className="text-[10px]">
                    {new Date(old.uploadedAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
