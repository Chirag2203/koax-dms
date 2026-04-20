'use client';

/**
 * ExistingSaleFieldsForm — sale-floor details form for the Existing branch.
 *
 * Collects:
 *  - Asking price (₹) [required]
 *  - Reserve / floor price [optional]
 *  - Listing notes / dealer remarks [textarea]
 *  - Refurb status enum + budget (₹)
 *  - Photos stub (disabled)
 *
 * On submit:
 *   1. transferOwnership: prior owner → cust-bn-dealer (CONSIGNED_TO_BN)
 *   2. Create inventory listing (currently no real inventory store; we log to console
 *      per mock-phase contract — inventory store will wire in a later phase)
 *   3. Toast → router.push /inventory/{vin}
 *
 * PLAN-VEHICLES-002 §C — Part 2, Step 2 (Existing branch — sale fields)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';
import { cn } from '@dms/ui';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';

// ─── Schema ───────────────────────────────────────────────────────────────────

const saleFieldsSchema = z.object({
  askingPrice: z
    .string()
    .min(1, 'Asking price is required')
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be a positive number'),
  reservePrice: z.string().optional(),
  listingNotes: z.string().optional(),
  refurbStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE']),
  refurbBudget: z.string().optional(),
});

type SaleFieldsFormValues = z.infer<typeof saleFieldsSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExistingSaleFieldsFormProps {
  vin: string;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTOR = { id: 'staff-system', name: 'Inventory System', role: 'R10' };

const REFURB_LABELS: Record<SaleFieldsFormValues['refurbStatus'], string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ExistingSaleFieldsForm({ vin, onCancel }: ExistingSaleFieldsFormProps) {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SaleFieldsFormValues>({
    resolver: zodResolver(saleFieldsSchema),
    defaultValues: {
      refurbStatus: 'NOT_STARTED',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const vehiclesStore = useVehiclesStore.getState();
      const vehicle = vehiclesStore.vehicles[vin];
      if (!vehicle) {
        toast('Vehicle not found in ledger.', 'error');
        return;
      }

      // Step 1: Transfer ownership to BN dealer (CONSIGNED_TO_BN)
      vehiclesStore.transferOwnership(
        {
          vin,
          toCustomerId: 'cust-bn-dealer',
          source: 'BN_CONSIGNMENT',
          kmAtClose: vehicle.lastKnownKm,
          kmAtOpen: vehicle.lastKnownKm,
          closeReason: 'CONSIGNED_TO_BN',
        },
        ACTOR,
      );

      // Step 2: Create listing (mock-phase: console log — inventory store not yet wired)
      console.log('[ExistingSaleFieldsForm] createListing', {
        vin,
        askingPrice: Number(values.askingPrice),
        reservePrice: values.reservePrice ? Number(values.reservePrice) : undefined,
        listingNotes: values.listingNotes,
        refurbStatus: values.refurbStatus,
        refurbBudget: values.refurbBudget ? Number(values.refurbBudget) : undefined,
      });

      // Step 3: Toast + navigate
      toast('Listed for sale', 'success');
      setTimeout(() => {
        router.push(`/inventory/${vin}`);
      }, 800);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      toast(`Failed to list vehicle: ${reason}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <>
      <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
        {/* Page header — canonical detail-page shell. */}
        <div className="border-b border-line pb-5 mb-8">
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            Sale floor details
          </h1>
          <p className="mt-2 text-sm text-ink-secondary font-mono">{vin}</p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col max-w-[640px] gap-6"
        >

        {/* Asking price */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="askingPrice" className="text-sm font-medium text-ink-primary">
            Asking price (₹) <span className="text-state-danger">*</span>
          </label>
          <input
            id="askingPrice"
            type="number"
            min={0}
            step={1000}
            {...register('askingPrice')}
            className={cn(
              'h-10 w-full rounded-md border bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              errors.askingPrice ? 'border-state-danger' : 'border-line',
            )}
            placeholder="e.g. 12500000"
          />
          {errors.askingPrice && (
            <p className="text-xs text-state-danger">{errors.askingPrice.message}</p>
          )}
        </div>

        {/* Reserve price */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reservePrice" className="text-sm font-medium text-ink-primary">
            Reserve / floor price (₹)
            <span className="ml-2 text-[11px] text-ink-muted font-normal">optional</span>
          </label>
          <input
            id="reservePrice"
            type="number"
            min={0}
            step={1000}
            {...register('reservePrice')}
            className={cn(
              'h-10 w-full rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
            )}
            placeholder="e.g. 11000000"
          />
        </div>

        {/* Listing notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listingNotes" className="text-sm font-medium text-ink-primary">
            Listing notes / dealer remarks
            <span className="ml-2 text-[11px] text-ink-muted font-normal">optional</span>
          </label>
          <textarea
            id="listingNotes"
            rows={3}
            {...register('listingNotes')}
            className={cn(
              'w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary',
              'resize-y focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              'placeholder:text-ink-muted',
            )}
            placeholder="Dealer remarks, notable features, refurb notes…"
          />
        </div>

        {/* Refurb status + budget */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="refurbStatus" className="text-sm font-medium text-ink-primary">
              Refurb status
            </label>
            <select
              id="refurbStatus"
              {...register('refurbStatus')}
              className={cn(
                'h-10 w-full rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              )}
            >
              {(Object.keys(REFURB_LABELS) as SaleFieldsFormValues['refurbStatus'][]).map((k) => (
                <option key={k} value={k}>
                  {REFURB_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="refurbBudget" className="text-sm font-medium text-ink-primary">
              Refurb budget (₹)
              <span className="ml-2 text-[11px] text-ink-muted font-normal">optional</span>
            </label>
            <input
              id="refurbBudget"
              type="number"
              min={0}
              step={500}
              {...register('refurbBudget')}
              className={cn(
                'h-10 w-full rounded-md border border-line bg-bg-subtle px-3 text-sm text-ink-primary',
                'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
              )}
              placeholder="e.g. 200000"
            />
          </div>
        </div>

        {/* Photos stub */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-primary">Photos</label>
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line',
              'bg-bg-subtle px-4 py-8 text-center',
            )}
          >
            <Upload className="h-6 w-6 text-ink-muted/50" aria-hidden="true" />
            <p className="text-[13px] text-ink-muted">Upload coming soon</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'h-9 px-5 rounded-md text-sm font-semibold text-white bg-accent',
              'hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isSubmitting ? 'Listing…' : 'List for sale'}
          </button>
        </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
