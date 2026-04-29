import type {
  CostLedgerEntry,
  Appraisal,
  VehicleTimelineEvent,
  VehicleDocument,
} from '@dms/types';
import { vehicles as storefrontVehicles } from './vehicles';

/**
 * Inventory fixtures for BN Automobiles — Phase S2b.
 * Covers the first 10 vehicles from the vehicles fixture.
 *
 * VIN → exShowroom reference (used as base for cost calculations):
 *   WP0AB2A91MS247831 — 12,800,000  (Porsche 911 Carrera S, Bangalore)
 *   WP0ZZZ97ZNS112045 — 14,500,000  (Porsche Panamera 4, Mumbai)
 *   WP1ZZZ9YZPS034789 — 15,800,000  (Porsche Cayenne GTS, Chennai)
 *   WP1ZZZ95ZNS078234 —  7,400,000  (Porsche Macan S, Bangalore)
 *   WP0ZZZ98ZMS561902 — 11,200,000  (Porsche 718 Cayman GTS, Mumbai)
 *   WP0AAA1X8PSA12345 — 16,200,000  (Porsche Taycan 4S, Chennai)
 *   WDD2221971A012345 — 17,800,000  (Mercedes-Benz S-Class S500, Bangalore)
 *   WDC1930561A456789 — 10,200,000  (Mercedes-Benz GLE 450, Mumbai)
 *   WDD1900761A789012 — 21,500,000  (Mercedes-Benz AMG GT 63S, Chennai)
 *   WDC2229601A234567 — 15,600,000  (Mercedes-Benz GLS 600, Bangalore)
 *
 * All rupee amounts are integers (whole rupees). Dates use ISO 8601.
 * Actor R10-arjun-mehta = Arjun Mehta, Sales Manager, Mumbai.
 */

// ─── Reference data ───────────────────────────────────────────────────────────

interface VehicleRef {
  vin: string;
  exShowroom: number;
  listedAt: string; // ISO timestamp, used to derive relative dates
}

// Curated VINs (10) — full hand-authored cost ledger below
const curatedVehicleRefs: VehicleRef[] = [
  { vin: 'WP0AB2A91MS247831', exShowroom: 12800000, listedAt: '2026-03-28T08:00:00.000Z' },
  { vin: 'WP0ZZZ97ZNS112045', exShowroom: 14500000, listedAt: '2026-03-15T09:30:00.000Z' },
  { vin: 'WP1ZZZ9YZPS034789', exShowroom: 15800000, listedAt: '2026-04-01T10:00:00.000Z' },
  { vin: 'WP1ZZZ95ZNS078234', exShowroom: 7400000,  listedAt: '2026-03-10T07:00:00.000Z' },
  { vin: 'WP0ZZZ98ZMS561902', exShowroom: 11200000, listedAt: '2026-03-22T11:00:00.000Z' },
  { vin: 'WP0AAA1X8PSA12345', exShowroom: 16200000, listedAt: '2026-04-05T08:30:00.000Z' },
  { vin: 'WDD2221971A012345', exShowroom: 17800000, listedAt: '2026-04-08T09:00:00.000Z' },
  { vin: 'WDC1930561A456789', exShowroom: 10200000, listedAt: '2026-03-18T10:00:00.000Z' },
  { vin: 'WDD1900761A789012', exShowroom: 21500000, listedAt: '2026-03-30T08:00:00.000Z' },
  { vin: 'WDC2229601A234567', exShowroom: 15600000, listedAt: '2026-04-02T07:30:00.000Z' },
];

// All 28 inventory VINs — derived from storefront vehicles fixture (single source).
// Uncurated VINs (18) get stub data so /inventory/[vin] never blanks. PLAN-VEHICLES-003 L45.
const curatedVinSet = new Set(curatedVehicleRefs.map((r) => r.vin));
const vehicleRefs: VehicleRef[] = [
  ...curatedVehicleRefs,
  ...storefrontVehicles
    .filter((v) => !curatedVinSet.has(v.vin))
    .map<VehicleRef>((v) => ({
      vin: v.vin,
      exShowroom: v.pricing?.exShowroom ?? v.price ?? 0,
      listedAt: v.listedAt ?? '2026-03-15T09:00:00.000Z',
    })),
];

