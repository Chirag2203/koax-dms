/**
 * Settings domain types — SPEC-SETTINGS-001
 * All 5 types per spec §3.
 */

// ─── OutletConfig ─────────────────────────────────────────────────────────────

/** L10: code is immutable — BLR/MUM/CHE only. L1: 3 outlets fixed. */
export type OutletCode = 'BLR' | 'MUM' | 'CHE';

export interface OutletAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string; // 'Karnataka' | 'Maharashtra' | 'Tamil Nadu'
  pin: string;   // 6-digit Indian PIN
}

export interface OutletConfig {
  id: string;              // 'outlet-blr' | 'outlet-mum' | 'outlet-che'
  code: OutletCode;        // L10: immutable
  name: string;            // 'BN Automobiles Bangalore'
  address: OutletAddress;
  gstin: string;           // L2: validated, mandatory
  managerId: string;       // L3: resolves to StaffProfile.id, role R03+
  contactPhone: string;    // L8: office number only — no personal PII
  contactEmail: string;    // L8: office email only — no personal PII
  active: boolean;         // L9: soft deactivation
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}

// ─── IntegrationProvider ──────────────────────────────────────────────────────

export type IntegrationProvider =
  | 'whatsapp_bsp'
  | 'dlt_sms'
  | 'irp_einvoicing'
  | 'aadhaar_sub_kua'
  | 'razorpay'
  | 'tally_prime';

// ─── IntegrationCredential ────────────────────────────────────────────────────

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface IntegrationConnectionTestResult {
  ok: boolean;
  message: string;
  testedAt: string; // ISO 8601
}

export interface IntegrationCredential {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  secretMasked: string;    // L5: '••••••••••••K4F2' — last 4 chars, rest masked
  endpoint?: string;       // masked base URL
  lastUsedAt?: string;     // ISO 8601
  connectionTestedAt?: string;  // ISO 8601
  connectionTestResult?: IntegrationConnectionTestResult;
  connectedAt?: string;    // ISO 8601
  disconnectedAt?: string; // ISO 8601
}

// ─── FeatureFlag ──────────────────────────────────────────────────────────────

export interface FeatureFlag {
  key: string;
  value: boolean | string;
  defaultValue: boolean | string;
  description: string;
  owningSpec: string;    // e.g. 'SPEC-INSURANCE-001'
  scope: 'global' | 'outlet';
  updatedAt: string;     // ISO 8601
  updatedBy: string;     // StaffProfile.id or 'system'
}

// ─── SettingsAuditEvent ───────────────────────────────────────────────────────

export type SettingsAuditEventKind =
  | 'outlet-edit'
  | 'outlet-deactivated'
  | 'outlet-reactivated'
  | 'integration-connected'
  | 'integration-disconnected'
  | 'integration-test'
  | 'feature-flag-toggled'
  | 'rbac-matrix-viewed'
  | 'rbac-matrix-exported';

export interface SettingsAuditEvent {
  id: string;
  kind: SettingsAuditEventKind;
  at: string;              // ISO 8601
  actorId: string;         // StaffProfile.id
  actorRole: string;       // role code at time of action
  subject: string;         // outlet id, provider, or flag key
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  note?: string;
}
