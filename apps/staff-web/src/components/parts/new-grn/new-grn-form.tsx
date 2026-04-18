/**
 * NewGrnForm — composer for /parts/grn/new (with ?po= pre-fill).
 *
 * - Loads the referenced PO from the parts store
 * - Seeds the match-grid via seedLinesFromPo
 * - Submits via usePartsStore.createGrn(input, actor) then patches receivedAt
 *   via updateGrn (spec §17 decision 5)
 *
 * Spec reference: PLAN-PARTS-004 §3, §5, §6, §18.5
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@dms/ui';
import { AlertDialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import type { Actor } from '@/src/lib/parts/parts-store';
import { NewGrnFormSchema } from './new-grn-schema';
import type { NewGrnFormValues } from './new-grn-schema';
import {
  computeGrnSummary,
  defaultsForNewGrn,
  mapFormToCreateInput,
} from './new-grn-helpers';
import { NewGrnHeaderSection } from './new-grn-header-section';
import { NewGrnMatchGrid } from './new-grn-match-grid';

export interface NewGrnFormProps {
  poId: string;
}

export function NewGrnForm({ poId }: NewGrnFormProps) {
  const router = useRouter();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);

  const po = usePartsStore((s) =>
    s.purchaseOrders.find((p) => p.id === poId),
  );
  const suppliers = usePartsStore((s) => s.suppliers);
  const supplier = useMemo(
    () => (po ? suppliers.find((s) => s.id === po.supplierId) : undefined),
    [po, suppliers],
  );

  const initialValues: NewGrnFormValues | undefined = useMemo(
    () => (po ? defaultsForNewGrn(po) : undefined),
    [po],
  );

  const methods = useForm<NewGrnFormValues>({
    resolver: zodResolver(NewGrnFormSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (values) => {
    if (!user || !po) {
      toast('Not authenticated or missing PO', 'error');
      return;
    }
    const actor: Actor = { id: user.id, name: user.name };
    const input = mapFormToCreateInput(values, po, user.id);

    const newGrn = usePartsStore.getState().createGrn(input, actor);

    // Store overwrites receivedAt with now() — patch back the form timestamp.
    // `values.receivedAt` is a `YYYY-MM-DDTHH:mm` local-time string from the
    // `<input type="datetime-local">` — browsers interpret it in the user's
    // local zone when parsed. Kept as-is so the rendered value matches what
    // the user typed. Downstream consumers that assume ISO-UTC should
    // normalize via `new Date(str).toISOString()`. Documented per spec §17
    // decision 5 + review finding #03.
    if (values.receivedAt) {
      usePartsStore
        .getState()
        .updateGrn(newGrn.id, { receivedAt: values.receivedAt }, actor);
    }

    toast(`${newGrn.grnNo} created as Draft`, 'success');
    setTimeout(() => {
      router.push(`/parts/grn/${newGrn.id}`);
    }, 600);
  });

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setCancelOpen(true);
    } else {
      router.back();
    }
  }, [isDirty, router]);

  if (!po) {
    // The page-level check in page.tsx handles unknown/absent poId; this is
    // a defensive render only.
    return null;
  }

  return (
    <FormProvider {...methods}>
      <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex items-center gap-1">
            <li>
              <Link
                href="/parts"
                className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                Parts
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3 w-3 text-ink-muted" />
            </li>
            <li>
              <Link
                href="/parts?tab=grn"
                className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                GRNs
              </Link>
            </li>
            <li aria-hidden="true" className="flex items-center">
              <ChevronRight className="h-3 w-3 text-ink-muted" />
            </li>
            <li
              aria-current="page"
              className="text-[13px] text-ink-primary"
            >
              New
            </li>
          </ol>
        </nav>

        {/* Header: title + top-right CTAs */}
        <div className="flex items-start justify-between gap-4 border-b border-line pb-5 mb-6">
          <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
            New Goods Receipt Note
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                'h-10 px-4 rounded-md border border-line bg-bg-surface',
                'text-sm font-medium text-ink-primary',
                'hover:bg-bg-subtle transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="new-grn-form"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={cn(
                'h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? 'Creating…' : 'Submit'}
            </button>
          </div>
        </div>

        <form
          id="new-grn-form"
          onSubmit={onSubmit}
          aria-label="New Goods Receipt Note"
          className="flex flex-col gap-6"
        >
          <NewGrnHeaderSection po={po} supplier={supplier} />
          <NewGrnMatchGrid />
          <InlineSummary />
        </form>
      </div>

      <AlertDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Discard changes?"
        description="Your unsaved entries will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setCancelOpen(false);
          router.back();
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </FormProvider>
  );
}

// ─── Inline summary ──────────────────────────────────────────────────────────

function InlineSummary() {
  const { control } = useFormContext<NewGrnFormValues>();
  const lines = useWatch({ control, name: 'lines' }) ?? [];
  const s = computeGrnSummary(lines);

  return (
    <div className="rounded-md border border-line bg-bg-subtle px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6">
      <Stat label="Lines" value={String(s.lineCount)} />
      <Stat label="Ordered Total" value={String(s.orderedTotal)} />
      <Stat label="Received Total" value={String(s.receivedTotal)} />
      <Stat
        label="Receipts"
        value={String(s.receiptsCount)}
        warning={s.overReceiptsCount > 0 ? `+${s.overReceiptsCount} over` : null}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono uppercase tracking-widest text-ink-muted">
        {label}
      </span>
      <span className="text-lg font-mono tabular-nums text-ink-primary">
        {value}
      </span>
      {warning && (
        <span className="text-[11px] text-[rgb(var(--state-overdue))]">
          {warning}
        </span>
      )}
    </div>
  );
}

