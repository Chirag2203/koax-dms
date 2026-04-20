'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertTriangle } from 'lucide-react';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';

const schema = z.object({
  finalKm: z.coerce.number().int().positive().optional(),
  newOwnerName: z.string().max(100).optional(),
  newOwnerPhone: z.string().max(20).optional(),
});
type FormValues = z.infer<typeof schema>;

interface SelfRevokeDialogProps {
  ownershipId: string;
  vin: string;
  onClose: () => void;
  onRevoked: () => void;
}

export function SelfRevokeDialog({ ownershipId, vin, onClose, onRevoked }: SelfRevokeDialogProps) {
  const t = useTranslations('portal.vehicles');
  const { customerId } = usePortalAuth();
  const selfRevoke = usePortalVehiclesStore((s) => s.selfRevoke);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = React.useCallback(
    (values: FormValues) => {
      selfRevoke(ownershipId, 'SELF_REVOKE_SOLD', customerId, {
        newOwnerHint:
          values.newOwnerName || values.newOwnerPhone
            ? {
                name: values.newOwnerName ?? '',
                phone: values.newOwnerPhone ?? '',
              }
            : undefined,
      });
      onRevoked();
    },
    [ownershipId, customerId, selfRevoke, onRevoked],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-bg-paper border border-line p-8 shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          aria-label={t('closeDialog')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h2 id="revoke-dialog-title" className="font-display text-xl text-ink-primary">
              {t('selfRevokeTitle')}
            </h2>
            <p className="text-sm text-ink-secondary mt-1">{t('selfRevokeSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Final km */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5">
              {t('finalKm')}
            </label>
            <input
              type="number"
              {...register('finalKm')}
              placeholder={t('finalKmPlaceholder')}
              className="w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* New owner hint */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
              {t('newOwnerHintLabel')}
            </p>
            <div className="space-y-3">
              <input
                type="text"
                {...register('newOwnerName')}
                placeholder={t('newOwnerName')}
                className="w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent"
              />
              <input
                type="tel"
                {...register('newOwnerPhone')}
                placeholder={t('newOwnerPhone')}
                className="w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 font-mono text-[10px] uppercase tracking-widest border border-warning bg-warning/10 text-warning px-4 py-3 hover:bg-warning hover:text-white transition-all disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-warning"
            >
              {t('selfRevokeConfirm')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-mono text-[10px] uppercase tracking-widest border border-line text-ink-secondary px-4 py-3 hover:border-ink-primary hover:text-ink-primary transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
