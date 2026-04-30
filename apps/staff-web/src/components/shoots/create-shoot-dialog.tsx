'use client';

/**
 * CreateShootDialog — manual shoot scheduling for inventory-for-sale vehicles.
 *
 * Per user direction (2026-04-30): "in shoots module there is no button to
 * create new shoot and each shoot must be linked to a vehicle in our
 * inventory for sale."
 *
 * The vehicle picker is filtered to:
 *   - Vehicles whose status === 'published' (actively listed for sale).
 *   - Excludes any VIN that already has an active (non-completed) shoot —
 *     L6 in SPEC-SHOOTS-001 enforces one-active-shoot-per-VIN at the store
 *     level, so we filter here for UX clarity (no error toast needed).
 *
 * R11+ Marketing role can schedule manually. Auto-creation on ACQUIRED
 * SalesEvent (per spec) remains the primary path; this dialog is the
 * mid-cycle escape hatch.
 *
 * Uses canonical Dialog primitive + Button primitive per SPEC-ARCH-UI-001.
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, X as XIcon } from 'lucide-react';
import { vehicles as allVehicles } from '@dms/mocks/fixtures';
import { useShootsStore } from '@/src/lib/shoots/shoots-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { Button } from '@/src/components/primitives/button';
import { Dialog } from '@/src/components/primitives/dialog';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';

// ─── Outlet code mapping (Vehicle.city → ShootOutletId) ───────────────────────

type ShootOutletId = 'BLR-01' | 'MUM-01' | 'CHE-01';

function inferShootOutletId(city: string | undefined): ShootOutletId {
  const lower = (city ?? '').toLowerCase();
  if (lower.includes('mumbai')) return 'MUM-01';
  if (lower.includes('chennai')) return 'CHE-01';
  return 'BLR-01'; // default — bangalore + unknowns
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface CreateShootDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateShootDialog({ open, onClose }: CreateShootDialogProps) {
  const t = useTranslations('shoots.create');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const allShoots = useShootsStore((s) => s.shoots);
  const createShoot = useShootsStore((s) => s.createShoot);

  const [selectedVin, setSelectedVin] = useState<string>('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Build the set of VINs that already have an ACTIVE shoot (any status
  // except 'completed') — those are excluded from the picker.
  const blockedVins = useMemo(() => {
    const blocked = new Set<string>();
    for (const shoot of Object.values(allShoots)) {
      if (shoot.status !== 'completed') blocked.add(shoot.vin);
    }
    return blocked;
  }, [allShoots]);

  // Eligible vehicles: status === 'published' (for sale) AND no active shoot.
  const eligibleVehicles = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return allVehicles
      .filter((v) => v.status === 'published')
      .filter((v) => !blockedVins.has(v.vin))
      .filter((v) =>
        trimmed === ''
          ? true
          : `${v.make} ${v.model} ${v.year} ${v.vin}`.toLowerCase().includes(trimmed),
      )
      .slice(0, 30); // cap for performance
  }, [search, blockedVins]);

  function handleSubmit() {
    if (!selectedVin || !user) return;
    const vehicle = allVehicles.find((v) => v.vin === selectedVin);
    if (!vehicle) {
      toast(t('vehicleNotFound'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      const outletId = inferShootOutletId(vehicle.city);
      createShoot(
        selectedVin,
        outletId,
        { id: user.id, role: user.role, name: user.name },
        {
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleYear: vehicle.year,
        },
      );
      toast(t('createdToast', { make: vehicle.make, model: vehicle.model }), 'success');
      // Reset + close
      setSelectedVin('');
      setSearch('');
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('genericError');
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Dialog
        open={open}
        onClose={onClose}
        title={t('title')}
        subtitle={t('description')}
        size="lg"
      >
        <div className="space-y-4">
          {/* Search */}
          <div>
            <label
              htmlFor="shoot-vehicle-search"
              className="block text-xs font-medium text-ink-secondary mb-1"
            >
              {t('searchLabel')}
            </label>
            <input
              id="shoot-vehicle-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full h-9 px-3 rounded-md border border-line bg-bg-surface text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Vehicle list */}
          <div>
            <p className="text-xs text-ink-muted mb-2">
              {t('eligibleCount', { count: eligibleVehicles.length })}
            </p>
            <div className="max-h-80 overflow-y-auto border border-line rounded-md divide-y divide-line">
              {eligibleVehicles.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  {t('emptyEligible')}
                </div>
              ) : (
                eligibleVehicles.map((v) => {
                  const isSelected = v.vin === selectedVin;
                  return (
                    <button
                      key={v.vin}
                      type="button"
                      onClick={() => setSelectedVin(v.vin)}
                      className={[
                        'w-full text-left px-4 py-3 transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
                        isSelected ? 'bg-accent/10' : 'hover:bg-bg-subtle',
                      ].join(' ')}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-primary truncate">
                            {v.year} {v.make} {v.model}
                          </p>
                          <p className="font-mono text-xs text-ink-muted truncate">
                            {v.vin}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-mono text-ink-secondary tabular-nums">
                            ₹{v.price ? (v.price / 100000).toFixed(1) : '—'}L
                          </p>
                          <p className="text-xs text-ink-muted capitalize">
                            {v.city ?? '—'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Hint */}
          <p className="text-xs text-ink-muted flex items-start gap-1.5">
            <Camera size={13} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{t('hint')}</span>
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              <XIcon className="h-4 w-4" aria-hidden="true" />
              {t('cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!selectedVin || submitting}
            >
              {submitting ? t('creating') : t('createCta')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
