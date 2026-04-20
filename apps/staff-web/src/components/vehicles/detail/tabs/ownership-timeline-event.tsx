'use client';

import {
  UserPlus, UserMinus, ArrowRightLeft, FileText,
  CheckCircle, XCircle, RotateCcw, EyeOff, Download, Users, Clipboard,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { OwnershipEventKind } from '@dms/types';
import { STAFF_NAMES } from '@/src/components/parts/helpers';
import { useCustomersStore } from '@/src/lib/customers/customers-store';

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

// ─── Display helpers ──────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  BN_SALE: 'BN Sale',
  BN_CONSIGNMENT: 'BN Consignment',
  SERVICE_ONLY_WALKIN: 'Service Walk-in',
  LEGACY_IMPORT: 'Legacy Import',
};

const CLOSE_REASON_LABELS: Record<string, string> = {
  BN_SALE_TRANSFER: 'Sale transfer',
  CONSIGNED_TO_BN: 'Consigned to BN',
  CONSIGNMENT_RETURNED: 'Consignment returned',
  MANUAL_REVOKE: 'Manual revoke',
  SELF_REVOKE_SOLD: 'Sold privately',
  CLAIM_OVERLAP: 'Claim overlap',
  DECEASED_FORM31: 'Form 31 inheritance',
  ERASURE_REQUEST: 'Erasure request',
  REJECTED_CLAIM: 'Rejected claim',
};

function titleCaseSource(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}

function titleCaseCloseReason(s: string): string {
  return CLOSE_REASON_LABELS[s] ?? s;
}

function formatPayloadValue(key: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return null; // skip nested objects (noise)
  if (key === 'source' && typeof value === 'string') return titleCaseSource(value);
  if (key === 'closeReason' && typeof value === 'string') return titleCaseCloseReason(value);
  if (key === 'kmAtOpen' || key === 'kmAtClose') {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(num)) return `${num.toLocaleString('en-IN')} km`;
  }
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

const PAYLOAD_LABELS: Record<string, string> = {
  source: 'Source',
  closeReason: 'Reason',
  kmAtOpen: 'Km at open',
  kmAtClose: 'Km at close',
  linkedJobCardId: 'Job card',
  linkedSalesOrderId: 'Sales order',
  priorCloseReason: 'Prior reason',
};

// Internal-only keys we never surface to the UI
const HIDDEN_PAYLOAD_KEYS = new Set(['schemaVersion', 'meta']);

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OwnershipTimelineEvent({
  kind,
  actorId,
  at,
  payload,
  isLast = false,
}: OwnershipTimelineEventProps) {
  const customers = useCustomersStore((s) => s.customers);

  const config = EVENT_CONFIG[kind] ?? {
    icon: Clipboard,
    label: kind,
    color: 'text-ink-muted',
  };
  const Icon = config.icon;

  // Resolve actor display name from staff or customer directories. If neither
  // matches, fall back to a friendly "BN Automobiles" rather than the raw id.
  const actorName = resolveActorName(actorId, customers);

  const payloadLines = payload
    ? Object.entries(payload)
        .filter(([k]) => !HIDDEN_PAYLOAD_KEYS.has(k))
        .map(([k, v]) => {
          const formatted = formatPayloadValue(k, v);
          if (formatted === null) return null;
          const label = PAYLOAD_LABELS[k] ?? k;
          return { label, value: formatted };
        })
        .filter((entry): entry is { label: string; value: string } => entry !== null)
    : [];

  return (
    <div className="flex gap-3">
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

      <div className="pb-4 flex-1 min-w-0">
        <p className="text-sm text-ink-primary font-medium">{config.label}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {formatDateTime(at)} · {actorName}
        </p>
        {payloadLines.length > 0 && (
          <p className="text-xs text-ink-secondary mt-1">
            {payloadLines
              .map((p) => `${p.label}: ${p.value}`)
              .join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Actor name resolution ────────────────────────────────────────────────────

function resolveActorName(
  actorId: string,
  customersMap: Record<string, { name: string }>,
): string {
  if (STAFF_NAMES[actorId]) return STAFF_NAMES[actorId]!;
  if (actorId.startsWith('cust-')) {
    return customersMap[actorId]?.name ?? 'Customer';
  }
  // Legacy / system / unknown sources — present as the dealership itself.
  return 'BN Automobiles';
}
