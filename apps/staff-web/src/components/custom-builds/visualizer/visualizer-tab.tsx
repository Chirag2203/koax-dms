/**
 * VisualizerTab — premium showroom configurator layout.
 *
 * P3.2: 3D viewer for Porsche 911 Carrera S. Other vehicles fall back to
 * 2D SVG viewer with "3D model coming soon" banner.
 *
 * L28 (locked): Transient client state for R09+; save persists to BuildJob.
 * L35 (locked): 5 base cars (Porsche 911, BMW M4, Audi RS5, AMG GT, Audi R8).
 * L36 (locked): Paint via CSS filter from paint-palette.ts.
 * L37 (locked): Showroom backdrop, floor reflection, ambient glow.
 * L51 (locked): 3D viewer for Porsche 911 Carrera S. 2D kept as fallback.
 * L52 (locked): Only 'porsche-911' has a 3D GLB in v0. Others show "coming soon".
 * L56 (locked): 3D canvas lazy-loaded via dynamic import (ssr: false).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9, §24, §30
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, Box } from 'lucide-react';
import type { BuildJob } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import {
  SUPPORTED_VEHICLES,
  getAllOverlays,
} from '@/src/lib/custom-builds/visualizer-assets';
import { PAINT_BY_KEY } from '@/src/lib/custom-builds/paint-palette';
import {
  get3DAsset,
  has3DAsset,
  get3DSupportedSlugs,
} from '@/src/lib/custom-builds/visualizer-3d-assets';

// ─── Vehicle dropdown options (L57: Ferrari-only in v0) ─────────────────────
// Built directly from the 3D registry. SUPPORTED_VEHICLES (2D) doesn't include
// Ferrari, so we resolve via get3DAsset() to get the displayName.
const DROPDOWN_VEHICLES: { modelSlug: string; displayName: string }[] =
  get3DSupportedSlugs().map((slug) => {
    const asset = get3DAsset(slug);
    return {
      modelSlug: slug,
      displayName: asset.displayName,
    };
  });
import { VisualizerCanvas } from './visualizer-canvas';
import type { VisibleLayer } from './visualizer-canvas';
import type { VisualizerFineControls } from '@dms/types';
import { PartPickerRail } from './part-picker-rail';
import type { SelectedParts } from './part-picker-rail';
import { CostSummary } from './cost-summary';
import { CustomizationPanel } from './customization-panel';
import { CustomizationCostBreakdown } from './customization-cost-breakdown';
import { computeCustomizationCost } from '@/src/lib/custom-builds/customization-catalog';
import type { VisualizerCustomizations } from '@dms/types';
import {
  presetToCustomizations,
  type CustomizationPreset,
} from '@/src/lib/custom-builds/customization-presets';

// ─── Lazy-load 3D canvas (L56: ssr: false — three.js requires browser env) ─────

const Visualizer3DCanvas = dynamic(
  () =>
    import('./visualizer-3d-canvas').then((m) => ({
      default: m.Visualizer3DCanvas,
    })),
  {
    ssr: false,
    loading: () => <Canvas3DSkeleton />,
  },
);

// ─── Constants ────────────────────────────────────────────────────────────────

const PANEL_WIDTH_KEY = 'bn-customizer-panel-width';
const PANEL_MIN = 320;
const PANEL_MAX = 600;
const PANEL_DEFAULT = 420;

function getStoredPanelWidth(): number {
  if (typeof window === 'undefined') return PANEL_DEFAULT;
  const stored = localStorage.getItem(PANEL_WIDTH_KEY);
  if (!stored) return PANEL_DEFAULT;
  const n = Number(stored);
  if (Number.isNaN(n)) return PANEL_DEFAULT;
  return Math.max(PANEL_MIN, Math.min(PANEL_MAX, n));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface VisualizerTabProps {
  job: BuildJob;
}

// ─── Vehicle selector — premium dropdown ──────────────────────────────────────

interface VehicleSelectorProps {
  value: string;
  onChange: (slug: string) => void;
}

function VehicleSelector({ value, onChange }: VehicleSelectorProps) {
  return (
    <div className="relative flex items-center gap-2">
      <label htmlFor="viz-vehicle-select" className="sr-only">
        Base vehicle model
      </label>
      <div className="relative flex items-center">
        <Sparkles
          size={12}
          className="absolute left-2.5 text-accent/60 pointer-events-none"
          aria-hidden
        />
        <select
          id="viz-vehicle-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[
            'pl-8 pr-7 py-1.5 rounded-lg text-[12px] font-semibold text-white/80',
            'bg-white/5 border border-white/10 appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent/30',
            'transition-all hover:bg-white/8 hover:border-white/15',
          ].join(' ')}
        >
          {DROPDOWN_VEHICLES.map((v) => (
            <option
              key={v.modelSlug}
              value={v.modelSlug}
              className="bg-slate-900 text-white"
            >
              {v.displayName}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-2 text-white/40 pointer-events-none"
          aria-hidden
        />
      </div>
      {/* 3D badge for supported vehicles */}
      {has3DAsset(value) && (
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
        >
          <Box size={9} aria-hidden />
          3D
        </motion.span>
      )}
      <span className="text-[10px] text-white/25 hidden sm:block">
        5 base models
      </span>
    </div>
  );
}

