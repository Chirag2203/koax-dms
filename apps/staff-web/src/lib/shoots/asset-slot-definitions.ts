/**
 * Shoot asset slot definitions — SPEC-SHOOTS-002 L_AI-6
 *
 * Single source of truth for the 14-angle slot configuration.
 * Mirrors the intake-inspection field-definitions pattern (L4 in SPEC-SERVICE-INTAKE-001).
 *
 * Consumers:
 *   - shoots-store (LISTED guard, addRawAsset slot uniqueness)
 *   - ShootDetailView (14-slot grid)
 *   - ShootAssetCard (label, badge rendering)
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-6, §9
 */

import type { ShootAssetKind } from '@dms/types';
import { EXTERIOR_LP_REQUIRED_KINDS } from '@dms/types';

// ─── Slot definition interface ────────────────────────────────────────────────

export interface ShootAssetSlotDef {
  /** The kind identifier — matches ShootAssetKindEnum values */
  kind: ShootAssetKind;
  /** Human-readable label (i18n key: shootsAi.slot.<kind>) */
  label: string;
  /** True for 11 of 14 kinds; false for engine_bay and boot */
  required: boolean;
  /** True for kinds in EXTERIOR_LP_REQUIRED_KINDS (L_AI-5) */
  lpRedactionRequired: boolean;
  /** True only for front_3q_driver — the default recommended cover (L_AI-6) */
  recommendedCover: boolean;
  /** Visual grouping for the 14-slot grid */
  category: 'exterior' | 'interior' | 'mechanical' | 'video';
  /** Tooltip / helper text shown on empty slot tile */
  helpText: string;
}

// ─── Slot definitions array ───────────────────────────────────────────────────

/**
 * All 14 slot definitions in display order:
 *   Exterior (8) → Interior (3) → Mechanical (1) → Video (1) → Optional (2)
 *
 * Spec reference: SPEC-SHOOTS-002 §5 ShootAssetKindEnum, L_AI-6
 */
export const SHOOT_ASSET_SLOTS: ShootAssetSlotDef[] = [
  // ── Exterior (required) ──────────────────────────────────────────────────
  {
    kind: 'front_3q_driver',
    label: 'Front 3/4 — Driver Side',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: true,
    category: 'exterior',
    helpText: 'Shoot from the front-left at 45°. Ensure full bumper visible.',
  },
  {
    kind: 'front_3q_passenger',
    label: 'Front 3/4 — Passenger Side',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Shoot from the front-right at 45°.',
  },
  {
    kind: 'rear_3q_driver',
    label: 'Rear 3/4 — Driver Side',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Shoot from the rear-left at 45°.',
  },
  {
    kind: 'rear_3q_passenger',
    label: 'Rear 3/4 — Passenger Side',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Shoot from the rear-right at 45°.',
  },
  {
    kind: 'driver_profile',
    label: "Driver Side Profile",
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Full side profile from the driver side.',
  },
  {
    kind: 'passenger_profile',
    label: 'Passenger Side Profile',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Full side profile from the passenger side.',
  },
  {
    kind: 'front_straight',
    label: 'Front Straight',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Dead-on front shot. License plate must be redacted.',
  },
  {
    kind: 'rear_straight',
    label: 'Rear Straight',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'exterior',
    helpText: 'Dead-on rear shot. License plate must be redacted.',
  },
  // ── Interior (required) ──────────────────────────────────────────────────
  {
    kind: 'dashboard',
    label: 'Dashboard',
    required: true,
    lpRedactionRequired: false,
    recommendedCover: false,
    category: 'interior',
    helpText: 'Full dashboard view from driver seat. No plates visible.',
  },
  {
    kind: 'rear_seats',
    label: 'Rear Seats',
    required: true,
    lpRedactionRequired: false,
    recommendedCover: false,
    category: 'interior',
    helpText: 'Rear seating area. Include headroom if possible.',
  },
  {
    kind: 'odometer',
    label: 'Odometer',
    required: true,
    lpRedactionRequired: false,
    recommendedCover: false,
    category: 'interior',
    helpText: 'Odometer reading clearly visible. Required for mileage proof.',
  },
  // ── Mechanical (optional) ────────────────────────────────────────────────
  {
    kind: 'engine_bay',
    label: 'Engine Bay',
    required: false,
    lpRedactionRequired: false,
    recommendedCover: false,
    category: 'mechanical',
    helpText: 'Engine compartment. Recommended for CPO vehicles.',
  },
  {
    kind: 'boot',
    label: 'Boot / Trunk',
    required: false,
    lpRedactionRequired: false,
    recommendedCover: false,
    category: 'mechanical',
    helpText: 'Boot open. Highlight cargo space and spare wheel.',
  },
  // ── Video (required) ─────────────────────────────────────────────────────
  {
    kind: 'video_walkaround',
    label: 'Video Walkaround',
    required: true,
    lpRedactionRequired: true,
    recommendedCover: false,
    category: 'video',
    helpText:
      'Full 360° walkaround video. License plate review required (R12+ approval — security review #12).',
  },
];

// ─── EMPTY fallback array ─────────────────────────────────────────────────────
// Module-level constant to avoid fresh-array selectors (CLAUDE.md §17.1 zustand rule)

export const EMPTY_SHOOT_ASSET_SLOTS: ShootAssetSlotDef[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the subset of slot definitions where required === true.
 * 11 of 14 kinds are required (L_AI-6).
 */
export function getRequiredSlots(): ShootAssetSlotDef[] {
  return SHOOT_ASSET_SLOTS.filter((s) => s.required);
}

/**
 * Returns the slot definition for a given kind, or undefined if not found.
 * Prefer over manual array scan to keep kind-lookup logic centralised.
 */
export function getSlotByKind(kind: ShootAssetKind): ShootAssetSlotDef | undefined {
  return SHOOT_ASSET_SLOTS.find((s) => s.kind === kind);
}

/**
 * Returns true if the given kind requires license-plate redaction before approval.
 * Delegates to EXTERIOR_LP_REQUIRED_KINDS from @dms/types (L_AI-5).
 */
export function requiresLpRedaction(kind: ShootAssetKind): boolean {
  return (EXTERIOR_LP_REQUIRED_KINDS as string[]).includes(kind);
}

/**
 * Returns the set of REQUIRED ShootAssetKind values as a plain Set for O(1) lookup.
 */
export function getRequiredKindSet(): Set<ShootAssetKind> {
  return new Set(getRequiredSlots().map((s) => s.kind));
}
