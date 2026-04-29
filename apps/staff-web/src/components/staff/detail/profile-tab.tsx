'use client';

/**
 * Profile tab — SPEC-STAFF-001 §8.2 Profile tab
 *
 * UI pattern: matches customer-360 profile (card shells + dt/dd grid).
 * Keeps edit-in-place for name/email/phone (R12+ for PII) and the audit log (L25).
 */
import { useState } from 'react';
import type { StaffProfile, StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import type { StaffProfileAuditEvent } from '@/src/lib/staff/staff-store';
import { Pencil, Check, X, Lock } from 'lucide-react';

interface ProfileTabProps {
  staff: StaffProfile;
  viewer: { role: string; id: string };
}

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'Bangalore (BLR)',
  mumbai: 'Mumbai (MUM)',
  chennai: 'Chennai (CHE)',
  all: 'All Outlets',
};

const AUDIT_KIND_LABEL: Record<string, string> = {
  onboarded: 'Onboarded',
  'role-transition': 'Role changed',
  'profile-updated': 'Profile updated',
  'salary-change': 'Salary updated',
  'leave-applied': 'Leave applied',
  'leave-approved': 'Leave approved',
  'leave-rejected': 'Leave rejected',
  'leave-cancelled': 'Leave cancelled',
  'exit-initiated': 'Exit initiated',
  'exit-cancelled': 'Exit cancelled',
  'fnf-finalized': 'F&F finalized',
};

// ─── Card primitive (matches customer-profile-tab) ───────────────────────────

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

// ─── Read-only field (dt/dd) ─────────────────────────────────────────────────

function Field({
  label,
  value,
  masked = false,
}: {
  label: string;
  value: React.ReactNode;
  masked?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-ink-primary mt-0.5 flex items-center">
        {value ?? '—'}
        {masked && (
          <span
            title="Confidential — full value requires R12+ or self"
            className="inline-flex items-center ml-1 align-middle"
          >
            <Lock className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          </span>
        )}
      </dd>
    </div>
  );
}

// ─── Editable field (edit-in-place) ──────────────────────────────────────────

function EditableField({
  label,
  value,
  onSave,
  canEdit,
  type = 'text',
}: {
  label: string;
  value: string;
  onSave: (newVal: string) => void;
  canEdit: boolean;
  type?: 'text' | 'email' | 'tel';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setDraft(value);
  }

  function save() {
    if (!draft.trim()) return;
    setSaving(true);
    onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  }

  return (
    <div className="group">
      <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
      <dd className="text-sm text-ink-primary mt-0.5">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              disabled={saving}
              className="flex-1 h-8 px-2 rounded-md border border-line bg-bg-canvas text-sm text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="p-1 rounded hover:bg-bg-subtle text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Save"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="p-1 rounded hover:bg-bg-subtle text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span>{value || '—'}</span>
            {canEdit && (
              <button
                type="button"
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-ink-muted hover:text-ink-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-opacity"
                aria-label={`Edit ${label}`}
              >
                <Pencil size={11} />
              </button>
            )}
          </div>
        )}
      </dd>
    </div>
  );
}

// ─── Audit trail entry ───────────────────────────────────────────────────────

