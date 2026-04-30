'use client';

/**
 * Test-drive detail view — booking info + execution checklist + feedback dialog.
 *
 * PRE-FLIGHT UI CHECKLIST (SPEC-ARCH-UI-001 §17.1):
 * 1. Card + Field from custom-builds/shared/detail-card — imported below.
 * 2. text-xs / sm / base / lg / xl / 2xl only — NO text-[NNpx].
 * 3. rounded-md only (no oversized radius classes).
 * 4. Gate for RBAC — imported below.
 * 5. i18n via useTranslations('testDrives.*').
 * 6. Button from @/src/components/primitives/button.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S2 S4 S5 S7 S8 S9
 */

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { useTestDriveStore } from '@/src/lib/test-drive/test-drive-store';
import { TestDriveStoreHydrator } from '@/src/lib/test-drive/test-drive-store-hydrator';
import { TestDriveStatusChip } from './test-drive-status-chip';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { Gate } from '@/src/components/primitives/gate';
import { Button } from '@/src/components/primitives/button';
import type { TestDriveSlot, TestDriveExecution, TestDriveFeedback, TestDriveInterestLevel } from '@dms/types';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import Link from 'next/link';
import { useToast } from '@/src/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_LABEL: Record<TestDriveSlot, string> = {
  MORNING: 'Morning (9am–12pm)',
  AFTERNOON: 'Afternoon (12pm–4pm)',
  EVENING: 'Evening (4pm–7pm)',
  FULL_DAY: 'Full Day',
};

const INTEREST_LABEL: Record<TestDriveInterestLevel, string> = {
  cold: '❄ Cold',
  warm: '🌤 Warm',
  hot: '🔥 Hot',
};

const FUEL_OPTIONS = [0, 25, 50, 75, 100] as const;

const FOLLOW_UP_OPTIONS = [1, 3, 7, 14, 30] as const;

// ─── Confirm dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  bookingId: string;
  onClose: () => void;
}

