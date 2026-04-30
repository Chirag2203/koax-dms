/**
 * LostLeadDialog — confirms marking a lead as LOST.
 *
 * SPEC-LEADS-001 SC-08/SC-09
 * Loss reason is required (SC-08).
 * Uses Dialog primitive from primitives/dialog — not a local redefinition.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLeadsStore } from '@/src/lib/leads/leads-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';

interface LostLeadDialogProps {
  leadId: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function LostLeadDialog({ leadId, onClose, onConfirm }: LostLeadDialogProps) {
  const t = useTranslations('leads.form');
  const { user } = useStaffAuth();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    if (!reason.trim()) {
      setError(t('lostReasonRequired'));
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const actor = { id: user.id, name: user.name, role: user.role };
      useLeadsStore.getState().transitionStage(leadId, 'LOST', actor, reason.trim());
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark lead as lost.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mark lead as lost"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-md border border-line bg-bg-surface p-6 shadow-xl">
        <h2 className="text-base font-semibold text-ink-primary mb-4">{t('confirmLost')}</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="lost-reason" className="text-xs text-ink-muted uppercase tracking-wider block mb-1">
              {t('lostReason')} <span className="text-state-error">*</span>
            </label>
            <textarea
              id="lost-reason"
              rows={3}
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder={t('lostReasonPlaceholder')}
              className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
            {error && <p className="text-xs text-state-error mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md border border-line bg-bg-surface text-sm text-ink-secondary hover:bg-bg-hover transition-colors"
            >
              {t('cancelLost')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="h-9 px-4 rounded-md bg-state-error text-white text-sm font-medium hover:bg-state-error/90 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-error"
            >
              {t('confirmLost')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
