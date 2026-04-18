/**
 * GrnSupplierReceiptCard — 2-col card pair: Supplier Details + Receipt Details.
 *
 * Spec reference: PLAN-PARTS-006 §5.2
 */

import type { Grn, PurchaseOrder, Supplier } from '@dms/types';
import Link from 'next/link';
import { staffName, formatDateTime } from '../helpers';

export interface GrnSupplierReceiptCardProps {
  grn: Grn;
  supplier: Supplier | undefined;
  po: PurchaseOrder | undefined;
}

export function GrnSupplierReceiptCard({
  grn,
  supplier,
  po,
}: GrnSupplierReceiptCardProps) {
  return (
    <section className="rounded-md border border-line bg-bg-surface p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Details */}
        <div>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
            Supplier Details
          </h3>
          {supplier ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink-primary">{supplier.name}</span>
              {supplier.gstin && (
                <LabelRow label="GSTIN">
                  <span className="font-mono text-[12px]">{supplier.gstin}</span>
                </LabelRow>
              )}
              <LabelRow label="Address">
                <span className="text-[12px]">{supplier.address}</span>
              </LabelRow>
              {supplier.contact && (
                <LabelRow label="Contact">
                  <a href={`tel:${supplier.contact}`} className="text-[12px] text-accent hover:underline">
                    {supplier.contact}
                  </a>
                </LabelRow>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Supplier details unavailable.</p>
          )}
        </div>

        {/* Receipt Details */}
        <div>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
            Receipt Details
          </h3>
          <div className="flex flex-col gap-2">
            {po ? (
              <LabelRow label="PO Reference">
                <Link
                  href={`/parts/po/${po.id}`}
                  className="font-mono text-[12px] text-accent hover:underline"
                >
                  {po.poNo}
                </Link>
              </LabelRow>
            ) : (
              <LabelRow label="PO Reference">
                <span className="text-[12px] text-ink-muted">Walk-in receipt</span>
              </LabelRow>
            )}
            <LabelRow label="Received By">
              <span className="text-[12px] text-ink-primary">{staffName(grn.receivedBy)}</span>
            </LabelRow>
            <LabelRow label="Received At">
              <span className="font-mono text-[12px] text-ink-secondary">{formatDateTime(grn.receivedAt)}</span>
            </LabelRow>
            <LabelRow label="Lines">
              <span className="font-mono text-[12px] text-ink-primary">{grn.lines.length}</span>
            </LabelRow>
          </div>
        </div>
      </div>
    </section>
  );
}

function LabelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted shrink-0">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
