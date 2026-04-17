'use client';

import { useRef, useState, useMemo } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Upload,
  File,
} from 'lucide-react';
import { SlideInPanel, AlertDialog, ToastContainer } from '@/src/components/primitives';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { cn } from '@dms/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const ACCEPTED_TYPES =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
  return <FileText className="h-4 w-4" aria-hidden="true" />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AttachmentsPanelProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  jobNo: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttachmentsPanel({ open, onClose, jobCardId, jobNo }: AttachmentsPanelProps) {
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useStaffAuth();
  const allAttachments = useServiceStore((s) => s.attachments);
  const attachments = useMemo(
    () => allAttachments.filter((a) => a.jobCardId === jobCardId),
    [allAttachments, jobCardId],
  );
  const addAttachment = useServiceStore((s) => s.addAttachment);
  const deleteAttachment = useServiceStore((s) => s.deleteAttachment);
  const { toasts, toast, dismiss } = useToast();

  async function processFiles(files: FileList) {
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE_BYTES) {
        toast(`${file.name} exceeds 2 MB limit`, 'error');
        continue;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      addAttachment(
        jobCardId,
        { dataUrl, name: file.name, mimeType: file.type, size: file.size },
        actor,
      );
      toast(`${file.name} attached`, 'success');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      void processFiles(e.target.files);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      void processFiles(e.dataTransfer.files);
    }
  }

  function handleDeleteConfirm() {
    if (!deleteAttachmentId) return;
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    deleteAttachment(deleteAttachmentId, actor);
    toast('Attachment deleted', 'success');
    setDeleteAttachmentId(null);
  }

  function handleDownload(att: { dataUrl: string; name: string }) {
    const link = document.createElement('a');
    link.href = att.dataUrl;
    link.download = att.name;
    link.click();
  }

  return (
    <>
      <SlideInPanel
        open={open}
        onClose={onClose}
        title={`Attachments — ${jobNo}`}
        width="40%"
      >
        <div className="flex flex-col h-full p-4 space-y-4">
          {/* Upload zone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-ink-muted">
                {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white',
                  'text-[12px] font-medium hover:bg-accent-hover transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                )}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                Add document
              </button>
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-label="Drop zone for documents"
              className={cn(
                'border-2 border-dashed rounded-md p-5 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-accent bg-accent/5'
                  : 'border-line hover:border-accent/50 hover:bg-bg-subtle',
              )}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <File className="h-7 w-7 text-ink-muted mx-auto mb-2" aria-hidden="true" />
              <p className="text-[13px] text-ink-secondary">
                Drag & drop files here, or click to select
              </p>
              <p className="text-[11px] text-ink-muted mt-1">
                PDF, DOC, DOCX, images · Max 2 MB per file
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="sr-only"
              aria-hidden="true"
              onChange={handleFileChange}
            />
          </div>

          {/* Attachments list */}
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 rounded-md border border-line bg-bg-surface p-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-subtle text-ink-muted">
                    {getFileIcon(att.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink-primary truncate">{att.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {formatBytes(att.size)} · {formatDate(att.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Download ${att.name}`}
                      onClick={() => handleDownload(att)}
                      className={cn(
                        'inline-flex items-center justify-center h-7 w-7 rounded-md',
                        'text-ink-muted hover:text-ink-primary hover:bg-bg-hover transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                      )}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${att.name}`}
                      onClick={() => setDeleteAttachmentId(att.id)}
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
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted italic text-center py-4">
              No attachments yet. Add the first document.
            </p>
          )}
        </div>
      </SlideInPanel>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteAttachmentId !== null}
        onClose={() => setDeleteAttachmentId(null)}
        title="Delete attachment?"
        description="This file will be permanently removed from the job card."
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDeleteConfirm}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
