'use client';

import { notFound } from 'next/navigation';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { Customer360View } from '@/src/components/customers/customer-360-view';

/**
 * /customers/[id] — Customer 360 detail page.
 * Spec reference: SPEC-CUSTOMERS-001 §6
 */

interface PageProps {
  params: { id: string };
}

export default function CustomerDetailPage({ params }: PageProps) {
  const hydrated = useCustomersStore((s) => s.hydrated);
  const customer = useCustomersStore((s) => s.customers[params.id]);

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    );
  }

  if (!customer) {
    notFound();
  }

  return <Customer360View customer={customer} />;
}
