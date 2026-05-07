'use client';

/**
 * LpRedactionDialog — SPEC-SHOOTS-002 T07
 *
 * Manual rectangle-overlay LP redaction dialog.
 * User drags a rectangle over the license plate area; on confirm the region
 * is rasterised to an opaque black rectangle in a flat JPEG (L_AI-12 —
 * non-destructive: pixels under rect are unrecoverable via canvas flattening).
 *
 * Implementation of L_AI-12 non-destructiveness:
 *   1. Draw original image to off-screen canvas at full resolution.
 *   2. fillRect with '#000000' (opaque black) — overwrites pixels directly.
 *   3. canvas.toDataURL('image/jpeg', 0.92) produces a flat JPEG with no layers.
 *   The rawUrl is NEVER modified. processedUrl is the rasterised output.
 *
 * PRE-FLIGHT UI compliance (CLAUDE.md §17.1):
 * - text-xs/sm/base/lg/xl/2xl ONLY
 * - rounded-md ONLY (Dialog primitive uses larger radii as approved exception per SPEC-ARCH-UI-001)
 * - Gate not needed here (caller guards opening the dialog)
 * - i18n via useTranslations('shootsAi.lpRedaction.*')
 *
 * Spec reference: SPEC-SHOOTS-002 T07, L_AI-5, L_AI-12
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Dialog } from '@/src/components/primitives/dialog';
import { Button } from '@/src/components/primitives/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LpRedactionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Raw image dataUrl to redact */
  rawUrl: string;
  assetId: string;
  /** Called with the flat rasterised dataUrl (L_AI-12) */
  onConfirm: (assetId: string, redactedDataUrl: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert canvas-relative position to proportion (0..1) for resolution scaling */
function canvasPos(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LpRedactionDialog({
  open,
  onClose,
  rawUrl,
  assetId,
  onConfirm,
}: LpRedactionDialogProps) {
  const t = useTranslations('shootsAi');

  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startProp, setStartProp] = useState<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  // Minimum area threshold (100 px² in display pixels)
  const MIN_AREA = 100;
  const hasValidRect = rect !== null && Math.abs(rect.w) * Math.abs(rect.h) >= MIN_AREA;

  // Load raw image for canvas dimension queries
  useEffect(() => {
    if (!open) return;
    const img = new window.Image();
    img.onload = () => { imgRef.current = img; };
    img.src = rawUrl;
  }, [open, rawUrl]);

  // Redraw overlay whenever rect changes
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (rect) {
      // Draw semi-transparent red guide rectangle
      ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  }, [rect]);

  // ── Mouse handlers ──────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const prop = canvasPos(canvas, e.clientX, e.clientY);
    setStartProp(prop);
    setDrawing(true);
    setRect(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startProp) return;
    const canvas = overlayRef.current;
    if (!canvas) return;
    const prop = canvasPos(canvas, e.clientX, e.clientY);
    const w = canvas.width;
    const h = canvas.height;
    setRect({
      x: startProp.x * w,
      y: startProp.y * h,
      w: (prop.x - startProp.x) * w,
      h: (prop.y - startProp.y) * h,
    });
  }, [drawing, startProp]);

  const handleMouseUp = useCallback(() => {
    setDrawing(false);
  }, []);

  // Touch equivalents
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = overlayRef.current;
    if (!canvas || !e.touches[0]) return;
    const prop = canvasPos(canvas, e.touches[0].clientX, e.touches[0].clientY);
    setStartProp(prop);
    setDrawing(true);
    setRect(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing || !startProp || !e.touches[0]) return;
    const canvas = overlayRef.current;
    if (!canvas) return;
    const prop = canvasPos(canvas, e.touches[0].clientX, e.touches[0].clientY);
    const w = canvas.width;
    const h = canvas.height;
    setRect({
      x: startProp.x * w,
      y: startProp.y * h,
      w: (prop.x - startProp.x) * w,
      h: (prop.y - startProp.y) * h,
    });
  }, [drawing, startProp]);

  const handleTouchEnd = useCallback(() => {
    setDrawing(false);
  }, []);

  // ── Confirm handler — L_AI-12 rasterisation ─────────────────────────────
  const handleConfirm = useCallback(() => {
    const canvas = overlayRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !rect) return;

    // Off-screen canvas at full image resolution (L_AI-12)
    const off = document.createElement('canvas');
    off.width = img.naturalWidth || img.width;
    off.height = img.naturalHeight || img.height;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Step 1: Draw original image
    ctx.drawImage(img, 0, 0);

    // Step 2: Scale rect from display canvas to full image coordinates
    const scaleX = off.width / canvas.width;
    const scaleY = off.height / canvas.height;
    const rx = rect.x * scaleX;
    const ry = rect.y * scaleY;
    const rw = rect.w * scaleX;
    const rh = rect.h * scaleY;

    // Step 3: Fill opaque black rectangle (L_AI-12 — pixels are unrecoverable)
    ctx.fillStyle = '#000000';
    ctx.fillRect(rx, ry, rw, rh);

    // Step 4: toDataURL produces flat JPEG with no layer info (L_AI-12)
    const redactedDataUrl = off.toDataURL('image/jpeg', 0.92);

    onConfirm(assetId, redactedDataUrl);
    // Reset state
    setRect(null);
    setStartProp(null);
    onClose();
  }, [assetId, rect, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setRect(null);
    setStartProp(null);
    setDrawing(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('lpRedaction.title')}
      subtitle={t('lpRedaction.instructions')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={handleClose}>
            {t('actions.cancel') as string}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={!hasValidRect}
          >
            {t('lpRedaction.confirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Phase 2 promise banner */}
        <div className="flex items-start gap-2 rounded-md bg-accent/8 border border-accent/20 px-3 py-2">
          <Info size={14} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-ink-secondary">{t('lpRedaction.spynePromise')}</p>
        </div>

        {/* Canvas wrapper — relative container so overlay sits on top of image */}
        <div className="relative rounded-md overflow-hidden border border-line bg-bg-subtle">
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rawUrl}
            alt="Asset to redact"
            className="w-full block select-none"
            draggable={false}
          />

          {/* Overlay canvas for rectangle drawing */}
          <canvas
            ref={overlayRef}
            width={800}
            height={450}
            className="absolute inset-0 w-full h-full cursor-crosshair"
            aria-label={t('lpRedaction.canvasLabel') as string}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* Instruction text */}
        <p className="text-xs text-ink-muted">
          {hasValidRect
            ? t('lpRedaction.readyToConfirm')
            : t('lpRedaction.dragHint')}
        </p>
      </div>
    </Dialog>
  );
}
