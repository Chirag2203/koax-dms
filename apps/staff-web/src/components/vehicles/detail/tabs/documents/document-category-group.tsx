'use client';

/**
 * DocumentCategoryGroup — renders a category header + grid of DocumentCards.
 *
 * Categories defined in §4.2:
 *   Portal categories: rc, insurance, puc, warranty, invoice, service-record,
 *                      purchase-agreement, inspection-report
 *   Staff categories:  tcs-certificate-27d, form-29-30, noc,
 *                      consignment-agreement, cpo-certificate, sale-agreement
 *
 * Spec reference: PLAN-VEHICLES-003 §4.2, §5, L10
 * LoC budget: ≤120
 */

import type { Document, StaffDocumentMetadata } from '@dms/types';
import { DocumentCard } from './document-card';

// ─── Category label map ───────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  // Portal document types
  rc: 'Registration Certificate',
  insurance: 'Insurance Policy',
  puc: 'PUC Certificate',
  warranty: 'Warranty Documents',
  invoice: 'Invoice',
  'service-record': 'Service Records',
  'purchase-agreement': 'Purchase Agreement',
  'inspection-report': 'Inspection Reports',
  // Staff-only categories (L10)
  'tcs-certificate-27d': 'TCS Certificate (27D)',
  'form-29-30': 'Form 29/30',
  noc: 'NOC',
  'consignment-agreement': 'Consignment Agreement',
  'cpo-certificate': 'CPO Certificate',
  'sale-agreement': 'Sale Agreement',
  // Fallback
  other: 'Other Documents',
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DocumentCategoryGroupProps {
  category: string;
  docs: Document[];
  metaMap: Record<string, StaffDocumentMetadata | undefined>;
  /** Maps docId → list of superseded (older) versions */
  supersededMap: Record<string, Document[]>;
  onDownload: (doc: Document) => void;
  onReplace: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentCategoryGroup({
  category,
  docs,
  metaMap,
  supersededMap,
  onDownload,
  onReplace,
  onDelete,
}: DocumentCategoryGroupProps) {
  if (docs.length === 0) return null;

  const label = CATEGORY_LABELS[category] ?? category;

  return (
    <div>
      <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
        {label}
        <span className="ml-2 text-[10px] font-normal text-ink-muted normal-case">
          ({docs.length})
        </span>
      </h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {docs.map((doc) => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            meta={metaMap[doc.id]}
            supersededVersions={supersededMap[doc.id] ?? []}
            onDownload={onDownload}
            onReplace={onReplace}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
