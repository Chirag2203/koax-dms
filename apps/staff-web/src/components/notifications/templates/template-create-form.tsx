/**
 * TemplateCreateForm — new template wizard.
 * SPEC-NOTIFICATIONS-001 §6.4
 *
 * Creates a DRAFT template. Channel, module, name, subject (email only),
 * body markdown, and variable builder.
 *
 * ≤200 LoC per spec §11
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  NotificationChannel,
  NotificationModule,
  NotificationTemplateVariable,
  Actor,
} from '@dms/types';
import { useNotificationsStore } from '../../../lib/notifications/notifications-store';
import { TemplateVariableBuilder } from './template-variable-builder';
import { useToast } from '../../../hooks/use-toast';
import { ToastContainer } from '../../primitives/toast';

const CHANNELS: Array<{ value: NotificationChannel; label: string }> = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
];

const MODULES: Array<{ value: NotificationModule; label: string }> = [
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'SERVICE_BOOKING', label: 'Service Booking' },
  { value: 'CUSTOM_BUILDS', label: 'Custom Builds' },
  { value: 'CUSTOMERS', label: 'Customers' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SALES', label: 'Sales' },
];

const LABEL_CLASS = 'block text-xs text-ink-muted uppercase tracking-wider mb-1.5';
const INPUT_CLASS =
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';
const SELECT_CLASS =
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

interface TemplateCreateFormProps {
  actor: Actor;
}

export function TemplateCreateForm({ actor }: TemplateCreateFormProps) {
  const router = useRouter();
  const createTemplate = useNotificationsStore((s) => s.createTemplate);
  const { toasts, toast, dismiss } = useToast();

  const [channel, setChannel] = useState<NotificationChannel>('WHATSAPP');
  const [module, setModule] = useState<NotificationModule>('CUSTOMERS');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState<NotificationTemplateVariable[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Template name is required';
    if (!body.trim()) errs.body = 'Template body is required';
    if (channel === 'EMAIL' && !subject.trim()) errs.subject = 'Subject required for Email templates';
    const varNames = variables.map((v) => v.name.trim()).filter(Boolean);
    if (new Set(varNames).size !== varNames.length) errs.variables = 'Variable names must be unique';
    if (variables.some((v) => !v.name.trim())) errs.variables = 'All variables must have a name';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const template = createTemplate({
        channel,
        module,
        name: name.trim(),
        subject: channel === 'EMAIL' ? subject.trim() : undefined,
        bodyMarkdown: body.trim(),
        variables,
        createdBy: actor.id,
      });
      toast('Template created as Draft', 'success');
      router.push(`/notifications/templates/${template.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create template', 'error');
    }
  };

  const handleCancel = () => {
    router.push('/notifications/templates');
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl" noValidate>
        {/* Channel + Module */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tmpl-channel" className={LABEL_CLASS}>
              Channel <span className="text-state-danger">*</span>
            </label>
            <select
              id="tmpl-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as NotificationChannel)}
              className={SELECT_CLASS}
              aria-required="true"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tmpl-module" className={LABEL_CLASS}>
              Module <span className="text-state-danger">*</span>
            </label>
            <select
              id="tmpl-module"
              value={module}
              onChange={(e) => setModule(e.target.value as NotificationModule)}
              className={SELECT_CLASS}
              aria-required="true"
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Template name */}
        <div>
          <label htmlFor="tmpl-name" className={LABEL_CLASS}>
            Template Name <span className="text-state-danger">*</span>
          </label>
          <input
            id="tmpl-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: '' })); }}
            placeholder="e.g. Service Booking Confirmed"
            className={`${INPUT_CLASS} ${errors.name ? 'border-state-danger' : ''}`}
            aria-required="true"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'tmpl-name-error' : undefined}
          />
          {errors.name && (
            <p id="tmpl-name-error" className="text-xs text-state-danger mt-1">{errors.name}</p>
          )}
        </div>

        {/* Subject — email only */}
        {channel === 'EMAIL' && (
          <div>
            <label htmlFor="tmpl-subject" className={LABEL_CLASS}>
              Subject <span className="text-state-danger">*</span>
            </label>
            <input
              id="tmpl-subject"
              type="text"
              value={subject}
              onChange={(e) => { setSubject(e.target.value); setErrors((p) => ({ ...p, subject: '' })); }}
              placeholder="Email subject line"
              className={`${INPUT_CLASS} ${errors.subject ? 'border-state-danger' : ''}`}
              aria-required="true"
            />
            {errors.subject && (
              <p className="text-xs text-state-danger mt-1">{errors.subject}</p>
            )}
          </div>
        )}

        {/* Body */}
        <div>
          <label htmlFor="tmpl-body" className={LABEL_CLASS}>
            Body <span className="text-state-danger">*</span>
          </label>
          <textarea
            id="tmpl-body"
            value={body}
            onChange={(e) => { setBody(e.target.value); setErrors((p) => ({ ...p, body: '' })); }}
            rows={6}
            placeholder="Template body. Use {{variable_name}} for dynamic values."
            className={`w-full rounded-md border bg-bg-subtle px-3 py-2 text-sm text-ink-primary font-mono placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none ${errors.body ? 'border-state-danger' : 'border-line'}`}
            aria-required="true"
          />
          {errors.body && (
            <p className="text-xs text-state-danger mt-1">{errors.body}</p>
          )}
        </div>

        {/* Variables — L11 */}
        <div>
          <p className={LABEL_CLASS}>Variables (L11)</p>
          <TemplateVariableBuilder variables={variables} onChange={setVariables} />
          {errors.variables && (
            <p className="text-xs text-state-danger mt-1">{errors.variables}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-2 border-t border-line">
          <button
            type="button"
            onClick={handleCancel}
            className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Create Draft
          </button>
        </div>
      </form>
    </>
  );
}
