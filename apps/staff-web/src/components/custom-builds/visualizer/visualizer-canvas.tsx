/**
 * VisualizerCanvas — premium showroom presentation canvas.
 *
 * @deprecated — superseded by Visualizer3DCanvas (3D viewer, P3.2).
 *   Kept as WebGL fallback (L51) and for non-3D vehicles (L52).
 *   Will be removed in v2.0 cleanup.
 *
 * L4  (locked, deprecated): PNG/SVG layer compositing only — no Three.js, no WebGL.
 *   Superseded by L51 (3D rendering). Retained as fallback when WebGL unavailable.
 * L5  (locked, deprecated): 2D SVG approach. Superseded by L51.
 * L35 (locked): 5 base cars, all detailed multi-layer SVG.
 * L36 (locked): Paint via CSS filter (hue-rotate + saturate + brightness).
 * L37 (locked): Showroom backdrop: layered gradient + floor reflection + vignette.
 *   Ambient glow picks up active paint color.
 * L38 (locked): Compare slider, fullscreen mode, paint picker, ticker — P3.1 polish.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9.1, §17, §24
 */

'use client';

import {
  useReducedMotion,
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';
import { useRef, useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2, GitCompare } from 'lucide-react';
import { cn } from '@dms/ui';
import { getBaseLayer, getOverlayLayer } from '@/src/lib/custom-builds/visualizer-assets';
import { getPaintFilter, PAINT_BY_KEY } from '@/src/lib/custom-builds/paint-palette';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisibleLayer {
  key: string;
  category: string;
  label: string;
}

export interface VisualizerCanvasProps {
  modelSlug: string;
  visibleLayers: VisibleLayer[];
  activePaintKey?: string | null;
  /**
   * L48 — paint metallic intensity (0–100). Modulates brightness + saturate on
   * top of the base paint CSS filter. 50 = neutral (no change). 0 = flat/matte,
   * 100 = high-gloss metallic.
   */
  paintMetallicIntensity?: number;
  /**
   * L48 — window tint opacity (0–100). Applied as opacity on the window-tint
   * overlay layer. 0 = clear, 100 = blackout.
   */
  windowTintIntensity?: number;
  readOnly?: boolean;
  className?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// ─── Compare slider ───────────────────────────────────────────────────────────

function CompareSlider({ layers, baseImg, paintFilter }: {
  layers: Array<{ key: string; asset: { src: string; zIndex: number }; label: string }>;
  baseImg: string;
  paintFilter: string | undefined;
}) {
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = constraintsRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    obs.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => obs.disconnect();
  }, []);

  // divider position as fraction (0–1)
  const fraction = useTransform(x, [-containerWidth / 2, containerWidth / 2], [0, 1]);
  const clipPct = useTransform(fraction, (v) => `${Math.round(Math.max(0, Math.min(100, v * 100)))}%`);

  return (
    <div ref={constraintsRef} className="relative w-full h-full select-none">
      {/* "Before" — stock, no overlays */}
      <img
        src={baseImg}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        style={{ filter: paintFilter }}
      />
      {/* "After" — with all overlays, clipped by slider */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: useTransform(clipPct, (v) => `inset(0 0 0 ${v})`) as unknown as string }}
      >
        <img
          src={baseImg}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ filter: paintFilter }}
        />
        {layers.map(({ key, asset }) => (
          <img
            key={key}
            src={asset.src}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ zIndex: asset.zIndex }}
          />
        ))}
      </motion.div>

      {/* Drag handle -->  */}
      <motion.div
        drag="x"
        dragConstraints={constraintsRef}
        dragElastic={0}
        dragMomentum={false}
        style={{ x, left: '50%' }}
        className="absolute top-0 bottom-0 -translate-x-px cursor-ew-resize z-50 flex items-center justify-center"
        whileDrag={{ scale: 1.1 }}
      >
        {/* Divider line */}
        <div className="absolute top-0 bottom-0 w-px bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
        {/* Handle pill */}
        <div className="relative z-10 w-8 h-8 rounded-full bg-white/90 border border-white shadow-lg flex items-center justify-center text-slate-700">
          <GitCompare size={14} aria-hidden />
        </div>
      </motion.div>
    </div>
  );
}

// ─── Floor reflection ─────────────────────────────────────────────────────────

