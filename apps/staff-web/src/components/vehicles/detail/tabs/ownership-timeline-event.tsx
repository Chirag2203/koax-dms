'use client';

import {
  UserPlus, UserMinus, ArrowRightLeft, FileText,
  CheckCircle, XCircle, RotateCcw, EyeOff, Download, Users, Clipboard,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { OwnershipEventKind } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnershipTimelineEventProps {
  kind: OwnershipEventKind;
  actorId: string;
  at: string;
  payload?: Record<string, unknown>;
  isLast?: boolean;
}

// ─── Event config ─────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<
  OwnershipEventKind,
  { icon: React.ElementType; label: string; color: string }
> = {
  OPEN: { icon: UserPlus, label: 'Ownership opened', color: 'text-[rgb(var(--state-listed))]' },
  CLOSE: { icon: UserMinus, label: 'Ownership closed', color: 'text-[rgb(var(--state-stale))]' },
  TRANSFER: { icon: ArrowRightLeft, label: 'Ownership transferred', color: 'text-[rgb(var(--state-sold))]' },
  CLAIM_SUBMIT: { icon: FileText, label: 'Claim submitted', color: 'text-[rgb(var(--state-pending))]' },
  CLAIM_APPROVE: { icon: CheckCircle, label: 'Claim approved', color: 'text-[rgb(var(--state-listed))]' },
  CLAIM_REJECT: { icon: XCircle, label: 'Claim rejected', color: 'text-[rgb(var(--state-overdue))]' },
  RESTORE: { icon: RotateCcw, label: 'Ownership restored', color: 'text-[rgb(var(--state-in-refurb))]' },
  ANONYMIZE: { icon: EyeOff, label: 'PII anonymized', color: 'text-[rgb(var(--state-stale))]' },
  PDF_EXPORT: { icon: Download, label: 'PDF exported', color: 'text-[rgb(var(--state-draft))]' },
  JOINT_ADD: { icon: Users, label: 'Joint owner added', color: 'text-[rgb(var(--state-listed))]' },
  FORM31_APPROVE: { icon: Clipboard, label: 'Form 31 approved', color: 'text-[rgb(var(--state-reserved))]' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipTimelineEvent({
  kind,
  actorId,
  at,
  payload,
  isLast = false,
}: OwnershipTimelineEventProps) {
  const config = EVENT_CONFIG[kind] ?? {
    icon: Clipboard,
    label: kind,
    color: 'text-ink-muted',
  };
  const Icon = config.icon;

  const formattedAt = new Date(at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex gap-3">
      {/* Dot + connector */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          'bg-bg-subtle border border-line',
          config.color,
        )}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-line mt-1 mb-0" style={{ minHeight: 16 }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <p className="text-sm text-ink-primary font-medium">{config.label}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {formattedAt} · <span className="font-mono">{actorId}</span>
        </p>
        {payload && Object.keys(payload).length > 0 && (
          <p className="text-xs text-ink-secondary mt-1">
            {Object.entries(payload)
              .filter(([k]) => k !== 'schemaVersion')
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
