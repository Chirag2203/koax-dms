'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minus,
  ClipboardPlus,
  Printer,
  ChevronDown,
  ChevronRight,
  ImagePlus,
} from 'lucide-react';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';
import type { Inspection, InspectionItem, InspectionOutcome } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  noInspection: 'No vehicle inspection recorded yet.',
  startVhc: 'Start Vehicle Health Check',
  printReport: 'Print VHC Report',
  submitInspection: 'Submit Inspection',
  summary: 'Inspection Summary',
  pass: 'Pass',
  fail: 'Fail',
  advise: 'Advise',
  na: 'N/A',
  printNote: 'Note: For best print results use Chrome or Edge. Safari on iOS may not honour page breaks.',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OUTCOME_ICON: Record<InspectionOutcome, React.ReactNode> = {
  PASS:   <CheckCircle  className="h-4 w-4 text-[rgb(var(--state-listed))]"  aria-hidden="true" />,
  FAIL:   <XCircle      className="h-4 w-4 text-state-danger"                aria-hidden="true" />,
  ADVISE: <AlertTriangle className="h-4 w-4 text-[rgb(var(--state-stale))]"  aria-hidden="true" />,
  NA:     <Minus        className="h-4 w-4 text-ink-muted"                   aria-hidden="true" />,
};

const OUTCOME_CLASSES: Record<InspectionOutcome, string> = {
  PASS:   'bg-[rgb(var(--state-listed)/0.12)] text-[rgb(var(--state-listed))] border-[rgb(var(--state-listed)/0.3)]',
  FAIL:   'bg-state-danger/10 text-state-danger border-state-danger/30',
  ADVISE: 'bg-[rgb(var(--state-stale)/0.12)] text-[rgb(var(--state-stale))] border-[rgb(var(--state-stale)/0.3)]',
  NA:     'bg-bg-subtle text-ink-muted border-line',
};

const OUTCOMES: InspectionOutcome[] = ['PASS', 'FAIL', 'ADVISE', 'NA'];
const OUTCOME_LABELS: Record<InspectionOutcome, string> = {
  PASS: 'Pass', FAIL: 'Fail', ADVISE: 'Advise', NA: 'N/A',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardInspectionTabProps {
  jobCardId: string;
  inspectionId: string | undefined;
}

// ─── Inline item notes + photo input ─────────────────────────────────────────

function ItemNoteEditor({
  item,
  inspectionId,
}: {
  item: InspectionItem;
  inspectionId: string;
}) {
  const { user } = useStaffAuth();
  const updateInspectionItem = useServiceStore((s) => s.updateInspectionItem);
  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  const [note, setNote] = useState(item.notes ?? '');

  function handleNoteBlur() {
    if (note !== item.notes) {
      updateInspectionItem(inspectionId, item.id, { notes: note || undefined }, actor);
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      updateInspectionItem(inspectionId, item.id, { imageUrl: dataUrl }, actor);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleNoteBlur}
        placeholder="Add note…"
        rows={2}
        className={cn(
          'w-full bg-bg-subtle border border-line rounded-md px-3 py-2 text-[12px] text-ink-primary resize-none',
          'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
        )}
      />
      {item.imageUrl ? (
        <div className="flex items-center gap-2">
          <img
            src={item.imageUrl}
            alt="Inspection item photo"
            className="h-16 w-16 rounded object-cover border border-line"
          />
          <button
            type="button"
            onClick={() => updateInspectionItem(inspectionId, item.id, { imageUrl: undefined }, actor)}
            className="text-[11px] text-ink-muted hover:text-state-danger transition-colors"
          >
            Remove photo
          </button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[12px] text-ink-muted hover:text-accent transition-colors">
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          Add photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhoto}
          />
        </label>
      )}
    </div>
  );
}

// ─── Category Accordion ───────────────────────────────────────────────────────

