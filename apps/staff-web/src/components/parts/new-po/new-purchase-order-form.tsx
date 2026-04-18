/**
 * NewPurchaseOrderForm — composer for /parts/po/new.
 *
 * - Single-page, 3 sections (Header / Line Items) + sticky right-rail Summary
 * - Pre-fills from ?part= and ?jobCard= via store lookups
 * - Submits via usePartsStore.createPurchaseOrder(input, actor)
 *
 * Spec reference: PLAN-PARTS-004 §3, §4, §5, §6
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@dms/ui';
import { AlertDialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useServiceStore } from '@/src/lib/service/service-store';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import type { Actor } from '@/src/lib/parts/parts-store';
import { NewPoFormSchema, defaultsForNewPo } from './new-po-schema';
import type { NewPoFormValues } from './new-po-schema';
import {
  buildPrefillDefaults,
  countNonZeroOutlets,
  deriveSplitPos,
  makeGroupRef,
  mapFormToCreateInput,
  staffOutletToOutletId,
} from './new-po-helpers';
import { NewPoHeaderSection } from './new-po-header-section';
import { NewPoLineBuilder } from './new-po-line-builder';
import { NewPoSummaryRail } from './new-po-summary-rail';

export interface NewPurchaseOrderFormProps {
  initialPartCode?: string;
  initialJobCardId?: string;
}

export function NewPurchaseOrderForm({
  initialPartCode,
  initialJobCardId,
}: NewPurchaseOrderFormProps) {
  const router = useRouter();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);

  // Store reads (stable base-array selectors only)
  const parts = usePartsStore((s) => s.parts);
  const suppliers = usePartsStore((s) => s.suppliers);
  const jobCards = useServiceStore((s) => s.jobCards);

  // Build initial defaults once per deep-link input (and parts/jobcards identity)
  const initialValues: NewPoFormValues = useMemo(() => {
    const base = defaultsForNewPo();
    // Home outlet from staff
    base.outletId = staffOutletToOutletId(user?.outlet);

    const part = initialPartCode
      ? parts.find((p) => p.partCode === initialPartCode)
      : undefined;
    const firstSupplierId = part?.supplierIds[0];
    const supplier = firstSupplierId
      ? suppliers.find((s) => s.id === firstSupplierId)
      : undefined;

    const jc = initialJobCardId
      ? jobCards.find((j) => j.id === initialJobCardId)
      : undefined;
    const outletFromJc =
      jc?.outletId === 'BLR-01' ||
      jc?.outletId === 'MUM-01' ||
      jc?.outletId === 'CHE-01'
        ? jc.outletId
        : undefined;

    return buildPrefillDefaults(base, {
      part,
      supplier,
      outletId: outletFromJc ?? base.outletId,
      linkedJobCardId: jc?.id,
    });
  }, [
    initialPartCode,
    initialJobCardId,
    parts,
    suppliers,
    jobCards,
    user?.outlet,
  ]);

  const methods = useForm<NewPoFormValues>({
    resolver: zodResolver(NewPoFormSchema),
    defaultValues: initialValues,
    mode: 'onChange',
  });
  const {
    handleSubmit,
    watch,
    formState: { isDirty, isSubmitting },
    reset,
  } = methods;

  // Split-mode gating for the top-header Submit button
  const watchedMode = watch('mode');
  const watchedLines = watch('lines');
  const splitNonZeroOutlets =
    watchedMode === 'split' ? countNonZeroOutlets(watchedLines ?? []) : 1;
  const topSubmitDisabled =
    isSubmitting ||
    (watchedMode === 'split' && splitNonZeroOutlets === 0);

  // Re-seed when deep-link changes (rare — but keeps the form reactive)
  useEffect(() => {
    reset(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPartCode, initialJobCardId]);

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      toast('Not authenticated', 'error');
      return;
    }
    const actor: Actor = { id: user.id, name: user.name };
    const supplier = suppliers.find((s) => s.id === values.supplierId);

    if (values.mode === 'split') {
      // Derive N sibling POs (one per non-zero outlet) linked by a shared groupRef
      const groupRef = makeGroupRef();
      const payloads = deriveSplitPos(values, supplier, user.id, groupRef);
      const siblings = payloads.map((input) =>
        usePartsStore.getState().createPurchaseOrder(input, actor),
      );
      const poNos = siblings.map((p) => p.poNo).join(' · ');
      toast(
        `Created ${siblings.length} ${siblings.length === 1 ? 'PO' : 'POs'}: ${poNos}`,
        'success',
      );
      setTimeout(() => {
        router.push(`/parts?tab=po&group=${encodeURIComponent(groupRef)}`);
      }, 600);
      return;
    }

    // Single-outlet mode
    const input = mapFormToCreateInput(values, supplier, user.id);
    const newPo = usePartsStore.getState().createPurchaseOrder(input, actor);
    toast(`${newPo.poNo} created as Draft`, 'success');
    setTimeout(() => {
      router.push(`/parts/po/${newPo.id}`);
    }, 600);
  });

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setCancelOpen(true);
    } else {
      router.back();
    }
  }, [isDirty, router]);

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
                href="/parts?tab=po"
                className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                Purchase Orders
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
            New Purchase Order
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
              form="new-po-form"
              disabled={topSubmitDisabled}
              aria-busy={isSubmitting}
              className={cn(
                'h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting
                ? 'Creating…'
                : watchedMode === 'split' && splitNonZeroOutlets > 0
                  ? `Submit (${splitNonZeroOutlets} ${splitNonZeroOutlets === 1 ? 'PO' : 'POs'})`
                  : 'Submit'}
            </button>
          </div>
        </div>

        <form
          id="new-po-form"
          onSubmit={onSubmit}
          aria-label="New Purchase Order"
          className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6"
        >
          {/* Primary column */}
          <div className="flex flex-col gap-6 min-w-0">
            <NewPoHeaderSection suppliers={suppliers} />
            <NewPoLineBuilder parts={parts} />
          </div>

          {/* Sidebar rail */}
          <NewPoSummaryRail
            suppliers={suppliers}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
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
