/**
 * Activity tab — chronological timeline of state transitions + manual notes.
 *
 * CRUD: add note (R09+), shown at top as textarea+submit.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 6, P1.1 L22
 */

'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import type { BuildJob, BuildActivityEvent } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useToast } from '@/src/hooks/use-toast';
import { Card } from '../../shared/detail-card';

interface ActivityTabProps {
  job: BuildJob;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  job_created: 'Job created',
  stage_advanced: 'Stage advanced',
  quote_saved: 'Quote saved',
  finance_approved: 'Finance approved',
  qc_failed: 'QC failed — sent for rework',
  vendor_confirmed: 'Vendor confirmed',
  note_added: 'Note added',
  job_cancelled: 'Job cancelled',
  job_delivered: 'Job delivered',
};

function ActivityEntry({ event }: { event: BuildActivityEvent }) {
  const label = EVENT_TYPE_LABELS[event.type] ?? event.type;
  const stageChange = event.metadata as { from?: string; to?: string } | undefined;

  return (
    <div className="flex gap-3 pb-4 border-b border-line last:border-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
        <div className="w-px flex-1 bg-line mt-1" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink-primary">{label}</span>
          <span className="text-xs font-mono text-ink-muted tabular-nums">
            {new Date(event.at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>

        {stageChange?.from && stageChange?.to && (
          <p className="text-xs font-mono text-ink-muted mt-0.5">
            {stageChange.from} → {stageChange.to}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center font-mono text-xs font-semibold text-accent uppercase leading-none"
            aria-hidden="true"
          >
            {event.actorName.slice(0, 2)}
          </span>
          <span className="text-xs text-ink-secondary">{event.actorName}</span>
          <span className="font-mono text-xs text-ink-muted">{event.actorRole}</span>
        </div>

        {event.note && (
          <p className="mt-1.5 text-xs text-ink-secondary bg-bg-subtle rounded px-3 py-2">
            {event.note}
          </p>
        )}
      </div>
    </div>
  );
}

export function ActivityTab({ job }: ActivityTabProps) {
  const { user } = useStaffAuth();
  const addActivityNote = useCustomBuildsStore((s) => s.addActivityNote);
  const { toasts, toast, dismiss } = useToast();
  const [noteText, setNoteText] = useState('');

  const role = user?.role ?? 'R05';
  const canAddNote = hasRank(role, 'R09');
  const actor = user ? { id: user.id, name: user.name, role: user.role } : null;

  const sorted = [...job.activityLog].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  const handleAddNote = () => {
    if (!actor || !noteText.trim()) return;
    try {
      addActivityNote(job.id, noteText.trim(), actor);
      setNoteText('');
      toast('Note added', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to add note', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Add note input */}
      {canAddNote && (
        <div className="flex gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
            placeholder="Add a note..."
            className="flex-1 h-9 px-3 rounded-md bg-bg-subtle border border-line text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            aria-label="New activity note"
          />
          <button
            type="button"
            onClick={handleAddNote}
            disabled={!noteText.trim()}
            className="flex items-center gap-1.5 h-9 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Submit note"
          >
            <Send size={13} aria-hidden="true" />
            Add Note
          </button>
        </div>
      )}

      <Card title="Activity Log">
        {sorted.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-ink-muted">No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {sorted.map((event) => (
              <ActivityEntry key={event.id} event={event} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
