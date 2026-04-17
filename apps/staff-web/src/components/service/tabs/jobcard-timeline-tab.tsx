'use client';

import { useState } from 'react';
import { useServiceStore } from '@/src/lib/service/service-store';
import {
  Circle,
  ClipboardList,
  Wrench,
  Package,
  CheckCircle,
  MessageSquare,
  Camera,
  ArrowRightLeft,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { JobCardTimelineEvent, JobCardTimelineEventType } from '@dms/types';

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES = {
  loading: 'Loading timeline...',
  error: 'Failed to load timeline.',
  empty: 'No timeline events yet.',
  filterAll: 'All',
  filterStatus: 'Status Changes',
  filterNotes: 'Notes',
  filterPhotos: 'Photos',
  filterLabour: 'Labour',
  filterParts: 'Parts',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} · ${hour}:${min}`;
}

// ─── Event type config ────────────────────────────────────────────────────────

type FilterType = 'all' | 'status' | 'notes' | 'photos' | 'labour' | 'parts';

const EVENT_FILTER_MAP: Record<JobCardTimelineEventType, FilterType> = {
  received: 'status',
  diagnosed: 'status',
  estimate_approved: 'status',
  labour_started: 'labour',
  labour_complete: 'labour',
  part_reserved: 'parts',
  part_fitted: 'parts',
  inspection_complete: 'status',
  qc_passed: 'status',
  ready_for_delivery: 'status',
  delivered: 'status',
  note: 'notes',
  photo_uploaded: 'photos',
  status_changed: 'status',
  cancelled: 'status',
  reopened: 'status',
  advisor_reassigned: 'status',
  bay_changed: 'status',
  bay_assigned: 'status',
  bay_freed: 'status',
  appointment_checkin: 'status',
  cloned: 'status',
};

const EVENT_LABEL: Record<JobCardTimelineEventType, string> = {
  received: 'Job Card Received',
  diagnosed: 'Vehicle Diagnosed',
  estimate_approved: 'Estimate Approved',
  labour_started: 'Labour Started',
  labour_complete: 'Labour Completed',
  part_reserved: 'Part Reserved',
  part_fitted: 'Part Fitted',
  inspection_complete: 'Inspection Complete',
  qc_passed: 'QC Passed',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Vehicle Delivered',
  note: 'Note Added',
  photo_uploaded: 'Photo Uploaded',
  status_changed: 'Status Changed',
  cancelled: 'Job Card Cancelled',
  reopened: 'Reopened for Rework',
  advisor_reassigned: 'Advisor Reassigned',
  bay_changed: 'Bay Changed',
  bay_assigned: 'Bay Assigned',
  bay_freed: 'Bay Freed',
  appointment_checkin: 'Appointment Check-In',
  cloned: 'Job Card Cloned',
};

function EventIcon({ type }: { type: JobCardTimelineEventType }) {
  const cls = 'h-3.5 w-3.5';
  switch (type) {
    case 'received':
    case 'status_changed':
      return <ArrowRightLeft className={cls} aria-hidden="true" />;
    case 'diagnosed':
    case 'inspection_complete':
      return <ClipboardList className={cls} aria-hidden="true" />;
    case 'labour_started':
      return <Wrench className={cls} aria-hidden="true" />;
    case 'part_reserved':
    case 'part_fitted':
      return <Package className={cls} aria-hidden="true" />;
    case 'qc_passed':
    case 'estimate_approved':
      return <ThumbsUp className={cls} aria-hidden="true" />;
    case 'ready_for_delivery':
    case 'delivered':
      return <CheckCircle className={cls} aria-hidden="true" />;
    case 'note':
      return <MessageSquare className={cls} aria-hidden="true" />;
    case 'photo_uploaded':
      return <Camera className={cls} aria-hidden="true" />;
    default:
      return <Circle className={cls} aria-hidden="true" />;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobCardTimelineTabProps {
  jobCardId: string;
}

// ─── Filter pills ─────────────────────────────────────────────────────────────

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: MESSAGES.filterAll },
  { id: 'status', label: MESSAGES.filterStatus },
  { id: 'notes', label: MESSAGES.filterNotes },
  { id: 'photos', label: MESSAGES.filterPhotos },
  { id: 'labour', label: MESSAGES.filterLabour },
  { id: 'parts', label: MESSAGES.filterParts },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function JobCardTimelineTab({ jobCardId }: JobCardTimelineTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const allTimelineEvents = useServiceStore((s) => s.timelineEvents);
  const jobCardEvents = allTimelineEvents.filter((e) => e.jobCardId === jobCardId);

  const allEvents = [...jobCardEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  const filtered =
    activeFilter === 'all'
      ? allEvents
      : allEvents.filter((e) => EVENT_FILTER_MAP[e.type] === activeFilter);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              'inline-flex items-center h-8 px-3 rounded-full text-[12px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              activeFilter === f.id
                ? 'bg-accent text-white'
                : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="rounded-md border border-line bg-bg-surface p-4">
        {filtered.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-ink-muted">
            {MESSAGES.empty}
          </div>
        ) : (
          <div className="relative pl-10">
            {/* Vertical connector line */}
            <div
              className="absolute left-[15px] top-4 bottom-4 w-px bg-line"
              aria-hidden="true"
            />

            <div className="space-y-5">
              {filtered.map((event, idx) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  {/* Icon bubble */}
                  <div
                    className="absolute -left-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-surface border border-line text-ink-muted"
                    aria-hidden="true"
                  >
                    <EventIcon type={event.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 rounded-md border border-line bg-bg-canvas px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-ink-primary">
                          {EVENT_LABEL[event.type] ?? event.type}
                        </p>
                        <p className="text-[12px] text-ink-muted">{event.actorName}</p>
                        {event.description && (
                          <p className="mt-1 text-[13px] text-ink-secondary">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-mono text-[11px] text-ink-muted whitespace-nowrap">
                          {formatRelative(event.at)}
                        </span>
                        <br />
                        <span className="font-mono text-[10px] text-ink-muted whitespace-nowrap">
                          {formatDate(event.at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
