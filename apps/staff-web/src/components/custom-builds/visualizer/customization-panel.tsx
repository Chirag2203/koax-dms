/**
 * CustomizationPanel — tabbed 3D customization controls for the Ferrari visualizer.
 *
 * Renders inside VisualizerTab right rail when is3DSupported=true (L57).
 * Manages 8 customization categories: Paint | Wheels | Tint | Exhaust | Ride | Hood | Wing | Decals.
 * Plus a Presets section above the category tabs (L91).
 *
 * P3.3.0: Initial scaffold with category tabs and placeholder panels.
 * P3.3.1: Tint + Exhaust wired.
 * P3.3.2: Wheel + Suspension wired.
 * P3.3.3: Decals wired.
 * P3.3.6: Hood + Wing added. All categories upgraded to priced option cards (L82).
 *         Wheel/Tint/Exhaust/Suspension now drive both legacy material fields AND
 *         new priced catalog IDs (L78).
 * L91: Presets section — 5 one-click bundles above the category tabs.
 *
 * L64: All controls use existing design-system primitives (cn from @dms/ui, lucide-react).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §36, L57–L64, L78–L82, §38 L91
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  CircleDot, SunDim, Flame, ArrowUpDown, Sticker, RotateCcw,
  Paintbrush, Check, Wind, Square, Flag, Zap, Award, Moon, Sparkles,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@dms/ui';
import type { VisualizerCustomizations } from '@dms/types';
import {
  CUSTOMIZATION_PRESETS,
  computePresetTotal,
  presetToCustomizations,
  type CustomizationPreset,
} from '@/src/lib/custom-builds/customization-presets';
import { formatINR } from '../shared/format-inr';
import { WheelCustomizer } from './wheel-customizer';
import { TintCustomizer } from './tint-customizer';
import { ExhaustCustomizer } from './exhaust-customizer';
import { SuspensionCustomizer } from './suspension-customizer';
import { DecalCustomizer } from './decal-customizer';
import { HoodCustomizer } from './hood-customizer';
import { WingCustomizer } from './wing-customizer';
import { PAINT_PALETTE, type PaintColor } from '@/src/lib/custom-builds/paint-palette';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustomizationPanelProps {
  customizations: VisualizerCustomizations;
  onChange: (update: Partial<VisualizerCustomizations>) => void;
  onReset: () => void;
  /** L72: activePaintKey from parent (2D paint state migrated into 3D panel) */
  activePaintKey?: string | null;
  onSelectPaint?: (key: string | null) => void;
  /** L91: Called when a preset is applied — parent handles paint + customizations */
  onApplyPreset?: (preset: CustomizationPreset) => void;
  className?: string;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type PanelTab = 'paint' | 'wheels' | 'tint' | 'exhaust' | 'suspension' | 'hood' | 'wing' | 'decals';

const PANEL_TABS: { id: PanelTab; label: string; Icon: React.ElementType }[] = [
  { id: 'paint',      label: 'Paint',  Icon: Paintbrush },
  { id: 'wheels',     label: 'Wheels', Icon: CircleDot },
  { id: 'tint',       label: 'Tint',   Icon: SunDim },
  { id: 'exhaust',    label: 'Exhaust',Icon: Flame },
  { id: 'suspension', label: 'Ride',   Icon: ArrowUpDown },
  { id: 'hood',       label: 'Hood',   Icon: Square },
  { id: 'wing',       label: 'Wing',   Icon: Wind },
  { id: 'decals',     label: 'Decals', Icon: Sticker },
];

// ─── Tab bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: PanelTab;
  onSelect: (t: PanelTab) => void;
}

function TabBar({ active, onSelect }: TabBarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="flex gap-0.5 px-2 pt-2 pb-1 overflow-x-auto flex-shrink-0"
      role="tablist"
      aria-label="3D customization categories"
    >
      {PANEL_TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`customization-panel-${id}`}
            onClick={() => onSelect(id)}
            className={cn(
              'relative flex-shrink-0 flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg',
              'text-[13px] font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            {isActive && (
              <motion.span
                layoutId="custom-panel-tab-pill"
                className="absolute inset-0 rounded-lg bg-white/10 border border-white/15"
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 30 }
                }
                aria-hidden
              />
            )}
            <Icon size={13} aria-hidden className="relative z-10" />
            <span className="relative z-10 leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Paint swatch grid (migrated from PartPickerRail for 3D mode — L72) ───────

