'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, FileText, ChevronRight } from 'lucide-react';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';
import type { OwnershipChangeEvent } from '@dms/types';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(iso));
}

function eventLabel(kind: OwnershipChangeEvent['kind']): string {
  const labels: Partial<Record<OwnershipChangeEvent['kind'], string>> = {
    OPEN: 'Ownership opened',
    CLOSE: 'Ownership closed',
    TRANSFER: 'Ownership transferred',
    RESTORE: 'Ownership restored',
    CLAIM_SUBMIT: 'Claim submitted',
    CLAIM_APPROVE: 'Claim approved',
    CLAIM_REJECT: 'Claim rejected',
    ANONYMIZE: 'Record anonymized',
    PDF_EXPORT: 'Service history exported',
    JOINT_ADD: 'Joint owner added',
    FORM31_APPROVE: 'Form 31 transfer approved',
  };
  return labels[kind] ?? (kind as string);
}

interface TimelineEvent {
  at: string;
  label: string;
  isOwnerTenure: boolean;
  kind?: OwnershipChangeEvent['kind'];
}

interface TimelineTabProps {
  vehicle: OwnedVehicleView;
  events: OwnershipChangeEvent[];
}

export function TimelineTab({ vehicle, events }: TimelineTabProps) {
  const t = useTranslations('portal.vehicles');
  const ownershipFromMs = new Date(vehicle.fromAt).getTime();

  // Build timeline events
  const timelineEvents: TimelineEvent[] = events
    .filter((e) => {
      // Only show own-tenure or status-level pre-tenure
      return true;
    })
    .map((e) => {
      const isOwner = new Date(e.at).getTime() >= ownershipFromMs;
      return {
        at: e.at,
        label: isOwner ? eventLabel(e.kind) : `Service performed ${formatMonthYear(e.at)}`,
        isOwnerTenure: isOwner,
        kind: isOwner ? e.kind : undefined,
      };
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 20);

  if (timelineEvents.length === 0) {
    return (
      <p className="font-display text-lg italic text-ink-secondary py-8">
        {t('noTimeline')}
      </p>
    );
  }

  return (
    <ol className="relative border-l border-line ml-3 space-y-0">
      {timelineEvents.map((event, i) => (
        <li key={i} className="ml-5 py-4">
          {/* Dot */}
          <span className="absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full border border-line bg-bg-paper">
            {event.isOwnerTenure ? (
              <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
            ) : (
              <Clock className="w-3 h-3 text-ink-muted" aria-hidden="true" />
            )}
          </span>

          <div>
            <p
              className={`text-sm ${event.isOwnerTenure ? 'text-ink-primary' : 'text-ink-muted italic'}`}
            >
              {event.label}
            </p>
            <time
              dateTime={event.at}
              className="font-mono text-[10px] text-ink-muted"
            >
              {event.isOwnerTenure ? formatDate(event.at) : formatMonthYear(event.at)}
            </time>
          </div>
        </li>
      ))}
    </ol>
  );
}
