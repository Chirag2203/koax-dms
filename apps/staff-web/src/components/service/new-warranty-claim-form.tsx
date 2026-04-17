'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronRight,
  ChevronDown,
  Car,
  X,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import { cn } from '@dms/ui';
import { vehicles, staffUsers } from '@dms/mocks/fixtures';
import { useServiceStore } from '@/src/lib/service/service-store';
import { ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';

// ─── Coverage helpers ─────────────────────────────────────────────────────────

// Simulated coverage data keyed by VIN. In real implementation this comes from API.
const COVERAGE_DATA: Record<string, {
  manufacturer?: { active: boolean; from: string; to: string };
  cpo?: { active: boolean; from: string; to: string };
  extended?: { active: boolean; from: string; to: string };
}> = {
  'WP0AB2A91MS247831': {
    manufacturer: { active: true, from: '2021-06-01', to: '2024-06-01' },
    cpo: { active: true, from: '2024-06-15', to: '2025-06-15' },
  },
  'WP0ZZZ97ZNS112045': {
    manufacturer: { active: false, from: '2022-03-01', to: '2025-03-01' },
    extended: { active: true, from: '2025-03-15', to: '2027-03-15' },
  },
  'WP1ZZZ9YZPS034789': {
    manufacturer: { active: true, from: '2023-01-01', to: '2026-01-01' },
  },
  'WP1ZZZ95ZNS078234': {
    manufacturer: { active: true, from: '2022-08-01', to: '2025-08-01' },
    cpo: { active: true, from: '2025-08-20', to: '2026-08-20' },
  },
  'WP0ZZZ98ZMS561902': {
    manufacturer: { active: false, from: '2021-11-01', to: '2024-11-01' },
  },
  'WP0AAA1X8PSA12345': {
    manufacturer: { active: true, from: '2023-05-01', to: '2026-05-01' },
  },
  'WDD2221971A012345': {
    extended: { active: true, from: '2024-09-01', to: '2026-09-01' },
  },
  'WDC1930561A456789': {
    manufacturer: { active: false, from: '2022-04-01', to: '2025-04-01' },
    cpo: { active: true, from: '2025-04-20', to: '2026-04-20' },
  },
  'WDD1900761A789012': {
    manufacturer: { active: true, from: '2023-07-01', to: '2026-07-01' },
  },
  'WDC2229601A234567': {
    manufacturer: { active: false, from: '2021-12-01', to: '2024-12-01' },
  },
};

function getCoverageForVin(vin: string) {
  return COVERAGE_DATA[vin] ?? {};
}

function defaultClaimType(coverage: ReturnType<typeof getCoverageForVin>): string {
  if (coverage.manufacturer?.active) return 'MANUFACTURER';
  if (coverage.cpo?.active) return 'CPO';
  if (coverage.extended?.active) return 'EXTENDED';
  return 'GOODWILL';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const FaultCodeSchema = z.object({
  code: z.string(),
  description: z.string(),
});

const PartsRowSchema = z.object({
  partCode: z.string().min(1, 'Part code required'),
  description: z.string().min(1, 'Description required'),
  qty: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0),
});

const LabourRowSchema = z.object({
  description: z.string().min(1, 'Description required'),
  hours: z.coerce.number().min(0.5, 'Min 0.5h'),
  ratePerHour: z.coerce.number().min(0),
});

const WarrantyClaimFormSchema = z.object({
  vin: z.string().min(1, 'Select or enter a VIN'),
  claimType: z.enum(['MANUFACTURER', 'EXTENDED', 'CPO', 'GOODWILL'], {
    required_error: 'Select a claim type',
  }),
  // Incident
  dateOfFailure: z.string().min(1, 'Select incident date'),
  odometerReading: z.coerce.number().min(0, 'Enter odometer reading'),
  incidentDescription: z.string().min(10, 'Describe the incident in detail'),
  customerComplaint: z.string().min(1, 'Customer complaint required'),
  // Diagnostic
  diagnosisSummary: z.string().min(1, 'Diagnosis summary required'),
  faultCodes: z.array(FaultCodeSchema),
  technicianId: z.string().min(1, 'Select a technician'),
  // Parts
  linkedJobCardId: z.string().optional(),
  parts: z.array(PartsRowSchema),
  labour: z.array(LabourRowSchema),
});

type FormData = z.infer<typeof WarrantyClaimFormSchema>;

// ─── Static data ──────────────────────────────────────────────────────────────

const CLAIM_TYPES = [
  { value: 'MANUFACTURER', label: 'Manufacturer Warranty' },
  { value: 'EXTENDED', label: 'Extended Warranty' },
  { value: 'CPO', label: 'CPO Coverage' },
  { value: 'GOODWILL', label: 'Goodwill' },
] as const;

// Technicians (R11) — derived from deterministic IDs in service fixture
const TECHNICIAN_OPTIONS = [
  { id: 'tech-r11-001', name: 'K. Kumar', outlet: 'Bangalore' },
  { id: 'tech-r11-002', name: 'R. Patel', outlet: 'Mumbai' },
  { id: 'tech-r11-003', name: 'A. Sharma', outlet: 'Chennai' },
  { id: 'tech-r11-004', name: 'S. Verma', outlet: 'Bangalore' },
];

// ─── Class helpers ────────────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'transition-colors',
);

