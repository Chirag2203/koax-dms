'use client';

import { useState } from 'react';
import { Pin, Trash2, Plus } from 'lucide-react';
import { SlideInPanel, AlertDialog, ToastContainer } from '@/src/components/primitives';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { AddNoteDialog } from '../action-flows/add-note-dialog';
import { cn } from '@dms/ui';

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
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2);
}

const AUTHOR_MAP: Record<string, string> = {
  'staff-r09-001': 'Priya Sharma',
  'staff-r09-002': 'Rajesh Kumar',
  'staff-r09-003': 'Deepa Nair',
  'staff-r12-001': 'Vikram Singh',
  'staff-r19-001': 'Sunita Reddy',
  'staff-r24-001': 'Meera Iyer',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  jobNo: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotesPanel({ open, onClose, jobCardId, jobNo }: NotesPanelProps) {
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const { user } = useStaffAuth();
  const advisorNotes = useServiceStore((s) => s.advisorNotes);
  const toggleNotePin = useServiceStore((s) => s.toggleNotePin);
  const deleteNote = useServiceStore((s) => s.deleteNote);
  const { toasts, toast, dismiss } = useToast();

  const notes = advisorNotes
    .filter((n) => n.jobCardId === jobCardId)
    .sort((a, b) => {
      // Pinned first, then desc by time
      const ap = a.pinned ?? false;
      const bp = b.pinned ?? false;
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });

  function handleTogglePin(noteId: string, currentPinned: boolean | undefined) {
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    toggleNotePin(noteId, actor);
    toast(currentPinned ? 'Note unpinned' : 'Note pinned', 'success');
  }

  function handleDeleteConfirm() {
    if (!deleteNoteId) return;
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    deleteNote(deleteNoteId, actor);
    toast('Note deleted', 'success');
    setDeleteNoteId(null);
  }

  return (
    <>
      <SlideInPanel
        open={open}
        onClose={onClose}
        title={`Notes — ${jobNo}`}
        width="40%"
      >
        <div className="flex flex-col h-full">
          {/* Header row */}
          <div className="px-5 py-3 border-b border-line flex items-center justify-between">
            <span className="text-[13px] text-ink-secondary">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setAddNoteOpen(true)}
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white',
                'text-[12px] font-medium hover:bg-accent-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add note
            </button>
          </div>

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notes.length === 0 && (
              <p className="text-[13px] text-ink-muted italic text-center py-8">
                No notes yet. Add the first one.
              </p>
            )}

            {notes.map((note) => {
              const authorName = AUTHOR_MAP[note.authorId] ?? note.authorId;
              return (
                <div
                  key={note.id}
                  className={cn(
                    'rounded-md border p-3',
                    !!note.pinned
                      ? 'border-accent/30 bg-accent/5'
                      : 'border-line bg-bg-surface',
                  )}
                >
                  {/* Note header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
                        {getInitials(authorName)}
                      </div>
                      <div>
                        <span className="text-[12px] font-medium text-ink-primary">{authorName}</span>
                        <span className="font-mono text-[11px] text-ink-muted ml-2">
                          {formatRelative(note.at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
                        onClick={() => handleTogglePin(note.id, note.pinned ?? false)}
                        className={cn(
                          'inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                          !!note.pinned
                            ? 'text-accent hover:text-accent/70'
                            : 'text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
                        )}
                      >
                        <Pin className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete note"
                        onClick={() => setDeleteNoteId(note.id)}
                        className={cn(
                          'inline-flex items-center justify-center h-7 w-7 rounded-md',
                          'text-ink-muted hover:text-state-danger hover:bg-state-danger/5 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-state-danger',
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Note body */}
                  <p className="text-[13px] text-ink-secondary whitespace-pre-line leading-relaxed">
                    {note.text}
                  </p>

                  {!!note.pinned && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest bg-accent/10 text-accent px-1.5 py-0.5 rounded">
                        <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                        Pinned
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SlideInPanel>

      {/* Add Note dialog — renders outside SlideInPanel to avoid z-index issues */}
      <AddNoteDialog
        open={addNoteOpen}
        onClose={() => setAddNoteOpen(false)}
        jobCardId={jobCardId}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        title="Delete note?"
        description="This note will be permanently removed from the job card."
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDeleteConfirm}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
