'use client';

import { useRef, useMemo } from 'react';
import { Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { SlideInPanel, AlertDialog, ToastContainer } from '@/src/components/primitives';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@dms/ui';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PHOTOS = 5;
const MAX_SIZE_BYTES = 1024 * 1024; // 1 MB

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhotosPanelProps {
  open: boolean;
  onClose: () => void;
  jobCardId: string;
  jobNo: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhotosPanel({ open, onClose, jobCardId, jobNo }: PhotosPanelProps) {
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useStaffAuth();
  const allPhotos = useServiceStore((s) => s.photos);
  const photos = useMemo(() => allPhotos.filter((p) => p.jobCardId === jobCardId), [allPhotos, jobCardId]);
  const addPhoto = useServiceStore((s) => s.addPhoto);
  const deletePhoto = useServiceStore((s) => s.deletePhoto);
  const { toasts, toast, dismiss } = useToast();

  async function processFiles(files: FileList) {
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };

    for (const file of Array.from(files)) {
      // Count cap
      const currentCount = useServiceStore.getState().photos.filter(
        (p) => p.jobCardId === jobCardId,
      ).length;
      if (currentCount >= MAX_PHOTOS) {
        toast(`Maximum ${MAX_PHOTOS} photos per job card`, 'error');
        break;
      }

      // Size cap
      if (file.size > MAX_SIZE_BYTES) {
        toast(`${file.name} exceeds 1 MB limit`, 'error');
        continue;
      }

      // Read as dataURL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      addPhoto(jobCardId, { dataUrl, name: file.name, size: file.size }, actor);
      toast(`${file.name} uploaded`, 'success');
    }

    // Reset file input
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
    if (!deletePhotoId) return;
    const actor = { id: user?.id ?? 'unknown', name: user?.name ?? 'Unknown' };
    deletePhoto(deletePhotoId, actor);
    toast('Photo deleted', 'success');
    setDeletePhotoId(null);
  }

  const canUpload = photos.length < MAX_PHOTOS;

  return (
    <>
      <SlideInPanel
        open={open}
        onClose={onClose}
        title={`Photos — ${jobNo}`}
        width="40%"
      >
        <div className="flex flex-col h-full p-4 space-y-4">
          {/* Upload zone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-ink-muted">
                {photos.length}/{MAX_PHOTOS} photos
              </span>
              {canUpload && (
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
                  Upload photos
                </button>
              )}
            </div>

            {canUpload && (
              <div
                role="button"
                tabIndex={0}
                aria-label="Drop zone for photos"
                className={cn(
                  'border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors',
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
                <ImageIcon className="h-8 w-8 text-ink-muted mx-auto mb-2" aria-hidden="true" />
                <p className="text-[13px] text-ink-secondary">
                  Drag & drop images here, or click to select
                </p>
                <p className="text-[11px] text-ink-muted mt-1">
                  Max 1 MB per photo · Up to {MAX_PHOTOS} per job card
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-hidden="true"
              onChange={handleFileChange}
            />
          </div>

          {/* Photo grid */}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-square rounded-md overflow-hidden border border-line bg-bg-subtle">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                    <p className="text-[10px] text-white text-center truncate w-full px-1">
                      {photo.name}
                    </p>
                    <button
                      type="button"
                      aria-label={`Delete ${photo.name}`}
                      onClick={() => setDeletePhotoId(photo.id)}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-state-danger text-white hover:bg-state-danger/90 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted italic text-center py-4">
              No photos yet. Upload the first one.
            </p>
          )}
        </div>
      </SlideInPanel>

      {/* Delete confirmation */}
      <AlertDialog
        open={deletePhotoId !== null}
        onClose={() => setDeletePhotoId(null)}
        title="Delete photo?"
        description="This photo will be permanently removed from the job card."
        confirmLabel="Delete"
        cancelLabel="Keep"
        destructive
        onConfirm={handleDeleteConfirm}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
