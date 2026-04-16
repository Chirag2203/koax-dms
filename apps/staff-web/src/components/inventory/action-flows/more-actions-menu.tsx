'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeftRight,
  Copy,
  AlertTriangle,
  EyeOff,
  Archive,
  MoreHorizontal,
  PencilLine,
} from 'lucide-react';
import { cn } from '@dms/ui';
import { Dialog, AlertDialog } from '@/src/components/primitives/dialog';
import { Gate } from '@/src/components/primitives/gate';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MoreActionsMenuProps {
  vin: string;
  currentStatus: string;
  currentOutlet: string;
  onTransfer: (outlet: string, reason: string, notify: boolean) => Promise<void>;
  onClone: (newVin: string, newKm: number, outlet?: string) => Promise<void>;
  onMarkStale: () => Promise<void>;
  onUnpublish: () => Promise<void>;
  onArchive: () => Promise<void>;
}

// ─── Outlets ──────────────────────────────────────────────────────────────────

const OUTLETS = [
  { value: 'bangalore', label: 'BN Automobiles Bangalore' },
  { value: 'mumbai', label: 'BN Automobiles Mumbai' },
  { value: 'chennai', label: 'BN Automobiles Chennai' },
];

// ─── Input class ──────────────────────────────────────────────────────────────

const inputClass =
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

// ─── Transfer modal ───────────────────────────────────────────────────────────

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  currentOutlet: string;
  onTransfer: (outlet: string, reason: string, notify: boolean) => Promise<void>;
}

const transferSchema = z.object({
  outlet: z.string().min(1, 'Please select an outlet'),
  reason: z.string().min(1, 'Reason is required').max(500),
  notify: z.boolean(),
});
type TransferForm = z.infer<typeof transferSchema>;

