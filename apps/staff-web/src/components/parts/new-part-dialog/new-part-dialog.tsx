/**
 * NewPartDialog — create a new Part master record.
 *
 * SlideInPanel at 60% width. Form content scrolls; footer is sticky inside
 * the panel body (SlideInPanel primitive has no footer slot).
 *
 * Spec reference: PLAN-PARTS-005 §4
 */

'use client';

import { useCallback, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@dms/ui';
import type { Part } from '@dms/types';
import {
  AlertDialog,
  SlideInPanel,
  ToastContainer,
} from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { usePartsStore } from '@/src/lib/parts/parts-store';
import type { Actor } from '@/src/lib/parts/parts-store';
import {
  NewPartFormSchema,
  defaultsForNewPart,
} from './new-part-schema';
import type { NewPartFormValues } from './new-part-schema';
import { mapFormToCreateInput } from './new-part-helpers';
import { NewPartForm } from './new-part-form';

export interface NewPartDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the newly-created part for auto-select flows. */
  onCreated?: (part: Part) => void;
}

export function NewPartDialog({
  open,
  onClose,
  onCreated,
}: NewPartDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [discardOpen, setDiscardOpen] = useState(false);

  const methods = useForm<NewPartFormValues>({
    resolver: zodResolver(NewPartFormSchema),
    defaultValues: defaultsForNewPart(),
    mode: 'onChange',
  });
  const {
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { isDirty, isSubmitting, isValid },
  } = methods;

  const resetAndClose = useCallback(() => {
    onClose();
    setTimeout(() => reset(defaultsForNewPart()), 250);
  }, [onClose, reset]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      resetAndClose();
    }
  }, [isDirty, resetAndClose]);

  const onSubmit = handleSubmit((values) => {
    if (!user) {
      toast('Not authenticated', 'error');
      return;
    }
    const actor: Actor = { id: user.id, name: user.name };
    const input = mapFormToCreateInput(values);

    try {
      const newPart = usePartsStore.getState().createPart(input, actor);
      clearErrors('partCode');
      toast(`Part ${newPart.partCode} created`, 'success');
      onCreated?.(newPart);
      resetAndClose();
    } catch (err) {
      if (err instanceof Error && err.message === 'PART_CODE_EXISTS') {
        setError('partCode', {
          type: 'manual',
          message: 'A part with this code already exists',
        });
        return;
      }
      throw err;
    }
  });

  return (
    <FormProvider {...methods}>
      <SlideInPanel
        open={open}
        onClose={handleCancel}
        width="60%"
        title="New Part"
      >
        <div className="flex flex-col h-full">
          <form
            id="new-part-form"
            onSubmit={onSubmit}
            aria-label="New Part"
            className="flex-1 overflow-y-auto p-6"
          >
            <NewPartForm />
          </form>
          {/* Sticky footer */}
          <div className="shrink-0 border-t border-line bg-bg-canvas px-6 py-4 flex items-center justify-end gap-2">
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
              form="new-part-form"
              disabled={isSubmitting || !isValid}
              aria-busy={isSubmitting}
              className={cn(
                'h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? 'Creating…' : 'Create Part'}
            </button>
          </div>
        </div>
      </SlideInPanel>

      <AlertDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard changes?"
        description="Your unsaved entries will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          resetAndClose();
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </FormProvider>
  );
}