/** Subtract `days` from a given ISO date string and return an ISO string. */
function daysBeforeListing(listedAt: string, days: number): string {
  const d = new Date(listedAt);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ─── Cost Ledger Entries ──────────────────────────────────────────────────────

export const costLedgerEntries: CostLedgerEntry[] = [
  // ── Vehicle 1: WP0AB2A91MS247831 (Porsche 911 Carrera S) ────────────────────
  {
    id: 'CLE-001-001',
    vin: 'WP0AB2A91MS247831',
    category: 'acquisition',
    date: daysBeforeListing('2026-03-28T08:00:00.000Z', 75).split('T')[0]!,
    amount: 10240000,
    note: 'Acquisition from private seller — Suresh Krishnamurthy, Bangalore',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-28T08:00:00.000Z', 74),
  },
  {
    id: 'CLE-001-002',
    vin: 'WP0AB2A91MS247831',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-03-28T08:00:00.000Z', 65).split('T')[0]!,
    amount: 384000,
    note: 'PDK fluid change, spark plugs, brake fluid flush — Porsche Bangalore',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-28T08:00:00.000Z', 64),
  },
  {
    id: 'CLE-001-003',
    vin: 'WP0AB2A91MS247831',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-03-28T08:00:00.000Z', 55).split('T')[0]!,
    amount: 192000,
    note: 'Paint correction, ceramic coat, minor stone chips repaired',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-28T08:00:00.000Z', 54),
  },
  {
    id: 'CLE-001-004',
    vin: 'WP0AB2A91MS247831',
    category: 'registration-tax',
    date: daysBeforeListing('2026-03-28T08:00:00.000Z', 70).split('T')[0]!,
    amount: 128000,
    note: 'Karnataka RTO transfer and re-registration fees',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-28T08:00:00.000Z', 69),
  },
  {
    id: 'CLE-001-005',
    vin: 'WP0AB2A91MS247831',
    category: 'transport',
    date: daysBeforeListing('2026-03-28T08:00:00.000Z', 73).split('T')[0]!,
    amount: 38000,
    note: 'Flatbed transport — seller location to BN Automobiles Bangalore workshop',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-28T08:00:00.000Z', 72),
  },

  // ── Vehicle 2: WP0ZZZ97ZNS112045 (Porsche Panamera 4) ───────────────────────
  {
    id: 'CLE-002-001',
    vin: 'WP0ZZZ97ZNS112045',
    category: 'acquisition',
    date: daysBeforeListing('2026-03-15T09:30:00.000Z', 80).split('T')[0]!,
    amount: 12325000,
    note: 'Acquisition from corporate fleet — Mumbai',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-15T09:30:00.000Z', 79),
  },
  {
    id: 'CLE-002-002',
    vin: 'WP0ZZZ97ZNS112045',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-03-15T09:30:00.000Z', 68).split('T')[0]!,
    amount: 435000,
    note: 'Air suspension levelling, coolant system service, tyre replacement (2 rear)',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-15T09:30:00.000Z', 67),
  },
  {
    id: 'CLE-002-003',
    vin: 'WP0ZZZ97ZNS112045',
    category: 'refurb-detailing',
    date: daysBeforeListing('2026-03-15T09:30:00.000Z', 48).split('T')[0]!,
    amount: 145000,
    note: 'Full interior detail, leather conditioning, ozone treatment',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-15T09:30:00.000Z', 47),
  },
  {
    id: 'CLE-002-004',
    vin: 'WP0ZZZ97ZNS112045',
    category: 'registration-tax',
    date: daysBeforeListing('2026-03-15T09:30:00.000Z', 75).split('T')[0]!,
    amount: 145000,
    note: 'Maharashtra RTO transfer and re-registration fees',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-15T09:30:00.000Z', 74),
  },
  {
    id: 'CLE-002-005',
    vin: 'WP0ZZZ97ZNS112045',
    category: 'transport',
    date: daysBeforeListing('2026-03-15T09:30:00.000Z', 78).split('T')[0]!,
    amount: 42000,
    note: 'Enclosed transport from corporate fleet yard, Mumbai',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-15T09:30:00.000Z', 77),
  },

  // ── Vehicle 3: WP1ZZZ9YZPS034789 (Porsche Cayenne GTS) ──────────────────────
  {
    id: 'CLE-003-001',
    vin: 'WP1ZZZ9YZPS034789',
    category: 'acquisition',
    date: daysBeforeListing('2026-04-01T10:00:00.000Z', 85).split('T')[0]!,
    amount: 13430000,
    note: 'Acquisition — private seller Ramachandran Iyer, Chennai',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-01T10:00:00.000Z', 84),
  },
  {
    id: 'CLE-003-002',
    vin: 'WP1ZZZ9YZPS034789',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-04-01T10:00:00.000Z', 72).split('T')[0]!,
    amount: 474000,
    note: 'PASM recalibration, air filter, diff oil service',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-01T10:00:00.000Z', 71),
  },
  {
    id: 'CLE-003-003',
    vin: 'WP1ZZZ9YZPS034789',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-04-01T10:00:00.000Z', 52).split('T')[0]!,
    amount: 316000,
    note: 'Full paint correction, PPF on front bumper, alloy refurbishment',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-01T10:00:00.000Z', 51),
  },
  {
    id: 'CLE-003-004',
    vin: 'WP1ZZZ9YZPS034789',
    category: 'registration-tax',
    date: daysBeforeListing('2026-04-01T10:00:00.000Z', 80).split('T')[0]!,
    amount: 158000,
    note: 'Tamil Nadu RTO transfer fees and green tax',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-01T10:00:00.000Z', 79),
  },
  {
    id: 'CLE-003-005',
    vin: 'WP1ZZZ9YZPS034789',
    category: 'floor-plan-interest',
    date: daysBeforeListing('2026-04-01T10:00:00.000Z', 60).split('T')[0]!,
    amount: 48000,
    note: '30-day floor plan interest — Axis Bank',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-01T10:00:00.000Z', 59),
  },

  // ── Vehicle 4: WP1ZZZ95ZNS078234 (Porsche Macan S) ──────────────────────────
  {
    id: 'CLE-004-001',
    vin: 'WP1ZZZ95ZNS078234',
    category: 'acquisition',
    date: daysBeforeListing('2026-03-10T07:00:00.000Z', 78).split('T')[0]!,
    amount: 6290000,
    note: 'Acquisition — trade-in from sales order BN-SO-2026-0281',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-10T07:00:00.000Z', 77),
  },
  {
    id: 'CLE-004-002',
    vin: 'WP1ZZZ95ZNS078234',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-03-10T07:00:00.000Z', 64).split('T')[0]!,
    amount: 222000,
    note: 'Timing chain tensioner, brake pads all round, cabin filter',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-10T07:00:00.000Z', 63),
  },
  {
    id: 'CLE-004-003',
    vin: 'WP1ZZZ95ZNS078234',
    category: 'refurb-detailing',
    date: daysBeforeListing('2026-03-10T07:00:00.000Z', 45).split('T')[0]!,
    amount: 74000,
    note: 'Interior deep-clean, engine bay wash, tyre dressing',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-10T07:00:00.000Z', 44),
  },
  {
    id: 'CLE-004-004',
    vin: 'WP1ZZZ95ZNS078234',
    category: 'registration-tax',
    date: daysBeforeListing('2026-03-10T07:00:00.000Z', 73).split('T')[0]!,
    amount: 74000,
    note: 'Karnataka re-registration and hypothecation removal',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-10T07:00:00.000Z', 72),
  },
  {
    id: 'CLE-004-005',
    vin: 'WP1ZZZ95ZNS078234',
    category: 'transport',
    date: daysBeforeListing('2026-03-10T07:00:00.000Z', 76).split('T')[0]!,
    amount: 24000,
    note: 'Local flatbed tow — customer delivery to BN workshop Bangalore',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-10T07:00:00.000Z', 75),
  },

  // ── Vehicle 5: WP0ZZZ98ZMS561902 (Porsche 718 Cayman GTS) ───────────────────
  {
    id: 'CLE-005-001',
    vin: 'WP0ZZZ98ZMS561902',
    category: 'acquisition',
    date: daysBeforeListing('2026-03-22T11:00:00.000Z', 82).split('T')[0]!,
    amount: 9520000,
    note: 'Acquisition — private seller Nikhil Patel, Mumbai',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-22T11:00:00.000Z', 81),
  },
  {
    id: 'CLE-005-002',
    vin: 'WP0ZZZ98ZMS561902',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-03-22T11:00:00.000Z', 66).split('T')[0]!,
    amount: 336000,
    note: 'PDK clutch packs inspection, sport exhaust valve actuator service',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-22T11:00:00.000Z', 65),
  },
  {
    id: 'CLE-005-003',
    vin: 'WP0ZZZ98ZMS561902',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-03-22T11:00:00.000Z', 50).split('T')[0]!,
    amount: 224000,
    note: 'Full exterior paint correction, windshield chip repair',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-22T11:00:00.000Z', 49),
  },
  {
    id: 'CLE-005-004',
    vin: 'WP0ZZZ98ZMS561902',
    category: 'registration-tax',
    date: daysBeforeListing('2026-03-22T11:00:00.000Z', 77).split('T')[0]!,
    amount: 112000,
    note: 'Maharashtra RTO transfer fees',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-22T11:00:00.000Z', 76),
  },
  {
    id: 'CLE-005-005',
    vin: 'WP0ZZZ98ZMS561902',
    category: 'transport',
    date: daysBeforeListing('2026-03-22T11:00:00.000Z', 80).split('T')[0]!,
    amount: 35000,
    note: 'Enclosed transport from seller — Mumbai South to BN workshop Andheri',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-22T11:00:00.000Z', 79),
  },

  // ── Vehicle 6: WP0AAA1X8PSA12345 (Porsche Taycan 4S) ────────────────────────
  {
    id: 'CLE-006-001',
    vin: 'WP0AAA1X8PSA12345',
    category: 'acquisition',
    date: daysBeforeListing('2026-04-05T08:30:00.000Z', 88).split('T')[0]!,
    amount: 13770000,
    note: 'Acquisition — private seller Deepak Venkataraman, Chennai',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-05T08:30:00.000Z', 87),
  },
  {
    id: 'CLE-006-002',
    vin: 'WP0AAA1X8PSA12345',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-04-05T08:30:00.000Z', 74).split('T')[0]!,
    amount: 486000,
    note: 'Battery health calibration, HVAC condenser service, OTA software update',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-05T08:30:00.000Z', 73),
  },
  {
    id: 'CLE-006-003',
    vin: 'WP0AAA1X8PSA12345',
    category: 'refurb-detailing',
    date: daysBeforeListing('2026-04-05T08:30:00.000Z', 52).split('T')[0]!,
    amount: 162000,
    note: 'Ceramic coat, underbody protection spray, 4-wheel alignment',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-05T08:30:00.000Z', 51),
  },
  {
    id: 'CLE-006-004',
    vin: 'WP0AAA1X8PSA12345',
    category: 'registration-tax',
    date: daysBeforeListing('2026-04-05T08:30:00.000Z', 83).split('T')[0]!,
    amount: 162000,
    note: 'Tamil Nadu EV re-registration, FAME II documentation',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-05T08:30:00.000Z', 82),
  },
  {
    id: 'CLE-006-005',
    vin: 'WP0AAA1X8PSA12345',
    category: 'floor-plan-interest',
    date: daysBeforeListing('2026-04-05T08:30:00.000Z', 58).split('T')[0]!,
    amount: 52000,
    note: '35-day floor plan interest — HDFC Bank',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-05T08:30:00.000Z', 57),
  },

  // ── Vehicle 7: WDD2221971A012345 (Mercedes-Benz S500) ───────────────────────
  {
    id: 'CLE-007-001',
    vin: 'WDD2221971A012345',
    category: 'acquisition',
    date: daysBeforeListing('2026-04-08T09:00:00.000Z', 90).split('T')[0]!,
    amount: 15130000,
    note: 'Acquisition — Ganesh Agarwal, Bangalore; clean title',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-08T09:00:00.000Z', 89),
  },
  {
    id: 'CLE-007-002',
    vin: 'WDD2221971A012345',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-04-08T09:00:00.000Z', 76).split('T')[0]!,
    amount: 534000,
    note: 'Air suspension refresh, AIRMATIC sensor replacement, oil service',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-08T09:00:00.000Z', 75),
  },
  {
    id: 'CLE-007-003',
    vin: 'WDD2221971A012345',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-04-08T09:00:00.000Z', 56).split('T')[0]!,
    amount: 356000,
    note: 'Stage 2 paint correction, pillar chrome polishing, alloy refurb',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-08T09:00:00.000Z', 55),
  },
  {
    id: 'CLE-007-004',
    vin: 'WDD2221971A012345',
    category: 'registration-tax',
    date: daysBeforeListing('2026-04-08T09:00:00.000Z', 85).split('T')[0]!,
    amount: 178000,
    note: 'Karnataka RTO transfer, lifetime road tax revalidation',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-08T09:00:00.000Z', 84),
  },
  {
    id: 'CLE-007-005',
    vin: 'WDD2221971A012345',
    category: 'transport',
    date: daysBeforeListing('2026-04-08T09:00:00.000Z', 88).split('T')[0]!,
    amount: 45000,
    note: 'Enclosed transporter — seller residence to BN workshop Bangalore',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-08T09:00:00.000Z', 87),
  },

  // ── Vehicle 8: WDC1930561A456789 (Mercedes-Benz GLE 450) ────────────────────
  {
    id: 'CLE-008-001',
    vin: 'WDC1930561A456789',
    category: 'acquisition',
    date: daysBeforeListing('2026-03-18T10:00:00.000Z', 76).split('T')[0]!,
    amount: 8670000,
    note: 'Acquisition — Sonal Mehta (trade-in), Mumbai',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-18T10:00:00.000Z', 75),
  },
  {
    id: 'CLE-008-002',
    vin: 'WDC1930561A456789',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-03-18T10:00:00.000Z', 62).split('T')[0]!,
    amount: 306000,
    note: '9G-Tronic fluid change, rear brake caliper rebuild, wheel bearings',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-18T10:00:00.000Z', 61),
  },
  {
    id: 'CLE-008-003',
    vin: 'WDC1930561A456789',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-03-18T10:00:00.000Z', 48).split('T')[0]!,
    amount: 204000,
    note: 'Bumper re-spray (front), headlight restoration, full polish',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-18T10:00:00.000Z', 47),
  },
  {
    id: 'CLE-008-004',
    vin: 'WDC1930561A456789',
    category: 'registration-tax',
    date: daysBeforeListing('2026-03-18T10:00:00.000Z', 71).split('T')[0]!,
    amount: 102000,
    note: 'Maharashtra RTO name transfer and FC renewal',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-18T10:00:00.000Z', 70),
  },
  {
    id: 'CLE-008-005',
    vin: 'WDC1930561A456789',
    category: 'transport',
    date: daysBeforeListing('2026-03-18T10:00:00.000Z', 74).split('T')[0]!,
    amount: 28000,
    note: 'Flatbed transport — Powai to BN Automobiles workshop, Andheri',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-18T10:00:00.000Z', 73),
  },

  // ── Vehicle 9: WDD1900761A789012 (Mercedes-Benz AMG GT 63S) ─────────────────
  {
    id: 'CLE-009-001',
    vin: 'WDD1900761A789012',
    category: 'acquisition',
    date: daysBeforeListing('2026-03-30T08:00:00.000Z', 87).split('T')[0]!,
    amount: 18275000,
    note: 'Acquisition — Vikram Pillai, Chennai; single owner, full service history',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-30T08:00:00.000Z', 86),
  },
  {
    id: 'CLE-009-002',
    vin: 'WDD1900761A789012',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-03-30T08:00:00.000Z', 72).split('T')[0]!,
    amount: 645000,
    note: 'AMG Speedshift DCT inspection, rear LSD oil, AMG ride height calibration',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-30T08:00:00.000Z', 71),
  },
  {
    id: 'CLE-009-003',
    vin: 'WDD1900761A789012',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-03-30T08:00:00.000Z', 54).split('T')[0]!,
    amount: 430000,
    note: 'Stage 3 paint correction, PPF nose kit, carbon trim cleaning',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-30T08:00:00.000Z', 53),
  },
  {
    id: 'CLE-009-004',
    vin: 'WDD1900761A789012',
    category: 'registration-tax',
    date: daysBeforeListing('2026-03-30T08:00:00.000Z', 82).split('T')[0]!,
    amount: 215000,
    note: 'Tamil Nadu RTO transfer, green tax, FC with emission inspection',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-30T08:00:00.000Z', 81),
  },
  {
    id: 'CLE-009-005',
    vin: 'WDD1900761A789012',
    category: 'floor-plan-interest',
    date: daysBeforeListing('2026-03-30T08:00:00.000Z', 62).split('T')[0]!,
    amount: 58000,
    note: '40-day floor plan interest — ICICI Bank',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-03-30T08:00:00.000Z', 61),
  },

  // ── Vehicle 10: WDC2229601A234567 (Mercedes-Benz GLS 600) ───────────────────
  {
    id: 'CLE-010-001',
    vin: 'WDC2229601A234567',
    category: 'acquisition',
    date: daysBeforeListing('2026-04-02T07:30:00.000Z', 83).split('T')[0]!,
    amount: 13260000,
    note: 'Acquisition — Ashwin Nambiar, Bangalore; two owners on RC',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-02T07:30:00.000Z', 82),
  },
  {
    id: 'CLE-010-002',
    vin: 'WDC2229601A234567',
    category: 'refurb-mechanical',
    date: daysBeforeListing('2026-04-02T07:30:00.000Z', 69).split('T')[0]!,
    amount: 468000,
    note: 'Hydraulic body control recalibration, tyre replacement (all 4), brake flush',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-02T07:30:00.000Z', 68),
  },
  {
    id: 'CLE-010-003',
    vin: 'WDC2229601A234567',
    category: 'refurb-cosmetic',
    date: daysBeforeListing('2026-04-02T07:30:00.000Z', 51).split('T')[0]!,
    amount: 312000,
    note: 'Full exterior correction, chrome polishing, panoramic roof seal replacement',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-02T07:30:00.000Z', 50),
  },
  {
    id: 'CLE-010-004',
    vin: 'WDC2229601A234567',
    category: 'registration-tax',
    date: daysBeforeListing('2026-04-02T07:30:00.000Z', 78).split('T')[0]!,
    amount: 156000,
    note: 'Karnataka RTO name transfer, hypothecation removal NOC',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-02T07:30:00.000Z', 77),
  },
  {
    id: 'CLE-010-005',
    vin: 'WDC2229601A234567',
    category: 'transport',
    date: daysBeforeListing('2026-04-02T07:30:00.000Z', 81).split('T')[0]!,
    amount: 40000,
    note: 'Enclosed transport — Whitefield to BN workshop Bangalore',
    addedBy: 'R10-arjun-mehta',
    addedAt: daysBeforeListing('2026-04-02T07:30:00.000Z', 80),
  },
];

// Auto-generate stub cost ledger entries for uncurated VINs (PLAN-VEHICLES-003 L45).
// Each gets 3 stub entries: acquisition, refurb-mechanical, registration-tax.
const uncuratedRefs = vehicleRefs.filter((r) => !curatedVinSet.has(r.vin));
for (const ref of uncuratedRefs) {
  const acq = Math.round(ref.exShowroom * 0.85);
  const refurb = Math.round(ref.exShowroom * 0.025);
  const reg = Math.round(ref.exShowroom * 0.012);
  const idSlug = ref.vin.slice(-6);
  costLedgerEntries.push(
    {
      id: `CLE-STUB-${idSlug}-1`,
      vin: ref.vin,
      category: 'acquisition',
      date: daysBeforeListing(ref.listedAt, 75).split('T')[0]!,
      amount: acq,
      note: 'Acquisition — auto-generated stub (curate via inventory.ts for full detail)',
      addedBy: 'R10-arjun-mehta',
      addedAt: daysBeforeListing(ref.listedAt, 74),
    },
    {
      id: `CLE-STUB-${idSlug}-2`,
      vin: ref.vin,
      category: 'refurb-mechanical',
      date: daysBeforeListing(ref.listedAt, 60).split('T')[0]!,
      amount: refurb,
      note: 'Refurb — auto-generated stub',
      addedBy: 'R10-arjun-mehta',
      addedAt: daysBeforeListing(ref.listedAt, 59),
    },
    {
      id: `CLE-STUB-${idSlug}-3`,
      vin: ref.vin,
      category: 'registration-tax',
      date: daysBeforeListing(ref.listedAt, 70).split('T')[0]!,
      amount: reg,
      note: 'RTO transfer — auto-generated stub',
      addedBy: 'R10-arjun-mehta',
      addedAt: daysBeforeListing(ref.listedAt, 69),
    },
  );
}

// ─── Appraisals ───────────────────────────────────────────────────────────────

// Grade distribution: A (30%), A- (30%), B+ (20%), B (15%), B- (5%)
// 10 vehicles → 3 × A, 3 × A-, 2 × B+, 1 × B, 1 × B-

export const appraisals: Appraisal[] = vehicleRefs.map((ref, index) => {
  const grades: Array<Appraisal['grade']> = ['A', 'A', 'A', 'A-', 'A-', 'A-', 'B+', 'B+', 'B', 'B-'];
  const points = [210, 209, 208, 207, 206, 205, 204, 202, 199, 198];
  const inspectors = [
    'Vikram Singh', 'Vikram Singh', 'Vikram Singh',
    'Priya Sharma', 'Vikram Singh', 'Priya Sharma',
    'Vikram Singh', 'Vikram Singh', 'Priya Sharma', 'Vikram Singh',
  ];
  const notes = [
    'Excellent condition — no panel gaps, all OEM parts intact.',
    'Near-perfect condition. Minor scuff on rear bumper, within grade tolerance.',
    'Outstanding mechanical condition; minor stone chips on leading edges.',
    'Very good condition. Slight leather wear on driver seat bolster.',
    'Good cosmetic condition; tyre tread at 70% — replacement recommended within 15K km.',
    'Excellent electrical systems; AC compressor slightly noisy at idle, noted.',
    'Very good overall. Front tyre replaced; mismatched brand, grade noted.',
    'Good structural integrity; rear sensors require calibration after bumper repaint.',
    'Minor dent (1 cm) on passenger door — deducted points accordingly.',
    'Average presentation; multiple stone chips, interior showing age on dash.',
  ];

  // Cycle through curated arrays for VINs beyond the original 10
  const i = index % 10;
  return {
    id: `APR-${String(index + 1).padStart(3, '0')}`,
    vin: ref.vin,
    grade: grades[i]!,
    pointsCompleted: points[i]!,
    pointsTotal: 210,
    inspectorName: inspectors[i]!,
    inspectionDate: daysBeforeListing(ref.listedAt, 35 + (index % 10)).split('T')[0]!,
    notes: notes[i],
  };
});

// ─── Vehicle Timeline Events ──────────────────────────────────────────────────

function makeTimelineEvents(ref: VehicleRef, index: number): VehicleTimelineEvent[] {
  const actorId = 'R10-arjun-mehta';
  const actorName = 'Arjun Mehta';
  const baseVin = ref.vin;

  const events: VehicleTimelineEvent[] = [
    {
      id: `TL-${String(index + 1).padStart(3, '0')}-001`,
      vin: baseVin,
      type: 'created',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 90),
      note: 'Vehicle record created after acquisition — pending refurb assessment.',
    },
    {
      id: `TL-${String(index + 1).padStart(3, '0')}-002`,
      vin: baseVin,
      type: 'refurb-started',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 80),
      note: 'Refurbishment work order raised in workshop.',
    },
    {
      id: `TL-${String(index + 1).padStart(3, '0')}-003`,
      vin: baseVin,
      type: 'refurb-complete',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 60),
      note: 'All refurb tasks signed off. Vehicle cleared for appraisal and listing.',
    },
    {
      id: `TL-${String(index + 1).padStart(3, '0')}-004`,
      vin: baseVin,
      type: 'submitted',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 55),
      note: 'Listing submitted for management approval.',
    },
    {
      id: `TL-${String(index + 1).padStart(3, '0')}-005`,
      vin: baseVin,
      type: 'approved',
      actorId: 'R19-rajesh-nair',
      actorName: 'Rajesh Nair',
      timestamp: daysBeforeListing(ref.listedAt, 50),
      note: 'Listing approved by General Manager.',
    },
    {
      id: `TL-${String(index + 1).padStart(3, '0')}-006`,
      vin: baseVin,
      type: 'published',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 45),
      note: 'Vehicle published on storefront.',
    },
  ];

  // Add optional events for some vehicles
  if (index === 1 || index === 4 || index === 7) {
    events.push({
      id: `TL-${String(index + 1).padStart(3, '0')}-007`,
      vin: baseVin,
      type: 'price-changed',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 20),
      note: 'Listing price revised downward by ₹1,50,000 following market review.',
    });
  }

  if (index === 2 || index === 6) {
    events.push({
      id: `TL-${String(index + 1).padStart(3, '0')}-007`,
      vin: baseVin,
      type: 'reserved',
      actorId,
      actorName,
      timestamp: daysBeforeListing(ref.listedAt, 10),
      note: 'Vehicle reserved by customer — token amount received.',
    });
  }

  return events;
}

