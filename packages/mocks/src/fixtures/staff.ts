/**
 * Staff fixture — SPEC-STAFF-001 §L3
 *
 * staffUsers is derived from the canonical 24-profile list in staff-profiles.ts.
 * All other modules should import MOCK_STAFF_PROFILES directly from staff-profiles.ts
 * or via the @dms/mocks/fixtures barrel.
 */
import type {
  StaffUser,
  CommandPaletteItem,
  StaffNotification,
  DashboardStat,
} from '@dms/types';
import { vehicles } from './vehicles';
import { MOCK_STAFF_PROFILES } from './staff-profiles';

// ─── Re-export canonical profiles (SPEC-STAFF-001 §L3) ───────────────────────
export { MOCK_STAFF_PROFILES } from './staff-profiles';

// ─── staffUsers — StaffUser view of the canonical 24-profile list ─────────────
// StaffProfile is a superset of StaffUser; this pick satisfies legacy consumers.
export const staffUsers: StaffUser[] = MOCK_STAFF_PROFILES.map((p) => ({
  id: p.id,
  name: p.name,
  email: p.email,
  avatar: p.avatar,
  role: p.role,
  roleName: p.roleName,
  outlet: p.outlet,
  permissions: p.permissions,
}));

// ─── Command Palette Items (~50) ──────────────────────────────────────────────

// Top 10 vehicles from the vehicles fixture
const vehicleItems: CommandPaletteItem[] = vehicles.slice(0, 10).map((v) => ({
  id: `vehicle-${v.vin}`,
  type: 'vehicle',
  label: `${v.year} ${v.make} ${v.model} ${v.variant}`,
  hint: v.vin,
  category: 'Vehicles',
  href: `/inventory/${v.vin}`,
}));

// Placeholder customers (customer fixture not yet built)
const customerItems: CommandPaletteItem[] = [
  {
    id: 'customer-001',
    type: 'customer',
    label: 'Rohit Malhotra',
    hint: 'rohit.malhotra@gmail.com',
    category: 'Customers',
    href: '/customers/customer-001',
  },
  {
    id: 'customer-002',
    type: 'customer',
    label: 'Kavitha Nair',
    hint: 'kavitha.nair@outlook.com',
    category: 'Customers',
    href: '/customers/customer-002',
  },
  {
    id: 'customer-003',
    type: 'customer',
    label: 'Siddharth Joshi',
    hint: 'siddharth.joshi@gmail.com',
    category: 'Customers',
    href: '/customers/customer-003',
  },
  {
    id: 'customer-004',
    type: 'customer',
    label: 'Divya Menon',
    hint: 'divya.menon@yahoo.com',
    category: 'Customers',
    href: '/customers/customer-004',
  },
  {
    id: 'customer-005',
    type: 'customer',
    label: 'Aditya Rao',
    hint: 'aditya.rao@protonmail.com',
    category: 'Customers',
    href: '/customers/customer-005',
  },
];

// 10 action items
const actionItems: CommandPaletteItem[] = [
  {
    id: 'action-new-vehicle',
    type: 'action',
    label: 'Create New Vehicle Listing',
    hint: 'Add vehicle to inventory',
    category: 'Quick Actions',
    shortcut: 'N+V',
    href: '/inventory/new',
  },
  {
    id: 'action-new-lead',
    type: 'action',
    label: 'New Lead',
    hint: 'Log a new sales lead',
    category: 'Quick Actions',
    shortcut: 'N+L',
    href: '/sales/leads/new',
  },
  {
    id: 'action-new-appointment',
    type: 'action',
    label: 'New Appointment',
    hint: 'Schedule a test drive or service visit',
    category: 'Quick Actions',
    shortcut: 'N+A',
    href: '/appointments/new',
  },
  {
    id: 'action-approve-grn',
    type: 'action',
    label: 'Approve GRN',
    hint: 'Approve a pending goods receipt note',
    category: 'Quick Actions',
    href: '/parts/grn/pending',
  },
  {
    id: 'action-new-job-card',
    type: 'action',
    label: 'Open Job Card',
    hint: 'Create service job card for a vehicle',
    category: 'Quick Actions',
    shortcut: 'N+J',
    href: '/service/job-cards/new',
  },
  {
    id: 'action-new-deal',
    type: 'action',
    label: 'Create Deal',
    hint: 'Start a new sales deal',
    category: 'Quick Actions',
    shortcut: 'N+D',
    href: '/sales/deals/new',
  },
  {
    id: 'action-publish-listing',
    type: 'action',
    label: 'Publish Pending Listings',
    hint: 'Review and publish vehicles awaiting approval',
    category: 'Quick Actions',
    href: '/inventory?status=in-review',
  },
  {
    id: 'action-finance-report',
    type: 'action',
    label: 'MTD Finance Report',
    hint: 'View month-to-date financial summary',
    category: 'Reports',
    shortcut: 'G+F',
    href: '/reports/finance/mtd',
  },
  {
    id: 'action-inventory-report',
    type: 'action',
    label: 'Inventory Ageing Report',
    hint: 'View vehicles > 60 days on lot',
    category: 'Reports',
    shortcut: 'G+I',
    href: '/reports/inventory/ageing',
  },
  {
    id: 'action-goto-settings',
    type: 'action',
    label: 'Settings',
    hint: 'App and profile settings',
    category: 'Navigation',
    shortcut: 'G+S',
    href: '/settings',
  },
];

