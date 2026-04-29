'use client';

/**
 * Outlet detail view — SPEC-SETTINGS-001 §6.3
 * L8: Contact fields are office numbers — not personal PII.
 * L9: Deactivate/Reactivate button with type-to-confirm.
 * L10: Code field read-only.
 * R12 read + R02+ edit.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useSettingsStore } from '@/src/lib/settings/settings-store';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@dms/types';
import { EditOutletDialog } from './edit-outlet-dialog';
import { Gate } from '@/src/components/primitives/gate';
import type { OutletConfig } from '@dms/types';

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      aria-label={`Status: ${active ? 'Active' : 'Inactive'}`}
      className={[
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs uppercase tracking-widest',
        active
          ? 'bg-[rgb(var(--state-listed)/0.1)] text-[rgb(var(--state-listed))]'
          : 'bg-[rgb(var(--state-stale)/0.1)] text-[rgb(var(--state-stale))]',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-1.5 w-1.5 rounded-full',
          active ? 'bg-[rgb(var(--state-listed))]' : 'bg-[rgb(var(--state-stale))]',
        ].join(' ')}
        aria-hidden="true"
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface OutletDetailViewProps {
  outletId: string;
  defaultEdit?: boolean;
}

export function OutletDetailView({ outletId, defaultEdit = false }: OutletDetailViewProps) {
  const t = useTranslations('staff.settings');
  const { outlets, deactivateOutlet, reactivateOutlet } = useSettingsStore();
  const { staffById } = useStaffStore();
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const [editOpen, setEditOpen] = useState(defaultEdit);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);

  // Find outlet — support both 'blr' and 'outlet-blr' forms
  const normalizedId = outletId.startsWith('outlet-') ? outletId : `outlet-${outletId}`;
  const outlet = outlets[normalizedId];

  const canEdit = user ? hasRank(user.role, 'R02') : false;
  const manager = outlet ? staffById[outlet.managerId] : undefined;

  if (!outlet) {
    return (
      <div className="p-6">
        <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]">
          <p className="text-sm text-ink-primary">{t('outlets.notFound')}</p>
        </div>
      </div>
    );
  }

  const handleDeactivate = () => {
    if (!user) return;
    try {
      deactivateOutlet(outlet.id, { id: user.id, role: user.role });
      toast(t('outlets.detail.deactivatedToast', { code: outlet.code }), 'success');
      setDeactivateOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('outlets.detail.deactivateFailed'), 'error');
    }
  };

  const handleReactivate = () => {
    if (!user) return;
    try {
      reactivateOutlet(outlet.id, { id: user.id, role: user.role });
      toast(t('outlets.detail.reactivatedToast', { code: outlet.code }), 'success');
      setReactivateOpen(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('outlets.detail.reactivateFailed'), 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-accent uppercase tracking-widest bg-bg-subtle px-2 py-0.5 rounded-md border border-line">
                {outlet.code}
              </span>
              <h1 className="text-xl font-semibold text-ink-primary">{outlet.name}</h1>
              <StatusChip active={outlet.active} />
            </div>
            <p className="text-sm text-ink-muted mt-1">{outlet.address.city}, {outlet.address.state}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('common.edit')}
                </button>

                {/* L9: Deactivate / Reactivate with type-to-confirm */}
                {outlet.active ? (
                  <button
                    type="button"
                    onClick={() => setDeactivateOpen(true)}
                    className="h-9 px-4 rounded-md text-sm font-medium border border-state-danger/40 text-state-danger hover:bg-state-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger"
                  >
                    {t('outlets.detail.deactivate')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReactivateOpen(true)}
                    className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t('outlets.detail.reactivate')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Detail cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identification */}
          <Card title={t('outlets.detail.sections.identification')}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* L10: code is read-only */}
              <Field label={t('outlets.edit.fields.code')} value={
                <span className="font-mono text-xs bg-bg-subtle px-2 py-0.5 rounded-md border border-line">{outlet.code}</span>
              } />
              <Field label={t('outlets.edit.fields.name')} value={outlet.name} />
              {/* L8: GSTIN is a business number — not personal PII */}
              <Field label={t('outlets.edit.fields.gstin')} value={
                <span className="font-mono text-xs">{outlet.gstin}</span>
              } />
              <Field label="Status" value={<StatusChip active={outlet.active} />} />
            </dl>
          </Card>

          {/* Address */}
          <Card title={t('outlets.detail.sections.address')}>
            <dl className="grid grid-cols-1 gap-y-4">
              <Field label={t('outlets.edit.fields.line1')} value={outlet.address.line1} />
              {outlet.address.line2 && (
                <Field label={t('outlets.edit.fields.line2')} value={outlet.address.line2} />
              )}
              <div className="grid grid-cols-3 gap-x-6">
                <Field label={t('outlets.edit.fields.city')} value={outlet.address.city} />
                <Field label={t('outlets.edit.fields.state')} value={outlet.address.state} />
                <Field label={t('outlets.edit.fields.pin')} value={
                  <span className="font-mono text-xs">{outlet.address.pin}</span>
                } />
              </div>
            </dl>
          </Card>

          {/* Contact — L8: office numbers only, no personal PII */}
          <Card title={t('outlets.detail.sections.contact')}>
            <p className="text-xs text-ink-muted mb-3">{t('outlets.edit.contactNote')}</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label={t('outlets.edit.fields.phone')} value={outlet.contactPhone} />
              <Field label={t('outlets.edit.fields.email')} value={outlet.contactEmail} />
            </dl>
          </Card>

          {/* Management — Seam 18: manager links to /staff/[id] */}
          <Card title={t('outlets.detail.sections.management')}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field
                label={t('outlets.edit.fields.manager')}
                value={
                  manager ? (
                    <Link href={`/staff/${outlet.managerId}`} className="text-accent hover:underline">
                      {manager.name}
                    </Link>
                  ) : outlet.managerId
                }
              />
              {manager && (
                <Field label="Role" value={
                  <span className="font-mono text-xs bg-bg-subtle px-2 py-0.5 rounded-md border border-line">
                    {manager.role} · {manager.roleName}
                  </span>
                } />
              )}
              <Field label={t('outlets.detail.fields.createdAt')} value={new Date(outlet.createdAt).toLocaleDateString('en-IN')} />
              <Field label={t('outlets.detail.fields.updatedAt')} value={new Date(outlet.updatedAt).toLocaleDateString('en-IN')} />
            </dl>
          </Card>
        </div>
      </div>

      {/* Edit dialog — R02+ only */}
      {canEdit && editOpen && (
        <EditOutletDialog
          outlet={outlet}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Deactivate confirmation — L9, L16 pattern */}
      <AlertDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        title={t('outlets.detail.deactivateDialog.title', { code: outlet.code })}
        description={t('outlets.detail.deactivateDialog.description', { code: outlet.code })}
        confirmLabel={t('outlets.detail.deactivateDialog.confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        requireTypeToConfirm="DEACTIVATE"
        onConfirm={handleDeactivate}
      />

      {/* Reactivate confirmation */}
      <AlertDialog
        open={reactivateOpen}
        onClose={() => setReactivateOpen(false)}
        title={t('outlets.detail.reactivateDialog.title', { code: outlet.code })}
        description={t('outlets.detail.reactivateDialog.description', { code: outlet.code })}
        confirmLabel={t('outlets.detail.reactivateDialog.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleReactivate}
      />
    </>
  );
}
