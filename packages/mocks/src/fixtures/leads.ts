/**
 * Lead fixtures — SPEC-LEADS-001 §17
 *
 * 25 leads spread across all 7 active stages + LOST.
 * Outlets: BLR (~10), MUM (~8), CHE (~7).
 * Sources: all 5 variants (walk-in, web-form, phone, referral, service-upgrade).
 * Timestamps: Apr–May 2026.
 *
 * Customer IDs from packages/mocks/src/fixtures/customer.ts.
 * VINs from packages/mocks/src/fixtures/vehicles.ts.
 */

import type { Lead, LeadActivity } from '@dms/types';

// ─── Activity seeds ───────────────────────────────────────────────────────────

export const leadActivities: LeadActivity[] = [
  // LEAD-2026-001 (NEW, BLR) — no activities yet
  {
    id: 'lact-001-1',
    leadId: 'LEAD-2026-001',
    kind: 'note',
    at: '2026-04-28T09:15:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Walk-in at BLR showroom. Customer interested in the Porsche 911.' },
  },

  // LEAD-2026-002 (CONTACTED, BLR)
  {
    id: 'lact-002-1',
    leadId: 'LEAD-2026-002',
    kind: 'note',
    at: '2026-04-25T10:30:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Initial enquiry via web form. Customer looking for BMW M3.' },
  },
  {
    id: 'lact-002-2',
    leadId: 'LEAD-2026-002',
    kind: 'call',
    at: '2026-04-26T11:00:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Called customer, discussed features and pricing. Positive response.' },
  },

  // LEAD-2026-003 (QUALIFIED, BLR)
  {
    id: 'lact-003-1',
    leadId: 'LEAD-2026-003',
    kind: 'stage-change',
    at: '2026-04-20T09:00:00.000Z',
    actorId: 'staff-r04-001',
    actorName: 'Deepa Nair',
    payload: { fromStage: 'NEW', toStage: 'CONTACTED' },
  },
  {
    id: 'lact-003-2',
    leadId: 'LEAD-2026-003',
    kind: 'call',
    at: '2026-04-21T14:30:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Follow-up call. Customer confirmed budget of ₹1.5 crore.' },
  },
  {
    id: 'lact-003-3',
    leadId: 'LEAD-2026-003',
    kind: 'stage-change',
    at: '2026-04-22T10:00:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { fromStage: 'CONTACTED', toStage: 'QUALIFIED' },
  },
  {
    id: 'lact-003-4',
    leadId: 'LEAD-2026-003',
    kind: 'whatsapp',
    at: '2026-04-29T11:00:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Sent brochure for Land Rover Defender via WhatsApp.' },
  },

  // LEAD-2026-004 (TEST_DRIVE, BLR)
  {
    id: 'lact-004-1',
    leadId: 'LEAD-2026-004',
    kind: 'stage-change',
    at: '2026-04-18T10:00:00.000Z',
    actorId: 'staff-r04-001',
    actorName: 'Deepa Nair',
    payload: { fromStage: 'QUALIFIED', toStage: 'TEST_DRIVE' },
  },
  {
    id: 'lact-004-2',
    leadId: 'LEAD-2026-004',
    kind: 'call',
    at: '2026-04-19T15:00:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Test drive scheduled for 2 May. Customer very excited.' },
  },
  {
    id: 'lact-004-3',
    leadId: 'LEAD-2026-004',
    kind: 'call',
    at: '2026-04-28T09:00:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Confirmed test drive appointment. Sending route map.' },
  },
  {
    id: 'lact-004-4',
    leadId: 'LEAD-2026-004',
    kind: 'whatsapp',
    at: '2026-04-29T10:00:00.000Z',
    actorId: 'staff-r05-001',
    actorName: 'Rahul Kumar',
    payload: { text: 'Sent test drive confirmation and route details.' },
  },

  // LEAD-2026-005 (QUOTED, MUM)
  {
    id: 'lact-005-1',
    leadId: 'LEAD-2026-005',
    kind: 'stage-change',
    at: '2026-04-15T09:00:00.000Z',
    actorId: 'staff-r10-001',
    actorName: 'Priya Sharma',
    payload: { fromStage: 'TEST_DRIVE', toStage: 'QUOTED' },
  },
  {
    id: 'lact-005-2',
    leadId: 'LEAD-2026-005',
    kind: 'note',
    at: '2026-04-15T14:00:00.000Z',
    actorId: 'staff-r05-002',
    actorName: 'Anil Desai',
    payload: { text: 'Quote issued: ₹92.5 lakh for BMW M340i. Customer reviewing.' },
  },
  {
    id: 'lact-005-3',
    leadId: 'LEAD-2026-005',
    kind: 'whatsapp',
    at: '2026-04-28T16:00:00.000Z',
    actorId: 'staff-r05-002',
    actorName: 'Anil Desai',
    payload: { text: 'Sent revised quote with extended warranty inclusion.' },
  },

  // LEAD-2026-006 (SO_RAISED, MUM)
  {
    id: 'lact-006-1',
    leadId: 'LEAD-2026-006',
    kind: 'stage-change',
    at: '2026-04-10T11:00:00.000Z',
    actorId: 'staff-r10-001',
    actorName: 'Priya Sharma',
    payload: { fromStage: 'QUOTED', toStage: 'SO_RAISED' },
  },
  {
    id: 'lact-006-2',
    leadId: 'LEAD-2026-006',
    kind: 'note',
    at: '2026-04-10T11:30:00.000Z',
    actorId: 'staff-r10-001',
    actorName: 'Priya Sharma',
    payload: { text: 'SO raised. Token amount of ₹2 lakh collected. Delivery in 2 weeks.' },
  },

  // LEAD-2026-007 (DELIVERED, MUM)
  {
    id: 'lact-007-1',
    leadId: 'LEAD-2026-007',
    kind: 'stage-change',
    at: '2026-04-05T10:00:00.000Z',
    actorId: 'staff-r10-001',
    actorName: 'Priya Sharma',
    payload: { fromStage: 'SO_RAISED', toStage: 'DELIVERED' },
  },
  {
    id: 'lact-007-2',
    leadId: 'LEAD-2026-007',
    kind: 'note',
    at: '2026-04-05T12:00:00.000Z',
    actorId: 'staff-r10-001',
    actorName: 'Priya Sharma',
    payload: { text: 'Vehicle delivered. Customer delighted. Referral card given.' },
  },

  // LEAD-2026-008 (LOST, CHE)
  {
    id: 'lact-008-1',
    leadId: 'LEAD-2026-008',
    kind: 'stage-change',
    at: '2026-04-12T14:00:00.000Z',
    actorId: 'staff-r09-002',
    actorName: 'Sanjay Rao',
    payload: { fromStage: 'QUALIFIED', toStage: 'LOST' },
  },
  {
    id: 'lact-008-2',
    leadId: 'LEAD-2026-008',
    kind: 'note',
    at: '2026-04-12T14:05:00.000Z',
    actorId: 'staff-r09-002',
    actorName: 'Sanjay Rao',
    payload: { text: 'Customer bought from competing dealer in Bengaluru.' },
  },

  // LEAD-2026-009 (NEW, CHE) — service-upgrade source
  {
    id: 'lact-009-1',
    leadId: 'LEAD-2026-009',
    kind: 'note',
    at: '2026-04-27T08:30:00.000Z',
    actorId: 'system',
    actorName: 'System (Service Upgrade)',
    payload: { text: 'Service upgrade trigger: WP0ZZZ97ZNS112045. Vehicle age > 5 years, mileage > 70,000 km.' },
  },

  // LEAD-2026-010 (CONTACTED, CHE)
  {
    id: 'lact-010-1',
    leadId: 'LEAD-2026-010',
    kind: 'call',
    at: '2026-04-26T10:00:00.000Z',
    actorId: 'staff-r05-003',
    actorName: 'Kiran Menon',
    payload: { text: 'Referral call. Interested in Audi RS5. Setting up appointment.' },
  },
  {
    id: 'lact-010-2',
    leadId: 'LEAD-2026-010',
    kind: 'whatsapp',
    at: '2026-04-29T09:30:00.000Z',
    actorId: 'staff-r05-003',
    actorName: 'Kiran Menon',
    payload: { text: 'Sent Audi RS5 spec sheet and pricing details.' },
  },
];

