// FIXTURE: demo data — SPEC-VEHICLES-001 §5
// FIXTURE AUDIT 2026-04-20 (PLAN-VEHICLES-002 §1.5): removed VIN-X ANONYMIZE event — ghost scenario retired
// OwnershipChangeEvent append-only audit log for all 3 demo VINs.

import type { OwnershipChangeEvent } from '@dms/types';

export const ownershipEvents: OwnershipChangeEvent[] = [
  // ─── VIN-A events ─────────────────────────────────────────────────────────

  // Rohan row opened
  {
    id: 'evt-vina-001',
    vin: 'WBA3A5C50DF123456',
    at: '2019-03-15T09:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-blr-sa-01',
    actorRole: 'R07',
    ownershipId: 'own-vina-rohan',
    payload: { source: 'SERVICE_ONLY_WALKIN', kmAtOpen: 22000 },
    schemaVersion: 'v1',
  },
  // Rohan → Neha transfer
  {
    id: 'evt-vina-002',
    vin: 'WBA3A5C50DF123456',
    at: '2020-11-20T11:00:00.000Z',
    kind: 'TRANSFER',
    actorId: 'staff-blr-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vina-rohan',
    payload: { closedIds: ['own-vina-rohan'], openedIds: ['own-vina-neha'], kmAtClose: 39000 },
    schemaVersion: 'v1',
  },
  // Neha row opened
  {
    id: 'evt-vina-003',
    vin: 'WBA3A5C50DF123456',
    at: '2020-11-20T11:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-blr-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vina-neha',
    payload: { source: 'BN_CONSIGNMENT', kmAtOpen: 39000 },
    schemaVersion: 'v1',
  },
  // Neha → Arjun+Priya transfer (joint)
  {
    id: 'evt-vina-004',
    vin: 'WBA3A5C50DF123456',
    at: '2023-04-10T10:00:00.000Z',
    kind: 'TRANSFER',
    actorId: 'staff-blr-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vina-neha',
    payload: {
      closedIds: ['own-vina-neha'],
      openedIds: ['own-vina-arjun', 'own-vina-priya'],
      kmAtClose: 72000,
      joint: true,
    },
    schemaVersion: 'v1',
  },
  // Arjun joint row opened
  {
    id: 'evt-vina-005',
    vin: 'WBA3A5C50DF123456',
    at: '2023-04-10T10:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-blr-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vina-arjun',
    payload: { source: 'BN_SALE', kmAtOpen: 72000, isJoint: true },
    schemaVersion: 'v1',
  },
  // Priya joint row opened
  {
    id: 'evt-vina-006',
    vin: 'WBA3A5C50DF123456',
    at: '2023-04-10T10:00:00.000Z',
    kind: 'JOINT_ADD',
    actorId: 'staff-blr-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vina-priya',
    payload: { peerId: 'own-vina-arjun', customerId: 'cust-priya-mehta' },
    schemaVersion: 'v1',
  },

  // ─── VIN-B events ─────────────────────────────────────────────────────────

  // Vikram row opened
  {
    id: 'evt-vinb-001',
    vin: 'WAUFGAFR9LA003456',
    at: '2020-06-01T10:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-mum-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vinb-vikram',
    payload: { source: 'BN_SALE', kmAtOpen: 8000 },
    schemaVersion: 'v1',
  },
  // Vikram → Meera transfer
  {
    id: 'evt-vinb-002',
    vin: 'WAUFGAFR9LA003456',
    at: '2024-02-15T11:00:00.000Z',
    kind: 'TRANSFER',
    actorId: 'staff-mum-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vinb-vikram',
    payload: { closedIds: ['own-vinb-vikram'], openedIds: ['own-vinb-meera'], kmAtClose: 68000 },
    schemaVersion: 'v1',
  },
  // Meera row opened
  {
    id: 'evt-vinb-003',
    vin: 'WAUFGAFR9LA003456',
    at: '2024-02-15T11:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-mum-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vinb-meera',
    payload: { source: 'BN_SALE', kmAtOpen: 68000 },
    schemaVersion: 'v1',
  },
  // Rahul claim REJECTED
  {
    id: 'evt-vinb-004',
    vin: 'WAUFGAFR9LA003456',
    at: '2026-04-10T09:30:00.000Z',
    kind: 'CLAIM_SUBMIT',
    actorId: 'cust-rahul-kumar',
    actorRole: 'PORTAL',
    claimId: 'claim-vinb-rahul',
    payload: { claimantCustomerId: 'cust-rahul-kumar', autoMatchHit: false },
    schemaVersion: 'v1',
  },
  {
    id: 'evt-vinb-005',
    vin: 'WAUFGAFR9LA003456',
    at: '2026-04-11T10:00:00.000Z',
    kind: 'CLAIM_REJECT',
    actorId: 'staff-mum-r09-01',
    actorRole: 'R09',
    claimId: 'claim-vinb-rahul',
    payload: { category: 'DUPLICATE', overlapsOwnershipId: 'own-vinb-meera' },
    schemaVersion: 'v1',
  },

  // ─── VIN-C events ─────────────────────────────────────────────────────────

  // Sunita row opened
  {
    id: 'evt-vinc-001',
    vin: 'WP0AB2A98KS123456',
    at: '2019-07-20T09:30:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-che-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vinc-sunita',
    payload: { source: 'BN_SALE', kmAtOpen: 0 },
    schemaVersion: 'v1',
  },
  // Sunita → Karan transfer
  {
    id: 'evt-vinc-002',
    vin: 'WP0AB2A98KS123456',
    at: '2021-09-10T10:00:00.000Z',
    kind: 'TRANSFER',
    actorId: 'staff-che-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vinc-sunita',
    payload: { closedIds: ['own-vinc-sunita'], openedIds: ['own-vinc-karan'], kmAtClose: 18000 },
    schemaVersion: 'v1',
  },
  // Karan row opened
  {
    id: 'evt-vinc-003',
    vin: 'WP0AB2A98KS123456',
    at: '2021-09-10T10:00:00.000Z',
    kind: 'OPEN',
    actorId: 'staff-che-sm-01',
    actorRole: 'R09',
    ownershipId: 'own-vinc-karan',
    payload: { source: 'BN_CONSIGNMENT', kmAtOpen: 18000 },
    schemaVersion: 'v1',
  },
  // Karan MANUAL_REVOKE (mistake) 2025-11-05
  {
    id: 'evt-vinc-004',
    vin: 'WP0AB2A98KS123456',
    at: '2025-11-05T14:00:00.000Z',
    kind: 'CLOSE',
    actorId: 'staff-che-r09-01',
    actorRole: 'R09',
    ownershipId: 'own-vinc-karan',
    payload: { reason: 'MANUAL_REVOKE', graceUntilAt: '2025-11-12T14:00:00.000Z' },
    schemaVersion: 'v1',
  },
  // Karan RESTORE 2025-11-06 (priorCloseReason: MANUAL_REVOKE)
  {
    id: 'evt-vinc-005',
    vin: 'WP0AB2A98KS123456',
    at: '2025-11-06T09:00:00.000Z',
    kind: 'RESTORE',
    actorId: 'staff-che-r09-01',
    actorRole: 'R09',
    ownershipId: 'own-vinc-karan',
    payload: { priorCloseReason: 'MANUAL_REVOKE' },
    schemaVersion: 'v1',
  },
  // Karan SELF_REVOKE_SOLD 2026-04-15
  {
    id: 'evt-vinc-006',
    vin: 'WP0AB2A98KS123456',
    at: '2026-04-15T10:00:00.000Z',
    kind: 'CLOSE',
    actorId: 'cust-karan-shah',
    actorRole: 'PORTAL',
    ownershipId: 'own-vinc-karan',
    payload: { reason: 'SELF_REVOKE_SOLD', graceUntilAt: '2026-04-22T10:00:00.000Z' },
    schemaVersion: 'v1',
  },
  // Pooja claim submitted 2026-04-18
  {
    id: 'evt-vinc-007',
    vin: 'WP0AB2A98KS123456',
    at: '2026-04-18T11:00:00.000Z',
    kind: 'CLAIM_SUBMIT',
    actorId: 'cust-pooja-desai',
    actorRole: 'PORTAL',
    claimId: 'claim-vinc-pooja',
    payload: { claimantCustomerId: 'cust-pooja-desai', autoMatchHit: false },
    schemaVersion: 'v1',
  },

];
