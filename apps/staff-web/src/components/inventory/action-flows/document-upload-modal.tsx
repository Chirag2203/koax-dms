'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, X, FileText } from 'lucide-react';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  vin: string;
  onSave: (data: {
    file: File;
    type: string;
    name: string;
    issueDate?: string;
    expiryDate?: string;
    notes?: string;
  }) => Promise<void>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPE_OPTIONS = [
  { value: 'rc', label: 'RC (Registration Certificate)' },
  { value: 'insurance', label: 'Insurance Policy' },
  { value: 'appraisal', label: 'Appraisal Report' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'invoice', label: 'Purchase Invoice' },
  { value: 'form-29-30', label: 'Form 29/30' },
  { value: 'puc', label: 'PUC Certificate' },
  { value: 'loan-noc', label: 'Loan NOC' },
  { value: 'service-record', label: 'Service Record' },
  { value: 'other', label: 'Other' },
];

// Types requiring date fields
const DATE_REQUIRED_TYPES = ['insurance', 'puc'];

// File validation rules per type
function getFileRules(type: string): { accept: string[]; maxMB: number } {
  if (type === 'rc') return { accept: ['application/pdf'], maxMB: 5 };
  if (type === 'insurance') return { accept: ['application/pdf', 'image/jpeg', 'image/png'], maxMB: 5 };
  return { accept: ['application/pdf', 'image/jpeg', 'image/png'], maxMB: 10 };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  type: z.string().min(1, 'Document type required'),
  name: z.string().min(1, 'Document name required').max(120),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Input class ──────────────────────────────────────────────────────────────

const inputClass =
  'h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30';

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentUploadModal({
  open,
  onClose,
  vin: _vin,
  onSave,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: '', name: '', issueDate: '', expiryDate: '', notes: '' },
  });

  const docType = watch('type');
  const showDates = DATE_REQUIRED_TYPES.includes(docType);

  useEffect(() => {
    if (open) {
      reset({ type: '', name: '', issueDate: '', expiryDate: '', notes: '' });
      setFile(null);
      setFileError(null);
      setUploadProgress(null);
    }
  }, [open, reset]);

  function handleFileSelect(selectedFile: File) {
    const rules = getFileRules(docType || 'other');
    const maxBytes = rules.maxMB * 1024 * 1024;

    if (!rules.accept.includes(selectedFile.type)) {
      setFileError(
        `File type not allowed for this document type. Accepted: ${rules.accept.map((a) => a.split('/')[1]).join(', ')}.`,
      );
      setFile(null);
      return;
    }
    if (selectedFile.size > maxBytes) {
      setFileError(`File too large (${formatBytes(selectedFile.size)}). Max ${rules.maxMB} MB.`);
      setFile(null);
      return;
    }

    setFileError(null);
    setFile(selectedFile);

    // Auto-fill name from filename (strip extension)
    const nameWithoutExt = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    setValue('name', nameWithoutExt, { shouldDirty: true });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFileSelect(selected);
    e.target.value = '';
  }

  async function onSubmit(data: FormValues) {
    if (!file) return;

    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return null;
        const next = Math.min(95, prev + Math.floor(Math.random() * 20) + 10);
        return next;
      });
    }, 120);

    try {
      await onSave({
        file,
        type: data.type,
        name: data.name,
        issueDate: showDates && data.issueDate ? data.issueDate : undefined,
        expiryDate: showDates && data.expiryDate ? data.expiryDate : undefined,
        notes: data.notes || undefined,
      });
      setUploadProgress(100);
      clearInterval(interval);
      onClose();
    } catch {
      clearInterval(interval);
      setUploadProgress(null);
    }
  }

  const isUploading = uploadProgress !== null && uploadProgress < 100;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload document"
      size="sm"
      dirty={isDirty || Boolean(file)}
      footer={
        <div className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || isUploading}
            onClick={handleSubmit(onSubmit)}
            className={cn(
              'h-9 flex-1 rounded-md text-sm font-semibold text-white relative overflow-hidden',
              'bg-accent hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {/* Progress overlay */}
            {isUploading && (
              <span
                className="absolute inset-0 bg-white/20 transition-all"
                style={{ width: `${uploadProgress}%` }}
                aria-hidden="true"
              />
            )}
            <span className="relative">
              {isUploading ? `Uploading ${uploadProgress}%` : 'Upload'}
            </span>
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* File dropzone */}
        <div className="space-y-1.5">
          <span className="block text-[13px] font-medium text-ink-secondary">
            File <span className="text-state-danger">*</span>
          </span>

          {file ? (
            // File selected — show row
            <div className="flex items-center gap-3 rounded-md border border-line bg-bg-subtle px-3 py-2.5">
              <FileText className="h-5 w-5 shrink-0 text-ink-muted" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] text-ink-primary">{file.name}</p>
                <p className="text-[11px] text-ink-muted">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setValue('name', ''); }}
                aria-label="Remove file"
                className="shrink-0 rounded p-1 text-ink-muted hover:text-ink-primary hover:bg-bg-canvas transition-colors"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            // Dropzone
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop file here or click to browse"
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={() => setIsDraggingOver(false)}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') ? inputRef.current?.click() : undefined}
              className={cn(
                'flex h-32 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed',
                'cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isDraggingOver
                  ? 'border-accent bg-accent/5'
                  : fileError
                    ? 'border-state-danger bg-state-danger/5'
                    : 'border-line hover:border-accent/50 hover:bg-bg-subtle',
              )}
            >
              <Upload className="h-6 w-6 text-ink-muted" aria-hidden="true" />
              <p className="text-[13px] text-ink-primary">Drop file or click to browse</p>
            </div>
          )}

          {fileError && (
            <p className="text-[12px] text-state-danger">{fileError}</p>
          )}
        </div>

        {/* Document type */}
        <div className="space-y-1.5">
          <label htmlFor="doc-type" className="block text-[13px] font-medium text-ink-secondary">
            Document Type <span className="text-state-danger">*</span>
          </label>
          <select
            id="doc-type"
            className={cn(inputClass, errors.type && 'border-state-danger')}
            {...register('type')}
          >
            <option value="">Select type…</option>
            {DOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.type && <p className="text-[12px] text-state-danger">{errors.type.message}</p>}
        </div>

        {/* Document name */}
        <div className="space-y-1.5">
          <label htmlFor="doc-name" className="block text-[13px] font-medium text-ink-secondary">
            Document Name <span className="text-state-danger">*</span>
          </label>
          <input
            id="doc-name"
            type="text"
            maxLength={120}
            placeholder="Document name"
            className={cn(inputClass, errors.name && 'border-state-danger')}
            {...register('name')}
          />
          {errors.name && <p className="text-[12px] text-state-danger">{errors.name.message}</p>}
        </div>

        {/* Issue + Expiry dates (conditional) */}
        {showDates && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="doc-issue-date" className="block text-[13px] font-medium text-ink-secondary">
                Issue Date
              </label>
              <input
                id="doc-issue-date"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className={inputClass}
                {...register('issueDate')}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="doc-expiry-date" className="block text-[13px] font-medium text-ink-secondary">
                Expiry Date
              </label>
              <input
                id="doc-expiry-date"
                type="date"
                className={inputClass}
                {...register('expiryDate')}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="doc-notes" className="block text-[13px] font-medium text-ink-secondary">
            Notes
          </label>
          <textarea
            id="doc-notes"
            maxLength={500}
            rows={3}
            placeholder="Optional notes about this document"
            className={cn(
              'w-full bg-bg-subtle border border-line rounded-md px-3 py-2',
              'text-sm text-ink-primary resize-none',
              'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
            )}
            {...register('notes')}
          />
        </div>
      </form>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="sr-only"
        onChange={handleFileInput}
        aria-hidden="true"
      />
    </Dialog>
  );
}
