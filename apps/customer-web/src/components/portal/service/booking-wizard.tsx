'use client';

/**
 * ServiceBookingWizard — 5-step booking flow for the customer portal.
 *
 * Step 1: Vehicle picker
 * Step 2: Service type picker
 * Step 3: Date + slot selector
 * Step 4: Location (workshop drop / home pickup)
 * Step 5: Review + confirm
 *
 * Security: customerId is NEVER in formData — derived from session only.
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §8.2
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import type { ServiceType } from '@dms/types';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';
import { useServiceBookingStore, type WizardStep } from '@/src/lib/service/service-booking-store';
import { usePortalServiceStore } from '@/src/lib/service/service-booking-service-bridge';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import {
  StepVehicle,
  StepService,
  StepDateTime,
  StepLocation,
  StepReview,
  BookingSuccess,
} from './wizard-steps';

// ─── Serviceable PINs mock (OQ1 — hardcoded per spec until product decides) ──

export const SERVICEABLE_CITIES = ['Bangalore', 'Mumbai', 'Chennai', 'Bengaluru'];

// ─── Step indicator ───────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: WizardStep;
  totalSteps: number;
}

const STEP_KEYS: Record<WizardStep, string> = {
  1: 'stepVehicle',
  2: 'stepService',
  3: 'stepDate',
  4: 'stepLocation',
  5: 'stepReview',
};

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const t = useTranslations('portal.serviceBooking.book');

  return (
    <>
      {/* Mobile: "Step N of 5" text */}
      <p className="sm:hidden font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-secondary)] mb-4">
        {t('stepOf', { step: currentStep })}
      </p>

      {/* Desktop: horizontal pills */}
      <nav
        className="hidden sm:flex items-center gap-1 mb-8"
        aria-label="Booking steps"
      >
        {(Array.from({ length: totalSteps }, (_, i) => (i + 1) as WizardStep)).map((step) => {
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;
          return (
            <React.Fragment key={step}>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest transition-colors',
                  isActive && 'bg-[var(--color-brass)] text-white font-semibold',
                  isCompleted && 'bg-[var(--color-ink-muted)]/10 text-[var(--color-ink-secondary)]',
                  !isActive && !isCompleted && 'text-[var(--color-ink-muted)]',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted && <CheckCircle size={12} />}
                <span>{step}. {t(STEP_KEYS[step] as Parameters<typeof t>[0])}</span>
              </div>
              {step < totalSteps && (
                <ChevronRight size={12} className="text-[var(--color-ink-muted)] shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}

// ─── Navigation footer ────────────────────────────────────────────────────────

interface WizardNavProps {
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting?: boolean;
}

function WizardNav({ onBack, onNext, canNext, isFirstStep, isLastStep, isSubmitting }: WizardNavProps) {
  const t = useTranslations('portal.serviceBooking.book');
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-line)]">
      {!isFirstStep ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 font-mono text-[12px] uppercase tracking-widest text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          <ChevronLeft size={14} />
          {t('back')}
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext || isSubmitting}
        className={cn(
          'px-6 py-2.5 font-mono text-[12px] uppercase tracking-widest transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]',
          canNext && !isSubmitting
            ? 'bg-[var(--color-brass)] text-white hover:opacity-90'
            : 'bg-[var(--color-ink-muted)]/20 text-[var(--color-ink-muted)] cursor-not-allowed',
        )}
        aria-disabled={!canNext || isSubmitting}
      >
        {isSubmitting
          ? t('confirming')
          : isLastStep
          ? t('confirm')
          : t('next')}
      </button>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

interface ServiceBookingWizardProps {
  ownedVehicleViews: OwnedVehicleView[];
  serviceTypes: ServiceType[];
}

export function ServiceBookingWizard({ ownedVehicleViews, serviceTypes }: ServiceBookingWizardProps) {
  const t = useTranslations('portal.serviceBooking.book');
  const { customerId } = usePortalAuth();
  const store = useServiceBookingStore();
  const vehiclesStore = usePortalVehiclesStore();
  const createBookingFromPortal = usePortalServiceStore((s) => s.createBookingFromPortal);

  const { currentStep, formData, isSubmitting, submitError, submitResult } = store;

  const serviceTypeNameMap = React.useMemo(
    () => Object.fromEntries(serviceTypes.map((st) => [st.id, st.name])),
    [serviceTypes],
  );

  // Owned VINs for VIN-ownership validation (NFR-S)
  const ownedVins = React.useMemo(() => {
    const rows = vehiclesStore.selectVehiclesByCustomer(customerId, {
      includeGrace: false,
      now: new Date().toISOString(),
    });
    return rows.map((r) => r.vin);
  }, [vehiclesStore, customerId]);

  // Step validation — can the user advance from this step?
  const canAdvance = React.useMemo((): boolean => {
    switch (currentStep) {
      case 1: return formData.selectedVin !== null;
      case 2: return formData.selectedServiceTypeId !== null;
      case 3: return formData.selectedDate !== null && formData.selectedSlot !== null;
      case 4:
        if (formData.pickupMode === 'HOME_PICKUP') {
          if (!formData.pickupAddress) return false;
          const { line1, city, pinCode } = formData.pickupAddress;
          if (!line1 || !city || !pinCode || !/^\d{6}$/.test(pinCode)) return false;
          if (!SERVICEABLE_CITIES.some((c) => city.toLowerCase().includes(c.toLowerCase()))) return false;
        }
        return true;
      case 5: return true;
      default: return false;
    }
  }, [currentStep, formData]);

  async function handleNext() {
    if (currentStep < 5) {
      store.nextStep();
    } else {
      // Submit
      await store.submitBooking(
        customerId,
        ownedVins,
        serviceTypeNameMap,
        createBookingFromPortal,
      );
    }
  }

  function handleBack() {
    store.prevStep();
  }

  // Success screen
  if (submitResult) {
    return <BookingSuccess result={submitResult} onReset={() => store.resetWizard()} />;
  }

  const selectedService = serviceTypes.find((st) => st.id === formData.selectedServiceTypeId);
  const selectedVehicleView = ownedVehicleViews.find((v) => v.vin === formData.selectedVin);

  return (
    <div className="max-w-2xl">
      <StepIndicator currentStep={currentStep} totalSteps={5} />

      {/* Step content */}
      <div role="region" aria-label={`Step ${currentStep}`}>
        {currentStep === 1 && (
          <StepVehicle
            vehicles={ownedVehicleViews}
            selectedVin={formData.selectedVin}
            onSelect={(vin) => store.selectVin(vin)}
          />
        )}
        {currentStep === 2 && (
          <StepService
            serviceTypes={serviceTypes}
            selectedId={formData.selectedServiceTypeId}
            onSelect={(id) => store.selectServiceType(id)}
          />
        )}
        {currentStep === 3 && (
          <StepDateTime
            selectedDate={formData.selectedDate}
            selectedSlot={formData.selectedSlot}
            onDateSelect={(date) => store.selectDate(date)}
            onSlotSelect={(slot) => store.selectSlot(slot)}
          />
        )}
        {currentStep === 4 && (
          <StepLocation
            pickupMode={formData.pickupMode}
            pickupAddress={formData.pickupAddress}
            onModeChange={(mode) => store.setPickupMode(mode)}
            onAddressChange={(addr) => store.setPickupAddress(addr)}
          />
        )}
        {currentStep === 5 && (
          <StepReview
            formData={formData}
            selectedVehicle={selectedVehicleView ?? null}
            selectedService={selectedService ?? null}
            onConcernsChange={(text) => store.setConcerns(text)}
          />
        )}
      </div>

      {/* Error toast */}
      {submitError && (
        <div
          role="alert"
          className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] font-mono"
        >
          {submitError}
        </div>
      )}

      <WizardNav
        onBack={handleBack}
        onNext={handleNext}
        canNext={canAdvance}
        isFirstStep={currentStep === 1}
        isLastStep={currentStep === 5}
        isSubmitting={isSubmitting}
      />

      {currentStep === 5 && (
        <p className="mt-4 text-[11px] text-[var(--color-ink-muted)] font-mono">
          {t('termsNote')}
        </p>
      )}
    </div>
  );
}