interface PaintSwatchGridProps {
  activePaintKey: string | null;
  onSelect: (key: string | null) => void;
}

function PaintSwatchGrid({ activePaintKey, onSelect }: PaintSwatchGridProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="px-3 py-3 overflow-y-auto">
      <p className="text-[12px] text-white/40 uppercase tracking-widest mb-2.5 px-1">
        12 Luxury Colours
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PAINT_PALETTE.map((paint: PaintColor) => {
          const isActive = activePaintKey === paint.key;
          return (
            <motion.button
              key={paint.key}
              type="button"
              aria-pressed={isActive}
              aria-label={`${paint.name} — ${paint.brand} — ${formatINR(paint.listPrice)}`}
              onClick={() => onSelect(isActive ? null : paint.key)}
              whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-2 rounded-xl text-center',
                'border transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isActive
                  ? 'border-white/30 bg-white/8'
                  : 'border-white/5 bg-white/3 hover:border-white/15 hover:bg-white/6',
              )}
            >
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-full border-2 transition-all duration-200"
                  style={{
                    backgroundColor: paint.hex,
                    borderColor: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? `0 0 12px ${paint.hex}60, 0 0 4px ${paint.hex}80` : undefined,
                  }}
                />
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-hidden
                  >
                    <Check size={12} className="text-white drop-shadow-md" />
                  </motion.div>
                )}
              </div>
              <span className="text-[11px] text-white/60 leading-tight font-medium line-clamp-2">
                {paint.name}
              </span>
              <span className="text-[11px] text-white/35 font-mono leading-none">
                {formatINR(paint.listPrice)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Preset icon map ──────────────────────────────────────────────────────────

const PRESET_ICON_MAP: Record<string, React.ElementType> = {
  Flag,
  Zap,
  Award,
  Moon,
  Sparkles,
};

// ─── Presets section ──────────────────────────────────────────────────────────

interface PresetsSectionProps {
  onApply: (preset: CustomizationPreset) => void;
}

function PresetsSection({ onApply }: PresetsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="border-b border-white/6 flex-shrink-0">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-expanded={expanded}
        aria-controls="presets-panel"
      >
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">
          Presets
        </span>
        {expanded ? (
          <ChevronUp size={13} className="text-white/40" aria-hidden />
        ) : (
          <ChevronDown size={13} className="text-white/40" aria-hidden />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id="presets-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1">
              {CUSTOMIZATION_PRESETS.map((preset) => {
                const Icon = PRESET_ICON_MAP[preset.icon] ?? Sparkles;
                const total = computePresetTotal(preset);
                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    onClick={() => onApply(preset)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left',
                      'border border-white/6 bg-white/3 hover:bg-white/7 hover:border-white/12',
                      'transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    )}
                    aria-label={`Apply ${preset.name} preset — ${preset.description}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-accent" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white/80 leading-tight truncate">
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-white/35 leading-snug line-clamp-1 mt-0.5">
                        {preset.description}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-white/50 flex-shrink-0 tabular-nums">
                      {formatINR(total)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Active customization indicators ─────────────────────────────────────────

function hasCustomization(
  tab: PanelTab,
  customizations: VisualizerCustomizations,
  activePaintKey?: string | null,
): boolean {
  switch (tab) {
    case 'paint':      return !!activePaintKey;
    case 'wheels':     return !!(customizations.wheelMaterial || (customizations.wheelOptionId && customizations.wheelOptionId !== 'wheel-stock'));
    case 'tint':       return !!(customizations.tint || (customizations.tintOptionId && customizations.tintOptionId !== 'tint-stock'));
    case 'exhaust':    return !!(customizations.exhaust || (customizations.exhaustOptionId && customizations.exhaustOptionId !== 'exh-stock'));
    case 'suspension': return !!(
      (customizations.suspension && customizations.suspension.loweringMm > 0) ||
      (customizations.suspensionOptionId && customizations.suspensionOptionId !== 'susp-stock')
    );
    case 'hood':       return !!(customizations.hoodOptionId && customizations.hoodOptionId !== 'hood-stock');
    case 'wing':       return !!(customizations.wingOptionId && customizations.wingOptionId !== 'wing-stock');
    case 'decals':     return (customizations.decals?.length ?? 0) > 0;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomizationPanel({
  customizations,
  onChange,
  onReset,
  activePaintKey = null,
  onSelectPaint,
  onApplyPreset,
  className,
}: CustomizationPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('paint');

  const hasAnyCustomization =
    PANEL_TABS.some((t) => hasCustomization(t.id, customizations, activePaintKey));

  return (
    <div className={cn('flex flex-col h-full overflow-hidden relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6 flex-shrink-0">
        <span className="text-[13px] font-semibold text-white/80">3D Customization</span>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasAnyCustomization}
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            hasAnyCustomization
              ? 'text-white/50 hover:text-white/80 hover:bg-white/6'
              : 'text-white/20 opacity-40 cursor-not-allowed',
          )}
          aria-label="Reset all 3D customizations to stock"
        >
          <RotateCcw size={11} aria-hidden />
          Reset all
        </button>
      </div>

      {/* Presets section (L91) */}
      {onApplyPreset && (
        <PresetsSection onApply={onApplyPreset} />
      )}

      {/* Tab bar with active-customization dots */}
      <div className="relative flex-shrink-0">
        <TabBar active={activeTab} onSelect={setActiveTab} />
        {/* Active-customization indicator dots */}
        <div className="absolute top-1.5 right-2 flex gap-1 pointer-events-none" aria-hidden>
          {PANEL_TABS.map((t) =>
            hasCustomization(t.id, customizations, activePaintKey) ? (
              <span
                key={t.id}
                className="w-1.5 h-1.5 rounded-full bg-accent"
                title={`${t.label} customized`}
              />
            ) : null,
          )}
        </div>
      </div>

      {/* Panel content
          pointer-events: auto + relative z-10 ensure all inputs
          are reachable even when the R3F canvas sits in a sibling
          absolute-positioned container (Fix 3 — L73). */}
      <div
        id={`customization-panel-${activeTab}`}
        role="tabpanel"
        aria-label={`${activeTab} customization`}
        className="flex-1 overflow-y-auto min-h-0 relative z-10 pointer-events-auto"
      >
        {activeTab === 'paint' && (
          <PaintSwatchGrid
            activePaintKey={activePaintKey ?? null}
            onSelect={onSelectPaint ?? (() => {})}
          />
        )}

        {activeTab === 'wheels' && (
          <WheelCustomizer
            value={customizations.wheelMaterial}
            onChange={(wheelMaterial) => onChange({ wheelMaterial })}
            selectedOptionId={customizations.wheelOptionId}
            onSelectOption={(wheelOptionId) => onChange({ wheelOptionId })}
          />
        )}

        {activeTab === 'tint' && (
          <TintCustomizer
            value={customizations.tint}
            onChange={(tint) => onChange({ tint })}
            selectedOptionId={customizations.tintOptionId}
            onSelectOption={(tintOptionId) => onChange({ tintOptionId })}
          />
        )}

        {activeTab === 'exhaust' && (
          <ExhaustCustomizer
            value={customizations.exhaust}
            onChange={(exhaust) => onChange({ exhaust })}
            selectedOptionId={customizations.exhaustOptionId}
            onSelectOption={(exhaustOptionId) => onChange({ exhaustOptionId })}
          />
        )}

        {activeTab === 'suspension' && (
          <SuspensionCustomizer
            value={customizations.suspension}
            onChange={(suspension) => onChange({ suspension })}
            selectedOptionId={customizations.suspensionOptionId}
            onSelectOption={(suspensionOptionId) => onChange({ suspensionOptionId })}
          />
        )}

        {activeTab === 'hood' && (
          <HoodCustomizer
            selectedOptionId={customizations.hoodOptionId ?? 'hood-stock'}
            onSelectOption={(hoodOptionId) => onChange({ hoodOptionId })}
          />
        )}

        {activeTab === 'wing' && (
          <WingCustomizer
            selectedOptionId={customizations.wingOptionId ?? 'wing-stock'}
            onSelectOption={(wingOptionId) => onChange({ wingOptionId })}
          />
        )}

        {activeTab === 'decals' && (
          <DecalCustomizer
            value={customizations.decals ?? []}
            onChange={(decals) => onChange({ decals })}
          />
        )}
      </div>
    </div>
  );
}
