'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { tryNormalizeVin, computeAutoMatch } from '@dms/vehicles-core';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { vehicleModuleCustomers, jobCards, ownershipRows } from '@dms/mocks/fixtures';
import { AutoMatchFeedback } from './auto-match-feedback';

const schema = z.object({
  vin: z
    .string()
    .min(17, 'VIN must be 17 characters')
    .max(17, 'VIN must be 17 characters'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  relationship: z.enum(['BN_PURCHASE', 'OTHER_PURCHASE', 'INHERITED', 'OTHER']),
});
type FormValues = z.infer<typeof schema>;

export function ClaimForm() {
  const t = useTranslations('portal.vehicles');
  const router = useRouter();
  const { customerId } = usePortalAuth();
  const store = usePortalVehiclesStore();

  const [autoMatchHit, setAutoMatchHit] = React.useState<boolean | null>(null);
  const [matchedEntityId, setMatchedEntityId] = React.useState<string | undefined>();
  const [submitted, setSubmitted] = React.useState(false);
  const [claimResult, setClaimResult] = React.useState<{
    claimId: string;
    autoApproved: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { relationship: 'BN_PURCHASE' },
  });

  const vinValue = watch('vin', '');

  // Auto-match on VIN blur
  const handleVinBlur = React.useCallback(() => {
    const normalizedVin = tryNormalizeVin(vinValue);
    if (!normalizedVin) {
      setAutoMatchHit(null);
      return;
    }

    // Get claimant customer
    const claimant = vehicleModuleCustomers.find((c) => c.id === customerId);
    if (!claimant) {
      setAutoMatchHit(false);
      return;
    }

    const priorClaims = store.selectClaimsByCustomer(customerId);

    // Derive sales order proxies from completed (TRANSFERRED) ownership rows
    // that have a linkedSalesOrderId — this simulates a SalesOrder lookup
    const salesOrders = ownershipRows
      .filter((r) => r.linkedSalesOrderId && r.state === 'TRANSFERRED')
      .map((r) => ({
        id: r.linkedSalesOrderId!,
        vin: r.vin,
        status: 'COMPLETED',
        buyerId: r.customerId,
      }));

    // Job cards (simplified for auto-match — just need vin + customerId)
    const jcList = jobCards.map((jc) => ({
      id: jc.id,
      vin: jc.vin,
      customerId: jc.customerId,
    }));

    const matchResult = computeAutoMatch(
      normalizedVin,
      claimant,
      salesOrders,
      jcList,
      vehicleModuleCustomers,
      priorClaims,
    );

    setAutoMatchHit(matchResult.hit);
    setMatchedEntityId(matchResult.matchedEntityId);
  }, [vinValue, customerId, store]);

  const onSubmit = React.useCallback(
    (values: FormValues) => {
      const result = store.submitClaim({
        vin: values.vin,
        claimantCustomerId: customerId,
        autoMatchHit: autoMatchHit ?? false,
        matchedEntityId,
      });
      setClaimResult({ claimId: result.claimId, autoApproved: result.autoApproved });
      setSubmitted(true);
    },
    [store, customerId, autoMatchHit, matchedEntityId],
  );

  if (submitted && claimResult) {
    return (
      <div className="max-w-md py-12 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-success mb-3">
          {claimResult.autoApproved ? t('claimAutoApproved') : t('claimSubmitted')}
        </p>
        <h2 className="font-display text-2xl text-ink-primary mb-4">
          {claimResult.autoApproved ? t('claimAutoApprovedTitle') : t('claimSubmittedTitle')}
        </h2>
        <p className="text-sm text-ink-secondary mb-8">
          {claimResult.autoApproved ? t('claimAutoApprovedBody') : t('claimSubmittedBody')}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => router.push('/vehicles')}
            className="font-mono text-[10px] uppercase tracking-widest border border-ink-primary px-6 py-3 hover:bg-ink-primary hover:text-bg-paper transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('goToVehicles')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/vehicles/my-claims')}
            className="font-mono text-[10px] uppercase tracking-widest border border-line text-ink-secondary px-6 py-3 hover:border-ink-primary hover:text-ink-primary transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t('viewMyClaims')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-6" noValidate>
      {/* VIN */}
      <div>
        <label
          htmlFor="vin"
          className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5"
        >
          {t('claimVinLabel')} <span aria-hidden="true">*</span>
        </label>
        <input
          id="vin"
          type="text"
          maxLength={17}
          autoComplete="off"
          spellCheck={false}
          {...register('vin')}
          onBlur={handleVinBlur}
          placeholder={t('claimVinPlaceholder')}
          className="w-full border border-line bg-transparent px-3 py-2.5 font-mono text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent uppercase"
          aria-describedby={errors.vin ? 'vin-error' : 'vin-hint'}
        />
        {errors.vin && (
          <p id="vin-error" role="alert" className="font-mono text-[10px] text-red-600 mt-1">
            {errors.vin.message}
          </p>
        )}
        {!errors.vin && (
          <p id="vin-hint" className="font-mono text-[9px] text-ink-muted mt-1">
            {t('claimVinHint')}
          </p>
        )}
      </div>

      {/* Auto-match chip */}
      {autoMatchHit !== null && <AutoMatchFeedback hit={autoMatchHit} />}

      {/* Registration number */}
      <div>
        <label
          htmlFor="regNo"
          className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1.5"
        >
          {t('claimRegLabel')} <span aria-hidden="true">*</span>
        </label>
        <input
          id="regNo"
          type="text"
          {...register('registrationNumber')}
          placeholder={t('claimRegPlaceholder')}
          className="w-full border border-line bg-transparent px-3 py-2.5 text-sm text-ink-primary placeholder-ink-muted focus:outline-none focus:border-accent"
          aria-describedby={errors.registrationNumber ? 'reg-error' : undefined}
        />
        {errors.registrationNumber && (
          <p id="reg-error" role="alert" className="font-mono text-[10px] text-red-600 mt-1">
            {errors.registrationNumber.message}
          </p>
        )}
      </div>

      {/* Relationship */}
      <div>
        <fieldset>
          <legend className="block font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
            {t('claimRelationshipLabel')} <span aria-hidden="true">*</span>
          </legend>
          <div className="space-y-2">
            {(['BN_PURCHASE', 'OTHER_PURCHASE', 'INHERITED', 'OTHER'] as const).map((val) => (
              <label key={val} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value={val}
                  {...register('relationship')}
                  className="accent-accent"
                />
                <span className="text-sm text-ink-primary">{t(`claimRelationship_${val}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* RC scan stub */}
      <div className="border border-dashed border-line p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {t('rcScanStub')}
        </p>
      </div>

      {/* Identity proof stub */}
      <div className="border border-dashed border-line p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {t('idProofStub')}
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full font-mono text-[11px] uppercase tracking-widest border border-ink-primary px-6 py-3.5 hover:bg-ink-primary hover:text-bg-paper transition-all disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {isSubmitting ? t('submitting') : t('submitClaim')}
      </button>
    </form>
  );
}
