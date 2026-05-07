'use client';

/**
 * SignaturePad — custom 60-line canvas component.
 *
 * Captures stroke events → produces base64 PNG via toDataURL on submit.
 * Plan risk row: rolled custom canvas over react-signature-canvas (~30 KB).
 *
 * L11: pii_sensitivity: medium — caller is responsible for gating display
 *       to R09/R03/R19+ only.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, RotateCcw, Check } from 'lucide-react';

export interface SignaturePadProps {
  /** Called when the user saves a signature — returns base64 PNG data URL */
  onSign: (dataUrl: string) => void;
  /** Called when user clears the pad */
  onClear?: () => void;
  /** Label shown above the canvas */
  label?: string;
  disabled?: boolean;
}

export function SignaturePad({ onSign, onClear, label, disabled = false }: SignaturePadProps) {
  const t = useTranslations('serviceIntake');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // ── Canvas init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // ── Pointer helpers ────────────────────────────────────────────────────────
  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }, [disabled, getPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  }, [disabled, getPos]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onClear?.();
  }, [onClear]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSign(dataUrl);
  }, [isEmpty, onSign]);

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>
      )}

      <div className={`rounded-md border ${disabled ? 'border-line opacity-50' : 'border-line bg-white'} overflow-hidden`}>
        <canvas
          ref={canvasRef}
          width={480}
          height={150}
          className="w-full block touch-none"
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          aria-label={label ?? t('fields.customerSignatureDataUrl.label')}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-line bg-bg-surface text-xs font-medium text-ink-secondary hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Clear signature"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Clear
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || isEmpty}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label="Save signature"
        >
          <Check className="h-3 w-3" aria-hidden="true" />
          Save
        </button>
        {isEmpty && (
          <span className="text-xs text-ink-muted" role="status">
            Draw above to sign
          </span>
        )}
      </div>
    </div>
  );
}
