/**
 * DecalCustomizer — slot selector + decal library grid + rotation toggle.
 *
 * P3.3.3: Decal overlays as plane meshes at fixed slot positions.
 * L59: 6 slots, 6 decals, 4 rotations, max 4 active decals.
 * L64: Uses existing button/toggle patterns from the design system.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §31, L59, L64
 */

'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RotateCw, X } from 'lucide-react';
import { cn } from '@dms/ui';
import type { DecalSlot } from '@dms/types';
import { DECAL_LIBRARY } from '@/src/lib/custom-builds/decal-library';

// ─── Types ────────────────────────────────────────────────────────────────────

type DecalRotation = '0' | '90' | '180' | '270';

export interface ActiveDecal {
  slot: DecalSlot;
  decalId: string;
  rotation: DecalRotation;
}

export interface DecalCustomizerProps {
  value: ActiveDecal[];
  onChange: (decals: ActiveDecal[]) => void;
}

// ─── Slot definitions ─────────────────────────────────────────────────────────

const DECAL_SLOTS: { key: DecalSlot; label: string; shortLabel: string }[] = [
  { key: 'door-left',    label: 'Door Left',    shortLabel: 'Door L' },
  { key: 'door-right',   label: 'Door Right',   shortLabel: 'Door R' },
  { key: 'hood',         label: 'Hood',         shortLabel: 'Hood' },
  { key: 'fender-left',  label: 'Fender Left',  shortLabel: 'Fnd L' },
  { key: 'fender-right', label: 'Fender Right', shortLabel: 'Fnd R' },
  { key: 'trunk',        label: 'Trunk',        shortLabel: 'Trunk' },
];

const ROTATION_CYCLE: DecalRotation[] = ['0', '90', '180', '270'];
const MAX_ACTIVE_DECALS = 4; // L59 V0 limit

// ─── Component ────────────────────────────────────────────────────────────────

