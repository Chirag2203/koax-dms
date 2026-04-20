'use client';

/**
 * NewVehicleIntakeForm — Step 2 (New branch) of the Add Car flow.
 * Sections: A) Owner, B) Vehicle, C) Sale. 5-step submit sequence.
 * PLAN-VEHICLES-002 §C — Part 2, Step 2 (New branch)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';
import { cn } from '@dms/ui';
import { normalizeVin } from '@dms/vehicles-core';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';

// ─── Schema ───────────────────────────────────────────────────────────────────

const intakeSchema = z.object({
  ownerName: z.string().min(2, 'Name is required'),
  ownerPhone: z.string().regex(/^\+91\d{10}$/, 'Use +91XXXXXXXXXX format'),
  ownerEmail: z.string().email('Valid email required'),
  ownerCity: z.enum(['bangalore', 'mumbai', 'chennai'], { errorMap: () => ({ message: 'Select a city' }) }),
  contactConfidential: z.boolean(),
  vin: z.string().length(17, 'VIN must be 17 characters'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  year: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 1990 && Number(v) <= 2030, 'Year 1990–2030'),
  color: z.string().optional(),
  rcNumber: z.string().optional(),
  km: z.string().refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), 'Non-negative'),
  askingPrice: z.string().min(1, 'Required').refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Positive number'),
  reservePrice: z.string().optional(),
  listingNotes: z.string().optional(),
  refurbStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE']),
  refurbBudget: z.string().optional(),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

// ─── Props + constants ────────────────────────────────────────────────────────

export interface NewVehicleIntakeFormProps { onCancel: () => void; }

const ACTOR = { id: 'staff-system', name: 'Inventory System', role: 'R10' };
const CITY_TO_OUTLET = { bangalore: 'BLR-01', mumbai: 'MUM-01', chennai: 'CHE-01' } as const;
const CURRENT_YEAR = new Date().getFullYear();

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const icls = (err?: boolean) => cn(
  'h-10 w-full rounded-md border bg-bg-subtle px-3 text-sm text-ink-primary',
  'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
  err ? 'border-state-danger' : 'border-line',
);

const Err = ({ m }: { m?: string }) => m ? <p className="text-xs text-state-danger">{m}</p> : null;

const Sec = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[13px] font-semibold text-ink-muted uppercase tracking-widest pt-2 border-t border-line">{children}</h3>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function NewVehicleIntakeForm({ onCancel }: NewVehicleIntakeFormProps) {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { contactConfidential: false, refurbStatus: 'NOT_STARTED', year: String(CURRENT_YEAR), km: '0' },
  });

  const onSubmit = handleSubmit(async (v) => {
    setIsSubmitting(true);
    let customerId: string | undefined;
    let vin: string | undefined;
    try {
      // Step 1: Create customer
      const c = useCustomersStore.getState().createCustomer(
        { name: v.ownerName, phone: v.ownerPhone, email: v.ownerEmail, preferredCity: v.ownerCity, contactConfidential: v.contactConfidential },
        ACTOR,
      );
      customerId = c.id;

      // Step 2: Upsert vehicle
      try { vin = normalizeVin(v.vin); } catch { vin = v.vin.trim().toUpperCase(); }
      const now = new Date().toISOString();
      const km = v.km ? Number(v.km) : 0;
      useVehiclesStore.getState().upsertVehicle(
        { vin, make: v.make, model: v.model, variant: v.variant || undefined, year: Number(v.year), color: v.color || 'Unknown', rcNumber: v.rcNumber || `RC-${vin.slice(-6)}`, firstTouchedAt: now, firstTouchSource: 'BN_CONSIGNMENT', firstTouchOutletId: CITY_TO_OUTLET[v.ownerCity], lastKnownKm: km, lastKnownKmAt: now },
        ACTOR,
      );

      // Step 3: Open prior owner row
      useVehiclesStore.getState().openOwnership(
        { vin, customerId, source: 'LEGACY_IMPORT', kmAtOpen: km, fromAt: now },
        ACTOR,
      );

      // Step 4: Transfer to BN dealer
      useVehiclesStore.getState().transferOwnership(
        { vin, toCustomerId: 'cust-bn-dealer', source: 'BN_CONSIGNMENT', kmAtClose: km, kmAtOpen: km, closeReason: 'CONSIGNED_TO_BN' },
        ACTOR,
      );

      // Step 5: Create listing (mock-phase)
      console.log('[NewVehicleIntakeForm] createListing', { vin, askingPrice: Number(v.askingPrice), reservePrice: v.reservePrice ? Number(v.reservePrice) : undefined, listingNotes: v.listingNotes, refurbStatus: v.refurbStatus, refurbBudget: v.refurbBudget ? Number(v.refurbBudget) : undefined, customerId });

      toast('Vehicle listed for sale', 'success');
      setTimeout(() => router.push(`/vehicles/${vin}`), 800);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      const ids = [customerId && `customer=${customerId}`, vin && `vin=${vin}`].filter(Boolean).join(', ');
      toast(`Step failed: ${reason}${ids ? `. Created: ${ids}. Resolve manually.` : ''}`, 'error', 7000);
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
            New vehicle intake
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Capture owner, vehicle, and sale details.
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="flex flex-col max-w-[920px] gap-5">

        {/* A — Owner */}
        <Sec>A — Owner details</Sec>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ownerName" className="text-sm font-medium text-ink-primary">Name <span className="text-state-danger">*</span></label>
            <input id="ownerName" {...register('ownerName')} className={icls(!!errors.ownerName)} placeholder="Rajesh Sharma" />
            <Err m={errors.ownerName?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ownerPhone" className="text-sm font-medium text-ink-primary">Phone <span className="text-state-danger">*</span></label>
            <input id="ownerPhone" {...register('ownerPhone')} className={icls(!!errors.ownerPhone)} placeholder="+91XXXXXXXXXX" />
            <Err m={errors.ownerPhone?.message} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ownerEmail" className="text-sm font-medium text-ink-primary">Email <span className="text-state-danger">*</span></label>
            <input id="ownerEmail" type="email" {...register('ownerEmail')} className={icls(!!errors.ownerEmail)} placeholder="owner@gmail.com" />
            <Err m={errors.ownerEmail?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ownerCity" className="text-sm font-medium text-ink-primary">City <span className="text-state-danger">*</span></label>
            <select id="ownerCity" {...register('ownerCity')} className={icls(!!errors.ownerCity)}>
              <option value="">Select…</option>
              <option value="bangalore">Bangalore</option>
              <option value="mumbai">Mumbai</option>
              <option value="chennai">Chennai</option>
            </select>
            <Err m={errors.ownerCity?.message} />
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" {...register('contactConfidential')} className="h-4 w-4 rounded border-line accent-accent" />
          <span className="text-sm text-ink-secondary">
            Mark contact details as confidential
            <span className="ml-1 text-[11px] text-ink-muted">(masked for staff below R19)</span>
          </span>
        </label>

        {/* B — Vehicle */}
        <Sec>B — Vehicle details</Sec>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="vin" className="text-sm font-medium text-ink-primary">VIN <span className="text-state-danger">*</span></label>
          <input id="vin" {...register('vin')} className={cn(icls(!!errors.vin), 'font-mono tracking-wide')} placeholder="WBA3A5C50DF123456" maxLength={17} />
          <Err m={errors.vin?.message} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(['make', 'model', 'variant'] as const).map((f) => (
            <div key={f} className="flex flex-col gap-1.5">
              <label htmlFor={f} className="text-sm font-medium text-ink-primary capitalize">{f}{f !== 'variant' && <span className="text-state-danger ml-0.5">*</span>}</label>
              <input id={f} {...register(f)} className={icls(!!(errors as Record<string, unknown>)[f])} placeholder={f === 'make' ? 'BMW' : f === 'model' ? 'M3' : 'Competition'} />
              <Err m={(errors as Record<string, { message?: string }>)[f]?.message} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="year" className="text-sm font-medium text-ink-primary">Year <span className="text-state-danger">*</span></label>
            <input id="year" type="number" min={1990} max={2030} {...register('year')} className={icls(!!errors.year)} placeholder={String(CURRENT_YEAR)} />
            <Err m={errors.year?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="color" className="text-sm font-medium text-ink-primary">Color</label>
            <input id="color" {...register('color')} className={icls()} placeholder="Frozen Black" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="km" className="text-sm font-medium text-ink-primary">Current km</label>
            <input id="km" type="number" min={0} {...register('km')} className={icls(!!errors.km)} placeholder="0" />
            <Err m={errors.km?.message} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rcNumber" className="text-sm font-medium text-ink-primary">RC number</label>
          <input id="rcNumber" {...register('rcNumber')} className={icls()} placeholder="KA01AB1234" />
        </div>

        {/* C — Sale */}
        <Sec>C — Sale-specific details</Sec>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="askingPrice" className="text-sm font-medium text-ink-primary">Asking price (₹) <span className="text-state-danger">*</span></label>
            <input id="askingPrice" type="number" min={0} step={1000} {...register('askingPrice')} className={icls(!!errors.askingPrice)} placeholder="12500000" />
            <Err m={errors.askingPrice?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reservePrice" className="text-sm font-medium text-ink-primary">Reserve price (₹)</label>
            <input id="reservePrice" type="number" min={0} step={1000} {...register('reservePrice')} className={icls()} placeholder="11000000" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listingNotes" className="text-sm font-medium text-ink-primary">Listing notes</label>
          <textarea id="listingNotes" rows={3} {...register('listingNotes')} className={cn('w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary resize-y focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder:text-ink-muted')} placeholder="Notable features, condition remarks…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="refurbStatus" className="text-sm font-medium text-ink-primary">Refurb status</label>
            <select id="refurbStatus" {...register('refurbStatus')} className={icls()}>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="refurbBudget" className="text-sm font-medium text-ink-primary">Refurb budget (₹)</label>
            <input id="refurbBudget" type="number" min={0} step={500} {...register('refurbBudget')} className={icls()} placeholder="200000" />
          </div>
        </div>

        {/* Photos stub */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-primary">Photos</span>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-bg-subtle px-4 py-8 text-center">
            <Upload className="h-6 w-6 text-ink-muted/50" aria-hidden="true" />
            <p className="text-[13px] text-ink-muted">Upload coming soon</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-line">
          <button type="button" onClick={onCancel} className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            ← Back
          </button>
          <button type="submit" disabled={isSubmitting} className="h-9 px-5 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Processing…' : 'Add to Sale Inventory'}
          </button>
        </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
