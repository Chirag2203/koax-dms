/**
 * LeadDetailPage — /leads/[id]
 *
 * SPEC-LEADS-001 §9.2
 *
 * Pre-flight:
 * 1. Card + Field from detail-card.tsx
 * 2. text-xs/sm/base/lg/xl/2xl only
 * 3. rounded-md only
 * 4. Gate for RBAC
 * 5. i18n under leads.*
 * 6. No text-[NNpx]
 * L12: "Schedule Test Drive" toasts the P2 message
 * L13: "Create Quote" toasts the P2 message
 * L7: addActivity is append-only
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MessageSquare, Phone, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LeadActivityKind } from '@dms/types';
import { useLeadsStore } from '@/src/lib/leads/leads-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { Gate } from '@/src/components/primitives/gate';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { computeLeadScore } from '@/src/lib/leads/lead-score';
import { LeadScoreChip } from './lead-score-chip';
import { LeadStageChip } from './lead-stage-chip';
import { LostLeadDialog } from './lost-lead-dialog';

// ─── Customer name lookup (fixture-based) ─────────────────────────────────────
const CUSTOMER_NAMES: Record<string, string> = {
  'cust-arjun-mehta': 'Arjun Mehta',
  'cust-priya-mehta': 'Priya Mehta',
  'cust-vikram-singh': 'Vikram Singh',
  'cust-meera-iyer': 'Meera Iyer',
  'cust-rahul-kumar': 'Rahul Kumar',
  'cust-rohan-desai': 'Rohan Desai',
  'cust-neha-kapoor': 'Neha Kapoor',
  'cust-sunita-reddy': 'Sunita Reddy',
  'cust-karan-shah': 'Karan Shah',
  'cust-pooja-desai': 'Pooja Desai',
};

const ADVISOR_NAMES: Record<string, string> = {
  'staff-r05-001': 'Rahul Kumar (Sales Executive)',
  'staff-r04-001': 'Deepa Nair (Sales Manager)',
  'staff-r09-001': 'SM Bangalore (R09)',
  'staff-r05-002': 'Anil Desai (Sales Executive)',
  'staff-r10-001': 'Priya Sharma (Sales Manager)',
  'staff-r12-001': 'SM Mumbai (R12)',
  'staff-r05-003': 'Kiran Menon (Sales Executive)',
  'staff-r09-002': 'Sanjay Rao (Sales Manager)',
  'staff-r12-002': 'SM Chennai (R12)',
};

// ─── Activity kind icon ────────────────────────────────────────────────────────

function ActivityIcon({ kind }: { kind: LeadActivityKind }) {
  switch (kind) {
    case 'call':         return <Phone size={13} className="text-accent" aria-hidden="true" />;
    case 'whatsapp':     return <MessageSquare size={13} className="text-state-success" aria-hidden="true" />;
    case 'stage-change': return <CheckCircle size={13} className="text-state-warning" aria-hidden="true" />;
    case 'assign':       return <CheckCircle size={13} className="text-accent" aria-hidden="true" />;
    default:             return <MessageSquare size={13} className="text-ink-muted" aria-hidden="true" />;
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function nextActionStatus(nextActionAt: string | undefined): { label: string; className: string } {
  if (!nextActionAt) return { label: 'No next action set', className: 'text-ink-muted' };
  const diff = new Date(nextActionAt).getTime() - Date.now();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 0) return { label: `Overdue — ${formatDateTime(nextActionAt)}`, className: 'text-state-error' };
  if (hours < 24) return { label: `Due soon — ${formatDateTime(nextActionAt)}`, className: 'text-state-warning' };
  return { label: formatDateTime(nextActionAt), className: 'text-ink-secondary' };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LeadDetailPageProps {
  leadId: string;
}

export function LeadDetailPage({ leadId }: LeadDetailPageProps) {
  const t = useTranslations('leads.detail');
  const router = useRouter();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // ONE base ref per selector
  const leads = useLeadsStore((s) => s.leads);
  const activities = useLeadsStore((s) => s.activities);
  const vehicleMap = useVehiclesStore((s) => s.vehicles);

  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);
  const leadActivities = useMemo(
    () => activities.filter((a) => a.leadId === leadId).sort((a, b) => b.at.localeCompare(a.at)),
    [activities, leadId],
  );
  const score = useMemo(
    () => (lead ? computeLeadScore(lead, activities) : 'COLD' as const),
    [lead, activities],
  );
  const vehicle = useMemo(
    () => (lead?.vehicleInterestVin ? vehicleMap[lead.vehicleInterestVin] : undefined),
    [lead, vehicleMap],
  );

  // Activity form state
  const [activityKind, setActivityKind] = useState<LeadActivityKind>('note');
  const [activityNote, setActivityNote] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // Lost dialog
  const [showLostDialog, setShowLostDialog] = useState(false);

  const handleAddActivity = useCallback(() => {
    if (!lead || !user || !activityNote.trim()) return;
    setSubmittingActivity(true);
    try {
      useLeadsStore.getState().addActivity(lead.id, {
        kind: activityKind,
        at: new Date().toISOString(),
        actorId: user.id,
        actorName: user.name,
        payload: { text: activityNote.trim() },
      });
      setActivityNote('');
      toast('Activity added.', 'success');
    } finally {
      setSubmittingActivity(false);
    }
  }, [lead, user, activityKind, activityNote, toast]);

  const handleTestDriveStub = useCallback(() => {
    // L12: P2 stub toast
    toast(t('testDriveStub'), 'info');
  }, [t, toast]);

  const handleQuoteStub = useCallback(() => {
    // L13: P2 stub toast
    toast(t('quoteStub'), 'info');
  }, [t, toast]);

  if (!lead) {
    return (
      <div className="p-6 text-sm text-ink-muted">Lead {leadId} not found.</div>
    );
  }

  const customerName = CUSTOMER_NAMES[lead.customerId] ?? lead.customerId;
  const advisorName = lead.assignedAdvisorId ? (ADVISOR_NAMES[lead.assignedAdvisorId] ?? lead.assignedAdvisorId) : undefined;
  const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}` : lead.vehicleInterestVin;
  const nextAction = nextActionStatus(lead.nextActionAt);
  const isLost = lead.stage === 'LOST' || lead.stage === 'DELIVERED';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/leads')}
            className="text-ink-muted hover:text-ink-primary transition-colors p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Back to Leads"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-ink-primary">{customerName}</h1>
              <LeadStageChip stage={lead.stage} />
              <LeadScoreChip score={score} />
            </div>
            <p className="text-xs font-mono text-ink-muted mt-0.5">{lead.id}</p>
          </div>
        </div>
        {/* CTAs */}
        {!isLost && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestDriveStub}
              className="h-9 px-4 rounded-md border border-line bg-bg-surface text-ink-secondary text-sm font-medium hover:bg-bg-hover hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('scheduleTestDrive')}
            </button>
            <button
              type="button"
              onClick={handleQuoteStub}
              className="h-9 px-4 rounded-md border border-line bg-bg-surface text-ink-secondary text-sm font-medium hover:bg-bg-hover hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('createQuote')}
            </button>
            <button
              type="button"
              onClick={() => setShowLostDialog(true)}
              className="h-9 px-4 rounded-md border border-state-error/40 bg-state-error/5 text-state-error text-sm font-medium hover:bg-state-error/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-error"
            >
              {t('markAsLost')}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — info cards */}
          <div className="space-y-4">
            <Card title={t('leadInfo')}>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3">
                <Field label={t('source')} value={<span className="capitalize">{lead.source.replace('-', ' ')}</span>} />
                <Field label={t('outlet')} value={
                  lead.outletId === 'bangalore' ? 'Bangalore (BLR)'
                  : lead.outletId === 'mumbai' ? 'Mumbai (MUM)'
                  : 'Chennai (CHE)'
                } />
                <Field label={t('createdAt')} value={formatDateTime(lead.createdAt)} />
                {vehicleName && (
                  <Field label={t('vehicleInterest')} value={
                    <span className="font-mono text-xs">{vehicleName}</span>
                  } />
                )}
                {lead.leadOriginUrl && (
                  <Field label={t('leadOrigin')} value={
                    <span className="text-xs break-all text-accent">{lead.leadOriginUrl}</span>
                  } />
                )}
                {lead.lostReason && (
                  <Field label={t('lostReason')} value={
                    <span className="text-state-error">{lead.lostReason}</span>
                  } />
                )}
              </dl>
            </Card>

            <Card title={t('nextAction')}>
              <div className="flex items-start gap-2">
                <Clock size={14} className={nextAction.className} aria-hidden="true" />
                <span className={`text-sm ${nextAction.className}`}>{nextAction.label}</span>
              </div>
            </Card>

            <Card
              title={t('assignedAdvisor')}
              rightSlot={
                <Gate role={['R09', 'R10', 'R12', 'R13', 'R19', 'R22', 'R24']} fallback="hide">
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-accent transition-colors"
                    onClick={() => toast('Advisor assignment UI wired in P2.', 'info')}
                  >
                    {advisorName ? t('changeAdvisor') : t('assignAdvisor')}
                  </button>
                </Gate>
              }
            >
              {advisorName ? (
                <p className="text-sm text-ink-primary">{advisorName}</p>
              ) : (
                <p className="text-sm text-ink-muted italic">{t('noAdvisor')}</p>
              )}
            </Card>
          </div>

          {/* Right column — activity */}
          <div className="lg:col-span-2 space-y-4">
            <Card title={t('activityTimeline')}>
              {leadActivities.length === 0 ? (
                <p className="text-sm text-ink-muted">{t('noActivities')}</p>
              ) : (
                <ol className="space-y-3">
                  {leadActivities.map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3">
                      <span className="mt-0.5 flex-shrink-0">
                        <ActivityIcon kind={activity.kind} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-ink-secondary capitalize">
                            {activity.kind.replace('-', ' ')}
                          </span>
                          <span className="text-xs text-ink-muted shrink-0">{formatDateTime(activity.at)}</span>
                        </div>
                        <p className="text-sm text-ink-primary mt-0.5">
                          {activity.payload?.text ?? (
                            activity.kind === 'stage-change'
                              ? `Moved from ${activity.payload?.fromStage} to ${activity.payload?.toStage}`
                              : activity.kind === 'assign'
                              ? `Assigned to ${activity.payload?.advisorName}`
                              : ''
                          )}
                        </p>
                        <p className="text-xs text-ink-muted mt-0.5">by {activity.actorName}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            {/* Add activity form */}
            {!isLost && (
              <Card title={t('addActivity')}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['note', 'call', 'whatsapp'] as LeadActivityKind[]).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setActivityKind(kind)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                          activityKind === kind
                            ? 'bg-accent text-white'
                            : 'bg-bg-hover text-ink-secondary hover:text-ink-primary'
                        }`}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                    placeholder={t('activityPlaceholder')}
                    className="w-full rounded-md border border-line bg-bg-canvas px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!activityNote.trim() || submittingActivity}
                      onClick={handleAddActivity}
                      className="h-9 px-4 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {t('activitySubmit')}
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Lost dialog */}
      {showLostDialog && (
        <LostLeadDialog
          leadId={lead.id}
          onClose={() => setShowLostDialog(false)}
          onConfirm={() => {
            setShowLostDialog(false);
            toast('Lead marked as lost.', 'success');
          }}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
