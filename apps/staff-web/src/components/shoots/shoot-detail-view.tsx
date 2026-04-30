'use client';

/**
 * ShootDetailView — SPEC-SHOOTS-001 §6.2 (detail page)
 *
 * Photographer assignment, shoot status management, asset grid, completion checklist.
 *
 * PRE-FLIGHT UI CHECKLIST compliance:
 * - Card + Field from custom-builds/shared/detail-card
 * - text-xs/sm/base/lg/xl/2xl only
 * - rounded-md only
 * - Gate primitive for RBAC (L3: R11 required for photo/shoot ops)
 * - i18n via useTranslations('shoots.*')
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  Clock,
  Image,
  PlayCircle,
  UserCheck,
  CalendarDays,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { useShootsStore } from '@/src/lib/shoots/shoots-store';
import { ShootIncompleteError } from '@dms/types';
import { Button } from '@/src/components/primitives/button';
import { Gate } from '@/src/components/primitives/gate';
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';
import { ShootStatusChip } from './shoot-status-chip';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { SHOOT_REQUIRED_PHOTOS, SHOOT_REQUIRED_VIDEOS } from '@/src/lib/shoots/shoots-store';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShootDetailViewProps {
  shootId: string;
}

// ─── Completion checklist ─────────────────────────────────────────────────────

function CompletionChecklist({
  assetCount,
  videoCount,
}: {
  assetCount: number;
  videoCount: number;
}) {
  const t = useTranslations('shoots.detail');
  const photosOk = assetCount >= SHOOT_REQUIRED_PHOTOS;
  const videosOk = videoCount >= SHOOT_REQUIRED_VIDEOS;
  const allOk = photosOk && videosOk;

  return (
    <div className="space-y-3">
      <div className={[
        'flex items-center gap-2 text-sm',
        photosOk ? 'text-ink-secondary' : 'text-ink-muted',
      ].join(' ')}>
        {photosOk ? (
          <CheckCircle2 size={16} className="text-[rgb(var(--state-listed))] flex-shrink-0" aria-hidden="true" />
        ) : (
          <Camera size={16} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
        )}
        <span>
          {assetCount} / {SHOOT_REQUIRED_PHOTOS} {t('photos')}
          {!photosOk && (
            <span className="text-xs text-ink-muted ml-1">
              ({SHOOT_REQUIRED_PHOTOS - assetCount} more needed)
            </span>
          )}
        </span>
      </div>

      <div className={[
        'flex items-center gap-2 text-sm',
        videosOk ? 'text-ink-secondary' : 'text-ink-muted',
      ].join(' ')}>
        {videosOk ? (
          <CheckCircle2 size={16} className="text-[rgb(var(--state-listed))] flex-shrink-0" aria-hidden="true" />
        ) : (
          <PlayCircle size={16} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
        )}
        <span>
          {videoCount} / {SHOOT_REQUIRED_VIDEOS} {t('videos')}
          {!videosOk && (
            <span className="text-xs text-ink-muted ml-1">(1 more needed)</span>
          )}
        </span>
      </div>

      {allOk ? (
        <div className="flex items-center gap-2 text-sm text-[rgb(var(--state-listed))]">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span className="font-medium">{t('readyToList')}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{t('notReady')}</span>
        </div>
      )}
    </div>
  );
}

// ─── Asset grid ───────────────────────────────────────────────────────────────

function AssetGrid({ assetUrls }: { assetUrls: string[] }) {
  const t = useTranslations('shoots.detail');

  if (assetUrls.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-line bg-bg-subtle h-32 text-sm text-ink-muted">
        <div className="text-center">
          <Image size={24} className="mx-auto mb-2 text-ink-muted" aria-hidden="true" />
          <span>{t('assets')} — none yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {assetUrls.map((url, i) => {
        const isVideo = url.includes('video-');
        return (
          <div
            key={url}
            className="aspect-square rounded-md bg-bg-subtle border border-line flex items-center justify-center overflow-hidden relative"
            title={url}
          >
            {isVideo ? (
              <PlayCircle size={24} className="text-ink-muted" aria-label={`Video ${i + 1}`} />
            ) : (
              <Image size={20} className="text-ink-muted" aria-label={`Photo ${i + 1}`} />
            )}
            <span className="absolute bottom-1 right-1 font-mono text-xs text-ink-muted bg-bg-surface/80 px-1 rounded">
              {i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function ShootDetailView({ shootId }: ShootDetailViewProps) {
  const t = useTranslations('shoots');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();

  const shoot = useShootsStore((s) => s.shoots[shootId]);
  const { assignPhotographer, scheduleShoot, startShoot, addMockAsset, completeShoot } =
    useShootsStore.getState();

  const actor = useMemo(
    () => ({
      id: user?.id ?? 'anonymous',
      name: user?.name ?? 'Unknown',
      role: user?.role ?? 'R01',
    }),
    [user],
  );

  if (!shoot) {
    return (
      <div className="px-6 py-8">
        <div className="rounded-md border border-line bg-bg-surface p-6 max-w-xl">
          <p className="text-sm text-ink-muted">{t('errors.notFound')}</p>
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

  // ── Action handlers ─────────────────────────────────────────────────────────
  // shoot is guaranteed non-null here: we returned early above if !shoot

  const shootId_safe = shoot.id; // capture once after guard

  function handleAssignPhotographer() {
    try {
      // In v1, auto-assign to r11 actor (mocked)
      assignPhotographer(shootId_safe, 'staff-r11-001', actor);
      toast(t('toast.photographerAssigned'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleSchedule() {
    try {
      // Mock: schedule for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      scheduleShoot(shootId_safe, tomorrow.toISOString(), actor);
      toast(t('toast.scheduled'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleStart() {
    try {
      startShoot(shootId_safe, actor);
      toast(t('toast.started'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleAddPhoto() {
    try {
      addMockAsset(shootId_safe, 'photo', actor);
      toast(t('toast.photoAdded'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleAddVideo() {
    try {
      addMockAsset(shootId_safe, 'video', actor);
      toast(t('toast.videoAdded'), 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleComplete() {
    try {
      completeShoot(shootId_safe, actor);
      toast(t('toast.completed'), 'success');
    } catch (err) {
      if (err instanceof ShootIncompleteError) {
        toast(
          `Shoot incomplete — need ${Math.max(0, SHOOT_REQUIRED_PHOTOS - err.assetCount)} more photo(s) and ${Math.max(0, SHOOT_REQUIRED_VIDEOS - err.videoCount)} more video(s).`,
          'error',
        );
      } else {
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
    }
  }

  return (
    <div className="px-6 py-8 space-y-6 max-w-4xl">
      {/* Toast container */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Breadcrumb + header ─────────────────────────────────────────── */}
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
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-xs text-ink-muted">VIN {shoot.vin}</span>
              <ShootStatusChip status={shoot.status} />
            </div>
          </div>

          {/* Primary action based on status */}
          {shoot.status !== 'completed' && (
            <Gate role={['R11', 'R13', 'R19', 'R22', 'R24']} fallback="disable">
              <div className="flex items-center gap-2 flex-wrap">
                {shoot.status === 'pending' && !shoot.photographerId && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAssignPhotographer}
                    leadingIcon={<UserCheck size={16} aria-hidden="true" />}
                  >
                    {t('actions.assignPhotographer')}
                  </Button>
                )}
                {(shoot.status === 'pending' || shoot.status === 'scheduled') && !shoot.scheduledAt && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleSchedule}
                    leadingIcon={<CalendarDays size={16} aria-hidden="true" />}
                  >
                    {t('actions.schedule')}
                  </Button>
                )}
                {(shoot.status === 'pending' || shoot.status === 'scheduled') && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleStart}
                    leadingIcon={<Clock size={16} aria-hidden="true" />}
                  >
                    {t('actions.startShoot')}
                  </Button>
                )}
              </div>
            </Gate>
          )}
        </div>
      </div>

      {/* ── 2-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column — metadata */}
        <div className="lg:col-span-1 space-y-4">

          {/* Overview card */}
          <Card title="Overview">
            <dl className="space-y-3">
              <Field label={t('detail.photographer')} value={
                shoot.photographerId
                  ? <span className="font-mono text-xs">{shoot.photographerId}</span>
                  : <span className="text-ink-muted">{t('detail.unassigned')}</span>
              } />
              <Field label={t('detail.scheduledAt')} value={
                shoot.scheduledAt
                  ? new Date(shoot.scheduledAt).toLocaleString('en-IN')
                  : <span className="text-ink-muted">{t('detail.notScheduled')}</span>
              } />
              {shoot.completedAt && (
                <Field label={t('detail.completedAt')} value={
                  new Date(shoot.completedAt).toLocaleString('en-IN')
                } />
              )}
              <Field label="Outlet" value={<span className="font-mono text-xs">{shoot.outletId}</span>} />
              <Field label="VIN" value={<span className="font-mono text-xs">{shoot.vin}</span>} />
              {shoot.notes && (
                <Field label={t('detail.notes')} value={shoot.notes} />
              )}
            </dl>
          </Card>

          {/* Completion checklist */}
          <Card title={t('detail.completion')}>
            <CompletionChecklist
              assetCount={shoot.assetCount}
              videoCount={shoot.videoCount}
            />

            {/* Complete shoot CTA */}
            {shoot.status !== 'completed' && (
              <Gate role={['R11', 'R13', 'R19', 'R22', 'R24']} fallback="disable">
                <div className="mt-4">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={handleComplete}
                    leadingIcon={<CheckCircle2 size={16} aria-hidden="true" />}
                    disabled={
                      shoot.assetCount < SHOOT_REQUIRED_PHOTOS ||
                      shoot.videoCount < SHOOT_REQUIRED_VIDEOS
                    }
                  >
                    {t('actions.completeShoot')}
                  </Button>
                </div>
              </Gate>
            )}
          </Card>
        </div>

        {/* Right column — assets */}
        <div className="lg:col-span-2 space-y-4">

          {/* Asset actions */}
          {shoot.status !== 'completed' && (
            <Gate role={['R11', 'R13', 'R19', 'R22', 'R24']} fallback="disable">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddPhoto}
                  leadingIcon={<Camera size={14} aria-hidden="true" />}
                >
                  {t('actions.addPhoto')}
                  <span className="ml-1 text-ink-muted">(mock)</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddVideo}
                  leadingIcon={<PlayCircle size={14} aria-hidden="true" />}
                >
                  {t('actions.addVideo')}
                  <span className="ml-1 text-ink-muted">(mock)</span>
                </Button>
              </div>
            </Gate>
          )}

          {/* Asset grid card */}
          <Card title={`${t('detail.assets')} (${shoot.assetCount} photos, ${shoot.videoCount} videos)`}>
            <AssetGrid assetUrls={shoot.assetUrls} />
          </Card>
        </div>
      </div>
    </div>
  );
}
