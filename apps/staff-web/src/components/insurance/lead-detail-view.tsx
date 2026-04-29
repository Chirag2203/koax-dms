/**
 * LeadDetailView — single lead detail with comprehensive owner + vehicle + meta cards.
 *
 * Cards:
 *   - Header (back, VIN+vehicle name, stage, outlet) + actions: WhatsApp, AI Call, Edit, Close
 *   - Owner card: customer name + masked phone + email + city + age + PAN-last-4 from customers-store
 *   - Vehicle card: VIN + year/make/model/color + odometer + NCB years + policy expiry from vehicles-store
 *   - Source / Meta card: source, priority, created, assigned advisor, marketing consent
 *   - Quotes (existing) — fail-closed IRDAI per L16
 *   - Call log (existing)
 *   - Issued policy (existing)
 *
 * Edit Lead slide-in: priority, assignedAdvisorId, marketingConsentGiven, customerCity,
 *   odometer, noClaimBonusYears, source. Saves via updateLead store action.
 *
 * Gate: R09+. Close R10+. Edit R09+.
 * Spec reference: SPEC-INSURANCE-001 §13, L_P5_4, plus reuse L49 contact-button recipe from custom-builds.
 */

'use client';

import { useState, useMemo } from 'react';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import { Gate } from '@/src/components/primitives/gate';
import { QuoteCard } from './quote-card';
import { ClosePolicyDialog } from './dialogs/close-policy-dialog';
import { ManualCallOutcomeDialog } from './dialogs/manual-call-outcome-dialog';
import {
  BuildWhatsAppDialog,
  BuildAiCallDialog,
} from '@/src/components/custom-builds/dialogs/contact-customer-adapters';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';
import {
  ArrowLeft,
  Phone,
  Calendar,
  FileCheck,
  MessageCircle,
  Sparkles,
  Pencil,
  X,
  CheckCircle2,
  SkipForward,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type { InsuranceLead, InsuranceLeadStage, ManualFollowupOutcome } from '@dms/types';
import type { DialogMode } from './dialogs/manual-call-outcome-dialog';

const STAGE_COLORS: Record<string, string> = {
  'due-soon': 'bg-warning/15 text-warning',
  'due': 'bg-state-danger/15 text-state-danger',
  'quoted': 'bg-accent/15 text-accent',
  'negotiating': 'bg-purple/15 text-purple-400',
  'closed-won': 'bg-success/15 text-success',
  'closed-lost': 'bg-ink-muted/15 text-ink-muted',
};

interface Props {
  leadId: string;
}

// ─── Edit Lead slide-in ──────────────────────────────────────────────────────

function EditLeadDialog({
  lead,
  actor,
  onClose,
  onSaved,
}: {
  lead: InsuranceLead;
  actor: { id: string; name: string; role: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateLead = useInsuranceStore((s) => s.updateLead);
  const [priority, setPriority] = useState<'normal' | 'urgent'>(
    (lead.priority as 'normal' | 'urgent' | undefined) ?? 'normal',
  );
  const [assignedAdvisorId, setAssignedAdvisorId] = useState(lead.assignedAdvisorId);
  const [customerCity, setCustomerCity] = useState(lead.customerCity);
  const [odometer, setOdometer] = useState(lead.odometer);
  const [ncb, setNcb] = useState(lead.noClaimBonusYears);
  const [source, setSource] = useState<'MANUAL' | 'AUTO_RENEWAL' | 'COMPARE'>(
    lead.source ?? 'MANUAL',
  );
  const [marketingConsent, setMarketingConsent] = useState(lead.marketingConsentGiven);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      updateLead(
        lead.leadId,
        {
          priority,
          assignedAdvisorId,
          customerCity,
          odometer,
          noClaimBonusYears: ncb,
          source,
          marketingConsentGiven: marketingConsent,
        },
        actor,
      );
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Edit lead"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-md bg-bg-surface border border-line p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-primary">Edit Lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-bg-subtle rounded"
            aria-label="Close"
          >
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
              className="h-9 px-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Source</span>
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as 'MANUAL' | 'AUTO_RENEWAL' | 'COMPARE')
              }
              className="h-9 px-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="MANUAL">Manual</option>
              <option value="AUTO_RENEWAL">Auto Renewal</option>
              <option value="COMPARE">From Compare flow</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-ink-muted">Assigned Advisor ID</span>
            <input
              type="text"
              value={assignedAdvisorId}
              onChange={(e) => setAssignedAdvisorId(e.target.value)}
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Customer City</span>
            <input
              type="text"
              value={customerCity}
              onChange={(e) => setCustomerCity(e.target.value)}
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Odometer (km)</span>
            <input
              type="number"
              min={0}
              value={odometer}
              onChange={(e) => setOdometer(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-xs text-ink-muted">NCB Years (0–5)</span>
            <input
              type="number"
              min={0}
              max={5}
              value={ncb}
              onChange={(e) => setNcb(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 mt-4 p-3 rounded-md bg-bg-subtle border border-line cursor-pointer">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="w-4 h-4 accent-accent cursor-pointer"
          />
          <div>
            <p className="text-sm text-ink-primary">Marketing consent (DPDP)</p>
            <p className="text-xs text-ink-muted">
              Required for inclusion in WhatsApp / AI campaigns. Per DPDP §6.
            </p>
          </div>
        </label>

        {error && <p className="mt-3 text-xs text-state-danger">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 text-sm rounded-md border border-line bg-bg-surface text-ink-primary hover:bg-bg-subtle"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 h-9 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent/90"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Card / Field primitives (matches staff-profile-tab + custom-builds overview-tab) ─

function Card({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-ink-primary mt-1">{value ?? '—'}</dd>
    </div>
  );
}

// ─── FollowupSequencePanel ────────────────────────────────────────────────────

/**
 * Renders the current follow-up step with "Mark as done" / "Skip" affordances
 * (§5.7). Shows step index, next due date, and last outcome if any.
 */
function FollowupSequencePanel({
  lead,
  onMarkDone,
  onSkip,
}: {
  lead: InsuranceLead;
  onMarkDone: (stepIndex: number) => void;
  onSkip: (stepIndex: number) => void;
}) {
  const seq = lead.followupSequenceState;
  const stepIndex = seq.currentStepIndex;
  const isOverdue = seq.nextDueAt ? seq.nextDueAt < new Date().toISOString() : false;
  const isPaused = seq.paused;
  const isComplete = !!seq.completedAt;

  return (
    <div className="rounded-md border border-line bg-bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-ink-primary flex items-center gap-2">
          <Clock size={14} className="text-ink-muted" aria-hidden="true" />
          Follow-up Sequence
        </h2>
        {isComplete && (
          <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full font-medium">
            Sequence complete
          </span>
        )}
        {isPaused && !isComplete && (
          <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full font-medium">
            Paused
          </span>
        )}
      </div>

      {isComplete ? (
        <p className="text-sm text-ink-muted">
          Completed{seq.completedAt ? ` on ${new Date(seq.completedAt).toLocaleDateString('en-IN')}` : ''}.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Current step row */}
          <div
            className={`flex items-start justify-between gap-4 p-3 rounded-md border ${
              isOverdue ? 'border-state-danger/40 bg-state-danger/5' : 'border-line bg-bg-subtle'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-primary">
                  Step {stepIndex + 1}
                </span>
                {isOverdue && (
                  <span className="text-[10px] font-medium text-state-danger bg-state-danger/10 px-1.5 py-0.5 rounded-full">
                    Overdue
                  </span>
                )}
              </div>
              {seq.nextDueAt && (
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Due:{' '}
                  <span className={isOverdue ? 'text-state-danger font-medium' : 'text-ink-secondary'}>
                    {new Date(seq.nextDueAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              )}
              {seq.lastOutcome && (
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Last outcome:{' '}
                  <span className="text-ink-secondary capitalize">
                    {seq.lastOutcome.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </p>
              )}
              {!seq.nextDueAt && !seq.lastOutcome && (
                <p className="text-[11px] text-ink-muted mt-0.5">
                  No due date set for this step.
                </p>
              )}
            </div>

            {/* Action buttons — R09+ gated */}
            <Gate role="R09" fallback="hide">
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onMarkDone(stepIndex)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-success hover:bg-success/8 hover:border-success/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Mark step ${stepIndex + 1} as done`}
                >
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Mark done
                </button>
                <button
                  type="button"
                  onClick={() => onSkip(stepIndex)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-surface text-[12px] font-medium text-ink-muted hover:bg-state-danger/8 hover:border-state-danger/30 hover:text-state-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Skip step ${stepIndex + 1}`}
                >
                  <SkipForward size={13} aria-hidden="true" />
                  Skip
                </button>
              </div>
            </Gate>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelative(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function maskPhone(phone?: string): string {
  if (!phone) return '—';
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 6) return phone;
  return `${cleaned.slice(0, 5)}··· ···${cleaned.slice(-2)}`;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function LeadDetailView({ leadId }: Props) {
  // ─── ALL HOOKS FIRST (Rules of Hooks) ──────────────────────────────────────
  const allLeads = useInsuranceStore((s) => s.leads);
  const providers = useInsuranceStore((s) => s.providers);
  const allCallLogs = useInsuranceStore((s) => s.callLogs);
  const customers = useCustomersStore((s) => s.customers);
  const vehiclesMap = useVehiclesStore((s) => s.vehicles);
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [aiCallOpen, setAiCallOpen] = useState(false);
  // §5.7 — manual followup outcome dialog state
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [followupDialogMode, setFollowupDialogMode] = useState<DialogMode>('mark-done');
  const [followupStepIndex, setFollowupStepIndex] = useState(0);

  const lead = useMemo(
    () => allLeads.find((l) => l.leadId === leadId),
    [allLeads, leadId],
  );
  const callLogs = useMemo(
    () => allCallLogs.filter((c) => c.leadId === leadId),
    [allCallLogs, leadId],
  );

  const customer = useMemo(
    () => (lead ? customers[lead.customerId] : undefined),
    [customers, lead],
  );
  const vehicle = useMemo(
    () => (lead ? vehiclesMap[lead.vin] : undefined),
    [vehiclesMap, lead],
  );

  // ─── Now safe to early-return ──────────────────────────────────────────────
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-sm text-ink-muted">Lead not found.</p>
        <Link href="/insurance" className="mt-4 text-accent hover:underline text-sm">
          Back to Insurance Hub
        </Link>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[lead.stage] ?? 'bg-ink-muted/15 text-ink-muted';
  const canClose = lead.stage === 'quoted' || lead.stage === 'negotiating';
  const actor = user
    ? { id: user.id, name: user.name, role: user.role }
    : { id: 'unknown', name: 'Unknown', role: 'R09' };

  const customerName = customer?.name ?? lead.customerId;
  const customerPhone = customer?.phone ?? '';
  const vehicleName = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : `VIN ${lead.vin.slice(-6)}`;

  const contactContext = {
    customerId: lead.customerId,
    customerName,
    customerPhone,
    contextNote: `Re: Insurance lead ${lead.leadId} — ${vehicleName}`,
  };

  return (
    <Gate role="R09" fallback="hide">
      <div className="flex flex-col h-full min-h-0 bg-bg-canvas">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-line shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/insurance"
              aria-label="Back to insurance hub"
              className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-bg-subtle text-ink-muted transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold leading-tight text-ink-primary">
                {vehicleName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-ink-muted">{lead.vin}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${stageColor}`}
                >
                  {lead.stage.replace('-', ' ')}
                </span>
                <span className="text-xs text-ink-muted capitalize">{lead.outlet}</span>
                {lead.priority === 'urgent' && (
                  <span className="text-xs font-bold uppercase tracking-wider text-state-danger">
                    Urgent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons — sales canonical pattern (L49) */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {customerPhone && (
              <Gate role={['R09', 'R10', 'R11', 'R12', 'R16', 'R19', 'R22', 'R24']} fallback="hide">
                <button
                  type="button"
                  onClick={() => setWhatsAppOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-[#25D366] hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                  aria-label={`Send WhatsApp to ${customerName}`}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp
                </button>
              </Gate>
            )}
            <Gate role={['R09', 'R10', 'R11', 'R12', 'R16', 'R19', 'R22', 'R24']} fallback="hide">
              <button
                type="button"
                onClick={() => setAiCallOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-line bg-bg-surface text-sm font-medium text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                aria-label={`AI Call ${customerName}`}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                AI Call
              </button>
            </Gate>
            <Gate role="R09" fallback="hide">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line bg-bg-surface text-sm text-ink-primary hover:bg-bg-subtle transition-colors"
              >
                <Pencil size={13} aria-hidden="true" />
                Edit
              </button>
            </Gate>
            {canClose && (
              <Gate role="R10" fallback="hide">
                <button
                  type="button"
                  onClick={() => setCloseDialogOpen(true)}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Close Lead
                </button>
              </Gate>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Owner / Vehicle / Source 3-up grid ─────────────────────── */}
          <div className="grid grid-cols-3 gap-4">
            {/* Owner card */}
            <Card
              title="Owner"
              rightSlot={
                <Link
                  href={`/customers/${lead.customerId}`}
                  className="text-xs text-accent hover:underline"
                >
                  View Customer 360 &rarr;
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Name" value={<span className="truncate">{customerName}</span>} />
                <Field label="Phone" value={<span className="font-mono">{maskPhone(customerPhone)}</span>} />
                <Field label="Email" value={<span className="truncate">{customer?.email ?? '—'}</span>} />
                <Field label="City" value={<span className="capitalize">{lead.customerCity}</span>} />
                <Field label="Age" value={`${lead.customerAge} yrs`} />
                <Field label="PAN (last 4)" value={<span className="font-mono">XXXX{lead.panLast4}</span>} />
              </dl>
            </Card>

            {/* Vehicle card */}
            <Card title="Vehicle">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field
                  label="Vehicle"
                  value={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown vehicle'}
                />
                <Field label="VIN" value={<span className="font-mono text-xs">{lead.vin}</span>} />
                <Field label="Color" value={<span className="capitalize">{vehicle?.color ?? '—'}</span>} />
                <Field label="Variant" value={vehicle?.variant ?? '—'} />
                <Field label="Odometer" value={`${lead.odometer.toLocaleString('en-IN')} km`} />
                <Field label="NCB" value={`${lead.noClaimBonusYears} yrs`} />
                {lead.expiresAt && (
                  <Field label="Policy expires" value={formatDate(lead.expiresAt)} />
                )}
              </dl>
            </Card>

            {/* Source / meta card */}
            <Card title="Source &amp; Meta">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field
                  label="Source"
                  value={<span className="capitalize">{(lead.source ?? 'manual').replace('_', ' ').toLowerCase()}</span>}
                />
                <Field label="Outlet" value={<span className="capitalize">{lead.outlet}</span>} />
                <Field
                  label="Created"
                  value={`${formatDate(lead.createdAt)} (${formatRelative(lead.createdAt)})`}
                />
                <Field label="Last updated" value={formatRelative(lead.updatedAt)} />
                <Field
                  label="Assigned advisor"
                  value={<span className="font-mono text-xs">{lead.assignedAdvisorId}</span>}
                />
                <Field
                  label="Marketing consent"
                  value={
                    <span className={lead.marketingConsentGiven ? 'text-success' : 'text-ink-muted'}>
                      {lead.marketingConsentGiven
                        ? `Given ${formatRelative(lead.marketingConsentAt)}`
                        : 'Not given'}
                    </span>
                  }
                />
              </dl>
            </Card>
          </div>

          {/* ── Quotes ─────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink-primary">
                Quotes ({lead.quotes.length})
              </h2>
              <Link
                href="/insurance/quote/new"
                className="text-xs text-accent hover:underline"
              >
                + New comparison
              </Link>
            </div>
            {lead.quotes.length === 0 ? (
              <div className="rounded-md border border-line bg-bg-subtle p-6 text-center">
                <p className="text-sm text-ink-muted">
                  No quotes yet. Run a comparison to generate quotes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {lead.quotes.map((quote) => {
                  const provider = providers.find((p) => p.id === quote.providerId);
                  if (!provider) return null;
                  return <QuoteCard key={quote.quoteId} provider={provider} quote={quote} />;
                })}
              </div>
            )}
          </div>

          {/* ── AI call log ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink-primary">
                Call Log ({callLogs.length})
              </h2>
            </div>
            {callLogs.length === 0 ? (
              <div className="rounded-md border border-line bg-bg-subtle p-4 text-center">
                <p className="text-sm text-ink-muted">No calls logged yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {callLogs.map((call) => (
                  <div
                    key={call.callId}
                    className="rounded-md border border-line bg-bg-surface p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Phone size={14} className="text-ink-muted" aria-hidden="true" />
                      <span className="text-xs font-medium text-ink-primary capitalize">
                        {call.outcome.replace('-', ' ')}
                      </span>
                      <span className="text-xs text-ink-muted ml-auto">
                        {new Date(call.calledAt).toLocaleString('en-IN')}
                      </span>
                      {call.isMocked && (
                        <span className="text-xs bg-warning/15 text-warning px-1.5 rounded">
                          Mock
                        </span>
                      )}
                    </div>
                    {call.transcript && (
                      <p className="text-xs text-ink-secondary line-clamp-2">
                        {call.transcript}
                      </p>
                    )}
                    {call.callbackScheduledAt && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Calendar size={12} className="text-ink-muted" aria-hidden="true" />
                        <span className="text-xs text-ink-muted">
                          Callback: {new Date(call.callbackScheduledAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Follow-up sequence (§5.7) ─────────────────────────── */}
          {lead.stage !== 'closed-won' && lead.stage !== 'closed-lost' && (
            <FollowupSequencePanel
              lead={lead}
              onMarkDone={(stepIdx) => {
                setFollowupStepIndex(stepIdx);
                setFollowupDialogMode('mark-done');
                setFollowupDialogOpen(true);
              }}
              onSkip={(stepIdx) => {
                setFollowupStepIndex(stepIdx);
                setFollowupDialogMode('skip');
                setFollowupDialogOpen(true);
              }}
            />
          )}

          {/* ── Policy info ──────────────────────────────────────────── */}
          {lead.issuedPolicyId && (
            <div className="rounded-md border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-success" aria-hidden="true" />
                <span className="text-sm font-medium text-success">Policy Issued</span>
              </div>
              <p className="text-xs text-ink-secondary mt-1">
                Policy ID: {lead.issuedPolicyId}
              </p>
            </div>
          )}
        </div>

        {/* ── IRDAI disclaimer ─────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-line shrink-0">
          <p className="text-xs text-ink-muted">
            BN Automobiles is a registered motor insurance web aggregator. Insurance is the
            subject matter of solicitation.
          </p>
        </div>
      </div>

      {/* Close-policy dialog */}
      {closeDialogOpen && (
        <ClosePolicyDialog
          open={closeDialogOpen}
          onClose={() => setCloseDialogOpen(false)}
          lead={lead}
          actor={actor}
          onSuccess={(outcome) => {
            toast(
              outcome === 'closed-won'
                ? 'Lead closed as Won. Policy details recorded.'
                : 'Lead closed as Lost.',
              'success',
            );
          }}
        />
      )}

      {/* Edit lead dialog */}
      {editOpen && (
        <EditLeadDialog
          lead={lead}
          actor={actor}
          onClose={() => setEditOpen(false)}
          onSaved={() => toast('Lead updated', 'success')}
        />
      )}

      {/* WhatsApp / AI Call (reuse custom-builds adapter) */}
      <BuildWhatsAppDialog
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        context={contactContext}
      />
      <BuildAiCallDialog
        open={aiCallOpen}
        onClose={() => setAiCallOpen(false)}
        context={contactContext}
      />

      {/* §5.7 — Manual call outcome dialog */}
      <Gate role="R09" fallback="hide">
        <ManualCallOutcomeDialog
          open={followupDialogOpen}
          onClose={() => setFollowupDialogOpen(false)}
          leadId={leadId}
          stepIndex={followupStepIndex}
          mode={followupDialogMode}
          actor={actor}
          onSuccess={(outcome: ManualFollowupOutcome) => {
            toast(
              outcome.startsWith('SKIPPED')
                ? 'Step skipped and outcome recorded.'
                : 'Step marked as done.',
              'success',
            );
          }}
        />
      </Gate>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </Gate>
  );
}
