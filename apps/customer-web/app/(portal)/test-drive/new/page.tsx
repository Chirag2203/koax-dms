'use client';

/**
 * /(portal)/test-drive/new — Book a test drive (wizard).
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S1 S6 L3 L8
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { TestDriveBookingWizard } from '@/src/components/portal/test-drive/test-drive-booking-wizard';

export default function TestDriveNewPage() {
  const t = useTranslations('portal.testDrive');

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <div className="mb-4">
          <Link
            href="/test-drive"
            className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-[var(--color-ink-muted)] hover:text-[var(--color-ink-secondary)] transition-colors mb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
          >
            <ChevronLeft size={12} aria-hidden="true" />
            {t('backToList')}
          </Link>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
          {t('newPageTitle')}
        </h1>
        <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
          {t('newPageSubtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* Wizard */}
      <section className="px-6 md:px-12 lg:px-16 pb-16">
        <TestDriveBookingWizard />
      </section>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
