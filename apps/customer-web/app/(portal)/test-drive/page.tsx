'use client';

/**
 * /(portal)/test-drive — Customer's test-drive booking list.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S3 S11 S12 L10
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { TestDriveBookingList } from '@/src/components/portal/test-drive/test-drive-booking-list';
import { seedPortalTestDriveStore } from '@/src/lib/test-drive/test-drive-store-bridge';

export default function TestDrivePage() {
  const t = useTranslations('portal.testDrive');
  const { customerId } = usePortalAuth();

  // Seed store with fixtures on first render
  React.useEffect(() => {
    seedPortalTestDriveStore();
  }, []);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
              {t('pageTitle')}
            </h1>
            <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
              {t('pageSubtitle')}
            </p>
          </div>
          <Link
            href="/test-drive/new"
            className="shrink-0 px-4 py-2.5 bg-[var(--color-brass)] text-white font-mono text-xs uppercase tracking-widest hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            {t('bookNew')}
          </Link>
        </div>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* List */}
      <section className="px-6 md:px-12 lg:px-16 pb-16">
        <TestDriveBookingList customerId={customerId} />
      </section>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
