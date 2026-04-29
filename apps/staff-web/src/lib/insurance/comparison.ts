/**
 * Insurance comparison engine — pure helper.
 *
 * Takes vehicle + customer input and returns one InsuranceQuote per active
 * provider. Client-side only in v1 (L19). Runs synchronously in <10ms.
 *
 * Spec reference: SPEC-INSURANCE-001 §5.1, L19, L25
 */

import type { InsuranceProvider, InsuranceQuote } from '@dms/types';
import type { VehicleInput, CustomerInput } from './insurance-store/types';

// ─── Addon premium helpers ────────────────────────────────────────────────────

/** Flat premiums per addon code (INR) */
const ADDON_FLAT: Record<string, number> = {
  rsa: 800,
  'key-replacement': 600,
  consumables: 1200,
};

/** IDV % rates per addon code */
const ADDON_IDV_PCT: Record<string, number> = {
  'zero-dep': 0.04,
  'engine-protect': 0.025,
  rti: 0.015,
  'ncb-protect': 0.02,
};

/** Age-slab rates per addon (vehicle age in years → flat INR) */
const ADDON_AGE_SLAB: Record<string, Array<{ maxAge: number; premium: number }>> = {
  'tyre-cover': [
    { maxAge: 2, premium: 800 },
    { maxAge: 4, premium: 1200 },
    { maxAge: Infinity, premium: 1600 },
  ],
};

function addonPremium(code: string, idv: number, vehicleAge: number): number {
  if (ADDON_FLAT[code] !== undefined) return ADDON_FLAT[code]!;
  if (ADDON_IDV_PCT[code] !== undefined) return Math.round(idv * ADDON_IDV_PCT[code]!);
  if (ADDON_AGE_SLAB[code]) {
    const slabs = ADDON_AGE_SLAB[code]!;
    for (const slab of slabs) {
      if (vehicleAge <= slab.maxAge) return slab.premium;
    }
  }
  return 0;
}

// ─── TP premium table (IRDAI mandated — cubic capacity based approximation) ──

function thirdPartyPremium(exShowroom: number): number {
  // Luxury segment approximation: TP premium for private cars > ₹15L is ~₹7,897
  // For > ₹5L segment: ₹5,231. We use a simple range.
  if (exShowroom >= 15_00_000) return 7897;
  if (exShowroom >= 5_00_000) return 5231;
  return 3433;
}

// ─── Comparison engine ────────────────────────────────────────────────────────

export type SortKey = 'total' | 'csr' | 'network';

export function buildQuotes(
  vehicle: VehicleInput,
  customer: CustomerInput,
  providers: InsuranceProvider[],
  leadId: string,
  selectedAddons: string[] = ['zero-dep', 'rsa'],
): InsuranceQuote[] {
  const currentYear = new Date().getFullYear();
  const vehicleAge = currentYear - vehicle.year;
  const now = new Date().toISOString();

  return providers
    .filter((p) => p.active)
    .map((provider): InsuranceQuote => {
      const idv = Math.round(vehicle.exShowroomValue * provider.idvMultiplier);

      // NCB discount
      const ncbSlab = provider.ncbSlabs.find(
        (s) => s.yearsNoClaim === Math.min(customer.noClaimBonusYears, 5),
      ) ?? provider.ncbSlabs[0]!;
      const ncbPct = ncbSlab.discountPct;

      // Base OD premium: 3.5% of IDV for luxury segment
      const baseOdPremium = Math.round(idv * 0.035);
      const ncbDiscount = Math.round(baseOdPremium * ncbPct / 100);
      const ownDamagePremium = baseOdPremium - ncbDiscount;

      const tp = thirdPartyPremium(vehicle.exShowroomValue);

      // Available addons from this provider's catalog
      const available = provider.addonCatalog
        .filter((a) => a.available)
        .map((a) => a.code);

      // Addon premiums for selected + available addons
      const addonsToApply = (customer.selectedAddons ?? selectedAddons).filter(
        (code) => available.includes(code),
      );
      const addonTotal = addonsToApply.reduce(
        (sum, code) => sum + addonPremium(code, idv, vehicleAge),
        0,
      );

      // GST @18% on OD + addons; TP is not GST-able in India
      const preGstOdAddon = ownDamagePremium + addonTotal;
      const gst = Math.round(preGstOdAddon * 0.18);
      const totalPremium = preGstOdAddon + gst + tp;

      const quoteId = `qcmp-${provider.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      return {
        quoteId,
        leadId,
        providerId: provider.id,
        ownDamagePremium,
        thirdPartyPremium: tp,
        totalPremium,
        idv,
        deductible: 1000,
        ncbApplied: ncbDiscount,
        ncbPct,
        availableAddons: available,
        selectedAddons: addonsToApply,
        generatedAt: now,
        status: 'active',
      };
    });
}

/**
 * Sort quotes by the given key.
 * L25: default sort = total ascending.
 */
export function sortQuotes(quotes: InsuranceQuote[], key: SortKey, providers: InsuranceProvider[]): InsuranceQuote[] {
  const providerMap = new Map(providers.map((p) => [p.id, p]));

  return [...quotes].sort((a, b) => {
    if (key === 'total') return a.totalPremium - b.totalPremium;
    if (key === 'csr') {
      const pa = providerMap.get(a.providerId);
      const pb = providerMap.get(b.providerId);
      return (pb?.claimSettlementRatio ?? 0) - (pa?.claimSettlementRatio ?? 0);
    }
    if (key === 'network') {
      const pa = providerMap.get(a.providerId);
      const pb = providerMap.get(b.providerId);
      return (pb?.networkGaragesCount ?? 0) - (pa?.networkGaragesCount ?? 0);
    }
    return 0;
  });
}
