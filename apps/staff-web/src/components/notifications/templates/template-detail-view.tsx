/**
 * TemplateDetailView — full template record with DLT section, preview,
 * variable list, version chain, and send sparkline.
 * SPEC-NOTIFICATIONS-001 §6.3, L6, L16
 *
 * ≤240 LoC per spec §11
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Edit2 } from 'lucide-react';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import { Card, Field } from '../../custom-builds/shared/detail-card';
import { ChannelBadge } from '../shared/channel-badge';
import { ModuleBadge } from '../shared/module-badge';
import { TemplateStatusWorkflow } from './template-status-workflow';
import { TemplateVersionChain } from './template-version-chain';
import { TemplateSendSparkline } from './template-send-sparkline';
import { TemplateVariableBuilder } from './template-variable-builder';
import { useToast } from '../../../hooks/use-toast';
import { ToastContainer } from '../../primitives/toast';
import { Gate } from '../../primitives/gate';
import type { Actor, EditTemplateParams, NotificationTemplateVariable } from '@dms/types';

function formatAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: false,
    }).format(new Date(iso)).replace(',', '');
  } catch { return iso; }
}

/** Build 7-day send counts for a template, newest day last. */
function build7DayCounts(dispatches: Array<{ templateId: string; sentAt: string }>, templateId: string): number[] {
  const counts = Array(7).fill(0) as number[];
  const now = new Date();
  dispatches
    .filter((d) => d.templateId === templateId)
    .forEach((d) => {
      const diffDays = Math.floor(
        (now.getTime() - new Date(d.sentAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays >= 0 && diffDays < 7) {
        counts[6 - diffDays] = (counts[6 - diffDays] ?? 0) + 1;
      }
    });
  return counts;
}

interface TemplateDetailViewProps {
  templateId: string;
  actor: Actor;
}

export function TemplateDetailView({ templateId, actor }: TemplateDetailViewProps) {
  const templates = useNotificationsStore((s) => s.templates);
  const dispatches = useNotificationsStore((s) => s.dispatches);
  const editTemplate = useNotificationsStore((s) => s.editTemplate);
  const { toasts, toast, dismiss } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState('');
  const [editVars, setEditVars] = useState<NotificationTemplateVariable[]>([]);
  const [editSubject, setEditSubject] = useState('');

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);
  const sendCounts = useMemo(
    () => (template ? build7DayCounts(dispatches, template.id) : Array(7).fill(0) as number[]),
    [dispatches, template],
  );

  if (!template) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-ink-muted">Template not found.</p>
      </div>
    );
  }

  const canEdit = template.status === 'DRAFT' || template.status === 'REJECTED' || template.status === 'APPROVED';

  const startEdit = () => {
    setEditBody(template.bodyMarkdown);
    setEditVars([...template.variables]);
    setEditSubject(template.subject ?? '');
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  const saveEdit = () => {
    try {
      const patch: EditTemplateParams = {
        bodyMarkdown: editBody,
        variables: editVars,
        subject: template.channel === 'EMAIL' ? editSubject : undefined,
      };
      editTemplate(template.id, patch, actor);
      toast(
        template.status === 'APPROVED'
          ? 'New draft created from approved template (L6)'
          : 'Template updated',
        'success',
      );
      setEditMode(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <div className="space-y-4">
        {/* Header card */}
        <Card
          title={template.name}
          rightSlot={
            <div className="flex items-center gap-2 flex-wrap">
              <TemplateSendSparkline counts={sendCounts} />
              {canEdit && (
                <Gate permission="notifications:template:manage">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-line text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    disabled={editMode}
                  >
                    <Edit2 size={12} aria-hidden="true" />
                    Edit
                  </button>
                </Gate>
              )}
            </div>
          }
        >
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Field label="Channel" value={<ChannelBadge channel={template.channel} />} />
            <Field label="Module" value={<ModuleBadge module={template.module} />} />
            <Field label="Last updated" value={formatAt(template.lastUpdatedAt)} />
            <Field label="Updated by" value={template.lastUpdatedBy} />
          </dl>
          <TemplateStatusWorkflow template={template} actor={actor} />
        </Card>

        {/* DLT section */}
        {(template.channel === 'SMS' || template.channel === 'WHATSAPP') && (
          <Card title="DLT Registration (Doc 09 §DLT)">
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Field
                label="DLT Template ID"
                value={
                  template.dltTemplateId ? (
                    <span className="font-mono text-xs">{template.dltTemplateId}</span>
                  ) : (
                    <span className="text-[rgb(var(--state-overdue))] text-xs">Not yet registered</span>
                  )
                }
              />
              {template.rejectionReason && (
                <Field
                  label="Rejection Reason"
                  value={<span className="text-[rgb(var(--state-overdue))]">{template.rejectionReason}</span>}
                />
              )}
            </dl>
          </Card>
        )}

        {/* Body preview / edit */}
        <Card title={editMode ? 'Edit Body' : 'Body Preview'}>
          {editMode ? (
            <div className="space-y-4">
              {template.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              )}
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="h-8 px-3 rounded-md text-xs font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="h-8 px-3 rounded-md text-xs font-medium border border-line text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs text-ink-secondary bg-bg-subtle rounded-md p-3 overflow-x-auto">
              {template.subject && (
                <span className="block text-ink-muted mb-2">Subject: {template.subject}{'\n'}</span>
              )}
              {template.bodyMarkdown}
            </pre>
          )}
        </Card>

        {/* Variables — L11 */}
        <Card title="Variables (L11)">
          {editMode ? (
            <TemplateVariableBuilder variables={editVars} onChange={setEditVars} />
          ) : (
            <TemplateVariableBuilder variables={template.variables} onChange={() => {}} disabled />
          )}
        </Card>

        {/* Version chain — L6 */}
        <Card title="Version History (L6)">
          <TemplateVersionChain current={template} allTemplates={templates} />
          {template.supersedes && (
            <p className="text-xs text-ink-muted mt-2">
              Forked from{' '}
              <Link
                href={`/notifications/templates/${template.supersedes}`}
                className="text-accent hover:underline"
              >
                {template.supersedes}
              </Link>
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