function FloorReflection({ baseImg, paintFilter }: { baseImg: string; paintFilter: string | undefined }) {
  return (
    <div
      className="absolute left-0 right-0 pointer-events-none overflow-hidden"
      style={{ top: '78%', height: '22%' }}
      aria-hidden
    >
      <img
        src={baseImg}
        alt=""
        draggable={false}
        className="absolute w-full object-contain"
        style={{
          transform: 'scaleY(-1) translateY(-40%)',
          filter: `${paintFilter ?? ''} blur(2px)`,
          opacity: 0.18,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VisualizerCanvas({
  modelSlug,
  visibleLayers,
  activePaintKey,
  paintMetallicIntensity = 50,
  windowTintIntensity = 70,
  readOnly = false,
  className,
  onFullscreenChange,
}: VisualizerCanvasProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // ── Paint filter — base filter + metallic intensity modifier (L48) ─────────
  const basePaintFilter = getPaintFilter(activePaintKey);
  // metallic intensity: 0→matte (brightness 0.75, saturate 0.7),
  //                    50→neutral (brightness 1.0, saturate 1.0 — no change),
  //                   100→high-gloss (brightness 1.3, saturate 1.4)
  const metallicBrightness = 0.75 + (paintMetallicIntensity / 100) * 0.55;
  const metallicSaturate   = 0.7  + (paintMetallicIntensity / 100) * 0.7;
  const metallicModifier = activePaintKey
    ? ` brightness(${metallicBrightness.toFixed(2)}) saturate(${metallicSaturate.toFixed(2)})`
    : '';
  const paintFilter = basePaintFilter ? `${basePaintFilter}${metallicModifier}` : undefined;
  const paintColor = activePaintKey ? PAINT_BY_KEY[activePaintKey]?.hex : undefined;

  // ── Parallax tilt (mouse position) ────────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [2, -2]);
  const rotateY = useTransform(springX, [-0.5, 0.5], prefersReducedMotion ? [0, 0] : [-3, 3]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY, prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      onFullscreenChange?.(fs);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onFullscreenChange]);

  // ── Escape to exit fullscreen ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) void document.exitFullscreen();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // ── Asset resolution ───────────────────────────────────────────────────────
  const base = getBaseLayer(modelSlug);
  const resolvedLayers = visibleLayers
    .map((vl) => {
      const asset = getOverlayLayer(vl.key);
      return asset ? { ...vl, asset } : null;
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)
    .sort((a, b) => a.asset.zIndex - b.asset.zIndex);

  // ── Aria label ─────────────────────────────────────────────────────────────
  const activeNames = visibleLayers.map((l) => l.label).join(', ');
  const paintName = activePaintKey ? PAINT_BY_KEY[activePaintKey]?.name : null;
  const ariaLabel = [
    base.displayName,
    paintName ? `painted ${paintName}` : null,
    activeNames ? `with modifications: ${activeNames}` : 'stock configuration',
  ].filter(Boolean).join(', ');

  // ── Animation variants ─────────────────────────────────────────────────────
  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 260, damping: 22 };

  const fadeTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: 'easeInOut' };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-xl select-none group',
        isFullscreen && 'rounded-none',
        className,
      )}
      style={{ aspectRatio: '16 / 9' }}
      role="img"
      aria-label={ariaLabel}
    >
      {/* ── Showroom backdrop (L37) ────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #1e2a3a 0%, #0d1117 60%, #070b12 100%)',
        }}
        aria-hidden
      />
      {/* Warm spotlight from above */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(200,180,120,0.07) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      {/* Floor plane (horizontal gradient creating a reflective surface) */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: '72%',
          bottom: 0,
          background: 'linear-gradient(to bottom, rgba(15,20,30,0.0) 0%, rgba(8,12,20,0.85) 100%)',
        }}
        aria-hidden
      />
      {/* Vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 95% 95% at 50% 50%, transparent 60%, rgba(0,0,0,0.65) 100%)',
        }}
        aria-hidden
      />
      {/* Ambient glow from active paint color (L37) */}
      {paintColor && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 50% 65%, ${paintColor}18 0%, transparent 70%)`,
          }}
          aria-hidden
        />
      )}

      {/* ── Parallax tilt wrapper ─────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floor reflection (L37) */}
        {!compareMode && (
          <FloorReflection
            baseImg={base.src}
            paintFilter={paintFilter}
          />
        )}

        {/* ── Car layers ──────────────────────────────────────────────────── */}
        {compareMode ? (
          <CompareSlider
            layers={resolvedLayers}
            baseImg={base.src}
            paintFilter={paintFilter}
          />
        ) : (
          <>
            {/* Base car — rolls in on mount */}
            <motion.img
              key={`base-${modelSlug}`}
              src={base.src}
              alt=""
              aria-hidden
              draggable={false}
              initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 120 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -80 }}
              transition={springTransition}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ zIndex: 0, filter: paintFilter, transition: paintFilter ? 'filter 0.4s ease' : undefined }}
            />

            {/* Overlay layers with spring entrance */}
            <AnimatePresence>
              {resolvedLayers.map(({ key, asset, label, category }, i) => {
                // L48: window-tint overlay uses windowTintIntensity (0–100) as opacity
                const layerOpacity = category === 'window-tint'
                  ? windowTintIntensity / 100
                  : 1;
                return (
                  <motion.img
                    key={key}
                    src={asset.src}
                    alt=""
                    aria-hidden
                    draggable={false}
                    initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
                    animate={{ opacity: layerOpacity, scale: 1, transition: { ...springTransition, delay: prefersReducedMotion ? 0 : i * 0.05 } }}
                    exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.97, transition: fadeTransition }}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ zIndex: asset.zIndex, opacity: layerOpacity, transition: 'opacity 0.2s ease' }}
                    title={label}
                  />
                );
              })}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* ── Canvas toolbar (top-right) ─────────────────────────────────────── */}
      <div
        className={cn(
          'absolute top-3 right-3 flex items-center gap-2 z-50',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
          isFullscreen && 'opacity-100',
        )}
        aria-hidden={readOnly}
      >
        {/* Compare toggle */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => setCompareMode((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium',
              'backdrop-blur-md border transition-all',
              compareMode
                ? 'bg-accent/20 border-accent/40 text-accent'
                : 'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-black/60',
            )}
            aria-pressed={compareMode}
            aria-label="Toggle before/after compare slider"
          >
            <GitCompare size={12} aria-hidden />
            Compare
          </button>
        )}

        {/* Fullscreen toggle */}
        {!readOnly && (
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className={cn(
              'p-1.5 rounded-md backdrop-blur-md border transition-all',
              'bg-black/40 border-white/10 text-white/70 hover:text-white hover:bg-black/60',
            )}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen presentation mode'}
          >
            {isFullscreen
              ? <Minimize2 size={13} aria-hidden />
              : <Maximize2 size={13} aria-hidden />}
          </button>
        )}
      </div>

      {/* Read-only badge */}
      {readOnly && (
        <div
          className="absolute bottom-3 left-3 px-2 py-1 rounded text-[10px] font-mono text-accent bg-accent/10 border border-accent/20"
          aria-hidden
        >
          Preview
        </div>
      )}
    </div>
  );
}
