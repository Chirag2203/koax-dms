/**
 * Reviews & Ratings fixtures — SPEC-REVIEWS-001 §12
 *
 * 12 Review records covering:
 *   - 6 delivery reviews (VIN-based)
 *   - 6 service reviews (JC-based)
 *   - Statuses: 5 approved, 4 pending-moderation, 3 hidden
 *   - NPS scores: full range 0–10 represented
 *   - Customers: Arjun Mehta, Meera Iyer, Rohan Desai, Vikram Singh, Neha Kapoor, Rahul Kumar
 *   - Outlets: BLR-01 (7), MUM-01 (3), CHE-01 (2)
 */

import type { Review } from '@dms/types';

export const reviews: Review[] = [
  // ── BLR-01 delivery — approved (high NPS, Promoter) ──────────────────────
  {
    id: 'rev-delivery-001',
    customerId: 'cust-arjun-mehta',
    vinOrJcId: 'WBY2Z21090VX45678',   // BMW 5 Series VIN from fixtures
    kind: 'delivery',
    npsScore: 10,
    freeText:
      'Absolutely flawless experience. The team at BN was attentive, transparent about the vehicle history, and the handover ceremony was exceptional. Will recommend to everyone.',
    submittedAt: '2026-04-15T11:30:00.000Z',
    status: 'approved',
    moderatedBy: 'staff-r10-blr-01',
    moderatedAt: '2026-04-15T14:00:00.000Z',
    outletId: 'BLR-01',
    customerFirstName: 'Arjun',
    customerCity: 'Bangalore',
  },
  // ── BLR-01 service — approved (high NPS) ─────────────────────────────────
  {
    id: 'rev-service-001',
    customerId: 'cust-meera-iyer',
    vinOrJcId: 'JC-2026-BLR-0041',
    kind: 'service',
    npsScore: 9,
    freeText:
      'Service was done ahead of schedule. The job card summary was very clear about what was done. Great communication throughout.',
    submittedAt: '2026-04-18T09:15:00.000Z',
    status: 'approved',
    moderatedBy: 'staff-r10-blr-01',
    moderatedAt: '2026-04-18T10:00:00.000Z',
    outletId: 'BLR-01',
    customerFirstName: 'Meera',
    customerCity: 'Bangalore',
  },
  // ── BLR-01 delivery — approved (passive NPS 7) ───────────────────────────
  {
    id: 'rev-delivery-002',
    customerId: 'cust-rohan-desai',
    vinOrJcId: 'WAUZZZ8KXBA012345',   // Audi Q7 VIN
    kind: 'delivery',
    npsScore: 7,
    freeText:
      'Good overall experience. Slight delay in RC transfer documentation but the team kept me updated.',
    submittedAt: '2026-04-20T14:00:00.000Z',
    status: 'approved',
    moderatedBy: 'staff-r10-blr-01',
    moderatedAt: '2026-04-20T16:30:00.000Z',
    outletId: 'BLR-01',
    customerFirstName: 'Rohan',
    customerCity: 'Bangalore',
  },
  // ── BLR-01 service — pending-moderation (passive, no text) ───────────────
  {
    id: 'rev-service-002',
    customerId: 'cust-vikram-singh',
    vinOrJcId: 'JC-2026-BLR-0055',
    kind: 'service',
    npsScore: 8,
    submittedAt: '2026-04-22T08:00:00.000Z',
    status: 'pending-moderation',
    outletId: 'BLR-01',
    customerFirstName: 'Vikram',
    customerCity: 'Bangalore',
  },
  // ── BLR-01 delivery — pending-moderation (detractor, with text) ──────────
  {
    id: 'rev-delivery-003',
    customerId: 'cust-neha-kapoor',
    vinOrJcId: 'WBAFG210X0CT34567',
    kind: 'delivery',
    npsScore: 5,
    freeText:
      'The car had a scratch on the rear bumper that was not disclosed during the inspection. Expected better transparency.',
    submittedAt: '2026-04-23T13:45:00.000Z',
    status: 'pending-moderation',
    outletId: 'BLR-01',
    customerFirstName: 'Neha',
    customerCity: 'Bangalore',
  },
  // ── BLR-01 service — hidden (abusive, low NPS) ───────────────────────────
  {
    id: 'rev-service-003',
    customerId: 'cust-rahul-kumar',
    vinOrJcId: 'JC-2026-BLR-0062',
    kind: 'service',
    npsScore: 0,
    freeText: 'Completely useless service. Never coming back.',
    submittedAt: '2026-04-10T07:30:00.000Z',
    status: 'hidden',
    moderatedBy: 'staff-r02-blr-01',
    moderatedAt: '2026-04-10T09:00:00.000Z',
    hideReason: 'Contains abusive language — not representative of constructive feedback',
    outletId: 'BLR-01',
    customerFirstName: 'Rahul',
    customerCity: 'Bangalore',
  },
  // ── MUM-01 delivery — approved (high NPS) ────────────────────────────────
  {
    id: 'rev-delivery-004',
    customerId: 'cust-karan-shah',
    vinOrJcId: 'WP0ZZZ99ZTS123456',   // Porsche Panamera
    kind: 'delivery',
    npsScore: 10,
    freeText:
      'The Mumbai team went above and beyond. Pre-delivery inspection report was thorough and the handover process was premium.',
    submittedAt: '2026-03-28T10:00:00.000Z',
    status: 'approved',
    moderatedBy: 'staff-r10-mum-01',
    moderatedAt: '2026-03-28T11:30:00.000Z',
    outletId: 'MUM-01',
    customerFirstName: 'Karan',
    customerCity: 'Mumbai',
  },
  // ── MUM-01 service — approved (passive NPS) ──────────────────────────────
  {
    id: 'rev-service-004',
    customerId: 'cust-pooja-desai',
    vinOrJcId: 'JC-2026-MUM-0021',
    kind: 'service',
    npsScore: 8,
    freeText:
      'Professional and on time. Car was clean on pickup. Minor issue with billing explanation.',
    submittedAt: '2026-04-05T15:20:00.000Z',
    status: 'approved',
    moderatedBy: 'staff-r10-mum-01',
    moderatedAt: '2026-04-05T17:00:00.000Z',
    outletId: 'MUM-01',
    customerFirstName: 'Pooja',
    customerCity: 'Mumbai',
  },
  // ── MUM-01 delivery — hidden (spam, score manipulation suspected) ─────────
  {
    id: 'rev-delivery-005',
    customerId: 'cust-sunit-sharma',
    vinOrJcId: 'MBWBN90J8CB012789',
    kind: 'delivery',
    npsScore: 10,
    freeText: 'Best in the world! 10/10 10/10 10/10 BEST!!!!',
    submittedAt: '2026-04-12T22:00:00.000Z',
    status: 'hidden',
    moderatedBy: 'staff-r02-mum-01',
    moderatedAt: '2026-04-13T09:00:00.000Z',
    hideReason: 'Suspected spam submission — repetitive content, non-genuine',
    outletId: 'MUM-01',
    customerFirstName: 'Sunit',
    customerCity: 'Mumbai',
  },
  // ── CHE-01 service — pending-moderation (detractor) ──────────────────────
  {
    id: 'rev-service-005',
    customerId: 'cust-sunita-reddy',
    vinOrJcId: 'JC-2026-CHE-0014',
    kind: 'service',
    npsScore: 3,
    freeText:
      'Waited 3 extra days for the car. No one called me proactively — I had to follow up multiple times.',
    submittedAt: '2026-04-19T16:00:00.000Z',
    status: 'pending-moderation',
    outletId: 'CHE-01',
    customerFirstName: 'Sunita',
    customerCity: 'Chennai',
  },
  // ── CHE-01 delivery — pending-moderation (promoter, no text) ─────────────
  {
    id: 'rev-delivery-006',
    customerId: 'cust-arjun-mehta',
    vinOrJcId: 'MBWBN90J8CB099000',
    kind: 'delivery',
    npsScore: 9,
    submittedAt: '2026-04-25T12:00:00.000Z',
    status: 'pending-moderation',
    outletId: 'CHE-01',
    customerFirstName: 'Arjun',
    customerCity: 'Chennai',
  },
  // ── BLR-01 service — hidden (irrelevant content) ──────────────────────────
  {
    id: 'rev-service-006',
    customerId: 'cust-meera-iyer',
    vinOrJcId: 'JC-2026-BLR-0077',
    kind: 'service',
    npsScore: 6,
    freeText:
      'The review form link expired and I had to request a new one. Not related to service quality.',
    submittedAt: '2026-04-08T11:00:00.000Z',
    status: 'hidden',
    moderatedBy: 'staff-r10-blr-01',
    moderatedAt: '2026-04-08T12:30:00.000Z',
    hideReason: 'Review content does not relate to service experience',
    outletId: 'BLR-01',
    customerFirstName: 'Meera',
    customerCity: 'Bangalore',
  },
];
