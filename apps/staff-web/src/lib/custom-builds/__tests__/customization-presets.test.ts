/**
 * Customization presets tests — SPEC-CUSTOM-BUILDS-001 §38, L91
 *
 * Tests:
 *   1. 5 presets defined
 *   2. Each preset covers all 6 option categories
 *   3. Each preset has a valid paintColorId
 *   4. computePresetTotal returns a positive INR total for all presets
 *   5. presetToCustomizations returns correct VisualizerCustomizations shape
 *   6. Race Build preset maps to correct option IDs
 *   7. Stealth Black preset maps to frozen-black paint
 *   8. BN Signature preset uses airride + active aero
 *   9. All preset icons are in the icon map (Flag, Zap, Award, Moon, Sparkles)
 *  10. No two presets share the same paintColorId (diverse palette)
 *  11. computePresetTotal is consistent with computeCustomizationCost
 *  12. presetToCustomizations always includes decals: []
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L91
 */

import { describe, it, expect } from 'vitest';
import {
  CUSTOMIZATION_PRESETS,
  computePresetTotal,
  presetToCustomizations,
} from '../customization-presets';
import { computeCustomizationCost } from '../customization-catalog';
import { PAINT_BY_KEY } from '../paint-palette';

const VALID_ICONS = new Set(['Flag', 'Zap', 'Award', 'Moon', 'Sparkles']);
const REQUIRED_OPTION_KEYS = [
  'wheelOptionId',
  'tintOptionId',
  'exhaustOptionId',
  'suspensionOptionId',
  'hoodOptionId',
  'wingOptionId',
] as const;

describe('CUSTOMIZATION_PRESETS catalog (L91)', () => {
  // ── Test 1: 5 presets defined ────────────────────────────────────────────────
  it('defines exactly 5 presets', () => {
    expect(CUSTOMIZATION_PRESETS).toHaveLength(5);
  });

  // ── Test 2: Each preset covers all 6 option categories ───────────────────────
  it('each preset covers all 6 option ID categories', () => {
    for (const preset of CUSTOMIZATION_PRESETS) {
      for (const key of REQUIRED_OPTION_KEYS) {
        expect(preset.customizations[key]).toBeDefined();
        expect(typeof preset.customizations[key]).toBe('string');
      }
    }
  });

  // ── Test 3: Each preset has a valid paintColorId ─────────────────────────────
  it('each preset references a valid paintColorId in PAINT_BY_KEY', () => {
    for (const preset of CUSTOMIZATION_PRESETS) {
      expect(PAINT_BY_KEY[preset.paintColorId]).toBeDefined();
    }
  });

  // ── Test 4: computePresetTotal returns positive INR ──────────────────────────
  it('computePresetTotal returns a positive number for all presets', () => {
    for (const preset of CUSTOMIZATION_PRESETS) {
      const total = computePresetTotal(preset);
      expect(total).toBeGreaterThan(0);
    }
  });

  // ── Test 5: presetToCustomizations returns correct shape ─────────────────────
  it('presetToCustomizations returns an object with decals: []', () => {
    for (const preset of CUSTOMIZATION_PRESETS) {
      const customizations = presetToCustomizations(preset);
      expect(customizations.decals).toEqual([]);
      expect(typeof customizations.wheelOptionId).toBe('string');
    }
  });

  // ── Test 6: Race Build preset maps to correct IDs ────────────────────────────
  it('Race Build preset uses exh-akrapovic + susp-coilovers-clubsport + guards-red', () => {
    const race = CUSTOMIZATION_PRESETS.find((p) => p.id === 'preset-race-build');
    expect(race).toBeDefined();
    expect(race!.customizations.exhaustOptionId).toBe('exh-akrapovic');
    expect(race!.customizations.suspensionOptionId).toBe('susp-coilovers-clubsport');
    expect(race!.paintColorId).toBe('guards-red');
  });

  // ── Test 7: Stealth Black has frozen-black paint ─────────────────────────────
  it('Stealth Black preset uses frozen-black paint', () => {
    const stealth = CUSTOMIZATION_PRESETS.find((p) => p.id === 'preset-stealth');
    expect(stealth).toBeDefined();
    expect(stealth!.paintColorId).toBe('frozen-black');
    expect(stealth!.customizations.wheelOptionId).toBe('wheel-gloss-black');
  });

  // ── Test 8: BN Signature uses airride + active aero ─────────────────────────
  it('BN Signature preset uses susp-airride + wing-active + mamba-green', () => {
    const sig = CUSTOMIZATION_PRESETS.find((p) => p.id === 'preset-signature');
    expect(sig).toBeDefined();
    expect(sig!.customizations.suspensionOptionId).toBe('susp-airride');
    expect(sig!.customizations.wingOptionId).toBe('wing-active');
    expect(sig!.paintColorId).toBe('mamba-green');
  });

  // ── Test 9: All preset icons are valid ───────────────────────────────────────
  it('all preset icons are in the valid icon set', () => {
    for (const preset of CUSTOMIZATION_PRESETS) {
      expect(VALID_ICONS.has(preset.icon)).toBe(true);
    }
  });

  // ── Test 10: Diverse paint palette (no two presets share paint) ──────────────
  it('no two presets share the same paintColorId', () => {
    const paintIds = CUSTOMIZATION_PRESETS.map((p) => p.paintColorId);
    const unique = new Set(paintIds);
    expect(unique.size).toBe(CUSTOMIZATION_PRESETS.length);
  });

  // ── Test 11: computePresetTotal is consistent with computeCustomizationCost ──
  it('computePresetTotal matches manual computeCustomizationCost call', () => {
    const preset = CUSTOMIZATION_PRESETS[0]!;
    const paintPrice = PAINT_BY_KEY[preset.paintColorId]?.listPrice ?? 0;
    const expected = computeCustomizationCost({
      paintPrice,
      ...preset.customizations,
    }).total;
    expect(computePresetTotal(preset)).toBe(expected);
  });

  // ── Test 12: presetToCustomizations always includes decals: [] ───────────────
  it('presetToCustomizations always initialises decals as empty array', () => {
    for (const preset of CUSTOMIZATION_PRESETS) {
      const c = presetToCustomizations(preset);
      expect(Array.isArray(c.decals)).toBe(true);
      expect(c.decals).toHaveLength(0);
    }
  });
});
