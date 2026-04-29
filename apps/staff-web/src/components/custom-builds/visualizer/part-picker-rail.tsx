/**
 * PartPickerRail — premium glass-card configurator panel.
 *
 * Features: category tab bar with animated indicator pill, search bar,
 * glass-effect part cards with glow ring on selection, Framer Motion
 * list reordering, paint color swatch section.
 *
 * L38 (locked): Part picker rebuilt as glass-card premium panel (P3.1).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9.4, §24
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  RotateCcw, Search, Check, Wind, CircleDot, Layers, SunDim,
  ArrowUpDown, Flame, Cpu, Lightbulb, Paintbrush,
} from 'lucide-react';
import { cn } from '@dms/ui';
import {
  getAllOverlays,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
} from '@/src/lib/custom-builds/visualizer-assets';
import { PAINT_PALETTE, type PaintColor } from '@/src/lib/custom-builds/paint-palette';
import { formatINR } from '../shared/format-inr';
import { Slider } from '@/src/components/primitives/slider';
import type { VisualizerFineControls } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectedParts {
  [category: string]: string;
}

// VisualizerFineControls is imported from @dms/types (L48)

export interface PartPickerRailProps {
  selectedParts: SelectedParts;
  activePaintKey: string | null;
  onTogglePart: (category: string, key: string, label: string, listPrice: number) => void;
  onSelectPaint: (paintKey: string | null) => void;
  onReset: () => void;
  totalCost: number;
  /** L48 — fine controls exposed via Slider primitive */
  fineControls: VisualizerFineControls;
  onFineControlChange: (key: keyof VisualizerFineControls, value: number) => void;
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const CATEGORY_ICON_COMPONENTS: Record<string, React.ElementType> = {
  aero: Wind,
  wheels: CircleDot,
  paint: Paintbrush,
  wrap: Layers,
  'window-tint': SunDim,
  suspension: ArrowUpDown,
  exhaust: Flame,
  interior: Layers,
  ecu: Cpu,
  lighting: Lightbulb,
};

// ─── Category tabs ────────────────────────────────────────────────────────────

const TABS = ['paint', ...CATEGORY_ORDER.filter((c) => c !== 'paint')] as const;
type TabKey = typeof TABS[number];

interface TabBarProps {
  activeTab: TabKey;
  onTab: (t: TabKey) => void;
}

