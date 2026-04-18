/**
 * EditPartDialog — edit part master fields (prices + non-qty fields).
 *
 * Spec reference: PLAN-PARTS-005 §5
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
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
import { EditPartFormSchema } from './edit-part-schema';
import type { EditPartFormValues } from './edit-part-schema';
import { diffPart, mapPartToForm } from './edit-part-helpers';
import { EditPartForm } from './edit-part-form';

export interface EditPartDialogProps {
  part: Part | null;
  open: boolean;
  onClose: () => void;
}

export function EditPartDialog({ part, open, onClose }: EditPartDialogProps) {
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [discardOpen, setDiscardOpen] = useState(false);

  const defaultValues = useMemo<EditPartFormValues | undefined>(
    () => (part ? mapPartToForm(part) : undefined),
    [part],
  );

  const methods = useForm<EditPartFormValues>({
    resolver: zodResolver(EditPartFormSchema),
    defaultValues,
    mode: 'onChange',
  });
  const {
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, isValid },
  } = methods;

  // Re-seed when the target part changes (another part opened in the panel)
  useEffect(() => {
    if (part) reset(mapPartToForm(part));
  }, [part, reset]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setDiscardOpen(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const onSubmit = handleSubmit((values) => {
    if (!part || !user) return;
    const actor: Actor = { id: user.id, name: user.name };
    const patch = diffPart(part, values);
    if (Object.keys(patch).length === 0) {
      // No-op submit — defensive; button is also disabled when !isDirty
      onClose();
      return;
    }
    usePartsStore.getState().updatePart(part.partCode, patch, actor);
    toast(`Part ${part.partCode} updated`, 'success');
    onClose();
  });

  if (!part) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <SlideInPanel
        open={open}
        onClose={handleCancel}
        width="60%"
        title="Edit Part"
      >
        <div className="flex flex-col h-full">
          <form
            id="edit-part-form"
            onSubmit={onSubmit}
            aria-label="Edit Part"
            className="flex-1 overflow-y-auto p-6 flex flex-col gap-6"
          >
            {/* Read-only partCode chip at top */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono uppercase tracking-widest text-ink-muted">
                Part Code
              </span>
              <span
                aria-readonly="true"
                className="inline-flex items-center gap-1.5 rounded-md bg-bg-subtle border border-line px-2 py-1 font-mono text-[13px] text-ink-primary"
              >
                <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
                {part.partCode}
              </span>
            </div>

            <EditPartForm />
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
              form="edit-part-form"
              disabled={isSubmitting || !isValid || !isDirty}
              aria-busy={isSubmitting}
              className={cn(
                'h-10 px-4 rounded-md bg-accent text-white text-sm font-medium',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? 'Saving…' : 'Save'}
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
          onClose();
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </FormProvider>
  );
}