export function DecalCustomizer({ value, onChange }: DecalCustomizerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeSlot, setActiveSlot] = useState<DecalSlot>('door-left');

  const getDecalForSlot = (slot: DecalSlot): ActiveDecal | undefined =>
    value.find((d) => d.slot === slot);

  const activeSlotDecal = getDecalForSlot(activeSlot);

  const handleDecalSelect = (decalId: string) => {
    const existing = getDecalForSlot(activeSlot);

    if (existing?.decalId === decalId) {
      // Deselect
      onChange(value.filter((d) => d.slot !== activeSlot));
      return;
    }

    // Check max-4 limit (L59)
    const otherSlotCount = value.filter((d) => d.slot !== activeSlot).length;
    if (!existing && otherSlotCount >= MAX_ACTIVE_DECALS) {
      // Max reached — no-op (UI should show feedback)
      return;
    }

    const rotation: DecalRotation = existing?.rotation ?? '0';
    const updated = value.filter((d) => d.slot !== activeSlot);
    updated.push({ slot: activeSlot, decalId, rotation });
    onChange(updated);
  };

  const handleRotate = () => {
    if (!activeSlotDecal) return;
    const currentIdx = ROTATION_CYCLE.indexOf(activeSlotDecal.rotation);
    const nextRotation = ROTATION_CYCLE[(currentIdx + 1) % ROTATION_CYCLE.length] ?? '0';
    onChange(
      value.map((d) =>
        d.slot === activeSlot ? { ...d, rotation: nextRotation } : d,
      ),
    );
  };

  const handleRemove = (slot: DecalSlot) => {
    onChange(value.filter((d) => d.slot !== slot));
  };

  const activeCount = value.length;
  const atLimit = activeCount >= MAX_ACTIVE_DECALS;

  return (
    <div className="flex flex-col h-full">
      {/* Slot selector */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 px-1">
          Select Slot
        </p>
        <div className="grid grid-cols-3 gap-1">
          {DECAL_SLOTS.map(({ key, shortLabel }) => {
            const hasDecal = !!getDecalForSlot(key);
            const isActive = activeSlot === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSlot(key)}
                className={cn(
                  'relative px-2 py-1.5 rounded-lg text-[10px] font-medium',
                  'border transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive
                    ? 'bg-white/10 border-white/25 text-white'
                    : 'bg-white/3 border-white/6 text-white/50 hover:text-white/80 hover:bg-white/6',
                )}
              >
                {shortLabel}
                {/* Active-decal indicator dot */}
                {hasDecal && (
                  <span
                    className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-accent"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Decal controls for active slot */}
      <div className="px-3 pb-2 flex items-center gap-2 flex-shrink-0">
        <p className="text-[10px] text-white/40 flex-1">
          {activeSlotDecal
            ? `${DECAL_LIBRARY.find((d) => d.id === activeSlotDecal.decalId)?.name ?? activeSlotDecal.decalId} — ${activeSlotDecal.rotation}°`
            : 'No decal in this slot'}
        </p>
        {activeSlotDecal && (
          <>
            <button
              type="button"
              onClick={handleRotate}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[10px]',
                'bg-white/5 border border-white/8 text-white/50 hover:text-white/80',
                'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              )}
              aria-label="Rotate decal 90 degrees"
            >
              <RotateCw size={10} aria-hidden />
              {activeSlotDecal.rotation}°
            </button>
            <button
              type="button"
              onClick={() => handleRemove(activeSlot)}
              className={cn(
                'p-1 rounded-md text-white/30 hover:text-white/70',
                'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              )}
              aria-label="Remove decal from this slot"
            >
              <X size={12} aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Max limit notice */}
      {atLimit && !activeSlotDecal && (
        <div className="mx-3 mb-2 px-2 py-1.5 rounded-lg bg-amber-950/20 border border-amber-600/20">
          <p className="text-[10px] text-amber-400/70">
            Max {MAX_ACTIVE_DECALS} decals active. Remove one to add here.
          </p>
        </div>
      )}

      {/* Decal library grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 px-1">
          Decal Library — {activeCount}/{MAX_ACTIVE_DECALS} active
        </p>
        <div className="grid grid-cols-3 gap-2">
          {DECAL_LIBRARY.map((decal) => {
            const isSelected = activeSlotDecal?.decalId === decal.id;
            const isUsedElsewhere = !isSelected && value.some((d) => d.decalId === decal.id && d.slot !== activeSlot);
            const isDisabled = atLimit && !isSelected && !isUsedElsewhere;

            return (
              <motion.button
                key={decal.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${decal.name}${isSelected ? ' — selected' : ''}${isDisabled ? ' — limit reached' : ''}`}
                onClick={() => !isDisabled && handleDecalSelect(decal.id)}
                disabled={isDisabled}
                whileHover={prefersReducedMotion || isDisabled ? {} : { scale: 1.04 }}
                whileTap={prefersReducedMotion || isDisabled ? {} : { scale: 0.96 }}
                className={cn(
                  'relative flex flex-col items-center gap-1.5 p-2 rounded-xl',
                  'border transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isSelected
                    ? 'border-accent/40 bg-accent/8'
                    : isDisabled
                      ? 'border-white/3 bg-white/1 opacity-40 cursor-not-allowed'
                      : 'border-white/6 bg-white/3 hover:border-white/14 hover:bg-white/6',
                )}
              >
                {/* Thumbnail */}
                <div
                  className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/40"
                  aria-hidden
                >
                  <img
                    src={decal.thumbnail}
                    alt=""
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>

                {/* Name */}
                <span className="text-[8px] text-white/50 leading-tight text-center font-medium line-clamp-2">
                  {decal.name}
                </span>

                {/* Selected indicator */}
                {isSelected && (
                  <span
                    className="absolute top-1 right-1 w-3 h-3 rounded-full bg-accent flex items-center justify-center"
                    aria-hidden
                  >
                    <svg viewBox="0 0 8 8" className="w-2 h-2">
                      <path d="M1,4 L3,6 L7,2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}

                {/* Used elsewhere indicator */}
                {isUsedElsewhere && !isSelected && (
                  <span
                    className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white/20"
                    title="Used in another slot"
                    aria-hidden
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
