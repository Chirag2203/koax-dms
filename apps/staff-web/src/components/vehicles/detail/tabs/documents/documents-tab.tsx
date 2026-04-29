'use client';

/**
 * DocumentsTab — category-grouped document grid + DocumentAccessEvent feed.
 *
 * RBAC:
 *   R05+ — view list + expiry chips
 *   R09+ — view preview, download, upload, replace, view activity feed
 *   R12+ — delete
 *
 * PII-heavy categories require download purpose (L13).
 * Delete on SOLD-linked doc shows blocked state (L14, S-V3-10).
 * Superseded docs shown in "Older versions" disclosure (L22, S-V3-11).
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, §5, §6, L9, L13, L14, L22, L31
 * LoC budget: ≤180
 */

import { useState, useMemo } from 'react';
import { Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@dms/ui';
import type { VehicleMaster, Document, DownloadPurpose } from '@dms/types';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { Gate } from '@/src/components/primitives';
import { ImmutableDocumentError } from '@/src/lib/vehicles/vehicles-store/slices/docs-mutations';
import { requiresDownloadPurpose } from '@/src/lib/vehicles/vehicles-store/slices/docs-access-emitter';
import { DocumentCategoryGroup } from './document-category-group';
import { UploadDocumentDialog } from './upload-document-dialog';
import { ReplaceDocumentDialog } from './replace-document-dialog';
import { DeleteDocumentDialog } from './delete-document-dialog';
import { DownloadPurposePrompt } from './download-purpose-prompt';
import { DocumentActivityFeed } from './document-activity-feed';
import type { AddDocumentInput } from '@/src/lib/vehicles/vehicles-store/slices/docs-mutations';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocumentsTabProps {
  vehicle: VehicleMaster;
}

// ─── Dialog state ─────────────────────────────────────────────────────────────

type DialogState =
  | { kind: 'none' }
  | { kind: 'upload' }
  | { kind: 'replace'; doc: Document }
  | { kind: 'delete'; doc: Document }
  | { kind: 'download-purpose'; doc: Document };

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsTab({ vehicle }: DocumentsTabProps) {
  const { user } = useStaffAuth();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Store slices
  const selectDocuments    = useVehiclesStore((s) => s.selectDocuments);
  const selectAllDocuments = useVehiclesStore((s) => s.selectAllDocuments);
  const selectStaffMeta    = useVehiclesStore((s) => s.selectStaffMeta);
  const selectAccessEvents = useVehiclesStore((s) => s.selectDocumentAccessEvents);
  const salesOrderIsSold   = useVehiclesStore((s) => s.salesOrderIsSold);
  const addDocument        = useVehiclesStore((s) => s.addDocument);
  const replaceDocument    = useVehiclesStore((s) => s.replaceDocument);
  const softDeleteDocument = useVehiclesStore((s) => s.softDeleteDocument);
  const recordDownload     = useVehiclesStore((s) => s.recordDownload);

  const actor = useMemo(
    () => ({ id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown', role: user?.role }),
    [user],
  );

  // Docs for this VIN
  const docs = selectDocuments(vehicle.vin);
  const allDocs = selectAllDocuments(vehicle.vin);
  const accessEvents = selectAccessEvents(vehicle.vin);

  // Build metaMap + supersededMap
  const metaMap = useMemo(
    () => Object.fromEntries(docs.map((d) => [d.id, selectStaffMeta(d.id)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [docs],
  );

  // supersededMap: maps active doc ID → list of older versions it replaced
  const supersededMap = useMemo(() => {
    const result: Record<string, Document[]> = {};
    for (const doc of docs) {
      // Find older docs in allDocs whose supersededBy === this doc's id, or that this doc replaced
      const older = allDocs.filter(
        (old) => old.supersededBy === doc.id || (old.supersededBy && old.vehicleVin === vehicle.vin && !docs.find((d) => d.id === old.id)),
      );
      if (older.length > 0) result[doc.id] = older;
    }
    return result;
  }, [docs, allDocs, vehicle.vin]);

  // Group docs by their type category
  const grouped = useMemo(() => {
    const groups: Record<string, Document[]> = {};
    for (const doc of docs) {
      const cat = doc.type;
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(doc);
    }
    return groups;
  }, [docs]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleDownload(doc: Document) {
    const meta = selectStaffMeta(doc.id);
    // Determine category — check meta for staff category or use doc.type
    const category = doc.type;
    if (requiresDownloadPurpose(category)) {
      setDialog({ kind: 'download-purpose', doc });
      return;
    }
    // Non-PII: log DOWNLOAD event + open URL
    recordDownload(doc.id, vehicle.vin, undefined, undefined, actor);
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  }

  function handleDownloadWithPurpose(purpose: DownloadPurpose, purposeNote?: string) {
    if (dialog.kind !== 'download-purpose') return;
    const { doc } = dialog;
    recordDownload(doc.id, vehicle.vin, purpose, purposeNote, actor);
    window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    setDialog({ kind: 'none' });
  }

  function handleUpload(input: Parameters<typeof addDocument>[0]) {
    addDocument(input, actor);
    setDialog({ kind: 'none' });
  }

  function handleReplace(doc: Document, input: Omit<AddDocumentInput, 'vin' | 'type' | 'category'>) {
    replaceDocument(doc.id, {
      vin: vehicle.vin,
      type: doc.type,
      category: doc.type as AddDocumentInput['category'],
      ...input,
    }, actor);
    setDialog({ kind: 'none' });
  }

  function handleDelete(doc: Document, reason: string) {
    try {
      softDeleteDocument(doc.id, reason || undefined, actor);
    } catch (err) {
      if (err instanceof ImmutableDocumentError) {
        // Already emitted a blocked DELETE event — dialog shows blocked UI
      }
    }
    setDialog({ kind: 'none' });
  }

  const isBlockedBySale = useMemo(() => {
    if (dialog.kind !== 'delete') return false;
    const meta = selectStaffMeta(dialog.doc.id);
    return Boolean(meta?.supportingSalesOrderId && salesOrderIsSold(meta.supportingSalesOrderId));
  }, [dialog, selectStaffMeta, salesOrderIsSold]);

  const deleteMeta = dialog.kind === 'delete' ? selectStaffMeta(dialog.doc.id) : undefined;

  const categoryOrder = [
    'rc', 'insurance', 'puc', 'warranty', 'invoice',
    'service-record', 'purchase-agreement', 'inspection-report',
    'tcs-certificate-27d', 'form-29-30', 'noc',
    'consignment-agreement', 'cpo-certificate', 'sale-agreement',
  ];

  const orderedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="text-sm font-semibold text-ink-primary">
            Documents
            <span className="ml-2 text-xs font-normal text-ink-muted">({docs.length})</span>
          </h3>
          <Gate role={['R09', 'R10', 'R12', 'R13', 'R16', 'R19', 'R22', 'R24']}>
            <button
              type="button"
              onClick={() => setDialog({ kind: 'upload' })}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium',
                'border border-line bg-bg-canvas text-ink-secondary hover:bg-bg-subtle transition-colors',
              )}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Upload
            </button>
          </Gate>
        </div>

        {/* Category-grouped grid */}
        {docs.length > 0 ? (
          <div className="px-6 py-5 space-y-6">
            {orderedCategories.map((cat) => (
              <DocumentCategoryGroup
                key={cat}
                category={cat}
                docs={grouped[cat] ?? []}
                metaMap={metaMap}
                supersededMap={supersededMap}
                onDownload={handleDownload}
                onReplace={(doc) => setDialog({ kind: 'replace', doc })}
                onDelete={(doc) => setDialog({ kind: 'delete', doc })}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-ink-muted">No documents uploaded for this vehicle yet.</p>
          </div>
        )}
      </div>

      {/* ── Activity feed (R09+, L33) ────────────────────────────────────────── */}
      <Gate role={['R09', 'R10', 'R12', 'R13', 'R16', 'R19', 'R22', 'R24']}>
        <div className="rounded-md border border-line bg-bg-surface overflow-hidden">
          <button
            type="button"
            onClick={() => setActivityExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 border-b border-line text-left"
          >
            <h3 className="text-sm font-semibold text-ink-primary">
              Document Activity
              <span className="ml-2 text-xs font-normal text-ink-muted">
                ({accessEvents.length})
              </span>
            </h3>
            {activityExpanded
              ? <ChevronUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              : <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            }
          </button>
          {activityExpanded && (
            <div className="px-6 py-4">
              <DocumentActivityFeed events={accessEvents} />
            </div>
          )}
        </div>
      </Gate>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      {dialog.kind !== 'none' && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setDialog({ kind: 'none' }); }}
        >
          {dialog.kind === 'upload' && (
            <UploadDocumentDialog
              vin={vehicle.vin}
              onUpload={(input) => handleUpload({
                vin: vehicle.vin,
                type: input.category as Document['type'],
                category: input.category as AddDocumentInput['category'],
                name: input.name,
                fileUrl: input.fileUrl,
                fileSize: input.fileSize,
                subtype: input.subtype,
                expiresAt: input.expiresAt,
                purposeOfCollection: input.purposeOfCollection,
              })}
              onClose={() => setDialog({ kind: 'none' })}
            />
          )}

          {dialog.kind === 'replace' && (
            <ReplaceDocumentDialog
              doc={dialog.doc}
              meta={selectStaffMeta(dialog.doc.id)}
              vin={vehicle.vin}
              onReplace={(input) => handleReplace(dialog.doc, input)}
              onClose={() => setDialog({ kind: 'none' })}
            />
          )}

          {dialog.kind === 'delete' && (
            <DeleteDocumentDialog
              doc={dialog.doc}
              meta={deleteMeta}
              isBlockedBySale={isBlockedBySale}
              salesOrderId={deleteMeta?.supportingSalesOrderId}
              onDelete={(reason) => handleDelete(dialog.doc, reason)}
              onReplaceInstead={() => setDialog({ kind: 'replace', doc: dialog.doc })}
              onClose={() => setDialog({ kind: 'none' })}
            />
          )}

          {dialog.kind === 'download-purpose' && (
            <DownloadPurposePrompt
              docName={dialog.doc.name}
              onConfirm={handleDownloadWithPurpose}
              onCancel={() => setDialog({ kind: 'none' })}
            />
          )}
        </div>
      )}
    </div>
  );
}
