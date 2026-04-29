/**
 * Customization presets — one-click bundles for the 3D visualizer.
 *
 * L91: 5 preset bundles covering all 7 customization categories + paint.
 * Click applies all options in one action via `applyPreset` helper.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L91
 */

import type { VisualizerCustomizations } from '@dms/types';
import { computeCustomizationCost } from './customization-catalog';
import { PAINT_BY_KEY } from './paint-palette';

// ─── Preset type ──────────────────────────────────────────────────────────────

export interface CustomizationPreset {
  id: string;
  name: string;
  description: string;
  /** Lucide icon name (string — rendered dynamically in UI) */
  icon: string;
  paintColorId: string;
  customizations: Omit<VisualizerCustomizations, 'wheelMaterial' | 'tint' | 'exhaust' | 'suspension' | 'decals' | 'aero'>;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export const CUSTOMIZATION_PRESETS: CustomizationPreset[] = [
  {
    id: 'preset-race-build',
    name: 'Race Build',
    description: 'Track-focused performance — Akrapovic + KW V3 + GT3 wing',
    icon: 'Flag',
    paintColorId: 'guards-red',
    customizations: {
      wheelOptionId: 'wheel-anrky-22',
      tintOptionId: 'tint-stock',
      exhaustOptionId: 'exh-akrapovic',
      suspensionOptionId: 'susp-coilovers-clubsport',
      hoodOptionId: 'hood-cf-vented-pro',
      wingOptionId: 'wing-swan-neck',
    },
  },
  {
    id: 'preset-track-day',
    name: 'Track Day',
    description: 'Capable street car with track-day weekends in mind',
    icon: 'Zap',
    paintColorId: 'nardo-gray',
    customizations: {
      wheelOptionId: 'wheel-vossen-21',
      tintOptionId: 'tint-medium-smoke',
      exhaustOptionId: 'exh-akrapovic-evolution',
      suspensionOptionId: 'susp-coilovers-40',
      hoodOptionId: 'hood-gt-vented',
      wingOptionId: 'wing-gt3-replica',
    },
  },
  {
    id: 'preset-concours',
    name: "Concours d'Elegance",
    description: 'Show-grade — restrained, elegant, perfect',
    icon: 'Award',
    paintColorId: 'carrara-white',
    customizations: {
      wheelOptionId: 'wheel-stock',
      tintOptionId: 'tint-light-smoke',
      exhaustOptionId: 'exh-tubi',
      suspensionOptionId: 'susp-novitec',
      hoodOptionId: 'hood-stock',
      wingOptionId: 'wing-stock',
    },
  },
  {
    id: 'preset-stealth',
    name: 'Stealth Black',
    description: 'Murdered-out — every detail blacked out',
    icon: 'Moon',
    paintColorId: 'frozen-black',
    customizations: {
      wheelOptionId: 'wheel-gloss-black',
      tintOptionId: 'tint-dark-smoke',
      exhaustOptionId: 'exh-quad-black',
      suspensionOptionId: 'susp-eibach-30',
      hoodOptionId: 'hood-forged-carbon',
      wingOptionId: 'wing-ducktail',
    },
  },
  {
    id: 'preset-signature',
    name: 'BN Signature',
    description: 'BN Automobiles signature build — luxury meets performance',
    icon: 'Sparkles',
    paintColorId: 'mamba-green',
    customizations: {
      wheelOptionId: 'wheel-bronze',
      tintOptionId: 'tint-llumar',
      exhaustOptionId: 'exh-iPE',
      suspensionOptionId: 'susp-airride',
      hoodOptionId: 'hood-carbon-twill',
      wingOptionId: 'wing-active',
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the total price for a preset (paint listPrice + customization subtotal incl. GST).
 */
export function computePresetTotal(preset: CustomizationPreset): number {
  const paintPrice = PAINT_BY_KEY[preset.paintColorId]?.listPrice ?? 0;
  const breakdown = computeCustomizationCost({
    paintPrice,
    ...preset.customizations,
  });
  return breakdown.total;
}

/**
 * Build the VisualizerCustomizations patch to apply when a preset is selected.
 * Caller must separately apply paintColorId via `onSelectPaint`.
 */
export function presetToCustomizations(
  preset: CustomizationPreset,
): VisualizerCustomizations {
  return {
    ...preset.customizations,
    decals: [],
  };
}
