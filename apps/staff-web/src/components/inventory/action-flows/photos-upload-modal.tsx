'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, X, Star, ChevronDown } from 'lucide-react';
import { cn } from '@dms/ui';
import { Dialog } from '@/src/components/primitives/dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotosUploadModalProps {
  open: boolean;
  onClose: () => void;
  vin: string;
  onSave: (photos: Array<{ file: File; kind: string; isPrimary: boolean }>) => Promise<void>;
}

type UploadStage = 'idle' | 'uploading' | 'ready';

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  kind: string;
  isPrimary: boolean;
  progress: number; // 0-100
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const KIND_OPTIONS = [
  { value: 'EXTERIOR_FRONT', label: 'Exterior Front' },
  { value: 'EXTERIOR_REAR', label: 'Exterior Rear' },
  { value: 'EXTERIOR_SIDE_L', label: 'Exterior Side L' },
  { value: 'EXTERIOR_SIDE_R', label: 'Exterior Side R' },
  { value: 'INTERIOR_DASH', label: 'Interior Dash' },
  { value: 'INTERIOR_SEAT_FRONT', label: 'Interior Seat Front' },
  { value: 'INTERIOR_SEAT_REAR', label: 'Interior Seat Rear' },
  { value: 'ENGINE_BAY', label: 'Engine Bay' },
  { value: 'ODOMETER', label: 'Odometer' },
  { value: 'VIN_PLATE', label: 'VIN Plate' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'OTHER', label: 'Other' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateFile(file: File): string | undefined {
  if (!ACCEPTED.includes(file.type)) {
    return `Unsupported format (${file.type || 'unknown'}). Use JPEG, PNG, WebP, or HEIC.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`;
  }
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhotosUploadModal({
  open,
  onClose,
  vin: _vin,
  onSave,
}: PhotosUploadModalProps) {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [saving, setSaving] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhotos([]);
      setStage('idle');
      setSaving(false);
    }
  }, [open]);

  async function processFiles(files: File[]) {
    if (files.length === 0) return;

    // Build initial photo records (with validation)
    const newPhotos: PhotoFile[] = await Promise.all(
      files.map(async (file) => {
        const error = validateFile(file);
        const preview = error ? '' : await readFileAsDataURL(file);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview,
          kind: '',
          isPrimary: false,
          progress: 0,
          error,
        };
      }),
    );

    setPhotos((prev) => [...prev, ...newPhotos]);
    setStage('uploading');

    // Simulate upload progress for valid files
    const validIds = newPhotos.filter((p) => !p.error).map((p) => p.id);
    if (validIds.length === 0) {
      setStage('ready');
      return;
    }

    const intervals: ReturnType<typeof setInterval>[] = [];
    validIds.forEach((id) => {
      const interval = setInterval(() => {
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const next = Math.min(100, p.progress + Math.floor(Math.random() * 20) + 10);
            return { ...p, progress: next };
          }),
        );
      }, 150);
      intervals.push(interval);
    });

    // After 1.2s simulated upload, mark as ready
    setTimeout(() => {
      intervals.forEach(clearInterval);
      setPhotos((prev) => prev.map((p) => (validIds.includes(p.id) ? { ...p, progress: 100 } : p)));
      setStage('ready');
    }, 1200);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    void processFiles(files);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    void processFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave() {
    setIsDraggingOver(false);
  }

  function setKind(id: string, kind: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, kind } : p)));
  }

  function setPrimary(id: string) {
    setPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: p.id === id })));
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) setStage('idle');
      return next;
    });
  }

  const validPhotos = photos.filter((p) => !p.error);
  const allLabelled = validPhotos.length > 0 && validPhotos.every((p) => p.kind !== '');
  const canSave = allLabelled && stage === 'ready' && !saving;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(validPhotos.map((p) => ({ file: p.file, kind: p.kind, isPrimary: p.isPrimary })));
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const readyCount = validPhotos.filter((p) => p.progress === 100).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Upload photos"
      size="lg"
      dirty={photos.length > 0}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-[13px] text-ink-muted">
            {stage === 'uploading'
              ? `Uploading ${readyCount} / ${validPhotos.length}…`
              : validPhotos.length > 0
                ? `${validPhotos.length} photo${validPhotos.length !== 1 ? 's' : ''} ready`
                : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-medium border border-line',
                'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={handleSave}
              className={cn(
                'h-9 px-4 rounded-md text-sm font-semibold text-white',
                'bg-accent hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {saving ? 'Saving…' : 'Save photos'}
            </button>
          </div>
        </div>
      }
    >
      {/* Dropzone (always visible if idle) */}
      {stage === 'idle' && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop photos here or click to browse"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? inputRef.current?.click() : undefined}
          className={cn(
            'flex h-48 flex-col items-center justify-center gap-3',
            'rounded-md border-2 border-dashed transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            isDraggingOver
              ? 'border-accent bg-accent/5'
              : 'border-line hover:border-accent/50 hover:bg-bg-subtle',
          )}
        >
          <Upload className="h-8 w-8 text-ink-muted" aria-hidden="true" />
          <div className="text-center">
            <p className="text-sm font-medium text-ink-primary">Drop photos here or click to browse</p>
            <p className="text-[12px] text-ink-muted mt-0.5">JPEG, PNG, WebP, HEIC · Max 10 MB each</p>
          </div>
        </div>
      )}

      {/* Upload progress list */}
      {stage === 'uploading' && (
        <div className="space-y-2">
          {photos.map((photo) => (
            <div key={photo.id} className="flex items-center gap-3 rounded-md border border-line bg-bg-subtle px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] text-ink-primary">{photo.file.name}</p>
                {photo.error ? (
                  <p className="text-[12px] text-state-danger">{photo.error}</p>
                ) : (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-canvas">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-150"
                      style={{ width: `${photo.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <span className={cn('shrink-0 font-mono text-[11px]', photo.error ? 'text-state-danger' : 'text-ink-muted')}>
                {photo.error ? 'Error' : `${photo.progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Post-upload grid */}
      {stage === 'ready' && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-md overflow-hidden border border-line bg-bg-subtle aspect-[4/3]">
                {photo.error ? (
                  <div className="flex h-full items-center justify-center p-2">
                    <p className="text-[11px] text-state-danger text-center">{photo.error}</p>
                  </div>
                ) : (
                  <>
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
                      alt={photo.file.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />

                    {/* Set Primary star */}
                    <button
                      type="button"
                      onClick={() => setPrimary(photo.id)}
                      aria-label={photo.isPrimary ? 'Primary photo' : 'Set as primary'}
                      className={cn(
                        'absolute top-1.5 right-1.5 rounded-full p-1 transition-colors',
                        photo.isPrimary
                          ? 'bg-accent text-white'
                          : 'bg-black/50 text-white/70 hover:text-white opacity-0 group-hover:opacity-100',
                      )}
                    >
                      <Star className="h-3 w-3" fill={photo.isPrimary ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label="Remove photo"
                      className="absolute top-1.5 left-1.5 rounded-full bg-black/50 p-1 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>

                    {/* Kind label dropdown */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-1">
                      <div className="relative">
                        <select
                          value={photo.kind}
                          onChange={(e) => setKind(photo.id, e.target.value)}
                          aria-label="Photo kind"
                          className={cn(
                            'w-full appearance-none bg-transparent font-mono text-[10px] uppercase tracking-wider pr-3',
                            photo.kind === '' ? 'text-white/50' : 'text-white',
                            'focus:outline-none cursor-pointer',
                          )}
                        >
                          <option value="">Select label…</option>
                          {KIND_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-bg-surface text-ink-primary normal-case tracking-normal">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-0 top-0.5 h-3 w-3 text-white/50" aria-hidden="true" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add more button */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex aspect-[4/3] flex-col items-center justify-center gap-1',
                'rounded-md border-2 border-dashed border-line',
                'hover:border-accent/50 hover:bg-bg-subtle transition-colors',
                'text-ink-muted hover:text-ink-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span className="text-[11px]">Add more</span>
            </button>
          </div>

          {!allLabelled && (
            <p className="text-[12px] text-[rgb(var(--state-stale))]">
              Assign a label to each photo before saving.
            </p>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        className="sr-only"
        onChange={handleFileInput}
        aria-hidden="true"
      />
    </Dialog>
  );
}
