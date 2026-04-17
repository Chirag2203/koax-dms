'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives/dialog';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { PartsLine } from '@dms/types';

// ─── Supplier options (static seed for demo) ──────────────────────────────────

const SUPPLIER_OPTIONS = [
  { id: 'sup-porsche-genuine',  name: 'Porsche Genuine Parts' },
  { id: 'sup-mercedes-genuine', name: 'Mercedes-Benz Genuine Parts' },
  { id: 'sup-bosch-india',      name: 'Bosch India' },
  { id: 'sup-continental',      name: 'Continental AG' },
  { id: 'sup-local-oem',        name: 'Local OEM Supplier' },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  partCode:       z.string().min(1, 'Part code is required'),
  description:    z.string().min(1, 'Description is required'),
  qty:            z.coerce.number().int().min(1, 'Qty must be >= 1'),
  unitPrice:      z.coerce.number().min(0, 'Unit price must be >= 0'),
  warrantyCovered: z.boolean(),
  supplierId:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PartsFormDialogProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  /** When provided, puts the dialog into Edit mode */
  editLine?: PartsLine;
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

export function PartsFormDialog({ open, onClose, jobCardId, editLine }: PartsFormDialogProps) {
  const { user } = useStaffAuth();
  const addPart    = useServiceStore((s) => s.addPart);
  const updatePart = useServiceStore((s) => s.updatePart);

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
      partCode:        editLine?.partCode        ?? '',
      description:     editLine?.description     ?? '',
      qty:             editLine?.qty             ?? 1,
      unitPrice:       editLine?.unitPrice       ?? 0,
      warrantyCovered: editLine?.warrantyCovered ?? false,
      supplierId:      '',
    },
  });

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        partCode:        editLine?.partCode        ?? '',
        description:     editLine?.description     ?? '',
        qty:             editLine?.qty             ?? 1,
        unitPrice:       editLine?.unitPrice       ?? 0,
        warrantyCovered: editLine?.warrantyCovered ?? false,
        supplierId:      '',
      });
    }
  }, [open, editLine, reset]);

  const qty       = watch('qty');
  const unitPrice = watch('unitPrice');
  const lineTotal = (Number(qty) || 0) * (Number(unitPrice) || 0);

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  const onSubmit = handleSubmit((data) => {
    if (isEdit && editLine) {
      updatePart(editLine.id, {
        partCode:        data.partCode,
        description:     data.description,
        qty:             data.qty,
        unitPrice:       data.unitPrice,
        warrantyCovered: data.warrantyCovered,
      }, actor);
    } else {
      addPart(jobCardId, {
        partCode:        data.partCode,
        description:     data.description,
        qty:             data.qty,
        unitPrice:       data.unitPrice,
        warrantyCovered: data.warrantyCovered,
        status:          'REQUESTED',
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
        form="parts-form"
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
      title={isEdit ? 'Edit part' : 'Add part'}
      size="md"
      footer={footer}
    >
      <form id="parts-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Part Code" required error={errors.partCode?.message}>
            <input
              {...register('partCode')}
              placeholder="e.g. POR-095-104-056-FZ"
              className={cn(INPUT_CLASS, 'font-mono text-xs', errors.partCode && 'border-state-danger')}
            />
          </Field>
          <Field label="Supplier (optional)">
            <select {...register('supplierId')} className={SELECT_CLASS}>
              <option value="">Not specified</option>
              {SUPPLIER_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description" required error={errors.description?.message}>
          <input
            {...register('description')}
            placeholder="e.g. Engine oil filter — OEM"
            className={cn(INPUT_CLASS, errors.description && 'border-state-danger')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Qty" required error={errors.qty?.message}>
            <input
              {...register('qty')}
              type="number"
              min={1}
              step={1}
              placeholder="1"
              className={cn(MONO_INPUT_CLASS, errors.qty && 'border-state-danger')}
            />
          </Field>
          <Field label="Unit Price (₹)" required error={errors.unitPrice?.message}>
            <input
              {...register('unitPrice')}
              type="number"
              min={0}
              placeholder="2500"
              className={cn(MONO_INPUT_CLASS, errors.unitPrice && 'border-state-danger')}
            />
          </Field>
        </div>

        {/* Warranty covered toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            {...register('warrantyCovered')}
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-accent"
          />
          <span className="text-sm text-ink-primary">Warranty covered (no charge to customer)</span>
        </label>

        {/* Live line total */}
        <div className="flex items-center justify-between rounded-md bg-bg-subtle border border-line px-4 py-2.5">
          <span className="text-[13px] text-ink-secondary">Line total (qty × unit price)</span>
          <span className="font-mono text-[15px] font-semibold tabular-nums text-ink-primary">
            {INR.format(lineTotal)}
          </span>
        </div>
      </form>
    </Dialog>
  );
}
