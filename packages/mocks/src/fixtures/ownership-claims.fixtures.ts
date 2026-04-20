// FIXTURE: demo data — SPEC-VEHICLES-001 §5
// OwnershipClaim rows — demonstrates REJECTED (VIN-B fraud attempt) + PENDING (VIN-C Pooja)

import type { OwnershipClaim } from '@dms/types';

export const ownershipClaims: OwnershipClaim[] = [
  // ─── VIN-B: Rahul Kumar — REJECTED (DUPLICATE) ───────────────────────────
  // Rahul tried to claim VIN-B while Meera has an ACTIVE ownership row.
  // Staff rejected with category DUPLICATE.
  {
    id: 'claim-vinb-rahul',
    vin: 'WAUFGAFR9LA003456',
    claimantCustomerId: 'cust-rahul-kumar',
    submittedAt: '2026-04-10T09:30:00.000Z',
    autoMatchHit: false,
    state: 'REJECTED',
    decidedBy: 'staff-mum-r09-01',
    decidedAt: '2026-04-11T10:00:00.000Z',
    rejectionReasonCategory: 'DUPLICATE',
    overlapsOwnershipId: 'own-vinb-meera',
    schemaVersion: 'v1',
  },

  // ─── VIN-C: Pooja Desai — PENDING ────────────────────────────────────────
  // Pooja submitted a claim on 2026-04-18. Karan's row is in 7-day grace
  // (SELF_REVOKE_SOLD 2026-04-15, graceUntilAt 2026-04-22).
  // Staff must review — no auto-match (no matching SO or JC for Pooja).
  {
    id: 'claim-vinc-pooja',
    vin: 'WP0AB2A98KS123456',
    claimantCustomerId: 'cust-pooja-desai',
    submittedAt: '2026-04-18T11:00:00.000Z',
    autoMatchHit: false,
    state: 'PENDING',
    overlapsOwnershipId: 'own-vinc-karan', // Karan's row is in grace
    schemaVersion: 'v1',
  },
];
