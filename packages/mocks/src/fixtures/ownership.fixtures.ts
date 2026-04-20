// FIXTURE: demo data — SPEC-VEHICLES-001 §5
// VehicleOwnership rows for all 3 demo VINs + VIN-X ghost.
// Covers all 5 ownership states: ACTIVE, TRANSFERRED, REVOKED, PENDING_CLAIM, REJECTED
// Also demonstrates: GRACE, joint ownership, anonymized row.

import type { VehicleOwnership } from '@dms/types';

// ─── VIN-A: WBA3A5C50DF123456 — 2018 BMW M340i, BLR-01 ──────────────────────
//
// Ownership chain:
//   1. cust-rohan-desai  SERVICE_ONLY_WALKIN  2019-03-15 → 2020-11-20  km 22k→39k  TRANSFERRED
//   2. cust-neha-kapoor  BN_CONSIGNMENT       2020-11-20 → 2023-04-10  km 39k→72k  TRANSFERRED
//   3a. cust-arjun-mehta BN_SALE (joint)      2023-04-10 → present     km 72k→93k  ACTIVE
//   3b. cust-priya-mehta (joint peer)          2023-04-10 → present                 ACTIVE

export const ownershipRows: VehicleOwnership[] = [
  // ── VIN-A row 1 ───────────────────────────────────────────────────────────
  {
    id: 'own-vina-rohan',
    vin: 'WBA3A5C50DF123456',
    customerId: 'cust-rohan-desai',
    source: 'SERVICE_ONLY_WALKIN',
    state: 'TRANSFERRED',
    isJoint: false,
    fromAt: '2019-03-15T09:00:00.000Z',
    toAt: '2020-11-20T11:00:00.000Z',
    kmAtOpen: 22000,
    kmAtClose: 39000,
    kmStale: false,
    closeReason: 'BN_SALE_TRANSFER',
    createdBy: 'staff-blr-sa-01',
    createdAt: '2019-03-15T09:00:00.000Z',
    closedBy: 'staff-blr-sm-01',
    closedAt: '2020-11-20T11:00:00.000Z',
    piiRetentionUntil: '2027-11-15T00:00:00.000Z', // toAt + 2555 days
    schemaVersion: 'v1',
  },

  // ── VIN-A row 2 ───────────────────────────────────────────────────────────
  {
    id: 'own-vina-neha',
    vin: 'WBA3A5C50DF123456',
    customerId: 'cust-neha-kapoor',
    source: 'BN_CONSIGNMENT',
    state: 'TRANSFERRED',
    isJoint: false,
    fromAt: '2020-11-20T11:00:00.000Z',
    toAt: '2023-04-10T10:00:00.000Z',
    kmAtOpen: 39000,
    kmAtClose: 72000,
    kmStale: false,
    closeReason: 'BN_SALE_TRANSFER',
    linkedSalesOrderId: 'so-vina-neha-001',
    createdBy: 'staff-blr-sm-01',
    createdAt: '2020-11-20T11:00:00.000Z',
    closedBy: 'staff-blr-sm-01',
    closedAt: '2023-04-10T10:00:00.000Z',
    piiRetentionUntil: '2030-04-04T00:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ── VIN-A row 3a — Arjun (joint primary) ─────────────────────────────────
  {
    id: 'own-vina-arjun',
    vin: 'WBA3A5C50DF123456',
    customerId: 'cust-arjun-mehta',
    source: 'BN_SALE',
    state: 'ACTIVE',
    isJoint: true,
    fromAt: '2023-04-10T10:00:00.000Z',
    kmAtOpen: 72000,
    kmStale: false,
    linkedSalesOrderId: 'so-vina-arjun-001',
    createdBy: 'staff-blr-sm-01',
    createdAt: '2023-04-10T10:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ── VIN-A row 3b — Priya (joint peer) ────────────────────────────────────
  {
    id: 'own-vina-priya',
    vin: 'WBA3A5C50DF123456',
    customerId: 'cust-priya-mehta',
    source: 'BN_SALE',
    state: 'ACTIVE',
    isJoint: true,
    fromAt: '2023-04-10T10:00:00.000Z',
    kmAtOpen: 72000,
    kmStale: false,
    linkedSalesOrderId: 'so-vina-arjun-001',
    createdBy: 'staff-blr-sm-01',
    createdAt: '2023-04-10T10:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ─── VIN-B: WAUFGAFR9LA003456 — 2020 Audi RS5, MUM-01 ───────────────────
  //
  // Ownership chain:
  //   1. cust-vikram-singh BN_SALE  2020-06-01 → 2024-02-15  km 8k→68k  TRANSFERRED
  //   2. cust-meera-iyer   BN_SALE  2024-02-15 → present      km 68k→78k ACTIVE (CPO-at-risk)

  // ── VIN-B row 1 ───────────────────────────────────────────────────────────
  {
    id: 'own-vinb-vikram',
    vin: 'WAUFGAFR9LA003456',
    customerId: 'cust-vikram-singh',
    source: 'BN_SALE',
    state: 'TRANSFERRED',
    isJoint: false,
    fromAt: '2020-06-01T10:00:00.000Z',
    toAt: '2024-02-15T11:00:00.000Z',
    kmAtOpen: 8000,
    kmAtClose: 68000,
    kmStale: false,
    closeReason: 'BN_SALE_TRANSFER',
    linkedSalesOrderId: 'so-vinb-vikram-001',
    createdBy: 'staff-mum-sm-01',
    createdAt: '2020-06-01T10:00:00.000Z',
    closedBy: 'staff-mum-sm-01',
    closedAt: '2024-02-15T11:00:00.000Z',
    piiRetentionUntil: '2031-02-09T00:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ── VIN-B row 2 — Meera (ACTIVE, CPO-at-risk: only 1 JC in last 12mo) ───
  {
    id: 'own-vinb-meera',
    vin: 'WAUFGAFR9LA003456',
    customerId: 'cust-meera-iyer',
    source: 'BN_SALE',
    state: 'ACTIVE',
    isJoint: false,
    fromAt: '2024-02-15T11:00:00.000Z',
    kmAtOpen: 68000,
    kmStale: false,
    linkedSalesOrderId: 'so-vinb-meera-001',
    createdBy: 'staff-mum-sm-01',
    createdAt: '2024-02-15T11:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ─── VIN-C: WP0AB2A98KS123456 — 2019 Porsche 911, CHE-01 ─────────────────
  //
  // Ownership chain:
  //   1. cust-sunita-reddy  BN_SALE       2019-07-20 → 2021-09-10             TRANSFERRED
  //   2a. cust-karan-shah   BN_CONSIGNMENT 2021-09-10 → REVOKED 2025-11-05   (mistake)
  //       → RESTORE 2025-11-06 → ACTIVE again
  //       → SELF_REVOKE_SOLD 2026-04-15 → in grace until 2026-04-22

  // ── VIN-C row 1 — Sunita ─────────────────────────────────────────────────
  {
    id: 'own-vinc-sunita',
    vin: 'WP0AB2A98KS123456',
    customerId: 'cust-sunita-reddy',
    source: 'BN_SALE',
    state: 'TRANSFERRED',
    isJoint: false,
    fromAt: '2019-07-20T09:30:00.000Z',
    toAt: '2021-09-10T10:00:00.000Z',
    kmAtOpen: 0,
    kmAtClose: 18000,
    kmStale: false,
    closeReason: 'BN_SALE_TRANSFER',
    linkedSalesOrderId: 'so-vinc-sunita-001',
    createdBy: 'staff-che-sm-01',
    createdAt: '2019-07-20T09:30:00.000Z',
    closedBy: 'staff-che-sm-01',
    closedAt: '2021-09-10T10:00:00.000Z',
    piiRetentionUntil: '2028-09-04T00:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ── VIN-C row 2a — Karan (REVOKED / GRACE) ───────────────────────────────
  // History: opened 2021-09-10 → REVOKED 2025-11-05 (MANUAL_REVOKE, mistake)
  //          → RESTORED 2025-11-06 (back to ACTIVE)
  //          → SELF_REVOKE_SOLD 2026-04-15 → graceUntilAt 2026-04-22
  // Today (2026-04-20) → effective state = GRACE
  {
    id: 'own-vinc-karan',
    vin: 'WP0AB2A98KS123456',
    customerId: 'cust-karan-shah',
    source: 'BN_CONSIGNMENT',
    state: 'REVOKED',
    isJoint: false,
    fromAt: '2021-09-10T10:00:00.000Z',
    toAt: '2026-04-15T10:00:00.000Z',
    kmAtOpen: 18000,
    kmAtClose: 41000,
    kmStale: false,
    graceUntilAt: '2026-04-22T10:00:00.000Z', // 7d from self-revoke
    closeReason: 'SELF_REVOKE_SOLD',
    createdBy: 'staff-che-sm-01',
    createdAt: '2021-09-10T10:00:00.000Z',
    closedBy: 'cust-karan-shah',
    closedAt: '2026-04-15T10:00:00.000Z',
    piiRetentionUntil: '2033-04-10T00:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ─── VIN-X: WBA5A5C5XFD654321 — 2017 BMW 5 Series — anonymized ghost ─────
  // piiRetentionUntil is in the past; customerId replaced with anon sentinel.
  // Demonstrates anonymized-row display in C360/portal (SPEC-VEHICLES-001 §5).
  {
    id: 'own-vinx-anon',
    vin: 'WBA5A5C5XFD654321',
    customerId: 'anon-1', // replaced by anonymizeRow()
    source: 'BN_SALE',
    state: 'TRANSFERRED',
    isJoint: false,
    fromAt: '2018-04-10T09:00:00.000Z',
    toAt: '2023-01-15T10:00:00.000Z',
    kmAtOpen: 5000,
    kmAtClose: 102000,
    kmStale: false,
    closeReason: 'BN_SALE_TRANSFER',
    createdBy: 'staff-blr-sm-01',
    createdAt: '2018-04-10T09:00:00.000Z',
    closedBy: 'staff-blr-sm-01',
    closedAt: '2023-01-15T10:00:00.000Z',
    piiRetentionUntil: '2023-01-14T00:00:00.000Z', // PAST — already anonymized
    schemaVersion: 'v1',
  },
];
