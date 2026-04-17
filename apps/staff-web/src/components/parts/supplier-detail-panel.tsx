/**
 * SupplierDetailPanel — read-only supplier info in a SlideInPanel.
 *
 * Spec reference: SPEC-PARTS-001 §3.5, PLAN-PARTS-002 §17.3
 */

'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Supplier } from '@dms/types';
import { SlideInPanel, AmountCell } from '@/src/components/primitives';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import { useMemo } from 'react';
import {
  activePoCount,
  formatDate,
  lastOrderDate,
  lifetimeValue,
} from './helpers';

export interface SupplierDetailPanelProps {
  supplierId: string | null;
  onClose: () => void;
}

export function SupplierDetailPanel({ supplierId, onClose }: SupplierDetailPanelProps) {
  const suppliers = usePartsStore((s) => s.suppliers);
  const purchaseOrders = usePartsStore((s) => s.purchaseOrders);

  const supplier: Supplier | undefined = useMemo(
    () => suppliers.find((s) => s.id === supplierId),
    [suppliers, supplierId],
  );

  const stats = useMemo(() => {
    if (!supplier) return null;
    return {
      active: activePoCount(supplier.id, purchaseOrders),
      ltv: lifetimeValue(supplier.id, purchaseOrders),
      last: lastOrderDate(supplier.id, purchaseOrders),
    };
  }, [supplier, purchaseOrders]);

  return (
    <SlideInPanel
      open={!!supplierId && !!supplier}
      onClose={onClose}
      width="40%"
      title="Supplier"
    >
      {supplier && stats && (
        <div className="p-6 space-y-6">
          {/* Name + status banner */}
          <div>
            <h2 className="text-[22px] font-semibold text-ink-primary leading-[1.3]">
              {supplier.name}
            </h2>
            <div className="mt-2 inline-flex items-center gap-2">
              {supplier.active ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[rgb(var(--state-listed)/0.1)] text-[11px] uppercase tracking-wide text-[rgb(var(--state-listed))] font-medium">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-bg-subtle text-[11px] uppercase tracking-wide text-ink-muted font-medium">
                  Inactive
                </span>
              )}
              {supplier.isImport && (
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-bg-subtle text-[10px] uppercase tracking-widest text-ink-muted font-medium">
                  Import · {supplier.currency}
                </span>
              )}
            </div>
          </div>

          {/* Identity */}
          <Section title="Identity">
            <LabelValue label="GSTIN">
              <span className="font-mono text-[13px] text-ink-primary">
                {supplier.gstin ?? (
                  <span className="text-ink-muted">— (foreign supplier)</span>
                )}
              </span>
            </LabelValue>
          </Section>

          {/* Address */}
          <Section title="Address">
            <p className="text-[13px] text-ink-primary whitespace-pre-wrap leading-[1.6]">
              {supplier.address}
            </p>
          </Section>

          {/* Contact */}
          <Section title="Contact">
            <ContactLink value={supplier.contact} />
          </Section>

          {/* Commercial tiles */}
          <Section title="Commercial">
            <div className="grid grid-cols-2 gap-4">
              <Tile label="Payment Terms" value={supplier.paymentTerms} />
              <Tile label="Currency" value={supplier.currency} />
              <Tile label="Active POs" value={String(stats.active)} />
              <Tile
                label="Last Order"
                value={stats.last ? formatDate(stats.last) : '—'}
              />
              <div className="col-span-2 rounded-md bg-bg-subtle p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  Lifetime Value
                </span>
                <AmountCell amount={stats.ltv} size="lg" align="left" />
              </div>
            </div>
          </Section>

          {/* Links */}
          <Section title="Links">
            <Link
              href={`/parts?tab=po&supplier=${supplier.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              View POs from this supplier
              <ArrowRight aria-hidden="true" className="h-3 w-3" />
            </Link>
          </Section>
        </div>
      )}
    </SlideInPanel>
  );
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-muted mb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function LabelValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-bg-subtle p-4 flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="text-[15px] font-medium text-ink-primary">{value}</span>
    </div>
  );
}

function ContactLink({ value }: { value: string }) {
  // Heuristic: phone if starts with + or is all digits+spaces; else email.
  const digitsOnly = value.replace(/[\s\-\(\)]/g, '');
  const isPhone = /^\+?\d+$/.test(digitsOnly);
  const href = isPhone ? `tel:${digitsOnly}` : `mailto:${value}`;
  return (
    <a
      href={href}
      className="text-[13px] text-accent hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
    >
      {value}
    </a>
  );
}