function TabBar({ activeTab, onTab }: TabBarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className="flex gap-0.5 px-2 pt-2 pb-1 overflow-x-auto scrollbar-thin-dark flex-shrink-0"
      role="tablist"
      aria-label="Part categories"
    >
      {TABS.map((tab) => {
        const Icon = CATEGORY_ICON_COMPONENTS[tab] ?? Layers;
        const label = CATEGORY_LABELS[tab] ?? tab;
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab}`}
            onClick={() => onTab(tab)}
            className={cn(
              'relative flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg',
              'text-[10px] font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
            )}
          >
            {/* Animated active pill */}
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-lg bg-white/10 border border-white/15"
                transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }}
                aria-hidden
              />
            )}
            <Icon size={14} aria-hidden className="relative z-10" />
            <span className="relative z-10 leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Paint swatch grid ────────────────────────────────────────────────────────

interface PaintSwatchGridProps {
  activePaintKey: string | null;
  onSelect: (key: string | null) => void;
}

function PaintSwatchGrid({ activePaintKey, onSelect }: PaintSwatchGridProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="px-3 py-3 overflow-y-auto flex-1">
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2.5 px-1">
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
              {/* Swatch circle */}
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-full border-2 transition-all duration-200"
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
              {/* Name */}
              <span className="text-[9px] text-white/60 leading-tight font-medium line-clamp-2">
                {paint.name}
              </span>
              {/* Price */}
              <span className="text-[9px] text-white/35 font-mono leading-none">
                {formatINR(paint.listPrice)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Part card ────────────────────────────────────────────────────────────────

interface PartCardProps {
  assetKey: string;
  label: string;
  listPrice: number;
  isSelected: boolean;
  onToggle: () => void;
}

function PartCard({ assetKey, label, listPrice, isSelected, onToggle }: PartCardProps) {
  const prefersReducedMotion = useReducedMotion();

  // Colour swatch if applicable (wraps / tints)
  const swatchColors: Record<string, string> = {
    'matte-black': '#1c1c1c',
    'satin-gold': '#b45309',
    'carbon-fiber': '#111827',
    'tint-light': '#94a3b8',
    'tint-medium': '#475569',
    'tint-dark': '#0f172a',
  };
  const swatchColor = swatchColors[assetKey];

  return (
    <motion.button
      type="button"
      layout
      aria-pressed={isSelected}
      onClick={onToggle}
      whileHover={prefersReducedMotion ? {} : { scale: 1.015 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.985 }}
      transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left',
        'border backdrop-blur-md transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isSelected
          ? 'bg-white/8 border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'bg-white/3 border-white/6 hover:bg-white/6 hover:border-white/14',
      )}
      style={isSelected ? { boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)' } : {}}
    >
      {/* Thumbnail / swatch */}
      {swatchColor ? (
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 border border-white/10"
          style={{ backgroundColor: swatchColor }}
          aria-hidden
        />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex-shrink-0 border border-white/10 bg-white/5 flex items-center justify-center"
          aria-hidden
        >
          <div className="w-3 h-3 rounded-sm bg-white/20" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-[12px] font-medium truncate', isSelected ? 'text-white' : 'text-white/70')}>
          {label}
        </p>
        <p className="text-[10px] text-white/35 font-mono mt-0.5">
          {formatINR(listPrice)}
        </p>
      </div>

      {/* Selected indicator */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0"
            aria-hidden
          >
            <Check size={10} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PartPickerRail({
  selectedParts,
  activePaintKey,
  onTogglePart,
  onSelectPaint,
  onReset,
  totalCost,
  fineControls,
  onFineControlChange,
}: PartPickerRailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('paint');
  const [search, setSearch] = useState('');
  const prefersReducedMotion = useReducedMotion();

  const allOverlays = getAllOverlays();

  // Group overlays by category
  const grouped = useMemo(() => {
    const g: Record<string, Array<{ key: string; label: string; listPrice: number }>> = {};
    for (const overlay of allOverlays) {
      const cat = overlay.category as string;
      if (!g[cat]) g[cat] = [];
      g[cat].push({ key: overlay.key, label: overlay.label, listPrice: overlay.listPrice });
    }
    return g;
  }, [allOverlays]);

  // Items for current tab (filtered by search)
  const currentItems = useMemo(() => {
    const items = grouped[activeTab] ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [grouped, activeTab, search]);

  const hasSelections = Object.keys(selectedParts).length > 0 || activePaintKey !== null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6 flex-shrink-0">
        <span className="text-[13px] font-semibold text-white/80">Configurator</span>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasSelections}
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            hasSelections
              ? 'text-white/50 hover:text-white/80 hover:bg-white/6'
              : 'text-white/20 opacity-40 cursor-not-allowed',
          )}
          aria-label="Reset all selections to stock configuration"
        >
          <RotateCcw size={11} aria-hidden />
          Reset
        </button>
      </div>

      {/* Category tab bar */}
      <TabBar activeTab={activeTab} onTab={setActiveTab} />

      {/* Search (only for non-paint tabs) */}
      {activeTab !== 'paint' && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search parts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full pl-7 pr-3 py-1.5 rounded-lg text-[11px]',
                'bg-white/5 border border-white/8 text-white placeholder:text-white/25',
                'focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent/40',
                'transition-colors',
              )}
              aria-label="Search parts in this category"
            />
          </div>
        </div>
      )}

      {/* Panel content */}
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-label={`${CATEGORY_LABELS[activeTab] ?? activeTab} parts`}
        className="flex-1 overflow-hidden flex flex-col min-h-0"
      >
        {activeTab === 'paint' ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <PaintSwatchGrid activePaintKey={activePaintKey} onSelect={onSelectPaint} />
            {/* L48 — Paint fine controls */}
            <div className="px-3 pb-3 space-y-3 border-t border-white/6 pt-3 flex-shrink-0">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Fine Controls</p>
              <Slider
                label="Metallic Intensity"
                value={fineControls.paintMetallicIntensity}
                onChange={(v) => onFineControlChange('paintMetallicIntensity', v)}
                min={0}
                max={100}
                step={1}
                formatValue={(v) => `${v}%`}
                className="[&_label]:text-white/40 [&_span]:text-white/60"
              />
              <Slider
                label="Window Tint"
                value={fineControls.windowTintIntensity}
                onChange={(v) => onFineControlChange('windowTintIntensity', v)}
                min={0}
                max={100}
                step={5}
                formatValue={(v) => `${v}%`}
                className="[&_label]:text-white/40 [&_span]:text-white/60"
              />
            </div>
          </div>
        ) : activeTab === 'wheels' ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* L48 — Wheel size discrete slider at top of wheels panel */}
            <div className="px-3 pt-3 pb-2 border-b border-white/6 flex-shrink-0">
              <Slider
                label="Wheel Size"
                value={fineControls.wheelSize}
                onChange={(v) => onFineControlChange('wheelSize', v)}
                min={18}
                max={22}
                step={1}
                formatValue={(v) => `${v}"`}
                className="[&_label]:text-white/40 [&_span]:text-white/60"
              />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {currentItems.length === 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-white/30 text-center py-8"
                  >
                    {search ? 'No parts match your search.' : 'No parts in this category yet.'}
                  </motion.p>
                )}
                {currentItems.map((item) => (
                  <motion.div
                    key={item.key}
                    layout={!prefersReducedMotion}
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -4 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                  >
                    <PartCard
                      assetKey={item.key}
                      label={item.label}
                      listPrice={item.listPrice}
                      isSelected={selectedParts[activeTab] === item.key}
                      onToggle={() => onTogglePart(activeTab, item.key, item.label, item.listPrice)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {currentItems.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] text-white/30 text-center py-8"
                >
                  {search ? 'No parts match your search.' : 'No parts in this category yet.'}
                </motion.p>
              )}
              {currentItems.map((item) => (
                <motion.div
                  key={item.key}
                  layout={!prefersReducedMotion}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -4 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                >
                  <PartCard
                    assetKey={item.key}
                    label={item.label}
                    listPrice={item.listPrice}
                    isSelected={selectedParts[activeTab] === item.key}
                    onToggle={() => onTogglePart(activeTab, item.key, item.label, item.listPrice)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Live cost total */}
      <div className="border-t border-white/6 px-4 py-3 flex-shrink-0 bg-black/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/35">
            {hasSelections
              ? `${Object.keys(selectedParts).length + (activePaintKey ? 1 : 0)} option${Object.keys(selectedParts).length + (activePaintKey ? 1 : 0) !== 1 ? 's' : ''}`
              : 'Stock configuration'}
          </span>
          <span
            className="text-[14px] font-semibold font-mono text-white/80"
            aria-label={`Total options cost: ${formatINR(totalCost)}`}
          >
            {formatINR(totalCost)}
          </span>
        </div>
        <p className="text-[9px] text-white/20 mt-0.5">List prices · excl. labour &amp; GST</p>
      </div>
    </div>
  );
}
