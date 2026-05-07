/**
 * LP auto-detect mock — SPEC-SHOOTS-002 L_AI-18
 *
 * `detectLicensePlate(rawUrl, kind): Promise<LpDetectionResult>`
 * Returns kind-aware bounding-box coordinates for the license-plate region.
 * The result is coords-only — it does NOT mutate the asset or call redactLicensePlate.
 * The store action `autoRedactAsset` consumes this, then rasterises via the L_AI-12
 * canvas pipeline, then dispatches `redactLicensePlate` to preserve audit trail.
 *
 * Kind-aware box rules (L_AI-18):
 *   - 3/4 shots (front_3q_driver, front_3q_passenger, rear_3q_driver, rear_3q_passenger)
 *       → bottom-center, 30% × 8%
 *   - profiles (driver_profile, passenger_profile)
 *       → lower-rear third, 25% × 7%
 *   - straight (front_straight, rear_straight)
 *       → bottom-center, 35% × 10%
 *   - interior (dashboard, rear_seats, odometer, engine_bay, boot)
 *       → { boxes: [] } — LP not subject (L_AI-5)
 *   - video_walkaround
 *       → { boxes: [] } — not auto-detectable; manual review required per L_AI-5
 *
 * Production replacement: swap the export for a real Spyne.ai detection call
 * behind the same interface. Route handler + store signatures are unchanged (L_AI-15).
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-18, §12
 */

import type { ShootAssetKind } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single detected license-plate bounding box (relative 0–1 coordinates). */
export interface LpBoundingBox {
  /** x offset from left edge (0–1 relative to image width) */
  x: number;
  /** y offset from top edge (0–1 relative to image height) */
  y: number;
  /** width as fraction of image width (0–1) */
  w: number;
  /** height as fraction of image height (0–1) */
  h: number;
  /** detection confidence score (0–1) */
  confidence: number;
}

/** Result returned by detectLicensePlate. */
export interface LpDetectionResult {
  /** Detected bounding boxes. Empty array = no plate detected or not applicable. */
  boxes: LpBoundingBox[];
}

// ─── Kind → box map ───────────────────────────────────────────────────────────

/**
 * Normalised center position for the license plate region by kind.
 * Coordinates are center-x, center-y, half-w, half-h — converted to box below.
 */
const KIND_BOX_MAP: Partial<
  Record<ShootAssetKind, { cx: number; cy: number; hw: number; hh: number; confidence: number }>
> = {
  // 3/4 shots — bottom-center 30% × 8%
  front_3q_driver:    { cx: 0.50, cy: 0.90, hw: 0.15, hh: 0.04, confidence: 0.91 },
  front_3q_passenger: { cx: 0.50, cy: 0.90, hw: 0.15, hh: 0.04, confidence: 0.89 },
  rear_3q_driver:     { cx: 0.50, cy: 0.88, hw: 0.15, hh: 0.04, confidence: 0.90 },
  rear_3q_passenger:  { cx: 0.50, cy: 0.88, hw: 0.15, hh: 0.04, confidence: 0.88 },
  // profiles — lower-rear third 25% × 7%
  driver_profile:     { cx: 0.82, cy: 0.86, hw: 0.125, hh: 0.035, confidence: 0.84 },
  passenger_profile:  { cx: 0.18, cy: 0.86, hw: 0.125, hh: 0.035, confidence: 0.83 },
  // straights — bottom-center 35% × 10%
  front_straight:     { cx: 0.50, cy: 0.89, hw: 0.175, hh: 0.05, confidence: 0.95 },
  rear_straight:      { cx: 0.50, cy: 0.89, hw: 0.175, hh: 0.05, confidence: 0.94 },
  // interior kinds and video_walkaround: no plate → handled by fallthrough below
};

// ─── detectLicensePlate ───────────────────────────────────────────────────────

/**
 * Detect license plate coordinates for a given asset.
 *
 * @param _rawUrl - Raw data URL of the unprocessed asset (unused in mock; present
 *   for production parity — real Spyne.ai call would POST this).
 * @param kind - The ShootAssetKind of the asset.
 * @returns Promise resolving to an LpDetectionResult with kind-aware bounding boxes.
 *
 * Mock simulates a ~120 ms round-trip (Spyne.ai typical p50 latency).
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-18, §12
 */
export function detectLicensePlate(
  _rawUrl: string,
  kind: ShootAssetKind,
): Promise<LpDetectionResult> {
  return new Promise((resolve) => {
    // Simulate network latency (~120 ms)
    setTimeout(() => {
      const center = KIND_BOX_MAP[kind];

      if (!center) {
        // Interior kinds + video_walkaround → no plate applicable
        resolve({ boxes: [] });
        return;
      }

      // Convert center-format to top-left-origin box
      const box: LpBoundingBox = {
        x: center.cx - center.hw,
        y: center.cy - center.hh,
        w: center.hw * 2,
        h: center.hh * 2,
        confidence: center.confidence,
      };
      resolve({ boxes: [box] });
    }, 120);
  });
}

/**
 * Rasterise a detected LP box onto the rawUrl using the L_AI-12 canvas pipeline.
 * Returns the flattened data URL with the redaction rectangle applied.
 *
 * This is a client-only operation (uses HTMLImageElement + HTMLCanvasElement).
 * Call only from browser context.
 *
 * The redacted region is filled with a solid RGB rectangle (unrecoverable per L_AI-12).
 *
 * @param rawUrl - The raw dataUrl of the asset to redact.
 * @param box - The bounding box to fill (relative 0–1 coordinates).
 * @returns Promise resolving to a flattened JPEG dataUrl with the LP region blacked out.
 */
export function rasteriseRedaction(rawUrl: string, box: LpBoundingBox): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      // L_AI-12: draw original image, then apply solid fill (no alpha)
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = '#1a1a1a'; // near-black — matches intake-inspection redaction style
      ctx.fillRect(
        Math.round(box.x * img.naturalWidth),
        Math.round(box.y * img.naturalHeight),
        Math.round(box.w * img.naturalWidth),
        Math.round(box.h * img.naturalHeight),
      );

      // L_AI-12: flatten to JPEG — no recoverable pixel layers
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('Failed to load image for redaction'));
    img.src = rawUrl;
  });
}
