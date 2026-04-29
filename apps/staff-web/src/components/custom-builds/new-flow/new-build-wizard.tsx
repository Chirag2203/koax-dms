/**
 * NewBuildWizard — 6-step create flow for a Build Job.
 *
 * Steps:
 *   1. Customer — search + select from customers-store
 *   2. Vehicle  — filtered to that customer's vehicles
 *   3. Details  — title, description, target completion, priority
 *   4. Parts    — multi-select from parts catalog (optional), running total
 *   5. Vendor   — optional from vendor directory
 *   6. Review + Create
 *
 * R10+ gate (R09 can create per spec; using R09+ here per §12).
 * On submit: createBuildJob() → redirects to /custom-builds/[id].
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14.2, P1.1 L23
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@dms/ui';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { ProgressStepper } from '@/src/components/primitives/progress-stepper';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';
import { useOutlet } from '@/src/providers/outlet-provider';
import type { CustomBuildPart, BuildJobPartLine } from '@dms/types';
import { WizardStepCustomer } from './wizard-step-customer';
import { WizardStepVehicle } from './wizard-step-vehicle';
import { WizardStepDetails } from './wizard-step-details';
import { WizardStepParts } from './wizard-step-parts';
import { WizardStepVendor } from './wizard-step-vendor';
import { WizardStepReview } from './wizard-step-review';

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface WizardData {
  customerId: string;
  customerName: string;
  vin: string;
  vehicleLabel: string;
  title: string;
  enquiryNotes: string;
  targetCompletionDate: string;
  selectedParts: { part: CustomBuildPart; qty: number }[];
  vendorId: string;
  /** True when the customer was created inline during this wizard session. L65 */
  customerCreatedDuringWizard: boolean;
  /** True when a vehicle was upserted + ownership opened during this wizard session. L67 */
  vehicleLinkedDuringWizard: boolean;
}

const EMPTY: WizardData = {
  customerId: '',
  customerName: '',
  vin: '',
  vehicleLabel: '',
  title: '',
  enquiryNotes: '',
  targetCompletionDate: '',
  selectedParts: [],
  vendorId: '',
  customerCreatedDuringWizard: false,
  vehicleLinkedDuringWizard: false,
};

const STEPS = [
  { id: 'customer', label: 'Customer' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'details', label: 'Details' },
  { id: 'parts', label: 'Parts' },
  { id: 'vendor', label: 'Vendor' },
  { id: 'review', label: 'Review' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function NewBuildWizard() {
  const router = useRouter();
  const { user } = useStaffAuth();
  const { outlet } = useOutlet();
  const createBuildJob = useCustomBuildsStore((s) => s.createBuildJob);
  const { toasts, toast, dismiss } = useToast();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const canCreate = user && hasRank(user.role, 'R09');

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <p className="text-[15px] font-medium text-ink-primary">Access restricted</p>
        <p className="text-[13px] text-ink-muted mt-1">Creating build jobs requires Service Advisor role (R09+).</p>
        <Link href="/custom-builds" className="mt-4 text-[13px] text-accent hover:underline">
          Back to Custom Builds
        </Link>
      </div>
    );
  }

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const canProceed = ((): boolean => {
    if (step === 0) return !!data.customerId;
    if (step === 1) return !!data.vin;
    if (step === 2) return !!data.title.trim();
    return true;
  })();

  const handleSubmit = () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const actor = { id: user.id, name: user.name, role: user.role };
      const partLines: BuildJobPartLine[] = data.selectedParts.map(({ part, qty }) => ({
        partSku: part.sku,
        partName: part.name,
        brand: part.brand,
        category: part.category,
        qty,
        unitCost: part.bnCost ?? part.listPrice,
        installHours: part.installHours,
        vendorId: part.vendorId,
      }));

      // Create the job
      const job = createBuildJob(
        {
          title: data.title,
          customerId: data.customerId,
          vin: data.vin,
          outletId: outlet ?? 'BLR-01',
          advisorId: user.id,
          enquiryNotes: data.enquiryNotes || undefined,
        },
        actor,
      );

      // Add parts if any
      if (partLines.length > 0) {
        const store = useCustomBuildsStore.getState();
        for (const line of partLines) {
          store.addPart(job.id, line, actor);
        }
      }

      // Assign vendor if selected
      if (data.vendorId) {
        useCustomBuildsStore.getState().assignVendor(job.id, data.vendorId, actor);
      }

      // ── Provenance audit log (L68) ──────────────────────────────────────────
      const cbStore = useCustomBuildsStore.getState();
      if (data.customerCreatedDuringWizard) {
        cbStore.addActivityNote(
          job.id,
          `Customer ${data.customerName} created during build enquiry`,
          actor,
        );
      }
      if (data.vehicleLinkedDuringWizard) {
        const vinTail = data.vin.slice(-6);
        const vehicleShortLabel = data.vehicleLabel || data.vin;
        cbStore.addActivityNote(
          job.id,
          `Vehicle ${vehicleShortLabel} (${vinTail}) linked during build enquiry`,
          actor,
        );
      }
      cbStore.addActivityNote(
        job.id,
        `Build enquiry created by ${actor.name}`,
        actor,
      );

      toast('Build job created!', 'success');
      router.push(`/custom-builds/${job.id}?tab=overview`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to create build job', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <div className="px-6 py-4 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/custom-builds"
            className="flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink-primary transition-colors"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back
          </Link>
          <span className="text-ink-muted">/</span>
          <span className="text-[12px] text-ink-secondary">New Build Job</span>
        </div>
        <h1 className="text-[20px] font-semibold text-ink-primary">New Build Job</h1>
        <p className="text-[13px] text-ink-muted mt-0.5">Fill in the details to create a build job at Enquiry stage.</p>
      </div>

      {/* Stepper */}
      <div className="px-6 py-5 border-b border-line flex-shrink-0">
        <ProgressStepper steps={STEPS} currentIndex={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {step === 0 && <WizardStepCustomer data={data} onUpdate={setData} />}
        {step === 1 && <WizardStepVehicle data={data} onUpdate={setData} />}
        {step === 2 && <WizardStepDetails data={data} onUpdate={setData} />}
        {step === 3 && <WizardStepParts data={data} onUpdate={setData} />}
        {step === 4 && <WizardStepVendor data={data} onUpdate={setData} />}
        {step === 5 && <WizardStepReview data={data} />}
      </div>

      {/* Navigation footer */}
      <div className="px-6 py-4 border-t border-line flex-shrink-0 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          className={cn(
            'flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-medium border border-line',
            'text-ink-secondary hover:text-ink-primary transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className={cn(
              'flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold',
              'bg-accent text-white hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            Next
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              'flex items-center gap-1.5 h-9 px-4 rounded-md text-[13px] font-semibold',
              'bg-accent text-white hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <Check size={14} aria-hidden="true" />
            {submitting ? 'Creating...' : 'Create Build Job'}
          </button>
        )}
      </div>
    </div>
  );
}
