'use client';

/**
 * ShootAssetCard — SPEC-SHOOTS-002 T06
 *
 * Per-asset card component. Renders one of 14 slot tiles in the ShootDetailView
 * 14-slot grid. Handles all per-asset states: empty, raw, processing, processed,
 * approved, force-approved-without-redaction.
 *
 * PRE-FLIGHT UI compliance (CLAUDE.md §17.1):
 * - Card + Field from custom-builds/shared/detail-card
 * - text-xs/sm/base/lg/xl/2xl ONLY (no text-[NNpx])
 * - rounded-md ONLY
 * - Gate primitive for all role-restricted CTAs
 * - i18n via useTranslations('shootsAi.*')
 *
 * Spec reference: SPEC-SHOOTS-002 T06, L_AI-7, L_AI-8, L_AI-4
 */

import { useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Upload,
  Star,
  ShieldOff,
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scissors,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@dms/ui';
import type { ShootAsset } from '@dms/types';
import type { ShootAssetSlotDef } from '@/src/lib/shoots/asset-slot-definitions';
import { Gate } from '@/src/components/primitives/gate';
import { Button } from '@/src/components/primitives/button';

// ─── Asset state derivation (L_AI-7) ─────────────────────────────────────────

type AssetDisplayState = 'empty' | 'raw' | 'processing' | 'processed' | 'approved';

function deriveAssetState(asset: ShootAsset | undefined): AssetDisplayState {
  if (!asset) return 'empty';
  if (asset.approved) return 'approved';
  const { aiStatus } = asset;
  if (aiStatus === 'queued' || aiStatus === 'processing') return 'processing';
  if (aiStatus === 'succeeded' || aiStatus === 'manual-only') return 'processed';
  return 'raw';
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ShootAssetCardProps {
  asset: ShootAsset | undefined;
  slot: ShootAssetSlotDef;
  isCover: boolean;
  onUploadRaw: (kind: string, dataUrl: string) => void;
  onRedact: (assetId: string) => void;
  onApprove: (assetId: string) => void;
  onUnapprove: (assetId: string) => void;
  onForceApprove: (assetId: string) => void;
  onRequestAi: (assetId: string) => void;
  onSetCover: (assetId: string) => void;
}

// ─── AI status badge ──────────────────────────────────────────────────────────

function AiStatusBadge({ aiStatus }: { aiStatus: ShootAsset['aiStatus'] }) {
  const t = useTranslations('shootsAi');

  // P1: all assets are manual-only (L_AI-4)
  const label = aiStatus === 'manual-only'
    ? t('badges.aiManualOnly')
    : t(`aiStatus.${aiStatus}`);

  const colour =
    aiStatus === 'succeeded' ? 'bg-state-listed/20 text-state-listed' :
    aiStatus === 'failed' ? 'bg-state-danger/20 text-state-danger' :
    aiStatus === 'manual-only' ? 'bg-ink-muted/20 text-ink-muted' :
    'bg-accent/10 text-accent';

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium',
      colour,
    )}>
      <Cpu size={10} aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShootAssetCard({
  asset,
  slot,
  isCover,
  onUploadRaw,
  onRedact,
  onApprove,
  onUnapprove,
  onForceApprove,
  onRequestAi,
  onSetCover,
}: ShootAssetCardProps) {
  const t = useTranslations('shootsAi');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const state = deriveAssetState(asset);

  // ── File pick handler ────────────────────────────────────────────────────
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // 2 MB cap (L_AI-10)
      const MAX_BYTES = 2 * 1024 * 1024;
      if (file.size > MAX_BYTES) {
        // Surface toast via parent; we just reset the input
        alert(t('errors.fileTooLarge'));
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        onUploadRaw(slot.kind, dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [slot.kind, onUploadRaw, t],
  );

  // Image URL for the thumbnail (processedUrl preferred per L_AI-9)
  const thumbUrl = asset
    ? (asset.processedUrl ?? asset.rawUrl)
    : null;

  // ── Slot category colour ──────────────────────────────────────────────────
  const categoryColour: Record<string, string> = {
    exterior: 'border-accent/40',
    interior: 'border-[rgb(var(--state-reserved))]/40',
    mechanical: 'border-[rgb(var(--state-in-refurb))]/40',
    video: 'border-[rgb(var(--state-pending))]/40',
  };

  return (
    <div
      className={cn(
        'rounded-md border bg-bg-surface overflow-hidden flex flex-col',
        // Force-approved warning highlight
        asset?.forceApprovedWithoutRedaction
          ? 'border-state-danger/60'
          : (categoryColour[slot.category] ?? 'border-line'),
      )}
    >
      {/* ── Thumbnail area ──────────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] bg-bg-subtle">
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt={slot.label}
            fill
            sizes="(min-width: 768px) 20vw, 40vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          // Empty state — upload CTA
          <Gate role={['R11']} fallback="hide">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'absolute inset-0 flex flex-col items-center justify-center gap-1',
                'text-ink-muted hover:text-ink-secondary hover:bg-bg-hover transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
              )}
              aria-label={`${t('assetCard.uploadCta')} — ${slot.label}`}
            >
              <Upload size={20} aria-hidden="true" />
              <span className="text-xs text-center px-2">{t('assetCard.uploadCta')}</span>
            </button>
          </Gate>
        )}

        {/* Empty state (no Gate — always show the slot label) */}
        {!thumbUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-ink-muted text-center px-2 opacity-60">
              {t('assetCard.empty')}
            </span>
          </div>
        )}

        {/* Cover star indicator */}
        {isCover && (
          <div className="absolute top-1 left-1 bg-amber-500/90 text-white rounded-md p-0.5">
            <Star size={12} aria-label="Cover photo" />
          </div>
        )}

        {/* Approval state chip (top-right) */}
        {asset && (
          <div className="absolute top-1 right-1">
            {state === 'approved' && !asset.forceApprovedWithoutRedaction && (
              <span className="inline-flex items-center gap-1 bg-state-listed/90 text-white rounded-md px-1.5 py-0.5 text-xs font-medium">
                <CheckCircle2 size={10} aria-hidden="true" />
                {t('approvalState.approved')}
              </span>
            )}
            {state === 'processing' && (
              <span className="inline-flex items-center gap-1 bg-accent/90 text-white rounded-md px-1.5 py-0.5 text-xs font-medium">
                <Cpu size={10} aria-hidden="true" className="animate-spin" />
                {t('approvalState.processing')}
              </span>
            )}
            {asset.forceApprovedWithoutRedaction && (
              <span className="inline-flex items-center gap-1 bg-state-danger/90 text-white rounded-md px-1.5 py-0.5 text-xs font-medium">
                <ShieldOff size={10} aria-hidden="true" />
                {t('badges.forceApprovedWithoutRedaction')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* ── Slot label + badges ──────────────────────────────────────────── */}
      <div className="px-2 pt-2 pb-1 space-y-1 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <span className="text-xs font-medium text-ink-primary leading-tight">
            {slot.label}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            {slot.required && (
              <span className="text-xs text-ink-muted">{t('labels.requiredSlot')}</span>
            )}
            {slot.recommendedCover && (
              <span className="text-xs text-accent">{t('labels.recommendedCover')}</span>
            )}
          </div>
        </div>

        {/* AI status badge (always visible when asset exists) */}
        {asset && (
          <AiStatusBadge aiStatus={asset.aiStatus} />
        )}

        {/* LP redaction warning */}
        {asset && slot.lpRedactionRequired && !asset.lpRedacted && !asset.approved && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={10} aria-hidden="true" />
            <span>{t('errors.lpRedactionRequired')}</span>
          </div>
        )}
      </div>

      {/* ── Per-state CTAs ──────────────────────────────────────────────── */}
      {asset && (
        <div className="px-2 pb-2 space-y-1">
          {/* Raw + processed (not approved): Redact, Request AI, Approve */}
          {(state === 'raw' || state === 'processed') && (
            <>
              {slot.lpRedactionRequired && !asset.lpRedacted && (
                <Gate role={['R11']} fallback="hide">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => onRedact(asset.id)}
                    leadingIcon={<Scissors size={12} aria-hidden="true" />}
                  >
                    {t('actions.redactLicensePlate')}
                  </Button>
                </Gate>
              )}

              {/* Request AI — P1 stub (L_AI-4) */}
              <Gate role={['R11']} fallback="hide">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => onRequestAi(asset.id)}
                  leadingIcon={<Cpu size={12} aria-hidden="true" />}
                >
                  {t('actions.requestAi')}
                </Button>
              </Gate>

              {/* Approve (only if lpRedacted or kind doesn't require it) */}
              {(!slot.lpRedactionRequired || asset.lpRedacted) && (
                <Gate role={['R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => onApprove(asset.id)}
                    leadingIcon={<CheckCircle2 size={12} aria-hidden="true" />}
                  >
                    {t('actions.approve')}
                  </Button>
                </Gate>
              )}

              {/* Force Approve — R12+ only, when LP required but not redacted */}
              {slot.lpRedactionRequired && !asset.lpRedacted && asset.aiStatus !== 'failed' && (
                <Gate role={['R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => onForceApprove(asset.id)}
                    leadingIcon={<ShieldOff size={12} aria-hidden="true" />}
                  >
                    {t('actions.forceApprove')}
                  </Button>
                </Gate>
              )}
            </>
          )}

          {/* Approved state */}
          {state === 'approved' && (
            <>
              {/* Set as Cover (R11+, exterior kind only) */}
              {!isCover && slot.category === 'exterior' && slot.kind !== 'video_walkaround' && !asset.forceApprovedWithoutRedaction && (
                <Gate role={['R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => onSetCover(asset.id)}
                    leadingIcon={<Star size={12} aria-hidden="true" />}
                  >
                    {t('actions.setCover')}
                  </Button>
                </Gate>
              )}

              {/* Unapprove */}
              <Gate role={['R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => onUnapprove(asset.id)}
                  leadingIcon={<XCircle size={12} aria-hidden="true" />}
                >
                  {t('actions.unapprove')}
                </Button>
              </Gate>
            </>
          )}
        </div>
      )}
    </div>
  );
}
