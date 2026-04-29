/**
 * Insurance store — composer.
 *
 * Assembles all slice factories into a single useInsuranceStore hook.
 * Fixtures are deep-cloned on initialization so mutations do not bleed
 * back into the @dms/mocks package.
 *
 * Spec reference: SPEC-INSURANCE-001 §6
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Required for immer to handle Set/Map in state
enableMapSet();

import {
  insuranceProviders as fixtureProviders,
  insuranceLeads as fixtureLeads,
  issuedPolicies as fixturePolicies,
  whatsAppTemplates as fixtureTemplates,
  whatsAppCampaigns as fixtureCampaigns,
  aiCallLogs as fixtureCallLogs,
  insuranceOptOuts as fixtureOptOuts,
} from '@dms/mocks/fixtures';

import type { InsuranceStore, InsuranceState } from './types';
import { createLeadSlice } from './slices/lead-slice';
import { createQuoteSlice } from './slices/quote-slice';
import { createProviderSlice } from './slices/provider-slice';
import { createWhatsAppSlice } from './slices/whatsapp-slice';
import { createAICallSlice } from './slices/ai-call-slice';
import { createCommissionSlice } from './slices/commission-slice';
import { createAuditSlice } from './slices/audit-slice';

function initialState(): InsuranceState {
  return {
    leads: structuredClone(fixtureLeads),
    providers: structuredClone(fixtureProviders),
    policies: structuredClone(fixturePolicies),
    templates: structuredClone(fixtureTemplates),
    campaigns: structuredClone(fixtureCampaigns),
    callLogs: structuredClone(fixtureCallLogs),
    optOuts: new Set(fixtureOptOuts),
    // P4 L_P4_1: OFF by default — OQ4 + OQ5 prerequisites not met
    featAiCallingEnabled: false,
    auditEvents: [],
  };
}

export const useInsuranceStore = create<InsuranceStore>()(
  immer((set, get, api) => ({
    ...initialState(),
    ...createLeadSlice(set, get, api),
    ...createQuoteSlice(set, get, api),
    ...createProviderSlice(set, get, api),
    ...createWhatsAppSlice(set, get, api),
    ...createAICallSlice(set, get, api),
    ...createCommissionSlice(set, get, api),
    ...createAuditSlice(set, get, api),
  })),
);

// ─── Public re-exports ────────────────────────────────────────────────────────

export type { StoreActor, InsuranceStore, InsuranceState, InsuranceAuditEvent, InsuranceAuditEventKind } from './types';
export { VINNotFoundError, R12RequiredError, TemplateNotApprovedError, PermissionError, AICallingDisabledError } from './types';

export function useInsuranceStoreSelector<T>(selector: (s: InsuranceStore) => T): T {
  return useInsuranceStore(selector);
}
