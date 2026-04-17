'use client';

import { useRef, useState, useEffect } from 'react';
import {
  MoreHorizontal,
  UserCog,
  MapPin,
  ClipboardPlus,
  Copy,
  Ban,
  RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@dms/ui';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { Gate, ToastContainer } from '@/src/components/primitives';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ReassignAdvisorDialog } from './reassign-advisor-dialog';
import { MoveBayDialog } from './move-bay-dialog';
import { ReopenJobCardDialog } from './reopen-jobcard-dialog';
import type { JobCard } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  moreActions: 'More actions',
  reassignAdvisor: 'Re-assign Advisor',
  moveBay: 'Move Bay',
  addInspection: 'Add Inspection',
  cloneJobCard: 'Clone Job Card',
  cancelJobCard: 'Cancel Job Card',
  reopenJobCard: 'Reopen for Rework',
  cloneTitle: 'Clone Job Card',
  cloneDesc:
    'Clone will create a new job card with the same vehicle and service scope, in RECEIVED state. Labour and parts lines are not copied. Continue?',
  cloneConfirm: 'Clone',
  cloneBack: 'Cancel',
  cancelTitle: 'Cancel Job Card',
  cancelDesc: 'This will cancel the job card and free the bay. This action cannot be undone.',
  cancelConfirm: 'Cancel Job Card',
  cancelBack: 'Keep Open',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardMoreActionsMenuProps {
  jobCard: JobCard;
  onActionComplete?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardMoreActionsMenu({
  jobCard,
  onActionComplete,
}: JobCardMoreActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [moveBayOpen, setMoveBayOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { user } = useStaffAuth();
  const cloneJobCard = useServiceStore((s) => s.cloneJobCard);
  const cancelJobCard = useServiceStore((s) => s.cancelJobCard);
  const { toasts, toast, dismiss } = useToast();

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleAddInspection() {
    setMenuOpen(false);
    toast('Switch to the Inspection tab to start or view the VHC', 'info');
    // Scroll to tabs in case we need navigation hint — actual tab switch is owned by parent
    onActionComplete?.();
  }

  function handleCloneConfirm() {
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    const newJc = cloneJobCard(jobCard.id, actor);
    toast(`Cloned as ${newJc.jobNo}`, 'success');
    setCloneDialogOpen(false);
    router.push(`/service/jobcards/${newJc.id}`);
  }

  function handleCancelConfirm() {
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      setCancelReasonError('Reason must be at least 10 characters');
      return;
    }
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    cancelJobCard(jobCard.id, cancelReason.trim(), actor);
    toast('Job card cancelled', 'success');
    setCancelDialogOpen(false);
    router.push('/service?tab=jobcards');
  }

  const showReopenOption = jobCard.status === 'DELIVERED';

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={MESSAGES.moreActions}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-line bg-bg-surface text-ink-muted hover:text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label={MESSAGES.moreActions}
          className={cn(
            'absolute right-0 top-full mt-1 z-30 min-w-[200px]',
            'rounded-md border border-line bg-bg-surface shadow-lg',
            'py-1',
          )}
        >
          {/* Re-assign Advisor */}
          <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setReassignOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
            >
              <UserCog className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {MESSAGES.reassignAdvisor}
            </button>
          </Gate>

          {/* Move Bay */}
          <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setMoveBayOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
            >
              <MapPin className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {MESSAGES.moveBay}
            </button>
          </Gate>

          {/* Add Inspection */}
          <Gate role={['R09', 'R11', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={handleAddInspection}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
            >
              <ClipboardPlus className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {MESSAGES.addInspection}
            </button>
          </Gate>

          {/* Clone */}
          <Gate role={['R12', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setCloneDialogOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
            >
              <Copy className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              {MESSAGES.cloneJobCard}
            </button>
          </Gate>

          {/* Divider */}
          <div className="my-1 border-t border-line" />

          {/* Reopen for Rework — only when DELIVERED */}
          {showReopenOption && (
            <Gate role={['R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setReopenOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:bg-bg-subtle"
              >
                <RotateCcw className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                {MESSAGES.reopenJobCard}
              </button>
            </Gate>
          )}

          {/* Cancel — destructive, R19+ */}
          <Gate role={['R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                setCancelDialogOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] text-state-danger hover:bg-state-danger/5 transition-colors focus-visible:outline-none focus-visible:bg-state-danger/5"
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              {MESSAGES.cancelJobCard}
            </button>
          </Gate>
        </div>
      )}

      {/* Re-assign Advisor dialog */}
      <ReassignAdvisorDialog
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        jobCardId={jobCard.id}
        currentAdvisorId={jobCard.advisorId}
        onComplete={onActionComplete}
      />

      {/* Move Bay dialog */}
      <MoveBayDialog
        open={moveBayOpen}
        onClose={() => setMoveBayOpen(false)}
        jobCardId={jobCard.id}
        currentBayId={jobCard.bayId}
        onComplete={onActionComplete}
      />

      {/* Clone confirmation */}
      <AlertDialog
        open={cloneDialogOpen}
        onClose={() => setCloneDialogOpen(false)}
        title={MESSAGES.cloneTitle}
        description={MESSAGES.cloneDesc}
        confirmLabel={MESSAGES.cloneConfirm}
        cancelLabel={MESSAGES.cloneBack}
        destructive={false}
        onConfirm={handleCloneConfirm}
      />

      {/* Cancel confirmation with type-to-confirm + reason */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setCancelDialogOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-jc-title"
            className="relative bg-bg-surface border border-line-strong rounded-xl shadow-xl w-full max-w-[480px] z-10"
          >
            <div className="px-6 pt-6 pb-4">
              <h2 id="cancel-jc-title" className="text-base font-semibold text-ink-primary">
                {MESSAGES.cancelTitle}
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">{MESSAGES.cancelDesc}</p>
            </div>

            <div className="px-6 pb-4 space-y-4">
              {/* Reason */}
              <div>
                <label className="block text-xs uppercase tracking-wide text-ink-muted mb-1.5">
                  Reason <span className="text-ink-muted">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    if (cancelReasonError) setCancelReasonError('');
                  }}
                  rows={3}
                  placeholder="Explain why this job card is being cancelled..."
                  className={cn(
                    'w-full bg-bg-subtle border rounded-md px-3 py-2.5 text-sm text-ink-primary resize-none',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                    cancelReasonError ? 'border-state-danger' : 'border-line',
                  )}
                />
                {cancelReasonError && (
                  <p className="text-xs text-state-danger mt-1">{cancelReasonError}</p>
                )}
              </div>

              {/* Type-to-confirm */}
              <div>
                <p className="text-xs text-ink-muted mb-1.5">
                  Type{' '}
                  <span className="font-mono font-semibold text-ink-primary">{jobCard.jobNo}</span>{' '}
                  to confirm cancellation
                </p>
                <input
                  type="text"
                  id="cancel-confirm-input"
                  placeholder={jobCard.jobNo}
                  className={cn(
                    'h-10 w-full bg-bg-subtle border border-line rounded-md px-3',
                    'text-sm font-mono text-ink-primary',
                    'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  )}
                  autoComplete="off"
                  onKeyDown={(e) => {
                    // Allow confirm on Enter if conditions are met
                    const val = (e.target as HTMLInputElement).value;
                    if (e.key === 'Enter' && val === jobCard.jobNo) {
                      handleCancelConfirm();
                    }
                  }}
                  onChange={(e) => {
                    // Attach to state via a separate ref-free approach
                    const el = e.target as HTMLInputElement;
                    el.dataset['value'] = el.value;
                  }}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line flex flex-row-reverse gap-2">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('cancel-confirm-input') as HTMLInputElement | null;
                  const typeVal = input?.value ?? '';
                  if (typeVal !== jobCard.jobNo) {
                    // Shake the input visually — just show an alert for now
                    toast(`Type "${jobCard.jobNo}" to confirm`, 'error');
                    return;
                  }
                  handleCancelConfirm();
                }}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-state-danger hover:bg-state-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger focus-visible:ring-offset-2 transition-colors"
              >
                {MESSAGES.cancelConfirm}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setCancelReason('');
                  setCancelReasonError('');
                }}
                className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors"
              >
                {MESSAGES.cancelBack}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen for rework dialog */}
      <ReopenJobCardDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        jobCardId={jobCard.id}
        onComplete={onActionComplete}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
