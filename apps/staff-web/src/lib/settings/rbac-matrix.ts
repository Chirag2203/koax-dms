/**
 * RBAC Matrix — static data sourced from Doc 14 §§4-26
 * SPEC-SETTINGS-001 L4, L13, L17 — Seam 21
 *
 * L4: Matrix is READ-ONLY in v1. No edit affordance.
 * L13: Grouped by domain. ~79 named capabilities.
 * L17: Source is Doc 14 §§4-26.
 *
 * Cell values:
 *   'allow'       = unconditional allow
 *   'deny'        = deny
 *   'conditional' = conditional (notes in condNote)
 *   'team'        = team-scoped allow
 *   'self'        = self-scoped allow
 */

export type RbacCell = 'allow' | 'deny' | 'conditional' | 'team' | 'self';

export interface RbacAction {
  id: string;
  name: string;
  domain: RbacDomain;
  /** Populated for 'conditional' cells — shown in tooltip */
  condNote?: string;
  /** Doc 14 §28 sensitive action (amber row highlight) */
  sensitive?: boolean;
}

export type RbacDomain =
  | 'Customer / Storefront'
  | 'Sales'
  | 'Procurement & Consignment'
  | 'Inspection & CPO'
  | 'Service & Workshop'
  | 'Parts'
  | 'Finance & Payments'
  | 'Marketing'
  | 'Staff & HR'
  | 'Platform & Settings';

/** Role columns shown in matrix. R20/R21 are external (customer/consignor), noted in header. */
export const RBAC_ROLE_COLUMNS = [
  'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R22',
  'R23', 'R24',
] as const;

export type RbacRoleColumn = typeof RBAC_ROLE_COLUMNS[number];

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  R01: 'Super Admin',
  R02: 'Org Admin',
  R03: 'Outlet Manager',
  R04: 'Sales Manager',
  R05: 'Sales Executive',
  R06: 'Procurement Mgr',
  R07: 'Inspector',
  R08: 'Workshop Mgr',
  R09: 'Service Advisor',
  R10: 'Master Technician',
  R11: 'Technician',
  R12: 'Parts Manager',
  R13: 'Parts Counter',
  R14: 'Body Shop Mgr',
  R15: 'Finance Executive',
  R16: 'Finance Head',
  R17: 'AP Clerk',
  R18: 'Marketing Exec',
  R19: 'General Manager',
  R20: 'Customer (External)',
  R21: 'Consignor (External)',
  R22: 'Auditor / CFO',
  R23: 'DPO',
  R24: 'CEO',
};

export interface RbacMatrixRow {
  action: RbacAction;
  /** Keyed by role column — only non-deny values need explicit entry; missing = deny */
  cells: Partial<Record<RbacRoleColumn, RbacCell>>;
  condNotes?: Partial<Record<RbacRoleColumn, string>>;
}

// ─── Helper builders ──────────────────────────────────────────────────────────

function allAllow(roles: readonly RbacRoleColumn[]): Partial<Record<RbacRoleColumn, RbacCell>> {
  return Object.fromEntries(roles.map((r) => [r, 'allow'])) as Partial<Record<RbacRoleColumn, RbacCell>>;
}

const ALL_COLS = RBAC_ROLE_COLUMNS;
const ADMIN_COLS: RbacRoleColumn[] = ['R01', 'R02', 'R19', 'R24'];
const SENIOR_SALES: RbacRoleColumn[] = ['R01', 'R02', 'R03', 'R04', 'R19', 'R24'];

// ─── Matrix rows (Doc 14 §§4-26) ─────────────────────────────────────────────