function AuditTrailItem({ event }: { event: StaffProfileAuditEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges =
    Object.keys(event.before).length > 0 || Object.keys(event.after).length > 0;

  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div
        className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent mt-2"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink-primary">
            {AUDIT_KIND_LABEL[event.kind] ?? event.kind}
          </p>
          <span className="text-xs text-ink-muted whitespace-nowrap">
            {new Date(event.at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        {event.reason && (
          <p className="text-xs text-ink-muted mt-0.5">{event.reason}</p>
        )}
        <p className="text-xs text-ink-muted mt-0.5">
          by <span className="font-mono">{event.actorId}</span>
        </p>
        {hasChanges && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs text-accent hover:text-accent/80 focus-visible:outline-none"
          >
            {expanded ? 'Hide changes' : 'Show changes'}
          </button>
        )}
        {expanded && hasChanges && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.keys(event.before).length > 0 && (
              <div className="p-2 rounded bg-state-danger/5 border border-state-danger/15">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                  Before
                </p>
                {Object.entries(event.before).map(([k, v]) => (
                  <p key={k} className="text-xs font-mono text-ink-secondary">
                    {k}: {String(v)}
                  </p>
                ))}
              </div>
            )}
            {Object.keys(event.after).length > 0 && (
              <div className="p-2 rounded bg-success/5 border border-success/15">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
                  After
                </p>
                {Object.entries(event.after).map(([k, v]) => (
                  <p key={k} className="text-xs font-mono text-ink-secondary">
                    {k}: {String(v)}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────────────────

export function ProfileTab({ staff, viewer }: ProfileTabProps) {
  const viewerRole = viewer.role as StaffRoleCode;
  const isSelf = viewer.id === staff.id;

  const canSeePii = hasRank(viewerRole, 'R02') || viewerRole === 'R23';
  const isSelfOrR02Plus = isSelf || canSeePii;
  const canEditPii = isSelf || hasRank(viewerRole, 'R12');
  const canEditName = isSelf || hasRank(viewerRole, 'R03');

  const updateStaffProfile = useStaffStore((s) => s.updateStaffProfile);
  const selectProfileAuditLog = useStaffStore((s) => s.selectProfileAuditLog);

  const auditLog = selectProfileAuditLog(staff.id, viewerRole, isSelf);
  const canSeeAudit = isSelf || hasRank(viewerRole, 'R09');

  const liveStaffFromStore = useStaffStore((s) => s.selectStaffById(staff.id));
  const liveStaff = liveStaffFromStore ?? staff;

  function handleSave(field: 'name' | 'phone' | 'email', value: string) {
    updateStaffProfile(
      staff.id,
      { [field]: value },
      { id: viewer.id, role: viewerRole },
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ─── Employment ────────────────────────────────────────────── */}
      <Card title="Employment">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Department" value={liveStaff.department} />
          <Field
            label="Outlet"
            value={OUTLET_LABEL[liveStaff.outlet] ?? liveStaff.outlet}
          />
          <Field
            label="Role"
            value={`${liveStaff.role} — ${liveStaff.roleName}`}
          />
          <Field label="Status" value={liveStaff.status.replace('_', ' ')} />
          <Field label="Start Date" value={liveStaff.startDate} />
          {liveStaff.exitDate && (
            <Field label="Exit Date" value={liveStaff.exitDate} />
          )}
          <Field
            label="Reports To"
            value={
              liveStaff.reportsTo ? (
                <a
                  href={`/staff/${liveStaff.reportsTo}`}
                  className="text-accent underline hover:no-underline"
                >
                  {liveStaff.reportsTo}
                </a>
              ) : (
                'No direct manager'
              )
            }
          />
        </dl>
      </Card>

      {/* ─── Contact ───────────────────────────────────────────────── */}
      <Card title="Contact">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <EditableField
            label="Name"
            value={liveStaff.name}
            onSave={(v) => handleSave('name', v)}
            canEdit={canEditName}
          />
          <EditableField
            label="Email"
            type="email"
            value={
              hasRank(viewerRole, 'R03') || isSelf
                ? liveStaff.email
                : '••••@•••.•••'
            }
            onSave={(v) => handleSave('email', v)}
            canEdit={canEditPii && (hasRank(viewerRole, 'R03') || isSelf)}
          />
          <EditableField
            label="Phone"
            type="tel"
            value={
              isSelfOrR02Plus
                ? liveStaff.phone ?? ''
                : liveStaff.phone
                  ? '+91 ####-###XXX'
                  : ''
            }
            onSave={(v) => handleSave('phone', v)}
            canEdit={canEditPii && isSelfOrR02Plus}
          />
        </dl>
      </Card>

      {/* ─── Identity (PII — DPDP §19) ──────────────────────────────── */}
      <Card title="Identity (PII — DPDP §19)">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field
            label="Aadhaar (last 4)"
            value={
              canSeePii
                ? liveStaff.aadhaarLast4
                  ? `XXXX-XXXX-${liveStaff.aadhaarLast4}`
                  : '—'
                : 'XXXX-XXXX-XXXX'
            }
            masked={!canSeePii}
          />
          <Field
            label="PAN (masked)"
            value={
              canSeePii || viewerRole === 'R22'
                ? liveStaff.panMasked ?? '—'
                : '—'
            }
            masked={!(canSeePii || viewerRole === 'R22')}
          />
          <Field
            label="Bank Account"
            value={
              hasRank(viewerRole, 'R16')
                ? liveStaff.bankAccountMasked ?? '—'
                : '—'
            }
            masked={!hasRank(viewerRole, 'R16')}
          />
          <Field label="State of Posting" value={liveStaff.stateOfPosting} />
        </dl>
      </Card>

      {/* ─── Compliance ─────────────────────────────────────────────── */}
      <Card title="Compliance">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field
            label="DPDP Consent"
            value={
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                  liveStaff.dpdpConsentGiven ? 'text-success' : 'text-warning'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    liveStaff.dpdpConsentGiven ? 'bg-success' : 'bg-warning'
                  }`}
                  aria-hidden="true"
                />
                {liveStaff.dpdpConsentGiven ? 'Consent given' : 'Pending consent'}
              </span>
            }
          />
          {liveStaff.dpdpConsentAt && (
            <Field
              label="Consent Date"
              value={new Date(liveStaff.dpdpConsentAt).toLocaleDateString(
                'en-IN',
              )}
            />
          )}
          <Field
            label="Fingerprint"
            value={
              <span
                className={`text-sm font-medium ${
                  liveStaff.fingerprintEnrolled ? 'text-success' : 'text-ink-muted'
                }`}
              >
                {liveStaff.fingerprintEnrolled ? 'Enrolled' : 'Not enrolled'}
              </span>
            }
          />
        </dl>
      </Card>

      {/* ─── Profile Audit Trail (L25) ──────────────────────────────── */}
      {canSeeAudit && (
        <Card title="Profile Audit Trail">
          {auditLog.length === 0 ? (
            <p className="text-sm text-ink-muted">No profile changes recorded.</p>
          ) : (
            <ol
              className="divide-y divide-line"
              aria-label="Profile change history"
            >
              {[...auditLog].reverse().map((event) => (
                <AuditTrailItem key={event.id} event={event} />
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-ink-muted">
            Audit trail is append-only and anonymized 7 years after exit (Doc 06 §17).
          </p>
        </Card>
      )}
    </div>
  );
}
