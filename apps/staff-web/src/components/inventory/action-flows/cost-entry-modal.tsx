'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import { cn } from '@dms/ui';
import { CostLedgerCategoryEnum } from '@dms/types';
import type { CostLedgerEntry } from '@dms/types';
import { Dialog, AlertDialog } from '@/src/components/primitives/dialog';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CostEntryModalProps {
  open: boolean;
  onClose: () => void;
  vin: string;
  entry?: CostLedgerEntry; // undefined = add, defined = edit
  onSave: (data: Partial<CostLedgerEntry>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  category: CostLedgerCategoryEnum,
  date: z.string().min(1, 'Date is required').refine((v) => {
    const d = new Date(v);
    return !isNaN(d.getTime()) && d <= new Date();
  }, 'Date must be today or earlier'),
  amount: z.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be greater than 0'),
  vendor: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: Array<{ value: z.infer<typeof CostLedgerCategoryEnum>; label: string }> = [
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'refurb-mechanical', label: 'Refurb — Mechanical' },
  { value: 'refurb-cosmetic', label: 'Refurb — Cosmetic' },
  { value: 'refurb-detailing', label: 'Refurb — Detailing' },
  { value: 'transport', label: 'Transport' },
  { value: 'registration-tax', label: 'Registration & Tax' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'floor-plan-interest', label: 'Floor-Plan Interest' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'photography', label: 'Photography' },
  { value: 'misc', label: 'Miscellaneous' },
];

const HIGH_VALUE_THRESHOLD = 1_000_000;
const HIGH_VALUE_ROLES = ['R19', 'R22', 'R24'];

// ─── Input class ──────────────────────────────────────────────────────────────

const inputClass = 'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

// ─── Component ────────────────────────────────────────────────────────────────

export function CostEntryModal({
  open,
  onClose,
  vin: _vin,
  entry,
  onSave,
  onDelete,
}: CostEntryModalProps) {
  const { user } = useStaffAuth();
  const isEdit = Boolean(entry);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: entry
      ? {
          category: entry.category,
          date: entry.date,
          amount: entry.amount,
          vendor: '',
          note: entry.note ?? '',
        }
      : {
          category: 'acquisition',
          date: new Date().toISOString().split('T')[0],
          amount: undefined,
          vendor: '',
          note: '',
        },
  });

  // Reset form when modal opens/closes or entry changes
  useEffect(() => {
    if (open) {
      reset(
        entry
          ? {
              category: entry.category,
              date: entry.date,
              amount: entry.amount,
              vendor: '',
              note: entry.note ?? '',
            }
          : {
              category: 'acquisition',
              date: new Date().toISOString().split('T')[0]!,
              amount: undefined,
              vendor: '',
              note: '',
            },
      );
    }
  }, [open, entry, reset]);

  const amount = watch('amount');
  const isHighValue = typeof amount === 'number' && amount > HIGH_VALUE_THRESHOLD;
  const userRole = user?.role ?? '';
  const isHighValueBlocked = isHighValue && !HIGH_VALUE_ROLES.includes(userRole);

  // ⌘↵ save shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && open && !isHighValueBlocked) {
        handleSubmit(onSubmit)();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isHighValueBlocked]);

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      await onSave({
        category: data.category,
        date: data.date,
        amount: data.amount,
        note: data.note || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entry || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
      setShowDeleteConfirm(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const title = isEdit ? 'Edit cost entry' : 'Add cost entry';

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={title}
        size="md"
        dirty={isDirty}
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {/* Delete — left side, edit mode only */}
            {isEdit && onDelete && (
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(true)}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-transparent',
                  'text-state-danger hover:bg-state-danger/10 hover:border-state-danger/20',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || isHighValueBlocked}
                onClick={handleSubmit(onSubmit)}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-semibold text-white',
                  'bg-accent hover:bg-accent/90 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* High-value warning */}
          {isHighValue && (
            <div
              className={cn(
                'flex items-start gap-2.5 rounded-md px-3 py-2.5',
                'border border-[rgb(var(--state-stale)/0.4)] bg-[rgb(var(--state-stale)/0.08)]',
              )}
              role="alert"
            >
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--state-stale))]" />
              <p className="text-[13px] text-ink-secondary">
                High-value entry. Requires R19+ approval
              </p>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <label htmlFor="ce-category" className="block text-[13px] font-medium text-ink-secondary">
              Category <span className="text-state-danger">*</span>
            </label>
            <select
              id="ce-category"
              className={cn(inputClass, errors.category && 'border-state-danger focus:ring-state-danger/30')}
              {...register('category')}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-[12px] text-state-danger">{errors.category.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="ce-date" className="block text-[13px] font-medium text-ink-secondary">
              Date <span className="text-state-danger">*</span>
            </label>
            <input
              id="ce-date"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              className={cn(inputClass, errors.date && 'border-state-danger focus:ring-state-danger/30')}
              {...register('date')}
            />
            {errors.date && (
              <p className="text-[12px] text-state-danger">{errors.date.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label htmlFor="ce-amount" className="block text-[13px] font-medium text-ink-secondary">
              Amount <span className="text-state-danger">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                ₹
              </span>
              <input
                id="ce-amount"
                type="number"
                min={1}
                step={1}
                placeholder="0"
                className={cn(
                  inputClass,
                  'pl-7 font-mono tabular-nums text-right',
                  errors.amount && 'border-state-danger focus:ring-state-danger/30',
                )}
                {...register('amount', { valueAsNumber: true })}
              />
            </div>
            {errors.amount && (
              <p className="text-[12px] text-state-danger">{errors.amount.message}</p>
            )}
          </div>

          {/* Vendor / Reference */}
          <div className="space-y-1.5">
            <label htmlFor="ce-vendor" className="block text-[13px] font-medium text-ink-secondary">
              Vendor / Reference
            </label>
            <input
              id="ce-vendor"
              type="text"
              maxLength={120}
              placeholder="Vendor name or invoice reference"
              className={inputClass}
              {...register('vendor')}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label htmlFor="ce-note" className="block text-[13px] font-medium text-ink-secondary">
              Note
            </label>
            <textarea
              id="ce-note"
              maxLength={500}
              rows={3}
              placeholder="Optional note about this cost entry"
              className={cn(
                'w-full bg-bg-subtle border border-line rounded-md px-3 py-2',
                'text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
              {...register('note')}
            />
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      {entry && (
        <AlertDialog
          open={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          title="Delete cost entry?"
          description={`This will permanently remove the ${entry.category} entry of ₹${entry.amount.toLocaleString('en-IN')} dated ${entry.date}. This action cannot be undone.`}
          confirmLabel="Delete entry"
          cancelLabel="Keep entry"
          destructive
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