// ─── Loading skeleton for 3D canvas ───────────────────────────────────────────

function Canvas3DSkeleton() {
  return (
    <div
      className="w-full rounded-xl relative overflow-hidden flex flex-col items-center justify-center gap-4"
      style={{
        aspectRatio: '16/9',
        background:
          'radial-gradient(ellipse 80% 60% at 50% 30%, #1e2a3a 0%, #0d1117 60%, #070b12 100%)',
      }}
    >
      {/* Car silhouette skeleton */}
      <div className="relative w-64 h-32" aria-hidden>
        <svg
          viewBox="0 0 320 160"
          fill="none"
          className="w-full h-full opacity-20 animate-pulse"
        >
          <path
            d="M40,120 L55,88 L80,65 L160,58 L240,65 L270,88 L280,120 Z"
            fill="#334155"
          />
          <path
            d="M55,88 L70,70 L100,58 L160,55 L220,58 L255,70 L270,88 Z"
            fill="#1e293b"
          />
          <circle cx="90" cy="120" r="18" fill="#1e293b" />
          <circle cx="230" cy="120" r="18" fill="#1e293b" />
        </svg>
      </div>
      <p className="text-[13px] text-white/40 font-medium tracking-wide">
        Loading 3D viewer...
      </p>
    </div>
  );
}

// ─── "Coming soon" banner for non-3D vehicles ──────────────────────────────────

