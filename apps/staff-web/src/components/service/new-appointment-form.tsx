'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronRight,
  ChevronDown,
  Car,
  User,
  X,
  Clock,
  Check,
} from 'lucide-react';
import { cn } from '@dms/ui';
import { vehicles, serviceTypes, staffUsers } from '@dms/mocks/fixtures';
import { ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  { time: '09:00', label: '9:00 AM', state: 'available' as const },
  { time: '10:00', label: '10:00 AM', state: 'booked' as const },
  { time: '11:00', label: '11:00 AM', state: 'available' as const },
  { time: '12:00', label: '12:00 PM', state: 'limited' as const },
  { time: '13:00', label: '1:00 PM', state: 'available' as const },
  { time: '14:00', label: '2:00 PM', state: 'booked' as const },
  { time: '15:00', label: '3:00 PM', state: 'available' as const },
  { time: '16:00', label: '4:00 PM', state: 'booked' as const },
  { time: '17:00', label: '5:00 PM', state: 'available' as const },
];

const DROP_OFF_OPTIONS = [
  { value: 'self-drive', label: 'Self-drive' },
  { value: 'pickup-requested', label: 'Pickup requested' },
] as const;

// Mock customer data for the combobox
const MOCK_CUSTOMERS = [
  { id: 'customer-001', name: 'Rohit Malhotra', phone: '9876543210', email: 'rohit.malhotra@gmail.com', vins: ['WP0AB2A91MS247831'] },
  { id: 'customer-002', name: 'Kavitha Nair', phone: '9845671234', email: 'kavitha.nair@outlook.com', vins: ['WP0ZZZ97ZNS112045'] },
  { id: 'customer-003', name: 'Siddharth Joshi', phone: '9812345678', email: 'siddharth.joshi@gmail.com', vins: ['WP1ZZZ9YZPS034789'] },
  { id: 'customer-004', name: 'Divya Menon', phone: '9700123456', email: 'divya.menon@yahoo.com', vins: ['WP1ZZZ95ZNS078234'] },
  { id: 'customer-005', name: 'Aditya Rao', phone: '9988776655', email: 'aditya.rao@protonmail.com', vins: ['WP0ZZZ98ZMS561902'] },
];

// Service advisors (R09 role from staff fixture)
const SERVICE_ADVISORS = staffUsers.filter((u) => u.role === 'R09');

// Bays
const BAY_OPTIONS = [
  { value: 'bay-blr-01', label: 'BAY-01 (General)' },
  { value: 'bay-blr-02', label: 'BAY-02 (Detailing)' },
  { value: 'bay-blr-03', label: 'BAY-03 (Mechanical)' },
  { value: 'bay-mum-01', label: 'BAY-01 Mumbai (General)' },
  { value: 'bay-che-01', label: 'BAY-01 Chennai (General)' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const NewAppointmentSchema = z.object({
  customerMode: z.enum(['existing', 'new']),
  // Existing customer
  existingCustomerId: z.string().optional(),
  // New customer fields
  newCustomerName: z.string().optional(),
  newCustomerPhone: z.string().optional(),
  newCustomerEmail: z.string().optional(),
  // Asset
  assetMode: z.enum(['existing', 'other']),
  existingVin: z.string().optional(),
  otherVin: z.string().optional(),
  otherRegNo: z.string().optional(),
  otherYear: z.string().optional(),
  otherMake: z.string().optional(),
  otherModel: z.string().optional(),
  // Service protocol
  serviceTypeIds: z.array(z.string()).min(1, 'Select at least one service type'),
  customerComplaints: z.string().min(1, 'Customer complaint is required'),
  dropOffMethod: z.enum(['self-drive', 'pickup-requested']),
  // Scheduling
  scheduledDate: z.string().min(1, 'Select a date'),
  scheduledTime: z.string().min(1, 'Select a time slot'),
  advisorId: z.string().optional(),
  bayId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.customerMode === 'existing' && !data.existingCustomerId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select an existing customer', path: ['existingCustomerId'] });
  }
  if (data.customerMode === 'new') {
    if (!data.newCustomerName || data.newCustomerName.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name must be at least 2 characters', path: ['newCustomerName'] });
    }
    if (!data.newCustomerPhone || !/^\d{10}$/.test(data.newCustomerPhone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter exactly 10 digits after +91', path: ['newCustomerPhone'] });
    }
    if (data.newCustomerEmail && data.newCustomerEmail.length > 0 && !/\S+@\S+\.\S+/.test(data.newCustomerEmail)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email', path: ['newCustomerEmail'] });
    }
  }
  if (data.assetMode === 'existing' && !data.existingVin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Select a vehicle', path: ['existingVin'] });
  }
  if (data.assetMode === 'other' && !data.otherVin && !data.otherRegNo) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a VIN or registration number', path: ['otherVin'] });
  }
});

type FormData = z.infer<typeof NewAppointmentSchema>;

// ─── Class helpers ────────────────────────────────────────────────────────────

const inputCls = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
  'text-sm text-ink-primary placeholder:text-ink-muted',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
  'transition-colors',
);

