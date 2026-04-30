'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { communicationPreferences, mockCustomer } from '@dms/mocks/fixtures';
import {
  CommunicationSection,
  RegionSection,
  AccountSection,
} from '@/src/components/portal/preferences';
import type { CommunicationPreferences } from '@dms/types';
import type { Language, OutletCity } from '@/src/components/portal/preferences';
import {
  recordPortalConsentChange,
  PORTAL_PURPOSE_MAP,
} from '@/src/lib/portal/portal-consent-bridge';

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [message, setMessage] = React.useState<string | null>(null);

  const show = React.useCallback((msg: string) => {
    setMessage(msg);
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  return { message, show };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreferencesPage() {
  const t = useTranslations('portal.preferences');
  const { message: toastMessage, show: showToast } = useToast();

  // Local state seeded from fixtures
  const [commPrefs, setCommPrefs] = React.useState<CommunicationPreferences>(
    communicationPreferences,
  );
  const [language, setLanguage] = React.useState<Language>(
    (mockCustomer.preferredLanguage as Language) ?? 'en-IN',
  );
  const [preferredOutlet, setPreferredOutlet] = React.useState<OutletCity>(
    (mockCustomer.preferredCity as OutletCity) ?? 'bangalore',
  );

  const handleCommUpdate = (updated: CommunicationPreferences) => {
    // DEF-PORTAL-1: drive the consent ledger for every mapped toggle.
    // Diff the old prefs against updated to find which key changed.
    const keys = Object.keys(updated) as Array<keyof CommunicationPreferences>;
    for (const key of keys) {
      if (updated[key] !== commPrefs[key]) {
        const purpose = PORTAL_PURPOSE_MAP[key];
        if (purpose) {
          // L_PORTAL_2: bridge writes to portal consent store
          recordPortalConsentChange(
            mockCustomer.id,
            mockCustomer.name,
            purpose,
            updated[key],
          );
        }
      }
    }

    setCommPrefs(updated);
    showToast(t('updated'));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    showToast(t('updated'));
  };

  const handleOutletChange = (city: OutletCity) => {
    setPreferredOutlet(city);
    showToast(t('updated'));
  };

  return (
    <div className="max-w-5xl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-4">
          CUSTOMER PORTAL
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] mb-3">
          {t('title')}
        </h1>
        <p className="text-base text-[var(--color-ink-secondary)] leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      {/* ── Sections ────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-12 lg:px-16 pb-16">
        {/* 1. Communication Preferences */}
        <CommunicationSection
          preferences={commPrefs}
          onUpdate={handleCommUpdate}
        />

        <div className="border-t border-[var(--color-line)] mb-12" />

        {/* 2. Language & Region */}
        <RegionSection
          language={language}
          preferredOutlet={preferredOutlet}
          onLanguageChange={handleLanguageChange}
          onOutletChange={handleOutletChange}
        />

        <div className="border-t border-[var(--color-line)] mb-12" />

        {/* 3. Account */}
        <AccountSection customer={mockCustomer} />
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-ink)] text-[var(--color-bg-paper,#fefcf6)] font-mono text-xs uppercase tracking-widest px-6 py-3 shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
