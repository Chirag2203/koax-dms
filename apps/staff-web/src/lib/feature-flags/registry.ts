/**
 * Feature Flag Registry — canonical source of truth.
 * SPEC-SETTINGS-001 §5 (L6, L12)
 *
 * This file is established by SPEC-SETTINGS-001. Every flags: frontmatter
 * entry across all module specs maps 1:1 to an entry here.
 * The Settings feature-flags route reads exclusively from this registry.
 *
 * L6: In-memory toggle only in v1. Persistence is v1.1 (DEF-SETTINGS-1).
 * L12: This file is the single source of truth for all flags.
 */

// ─── Registry entry shape ─────────────────────────────────────────────────────

export interface FeatureFlagRegistryEntry {
  key: string;
  defaultValue: boolean | string;
  description: string;
  owningSpec: string;
  scope: 'global' | 'outlet';
}

// ─── Canonical flag registry — 24 flags sourced from spec frontmatter ─────────
// Sourced from grep of flags: frontmatter across all specs in specs/modules/**/*.md

export const FEATURE_FLAGS: FeatureFlagRegistryEntry[] = [
  {
    key: 'consignor-portal.v1',
    defaultValue: true,
    description: 'Consignor portal v1 routes — listing, payout, messaging',
    owningSpec: 'SPEC-CONSIGNOR-001',
    scope: 'global',
  },
  {
    key: 'custom-builds',
    defaultValue: true,
    description: 'Custom builds module — job card, quotes, vendor management',
    owningSpec: 'SPEC-CUSTOM-BUILDS-001',
    scope: 'global',
  },
  {
    key: 'visualizer-2d',
    defaultValue: false,
    description: '2D visualizer — superseded by 3D visualizer (L51 in custom-builds spec)',
    owningSpec: 'SPEC-CUSTOM-BUILDS-001',
    scope: 'global',
  },
  {
    key: 'visualizer-3d',
    defaultValue: true,
    description: '3D visualizer for custom builds colour/trim configurator',
    owningSpec: 'SPEC-CUSTOM-BUILDS-001',
    scope: 'global',
  },
  {
    key: 'customer-portal.v1',
    defaultValue: true,
    description: 'Customer portal v1 — account, owned vehicles, service history',
    owningSpec: 'SPEC-CUSTOMER-PORTAL-001',
    scope: 'global',
  },
  {
    key: 'customer-service-booking',
    defaultValue: true,
    description: 'Customer-side online service booking flow',
    owningSpec: 'SPEC-CUSTOMER-PORTAL-002',
    scope: 'global',
  },
  {
    key: 'customers-module',
    defaultValue: true,
    description: 'Customer 360 module — profile, timeline, vehicles, interactions',
    owningSpec: 'SPEC-CUSTOMERS-001',
    scope: 'global',
  },
  {
    key: 'insurance-module',
    defaultValue: true,
    description: 'Insurance leads and quotes module',
    owningSpec: 'SPEC-INSURANCE-001',
    scope: 'global',
  },
  {
    key: 'whatsapp-marketing',
    defaultValue: false,
    description: 'WhatsApp marketing campaigns — requires WhatsApp BSP integration',
    owningSpec: 'SPEC-INSURANCE-001',
    scope: 'global',
  },
  {
    key: 'ai-calling',
    defaultValue: false,
    description: 'AI calling infrastructure for outbound lead follow-up',
    owningSpec: 'SPEC-INSURANCE-001',
    scope: 'global',
  },
  {
    key: 'feat_insurance_ai_calling',
    defaultValue: false,
    description: 'Insurance AI calling dispatch — enables automated call scheduling',
    owningSpec: 'SPEC-INSURANCE-001',
    scope: 'global',
  },
  {
    key: 'staff.inventory.v1',
    defaultValue: true,
    description: 'Staff inventory module — vehicle listing, cost ledger, CPO workflow',
    owningSpec: 'SPEC-INVENTORY-001',
    scope: 'global',
  },
  {
    key: 'parts-module',
    defaultValue: true,
    description: 'Parts module — catalogue, procurement, GRN, stock management',
    owningSpec: 'SPEC-PARTS-001',
    scope: 'global',
  },
  {
    key: 'service-integration',
    defaultValue: true,
    description: 'Service-parts cross-module seam — parts consumption from job cards',
    owningSpec: 'SPEC-PARTS-001',
    scope: 'global',
  },
  {
    key: 'staff.shell.v1',
    defaultValue: true,
    description: 'Staff app shell — sidebar, outlet switcher, role-switch dev tool',
    owningSpec: 'SPEC-PLATFORM-001',
    scope: 'global',
  },
  {
    key: 'staff.dashboard.v1',
    defaultValue: true,
    description: 'Staff dashboard — KPI tiles, activity feed, quick actions',
    owningSpec: 'SPEC-PLATFORM-001',
    scope: 'global',
  },
  {
    key: 'portal-vehicles',
    defaultValue: true,
    description: 'Portal vehicle ownership flow — claim, history, documents',
    owningSpec: 'SPEC-PORTAL-VEHICLES-001',
    scope: 'global',
  },
  {
    key: 'staff.sales.v1',
    defaultValue: true,
    description: 'Staff sales module — pipeline, deals, KYC, handover',
    owningSpec: 'SPEC-SALES-001',
    scope: 'global',
  },
  {
    key: 'staff.service.v1',
    defaultValue: true,
    description: 'Staff service module — job cards, bays, warranty, labour',
    owningSpec: 'SPEC-SERVICE-001',
    scope: 'global',
  },
  {
    key: 'staff-management',
    defaultValue: true,
    description: 'Staff management module — directory, roles, payroll, attendance, leaves',
    owningSpec: 'SPEC-STAFF-001',
    scope: 'global',
  },
  {
    key: 'hr-payroll',
    defaultValue: false,
    description: 'Payroll preview — P2 deferred; salary structures, payslip generation',
    owningSpec: 'SPEC-STAFF-001',
    scope: 'global',
  },
  {
    key: 'attendance-fingerprint',
    defaultValue: false,
    description: 'Fingerprint attendance device integration — P3 deferred',
    owningSpec: 'SPEC-STAFF-001',
    scope: 'global',
  },
  {
    key: 'storefront.landing.v1',
    defaultValue: true,
    description: 'Storefront landing page — hero, featured vehicles, editorial sections',
    owningSpec: 'SPEC-STOREFRONT-001',
    scope: 'global',
  },
  {
    key: 'settings-module',
    defaultValue: true,
    description: 'Settings module — outlet config, RBAC matrix, integrations, feature flags, audit',
    owningSpec: 'SPEC-SETTINGS-001',
    scope: 'global',
  },
];

// ─── Runtime helper — Seam 20 ──────────────────────────────────────────────────
// Seam 20: Feature flags registry → All flag-gated features.
// All flag-gated code reads from here via getFlag().
// settings-store overrides runtime values in-memory (v1); registry provides defaults.

export function getFlag(key: string): boolean | string {
  const entry = FEATURE_FLAGS.find((f) => f.key === key);
  return entry?.defaultValue ?? false;
}
