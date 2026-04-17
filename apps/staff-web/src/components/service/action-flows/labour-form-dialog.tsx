'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { LabourLine } from '@dms/types';

// ─── Technician options ───────────────────────────────────────────────────────

const TECHNICIAN_OPTIONS = [
  { id: 'tech-r11-001', name: 'K. Kumar' },
  { id: 'tech-r11-002', name: 'R. Patel' },
  { id: 'tech-r11-003', name: 'A. Sharma' },
  { id: 'tech-r11-004', name: 'S. Verma' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  code:          z.string().min(1, 'Code is required'),
  description:   z.string().min(1, 'Description is required'),
  flatRateHours: z.coerce.number().min(0.1, 'Must be > 0'),
  actualHours:   z.coerce.number().min(0).default(0),
  rate:          z.coerce.number().min(1, 'Rate is required'),
  technicianId:  z.string().min(1, 'Select a technician'),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LabourFormDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  /** When provided, puts the dialog into Edit mode */
  editLine?: LabourLine;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_CLASS = cn(
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary',
  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
);

const SELECT_CLASS = cn(INPUT_CLASS, 'cursor-pointer');

const MONO_INPUT_CLASS = cn(INPUT_CLASS, 'font-mono tabular-nums text-right');

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-wide text-ink-muted block">
        {label}{required && <span className="text-ink-muted ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-state-danger">{error}</p>}
    </div>
  );
}

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export function LabourFormDialog({ open, onClose, jobCardId, editLine }: LabourFormDialogProps) {
  const { user } = useStaffAuth();
  const addLabour    = useServiceStore((s) => s.addLabour);
  const updateLabour = useServiceStore((s) => s.updateLabour);

  const isEdit = !!editLine;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code:          editLine?.code          ?? '',
      description:   editLine?.description   ?? '',
      flatRateHours: editLine?.flatRateHours ?? 1,
      actualHours:   editLine?.actualHours   ?? 0,
      rate:          editLine?.rate          ?? 1500,
      technicianId:  editLine?.technicianId  ?? '',
    },
  });

  // Reset when dialog opens with new editLine
  useEffect(() => {
    if (open) {
      reset({
        code:          editLine?.code          ?? '',
        description:   editLine?.description   ?? '',
        flatRateHours: editLine?.flatRateHours ?? 1,
        actualHours:   editLine?.actualHours   ?? 0,
        rate:          editLine?.rate          ?? 1500,
        technicianId:  editLine?.technicianId  ?? '',
      });
    }
  }, [open, editLine, reset]);

  const flatRateHours = watch('flatRateHours');
  const rate          = watch('rate');
  const liveTotal     = (Number(flatRateHours) || 0) * (Number(rate) || 0);

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  const onSubmit = handleSubmit((data) => {
    if (isEdit && editLine) {
      updateLabour(editLine.id, {
        code:          data.code,
        description:   data.description,
        flatRateHours: data.flatRateHours,
        actualHours:   data.actualHours,
        rate:          data.rate,
        technicianId:  data.technicianId,
      }, actor);
    } else {
      addLabour(jobCardId, {
        code:          data.code,
        description:   data.description,
        flatRateHours: data.flatRateHours,
        actualHours:   data.actualHours,
        rate:          data.rate,
        technicianId:  data.technicianId,
        status:        'PLANNED',
      }, actor);
    }
    onClose();
  });

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          'inline-flex items-center gap-2 h-10 px-4 rounded-md border border-line',
          'bg-bg-surface text-sm font-medium text-ink-primary',
          'hover:bg-bg-subtle transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        )}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="labour-form"
        disabled={isSubmitting}
        className={cn(
          'inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white',
          'text-sm font-medium hover:bg-accent-hover transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        Save
      </button>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit labour line' : 'Add labour line'}
      size="md"
      footer={footer}
    >
      <form id="labour-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code" required error={errors.code?.message}>
            <input
              {...register('code')}
              placeholder="LAB-ENG-OIL"
              className={cn(INPUT_CLASS, 'font-mono', errors.code && 'border-state-danger')}
            />
          </Field>
          <Field label="Rate (₹/hr)" required error={errors.rate?.message}>
            <input
              {...register('rate')}
              type="number"
              min={0}
              placeholder="1500"
              className={cn(MONO_INPUT_CLASS, errors.rate && 'border-state-danger')}
            />
          </Field>
        </div>

        <Field label="Description" required error={errors.description?.message}>
          <input
            {...register('description')}
            placeholder="e.g. Engine oil and filter change"
            className={cn(INPUT_CLASS, errors.description && 'border-state-danger')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Flat-Rate Hours" required error={errors.flatRateHours?.message}>
            <input
              {...register('flatRateHours')}
              type="number"
              min={0.1}
              step={0.1}
              placeholder="1.5"
              className={cn(MONO_INPUT_CLASS, errors.flatRateHours && 'border-state-danger')}
            />
          </Field>
          <Field label="Actual Hours" error={errors.actualHours?.message}>
            <input
              {...register('actualHours')}
              type="number"
              min={0}
              step={0.1}
              placeholder="0"
              className={MONO_INPUT_CLASS}
            />
          </Field>
        </div>

        <Field label="Technician" required error={errors.technicianId?.message}>
          <select
            {...register('technicianId')}
            className={cn(SELECT_CLASS, errors.technicianId && 'border-state-danger')}
          >
            <option value="">Select technician…</option>
            {TECHNICIAN_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </Field>

        {/* Live total preview */}
        <div className="flex items-center justify-between rounded-md bg-bg-subtle border border-line px-4 py-2.5">
          <span className="text-[13px] text-ink-secondary">Line total (flat-rate × rate)</span>
          <span className="font-mono text-[15px] font-semibold tabular-nums text-ink-primary">
            {INR.format(liveTotal)}
          </span>
        </div>
      </form>
    </Dialog>
  );
}
