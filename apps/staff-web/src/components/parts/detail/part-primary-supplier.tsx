/**
 * PartPrimarySupplier — sidebar card showing supplierIds[0] + "+N alternates".
 *
 * Opens a SlideInPanel listing alternate suppliers when the part has more
 * than one. No navigation — staying in the detail page is cleaner UX.
 *
 * Spec reference: PLAN-PARTS-003 §12
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Part, Supplier } from '@dms/types';
import { SlideInPanel } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';

export interface PartPrimarySupplierProps {
  part: Part;
}

export function PartPrimarySupplier({ part }: PartPrimarySupplierProps) {
  const suppliers = usePartsStore((s) => s.suppliers);
  const [altOpen, setAltOpen] = useState(false);

  const primary: Supplier | undefined = useMemo(() => {
    const primaryId = part.supplierIds[0];
    if (!primaryId) return undefined;
    return suppliers.find((s) => s.id === primaryId);
  }, [part.supplierIds, suppliers]);

  const alternates = useMemo(() => {
    const [, ...rest] = part.supplierIds;
    return rest
      .map((id) => suppliers.find((s) => s.id === id))
      .filter((s): s is Supplier => Boolean(s));
  }, [part.supplierIds, suppliers]);

  if (!primary) {
    return (
      <section className="rounded-md border border-line bg-bg-surface p-4">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
          Primary Supplier
        </h2>
        <p className="text-[12px] text-ink-muted italic">
          No supplier on file for this part.
        </p>
      </section>
    );
  }

  const altCount = alternates.length;
  const altLabel =
    altCount === 1 ? '+1 alternate supplier' : `+${altCount} alternate suppliers`;

  return (
    <>
      <section className="rounded-md border border-line bg-bg-surface p-4">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-3">
          Primary Supplier
        </h2>

        <SupplierBody supplier={primary} />

        <div className="mt-3 pt-3 border-t border-line flex flex-col gap-2">
          <Link
            href="/parts?tab=suppliers"
            className="inline-flex items-center gap-1 text-[12px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            View in Suppliers tab
            <ArrowRight aria-hidden="true" className="h-3 w-3" />
          </Link>
          {altCount > 0 && (
            <button
              type="button"
              onClick={() => setAltOpen(true)}
              className="text-left text-[12px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              {altLabel}
            </button>
          )}
        </div>
      </section>

      <SlideInPanel
        open={altOpen}
        onClose={() => setAltOpen(false)}
        width="40%"
        title="Alternate Suppliers"
      >
        <div className="p-6 space-y-4">
          {alternates.map((s) => (
            <div
              key={s.id}
              className="rounded-md border border-line bg-bg-surface p-4"
            >
              <SupplierBody supplier={s} />
            </div>
          ))}
        </div>
      </SlideInPanel>
    </>
  );
}

// ─── Shared body renderer ────────────────────────────────────────────────────

function SupplierBody({ supplier }: { supplier: Supplier }) {
  const contactHref = isPhone(supplier.contact)
    ? `tel:${supplier.contact.replace(/\s|-|\(|\)/g, '')}`
    : `mailto:${supplier.contact}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-semibold text-ink-primary">
          {supplier.name}
        </span>
        {supplier.active && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[rgb(var(--state-listed)/0.1)] text-[10px] uppercase tracking-widest text-[rgb(var(--state-listed))] font-medium shrink-0">
            Active
          </span>
        )}
      </div>
      {supplier.gstin ? (
        <span className="font-mono text-[12px] text-ink-secondary">
          {supplier.gstin}
        </span>
      ) : (
        <span className="text-[12px] text-ink-muted italic">
          — (foreign supplier, no GSTIN)
        </span>
      )}
      <a
        href={contactHref}
        className="font-mono text-[12px] text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        {supplier.contact}
      </a>
      <span className="text-[12px] text-ink-muted">
        {supplier.paymentTerms} · {supplier.currency}
      </span>
    </div>
  );
}

function isPhone(value: string): boolean {
  const digitsOnly = value.replace(/[\s\-\(\)]/g, '');
  return /^\+?\d+$/.test(digitsOnly);
}
