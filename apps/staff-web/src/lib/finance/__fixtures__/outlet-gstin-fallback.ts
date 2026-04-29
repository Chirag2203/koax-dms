/**
 * Outlet GSTIN fallback constants — SPEC-FINANCE-001 L29
 *
 * L29: Each outlet has a unique GSTIN. Tally export gstinParty reads from
 *      settings-store.outlets[outletId].gstin. Until Settings (A4) ships,
 *      these fallback constants are used.
 *
 * The journal page renders a banner: "Outlet GSTIN sourced from fallback constants
 * — Settings module not yet shipped (A4)."
 *
 * Doc 06 §outlet-gstin; A4 Settings dependency.
 */

export const OUTLET_GSTIN_FALLBACK: Record<string, string> = {
  BLR: '29ABCDE1234F1Z5',  // Karnataka (29); L29: SPEC-FINANCE-001
  MUM: '27ABCDE1234F1Z5',  // Maharashtra (27)
  CHE: '33ABCDE1234F1Z5',  // Tamil Nadu (33)
} as const;

/**
 * Indicates that these values are fallback constants, not live Settings data.
 * Used in export audit payload: outletGstinSource: 'fallback' | 'settings' (L29, S-F-20)
 */
export type OutletGstinSource = 'fallback' | 'settings';

/**
 * Get GSTIN for an outlet, sourcing from fallback constants.
 * L29: SPEC-FINANCE-001 L29; Doc 06 §outlet-gstin.
 */
export function getOutletGstinFallback(outletId: string): string {
  return OUTLET_GSTIN_FALLBACK[outletId] ?? '';
}
