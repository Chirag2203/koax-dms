'use client';

/**
 * ShootDetailView — SPEC-SHOOTS-002 T05 (v2 upgrade)
 *
 * Phase 2 upgrade of the shoot detail surface. Adds:
 *   - 14-slot asset grid using getRequiredSlots() ordering
 *   - Per-slot ShootAssetCard (T06) with upload / redact / approve CTAs
 *   - Cover photo selector (right panel)
 *   - "Request AI Process" stub (L_AI-4 — toast)
 *   - Force-approved banner (L9 banner pattern)
 *   - Storefront gallery status chip (L_AI-9)
 *
 * PRE-FLIGHT UI compliance (CLAUDE.md §17.1):
 * - Card + Field from custom-builds/shared/detail-card
 * - text-xs/sm/base/lg/xl/2xl ONLY
 * - rounded-md ONLY
 * - Gate primitive for all role-restricted CTAs
 * - i18n via useTranslations('shootsAi.*')
 *
 * Spec reference: SPEC-SHOOTS-002 T05, L_AI-3, L_AI-4, L_AI-7, L_AI-8, L_AI-9
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Cpu,
  RefreshCw,
  Star,
  Info,
  CheckCircle2,
  Clock,
  UserCheck,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@dms/ui';
import { useShootsStore } from '@/src/lib/shoots/shoots-store';
import {
  SHOOT_ASSET_SLOTS,
  getRequiredSlots,
} from '@/src/lib/shoots/asset-slot-definitions';
import { ShootAssetCard } from './shoot-asset-card';
import { ShootStatusChip } from './shoot-status-chip';
import { LpRedactionDialog } from './lp-redaction-dialog';
import { Button } from '@/src/components/primitives/button';
import { Gate } from '@/src/components/primitives/gate';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { AlertDialog } from '@/src/components/primitives/dialog';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import {
  LpRedactionRequiredError,
  AssetApprovalPreconditionError,
} from '@dms/types';
import type { ShootAsset } from '@dms/types';
import { InsufficientRoleError } from '@/src/lib/shoots/shoots-store';
import { ShootSlotIncompleteError, ShootNotFoundError } from '@dms/types';

// ─── Module-level EMPTY fallbacks (CLAUDE.md §17.1) ──────────────────────────

const EMPTY_ASSETS: ShootAsset[] = [];

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShootDetailViewProps {
  shootId: string;
}

// ─── Storefront status chip ───────────────────────────────────────────────────

function StorefrontStatusChip({ status }: { status: 'ready' | 'pending' | 'unavailable' }) {
  const t = useTranslations('shootsAi');

  const styles: Record<string, string> = {
    ready: 'bg-state-listed/20 text-state-listed',
    pending: 'bg-amber-500/20 text-amber-600',
    unavailable: 'bg-ink-muted/20 text-ink-muted',
  };

  const icons = {
    ready: <CheckCircle2 size={10} aria-hidden="true" />,
    pending: <Clock size={10} aria-hidden="true" />,
    unavailable: <AlertTriangle size={10} aria-hidden="true" />,
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
      styles[status],
    )}>
      {icons[status]}
      {t(`galleryStatus.${status}`)}
    </span>
  );
}

// ─── Unapprove reason dialog ──────────────────────────────────────────────────

interface UnapproveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function UnapproveDialog({ open, onClose, onConfirm }: UnapproveDialogProps) {
  const t = useTranslations('shootsAi');
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 5;

  const handleConfirm = useCallback(() => {
    if (!valid) return;
    onConfirm(reason.trim());
    setReason('');
  }, [reason, valid, onConfirm]);

  const handleClose = useCallback(() => {
    setReason('');
    onClose();
  }, [onClose]);

  return (
    <AlertDialog
      open={open}
      onClose={handleClose}
      title={t('assetCard.unapproveTitle') as string}
      description={t('assetCard.unapproveDescription') as string}
      confirmLabel={t('actions.unapprove') as string}
      cancelLabel={t('actions.cancel') as string}
      onConfirm={handleConfirm}
    />
  );
}

// ─── Force-approve reason dialog ─────────────────────────────────────────────

interface ForceApproveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

function ForceApproveDialog({ open, onClose, onConfirm }: ForceApproveDialogProps) {
  const t = useTranslations('shootsAi');
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 10;

  const handleConfirm = useCallback(() => {
    if (!valid) return;
    onConfirm(reason.trim());
    setReason('');
  }, [reason, valid, onConfirm]);

  const handleClose = useCallback(() => {
    setReason('');
    onClose();
  }, [onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="force-approve-title"
        >
          <div className="bg-bg-surface border border-line rounded-md w-full max-w-[480px] shadow-xl">
            <div className="px-6 pt-6 pb-4 flex gap-4 items-start">
              <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-state-danger/10">
                <AlertTriangle className="h-5 w-5 text-state-danger" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="force-approve-title" className="text-base font-semibold text-ink-primary">
                  {t('assetCard.forceApproveTitle')}
                </h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  {t('assetCard.forceApproveWarning')}
                </p>
              </div>
            </div>
            <div className="px-6 pb-4">
              <label className="text-xs text-ink-muted block mb-2">
                {t('assetCard.forceApproveReasonLabel')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t('assetCard.forceApproveReasonPlaceholder') as string}
                className={cn(
                  'w-full rounded-md border border-line bg-bg-subtle px-3 py-2',
                  'text-sm text-ink-primary',
                  'focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30',
                  'resize-none',
                )}
              />
              <p className="text-xs text-ink-muted mt-1">
                {reason.trim().length} / 10 {t('assetCard.charsMin')}
              </p>
            </div>
            <div className="px-6 py-4 border-t border-line flex flex-row-reverse gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!valid}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-semibold text-white transition-colors',
                  'bg-state-danger hover:bg-state-danger/90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-state-danger',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {t('actions.forceApprove')}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'h-9 px-4 rounded-md text-sm font-medium border border-line',
                  'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {t('actions.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ShootDetailView({ shootId }: ShootDetailViewProps) {
  const t = useTranslations('shootsAi');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  // Read shoot state (only the primitive fields — CLAUDE.md §17.1)
  const shoot = useShootsStore((s) => s.shoots[shootId]);

  // Assets: base ref from store, sort/filter in useMemo
  const rawAssets = useShootsStore((s) => s.shoots[shootId]?.assets ?? EMPTY_ASSETS);
  const assets = useMemo(() => [...rawAssets].sort((a, b) => a.sortOrder - b.sortOrder), [rawAssets]);

  // Storefront gallery status (L_AI-9)
  const galleryStatus = useShootsStore((s) => {
    const vin = s.shoots[shootId]?.vin;
    return vin ? s.selectStorefrontGalleryForVin(vin).status : 'unavailable' as const;
  });

  // Actor
  const actor = useMemo(
    () => ({
      id: user?.id ?? 'anonymous',
      name: user?.name ?? 'Unknown',
      role: user?.role ?? 'R01',
    }),
    [user],
  );

  // ── Redaction dialog state ─────────────────────────────────────────────────
  const [redactingAssetId, setRedactingAssetId] = useState<string | null>(null);
  const redactingAsset = useMemo(
    () => (redactingAssetId ? assets.find((a) => a.id === redactingAssetId) : undefined),
    [redactingAssetId, assets],
  );

  // ── Unapprove dialog state ─────────────────────────────────────────────────
  const [unapproveAssetId, setUnapproveAssetId] = useState<string | null>(null);

  // ── Force approve dialog state ────────────────────────────────────────────
  const [forceApproveAssetId, setForceApproveAssetId] = useState<string | null>(null);

  // ── Compute force-approved count for banner ────────────────────────────────
  const forceApprovedCount = useMemo(
    () => assets.filter((a) => a.forceApprovedWithoutRedaction === true).length,
    [assets],
  );

  // ── Approved exterior assets eligible for cover (Rules of Hooks: must
  //    sit BEFORE the early `if (!shoot) return …` below — moving it
  //    after caused "Maximum update depth" / hook-count mismatch in dev).
  const coverCandidates = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.approved &&
          !a.forceApprovedWithoutRedaction &&
          a.kind !== 'video_walkaround' &&
          SHOOT_ASSET_SLOTS.find((s) => s.kind === a.kind)?.category === 'exterior',
      ),
    [assets],
  );

  // ── Slot map for quick lookups ─────────────────────────────────────────────
  const assetByKind = useMemo(() => {
    const map = new Map<string, ShootAsset>();
    for (const a of assets) {
      if (!map.has(a.kind)) map.set(a.kind, a);
    }
    return map;
  }, [assets]);

  // ── Store action dispatchers ───────────────────────────────────────────────
  function handleUploadRaw(kind: string, dataUrl: string) {
    if (!shoot) return;
    try {
      useShootsStore.getState().addRawAsset(shoot.id, dataUrl, kind as ShootAsset['kind'], actor);
      toast(t('toasts.uploaded'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleRedact(assetId: string) {
    setRedactingAssetId(assetId);
  }

  async function handleAutoRedact(assetId: string) {
    // L_AI-18: auto-detect LP + rasterise + redact in one action
    try {
      await useShootsStore.getState().autoRedactAsset(assetId, actor);
      // Check if the asset was actually redacted (boxes found)
      const updated = useShootsStore.getState().selectAssetById(assetId);
      if (updated?.lpRedacted) {
        toast(t('toasts.autoRedacted'), 'success');
      } else {
        toast(t('toasts.autoRedactNoPlate'), 'info');
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleRedactConfirm(assetId: string, redactedDataUrl: string) {
    try {
      useShootsStore.getState().redactLicensePlate(assetId, redactedDataUrl, actor);
      toast(t('toasts.redacted'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
    setRedactingAssetId(null);
  }

  function handleApprove(assetId: string) {
    try {
      useShootsStore.getState().approveAsset(assetId, actor);
      toast(t('toasts.approved'), 'success');
    } catch (err) {
      if (err instanceof LpRedactionRequiredError) {
        toast(t('errors.lpRedactionRequired'), 'error');
      } else if (err instanceof AssetApprovalPreconditionError) {
        toast(t('errors.approvalPreconditionFailed', { reason: err.message }), 'error');
      } else {
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
    }
  }

  function handleUnapprove(assetId: string) {
    setUnapproveAssetId(assetId);
  }

  function handleUnapproveConfirm(reason: string) {
    if (!unapproveAssetId) return;
    try {
      useShootsStore.getState().unapproveAsset(unapproveAssetId, reason, actor);
      toast(t('toasts.unapproved'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
    setUnapproveAssetId(null);
  }

  function handleForceApprove(assetId: string) {
    setForceApproveAssetId(assetId);
  }

  function handleForceApproveConfirm(reason: string) {
    if (!forceApproveAssetId) return;
    try {
      useShootsStore.getState().forceApproveOverride(forceApproveAssetId, reason, actor);
      toast(t('toasts.forceApproved'), 'warning');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
    setForceApproveAssetId(null);
  }

  function handleRequestAi(assetId: string) {
    if (!shoot) return;
    try {
      useShootsStore.getState().requestAiProcess(shoot.id, actor);
      // L_AI-4: P1 stub — explicit "coming soon" toast (DoD §10 #15)
      toast(t('toasts.aiComingInV21'), 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleSetCover(assetId: string) {
    if (!shoot) return;
    try {
      useShootsStore.getState().setCoverAsset(shoot.id, assetId, actor);
      toast(t('toasts.coverSet'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleRequestAiShoot() {
    if (!shoot) return;
    try {
      useShootsStore.getState().requestAiProcess(shoot.id, actor);
      toast(t('toasts.aiComingInV21'), 'info');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleAssignPhotographer() {
    if (!shoot) return;
    try {
      useShootsStore.getState().assignPhotographer(shoot.id, 'staff-r11-001', actor);
      toast('Photographer assigned', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleSchedule() {
    if (!shoot) return;
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      useShootsStore.getState().scheduleShoot(shoot.id, tomorrow.toISOString(), actor);
      toast('Shoot scheduled', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleStart() {
    if (!shoot) return;
    try {
      useShootsStore.getState().startShoot(shoot.id, actor);
      toast('Shoot started', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleComplete() {
    if (!shoot) return;
    try {
      useShootsStore.getState().completeShoot(shoot.id, actor);
      toast('Shoot completed', 'success');
    } catch (err) {
      if (err instanceof ShootSlotIncompleteError) {
        toast(
          // L_AI-20: v2.1 — ShootSlotIncompleteError enumerates missing slot kinds
          `Shoot incomplete — missing required slots: ${err.missingKinds.join(', ')}.`,
          'error',
        );
      } else {
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
    }
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!shoot) {
    return (
      <div className="px-6 py-8">
        <div className="rounded-md border border-line bg-bg-surface p-6 max-w-xl">
          <p className="text-sm text-ink-muted">Shoot not found.</p>
          <Link href="/shoots" className="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
            <ArrowLeft size={14} aria-hidden="true" />
            Back to Shoots
          </Link>
        </div>
      </div>
    );
  }

  const vehicle = [shoot.vehicleYear, shoot.vehicleMake, shoot.vehicleModel]
    .filter(Boolean)
    .join(' ') || 'Vehicle';

  return (
    <div className="px-6 py-8 space-y-6 max-w-6xl">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Force-approved banner (L9 pattern) ──────────────────────────── */}
      {forceApprovedCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-state-danger/40 bg-state-danger/8 px-4 py-3">
          <AlertTriangle size={16} className="text-state-danger shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-state-danger">
            {t('banner.forceApprovedCount', { count: forceApprovedCount })}
          </p>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/shoots"
          className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary transition-colors mb-3"
          aria-label="Back to Shoots queue"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          {t('detail.breadcrumb')}
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary">{vehicle}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="font-mono text-xs text-ink-muted">VIN {shoot.vin}</span>
              <ShootStatusChip status={shoot.status} />
              <StorefrontStatusChip status={galleryStatus} />
            </div>
          </div>

          {/* Primary actions */}
          {shoot.status !== 'completed' && (
            <Gate role={['R11', 'R13', 'R19', 'R22', 'R24']} fallback="disable">
              <div className="flex items-center gap-2 flex-wrap">
                {shoot.status === 'pending' && !shoot.photographerId && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleAssignPhotographer}
                    leadingIcon={<UserCheck size={16} aria-hidden="true" />}
                  >
                    Assign Photographer
                  </Button>
                )}
                {(shoot.status === 'pending' || shoot.status === 'scheduled') && !shoot.scheduledAt && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSchedule}
                    leadingIcon={<CalendarDays size={16} aria-hidden="true" />}
                  >
                    Schedule
                  </Button>
                )}
                {(shoot.status === 'pending' || shoot.status === 'scheduled') && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleStart}
                    leadingIcon={<Clock size={16} aria-hidden="true" />}
                  >
                    Start Shoot
                  </Button>
                )}
              </div>
            </Gate>
          )}
        </div>
      </div>

      {/* ── 2-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Right side panel (col 4 on lg) */}
        <div className="lg:col-span-1 space-y-4 lg:order-last">

          {/* Shoot overview */}
          <Card title={t('detail.title')}>
            <dl className="space-y-3">
              <Field label="VIN" value={<span className="font-mono text-xs">{shoot.vin}</span>} />
              <Field label="Outlet" value={<span className="font-mono text-xs">{shoot.outletId}</span>} />
              <Field
                label="AI Vendor"
                value={<span className="font-mono text-xs">{shoot.aiVendor}</span>}
              />
              <Field
                label="Storefront"
                value={<StorefrontStatusChip status={galleryStatus} />}
              />
              <Field
                label="Assets"
                value={`${assets.length} / 14 slots filled`}
              />
            </dl>
          </Card>

          {/* Cover photo selector */}
          <Card title={t('detail.coverPhoto')}>
            {coverCandidates.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('detail.noCoverCandidates')}</p>
            ) : (
              <div className="space-y-2">
                {coverCandidates.map((a) => {
                  const slot = SHOOT_ASSET_SLOTS.find((s) => s.kind === a.kind);
                  return (
                    <label
                      key={a.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-colors',
                        shoot.coverAssetId === a.id
                          ? 'border-accent bg-accent/8'
                          : 'border-line hover:bg-bg-hover',
                      )}
                    >
                      <input
                        type="radio"
                        name="cover-selector"
                        checked={shoot.coverAssetId === a.id}
                        onChange={() => handleSetCover(a.id)}
                        className="sr-only"
                      />
                      <Star
                        size={12}
                        className={shoot.coverAssetId === a.id ? 'text-accent' : 'text-ink-muted'}
                        aria-hidden="true"
                      />
                      <span className="text-xs text-ink-primary truncate">
                        {slot?.label ?? a.kind}
                      </span>
                      {shoot.coverAssetId === a.id && (
                        <span className="ml-auto text-xs text-accent font-medium shrink-0">
                          {t('detail.currentCover')}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Shoot-level actions */}
          <Card title="Actions">
            <div className="space-y-2">
              {/* Request AI Process — P1 stub (L_AI-4) */}
              <Gate role={['R11']} fallback="hide">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={handleRequestAiShoot}
                  leadingIcon={<Cpu size={14} aria-hidden="true" />}
                >
                  {t('detail.requestAi')}
                </Button>
              </Gate>

              {/* Request Re-shoot (R09+ on this surface) */}
              <Gate role={['R09', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
                <Link
                  href={`/inventory/${shoot.vin}`}
                  className={cn(
                    'flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm font-medium',
                    'border border-line text-ink-secondary hover:text-ink-primary hover:bg-bg-hover transition-colors',
                  )}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  {t('inventoryTab.manageInInventory')}
                </Link>
              </Gate>

              {/* Complete shoot */}
              {shoot.status !== 'completed' && (
                <Gate role={['R11', 'R13', 'R19', 'R22', 'R24']} fallback="disable">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={handleComplete}
                    leadingIcon={<CheckCircle2 size={14} aria-hidden="true" />}
                  >
                    Complete Shoot
                  </Button>
                </Gate>
              )}
            </div>
          </Card>
        </div>

        {/* 14-slot asset grid (col 1-3 on lg) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Category groups */}
          {(['exterior', 'interior', 'mechanical', 'video'] as const).map((cat) => {
            const categorySlots = SHOOT_ASSET_SLOTS.filter((s) => s.category === cat);
            const catLabel = t(`category.${cat}`);
            return (
              <Card key={cat} title={catLabel}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {categorySlots.map((slot) => {
                    const asset = assetByKind.get(slot.kind);
                    return (
                      <ShootAssetCard
                        key={slot.kind}
                        asset={asset}
                        slot={slot}
                        isCover={shoot.coverAssetId === asset?.id}
                        onUploadRaw={handleUploadRaw}
                        onRedact={handleRedact}
                        onAutoRedact={handleAutoRedact}
                        onApprove={handleApprove}
                        onUnapprove={handleUnapprove}
                        onForceApprove={handleForceApprove}
                        onRequestAi={handleRequestAi}
                        onSetCover={handleSetCover}
                      />
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── LP Redaction Dialog (T07) ──────────────────────────────────── */}
      {redactingAsset && (
        <LpRedactionDialog
          open={Boolean(redactingAssetId)}
          onClose={() => setRedactingAssetId(null)}
          rawUrl={redactingAsset.rawUrl}
          assetId={redactingAsset.id}
          onConfirm={handleRedactConfirm}
        />
      )}

      {/* ── Unapprove dialog ──────────────────────────────────────────── */}
      <UnapproveDialog
        open={Boolean(unapproveAssetId)}
        onClose={() => setUnapproveAssetId(null)}
        onConfirm={handleUnapproveConfirm}
      />

      {/* ── Force approve dialog ──────────────────────────────────────── */}
      <ForceApproveDialog
        open={Boolean(forceApproveAssetId)}
        onClose={() => setForceApproveAssetId(null)}
        onConfirm={handleForceApproveConfirm}
      />
    </div>
  );
}