function TransferModal({ open, onClose, currentOutlet, onTransfer }: TransferModalProps) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: { outlet: '', reason: '', notify: true },
  });

  useEffect(() => {
    if (open) reset({ outlet: '', reason: '', notify: true });
  }, [open, reset]);

  async function onSubmit(data: TransferForm) {
    setSaving(true);
    try {
      await onTransfer(data.outlet, data.reason, data.notify);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const currentLabel = OUTLETS.find((o) => o.value === currentOutlet)?.label ?? currentOutlet;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transfer to another outlet"
      subtitle={`Current outlet: ${currentLabel}`}
      size="md"
      dirty={isDirty}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white',
              'bg-accent hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <label htmlFor="tf-outlet" className="block text-[13px] font-medium text-ink-secondary">
            Transfer to <span className="text-state-danger">*</span>
          </label>
          <select
            id="tf-outlet"
            className={cn(inputClass, errors.outlet && 'border-state-danger')}
            {...register('outlet')}
          >
            <option value="">Select outlet…</option>
            {OUTLETS.filter((o) => o.value !== currentOutlet).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errors.outlet && <p className="text-[12px] text-state-danger">{errors.outlet.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="tf-reason" className="block text-[13px] font-medium text-ink-secondary">
            Reason <span className="text-state-danger">*</span>
          </label>
          <textarea
            id="tf-reason"
            maxLength={500}
            rows={3}
            placeholder="Why is this vehicle being transferred?"
            className={cn(
              'w-full bg-bg-subtle border border-line rounded-md px-3 py-2 text-sm text-ink-primary resize-none',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
              errors.reason && 'border-state-danger',
            )}
            {...register('reason')}
          />
          {errors.reason && <p className="text-[12px] text-state-danger">{errors.reason.message}</p>}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent/30"
            {...register('notify')}
          />
          <span className="text-[13px] text-ink-primary">Notify receiving outlet manager</span>
        </label>
      </form>
    </Dialog>
  );
}

// ─── Clone modal ──────────────────────────────────────────────────────────────

interface CloneModalProps {
  open: boolean;
  onClose: () => void;
  sourceVin: string;
  onClone: (newVin: string, newKm: number, outlet?: string) => Promise<void>;
}

const cloneSchema = z.object({
  newVin: z.string().min(5, 'VIN must be at least 5 characters').max(17, 'VIN max 17 chars'),
  newKm: z
    .number({ invalid_type_error: 'Odometer reading required' })
    .min(0, 'Must be 0 or greater'),
  outlet: z.string().optional(),
});
type CloneForm = z.infer<typeof cloneSchema>;

function CloneModal({ open, onClose, sourceVin, onClone }: CloneModalProps) {
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CloneForm>({
    resolver: zodResolver(cloneSchema),
    defaultValues: { newVin: '', newKm: undefined, outlet: '' },
  });

  useEffect(() => {
    if (open) reset({ newVin: '', newKm: undefined, outlet: '' });
  }, [open, reset]);

  async function onSubmit(data: CloneForm) {
    setSaving(true);
    try {
      await onClone(data.newVin, data.newKm, data.outlet || undefined);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Clone as new vehicle"
      subtitle={`Cloning from: ${sourceVin}`}
      size="md"
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white',
              'bg-accent hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {saving ? 'Creating clone…' : 'Create clone'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* What copies preview */}
        <div className="rounded-md border border-line bg-bg-subtle px-4 py-3">
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink-muted mb-2">
            What gets copied
          </p>
          <ul className="space-y-1 text-[13px] text-ink-secondary">
            <li>Vehicle specs (make, model, variant, color, fuel, etc.)</li>
            <li>Technical specifications</li>
            <li>Ownership and compliance fields</li>
          </ul>
          <p className="mt-2 text-[12px] text-ink-muted">
            Cost ledger, photos, documents, timeline and appraisal are NOT copied.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <label htmlFor="cl-vin" className="block text-[13px] font-medium text-ink-secondary">
              New VIN <span className="text-state-danger">*</span>
            </label>
            <input
              id="cl-vin"
              type="text"
              maxLength={17}
              placeholder="Enter VIN for cloned vehicle"
              className={cn(inputClass, 'font-mono uppercase', errors.newVin && 'border-state-danger')}
              {...register('newVin', { setValueAs: (v: string) => v.toUpperCase() })}
            />
            {errors.newVin && <p className="text-[12px] text-state-danger">{errors.newVin.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cl-km" className="block text-[13px] font-medium text-ink-secondary">
              Odometer (km) <span className="text-state-danger">*</span>
            </label>
            <input
              id="cl-km"
              type="number"
              min={0}
              placeholder="0"
              className={cn(inputClass, 'font-mono tabular-nums', errors.newKm && 'border-state-danger')}
              {...register('newKm', { valueAsNumber: true })}
            />
            {errors.newKm && <p className="text-[12px] text-state-danger">{errors.newKm.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cl-outlet" className="block text-[13px] font-medium text-ink-secondary">
              Outlet (optional override)
            </label>
            <select id="cl-outlet" className={inputClass} {...register('outlet')}>
              <option value="">Same as source vehicle</option>
              {OUTLETS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

// ─── Main: MoreActionsMenu ────────────────────────────────────────────────────

type ActiveModal = 'transfer' | 'clone' | 'stale' | 'archive' | null;

export function MoreActionsMenu({
  vin,
  currentStatus,
  currentOutlet,
  onTransfer,
  onClone,
  onMarkStale,
  onUnpublish,
  onArchive,
}: MoreActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [archiveInput, setArchiveInput] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const vinLast6 = vin.slice(-6);
  const isArchiveBlocked = ['sold', 'reserved'].includes(currentStatus);
  const isStaleHidden = currentStatus.includes('stale');
  const isUnpublishVisible = currentStatus === 'published';

  // ⌘E shortcut — navigate to edit page
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        router.push(`/inventory/${vin}/edit`);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [vin, router]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function openModal(modal: ActiveModal) {
    setOpen(false);
    setActiveModal(modal);
  }

  const menuItemClass = cn(
    'flex w-full items-center gap-2.5 rounded-md px-3 py-2',
    'text-[13px] text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  );

  const destructiveItemClass = cn(
    'flex w-full items-center gap-2.5 rounded-md px-3 py-2',
    'text-[13px] text-state-danger hover:bg-state-danger/10',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger focus-visible:ring-inset',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  );

  return (
    <>
      {/* Trigger + menu */}
      <div ref={menuRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex w-full items-center justify-center gap-2 rounded-md px-4 py-1.5 text-[12px] text-ink-muted transition-colors hover:bg-bg-subtle hover:text-ink-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          More actions
        </button>

        {open && (
          <div
            role="menu"
            aria-label="More vehicle actions"
            className="absolute bottom-full left-0 right-0 mb-1 w-[240px] rounded-lg border border-line-strong bg-bg-surface p-1 shadow-xl z-50"
          >
            {/* Edit vehicle */}
            <Gate role={['R10', 'R12', 'R15', 'R16', 'R19', 'R22', 'R24']} fallback="disable">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  router.push(`/inventory/${vin}/edit`);
                }}
                className={menuItemClass}
              >
                <PencilLine className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 text-left">Edit vehicle</span>
                <span className="font-mono text-[11px] text-ink-muted">⌘E</span>
              </button>
            </Gate>

            <div className="my-1 border-t border-line" role="separator" />

            {/* Transfer */}
            <Gate role={['R19', 'R22', 'R24']} fallback="disable">
              <button
                type="button"
                role="menuitem"
                onClick={() => openModal('transfer')}
                className={menuItemClass}
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 text-left">Transfer outlet</span>
                <span className="font-mono text-[11px] text-ink-muted">⌘T</span>
              </button>
            </Gate>

            {/* Clone */}
            <Gate role={['R10', 'R15', 'R19', 'R22', 'R24']} fallback="disable">
              <button
                type="button"
                role="menuitem"
                onClick={() => openModal('clone')}
                className={menuItemClass}
              >
                <Copy className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                <span className="flex-1 text-left">Clone vehicle</span>
                <span className="font-mono text-[11px] text-ink-muted">⌘D</span>
              </button>
            </Gate>

            <div className="my-1 border-t border-line" role="separator" />

            {/* Mark stale — hidden if already stale */}
            {!isStaleHidden && (
              <Gate role={['R10', 'R15', 'R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openModal('stale')}
                  className={menuItemClass}
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="flex-1 text-left">Mark as stale</span>
                </button>
              </Gate>
            )}

            {/* Unpublish — only when status is published */}
            {isUnpublishVisible && (
              <Gate role={['R19', 'R22', 'R24']} fallback="disable">
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setOpen(false);
                    await onUnpublish();
                  }}
                  className={menuItemClass}
                >
                  <EyeOff className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="flex-1 text-left">Unpublish</span>
                </button>
              </Gate>
            )}

            <div className="my-1 border-t border-line" role="separator" />

            {/* Archive */}
            <Gate role={['R19', 'R22', 'R24']} fallback="disable">
              <button
                type="button"
                role="menuitem"
                disabled={isArchiveBlocked}
                onClick={() => !isArchiveBlocked && openModal('archive')}
                className={destructiveItemClass}
                title={isArchiveBlocked ? 'Cannot archive a sold or reserved vehicle' : undefined}
              >
                <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 text-left">Archive vehicle</span>
              </button>
            </Gate>
          </div>
        )}
      </div>

      {/* ─── Transfer modal ──────────────────────────────────────────────────── */}
      <TransferModal
        open={activeModal === 'transfer'}
        onClose={() => setActiveModal(null)}
        currentOutlet={currentOutlet}
        onTransfer={onTransfer}
      />

      {/* ─── Clone modal ─────────────────────────────────────────────────────── */}
      <CloneModal
        open={activeModal === 'clone'}
        onClose={() => setActiveModal(null)}
        sourceVin={vin}
        onClone={onClone}
      />

      {/* ─── Mark stale alert ─────────────────────────────────────────────────── */}
      <AlertDialog
        open={activeModal === 'stale'}
        onClose={() => setActiveModal(null)}
        title="Mark as stale?"
        description="This vehicle will be flagged as stale. It will still be visible but highlighted for follow-up action. You can reverse this later."
        confirmLabel="Mark stale"
        cancelLabel="Cancel"
        onConfirm={async () => {
          await onMarkStale();
          setActiveModal(null);
        }}
      />

      {/* ─── Archive alert ────────────────────────────────────────────────────── */}
      <AlertDialog
        open={activeModal === 'archive'}
        onClose={() => {
          setActiveModal(null);
          setArchiveInput('');
        }}
        title="Archive vehicle?"
        description={`This will remove ${vin} from active inventory. All records are preserved. Type the last 6 digits of the VIN (${vinLast6}) to confirm.`}
        confirmLabel="Archive vehicle"
        cancelLabel="Cancel"
        destructive
        requireTypeToConfirm={vinLast6}
        onConfirm={async () => {
          if (archiveInput !== vinLast6) return;
          await onArchive();
          setActiveModal(null);
          setArchiveInput('');
        }}
      />
    </>
  );
}
