'use client';

/**
 * IntakePhotosGrid — 10-slot photo capture grid for vehicle intake inspection.
 *
 * L5: Each slot is typed (prescriptive, from research §6.5 OEM SOP).
 *     One photo per slot; replaces existing if slot is already filled.
 *     Cap: 1 MB per photo — rejects with toast.
 * L14: Photos are pii_sensitivity:medium — grid renders thumbnails; R11 sees
 *      thumbnail-only summaries (caller responsibility via `redacted` prop).
 */

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';
import { Card } from '@/src/components/custom-builds/shared/detail-card';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import type { IntakeInspectionPhoto, IntakePhotoSlot } from '@dms/types';

// ── Slot configuration ─────────────────────────────────────────────────────────

interface SlotConfig {
  slot: IntakePhotoSlot;
  label: string;
  required: boolean;
}

const SLOT_CONFIG: SlotConfig[] = [
  { slot: 'front_3q_driver',     label: 'Front 3/4 Driver',     required: true },
  { slot: 'front_3q_passenger',  label: 'Front 3/4 Passenger',  required: true },
  { slot: 'rear_3q_driver',      label: 'Rear 3/4 Driver',      required: true },
  { slot: 'rear_3q_passenger',   label: 'Rear 3/4 Passenger',   required: true },
  { slot: 'driver_profile',      label: 'Driver Profile',       required: true },
  { slot: 'passenger_profile',   label: 'Passenger Profile',    required: true },
  { slot: 'odometer',            label: 'Odometer',             required: true },
  { slot: 'fuel_gauge',          label: 'Fuel Gauge',           required: false },
  { slot: 'interior',            label: 'Interior Wide',        required: false },
  { slot: 'boot',                label: 'Boot / Trunk',         required: false },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  /** All photos for this intake */
  photos: IntakeInspectionPhoto[];
  /** Called with the slot and the base64 dataUrl */
  onCapture: (slot: IntakePhotoSlot, dataUrl: string) => void;
  /** R11 redacted view — shows placeholder thumbnails only, no dataUrls */
  redacted?: boolean;
  disabled?: boolean;
}

export function IntakePhotosGrid({ photos, onCapture, redacted = false, disabled = false }: Props) {
  const t = useTranslations('serviceIntake');
  const { toasts, toast, dismiss } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<IntakePhotoSlot | null>(null);

  // ── Photo lookup by slot ───────────────────────────────────────────────────
  const bySlot = new Map<IntakePhotoSlot, IntakeInspectionPhoto>(
    photos.map((p) => [p.slot, p]),
  );

  // ── Click a slot → open file picker ───────────────────────────────────────
  function handleSlotClick(slot: IntakePhotoSlot) {
    if (disabled || redacted) return;
    pendingSlotRef.current = slot;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  // ── File picker change ─────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const slot = pendingSlotRef.current;
    if (!file || !slot) return;

    // L5 / plan risk: reject >1 MB
    if (file.size > 1_048_576) {
      toast(t('errors.photoOver1MB'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        onCapture(slot, dataUrl);
        toast(`Photo captured: ${SLOT_CONFIG.find((s) => s.slot === slot)?.label ?? slot}`, 'success');
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Card title="Vehicle Photos (10 Slots)">
        <div className="grid grid-cols-5 gap-3" role="list" aria-label="Vehicle photo slots">
          {SLOT_CONFIG.map(({ slot, label, required }) => {
            const photo = bySlot.get(slot);
            const isFilled = !!photo;

            return (
              <div
                key={slot}
                role="listitem"
                className={`relative aspect-[4/3] rounded-md border-2 overflow-hidden cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent
                  ${isFilled ? 'border-[rgb(var(--state-listed)/0.5)]' : required ? 'border-[rgb(var(--state-pending)/0.4)] border-dashed' : 'border-line border-dashed'}
                  ${(disabled || redacted) ? 'cursor-default' : 'hover:border-accent/50'}
                `}
                onClick={() => handleSlotClick(slot)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSlotClick(slot);
                  }
                }}
                tabIndex={(disabled || redacted) ? -1 : 0}
                aria-label={`${label} — ${isFilled ? 'photo captured' : 'tap to capture'}`}
              >
                {isFilled && !redacted ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo.dataUrl}
                    alt={label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-1 text-center">
                    {redacted && isFilled ? (
                      <>
                        <div className="w-6 h-6 rounded-full bg-[rgb(var(--state-listed)/0.15)] flex items-center justify-center mb-1">
                          <span className="text-xs text-[rgb(var(--state-listed))]">✓</span>
                        </div>
                        <span className="text-xs text-ink-muted">Captured</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-ink-muted mb-1" aria-hidden="true" />
                        <span className="text-xs text-ink-muted leading-tight">{label}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Required / Optional badge */}
                <span
                  className={`absolute top-1 right-1 rounded px-1 py-px text-xs font-mono
                    ${required
                      ? 'bg-[rgb(var(--state-pending)/0.15)] text-[rgb(var(--state-pending))]'
                      : 'bg-bg-subtle text-ink-muted'
                    }`}
                >
                  {required ? 'Req' : 'Opt'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress summary */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-[rgb(var(--state-listed))] transition-all"
              style={{ width: `${(photos.length / 10) * 100}%` }}
              role="progressbar"
              aria-valuenow={photos.length}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`${photos.length} of 10 photos captured`}
            />
          </div>
          <span className="text-xs text-ink-muted tabular-nums shrink-0">{photos.length}/10</span>
        </div>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden="true"
        onChange={handleFileChange}
      />
    </>
  );
}