const monoInputCls = cn(inputCls, 'font-mono tabular-nums');

const labelCls = 'block text-[10px] uppercase tracking-wide text-ink-muted mb-1.5 font-medium';
const errorCls = 'text-xs text-state-danger mt-1';

const cardCls = 'rounded-md border border-line bg-bg-surface p-6';
const sectionTitleCls = 'text-[16px] font-semibold leading-[1.4] text-ink-primary mb-4';

// ─── VIN Combobox ─────────────────────────────────────────────────────────────

function VinCombobox({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (vin: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedVehicle = value ? vehicles.find((v) => v.vin === value) ?? null : null;

  const filtered = query.trim().length < 1
    ? []
    : vehicles.filter((v) => {
        const q = query.toLowerCase();
        return (
          v.vin.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q)
        );
      }).slice(0, 8);

  return (
    <div className="relative">
      {selectedVehicle ? (
        <div className={cn('flex items-center gap-2 h-10 bg-bg-subtle border border-line rounded-md px-3', error && 'border-state-danger')}>
          <Car className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1 text-sm text-ink-primary truncate">
            {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            {selectedVehicle.variant ? ` ${selectedVehicle.variant}` : ''}
          </span>
          <span className="font-mono text-[10px] text-ink-muted bg-bg-canvas rounded px-1.5 py-0.5 shrink-0">
            {selectedVehicle.vin}
          </span>
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear selected VIN"
            className="shrink-0 rounded p-0.5 text-ink-muted hover:text-ink-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className={cn('relative', error && '[&_input]:border-state-danger')}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
            <Car className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.length > 0); }}
            onFocus={() => query.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search VIN, make, or model..."
            className={cn(inputCls, 'pl-9', error && 'border-state-danger')}
            aria-autocomplete="list"
            aria-expanded={open}
            aria-haspopup="listbox"
            role="combobox"
          />
        </div>
      )}

      {open && filtered.length > 0 && (
        <ul role="listbox" className="absolute z-20 mt-1 w-full rounded-md border border-line bg-bg-surface shadow-xl overflow-hidden">
          {filtered.map((v) => (
            <li key={v.vin}>
              <button
                type="button"
                onMouseDown={() => { onChange(v.vin); setQuery(''); setOpen(false); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-hover transition-colors"
                role="option"
                aria-selected={false}
              >
                <Car className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ink-primary truncate">
                    {v.year} {v.make} {v.model} {v.variant ?? ''}
                  </span>
                  <span className="font-mono text-[10px] text-ink-muted">{v.vin}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-bg-surface shadow-xl px-3 py-3">
          <p className="text-sm text-ink-muted">No matching vehicles found.</p>
        </div>
      )}
    </div>
  );
}

// ─── Coverage Panel ───────────────────────────────────────────────────────────

function CoveragePanel({ vin }: { vin: string }) {
  const coverage = getCoverageForVin(vin);

  const rows: { label: string; data: { active: boolean; from: string; to: string } | undefined; fallback: string }[] = [
    { label: 'Manufacturer Warranty', data: coverage.manufacturer, fallback: 'No manufacturer warranty on record' },
    { label: 'CPO Coverage', data: coverage.cpo, fallback: 'Not a CPO vehicle' },
    { label: 'Extended Warranty', data: coverage.extended, fallback: 'No extended warranty' },
    { label: 'Goodwill', data: undefined, fallback: 'N/A' },
  ];

  return (
    <div className="mt-4 rounded-md border border-line bg-bg-subtle p-4 space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted font-medium mb-3">Coverage Summary</p>
      {rows.map(({ label, data, fallback }) => (
        <div key={label} className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-ink-secondary">{label}</span>
          {data ? (
            <div className="flex items-center gap-2">
              {data.active ? (
                <ShieldCheck className="h-3.5 w-3.5 text-[rgb(var(--state-listed))]" aria-hidden="true" />
              ) : (
                <ShieldOff className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
              )}
              <span className={cn('font-mono text-[11px]', data.active ? 'text-[rgb(var(--state-listed))]' : 'text-ink-muted')}>
                {data.active ? 'Active' : 'Expired'} · {formatDate(data.from)} – {formatDate(data.to)}
              </span>
            </div>
          ) : (
            <span className="font-mono text-[11px] text-ink-muted">{fallback}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Parts Table ──────────────────────────────────────────────────────────────

function PartsTable({
  fields,
  register,
  errors,
  remove,
  append,
  watchParts,
}: {
  fields: { id: string }[];
  register: ReturnType<typeof useForm<FormData>>['register'];
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  remove: (i: number) => void;
  append: (v: { partCode: string; description: string; qty: number; unitPrice: number }) => void;
  watchParts: FormData['parts'];
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[120px]">Part Code</th>
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wide text-ink-muted">Description</th>
              <th className="pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[64px]">Qty</th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[120px]">Unit Price (₹)</th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[120px]">Line Total</th>
              <th className="pb-2 w-[40px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {fields.map((field, i) => {
              const qty = watchParts[i]?.qty ?? 0;
              const unitPrice = watchParts[i]?.unitPrice ?? 0;
              const lineTotal = qty * unitPrice;
              return (
                <tr key={field.id}>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      placeholder="P/N"
                      {...register(`parts.${i}.partCode`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'font-mono text-xs text-ink-primary placeholder:text-ink-muted',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      placeholder="Part description"
                      {...register(`parts.${i}.description`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'text-xs text-ink-primary placeholder:text-ink-muted',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={1}
                      {...register(`parts.${i}.qty`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'font-mono text-xs text-center text-ink-primary',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      {...register(`parts.${i}.unitPrice`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'font-mono text-xs text-right text-ink-primary',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <span className="font-mono text-xs text-ink-primary tabular-nums">
                      {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      aria-label="Remove part row"
                      className={cn(
                        'inline-flex items-center justify-center h-8 w-8 rounded-md',
                        'text-ink-muted hover:text-state-danger hover:bg-bg-hover transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => append({ partCode: '', description: '', qty: 1, unitPrice: 0 })}
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent',
          'hover:text-accent-hover transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded',
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add part row
      </button>
    </div>
  );
}

// ─── Labour Table ─────────────────────────────────────────────────────────────

function LabourTable({
  fields,
  register,
  remove,
  append,
  watchLabour,
}: {
  fields: { id: string }[];
  register: ReturnType<typeof useForm<FormData>>['register'];
  remove: (i: number) => void;
  append: (v: { description: string; hours: number; ratePerHour: number }) => void;
  watchLabour: FormData['labour'];
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="pb-2 text-left text-[10px] font-medium uppercase tracking-wide text-ink-muted">Description</th>
              <th className="pb-2 text-center text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[80px]">Hours</th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[120px]">Rate/hr (₹)</th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wide text-ink-muted w-[120px]">Line Total</th>
              <th className="pb-2 w-[40px]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {fields.map((field, i) => {
              const hours = watchLabour[i]?.hours ?? 0;
              const rate = watchLabour[i]?.ratePerHour ?? 0;
              const lineTotal = hours * rate;
              return (
                <tr key={field.id}>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      placeholder="Labour description"
                      {...register(`labour.${i}.description`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'text-xs text-ink-primary placeholder:text-ink-muted',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      {...register(`labour.${i}.hours`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'font-mono text-xs text-center text-ink-primary',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      {...register(`labour.${i}.ratePerHour`)}
                      className={cn(
                        'h-9 w-full bg-bg-subtle border border-line rounded-md px-2',
                        'font-mono text-xs text-right text-ink-primary',
                        'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                      )}
                    />
                  </td>
                  <td className="py-2 pr-2 text-right">
                    <span className="font-mono text-xs text-ink-primary tabular-nums">
                      {lineTotal > 0 ? `₹${lineTotal.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length === 1}
                      aria-label="Remove labour row"
                      className={cn(
                        'inline-flex items-center justify-center h-8 w-8 rounded-md',
                        'text-ink-muted hover:text-state-danger hover:bg-bg-hover transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        'disabled:opacity-30 disabled:cursor-not-allowed',
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() => append({ description: '', hours: 1, ratePerHour: 0 })}
        className={cn(
          'mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent',
          'hover:text-accent-hover transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded',
        )}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add labour line
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewWarrantyClaimForm() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();
  const jobCards = useServiceStore((s) => s.jobCards);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(WarrantyClaimFormSchema),
    defaultValues: {
      vin: '',
      claimType: 'MANUFACTURER',
      dateOfFailure: '',
      odometerReading: 0,
      incidentDescription: '',
      customerComplaint: '',
      diagnosisSummary: '',
      faultCodes: [{ code: '', description: '' }],
      technicianId: '',
      linkedJobCardId: '',
      parts: [{ partCode: '', description: '', qty: 1, unitPrice: 0 }],
      labour: [{ description: '', hours: 1, ratePerHour: 0 }],
    },
  });

  const {
    fields: faultCodeFields,
    append: appendFaultCode,
    remove: removeFaultCode,
  } = useFieldArray({ control, name: 'faultCodes' });

  const {
    fields: partsFields,
    append: appendPart,
    remove: removePart,
  } = useFieldArray({ control, name: 'parts' });

  const {
    fields: labourFields,
    append: appendLabour,
    remove: removeLabour,
  } = useFieldArray({ control, name: 'labour' });

  const vin = watch('vin');
  const watchParts = watch('parts');
  const watchLabour = watch('labour');

  // Coverage auto-defaults
  const coverage = vin ? getCoverageForVin(vin) : {};

  // When VIN changes, auto-set claim type
  function handleVinChange(newVin: string) {
    setValue('vin', newVin);
    if (newVin) {
      const cov = getCoverageForVin(newVin);
      const suggested = defaultClaimType(cov);
      setValue('claimType', suggested as FormData['claimType']);
    }
  }

  // Totals
  const totalParts = watchParts.reduce((sum, p) => sum + ((p.qty ?? 0) * (p.unitPrice ?? 0)), 0);
  const totalLabour = watchLabour.reduce((sum, l) => sum + ((l.hours ?? 0) * (l.ratePerHour ?? 0)), 0);
  const grandTotal = totalParts + totalLabour;
  const requiresManagerApproval = grandTotal > 200000;

  // Job cards for this VIN
  const vinJobCards = vin
    ? jobCards.filter((jc) => jc.vin === vin && jc.status !== 'DELIVERED')
    : [];

  const [isSubmitting, setIsSubmitting] = useState(false);

  function submitClaim(data: FormData, status: 'DRAFT' | 'SUBMITTED') {
    setIsSubmitting(true);
    console.log('[NewWarrantyClaimForm] submit (simulated)', { ...data, status });
    const msg = status === 'DRAFT'
      ? 'Warranty claim saved as draft'
      : 'Warranty claim submitted for review';
    toast(msg, 'success');
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/service?tab=warranty');
    }, 800);
  }

  const handleSubmitForReview = handleSubmit((data) => submitClaim(data, 'SUBMITTED'));

  async function handleSaveDraft() {
    await handleSubmit((data) => submitClaim(data, 'DRAFT'))();
  }

  // Role gate: simulate current user as R09 (no R12 perms) — in real app, from auth context
  const currentUserRole: string = 'R09';
  const canSubmitHighValue = currentUserRole === 'R12' || currentUserRole === 'R19' || currentUserRole === 'R24';
  const submitBlocked = requiresManagerApproval && !canSubmitHighValue;

  return (
    <>
      <div className="min-h-full bg-bg-canvas px-6 py-8">
        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Service</span>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Warranty Claims</span>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-primary">New</span>
        </nav>

        {/* ── Page header ── */}
        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary mb-8">
          Raise Warranty Claim
        </h1>

        <form onSubmit={handleSubmitForReview} noValidate>
          <div className="max-w-[900px] space-y-6">

            {/* ── Section 1: VIN & Coverage ─────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-vin">
              <h2 id="section-vin" className={sectionTitleCls}>VIN &amp; Coverage</h2>

              <div className="mb-4">
                <label className={labelCls}>
                  Vehicle VIN <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <Controller
                  name="vin"
                  control={control}
                  render={({ field }) => (
                    <VinCombobox
                      value={field.value}
                      onChange={handleVinChange}
                      error={errors.vin?.message}
                    />
                  )}
                />
                {errors.vin && <p className={errorCls} role="alert">{errors.vin.message}</p>}
              </div>

              {vin && <CoveragePanel vin={vin} />}

              <div className="mt-4">
                <label htmlFor="claimType" className={labelCls}>
                  Claim Type <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="claimType"
                    {...register('claimType')}
                    className={cn(inputCls, 'appearance-none pr-9 cursor-pointer', errors.claimType && 'border-state-danger')}
                  >
                    {CLAIM_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>{ct.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" aria-hidden="true" />
                </div>
                {errors.claimType && <p className={errorCls} role="alert">{errors.claimType.message}</p>}
              </div>
            </section>

            {/* ── Section 2: Incident ──────────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-incident">
              <h2 id="section-incident" className={sectionTitleCls}>Incident Details</h2>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-5">
                <div>
                  <label htmlFor="dateOfFailure" className={labelCls}>
                    Date of Failure <span className="text-ink-muted" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="dateOfFailure"
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    {...register('dateOfFailure')}
                    className={cn(inputCls, errors.dateOfFailure && 'border-state-danger')}
                  />
                  {errors.dateOfFailure && <p className={errorCls} role="alert">{errors.dateOfFailure.message}</p>}
                </div>

                <div>
                  <label htmlFor="odometerReading" className={labelCls}>
                    Odometer at Incident (km) <span className="text-ink-muted" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="odometerReading"
                    type="number"
                    min={0}
                    placeholder="e.g. 28450"
                    {...register('odometerReading')}
                    className={cn(monoInputCls, errors.odometerReading && 'border-state-danger')}
                  />
                  {errors.odometerReading && <p className={errorCls} role="alert">{errors.odometerReading.message}</p>}
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="incidentDescription" className={labelCls}>
                  Incident Description <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="incidentDescription"
                  rows={3}
                  placeholder="Describe the symptoms, conditions when fault occurred, and initial assessment..."
                  {...register('incidentDescription')}
                  className={cn(
                    'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                    'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[80px]',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors',
                    errors.incidentDescription && 'border-state-danger',
                  )}
                />
                {errors.incidentDescription && <p className={errorCls} role="alert">{errors.incidentDescription.message}</p>}
              </div>

              <div>
                <label htmlFor="customerComplaint" className={labelCls}>
                  Customer Complaint <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="customerComplaint"
                  rows={2}
                  placeholder="Verbatim or summarised customer complaint..."
                  {...register('customerComplaint')}
                  className={cn(
                    'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                    'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[64px]',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors',
                    errors.customerComplaint && 'border-state-danger',
                  )}
                />
                {errors.customerComplaint && <p className={errorCls} role="alert">{errors.customerComplaint.message}</p>}
              </div>
            </section>

            {/* ── Section 3: Diagnostic Report ─────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-diagnostic">
              <h2 id="section-diagnostic" className={sectionTitleCls}>Diagnostic Report</h2>

              <div className="mb-5">
                <label htmlFor="diagnosisSummary" className={labelCls}>
                  Diagnosis Summary <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="diagnosisSummary"
                  rows={3}
                  placeholder="Technician's diagnosis, root cause analysis..."
                  {...register('diagnosisSummary')}
                  className={cn(
                    'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                    'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[80px]',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors',
                    errors.diagnosisSummary && 'border-state-danger',
                  )}
                />
                {errors.diagnosisSummary && <p className={errorCls} role="alert">{errors.diagnosisSummary.message}</p>}
              </div>

              {/* Fault codes */}
              <div className="mb-5">
                <label className={labelCls}>Fault Codes</label>
                <div className="space-y-2">
                  {faultCodeFields.map((field, i) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Code (e.g. P0301)"
                        {...register(`faultCodes.${i}.code`)}
                        className={cn(
                          'h-9 w-[140px] shrink-0 bg-bg-subtle border border-line rounded-md px-2',
                          'font-mono text-xs uppercase text-ink-primary placeholder:text-ink-muted',
                          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                        )}
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        {...register(`faultCodes.${i}.description`)}
                        className={cn(
                          'h-9 flex-1 bg-bg-subtle border border-line rounded-md px-2',
                          'text-xs text-ink-primary placeholder:text-ink-muted',
                          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => faultCodeFields.length > 1 && removeFaultCode(i)}
                        disabled={faultCodeFields.length === 1}
                        aria-label="Remove fault code"
                        className={cn(
                          'inline-flex items-center justify-center h-8 w-8 rounded-md shrink-0',
                          'text-ink-muted hover:text-state-danger hover:bg-bg-hover transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          'disabled:opacity-30 disabled:cursor-not-allowed',
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => appendFaultCode({ code: '', description: '' })}
                  className={cn(
                    'mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent',
                    'hover:text-accent-hover transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded',
                  )}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add fault code
                </button>
              </div>

              {/* Technician */}
              <div className="mb-5">
                <label htmlFor="technicianId" className={labelCls}>
                  Diagnosing Technician <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="technicianId"
                    {...register('technicianId')}
                    className={cn(inputCls, 'appearance-none pr-9 cursor-pointer', errors.technicianId && 'border-state-danger')}
                  >
                    <option value="">Select technician...</option>
                    {TECHNICIAN_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} — {t.outlet}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" aria-hidden="true" />
                </div>
                {errors.technicianId && <p className={errorCls} role="alert">{errors.technicianId.message}</p>}
              </div>

              {/* Diagnostic images stub */}
              <div>
                <label className={labelCls}>Diagnostic Images</label>
                <div className={cn(
                  'rounded-md border-2 border-dashed border-line p-6',
                  'flex flex-col items-center justify-center gap-2 text-center',
                  'bg-bg-subtle hover:border-accent/50 transition-colors cursor-pointer',
                )}>
                  <Upload className="h-6 w-6 text-ink-muted" aria-hidden="true" />
                  <p className="text-sm text-ink-secondary font-medium">Drop images or click to upload</p>
                  <p className="text-[11px] text-ink-muted">PNG, JPG, PDF — max 50 MB each</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="sr-only"
                    aria-label="Upload diagnostic images"
                  />
                </div>
              </div>
            </section>

            {/* ── Section 4: Parts Required ────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-parts">
              <h2 id="section-parts" className={sectionTitleCls}>Parts Required</h2>

              {/* Linked job card */}
              <div className="mb-5">
                <label htmlFor="linkedJobCardId" className={labelCls}>Linked Job Card</label>
                <div className="relative">
                  <select
                    id="linkedJobCardId"
                    {...register('linkedJobCardId')}
                    className={cn(inputCls, 'appearance-none pr-9 cursor-pointer font-mono')}
                  >
                    <option value="">None</option>
                    {vinJobCards.map((jc) => (
                      <option key={jc.id} value={jc.id}>
                        {jc.jobNo} — {jc.status}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" aria-hidden="true" />
                </div>
              </div>

              <PartsTable
                fields={partsFields}
                register={register}
                errors={errors}
                remove={removePart}
                append={appendPart}
                watchParts={watchParts}
              />
            </section>

            {/* ── Labour Lines ─────────────────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-labour">
              <h2 id="section-labour" className={sectionTitleCls}>Labour Lines</h2>
              <LabourTable
                fields={labourFields}
                register={register}
                remove={removeLabour}
                append={appendLabour}
                watchLabour={watchLabour}
              />
            </section>

            {/* ── Section 5: Claim Summary ─────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-summary">
              <h2 id="section-summary" className={sectionTitleCls}>Claim Summary</h2>

              <dl className="space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <dt className="text-sm text-ink-secondary">Total Parts</dt>
                  <dd className="font-mono text-sm text-ink-primary tabular-nums">
                    ₹{totalParts.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <dt className="text-sm text-ink-secondary">Total Labour</dt>
                  <dd className="font-mono text-sm text-ink-primary tabular-nums">
                    ₹{totalLabour.toLocaleString('en-IN')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-semibold text-ink-primary">Grand Total</dt>
                  <dd className="font-mono text-[16px] font-semibold text-ink-primary tabular-nums">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </dd>
                </div>
              </dl>

              {/* High-value approval banner */}
              {requiresManagerApproval && (
                <div className={cn(
                  'mt-5 flex items-start gap-3 rounded-md border border-[rgb(var(--state-stale))]',
                  'bg-[rgb(var(--state-stale)/0.06)] px-4 py-3',
                )}>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[rgb(var(--state-stale))]" aria-hidden="true" />
                  <p className="text-[13px] text-ink-secondary leading-snug">
                    Claims above ₹2,00,000 require Service Manager (R12) approval before submission.{' '}
                    {submitBlocked && (
                      <span className="font-medium text-[rgb(var(--state-stale))]">
                        You do not have sufficient permissions to submit this claim directly.
                      </span>
                    )}
                  </p>
                </div>
              )}
            </section>

            {/* ── Footer actions ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => router.push('/service?tab=warranty')}
                className={cn(
                  'h-10 px-4 rounded-md text-sm font-medium text-ink-secondary',
                  'border border-line bg-bg-surface hover:bg-bg-subtle hover:text-ink-primary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                )}
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveDraft}
                  className={cn(
                    'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
                    'bg-bg-surface text-sm font-medium text-ink-primary',
                    'hover:bg-bg-subtle transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  Save Draft
                </button>

                <div className="relative group">
                  <button
                    type="submit"
                    disabled={isSubmitting || submitBlocked}
                    aria-disabled={submitBlocked}
                    title={submitBlocked ? 'Service Manager (R12) approval required for claims above ₹2,00,000' : undefined}
                    className={cn(
                      'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white',
                      'text-sm font-medium hover:bg-accent-hover transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {isSubmitting ? 'Submitting…' : 'Submit for Review'}
                  </button>
                  {submitBlocked && (
                    <div
                      role="tooltip"
                      className={cn(
                        'pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:block',
                        'w-[260px] rounded-md border border-line bg-bg-surface px-3 py-2 shadow-xl',
                        'text-[12px] text-ink-secondary leading-snug',
                      )}
                    >
                      Claim exceeds ₹2,00,000. Service Manager (R12) approval required before submission.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