const labelCls = 'block text-[10px] uppercase tracking-wide text-ink-muted mb-1.5 font-medium';
const errorCls = 'text-xs text-state-danger mt-1';

const cardCls = 'rounded-md border border-line bg-bg-surface p-6';
const sectionTitleCls = 'text-[16px] font-semibold leading-[1.4] text-ink-primary mb-4';

// ─── Customer Combobox ────────────────────────────────────────────────────────

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  email: string;
  vins: string[];
}

function CustomerCombobox({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value ? MOCK_CUSTOMERS.find((c) => c.id === value) ?? null : null;

  const filtered = query.trim().length < 1
    ? []
    : MOCK_CUSTOMERS.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.vins.some((v) => v.toLowerCase().includes(q))
        );
      }).slice(0, 8);

  return (
    <div className="relative">
      {selected ? (
        <div className={cn('flex items-center gap-2 h-10 bg-bg-subtle border border-line rounded-md px-3', error && 'border-state-danger')}>
          <User className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="flex-1 text-sm text-ink-primary truncate">{selected.name}</span>
          <span className="font-mono text-[10px] text-ink-muted">{selected.phone}</span>
          <button
            type="button"
            onClick={() => { onChange(undefined); setQuery(''); inputRef.current?.focus(); }}
            aria-label="Clear selected customer"
            className="shrink-0 rounded p-0.5 text-ink-muted hover:text-ink-primary transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className={cn('relative', error && '[&_input]:border-state-danger')}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.length > 0); }}
            onFocus={() => query.length > 0 && setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search by name, phone, or VIN..."
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
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={() => { onChange(c.id); setQuery(''); setOpen(false); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bg-hover transition-colors"
                role="option"
                aria-selected={false}
              >
                <User className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-ink-primary">{c.name}</span>
                  <span className="font-mono text-[10px] text-ink-muted">{c.phone}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-line bg-bg-surface shadow-xl px-3 py-3">
          <p className="text-sm text-ink-muted">No matching customers found.</p>
        </div>
      )}
    </div>
  );
}

// ─── Selected Customer Summary ────────────────────────────────────────────────

function CustomerSummaryCard({ customer }: { customer: CustomerOption }) {
  return (
    <div className="mt-3 rounded-md border border-line bg-bg-subtle p-4 flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-semibold">
        {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-primary">{customer.name}</p>
        <p className="font-mono text-[11px] text-ink-muted">+91 {customer.phone}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-wide text-ink-muted">Vehicles on file</p>
        <p className="font-mono text-[11px] text-ink-primary">{customer.vins.length}</p>
      </div>
    </div>
  );
}

// ─── Service Type Multi-Select ────────────────────────────────────────────────

function ServiceTypeSelector({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {serviceTypes.map((st) => {
          const selected = value.includes(st.id);
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => toggle(st.id)}
              className={cn(
                'flex items-start gap-3 rounded-md border p-3 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                selected
                  ? 'border-accent bg-accent/5 text-ink-primary'
                  : 'border-line bg-bg-subtle hover:border-accent/50 text-ink-primary',
              )}
              aria-pressed={selected}
            >
              <div className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors', selected ? 'border-accent bg-accent' : 'border-line bg-bg-canvas')}>
                {selected && <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">{st.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-muted leading-snug line-clamp-2">{st.description.split('.')[0]}.</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                  <span className="font-mono text-[10px] text-ink-muted">{st.durationHours}h est.</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className={errorCls} role="alert">{error}</p>}
    </div>
  );
}

// ─── Time Slot Grid ───────────────────────────────────────────────────────────

function TimeSlotGrid({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (t: string) => void;
  error?: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {TIME_SLOTS.map((slot) => {
          const isBooked = slot.state === 'booked';
          const isLimited = slot.state === 'limited';
          const isSelected = value === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={isBooked}
              onClick={() => !isBooked && onChange(slot.time)}
              className={cn(
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                isBooked && 'cursor-not-allowed border-line bg-bg-canvas text-ink-muted opacity-50',
                isLimited && !isSelected && 'border-[rgb(var(--state-stale))] bg-[rgb(var(--state-stale)/0.06)] text-[rgb(var(--state-stale))]',
                !isBooked && !isSelected && !isLimited && 'border-line bg-bg-subtle text-ink-primary hover:border-accent/50',
                isSelected && 'border-accent bg-accent text-white',
              )}
              aria-pressed={isSelected}
              aria-disabled={isBooked}
              title={isBooked ? 'Slot booked' : isLimited ? 'Limited availability' : undefined}
            >
              {slot.label}
              {isLimited && !isSelected && (
                <span className="ml-1 font-mono text-[9px] uppercase">ltd</span>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className={errorCls} role="alert">{error}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NewAppointmentForm() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(NewAppointmentSchema),
    defaultValues: {
      customerMode: 'existing',
      assetMode: 'existing',
      serviceTypeIds: [],
      dropOffMethod: 'self-drive',
      scheduledDate: '',
      scheduledTime: '',
    },
  });

  const customerMode = watch('customerMode');
  const assetMode = watch('assetMode');
  const existingCustomerId = watch('existingCustomerId');
  const selectedServiceTypeIds = watch('serviceTypeIds');
  const scheduledTime = watch('scheduledTime');

  const selectedCustomer = existingCustomerId
    ? MOCK_CUSTOMERS.find((c) => c.id === existingCustomerId) ?? null
    : null;

  // Estimated duration from selected service types
  const estimatedDurationHours = selectedServiceTypeIds.reduce((total, id) => {
    const st = serviceTypes.find((s) => s.id === id);
    return total + (st?.durationHours ?? 0);
  }, 0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function onSubmit(data: FormData, isDraft: boolean) {
    setIsSubmitting(true);
    console.log('[NewAppointmentForm] submit (simulated)', { ...data, isDraft });
    const msg = isDraft ? 'Appointment saved as draft' : 'Appointment confirmed successfully';
    toast(msg, 'success');
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/service?tab=appointments');
    }, 800);
  }

  const handleConfirm = handleSubmit((data) => onSubmit(data, false));

  async function handleSaveDraft() {
    await handleSubmit((data) => onSubmit(data, true))();
  }

  // Vehicles belonging to the selected customer
  const customerVehicles = selectedCustomer
    ? vehicles.filter((v) => selectedCustomer.vins.includes(v.vin))
    : [];

  return (
    <>
      <div className="min-h-full bg-bg-canvas px-6 py-8">
        {/* ── Breadcrumb ── */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Service</span>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">Appointments</span>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-primary">New</span>
        </nav>

        {/* ── Page header ── */}
        <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary mb-8">
          New Appointment
        </h1>

        <form onSubmit={handleConfirm} noValidate>
          <div className="max-w-[900px] space-y-6">

            {/* ── Section 1: Customer ──────────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-customer">
              <h2 id="section-customer" className={sectionTitleCls}>Customer</h2>

              {/* Radio toggle */}
              <div className="flex gap-4 mb-5" role="radiogroup" aria-label="Customer type">
                {(['existing', 'new'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={mode}
                      checked={customerMode === mode}
                      onChange={() => { setValue('customerMode', mode); setValue('existingCustomerId', undefined); }}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="text-sm text-ink-primary capitalize">
                      {mode === 'existing' ? 'Existing customer' : 'New customer'}
                    </span>
                  </label>
                ))}
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <label className={labelCls}>
                    Customer <span className="text-ink-muted" aria-hidden="true">*</span>
                  </label>
                  <Controller
                    name="existingCustomerId"
                    control={control}
                    render={({ field }) => (
                      <CustomerCombobox
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.existingCustomerId?.message}
                      />
                    )}
                  />
                  {errors.existingCustomerId && (
                    <p className={errorCls} role="alert">{errors.existingCustomerId.message}</p>
                  )}
                  {selectedCustomer && <CustomerSummaryCard customer={selectedCustomer} />}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="newCustomerName" className={labelCls}>
                      Full Name <span className="text-ink-muted" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="newCustomerName"
                      type="text"
                      placeholder="Full name"
                      {...register('newCustomerName')}
                      className={cn(inputCls, errors.newCustomerName && 'border-state-danger')}
                    />
                    {errors.newCustomerName && <p className={errorCls} role="alert">{errors.newCustomerName.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="newCustomerPhone" className={labelCls}>
                      Phone <span className="text-ink-muted" aria-hidden="true">*</span>
                    </label>
                    <div className="flex">
                      <span className="flex items-center px-3 h-10 bg-bg-canvas border border-r-0 border-line rounded-l-md text-sm text-ink-secondary font-mono shrink-0">
                        +91
                      </span>
                      <input
                        id="newCustomerPhone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="00000 00000"
                        {...register('newCustomerPhone')}
                        className={cn(inputCls, 'rounded-l-none font-mono', errors.newCustomerPhone && 'border-state-danger')}
                      />
                    </div>
                    {errors.newCustomerPhone && <p className={errorCls} role="alert">{errors.newCustomerPhone.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="newCustomerEmail" className={labelCls}>Email</label>
                    <input
                      id="newCustomerEmail"
                      type="email"
                      placeholder="email@example.com"
                      {...register('newCustomerEmail')}
                      className={cn(inputCls, errors.newCustomerEmail && 'border-state-danger')}
                    />
                    {errors.newCustomerEmail && <p className={errorCls} role="alert">{errors.newCustomerEmail.message}</p>}
                  </div>
                </div>
              )}
            </section>

            {/* ── Section 2: Asset ─────────────────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-asset">
              <h2 id="section-asset" className={sectionTitleCls}>Asset</h2>

              <div className="flex gap-4 mb-5" role="radiogroup" aria-label="Asset type">
                {(['existing', 'other'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={mode}
                      checked={assetMode === mode}
                      onChange={() => { setValue('assetMode', mode); setValue('existingVin', undefined); }}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="text-sm text-ink-primary">
                      {mode === 'existing' ? "Customer's vehicle" : 'Other (enter VIN / reg)'}
                    </span>
                  </label>
                ))}
              </div>

              {assetMode === 'existing' ? (
                <div>
                  {customerVehicles.length === 0 ? (
                    <div className="rounded-md border border-line bg-bg-subtle px-4 py-3 text-sm text-ink-muted">
                      {selectedCustomer
                        ? 'No vehicles on file for this customer.'
                        : 'Select a customer first to see their vehicles.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className={labelCls}>
                        Vehicle <span className="text-ink-muted" aria-hidden="true">*</span>
                      </label>
                      {customerVehicles.map((v) => {
                        const existingVin = watch('existingVin');
                        const isSelected = existingVin === v.vin;
                        return (
                          <button
                            key={v.vin}
                            type="button"
                            onClick={() => setValue('existingVin', v.vin)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                              isSelected ? 'border-accent bg-accent/5' : 'border-line bg-bg-subtle hover:border-accent/50',
                            )}
                            aria-pressed={isSelected}
                          >
                            <Car className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-ink-primary">
                                {v.year} {v.make} {v.model} {v.variant ?? ''}
                              </span>
                              <span className="font-mono text-[10px] text-ink-muted">{v.vin}</span>
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {errors.existingVin && <p className={errorCls} role="alert">{errors.existingVin.message}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label htmlFor="otherVin" className={labelCls}>VIN</label>
                    <input
                      id="otherVin"
                      type="text"
                      placeholder="17-character VIN"
                      {...register('otherVin')}
                      className={cn(inputCls, 'font-mono uppercase', errors.otherVin && 'border-state-danger')}
                    />
                    {errors.otherVin && <p className={errorCls} role="alert">{errors.otherVin.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="otherRegNo" className={labelCls}>
                      Reg. Number <span className="text-ink-muted" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="otherRegNo"
                      type="text"
                      placeholder="KA 01 AB 1234"
                      {...register('otherRegNo')}
                      className={cn(inputCls, 'font-mono uppercase', errors.otherRegNo && 'border-state-danger')}
                    />
                    {errors.otherRegNo && <p className={errorCls} role="alert">{errors.otherRegNo.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="otherYear" className={labelCls}>Year</label>
                    <input
                      id="otherYear"
                      type="number"
                      min={2000}
                      max={2030}
                      placeholder="2023"
                      {...register('otherYear')}
                      className={cn(inputCls, 'font-mono', errors.otherYear && 'border-state-danger')}
                    />
                  </div>

                  <div>
                    <label htmlFor="otherMake" className={labelCls}>Make</label>
                    <input
                      id="otherMake"
                      type="text"
                      placeholder="BMW"
                      {...register('otherMake')}
                      className={inputCls}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="otherModel" className={labelCls}>Model</label>
                    <input
                      id="otherModel"
                      type="text"
                      placeholder="7 Series"
                      {...register('otherModel')}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* ── Section 3: Service Protocol ──────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-protocol">
              <h2 id="section-protocol" className={sectionTitleCls}>Service Protocol</h2>

              <div className="mb-5">
                <label className={labelCls}>
                  Service Type(s) <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <Controller
                  name="serviceTypeIds"
                  control={control}
                  render={({ field }) => (
                    <ServiceTypeSelector
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.serviceTypeIds?.message}
                    />
                  )}
                />
              </div>

              <div className="mb-5">
                <label htmlFor="customerComplaints" className={labelCls}>
                  Customer Complaints <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="customerComplaints"
                  rows={3}
                  placeholder="Describe symptoms, conditions, and customer concerns..."
                  {...register('customerComplaints')}
                  className={cn(
                    'w-full bg-bg-subtle border border-line rounded-md px-3 py-2.5',
                    'text-sm text-ink-primary placeholder:text-ink-muted resize-y min-h-[80px]',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors',
                    errors.customerComplaints && 'border-state-danger',
                  )}
                />
                {errors.customerComplaints && <p className={errorCls} role="alert">{errors.customerComplaints.message}</p>}
              </div>

              <div>
                <label htmlFor="dropOffMethod" className={labelCls}>
                  Drop-off Method <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <select
                    id="dropOffMethod"
                    {...register('dropOffMethod')}
                    className={cn(inputCls, 'appearance-none pr-9 cursor-pointer')}
                  >
                    {DROP_OFF_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" aria-hidden="true" />
                </div>
              </div>
            </section>

            {/* ── Section 4: Scheduling Matrix ─────────────────────────────── */}
            <section className={cardCls} aria-labelledby="section-schedule">
              <h2 id="section-schedule" className={sectionTitleCls}>Scheduling Matrix</h2>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="scheduledDate" className={labelCls}>
                    Date <span className="text-ink-muted" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="scheduledDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    {...register('scheduledDate')}
                    className={cn(inputCls, errors.scheduledDate && 'border-state-danger')}
                  />
                  {errors.scheduledDate && <p className={errorCls} role="alert">{errors.scheduledDate.message}</p>}
                </div>

                <div>
                  <label className={labelCls}>
                    Estimated Duration
                  </label>
                  <div className={cn('h-10 rounded-md border border-line bg-bg-canvas px-3 flex items-center')}>
                    <span className="font-mono text-sm text-ink-secondary">
                      {estimatedDurationHours > 0
                        ? `${estimatedDurationHours}h (from selected services)`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className={labelCls}>
                  Time Slot <span className="text-ink-muted" aria-hidden="true">*</span>
                </label>
                <div className="mb-2 flex items-center gap-3 text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm border border-line bg-bg-subtle" />
                    Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[rgb(var(--state-stale))] bg-[rgb(var(--state-stale)/0.1)]" />
                    Limited
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm border border-line bg-bg-canvas opacity-50" />
                    Booked
                  </span>
                </div>
                <Controller
                  name="scheduledTime"
                  control={control}
                  render={({ field }) => (
                    <TimeSlotGrid
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.scheduledTime?.message}
                    />
                  )}
                />
                {scheduledTime && (
                  <p className="mt-2 text-[11px] text-ink-muted">
                    Selected: <span className="font-mono text-ink-primary">{TIME_SLOTS.find((s) => s.time === scheduledTime)?.label}</span>
                  </p>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="advisorId" className={labelCls}>Advisor Preference</label>
                  <div className="relative">
                    <select
                      id="advisorId"
                      {...register('advisorId')}
                      className={cn(inputCls, 'appearance-none pr-9 cursor-pointer')}
                    >
                      <option value="">No preference</option>
                      {SERVICE_ADVISORS.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <label htmlFor="bayId" className={labelCls}>Bay Preference</label>
                  <div className="relative">
                    <select
                      id="bayId"
                      {...register('bayId')}
                      className={cn(inputCls, 'appearance-none pr-9 cursor-pointer')}
                    >
                      <option value="">No preference</option>
                      {BAY_OPTIONS.map((b) => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Footer actions ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => router.push('/service?tab=appointments')}
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

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white',
                    'text-sm font-medium hover:bg-accent-hover transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isSubmitting ? 'Saving…' : 'Confirm Appointment'}
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
