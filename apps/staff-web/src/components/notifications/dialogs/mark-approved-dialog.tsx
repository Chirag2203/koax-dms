/**
 * MarkApprovedDialog — enter DLT template ID and approve a PENDING_DLT template.
 * SPEC-NOTIFICATIONS-001 L2, L16, S-N-9, S-N-15
 * SPEC-ARCH-UI-001 §3.5 (Dialog), §12 (form patterns)
 */

'use client';

import { useState } from 'react';
import { Dialog } from '../../primitives/dialog';
import { useToast } from '../../../hooks/use-toast';
import { ToastContainer } from '../../primitives/toast';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import { DltIdRequiredError } from '@dms/types';
import type { NotificationTemplate, Actor } from '@dms/types';

interface MarkApprovedDialogProps {
  open: boolean;
  onClose: () => void;
  template: NotificationTemplate;
  actor: Actor;
  onApproved?: () => void;
}

export function MarkApprovedDialog({
  open,
  onClose,
  template,
  actor,
  onApproved,
}: MarkApprovedDialogProps) {
  const [dltId, setDltId] = useState('');
  const [error, setError] = useState('');
  const { toasts, toast, dismiss } = useToast();

  const isDirty = dltId !== '';

  const needsDltId = template.channel === 'SMS' || template.channel === 'WHATSAPP';

  const handleSubmit = () => {
    setError('');
    try {
      useNotificationsStore.getState().markApproved(template.id, dltId, actor);
      toast('Template approved and ready for dispatch', 'success');
      onApproved?.();
      onClose();
    } catch (e) {
      if (e instanceof DltIdRequiredError) {
        // L2: DLT ID required for SMS/WhatsApp (S-N-9)
        setError(`DLT template ID is required for ${template.channel} templates (Doc 09 §DLT)`);
      } else {
        toast(e instanceof Error ? e.message : 'Approval failed', 'error');
      }
    }
  };

  const handleClose = () => {
    setDltId('');
    setError('');
    onClose();
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Dialog
        open={open}
        onClose={handleClose}
        title="Mark Template Approved"
        subtitle={`Approve "${template.name}" after receiving DLT registration confirmation.`}
        size="sm"
        dirty={isDirty}
        footer={
          <>
            <button
              type="button"
              onClick={handleClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Approve
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {needsDltId && (
            <div>
              <label
                htmlFor="dlt-id-input"
                className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
              >
                DLT Template ID <span className="text-state-danger">*</span>
              </label>
              <input
                id="dlt-id-input"
                type="text"
                value={dltId}
                onChange={(e) => {
                  setDltId(e.target.value);
                  setError('');
                }}
                placeholder="e.g. DLT1234567890123456"
                className={`h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 font-mono ${
                  error ? 'border-state-danger' : 'border-line'
                }`}
                aria-required="true"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? 'dlt-id-error' : undefined}
              />
              {error && (
                <p id="dlt-id-error" className="text-xs text-state-danger mt-1">
                  {error}
                </p>
              )}
              <p className="text-xs text-ink-muted mt-1.5">
                Enter the numeric DLT template ID received from the TRAI DLT registrar.
              </p>
            </div>
          )}

          {/* v1: proof doc upload placeholder — DEF-NOTIF-3 */}
          <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)]">
            <p className="text-xs text-ink-secondary">
              <span className="font-medium text-ink-primary">Proof document upload</span> — coming
              in v1.1. Attach the DLT registrar confirmation document to complete the audit trail
              (Doc 09 §DLT).
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
