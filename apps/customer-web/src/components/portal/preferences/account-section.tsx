'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { Customer } from '@dms/types';
import { useAuth } from '@/src/providers/auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountSectionProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AccountSection({ customer }: AccountSectionProps) {
  const t = useTranslations('portal.preferences');
  const { signOut } = useAuth();

  return (
    <section className="mb-12">
      <h2 className="font-display text-xl text-ink-primary mb-6">
        {t('account')}
      </h2>

      {/* Read-only fields */}
      <dl className="space-y-5 mb-10 max-w-md">
        <div className="border-b border-line pb-4">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
            Name
          </dt>
          <dd className="text-base text-ink-primary font-sans">{customer.name}</dd>
        </div>
        <div className="border-b border-line pb-4">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
            Email
          </dt>
          <dd className="text-base text-ink-primary font-sans">{customer.email}</dd>
        </div>
        <div className="border-b border-line pb-4">
          <dt className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
            Phone
          </dt>
          <dd className="text-base text-ink-primary font-sans">{customer.phone}</dd>
        </div>
      </dl>

      {/* Sign Out */}
      <button
        type="button"
        onClick={signOut}
        className={[
          'border border-danger text-danger',
          'rounded-full px-8 py-3',
          'font-mono text-xs uppercase tracking-widest',
          'hover:bg-danger hover:text-white',
          'transition-colors duration-200',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger',
        ].join(' ')}
      >
        {t('signOut')}
      </button>
    </section>
  );
}
