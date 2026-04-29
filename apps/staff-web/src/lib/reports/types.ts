/**
 * Reports & Analytics — shared type definitions.
 *
 * Pure types: no imports from store slices, no side effects.
 * Spec reference: SPEC-REPORTS-001 §6.1 (L11, L12, L13)
 */

import type { VehiclesState } from '@/src/lib/vehicles/vehicles-store/types';
import type { InsuranceState } from '@/src/lib/insurance/insurance-store/types';
import type { CustomBuildsState } from '@/src/lib/custom-builds/custom-builds-store/types';
import type { ServiceStore } from './service-store-type';
import type { StaffStore } from './staff-store-type';
import type { SalesDealsStore } from './sales-deals-store-type';

// ─── ReportInputState (§6.1) ──────────────────────────────────────────────────
// Uses *State shapes (data only, no actions) for clean selector composition.

export interface ReportInputState {
  vehicles:     VehiclesState;
  salesDeals:   SalesDealsStore;
  service:      ServiceStore;
  insurance:    InsuranceState;
  customBuilds: CustomBuildsState;
  staff:        StaffStore;
}

// ─── ReportPeriod (L12) ───────────────────────────────────────────────────────

// L12: ReportPeriod type — kind + from/to ISO date strings (date portion only)
export type ReportPeriod = {
  kind: 'last30d' | 'thisFY' | 'lastFY' | 'custom';
  from: string; // ISO date string e.g. '2026-04-01'
  to:   string; // ISO date string inclusive e.g. '2027-03-31'
};

// ─── ReportScope (L13) ────────────────────────────────────────────────────────

// L13: ReportScope — non-empty outletIds array; selector validates length > 0
export type ReportScope = {
  outletIds: string[];
};

// ─── KpiValue union ───────────────────────────────────────────────────────────

// L9: value === null → "no data for this period" → renders '—'
// Never render 0 for a zero-data situation; never render NaN.
export type KpiValue =
  | { kind: 'currency';   value: number | null; trend?: number[] }
  | { kind: 'percentage'; value: number | null; trend?: number[] }
  | { kind: 'count';      value: number | null; trend?: number[] }
  | { kind: 'days';       value: number | null; trend?: number[] }
  | { kind: 'histogram';  buckets: { label: string; count: number }[] }
  | { kind: 'deferred' }; // L14: parts margin deferred (DEF-REPORTS-4)