// ─── Lead fixtures ────────────────────────────────────────────────────────────

export const leads: Lead[] = [
  // ── NEW stage ─────────────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-001',
    source: 'walk-in',
    stage: 'NEW',
    customerId: 'cust-arjun-mehta',
    vehicleInterestVin: 'WP0AB2A91MS247831',
    assignedAdvisorId: 'staff-r05-001',
    createdAt: '2026-04-28T09:00:00.000Z',
    lastActivityAt: '2026-04-28T09:15:00.000Z',
    nextActionAt: '2026-05-02T10:00:00.000Z',
    outletId: 'bangalore',
  },
  {
    id: 'LEAD-2026-011',
    source: 'phone',
    stage: 'NEW',
    customerId: 'cust-neha-kapoor',
    vehicleInterestVin: 'WDD2221971A012345',
    createdAt: '2026-04-29T11:00:00.000Z',
    lastActivityAt: '2026-04-29T11:00:00.000Z',
    nextActionAt: '2026-05-01T09:00:00.000Z',
    outletId: 'bangalore',
  },
  {
    id: 'LEAD-2026-012',
    source: 'web-form',
    stage: 'NEW',
    customerId: 'cust-rahul-kumar',
    vehicleInterestVin: 'WBA5U5C08MCF12345',
    leadOriginUrl: 'https://bnautomobiles.in/collection/WBA5U5C08MCF12345',
    createdAt: '2026-04-30T08:00:00.000Z',
    lastActivityAt: '2026-04-30T08:00:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-013',
    source: 'referral',
    stage: 'NEW',
    customerId: 'cust-sunita-reddy',
    vehicleInterestVin: 'WAUZZZF51NA012345',
    createdAt: '2026-04-29T15:00:00.000Z',
    lastActivityAt: '2026-04-29T15:00:00.000Z',
    nextActionAt: '2026-05-01T11:00:00.000Z',
    outletId: 'chennai',
  },

  // ── CONTACTED stage ───────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-002',
    source: 'web-form',
    stage: 'CONTACTED',
    customerId: 'cust-priya-mehta',
    vehicleInterestVin: 'WBAJY0C03MCG78901',
    assignedAdvisorId: 'staff-r05-001',
    leadOriginUrl: 'https://bnautomobiles.in/collection/WBAJY0C03MCG78901',
    createdAt: '2026-04-25T10:00:00.000Z',
    lastActivityAt: '2026-04-26T11:00:00.000Z',
    nextActionAt: '2026-04-30T10:00:00.000Z',
    outletId: 'bangalore',
  },
  {
    id: 'LEAD-2026-010',
    source: 'referral',
    stage: 'CONTACTED',
    customerId: 'cust-karan-shah',
    vehicleInterestVin: 'WAUZZZGE8PD456789',
    assignedAdvisorId: 'staff-r05-003',
    createdAt: '2026-04-25T09:00:00.000Z',
    lastActivityAt: '2026-04-29T09:30:00.000Z',
    nextActionAt: '2026-05-01T10:00:00.000Z',
    outletId: 'chennai',
  },
  {
    id: 'LEAD-2026-014',
    source: 'phone',
    stage: 'CONTACTED',
    customerId: 'cust-vikram-singh',
    vehicleInterestVin: 'SALKJBF46PA234567',
    assignedAdvisorId: 'staff-r05-002',
    createdAt: '2026-04-24T14:00:00.000Z',
    lastActivityAt: '2026-04-27T11:00:00.000Z',
    nextActionAt: '2026-05-02T14:00:00.000Z',
    outletId: 'mumbai',
  },

  // ── QUALIFIED stage ───────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-003',
    source: 'walk-in',
    stage: 'QUALIFIED',
    customerId: 'cust-meera-iyer',
    vehicleInterestVin: 'SALWR2RK5PA345678',
    assignedAdvisorId: 'staff-r05-001',
    createdAt: '2026-04-19T09:00:00.000Z',
    lastActivityAt: '2026-04-29T11:00:00.000Z',
    nextActionAt: '2026-05-03T10:00:00.000Z',
    outletId: 'bangalore',
  },
  {
    id: 'LEAD-2026-015',
    source: 'web-form',
    stage: 'QUALIFIED',
    customerId: 'cust-rohan-desai',
    vehicleInterestVin: 'WP1ZZZ9YZPS034789',
    assignedAdvisorId: 'staff-r12-001',
    leadOriginUrl: 'https://bnautomobiles.in/collection/WP1ZZZ9YZPS034789',
    createdAt: '2026-04-21T11:00:00.000Z',
    lastActivityAt: '2026-04-28T16:00:00.000Z',
    nextActionAt: '2026-05-01T10:00:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-016',
    source: 'referral',
    stage: 'QUALIFIED',
    customerId: 'cust-arjun-mehta',
    vehicleInterestVin: 'SAJWJ6FEXNCK12345',
    assignedAdvisorId: 'staff-r05-003',
    createdAt: '2026-04-22T10:00:00.000Z',
    lastActivityAt: '2026-04-28T09:00:00.000Z',
    nextActionAt: '2026-05-02T11:00:00.000Z',
    outletId: 'chennai',
  },

  // ── TEST_DRIVE stage ──────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-004',
    source: 'walk-in',
    stage: 'TEST_DRIVE',
    customerId: 'cust-vikram-singh',
    vehicleInterestVin: 'WP0ZZZ97ZNS112045',
    assignedAdvisorId: 'staff-r05-001',
    createdAt: '2026-04-17T10:00:00.000Z',
    lastActivityAt: '2026-04-29T10:00:00.000Z',
    nextActionAt: '2026-05-02T09:00:00.000Z',
    outletId: 'bangalore',
  },
  {
    id: 'LEAD-2026-017',
    source: 'phone',
    stage: 'TEST_DRIVE',
    customerId: 'cust-priya-mehta',
    vehicleInterestVin: 'WDC1930561A456789',
    assignedAdvisorId: 'staff-r05-002',
    createdAt: '2026-04-18T09:00:00.000Z',
    lastActivityAt: '2026-04-27T14:00:00.000Z',
    nextActionAt: '2026-05-01T11:00:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-018',
    source: 'service-upgrade',
    stage: 'TEST_DRIVE',
    customerId: 'cust-sunita-reddy',
    vehicleInterestVin: 'SALEA2BX5NA890123',
    assignedAdvisorId: 'staff-r05-003',
    createdAt: '2026-04-20T08:00:00.000Z',
    lastActivityAt: '2026-04-26T15:00:00.000Z',
    nextActionAt: '2026-05-03T10:00:00.000Z',
    outletId: 'chennai',
  },

  // ── QUOTED stage ──────────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-005',
    source: 'web-form',
    stage: 'QUOTED',
    customerId: 'cust-neha-kapoor',
    vehicleInterestVin: 'WBY2Z21090VX45678',
    assignedAdvisorId: 'staff-r05-002',
    leadOriginUrl: 'https://bnautomobiles.in/collection/WBY2Z21090VX45678',
    createdAt: '2026-04-10T10:00:00.000Z',
    lastActivityAt: '2026-04-28T16:00:00.000Z',
    nextActionAt: '2026-05-01T14:00:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-019',
    source: 'referral',
    stage: 'QUOTED',
    customerId: 'cust-karan-shah',
    vehicleInterestVin: 'WP0ZZZ98ZMS561902',
    assignedAdvisorId: 'staff-r05-003',
    createdAt: '2026-04-12T11:00:00.000Z',
    lastActivityAt: '2026-04-28T10:00:00.000Z',
    nextActionAt: '2026-04-30T10:00:00.000Z',
    outletId: 'chennai',
  },
  {
    id: 'LEAD-2026-020',
    source: 'walk-in',
    stage: 'QUOTED',
    customerId: 'cust-rahul-kumar',
    vehicleInterestVin: 'WBA7U8C07NCH34567',
    assignedAdvisorId: 'staff-r05-001',
    createdAt: '2026-04-13T14:00:00.000Z',
    lastActivityAt: '2026-04-27T16:00:00.000Z',
    nextActionAt: '2026-05-02T09:00:00.000Z',
    outletId: 'bangalore',
  },

  // ── SO_RAISED stage ───────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-006',
    source: 'walk-in',
    stage: 'SO_RAISED',
    customerId: 'cust-rohan-desai',
    vehicleInterestVin: 'WBSKG0C08MCK90123',
    assignedAdvisorId: 'staff-r05-002',
    createdAt: '2026-04-01T10:00:00.000Z',
    lastActivityAt: '2026-04-10T11:30:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-021',
    source: 'phone',
    stage: 'SO_RAISED',
    customerId: 'cust-meera-iyer',
    vehicleInterestVin: 'WAUZZZ4H1NA234567',
    assignedAdvisorId: 'staff-r12-002',
    createdAt: '2026-04-05T09:00:00.000Z',
    lastActivityAt: '2026-04-14T10:00:00.000Z',
    outletId: 'chennai',
  },

  // ── DELIVERED stage ───────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-007',
    source: 'referral',
    stage: 'DELIVERED',
    customerId: 'cust-vikram-singh',
    vehicleInterestVin: 'YV1LZBRMDPA123456',
    assignedAdvisorId: 'staff-r05-002',
    createdAt: '2026-03-20T10:00:00.000Z',
    lastActivityAt: '2026-04-05T12:00:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-022',
    source: 'web-form',
    stage: 'DELIVERED',
    customerId: 'cust-arjun-mehta',
    vehicleInterestVin: 'ZFF92LLA0L0260123',
    assignedAdvisorId: 'staff-r05-001',
    leadOriginUrl: 'https://bnautomobiles.in/collection/ZFF92LLA0L0260123',
    createdAt: '2026-03-15T09:00:00.000Z',
    lastActivityAt: '2026-03-28T15:00:00.000Z',
    outletId: 'bangalore',
  },

  // ── LOST stage ────────────────────────────────────────────────────────────

  {
    id: 'LEAD-2026-008',
    source: 'phone',
    stage: 'LOST',
    customerId: 'cust-priya-mehta',
    vehicleInterestVin: 'WP1ZZZ95ZNS078234',
    assignedAdvisorId: 'staff-r09-002',
    lostReason: 'Customer purchased from competing dealer in Bengaluru.',
    createdAt: '2026-04-07T10:00:00.000Z',
    lastActivityAt: '2026-04-12T14:05:00.000Z',
    outletId: 'chennai',
  },
  {
    id: 'LEAD-2026-023',
    source: 'walk-in',
    stage: 'LOST',
    customerId: 'cust-neha-kapoor',
    vehicleInterestVin: 'SALYA2EX5NA567890',
    assignedAdvisorId: 'staff-r05-002',
    lostReason: 'Budget constraints — customer deferred purchase to next year.',
    createdAt: '2026-04-08T11:00:00.000Z',
    lastActivityAt: '2026-04-18T10:00:00.000Z',
    outletId: 'mumbai',
  },
  {
    id: 'LEAD-2026-024',
    source: 'referral',
    stage: 'LOST',
    customerId: 'cust-rohan-desai',
    vehicleInterestVin: 'WDD1900761A789012',
    lostReason: 'Preferred a different body type — SUV instead of sedan.',
    createdAt: '2026-04-10T13:00:00.000Z',
    lastActivityAt: '2026-04-20T11:00:00.000Z',
    outletId: 'bangalore',
  },
  {
    id: 'LEAD-2026-025',
    source: 'web-form',
    stage: 'LOST',
    customerId: 'cust-rahul-kumar',
    vehicleInterestVin: 'SAJAABGE5KB567890',
    leadOriginUrl: 'https://bnautomobiles.in/collection/SAJAABGE5KB567890',
    lostReason: 'No follow-up from customer after 3 contact attempts.',
    createdAt: '2026-04-11T10:00:00.000Z',
    lastActivityAt: '2026-04-25T09:00:00.000Z',
    outletId: 'chennai',
  },

  // ── SERVICE-UPGRADE NEW lead (Seam 41 demo — SC-14) ───────────────────────

  {
    id: 'LEAD-2026-009',
    source: 'service-upgrade',
    stage: 'NEW',
    customerId: 'cust-sunita-reddy',
    vehicleInterestVin: 'WP0AAA1X8PSA12345',
    createdAt: '2026-04-27T08:30:00.000Z',
    lastActivityAt: '2026-04-27T08:30:00.000Z',
    nextActionAt: '2026-05-01T10:00:00.000Z',
    outletId: 'chennai',
  },
];