export const RBAC_MATRIX_ROWS: RbacMatrixRow[] = [

  // ── Customer / Storefront (15 actions) ───────────────────────────────────────

  {
    action: { id: 'cust.browse', name: 'Browse vehicle inventory', domain: 'Customer / Storefront' },
    cells: allAllow(ALL_COLS),
  },
  {
    action: { id: 'cust.enquire', name: 'Submit enquiry', domain: 'Customer / Storefront' },
    cells: allAllow(ALL_COLS),
  },
  {
    action: { id: 'cust.reserve', name: 'Reserve vehicle (token)', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.view-profile', name: 'View customer profile', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R09', 'R15', 'R16', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'cust.edit-profile', name: 'Edit customer profile', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R09', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.kyc-verify', name: 'Verify KYC (Aadhaar/PAN)', domain: 'Customer / Storefront', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R05', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.merge-dups', name: 'Merge duplicate customers', domain: 'Customer / Storefront', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.delete', name: 'Delete customer record', domain: 'Customer / Storefront', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R24']),
  },
  {
    action: { id: 'cust.export', name: 'Export customer data (CSV)', domain: 'Customer / Storefront', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'cust.dsar', name: 'Process DPDP data-subject request', domain: 'Customer / Storefront', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R23', 'R24']),
  },
  {
    action: { id: 'cust.consent-view', name: 'View consent log', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R22', 'R23', 'R24']),
  },
  {
    action: { id: 'cust.contact-whatsapp', name: 'Send WhatsApp to customer', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R09', 'R18', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.ownership-claim', name: 'Approve ownership claim', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R05', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.consignor-approve', name: 'Approve consignor payout', domain: 'Customer / Storefront', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'cust.support', name: 'Raise / resolve support ticket', domain: 'Customer / Storefront' },
    cells: allAllow(['R01', 'R02', 'R03', 'R09', 'R19', 'R24']),
  },

  // ── Sales (14 actions) ────────────────────────────────────────────────────────

  {
    action: { id: 'sales.view-pipeline', name: 'View sales pipeline', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'sales.create-deal', name: 'Create sales deal', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.update-deal', name: 'Update deal status', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.approve-discount', name: 'Approve discount > 2%', domain: 'Sales', sensitive: true },
    cells: allAllow(SENIOR_SALES),
  },
  {
    action: { id: 'sales.generate-proforma', name: 'Generate proforma invoice', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R15', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.collect-token', name: 'Collect token payment (Razorpay)', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R15', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.generate-sale-deed', name: 'Generate sale deed', domain: 'Sales', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R15', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.cancel-deal', name: 'Cancel active deal', domain: 'Sales', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.refund', name: 'Issue token refund', domain: 'Sales', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.irn', name: 'Generate IRN (e-invoice)', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R15', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.tcs-exempt', name: 'Apply TCS exemption', domain: 'Sales', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.handover', name: 'Complete vehicle handover', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R19', 'R24']),
  },
  {
    action: { id: 'sales.view-all-outlets', name: 'View deals across all outlets', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'sales.export', name: 'Export deal data', domain: 'Sales' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R19', 'R22', 'R24']),
  },

  // ── Procurement & Consignment (9 actions) ─────────────────────────────────────

  {
    action: { id: 'proc.view-appraisal', name: 'View appraisal record', domain: 'Procurement & Consignment' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R06', 'R07', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'proc.create-appraisal', name: 'Create appraisal', domain: 'Procurement & Consignment' },
    cells: allAllow(['R01', 'R02', 'R03', 'R06', 'R07', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.approve-appraisal', name: 'Approve appraisal value', domain: 'Procurement & Consignment', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R06', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.consign', name: 'Onboard consignment vehicle', domain: 'Procurement & Consignment' },
    cells: allAllow(['R01', 'R02', 'R03', 'R06', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.consign-agreement', name: 'Sign consignment agreement', domain: 'Procurement & Consignment', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R06', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.revoke-consignment', name: 'Revoke consignment agreement', domain: 'Procurement & Consignment', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R06', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.set-listing-price', name: 'Set listing price', domain: 'Procurement & Consignment' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R06', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.update-cost-ledger', name: 'Update cost ledger', domain: 'Procurement & Consignment' },
    cells: allAllow(['R01', 'R02', 'R03', 'R06', 'R15', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'proc.export-costs', name: 'Export cost ledger', domain: 'Procurement & Consignment' },
    cells: allAllow(['R01', 'R02', 'R03', 'R16', 'R19', 'R22', 'R24']),
  },

  // ── Inspection & CPO (5 actions) ──────────────────────────────────────────────

  {
    action: { id: 'insp.view', name: 'View inspection report', domain: 'Inspection & CPO' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'insp.create', name: 'Create inspection checklist', domain: 'Inspection & CPO' },
    cells: allAllow(['R01', 'R02', 'R03', 'R07', 'R08', 'R19', 'R24']),
  },
  {
    action: { id: 'insp.submit', name: 'Submit inspection result', domain: 'Inspection & CPO' },
    cells: allAllow(['R01', 'R02', 'R03', 'R07', 'R08', 'R10', 'R19', 'R24']),
  },
  {
    action: { id: 'insp.cpo-certify', name: 'Issue CPO certification', domain: 'Inspection & CPO', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R07', 'R19', 'R24']),
  },
  {
    action: { id: 'insp.qc-override', name: 'Override QC failure', domain: 'Inspection & CPO', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R19', 'R24']),
  },

  // ── Service & Workshop (10 actions) ───────────────────────────────────────────

  {
    action: { id: 'svc.view-jobcard', name: 'View job card', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R10', 'R11', 'R14', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'svc.create-jobcard', name: 'Create job card', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.assign-bay', name: 'Assign service bay', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.labour-estimate', name: 'Create labour estimate', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R10', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.approve-estimate', name: 'Approve estimate (R-Auth)', domain: 'Service & Workshop', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.close-jobcard', name: 'Close job card', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.warranty-claim', name: 'Raise warranty claim', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R10', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.warranty-reject', name: 'Reject warranty claim', domain: 'Service & Workshop', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.booking-manage', name: 'Manage service bookings', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'svc.reports', name: 'View service reports', domain: 'Service & Workshop' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R14', 'R19', 'R22', 'R24']),
  },

  // ── Parts (7 actions) ─────────────────────────────────────────────────────────

  {
    action: { id: 'parts.view-catalogue', name: 'View parts catalogue', domain: 'Parts' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R09', 'R10', 'R11', 'R12', 'R13', 'R14', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'parts.create-po', name: 'Create purchase order', domain: 'Parts' },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R13', 'R19', 'R24']),
  },
  {
    action: { id: 'parts.approve-po', name: 'Approve purchase order', domain: 'Parts', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R19', 'R24']),
  },
  {
    action: { id: 'parts.grn', name: 'Process GRN', domain: 'Parts' },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R13', 'R19', 'R24']),
  },
  {
    action: { id: 'parts.stock-adjust', name: 'Manual stock adjustment', domain: 'Parts', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R19', 'R24']),
  },
  {
    action: { id: 'parts.issue-to-job', name: 'Issue parts to job card', domain: 'Parts' },
    cells: allAllow(['R01', 'R02', 'R08', 'R10', 'R11', 'R12', 'R13', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'parts.export', name: 'Export stock report', domain: 'Parts' },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R19', 'R22', 'R24']),
  },

  // ── Finance & Payments (12 actions) ───────────────────────────────────────────

  {
    action: { id: 'fin.view-ledger', name: 'View financial ledger', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R03', 'R15', 'R16', 'R17', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'fin.create-journal', name: 'Create journal entry', domain: 'Finance & Payments', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R15', 'R16', 'R17', 'R19', 'R24']),
  },
  {
    action: { id: 'fin.approve-journal', name: 'Approve journal entry', domain: 'Finance & Payments', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'fin.generate-invoice', name: 'Generate GST invoice', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R03', 'R15', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'fin.irn-generate', name: 'Generate IRN / QR (IRP)', domain: 'Finance & Payments', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R15', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'fin.view-salary', name: 'View staff salary (outlet)', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R03', 'R16', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'fin.update-salary', name: 'Update salary structure', domain: 'Finance & Payments', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R16', 'R22', 'R24']),
  },
  {
    action: { id: 'fin.refund-approve', name: 'Approve refund > ₹25k', domain: 'Finance & Payments', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'fin.tally-sync', name: 'Trigger Tally sync', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R15', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'fin.reports', name: 'View financial reports', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R03', 'R15', 'R16', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'fin.export', name: 'Export financial data', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R16', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'fin.audit-log', name: 'View financial audit log', domain: 'Finance & Payments' },
    cells: allAllow(['R01', 'R02', 'R16', 'R19', 'R22', 'R24']),
  },

  // ── Marketing (7 actions) ─────────────────────────────────────────────────────

  {
    action: { id: 'mkt.view-campaigns', name: 'View marketing campaigns', domain: 'Marketing' },
    cells: allAllow(['R01', 'R02', 'R03', 'R18', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'mkt.create-campaign', name: 'Create campaign', domain: 'Marketing' },
    cells: allAllow(['R01', 'R02', 'R03', 'R18', 'R19', 'R24']),
  },
  {
    action: { id: 'mkt.whatsapp-blast', name: 'Send WhatsApp blast', domain: 'Marketing', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R18', 'R19', 'R24']),
  },
  {
    action: { id: 'mkt.dlt-template', name: 'Register DLT SMS template', domain: 'Marketing', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R19', 'R24']),
  },
  {
    action: { id: 'mkt.insurance-campaign', name: 'Launch insurance campaign', domain: 'Marketing' },
    cells: allAllow(['R01', 'R02', 'R03', 'R18', 'R19', 'R24']),
  },
  {
    action: { id: 'mkt.view-leads', name: 'View insurance leads', domain: 'Marketing' },
    cells: allAllow(['R01', 'R02', 'R03', 'R18', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'mkt.reports', name: 'View marketing reports', domain: 'Marketing' },
    cells: allAllow(['R01', 'R02', 'R03', 'R18', 'R19', 'R22', 'R24']),
  },

  // ── Staff & HR (8 actions) ────────────────────────────────────────────────────

  {
    action: { id: 'staff.view-directory', name: 'View staff directory', domain: 'Staff & HR' },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R12', 'R14', 'R16', 'R19', 'R22', 'R24']),
  },
  {
    action: { id: 'staff.onboard', name: 'Onboard new staff', domain: 'Staff & HR', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R19', 'R24']),
  },
  {
    action: { id: 'staff.role-change', name: 'Change staff role', domain: 'Staff & HR', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R19', 'R24']),
  },
  {
    action: { id: 'staff.leave-approve', name: 'Approve leave request', domain: 'Staff & HR' },
    cells: { R01: 'allow', R02: 'allow', R03: 'allow', R08: 'allow', R10: 'team', R12: 'allow', R14: 'allow', R19: 'allow', R24: 'allow' },
    condNotes: { R10: 'Approves own team only' },
  },
  {
    action: { id: 'staff.exit-initiate', name: 'Initiate exit workflow', domain: 'Staff & HR', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R19', 'R24']),
  },
  {
    action: { id: 'staff.fnf', name: 'Finalize F&F settlement', domain: 'Staff & HR', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R16', 'R19', 'R24']),
  },
  {
    action: { id: 'staff.attendance-override', name: 'Manual attendance override', domain: 'Staff & HR', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R03', 'R08', 'R12', 'R14', 'R19', 'R24']),
  },
  {
    action: { id: 'staff.dpdp-anonymize', name: 'Trigger DPDP anonymization', domain: 'Staff & HR', sensitive: true },
    cells: allAllow(['R01', 'R23', 'R24']),
  },

  // ── Platform & Settings (6 actions) ──────────────────────────────────────────

  {
    action: { id: 'plat.view-settings', name: 'View settings hub', domain: 'Platform & Settings' },
    cells: allAllow(['R01', 'R02', 'R03', 'R04', 'R08', 'R12', 'R14', 'R15', 'R16', 'R19', 'R22', 'R23', 'R24']),
  },
  {
    action: { id: 'plat.edit-outlet', name: 'Edit outlet configuration', domain: 'Platform & Settings', sensitive: true },
    cells: allAllow(ADMIN_COLS),
  },
  {
    action: { id: 'plat.toggle-flag', name: 'Toggle feature flag', domain: 'Platform & Settings', sensitive: true },
    cells: allAllow(ADMIN_COLS),
  },
  {
    action: { id: 'plat.manage-integration', name: 'Manage integration credentials', domain: 'Platform & Settings', sensitive: true },
    cells: allAllow(['R01', 'R02', 'R22', 'R24']),
  },
  {
    action: { id: 'plat.view-audit', name: 'View settings audit log', domain: 'Platform & Settings' },
    cells: allAllow(['R01', 'R02', 'R03', 'R12', 'R16', 'R19', 'R22', 'R23', 'R24']),
  },
  {
    action: { id: 'plat.export-audit', name: 'Export audit log (watermarked)', domain: 'Platform & Settings' },
    cells: allAllow(['R01', 'R02', 'R19', 'R22', 'R24']),
  },
];

// ─── Domain ordering ──────────────────────────────────────────────────────────

export const RBAC_DOMAIN_ORDER: RbacDomain[] = [
  'Customer / Storefront',
  'Sales',
  'Procurement & Consignment',
  'Inspection & CPO',
  'Service & Workshop',
  'Parts',
  'Finance & Payments',
  'Marketing',
  'Staff & HR',
  'Platform & Settings',
];