function ComingSoon3DBanner({ displayName }: { displayName: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-[12px] text-white/50">
      <Box size={13} className="text-white/30 shrink-0" aria-hidden />
      <span>
        3D model for{' '}
        <span className="text-white/70 font-medium">{displayName}</span> is
        coming soon — currently only available for Ferrari builds.
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VisualizerTab({ job }: VisualizerTabProps) {
  const { user } = useStaffAuth();
  const saveVisualizerState = useCustomBuildsStore((s) => s.saveVisualizerState);
  const { toasts, toast, dismiss } = useToast();

  const inferredSlug = inferModelSlugFromJob(job);
  // L57: Visualizer is Ferrari-only in v0. The dropdown shows Ferrari only.
  // If the inferred slug is something else, default to the first 3D-supported
  // entry (Ferrari) so the picker stays consistent with what's selectable.
  const defaultSlug = DROPDOWN_VEHICLES[0]?.modelSlug ?? 'ferrari';
  const [modelSlug, setModelSlug] = useState<string>(
    job.visualizerState?.modelSlug ?? inferredSlug ?? defaultSlug,
  );

  const [selectedParts, setSelectedParts] = useState<SelectedParts>(() => {
    if (job.visualizerState?.layers) {
      const restored: SelectedParts = {};
      for (const layer of job.visualizerState.layers) {
        if (layer.visible) restored[layer.category] = layer.variantSlug;
      }
      return restored;
    }
    return {};
  });

  // Paint state (separate from overlay parts — L36)
  const [activePaintKey, setActivePaintKey] = useState<string | null>(
    (job.visualizerState as { paintKey?: string } | undefined)?.paintKey ??
      null,
  );

  // L48 — Fine-control slider state (window tint, paint metallic, wheel size)
  const [fineControls, setFineControls] = useState<VisualizerFineControls>(() => ({
    windowTintIntensity:
      job.visualizerState?.fineControls?.windowTintIntensity ?? 70,
    paintMetallicIntensity:
      job.visualizerState?.fineControls?.paintMetallicIntensity ?? 50,
    wheelSize: job.visualizerState?.fineControls?.wheelSize ?? 20,
  }));

  // P3.3: 3D customization state
  const [customizations, setCustomizations] = useState<VisualizerCustomizations>(() => ({
    wheelMaterial: job.visualizerState?.customizations?.wheelMaterial,
    decals: job.visualizerState?.customizations?.decals ?? [],
    tint: job.visualizerState?.customizations?.tint,
    exhaust: job.visualizerState?.customizations?.exhaust,
    suspension: job.visualizerState?.customizations?.suspension,
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // L92: Draggable panel width (320–600px, default 420, persisted to localStorage)
  const [panelWidth, setPanelWidth] = useState<number>(PANEL_DEFAULT);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(PANEL_DEFAULT);

  // Restore from localStorage on mount (client-only)
  useEffect(() => {
    setPanelWidth(getStoredPanelWidth());
  }, []);

  const handleDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartWidthRef.current = panelWidth;
      e.preventDefault();

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const delta = dragStartXRef.current - ev.clientX; // drag left → widen panel
        const newWidth = Math.max(
          PANEL_MIN,
          Math.min(PANEL_MAX, dragStartWidthRef.current + delta),
        );
        setPanelWidth(newWidth);
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
        setPanelWidth((w) => {
          localStorage.setItem(PANEL_WIDTH_KEY, String(w));
          return w;
        });
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [panelWidth],
  );

  const role = user?.role ?? 'R05';
  const canSave = hasRank(role, 'R09');
  const isDelivered = job.stage === 'DELIVERED';

  const markDirty = useCallback(() => setIsSaved(false), []);

  const handleFineControlChange = useCallback(
    (key: keyof VisualizerFineControls, value: number) => {
      setFineControls((prev) => ({ ...prev, [key]: value }));
      markDirty();
    },
    [markDirty],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleVehicleChange = useCallback(
    (slug: string) => {
      setModelSlug(slug);
      setSelectedParts({});
      setActivePaintKey(null);
      markDirty();
    },
    [markDirty],
  );

  const handleTogglePart = useCallback(
    (category: string, key: string, _label: string, _price: number) => {
      setSelectedParts((prev) => {
        const next = { ...prev };
        if (next[category] === key) {
          delete next[category];
        } else {
          next[category] = key;
        }
        return next;
      });
      markDirty();
    },
    [markDirty],
  );

  const handleSelectPaint = useCallback(
    (paintKey: string | null) => {
      setActivePaintKey(paintKey);
      markDirty();
    },
    [markDirty],
  );

  const handleReset = useCallback(() => {
    setSelectedParts({});
    setActivePaintKey(null);
    markDirty();
  }, [markDirty]);

  const handleCustomizationsChange = useCallback(
    (update: Partial<VisualizerCustomizations>) => {
      setCustomizations((prev) => ({ ...prev, ...update }));
      markDirty();
    },
    [markDirty],
  );

  const handleCustomizationsReset = useCallback(() => {
    setCustomizations({ decals: [] });
    markDirty();
  }, [markDirty]);

  const handleApplyPreset = useCallback(
    (preset: CustomizationPreset) => {
      setCustomizations(presetToCustomizations(preset));
      setActivePaintKey(preset.paintColorId);
      markDirty();
      toast(`Applied "${preset.name}"`, 'success');
    },
    [markDirty, toast],
  );

  const handleSave = useCallback(async () => {
    if (!canSave || isDelivered) return;
    if (!user) return;

    setIsSaving(true);
    try {
      const layers = Object.entries(selectedParts).map(
        ([category, variantSlug]) => ({
          category,
          variantSlug,
          visible: true,
        }),
      );
      saveVisualizerState(
        job.id,
        {
          modelSlug,
          layers,
          savedAt: new Date().toISOString(),
          savedBy: user.id,
          fineControls, // L48 — persist fine controls
          customizations, // P3.3 — persist 3D customizations
          // L93: persist paint key so preview can reconstruct the color
          ...(activePaintKey ? { paintKey: activePaintKey } : {}),
        } as Parameters<typeof saveVisualizerState>[1],
        { id: user.id, name: user.name, role: user.role },
      );
      setIsSaved(true);
      toast('Visualizer state saved to build.', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed.';
      toast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    canSave,
    isDelivered,
    user,
    selectedParts,
    modelSlug,
    job.id,
    saveVisualizerState,
    toast,
    fineControls,
    customizations,
  ]);

  const handleShare = useCallback(() => {
    if (job.quoteToken) {
      const url = `${window.location.origin}/custom-builds/preview/${job.quoteToken}`;
      void navigator.clipboard
        .writeText(url)
        .then(() => {
          toast(
            `Share link copied (expires ${formatExpiry(job.quoteExpiresAt)})`,
            'success',
          );
        })
        .catch(() => {
          toast(
            `Share URL: /custom-builds/preview/${job.quoteToken}`,
            'info',
          );
        });
    } else {
      toast(
        'Save a quote first (Parts & Estimate tab) to generate a shareable link.',
        'info',
      );
    }
  }, [job.quoteToken, job.quoteExpiresAt, toast]);

  // ── Visible layers ─────────────────────────────────────────────────────────

  const visibleLayers: VisibleLayer[] = Object.entries(selectedParts).map(
    ([category, key]) => ({ key, category, label: key }),
  );

  // ── Live cost total (parts + paint) ───────────────────────────────────────
  const allOverlayMap = buildOverlayPriceMap();
  const paintCost = activePaintKey
    ? (PAINT_BY_KEY[activePaintKey]?.listPrice ?? 0)
    : 0;
  const totalCost = Object.values(selectedParts).reduce(
    (sum, key) => sum + (allOverlayMap[key] ?? 0),
    paintCost,
  );

  // ── L89: Full 3D customization total (excl. paint — paint is in totalCost) ──
  // CustomizationCostBreakdown already aggregates the correct full breakdown;
  // reuse computeCustomizationCost to pass the non-paint sub-total to CostSummary.
  const customizationBreakdown = computeCustomizationCost({
    wheelOptionId: customizations.wheelOptionId,
    tintOptionId: customizations.tintOptionId,
    exhaustOptionId: customizations.exhaustOptionId,
    suspensionOptionId: customizations.suspensionOptionId,
    hoodOptionId: customizations.hoodOptionId,
    wingOptionId: customizations.wingOptionId,
    decalCount: customizations.decals?.length ?? 0,
  });
  // Pass the catalog sub-total (without paint — paint already in totalCost via paintCost)
  const catalogSubtotal = customizationBreakdown.subtotal;

  // ── 3D asset resolution ────────────────────────────────────────────────────
  const asset3D = get3DAsset(modelSlug);
  const is3DSupported = asset3D.supported;
  const paintHex = activePaintKey ? PAINT_BY_KEY[activePaintKey]?.hex : undefined;

  return (
    <div
      className="flex flex-col h-full bg-[#0a0f1a]"
      data-testid="visualizer-tab"
    >
      {/* Top bar */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="flex items-center gap-4 px-4 py-2.5 border-b border-white/6 bg-black/30 flex-shrink-0"
          >
            <VehicleSelector value={modelSlug} onChange={handleVehicleChange} />
            <span className="flex-1" />
            {activePaintKey && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="text-[11px] text-white/35 hidden sm:block font-medium"
              >
                {PAINT_BY_KEY[activePaintKey]?.name ?? 'Custom paint'}
              </motion.span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 2-column layout */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex flex-col p-3 lg:p-5 overflow-y-auto gap-4">
          {/* "Coming soon" banner for non-3D vehicles (L51) */}
          {!is3DSupported && !isFullscreen && (
            <ComingSoon3DBanner
              displayName={
                SUPPORTED_VEHICLES.find((v) => v.modelSlug === modelSlug)
                  ?.displayName ?? modelSlug
              }
            />
          )}

          {/* 3D canvas for supported vehicles (Ferrari in v0, L57) */}
          {is3DSupported ? (
            <Visualizer3DCanvas
              asset={asset3D}
              paintColor={paintHex}
              wheelSize={fineControls.wheelSize}
              customizations={customizations}
              onFullscreenChange={setIsFullscreen}
            />
          ) : (
            // 2D fallback for other vehicles (WebGL unavailable OR non-3D model)
            <VisualizerCanvas
              modelSlug={modelSlug}
              visibleLayers={visibleLayers}
              activePaintKey={activePaintKey}
              paintMetallicIntensity={fineControls.paintMetallicIntensity}
              windowTintIntensity={fineControls.windowTintIntensity}
              onFullscreenChange={setIsFullscreen}
            />
          )}
        </div>

        {/* Right rail — 3D: CustomizationPanel + PartPickerRail; 2D: PartPickerRail only */}
        <AnimatePresence>
          {!isFullscreen && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, width: 0, overflow: 'hidden' }}
              className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden border-t lg:border-t-0 lg:border-l border-white/6 bg-gradient-to-b from-black/30 to-black/15 min-h-0 relative"
              style={{ width: panelWidth }}
            >
              {/* L92: Drag handle (desktop only) */}
              <div
                onMouseDown={handleDragHandleMouseDown}
                className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 group"
                role="separator"
                aria-label="Resize customization panel"
                aria-orientation="vertical"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/0 group-hover:bg-accent/60 transition-colors duration-150" />
              </div>
              {is3DSupported ? (
                /* L72 (Fix 6): 3D mode — show ONLY the CustomizationPanel.
                   The 2D PartPickerRail (Paint/Aero/Wheels/Wrap overlays) is
                   hidden in 3D mode to avoid two stacked configurator panels.
                   Paint is accessible via the Paint swatch in the 3D right rail.
                   2D-only Aero/Wrap overlays are not applicable to the 3D Ferrari.
                */
                <div className="flex flex-col h-full overflow-hidden">
                  <CustomizationPanel
                    customizations={customizations}
                    onChange={handleCustomizationsChange}
                    onReset={handleCustomizationsReset}
                    activePaintKey={activePaintKey}
                    onSelectPaint={handleSelectPaint}
                    onApplyPreset={handleApplyPreset}
                  />
                </div>
              ) : (
                /* 2D fallback mode — show the classic 2D PartPickerRail */
                <PartPickerRail
                  selectedParts={selectedParts}
                  activePaintKey={activePaintKey}
                  onTogglePart={handleTogglePart}
                  onSelectPaint={handleSelectPaint}
                  onReset={handleReset}
                  totalCost={totalCost}
                  fineControls={fineControls}
                  onFineControlChange={handleFineControlChange}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile stacked panel (no drag — L92) */}
        {!isFullscreen && (
          <div className="lg:hidden w-full flex-shrink-0 flex flex-col overflow-hidden border-t border-white/6 bg-gradient-to-b from-black/30 to-black/15">
            {is3DSupported ? (
              <div className="flex flex-col overflow-hidden" style={{ maxHeight: '50vh' }}>
                <CustomizationPanel
                  customizations={customizations}
                  onChange={handleCustomizationsChange}
                  onReset={handleCustomizationsReset}
                  activePaintKey={activePaintKey}
                  onSelectPaint={handleSelectPaint}
                  onApplyPreset={handleApplyPreset}
                />
              </div>
            ) : (
              <PartPickerRail
                selectedParts={selectedParts}
                activePaintKey={activePaintKey}
                onTogglePart={handleTogglePart}
                onSelectPaint={handleSelectPaint}
                onReset={handleReset}
                totalCost={totalCost}
                fineControls={fineControls}
                onFineControlChange={handleFineControlChange}
              />
            )}
          </div>
        )}
      </div>

      {/* Customization cost breakdown — shown in 3D mode above the cost summary footer */}
      <AnimatePresence>
        {!isFullscreen && is3DSupported && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="flex-shrink-0 bg-black/20 border-t border-white/6"
          >
            <CustomizationCostBreakdown
              customizations={customizations}
              activePaintKey={activePaintKey}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cost summary */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="flex-shrink-0"
          >
            <CostSummary
              job={job}
              selectedTotal={totalCost}
              customizationTotal={is3DSupported ? catalogSubtotal : 0}
              isSaving={isSaving}
              isSaved={isSaved}
              onSave={handleSave}
              onShare={handleShare}
              canSave={canSave}
              isDelivered={isDelivered}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// L57: Ferrari is the only 3D-supported model in v0; demo all builds against it.
function inferModelSlugFromJob(_job: BuildJob): string {
  return 'ferrari';
}

function buildOverlayPriceMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const o of getAllOverlays()) {
    map[o.key] = o.listPrice;
  }
  return map;
}

function formatExpiry(expiresAt?: string): string {
  if (!expiresAt) return 'unknown date';
  return new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

