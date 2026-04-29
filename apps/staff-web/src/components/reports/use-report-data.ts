/**
 * useReportData — custom hook that reads all stores and computes KPI values.
 *
 * L10: Store reads at top of hook (before any conditional), then useMemo.
 *      Never calls selector functions inside a Zustand selector callback.
 * L7:  No setInterval; re-derives on Zustand subscription change.
 * CLAUDE.md §17: All hooks before any conditional return.
 *
 * Spec reference: SPEC-REPORTS-001 L10, L7, §15 failure modes
 */

'use client';

import { useMemo } from 'react';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store/index';
import { useInsuranceStore } from '@/src/lib/insurance/insurance-store/index';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store/index';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffStore } from '@/src/lib/staff/staff-store';

import type { ReportInputState, ReportPeriod, ReportScope, KpiValue } from '@/src/lib/reports/types';
import { selectOutletPnL } from '@/src/lib/reports/selectors/p-and-l-selectors';
import { selectSalesVelocity, selectInventoryAging, selectCpoConversion } from '@/src/lib/reports/selectors/sales-selectors';
import { selectServiceSlaMedian } from '@/src/lib/reports/selectors/service-selectors';
import { selectInsuranceAttachmentRate } from '@/src/lib/reports/selectors/insurance-selectors';
import { selectPartsMarginPct } from '@/src/lib/reports/selectors/parts-selectors';
import { selectCustomBuildsRevContribution } from '@/src/lib/reports/selectors/custom-builds-selectors';
import { selectStaffUtilisation } from '@/src/lib/reports/selectors/staff-selectors';

// ─── Null KPI shorthand ───────────────────────────────────────────────────────

const NULL_COUNT:    KpiValue = { kind: 'count',      value: null };
const NULL_CURRENCY: KpiValue = { kind: 'currency',   value: null };
const NULL_PCT:      KpiValue = { kind: 'percentage', value: null };
const NULL_DAYS:     KpiValue = { kind: 'days',       value: null };
const NULL_HIST:     KpiValue = { kind: 'histogram',  buckets: [] };
const NULL_DEFERRED: KpiValue = { kind: 'deferred' };

// ─── KPI Results type ─────────────────────────────────────────────────────────

export interface KpiResults {
  outletPnL:             KpiValue;
  salesVelocity:         KpiValue;
  inventoryAging:        KpiValue;
  serviceSla:            KpiValue;
  partsMargin:           KpiValue;
  insuranceAttach:       KpiValue;
  cpoConversion:         KpiValue;
  customBuildsRevenue:   KpiValue;
  staffUtilisation:      KpiValue;
}

