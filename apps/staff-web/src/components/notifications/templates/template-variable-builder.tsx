/**
 * TemplateVariableBuilder — add / remove variable rows for a template.
 * SPEC-NOTIFICATIONS-001 §6.4, L11
 *
 * Emits onChange with the full updated array.
 * ≤120 LoC per spec §11
 */

'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { NotificationTemplateVariable } from '@dms/types';

interface TemplateVariableBuilderProps {
  variables: NotificationTemplateVariable[];
  onChange: (vars: NotificationTemplateVariable[]) => void;
  disabled?: boolean;
}

const INPUT_CLASS =
  'h-8 bg-bg-subtle border border-line rounded-md px-2 text-xs text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

export function TemplateVariableBuilder({
  variables,
  onChange,
  disabled = false,
}: TemplateVariableBuilderProps) {
  const updateVar = (
    index: number,
    field: keyof NotificationTemplateVariable,
    value: string | boolean,
  ) => {
    const updated = variables.map((v, i) => (i === index ? { ...v, [field]: value } : v));
    onChange(updated);
  };

  const addVar = () => {
    onChange([...variables, { name: '', type: 'string' as const, required: true }]);
  };

  const removeVar = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* Header row */}
      {variables.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-1">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider">Name</span>
          <span className="text-[10px] text-ink-muted uppercase tracking-wider">Example</span>
          <span className="text-[10px] text-ink-muted uppercase tracking-wider">Required</span>
          <span className="sr-only">Remove</span>
        </div>
      )}

      {variables.map((v, idx) => (
        <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
          <input
            type="text"
            value={v.name}
            onChange={(e) => updateVar(idx, 'name', e.target.value)}
            placeholder="e.g. customer_name"
            className={`${INPUT_CLASS} font-mono`}
            disabled={disabled}
            aria-label={`Variable ${idx + 1} name`}
          />
          <input
            type="text"
            value={v.example ?? ''}
            onChange={(e) => updateVar(idx, 'example', e.target.value)}
            placeholder="Example value"
            className={INPUT_CLASS}
            disabled={disabled}
            aria-label={`Variable ${idx + 1} example`}
          />
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={v.required}
              onChange={(e) => updateVar(idx, 'required', e.target.checked)}
              disabled={disabled}
              className="rounded border-line accent-accent"
              aria-label={`Variable ${idx + 1} required`}
            />
            <span className="text-xs text-ink-muted">Req</span>
          </label>
          <button
            type="button"
            onClick={() => removeVar(idx)}
            disabled={disabled}
            className="h-8 w-8 flex items-center justify-center rounded-md text-ink-muted hover:text-[rgb(var(--state-overdue))] hover:bg-bg-hover transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Remove variable ${v.name || idx + 1}`}
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={addVar}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs text-ink-secondary border border-dashed border-line hover:border-accent hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus size={12} aria-hidden="true" />
          Add variable
        </button>
      )}

      {variables.length === 0 && disabled && (
        <p className="text-xs text-ink-muted py-2">No variables defined.</p>
      )}
    </div>
  );
}