// Additional deal and invoice items to hit ~50 total
const dealItems: CommandPaletteItem[] = [
  {
    id: 'deal-2026-001',
    type: 'deal',
    label: 'Deal #2026-001 — Rohit Malhotra',
    hint: 'Porsche 911 Carrera S · Reserved',
    category: 'Deals',
    href: '/sales/deals/2026-001',
  },
  {
    id: 'deal-2026-002',
    type: 'deal',
    label: 'Deal #2026-002 — Kavitha Nair',
    hint: 'BMW 7 Series · Negotiation',
    category: 'Deals',
    href: '/sales/deals/2026-002',
  },
  {
    id: 'deal-2026-003',
    type: 'deal',
    label: 'Deal #2026-003 — Siddharth Joshi',
    hint: 'Mercedes-Benz GLE · In Progress',
    category: 'Deals',
    href: '/sales/deals/2026-003',
  },
  {
    id: 'deal-2026-004',
    type: 'deal',
    label: 'Deal #2026-004 — Aditya Rao',
    hint: 'Porsche Cayenne Coupe · Docs Pending',
    category: 'Deals',
    href: '/sales/deals/2026-004',
  },
  {
    id: 'deal-2026-005',
    type: 'deal',
    label: 'Deal #2026-005 — Divya Menon',
    hint: 'Audi Q8 · Finance Approval',
    category: 'Deals',
    href: '/sales/deals/2026-005',
  },
];

const invoiceItems: CommandPaletteItem[] = [
  {
    id: 'invoice-2026-0041',
    type: 'invoice',
    label: 'Invoice #BN-2026-0041',
    hint: 'Rohit Malhotra · ₹1,52,80,000',
    category: 'Invoices',
    href: '/finance/invoices/BN-2026-0041',
  },
  {
    id: 'invoice-2026-0042',
    type: 'invoice',
    label: 'Invoice #BN-2026-0042',
    hint: 'Kavitha Nair · ₹98,50,000',
    category: 'Invoices',
    href: '/finance/invoices/BN-2026-0042',
  },
  {
    id: 'invoice-2026-0043',
    type: 'invoice',
    label: 'Invoice #BN-2026-0043',
    hint: 'Corporate Client — Tata Motors · ₹2,10,00,000',
    category: 'Invoices',
    href: '/finance/invoices/BN-2026-0043',
  },
  {
    id: 'invoice-2026-0044',
    type: 'invoice',
    label: 'Invoice #BN-2026-0044',
    hint: 'Siddharth Joshi · ₹1,08,20,000',
    category: 'Invoices',
    href: '/finance/invoices/BN-2026-0044',
  },
  {
    id: 'invoice-2026-0045',
    type: 'invoice',
    label: 'Invoice #BN-2026-0045',
    hint: 'Aditya Rao · ₹1,76,40,000',
    category: 'Invoices',
    href: '/finance/invoices/BN-2026-0045',
  },
];

const jobCardItems: CommandPaletteItem[] = [
  {
    id: 'jc-2026-0221',
    type: 'job-card',
    label: 'Job Card #JC-2026-0221',
    hint: 'Porsche 911 · Annual Service · In Progress',
    category: 'Job Cards',
    href: '/service/job-cards/JC-2026-0221',
  },
  {
    id: 'jc-2026-0222',
    type: 'job-card',
    label: 'Job Card #JC-2026-0222',
    hint: 'BMW 7 Series · Brake Service · QC Pending',
    category: 'Job Cards',
    href: '/service/job-cards/JC-2026-0222',
  },
  {
    id: 'jc-2026-0223',
    type: 'job-card',
    label: 'Job Card #JC-2026-0223',
    hint: 'Mercedes-Benz GLE · Engine Diagnostics · Waiting Parts',
    category: 'Job Cards',
    href: '/service/job-cards/JC-2026-0223',
  },
];

export const commandPaletteItems: CommandPaletteItem[] = [
  ...vehicleItems,
  ...customerItems,
  ...actionItems,
  ...dealItems,
  ...invoiceItems,
  ...jobCardItems,
];

// ─── Staff Notifications (12) ─────────────────────────────────────────────────

