'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@dms/ui';
import type { Appraisal } from '@dms/types';
import { SlideInPanel } from '@/src/components/primitives/slide-in-panel';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppraisalEditPanelProps {
  open: boolean;
  onClose: () => void;
  vin: string;
  appraisal?: Appraisal;
  onSave: (data: Partial<Appraisal>) => Promise<void>;
}

type ChecklistCondition = 'ok' | 'minor' | 'major' | '';

interface ChecklistItem {
  id: string;
  label: string;
  condition: ChecklistCondition;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  grade: z.enum(['A', 'A-', 'B+', 'B', 'B-', 'C']),
  pointsCompleted: z
    .number({ invalid_type_error: 'Points required' })
    .min(0, 'Min 0')
    .max(210, 'Max 210'),
  inspectorName: z.string().min(1, 'Inspector name required').max(80),
  inspectionDate: z
    .string()
    .min(1, 'Date required')
    .refine((v) => new Date(v) <= new Date(), 'Date must be today or earlier'),
  notes: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Input class ──────────────────────────────────────────────────────────────

const inputClass =
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

// ─── Checklist group ──────────────────────────────────────────────────────────

function ChecklistGroup({
  title,
  maxPoints,
  items,
  onConditionChange,
}: {
  title: string;
  maxPoints: number;
  items: ChecklistItem[];
  onConditionChange: (id: string, condition: ChecklistCondition) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const checked = items.filter((i) => i.condition !== '').length;

  return (
    <div className="rounded-md border border-line overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          'bg-bg-subtle hover:bg-bg-canvas transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-ink-primary">{title}</span>
          <span className="font-mono text-[11px] text-ink-muted">
            {checked}/{items.length} checked · {maxPoints} pts
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
        ) : (
          <ChevronUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
        )}
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="divide-y divide-line">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                id={`check-${item.id}`}
                checked={item.condition !== ''}
                onChange={(e) => onConditionChange(item.id, e.target.checked ? 'ok' : '')}
                className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
              />
              <label htmlFor={`check-${item.id}`} className="flex-1 text-[13px] text-ink-primary cursor-pointer">
                {item.label}
              </label>
              {/* Segmented OK / Minor / Major */}
              <div className="flex overflow-hidden rounded border border-line text-[11px] font-medium">
                {(['ok', 'minor', 'major'] as const).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    disabled={item.condition === ''}
                    onClick={() => onConditionChange(item.id, cond)}
                    className={cn(
                      'px-2 py-1 transition-colors capitalize',
                      'disabled:opacity-30 disabled:cursor-not-allowed',
                      item.condition === cond
                        ? cond === 'ok'
                          ? 'bg-[rgb(var(--state-listed))] text-white'
                          : cond === 'minor'
                            ? 'bg-[rgb(var(--state-stale))] text-white'
                            : 'bg-state-danger text-white'
                        : 'bg-bg-subtle text-ink-muted hover:bg-bg-canvas',
                    )}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Default checklist items ──────────────────────────────────────────────────

const DEFAULT_MECHANICAL: ChecklistItem[] = [
  { id: 'm1', label: 'Engine starts and idles smoothly', condition: '' },
  { id: 'm2', label: 'Transmission shifts correctly', condition: '' },
  { id: 'm3', label: 'Brakes — feel and stopping distance', condition: '' },
  { id: 'm4', label: 'Suspension — ride quality and noise', condition: '' },
  { id: 'm5', label: 'Electrical systems functional', condition: '' },
];

const DEFAULT_COSMETIC: ChecklistItem[] = [
  { id: 'c1', label: 'Exterior paint — no major defects', condition: '' },
  { id: 'c2', label: 'Panel gaps consistent', condition: '' },
  { id: 'c3', label: 'Alloy wheels — no cracks or curb rash', condition: '' },
  { id: 'c4', label: 'Glass — no chips or cracks', condition: '' },
  { id: 'c5', label: 'Interior trim — no tears or damage', condition: '' },
];

const DEFAULT_DOCUMENTATION: ChecklistItem[] = [
  { id: 'd1', label: 'RC (Registration Certificate) present', condition: '' },
  { id: 'd2', label: 'Insurance policy valid', condition: '' },
  { id: 'd3', label: 'PUC certificate valid', condition: '' },
  { id: 'd4', label: 'Service records present', condition: '' },
  { id: 'd5', label: 'Loan NOC (if applicable)', condition: '' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AppraisalEditPanel({
  open,
  onClose,
  vin: _vin,
  appraisal,
  onSave,
}: AppraisalEditPanelProps) {
  const isEdit = Boolean(appraisal);
  const [saving, setSaving] = useState(false);

  const [mechanical, setMechanical] = useState<ChecklistItem[]>(DEFAULT_MECHANICAL);
  const [cosmetic, setCosmetic] = useState<ChecklistItem[]>(DEFAULT_COSMETIC);
  const [documentation, setDocumentation] = useState<ChecklistItem[]>(DEFAULT_DOCUMENTATION);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: appraisal
      ? {
          grade: appraisal.grade,
          pointsCompleted: appraisal.pointsCompleted,
          inspectorName: appraisal.inspectorName,
          inspectionDate: appraisal.inspectionDate,
          notes: appraisal.notes ?? '',
        }
      : {
          grade: 'B+',
          pointsCompleted: undefined,
          inspectorName: '',
          inspectionDate: new Date().toISOString().split('T')[0],
          notes: '',
        },
  });

  useEffect(() => {
    if (open) {
      reset(
        appraisal
          ? {
              grade: appraisal.grade,
              pointsCompleted: appraisal.pointsCompleted,
              inspectorName: appraisal.inspectorName,
              inspectionDate: appraisal.inspectionDate,
              notes: appraisal.notes ?? '',
            }
          : {
              grade: 'B+',
              pointsCompleted: undefined,
              inspectorName: '',
              inspectionDate: new Date().toISOString().split('T')[0]!,
              notes: '',
            },
      );
      setMechanical(DEFAULT_MECHANICAL.map((i) => ({ ...i })));
      setCosmetic(DEFAULT_COSMETIC.map((i) => ({ ...i })));
      setDocumentation(DEFAULT_DOCUMENTATION.map((i) => ({ ...i })));
    }
  }, [open, appraisal, reset]);

  // ⌘↵ save shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && open) {
        handleSubmit(onSubmit)();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function setCondition(
    group: 'mechanical' | 'cosmetic' | 'documentation',
    id: string,
    condition: ChecklistCondition,
  ) {
    const setter =
      group === 'mechanical'
        ? setMechanical
        : group === 'cosmetic'
          ? setCosmetic
          : setDocumentation;
    setter((prev) => prev.map((item) => (item.id === id ? { ...item, condition } : item)));
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      await onSave({
        grade: data.grade,
        pointsCompleted: data.pointsCompleted,
        inspectorName: data.inspectorName,
        inspectionDate: data.inspectionDate,
        notes: data.notes || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const title = isEdit ? 'Edit appraisal' : 'Create appraisal';
  const panelTitle = `${title}${isDirty ? ' •' : ''}`;

  return (
    <SlideInPanel open={open} onClose={onClose} width="50%" title={panelTitle}>
      <form
        className="flex flex-col min-h-full"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary section */}
          <section aria-labelledby="appraisal-summary-heading">
            <h3 id="appraisal-summary-heading" className="mb-4 text-[11px] font-mono uppercase tracking-widest text-ink-muted">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Grade */}
              <div className="space-y-1.5">
                <label htmlFor="ap-grade" className="block text-[13px] font-medium text-ink-secondary">
                  Grade <span className="text-state-danger">*</span>
                </label>
                <select
                  id="ap-grade"
                  className={cn(inputClass, errors.grade && 'border-state-danger')}
                  {...register('grade')}
                >
                  {['A', 'A-', 'B+', 'B', 'B-', 'C'].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {errors.grade && <p className="text-[12px] text-state-danger">{errors.grade.message}</p>}
              </div>

              {/* Points completed */}
              <div className="space-y-1.5">
                <label htmlFor="ap-points" className="block text-[13px] font-medium text-ink-secondary">
                  Points Completed <span className="text-state-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    id="ap-points"
                    type="number"
                    min={0}
                    max={210}
                    placeholder="0"
                    className={cn(inputClass, 'pr-12', errors.pointsCompleted && 'border-state-danger')}
                    {...register('pointsCompleted', { valueAsNumber: true })}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-mono text-ink-muted">
                    / 210
                  </span>
                </div>
                {errors.pointsCompleted && (
                  <p className="text-[12px] text-state-danger">{errors.pointsCompleted.message}</p>
                )}
              </div>

              {/* Inspector name */}
              <div className="space-y-1.5">
                <label htmlFor="ap-inspector" className="block text-[13px] font-medium text-ink-secondary">
                  Inspector Name <span className="text-state-danger">*</span>
                </label>
                <input
                  id="ap-inspector"
                  type="text"
                  maxLength={80}
                  placeholder="Inspector's full name"
                  className={cn(inputClass, errors.inspectorName && 'border-state-danger')}
                  {...register('inspectorName')}
                />
                {errors.inspectorName && (
                  <p className="text-[12px] text-state-danger">{errors.inspectorName.message}</p>
                )}
              </div>

              {/* Inspection date */}
              <div className="space-y-1.5">
                <label htmlFor="ap-date" className="block text-[13px] font-medium text-ink-secondary">
                  Inspection Date <span className="text-state-danger">*</span>
                </label>
                <input
                  id="ap-date"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className={cn(inputClass, errors.inspectionDate && 'border-state-danger')}
                  {...register('inspectionDate')}
                />
                {errors.inspectionDate && (
                  <p className="text-[12px] text-state-danger">{errors.inspectionDate.message}</p>
                )}
              </div>
            </div>
          </section>

          {/* Notes */}
          <section aria-labelledby="appraisal-notes-heading">
            <label
              id="appraisal-notes-heading"
              htmlFor="ap-notes"
              className="block mb-1.5 text-[13px] font-medium text-ink-secondary"
            >
              Notes
            </label>
            <textarea
              id="ap-notes"
              maxLength={2000}
              rows={4}
              placeholder="Overall inspection notes, recommendations…"
              className={cn(
                'w-full bg-bg-subtle border border-line rounded-md px-3 py-2',
                'text-sm text-ink-primary resize-none',
                'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              )}
              {...register('notes')}
            />
          </section>

          {/* Checklist */}
          <section aria-labelledby="appraisal-checklist-heading">
            <h3 id="appraisal-checklist-heading" className="mb-3 text-[11px] font-mono uppercase tracking-widest text-ink-muted">
              210-Point Checklist (v1 Preview)
            </h3>
            <div className="space-y-2">
              <ChecklistGroup
                title="Mechanical"
                maxPoints={80}
                items={mechanical}
                onConditionChange={(id, cond) => setCondition('mechanical', id, cond)}
              />
              <ChecklistGroup
                title="Cosmetic"
                maxPoints={70}
                items={cosmetic}
                onConditionChange={(id, cond) => setCondition('cosmetic', id, cond)}
              />
              <ChecklistGroup
                title="Documentation"
                maxPoints={60}
                items={documentation}
                onConditionChange={(id, cond) => setCondition('documentation', id, cond)}
              />
            </div>
          </section>
        </div>

        {/* Footer — sticky */}
        <div className="shrink-0 border-t border-line px-6 py-4 flex items-center justify-end gap-2 bg-bg-canvas">
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
            type="submit"
            disabled={saving}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white',
              'bg-accent hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Saving…' : 'Save appraisal'}
          </button>
        </div>
      </form>
    </SlideInPanel>
  );
}