function CategoryAccordion({
  category,
  items,
  inspectionId,
  isSubmitted,
}: {
  category: string;
  items: InspectionItem[];
  inspectionId: string;
  isSubmitted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useStaffAuth();
  const updateInspectionItem = useServiceStore((s) => s.updateInspectionItem);
  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  const passCount   = items.filter((i) => i.outcome === 'PASS').length;
  const failCount   = items.filter((i) => i.outcome === 'FAIL').length;
  const adviseCount = items.filter((i) => i.outcome === 'ADVISE').length;

  function handleOutcome(item: InspectionItem, outcome: InspectionOutcome) {
    if (isSubmitted) return;
    updateInspectionItem(inspectionId, item.id, { outcome }, actor);
  }

  return (
    <div className="rounded-md border border-line overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
          open ? 'bg-bg-subtle' : 'bg-bg-surface hover:bg-bg-subtle',
        )}
      >
        <div className="flex items-center gap-3">
          {open
            ? <ChevronDown  className="h-4 w-4 text-ink-muted shrink-0" aria-hidden="true" />
            : <ChevronRight className="h-4 w-4 text-ink-muted shrink-0" aria-hidden="true" />
          }
          <span className="text-[14px] font-semibold text-ink-primary">{category}</span>
          <span className="text-[12px] text-ink-muted font-mono">{items.length} items</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] font-mono">
          <span className="text-[rgb(var(--state-listed))]">{passCount} pass</span>
          {failCount > 0   && <span className="text-state-danger">{failCount} fail</span>}
          {adviseCount > 0 && <span className="text-[rgb(var(--state-stale))]">{adviseCount} advise</span>}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-line">
          {items.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 bg-bg-canvas"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{OUTCOME_ICON[item.outcome]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[13px] text-ink-primary">{item.name}</span>
                    {/* Outcome pill group */}
                    {!isSubmitted && (
                      <div className="flex items-center gap-1 shrink-0" role="group" aria-label={`Outcome for ${item.name}`}>
                        {OUTCOMES.map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => handleOutcome(item, o)}
                            aria-pressed={item.outcome === o}
                            className={cn(
                              'h-6 px-2 rounded border text-[10px] font-mono uppercase tracking-wider transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                              item.outcome === o
                                ? OUTCOME_CLASSES[o]
                                : 'bg-bg-canvas text-ink-muted border-line hover:border-ink-muted',
                            )}
                          >
                            {OUTCOME_LABELS[o]}
                          </button>
                        ))}
                      </div>
                    )}
                    {isSubmitted && (
                      <span
                        className={cn(
                          'font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
                          OUTCOME_CLASSES[item.outcome],
                        )}
                      >
                        {OUTCOME_LABELS[item.outcome]}
                      </span>
                    )}
                  </div>

                  {/* Inline note / photo for FAIL and ADVISE */}
                  {(item.outcome === 'FAIL' || item.outcome === 'ADVISE') && !isSubmitted && (
                    <ItemNoteEditor item={item} inspectionId={inspectionId} />
                  )}

                  {/* Show saved note even in read-only mode */}
                  {item.notes && isSubmitted && (
                    <p className="text-[12px] text-ink-muted mt-0.5">{item.notes}</p>
                  )}

                  {/* Show photo in read-only mode */}
                  {item.imageUrl && isSubmitted && (
                    <img
                      src={item.imageUrl}
                      alt="Inspection item photo"
                      className="mt-2 h-16 w-16 rounded object-cover border border-line"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardInspectionTab({ jobCardId, inspectionId }: JobCardInspectionTabProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const startInspection   = useServiceStore((s) => s.startInspection);
  const submitInspection  = useServiceStore((s) => s.submitInspection);
  const allInspections    = useServiceStore((s) => s.inspections);

  const inspection = inspectionId
    ? allInspections.find((i) => i.id === inspectionId)
    : undefined;

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

  const isSubmitted = !!inspection?.completedAt;

  function handleStartVhc() {
    startInspection(jobCardId, actor);
    toast('VHC started — 20 items loaded', 'success');
  }

  function handleSubmit() {
    if (!inspection) return;
    submitInspection(inspection.id, actor);
    toast('Inspection submitted', 'success');
  }

  // ── No inspection yet ─────────────────────────────────────────────────────
  if (!inspectionId && !inspection) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
        <div className="rounded-md border border-dashed border-line bg-bg-surface p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]">
          <ClipboardPlus className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <p className="text-[15px] text-ink-muted">{MESSAGES.noInspection}</p>
          <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={handleStartVhc}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <ClipboardPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {MESSAGES.startVhc}
            </button>
          </Gate>
        </div>
      </>
    );
  }

  if (!inspection) {
    return (
      <div className="rounded-md border border-line bg-bg-surface p-6 text-center text-sm text-state-danger">
        Inspection record not found.
      </div>
    );
  }

  const { pass, fail, advise, na } = inspection.summary;

  // Group items by category (preserve insertion order)
  const grouped = inspection.items.reduce<Record<string, InspectionItem[]>>(
    (acc, item) => {
      const key = item.category;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(item);
      return acc;
    },
    {},
  );

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Wrap content for print scope */}
      <div className="print-area-vhc space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-[18px] font-semibold text-ink-primary">Vehicle Health Check</h2>
          <div className="flex items-center gap-2">
            {isSubmitted && (
              <span className="font-mono text-[10px] uppercase tracking-widest bg-bg-subtle text-ink-muted px-2 py-1 rounded">
                Submitted
              </span>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              {MESSAGES.printReport}
            </button>
          </div>
        </div>

        {/* Print note — visible only on screen */}
        <p className="print:hidden text-[11px] text-ink-muted">{MESSAGES.printNote}</p>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: MESSAGES.pass,   value: pass,   color: 'text-[rgb(var(--state-listed))]',  bg: 'bg-[rgb(var(--state-listed)/0.08)]' },
            { label: MESSAGES.fail,   value: fail,   color: 'text-state-danger',                 bg: 'bg-state-danger/5' },
            { label: MESSAGES.advise, value: advise, color: 'text-[rgb(var(--state-stale))]',   bg: 'bg-[rgb(var(--state-stale)/0.08)]' },
            { label: MESSAGES.na,     value: na,     color: 'text-ink-muted',                   bg: 'bg-bg-subtle' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn('rounded-md border border-line p-4 text-center', bg)}>
              <p className={cn('font-mono text-[28px] font-semibold tabular-nums', color)}>{value}</p>
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Category accordions */}
        <div className="space-y-2">
          {Object.entries(grouped).map(([category, items]) => (
            <CategoryAccordion
              key={category}
              category={category}
              items={items}
              inspectionId={inspection.id}
              isSubmitted={isSubmitted}
            />
          ))}
        </div>

        {/* Submit button */}
        {!isSubmitted && (
          <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {MESSAGES.submitInspection}
              </button>
            </div>
          </Gate>
        )}
      </div>
    </>
  );
}