export const staffNotifications: StaffNotification[] = [
  {
    id: 'notif-inv-001',
    type: 'inventory',
    title: 'New Vehicle Published',
    body: '2022 Porsche Panamera 4 (MUM-112045) has been published to the storefront.',
    createdAt: '2026-04-17T09:15:00.000Z',
    isRead: false,
    href: '/inventory/WP0ZZZ97ZNS112045',
  },
  {
    id: 'notif-inv-002',
    type: 'inventory',
    title: 'Stale Vehicle Alert',
    body: '2020 BMW 7 Series (BLR-334421) has been on lot for 97 days. Consider a price review.',
    createdAt: '2026-04-16T14:30:00.000Z',
    isRead: false,
    href: '/inventory?status=published&ageing=90',
  },
  {
    id: 'notif-inv-003',
    type: 'inventory',
    title: 'Price Drop Alert',
    body: 'Competitor BBT Autohaus dropped their 992 Carrera listing by ₹3L.',
    createdAt: '2026-04-16T11:00:00.000Z',
    isRead: true,
    href: '/inventory/WP0AB2A91MS247831',
  },
  {
    id: 'notif-sales-001',
    type: 'sales',
    title: 'New Lead Assigned',
    body: 'Rohit Malhotra enquired about the Porsche 911 Carrera S. Assigned to you.',
    createdAt: '2026-04-17T10:45:00.000Z',
    isRead: false,
    href: '/sales/leads/lead-2026-041',
  },
  {
    id: 'notif-sales-002',
    type: 'sales',
    title: 'Test Drive Scheduled',
    body: 'Kavitha Nair has confirmed a test drive for BMW 7 Series on 19 Apr 2026 at 11:00.',
    createdAt: '2026-04-17T08:20:00.000Z',
    isRead: false,
    href: '/appointments/appt-2026-118',
  },
  {
    id: 'notif-sales-003',
    type: 'sales',
    title: 'Deal Moved to Reserved',
    body: 'Deal #2026-001 — Porsche 911 Carrera S has been marked as Reserved pending final docs.',
    createdAt: '2026-04-15T16:00:00.000Z',
    isRead: true,
    href: '/sales/deals/2026-001',
  },
  {
    id: 'notif-svc-001',
    type: 'service',
    title: 'Job Card Ready for QC',
    body: 'JC-2026-0221 (Porsche 911 Annual Service) has been completed and awaits QC.',
    createdAt: '2026-04-17T11:30:00.000Z',
    isRead: false,
    href: '/service/job-cards/JC-2026-0221',
  },
  {
    id: 'notif-svc-002',
    type: 'service',
    title: 'Warranty Claim Approved',
    body: 'Warranty claim #WC-2026-014 for Audi Q8 gearbox has been approved. Parts ETA: 3 working days.',
    createdAt: '2026-04-16T09:00:00.000Z',
    isRead: true,
    href: '/service/warranty/WC-2026-014',
  },
  {
    id: 'notif-svc-003',
    type: 'service',
    title: 'VHC Completed',
    body: 'Vehicle Health Check for Mercedes-Benz GLE (JC-2026-0223) completed.',
    createdAt: '2026-04-15T14:45:00.000Z',
    isRead: true,
    href: '/service/job-cards/JC-2026-0223',
  },
  {
    id: 'notif-sys-001',
    type: 'system',
    title: 'PTO Request Approved',
    body: 'Your leave request for 21-22 Apr 2026 has been approved by Sunita Reddy.',
    createdAt: '2026-04-16T17:00:00.000Z',
    isRead: false,
  },
  {
    id: 'notif-sys-002',
    type: 'system',
    title: 'Scheduled Maintenance Tonight',
    body: 'DMS will be under maintenance from 02:00-03:30 on 18 Apr 2026.',
    createdAt: '2026-04-17T07:00:00.000Z',
    isRead: false,
  },
  {
    id: 'notif-sys-003',
    type: 'system',
    title: 'New Announcement',
    body: 'Q1 FY2026-27 review meeting scheduled for 25 Apr at 10:00 AM.',
    createdAt: '2026-04-15T09:00:00.000Z',
    isRead: true,
  },
];

// ─── Dashboard KPI Stats (4) ──────────────────────────────────────────────────

export const dashboardStats: DashboardStat[] = [
  {
    id: 'stat-vehicles-in-stock',
    label: 'Vehicles in Stock',
    value: '42',
    delta: '+3 this week',
    deltaType: 'up',
    subtitle: 'Active listings',
  },
  {
    id: 'stat-open-deals',
    label: 'Open Deals',
    value: '17',
    subtitle: '₹4.2 Cr pipeline',
  },
  {
    id: 'stat-active-job-cards',
    label: 'Active Job Cards',
    value: '8',
    subtitle: '3 urgent (>2 days)',
  },
  {
    id: 'stat-revenue-mtd',
    label: 'Revenue MTD',
    value: '₹2,38,50,000',
    delta: 'vs ₹2,10,00,000 target',
    deltaType: 'up',
  },
];
