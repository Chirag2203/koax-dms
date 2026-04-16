'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@dms/ui';
import { AlertDialog } from '@/src/components/primitives';
import {
  WizardShell,
  StepAcquisition,
  StepSpecs,
  StepCondition,
  StepPricing,
  SummaryRail,
  WIZARD_DEFAULTS,
  DRAFT_STORAGE_KEY,
  STEP_FIELDS,
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
} from '@/src/components/inventory/new-vehicle-wizard';
import type { WizardFormValues } from '@/src/components/inventory/new-vehicle-wizard';

// ─── Combined schema (all steps) ─────────────────────────────────────────────
// We use z.intersection to combine schemas that may be ZodEffects (from superRefine)

const fullSchema = z.intersection(
  z.intersection(
    z.intersection(step1Schema, step2Schema),
    step3Schema,
  ),
  step4Schema,
);

// ─── Step components ──────────────────────────────────────────────────────────

const STEPS = [StepAcquisition, StepSpecs, StepCondition, StepPricing] as const;

// ─── Toast types ──────────────────────────────────────────────────────────────

interface ToastMsg {
  id: number;
  message: string;
  type: 'success' | 'info';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewVehiclePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastIdRef = useRef(0);

  // ── Form setup ───────────────────────────────────────────────────────────────

  const methods = useForm<WizardFormValues>({
    resolver: zodResolver(fullSchema as z.ZodType<WizardFormValues>),
    defaultValues: WIZARD_DEFAULTS,
    mode: 'onTouched',
  });

  const { handleSubmit, trigger, watch, getValues, reset, formState: { isDirty } } = methods;

  // ── Load draft from localStorage ─────────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<WizardFormValues>;
        reset({ ...WIZARD_DEFAULTS, ...parsed });
      }
    } catch {
      // Silently ignore parse errors
    }
  }, [reset]);

  // ── Auto-save every 30s ───────────────────────────────────────────────────────

  const saveDraftToStorage = useCallback(() => {
    try {
      const values = getValues();
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
    } catch {
      // Silently ignore storage errors
    }
  }, [getValues]);

  useEffect(() => {
    const interval = setInterval(saveDraftToStorage, 30_000);
    return () => clearInterval(interval);
  }, [saveDraftToStorage]);

  // ── Toast helpers ─────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: ToastMsg['type'] = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === 's') {
        e.preventDefault();
        void handleSaveDraft();
      }
      if (meta && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmitForReview();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step navigation ───────────────────────────────────────────────────────────

  async function handleContinue() {
    const fields = STEP_FIELDS[currentStep] ?? [];
    const valid = await trigger(fields as (keyof WizardFormValues)[], { shouldFocus: true });
    if (!valid) return;

    // Save draft on step change
    saveDraftToStorage();

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ── Save as draft ─────────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    saveDraftToStorage();
    showToast('Draft saved · just now', 'info');
    router.push('/inventory');
  }

  // ── Cancel ────────────────────────────────────────────────────────────────────

  function handleCancel() {
    if (isDirty) {
      setShowCancelAlert(true);
    } else {
      router.push('/inventory');
    }
  }

  function handleDiscardConfirm() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowCancelAlert(false);
    router.push('/inventory');
  }

  // ── Submit for review ─────────────────────────────────────────────────────────

  async function handleSubmitForReview() {
    // Validate all steps
    const allFields = Object.values(STEP_FIELDS).flat();
    const valid = await trigger(allFields as (keyof WizardFormValues)[], { shouldFocus: true });

    if (!valid) {
      // Navigate to first failing step
      for (let i = 0; i < STEPS.length; i++) {
        const fields = STEP_FIELDS[i] ?? [];
        const stepValid = await trigger(fields as (keyof WizardFormValues)[], { shouldFocus: false });
        if (!stepValid) {
          setCurrentStep(i);
          break;
        }
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const values = getValues();
      const res = await fetch('/api/staff/inventory/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error('Failed to submit vehicle');
      }

      const data = (await res.json()) as { vin: string; success: boolean };
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      showToast('Vehicle submitted for review', 'success');
      router.push(`/inventory/${data.vin}`);
    } catch {
      showToast('Failed to submit. Please try again.', 'info');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Wrap submit for form ──────────────────────────────────────────────────────

  const onFormSubmit = handleSubmit(() => {
    void handleSubmitForReview();
  });

  // ── Current step component ────────────────────────────────────────────────────

  const StepComponent = STEPS[currentStep];
  const watchedValues = watch();

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <FormProvider {...methods}>
      <form onSubmit={onFormSubmit} noValidate className="contents">
        <WizardShell
          currentStep={currentStep}
          onCancel={handleCancel}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmitForReview}
          isSubmitting={isSubmitting}
          rail={<SummaryRail values={watchedValues} />}
        >
          {/* Step content */}
          {StepComponent && <StepComponent />}

          {/* Step footer navigation */}
          <div className={cn(
            'flex items-center mt-10 pt-6 border-t border-line',
            currentStep === 0 ? 'justify-end' : 'justify-between',
          )}>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className={cn(
                  'h-10 px-5 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                ← Back
              </button>
            )}

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleContinue}
                className={cn(
                  'h-10 px-6 rounded-md text-sm font-semibold text-white bg-accent',
                  'hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                )}
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'h-10 px-6 rounded-md text-sm font-semibold text-white bg-accent',
                  'hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? 'Submitting…' : 'Submit for Review'}
              </button>
            )}
          </div>
        </WizardShell>
      </form>

      {/* Cancel confirmation */}
      <AlertDialog
        open={showCancelAlert}
        onClose={() => setShowCancelAlert(false)}
        title="Discard this vehicle?"
        description="Unsaved changes will be lost. This cannot be undone."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={handleDiscardConfirm}
      />

      {/* Toast stack */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 shadow-lg text-sm font-medium',
              'pointer-events-auto',
              t.type === 'success'
                ? 'bg-state-success text-white'
                : 'bg-ink-primary text-white',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </FormProvider>
  );
}
