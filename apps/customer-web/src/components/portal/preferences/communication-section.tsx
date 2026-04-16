'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import type { CommunicationPreferences } from '@dms/types';
import { PreferenceToggle } from './preference-toggle';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommunicationSectionProps {
  preferences: CommunicationPreferences;
  onUpdate: (updated: CommunicationPreferences) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommunicationSection({ preferences, onUpdate }: CommunicationSectionProps) {
  const t = useTranslations('portal.preferences');

  const handleChange = (key: keyof CommunicationPreferences, value: boolean) => {
    onUpdate({ ...preferences, [key]: value });
  };

  return (
    <section className="mb-12">
      <h2 className="font-display text-xl text-ink-primary mb-6">
        {t('communication')}
      </h2>

      <div>
        <PreferenceToggle
          id="pref-whatsapp"
          label={t('whatsapp')}
          description={t('whatsappDesc')}
          consentText={t('whatsappConsent')}
          checked={preferences.whatsappUpdates}
          onChange={(v) => handleChange('whatsappUpdates', v)}
        />
        <PreferenceToggle
          id="pref-sms"
          label={t('sms')}
          description={t('smsDesc')}
          consentText={t('smsConsent')}
          checked={preferences.smsReminders}
          onChange={(v) => handleChange('smsReminders', v)}
        />
        <PreferenceToggle
          id="pref-email"
          label={t('email')}
          description={t('emailDesc')}
          consentText={t('emailConsent')}
          checked={preferences.emailNotifications}
          onChange={(v) => handleChange('emailNotifications', v)}
        />
        <PreferenceToggle
          id="pref-journal"
          label={t('journal')}
          description={t('journalDesc')}
          consentText={t('journalConsent')}
          checked={preferences.quarterlyJournal}
          onChange={(v) => handleChange('quarterlyJournal', v)}
        />
      </div>
    </section>
  );
}
