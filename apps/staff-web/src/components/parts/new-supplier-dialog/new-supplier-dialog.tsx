/**
 * NewSupplierDialog — create a new supplier from the Suppliers tab header
 * or inline from the PO form supplier select sentinel.
 *
 * Uses Dialog primitive's built-in `dirty` prop for discard confirmation.
 *
 * Spec reference: PLAN-PARTS-005 §3
 */

'use client';

import { useCallback } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@dms/ui';
import type { Supplier } from '@dms/types';
import { Dialog, ToastContainer } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import type { Actor } from '@/src/lib/parts/parts-store';
import {
  NewSupplierFormSchema,
  defaultsForNewSupplier,
} from './new-supplier-schema';
import type { NewSupplierFormValues } from './new-supplier-schema';
import { mapFormToCreateInput } from './new-supplier-helpers';
import { NewSupplierForm } from './new-supplier-form';

export interface NewSupplierDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly-created supplier for auto-select flows. */
  onCreated?: (supplier: Supplier) => void;
}

export function NewSupplierDialog({
  open,
  onClose,
  onCreated,
}: NewSupplierDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const methods = useForm<NewSupplierFormValues>({
    resolver: zodResolver(NewSupplierFormSchema),
    defaultValues: defaultsForNewSupplier(),
    mode: 'onChange',
  });
  const {
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, isValid },
  } = methods;

  const handleClose = useCallback(() => {
    onClose();
    // Reset after the primitive animates out so users don't see a flash of
    // empty fields on discard-confirm.
    setTimeout(() => reset(defaultsForNewSupplier()), 250);
  }, [onClose, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!user) {
      toast('Not authenticated', 'error');
      return;
    }
    const actor: Actor = { id: user.id, name: user.name };
    const input = mapFormToCreateInput(values);
    const newSupplier = usePartsStore.getState().createSupplier(input, actor);

    toast(`Supplier "${newSupplier.name}" created`, 'success');
    onCreated?.(newSupplier);
    onClose();
    setTimeout(() => reset(defaultsForNewSupplier()), 250);
  });

  return (
    <FormProvider {...methods}>
      <Dialog
        open={open}
        onClose={handleClose}
        title="New Supplier"
        subtitle="Create a new supplier for purchase orders"
        size="md"
        dirty={isDirty}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
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
              form="new-supplier-form"
              disabled={isSubmitting || !isValid}
              aria-busy={isSubmitting}
              className={cn(
                'h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? 'Creating…' : 'Create Supplier'}
            </button>
          </div>
        }
      >
        <form
          id="new-supplier-form"
          onSubmit={onSubmit}
          aria-label="New Supplier"
        >
          <NewSupplierForm />
        </form>
      </Dialog>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </FormProvider>
  );
}