function ConfirmDialog({ bookingId, onClose }: ConfirmDialogProps) {
  const t = useTranslations('testDrives');
  const { user } = useStaffAuth();
  const { toast } = useToast();
  const confirmBooking = useTestDriveStore((s) => s.confirmBooking);

  const [date, setDate] = React.useState('');
  const [slot, setSlot] = React.useState<TestDriveSlot>('MORNING');
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !user) return;
    setSubmitting(true);
    try {
      confirmBooking(bookingId, user.id ?? 'staff', user.name ?? 'Advisor', date, slot);
      toast(t('toastConfirmed'), 'success');
      onClose();
    } catch {
      toast(t('toastError'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="bg-bg-surface border border-line rounded-md w-full max-w-md p-6">
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-ink-primary mb-4">{t('confirmTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('confirmedDate')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('slot')}</label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as TestDriveSlot)}
              className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
            >
              {(Object.keys(SLOT_LABEL) as TestDriveSlot[]).map((s) => (
                <option key={s} value={s}>{SLOT_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" size="md" disabled={submitting || !date} fullWidth>
              {submitting ? t('confirming') : t('confirmCta')}
            </Button>
            <Button type="button" variant="secondary" size="md" onClick={onClose} fullWidth>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reslot dialog ────────────────────────────────────────────────────────────

interface ReslotDialogProps {
  bookingId: string;
  onClose: () => void;
}

function ReslotDialog({ bookingId, onClose }: ReslotDialogProps) {
  const t = useTranslations('testDrives');
  const { toast } = useToast();
  const reslotBooking = useTestDriveStore((s) => s.reslotBooking);

  const [date, setDate] = React.useState('');
  const [slot, setSlot] = React.useState<TestDriveSlot>('MORNING');
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setSubmitting(true);
    try {
      reslotBooking(bookingId, date, slot);
      toast(t('toastReslotted'), 'success');
      onClose();
    } catch {
      toast(t('toastError'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reslot-dialog-title">
      <div className="bg-bg-surface border border-line rounded-md w-full max-w-md p-6">
        <h2 id="reslot-dialog-title" className="text-base font-semibold text-ink-primary mb-4">{t('reslotTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('newDate')}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('slot')}</label>
            <select value={slot} onChange={(e) => setSlot(e.target.value as TestDriveSlot)} className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1">
              {(Object.keys(SLOT_LABEL) as TestDriveSlot[]).map((s) => (
                <option key={s} value={s}>{SLOT_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" size="md" disabled={submitting || !date} fullWidth>{submitting ? t('reslotting') : t('reslotCta')}</Button>
            <Button type="button" variant="secondary" size="md" onClick={onClose} fullWidth>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Checklist dialog (S7) ────────────────────────────────────────────────────

interface ChecklistDialogProps {
  bookingId: string;
  onClose: () => void;
}

function ChecklistDialog({ bookingId, onClose }: ChecklistDialogProps) {
  const t = useTranslations('testDrives');
  const { toast } = useToast();
  const startChecklist = useTestDriveStore((s) => s.startChecklist);

  const [license, setLicense] = React.useState('');
  const [fuelBefore, setFuelBefore] = React.useState<0 | 25 | 50 | 75 | 100>(50);
  const [odometerBefore, setOdometerBefore] = React.useState('');
  const [driverName, setDriverName] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!license || !odometerBefore) return;
    setSubmitting(true);
    const now = new Date().toISOString();
    const execution: TestDriveExecution = {
      licenseNumber: license,
      licenseVerifiedAt: now,
      fuelLevelBefore: fuelBefore,
      odometerBefore: Number(odometerBefore),
      driverName: driverName || undefined,
      startedAt: now,
    };
    try {
      startChecklist(bookingId, execution);
      toast(t('toastChecklistStarted'), 'success');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('toastError');
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="checklist-dialog-title">
      <div className="bg-bg-surface border border-line rounded-md w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
        <h2 id="checklist-dialog-title" className="text-base font-semibold text-ink-primary mb-4">{t('checklistTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('licenseNumber')} *</label>
            <input type="text" value={license} onChange={(e) => setLicense(e.target.value)} required placeholder="MH02-2019XXXXXXX" className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('fuelLevelBefore')} *</label>
            <select value={fuelBefore} onChange={(e) => setFuelBefore(Number(e.target.value) as typeof fuelBefore)} className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1">
              {FUEL_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}%</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('odometerBefore')} (km) *</label>
            <input type="number" min="0" value={odometerBefore} onChange={(e) => setOdometerBefore(e.target.value)} required placeholder="18000" className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('driverName')}</label>
            <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Accompanying advisor" className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" size="md" disabled={submitting || !license || !odometerBefore} fullWidth>{submitting ? t('startingChecklist') : t('startChecklistCta')}</Button>
            <Button type="button" variant="secondary" size="md" onClick={onClose} fullWidth>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Feedback dialog (S8, L5) ─────────────────────────────────────────────────

interface FeedbackDialogProps {
  bookingId: string;
  fuelBefore?: number;
  odometerBefore?: number;
  onClose: () => void;
}

function FeedbackDialog({ bookingId, fuelBefore, odometerBefore, onClose }: FeedbackDialogProps) {
  const t = useTranslations('testDrives');
  const { user } = useStaffAuth();
  const { toast } = useToast();
  const completeDrive = useTestDriveStore((s) => s.completeDrive);

  const [interest, setInterest] = React.useState<TestDriveInterestLevel>('warm');
  const [followUp, setFollowUp] = React.useState<1 | 3 | 7 | 14 | 30>(7);
  const [freeText, setFreeText] = React.useState('');
  const [fuelAfter, setFuelAfter] = React.useState<0 | 25 | 50 | 75 | 100>(fuelBefore as 0 | 25 | 50 | 75 | 100 ?? 50);
  const [odometerAfter, setOdometerAfter] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const feedback: TestDriveFeedback = {
      interestLevel: interest,
      followUpDays: followUp,
      freeText: freeText || undefined,
      recordedAt: new Date().toISOString(),
      recordedBy: user.id ?? 'staff',
    };
    try {
      completeDrive(bookingId, feedback);
      toast(t('toastDriveCompleted'), 'success');
      onClose();
    } catch {
      toast(t('toastError'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title">
      <div className="bg-bg-surface border border-line rounded-md w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
        <h2 id="feedback-dialog-title" className="text-base font-semibold text-ink-primary mb-4">{t('feedbackTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('interestLevel')}</label>
            <div className="flex gap-2">
              {(['cold', 'warm', 'hot'] as TestDriveInterestLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setInterest(lvl)}
                  className={[
                    'flex-1 h-9 rounded-md border text-sm font-medium transition-colors',
                    interest === lvl
                      ? 'bg-accent text-white border-accent'
                      : 'border-line text-ink-secondary hover:bg-bg-subtle',
                  ].join(' ')}
                >
                  {INTEREST_LABEL[lvl]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('followUpDays')}</label>
            <select value={followUp} onChange={(e) => setFollowUp(Number(e.target.value) as typeof followUp)} className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1">
              {FOLLOW_UP_OPTIONS.map((d) => (
                <option key={d} value={d}>Follow up in {d} day{d > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('fuelAfter')}</label>
            <select value={fuelAfter} onChange={(e) => setFuelAfter(Number(e.target.value) as typeof fuelAfter)} className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1">
              {FUEL_OPTIONS.map((f) => (
                <option key={f} value={f}>{f}%</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('odometerAfter')} (km)</label>
            <input type="number" min={odometerBefore ?? 0} value={odometerAfter} onChange={(e) => setOdometerAfter(e.target.value)} placeholder="18050" className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('notes')}</label>
            <textarea value={freeText} onChange={(e) => setFreeText(e.target.value)} rows={3} placeholder={t('feedbackPlaceholder')} className="w-full border border-line rounded-md px-3 py-2 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" size="md" disabled={submitting} fullWidth>{submitting ? t('completing') : t('completeCta')}</Button>
            <Button type="button" variant="secondary" size="md" onClick={onClose} fullWidth>{t('cancel')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────

interface CancelDialogProps {
  bookingId: string;
  onClose: () => void;
}

function CancelDialog({ bookingId, onClose }: CancelDialogProps) {
  const t = useTranslations('testDrives');
  const { user } = useStaffAuth();
  const { toast } = useToast();
  const cancelBooking = useTestDriveStore((s) => s.cancelBooking);

  const [reason, setReason] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || !user) return;
    setSubmitting(true);
    try {
      cancelBooking(bookingId, reason, user.id ?? 'staff');
      toast(t('toastCancelled'), 'success');
      onClose();
    } catch {
      toast(t('toastError'), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
      <div className="bg-bg-surface border border-line rounded-md w-full max-w-md p-6">
        <div className="flex items-start gap-2 mb-4">
          <AlertCircle size={18} className="text-state-danger mt-0.5 shrink-0" strokeWidth={1.5} />
          <h2 id="cancel-dialog-title" className="text-base font-semibold text-ink-primary">{t('cancelTitle')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">{t('cancelReason')} *</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder={t('cancelReasonPlaceholder')} className="w-full border border-line rounded-md px-3 h-9 text-sm bg-bg-surface text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="danger" size="md" disabled={submitting || !reason} fullWidth>{submitting ? t('cancelling') : t('cancelCta')}</Button>
            <Button type="button" variant="secondary" size="md" onClick={onClose} fullWidth>{t('dismiss')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── No-show confirm inline ───────────────────────────────────────────────────

interface NoShowConfirmProps {
  bookingId: string;
  onClose: () => void;
}

function NoShowConfirm({ bookingId, onClose }: NoShowConfirmProps) {
  const t = useTranslations('testDrives');
  const { toast } = useToast();
  const markNoShow = useTestDriveStore((s) => s.markNoShow);

  function handleConfirm() {
    try {
      markNoShow(bookingId);
      toast(t('toastNoShow'), 'success');
      onClose();
    } catch {
      toast(t('toastError'), 'error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="noshow-dialog-title">
      <div className="bg-bg-surface border border-line rounded-md w-full max-w-sm p-6">
        <h2 id="noshow-dialog-title" className="text-base font-semibold text-ink-primary mb-3">{t('noShowTitle')}</h2>
        <p className="text-sm text-ink-secondary mb-5">{t('noShowBody')}</p>
        <div className="flex gap-2">
          <Button type="button" variant="danger" size="md" onClick={handleConfirm} fullWidth>{t('noShowConfirm')}</Button>
          <Button type="button" variant="secondary" size="md" onClick={onClose} fullWidth>{t('dismiss')}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

interface DetailContentProps {
  bookingId: string;
}

function DetailContent({ bookingId }: DetailContentProps) {
  const t = useTranslations('testDrives');
  const selectById = useTestDriveStore((s) => s.selectById);
  const booking = selectById(bookingId);

  const [showConfirm, setShowConfirm] = React.useState(false);
  const [showReslot, setShowReslot] = React.useState(false);
  const [showChecklist, setShowChecklist] = React.useState(false);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [showCancel, setShowCancel] = React.useState(false);
  const [showNoShow, setShowNoShow] = React.useState(false);

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle size={36} className="text-ink-muted mx-auto mb-3" strokeWidth={1} />
          <p className="text-sm text-ink-secondary">{t('notFound')}</p>
        </div>
      </div>
    );
  }

  const dateDisplay = booking.confirmedDate ?? booking.requestedDate;
  const slotDisplay = SLOT_LABEL[booking.confirmedSlot ?? booking.requestedSlot];

  return (
    <div className="flex-1 overflow-auto p-6 max-w-3xl">
      {/* Back + header */}
      <div className="mb-4">
        <Link href="/test-drives" className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary transition-colors mb-3 focus-visible:outline-2 focus-visible:outline-accent">
          <ChevronLeft size={14} aria-hidden="true" /> {t('backToQueue')}
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-xs text-ink-muted uppercase tracking-wider mb-1">{booking.id}</p>
            <h1 className="text-xl font-semibold text-ink-primary">{booking.customerName}</h1>
          </div>
          <TestDriveStatusChip status={booking.status} />
        </div>
      </div>

      {/* Action buttons — S9: Gate for RBAC */}
      <Gate role={['R01', 'R03', 'R09', 'R19', 'R22', 'R24']} fallback="hide">
        <div className="flex flex-wrap gap-2 mb-6 p-3 bg-bg-subtle rounded-md border border-line">
          {booking.status === 'PENDING' && (
            <Button variant="primary" size="sm" onClick={() => setShowConfirm(true)}>
              {t('confirmBooking')}
            </Button>
          )}
          {booking.status === 'SCHEDULED' && (
            <>
              <Button variant="primary" size="sm" onClick={() => setShowChecklist(true)}>
                {t('startChecklist')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowReslot(true)}>
                {t('reslot')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowNoShow(true)}>
                {t('markNoShow')}
              </Button>
            </>
          )}
          {booking.status === 'EXECUTING' && (
            <Button variant="primary" size="sm" onClick={() => setShowFeedback(true)}>
              {t('recordFeedback')}
            </Button>
          )}
          {!['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(booking.status) && (
            <Button variant="danger" size="sm" onClick={() => setShowCancel(true)}>
              {t('cancelBooking')}
            </Button>
          )}
        </div>
      </Gate>

      {/* Overview card */}
      <div className="space-y-4">
        <Card title={t('overviewCard')}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Field label={t('vehicle')} value={`${booking.vehicleYear} ${booking.vehicleMake} ${booking.vehicleModel}`} />
            <Field label={t('vinLabel')} value={<span className="font-mono text-xs">{booking.vehicleVin}</span>} />
            <Field label={t('dateLabel')} value={dateDisplay} />
            <Field label={t('slotLabel')} value={slotDisplay} />
            <Field label={t('outletLabel')} value={booking.outletId.charAt(0).toUpperCase() + booking.outletId.slice(1)} />
            {booking.assignedAdvisorName && (
              <Field label={t('advisorLabel')} value={booking.assignedAdvisorName} />
            )}
            {booking.leadId && (
              <Field label={t('leadIdLabel')} value={<span className="font-mono text-xs">{booking.leadId}</span>} />
            )}
            {booking.notes && (
              <div className="col-span-2">
                <Field label={t('notesLabel')} value={booking.notes} />
              </div>
            )}
            {booking.cancellationReason && (
              <div className="col-span-2">
                <Field label={t('cancellationReasonLabel')} value={<span className="text-state-danger">{booking.cancellationReason}</span>} />
              </div>
            )}
          </dl>
        </Card>

        {/* Execution card — S9: Gate */}
        <Gate role={['R01', 'R03', 'R09', 'R19', 'R22', 'R24']} fallback="hide">
          {booking.execution && (
            <Card title={t('executionCard')}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label={t('licenseNumber')} value={<span className="font-mono text-xs">{booking.execution.licenseNumber}</span>} />
                <Field label={t('fuelLevelBefore')} value={`${booking.execution.fuelLevelBefore}%`} />
                <Field label={t('odometerBefore')} value={`${booking.execution.odometerBefore.toLocaleString('en-IN')} km`} />
                {booking.execution.fuelLevelAfter !== undefined && (
                  <Field label={t('fuelAfter')} value={`${booking.execution.fuelLevelAfter}%`} />
                )}
                {booking.execution.odometerAfter !== undefined && (
                  <Field label={t('odometerAfter')} value={`${booking.execution.odometerAfter.toLocaleString('en-IN')} km`} />
                )}
                {booking.execution.driverName && (
                  <Field label={t('driverName')} value={booking.execution.driverName} />
                )}
                {booking.execution.routeNotes && (
                  <div className="col-span-2">
                    <Field label={t('routeNotes')} value={booking.execution.routeNotes} />
                  </div>
                )}
              </dl>
            </Card>
          )}
        </Gate>

        {/* Feedback card — S9: Gate */}
        <Gate role={['R01', 'R03', 'R09', 'R19', 'R22', 'R24']} fallback="hide">
          {booking.feedback && (
            <Card title={t('feedbackCard')}>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label={t('interestLevel')} value={
                  <span className={[
                    'font-semibold',
                    booking.feedback.interestLevel === 'hot' ? 'text-red-600' :
                    booking.feedback.interestLevel === 'warm' ? 'text-amber-600' : 'text-blue-600'
                  ].join(' ')}>
                    {INTEREST_LABEL[booking.feedback.interestLevel]}
                  </span>
                } />
                <Field label={t('followUpDays')} value={`${booking.feedback.followUpDays} day${booking.feedback.followUpDays > 1 ? 's' : ''}`} />
                {booking.feedback.freeText && (
                  <div className="col-span-2">
                    <Field label={t('notes')} value={booking.feedback.freeText} />
                  </div>
                )}
              </dl>
            </Card>
          )}
        </Gate>
      </div>

      {/* Dialogs */}
      {showConfirm && <ConfirmDialog bookingId={booking.id} onClose={() => setShowConfirm(false)} />}
      {showReslot && <ReslotDialog bookingId={booking.id} onClose={() => setShowReslot(false)} />}
      {showChecklist && <ChecklistDialog bookingId={booking.id} onClose={() => setShowChecklist(false)} />}
      {showFeedback && <FeedbackDialog bookingId={booking.id} fuelBefore={booking.execution?.fuelLevelBefore} odometerBefore={booking.execution?.odometerBefore} onClose={() => setShowFeedback(false)} />}
      {showCancel && <CancelDialog bookingId={booking.id} onClose={() => setShowCancel(false)} />}
      {showNoShow && <NoShowConfirm bookingId={booking.id} onClose={() => setShowNoShow(false)} />}
    </div>
  );
}

// ─── Exported wrapper ─────────────────────────────────────────────────────────

export function TestDriveDetailView({ bookingId }: { bookingId: string }) {
  return (
    <TestDriveStoreHydrator>
      <DetailContent bookingId={bookingId} />
    </TestDriveStoreHydrator>
  );
}