export const vehicleTimelineEvents: VehicleTimelineEvent[] = vehicleRefs.flatMap(
  (ref, index) => makeTimelineEvents(ref, index),
);

// ─── Vehicle Documents ────────────────────────────────────────────────────────

function makeDocuments(ref: VehicleRef, index: number): VehicleDocument[] {
  const uploaders = [
    'R10-arjun-mehta',
    'R10-arjun-mehta',
    'R06-pooja-iyer',
    'R10-arjun-mehta',
    'R06-pooja-iyer',
    'R10-arjun-mehta',
    'R06-pooja-iyer',
    'R10-arjun-mehta',
    'R10-arjun-mehta',
    'R06-pooja-iyer',
  ];
  const uploader = uploaders[index]!;
  const vinShort = ref.vin.slice(-6);
  const uploadedAt = daysBeforeListing(ref.listedAt, 50 + (index % 10));

  return [
    {
      id: `DOC-${String(index + 1).padStart(3, '0')}-001`,
      vin: ref.vin,
      type: 'rc',
      name: `RC_Certificate_${vinShort}.pdf`,
      uploadedBy: uploader,
      uploadedAt,
      fileSize: '2.4 MB',
      fileUrl: `/api/staff/inventory/vehicles/${ref.vin}/documents/rc`,
    },
    {
      id: `DOC-${String(index + 1).padStart(3, '0')}-002`,
      vin: ref.vin,
      type: 'insurance',
      name: `Insurance_Policy_${vinShort}.pdf`,
      uploadedBy: uploader,
      uploadedAt,
      fileSize: '1.8 MB',
      fileUrl: `/api/staff/inventory/vehicles/${ref.vin}/documents/insurance`,
    },
    {
      id: `DOC-${String(index + 1).padStart(3, '0')}-003`,
      vin: ref.vin,
      type: 'appraisal',
      name: `Appraisal_Report_${vinShort}.pdf`,
      uploadedBy: uploader,
      uploadedAt,
      fileSize: '3.2 MB',
      fileUrl: `/api/staff/inventory/vehicles/${ref.vin}/documents/appraisal`,
    },
    {
      id: `DOC-${String(index + 1).padStart(3, '0')}-004`,
      vin: ref.vin,
      type: 'inspection',
      name: `Inspection_Checklist_${vinShort}.pdf`,
      uploadedBy: uploader,
      uploadedAt,
      fileSize: '1.1 MB',
      fileUrl: `/api/staff/inventory/vehicles/${ref.vin}/documents/inspection`,
    },
  ];
}

export const vehicleDocuments: VehicleDocument[] = vehicleRefs.flatMap(
  (ref, index) => makeDocuments(ref, index),
);