export interface ReportDataResult {
  kpis:      KpiResults;
  isLoading: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReportData(period: ReportPeriod, scope: ReportScope): ReportDataResult {
  // L10: Extract base refs at top of hook — NEVER inside useMemo selector args.
  // All hooks called unconditionally (Rules of Hooks).

  // Vehicles store — L18, L19, L20, L21
  const vehiclesHydrated      = useVehiclesStore((s) => s.hydrated);
  const vehiclesVehicles      = useVehiclesStore((s) => s.vehicles);
  const vehiclesOwnerships    = useVehiclesStore((s) => s.ownerships);
  const vehiclesClaims        = useVehiclesStore((s) => s.claims);
  const vehiclesEvents        = useVehiclesStore((s) => s.events);
  const vehiclesSalesEvts     = useVehiclesStore((s) => s.salesEvents);
  const vehiclesDocs          = useVehiclesStore((s) => s.documents);
  const vehiclesStaffMeta     = useVehiclesStore((s) => s.staffMeta);
  const vehiclesDocAccEvts    = useVehiclesStore((s) => s.documentAccessEvents);
  const vehiclesCostLedger    = useVehiclesStore((s) => s.costLedger);
  const vehiclesOwnerIdByVin  = useVehiclesStore((s) => s.ownershipIdByVin);
  const vehiclesClaimIdByVin  = useVehiclesStore((s) => s.claimIdByVin);
  const vehiclesOwnerByCust   = useVehiclesStore((s) => s.ownershipIdByCustomer);

  // Insurance store — Seam 23
  const insuranceLeads     = useInsuranceStore((s) => s.leads);
  const insurancePolicies  = useInsuranceStore((s) => s.policies);
  const insuranceProviders = useInsuranceStore((s) => s.providers);
  const insuranceTemplates = useInsuranceStore((s) => s.templates);
  const insuranceCampaigns = useInsuranceStore((s) => s.campaigns);
  const insuranceCallLogs  = useInsuranceStore((s) => s.callLogs);
  const insuranceManualLog = useInsuranceStore((s) => s.manualCallLog);
  const insuranceOptOuts   = useInsuranceStore((s) => s.optOuts);
  const insuranceFeat      = useInsuranceStore((s) => s.featAiCallingEnabled);
  const insuranceAudit     = useInsuranceStore((s) => s.auditEvents);

  // Custom builds store — Seam 24
  const cbJobs     = useCustomBuildsStore((s) => s.jobs);
  const cbParts    = useCustomBuildsStore((s) => s.parts);
  const cbVendors  = useCustomBuildsStore((s) => s.vendors);
  const cbHydrated = useCustomBuildsStore((s) => s.hydrated);

  // Sales deals store
  const salesDealsMap = useSalesDealsStore((s) => s.deals);

  // Service store — Seam 22
  const serviceJobCards = useServiceStore((s) => s.jobCards);

  // Staff store — Seam 25
  const staffById       = useStaffStore((s) => s.staffById);
  const staffIds        = useStaffStore((s) => s.staffIds);
  const staffAttendance = useStaffStore((s) => s.attendancePunches);
  const staffHydrated   = useStaffStore((s) => s.hydrated);

  // ─── L10: useMemo derives all KPI values ──────────────────────────────────

  const kpis = useMemo<KpiResults>(() => {
    // Compose read-only ReportInputState from base refs (state only, no actions)
    const state: ReportInputState = {
      vehicles: {
        vehicles:             vehiclesVehicles,
        ownerships:           vehiclesOwnerships,
        claims:               vehiclesClaims,
        events:               vehiclesEvents,
        salesEvents:          vehiclesSalesEvts,
        documents:            vehiclesDocs,
        staffMeta:            vehiclesStaffMeta,
        documentAccessEvents: vehiclesDocAccEvts,
        costLedger:           vehiclesCostLedger,
        ownershipIdByVin:     vehiclesOwnerIdByVin,
        claimIdByVin:         vehiclesClaimIdByVin,
        ownershipIdByCustomer: vehiclesOwnerByCust,
        hydrated:             vehiclesHydrated,
      },
      salesDeals: { deals: salesDealsMap },
      service:    { jobCards: serviceJobCards },
      insurance: {
        leads:               insuranceLeads,
        providers:           insuranceProviders,
        policies:            insurancePolicies,
        templates:           insuranceTemplates,
        campaigns:           insuranceCampaigns,
        callLogs:            insuranceCallLogs,
        manualCallLog:       insuranceManualLog,
        optOuts:             insuranceOptOuts,
        featAiCallingEnabled: insuranceFeat,
        auditEvents:         insuranceAudit,
      },
      customBuilds: {
        jobs:     cbJobs,
        parts:    cbParts,
        vendors:  cbVendors,
        hydrated: cbHydrated,
      },
      staff: {
        staffById:         staffById,
        staffIds:          staffIds,
        attendancePunches: staffAttendance,
        hydrated:          staffHydrated,
      },
    };

    // Per §15 failure mode: wrap each selector in try/catch
    function safe<T extends KpiValue>(fn: () => T, fallback: T): T {
      try {
        return fn();
      } catch (err) {
        // §15: log to console.error with selector name
        console.error('[reports] selector error:', err);
        return fallback;
      }
    }

    return {
      outletPnL:           safe(() => selectOutletPnL(state, period, scope),                  NULL_CURRENCY as KpiValue) as KpiValue,
      salesVelocity:       safe(() => selectSalesVelocity(state, period, scope),              NULL_COUNT    as KpiValue) as KpiValue,
      inventoryAging:      safe(() => selectInventoryAging(state, period, scope),             NULL_HIST     as KpiValue) as KpiValue,
      serviceSla:          safe(() => selectServiceSlaMedian(state, period, scope),           NULL_DAYS     as KpiValue) as KpiValue,
      partsMargin:         safe(() => selectPartsMarginPct(state, period, scope),             NULL_DEFERRED as KpiValue) as KpiValue,
      insuranceAttach:     safe(() => selectInsuranceAttachmentRate(state, period, scope),    NULL_PCT      as KpiValue) as KpiValue,
      cpoConversion:       safe(() => selectCpoConversion(state, period, scope),              NULL_PCT      as KpiValue) as KpiValue,
      customBuildsRevenue: safe(() => selectCustomBuildsRevContribution(state, period, scope),NULL_PCT      as KpiValue) as KpiValue,
      staffUtilisation:    safe(() => selectStaffUtilisation(state, period, scope),           NULL_PCT      as KpiValue) as KpiValue,
    };
  }, [
    // Vehicles
    vehiclesHydrated, vehiclesVehicles, vehiclesOwnerships, vehiclesClaims,
    vehiclesEvents, vehiclesSalesEvts, vehiclesDocs, vehiclesStaffMeta,
    vehiclesDocAccEvts, vehiclesCostLedger, vehiclesOwnerIdByVin, vehiclesClaimIdByVin, vehiclesOwnerByCust,
    // Insurance
    insuranceLeads, insurancePolicies, insuranceProviders, insuranceTemplates,
    insuranceCampaigns, insuranceCallLogs, insuranceManualLog, insuranceOptOuts,
    insuranceFeat, insuranceAudit,
    // Custom builds
    cbJobs, cbParts, cbVendors, cbHydrated,
    // Sales deals
    salesDealsMap,
    // Service
    serviceJobCards,
    // Staff
    staffById, staffIds, staffAttendance, staffHydrated,
    // Period + scope
    period, scope,
  ]);

  const isLoading = !vehiclesHydrated || !staffHydrated || !cbHydrated;

  return { kpis, isLoading };
}
