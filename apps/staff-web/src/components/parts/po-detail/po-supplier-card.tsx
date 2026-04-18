/**
 * PoSupplierCard — sidebar card showing supplier details.
 *
 * Spec reference: PLAN-PARTS-006 §4.3
 */

import type { Supplier } from '@dms/types';
import Link from 'next/link';

export interface PoSupplierCardProps {
  supplier: Supplier | undefined;
}

export function PoSupplierCard({ supplier }: PoSupplierCardProps) {
  if (!supplier) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-4">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
          Supplier
        </h3>
        <p className="text-sm text-ink-muted">Supplier details unavailable.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
        Supplier
      </h3>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-primary">{supplier.name}</span>
        {supplier.gstin && (
          <Row label="GSTIN">
            <span className="font-mono text-[12px]">{supplier.gstin}</span>
          </Row>
        )}
        <Row label="Currency">
          <span className="font-mono text-[12px]">
            {supplier.currency}
            {supplier.isImport && (
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded bg-bg-subtle text-[10px] font-mono uppercase tracking-wider text-ink-secondary">
                Import
              </span>
            )}
          </span>
        </Row>
        <Row label="Terms">
          <span className="text-[12px]">{supplier.paymentTerms}</span>
        </Row>
        {supplier.contact && (
          <Row label="Contact">
            <a
              href={`tel:${supplier.contact}`}
              className="text-[12px] text-accent hover:underline"
            >
              {supplier.contact}
            </a>
          </Row>
        )}
        <Row label="Address">
          <span className="text-[12px] text-ink-secondary">{supplier.address}</span>
        </Row>
      </div>
      <div className="mt-3 pt-3 border-t border-line">
        <Link
          href="/parts?tab=suppliers"
          className="text-[12px] text-accent hover:underline"
        >
          View in Suppliers tab →
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted shrink-0">
        {label}
      </span>
      <span className="text-right">{children}</span>
    </div>
  );
}
