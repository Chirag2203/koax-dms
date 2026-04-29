'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Not-found boundary for /service/bookings/[id].
 * Triggered when booking is not found or not owned by the authenticated customer.
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §8.3 "Detail 404"
 */
export default function ServiceBookingNotFound() {
  return (
    <div className="max-w-3xl px-6 md:px-12 lg:px-16 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
        404
      </p>
      <h1 className="font-display text-2xl md:text-3xl text-[var(--color-ink)] mb-6">
        Booking not found
      </h1>
      <p className="text-[14px] text-[var(--color-ink-secondary)] mb-8">
        This booking does not exist or is not linked to your account.
      </p>
      <Link
        href="/service/bookings"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        All service bookings
      </Link>
    </div>
  );
}
