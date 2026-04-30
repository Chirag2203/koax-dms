/**
 * Shoots fixtures — SPEC-SHOOTS-001 §5 (Fixtures)
 *
 * 12 shoots spread across all statuses:
 *   - 3 pending  (just acquired, no photographer yet)
 *   - 3 scheduled  (photographer assigned, date set)
 *   - 2 in-progress (shoot underway, partial assets)
 *   - 4 completed   (≥10 photos + ≥1 video, completedAt stamped)
 *
 * VINs are drawn from the inventory vehicles fixture so the VIN links resolve.
 *
 * L4: Asset URLs are mocked S3 paths — https://cdn.bn.example/shoots/{vin}/{n}.jpg
 */

import type { Shoot } from '@dms/types';

// ─── Mock S3 URL helpers ──────────────────────────────────────────────────────
// L4 (SPEC-SHOOTS-001): all asset URLs are mocked CDN paths

function photoUrls(vin: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://cdn.bn.example/shoots/${vin}/${i + 1}.jpg`);
}

function videoUrl(vin: string, n = 1): string {
  return `https://cdn.bn.example/shoots/${vin}/video-${n}.mp4`;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const shoots: Shoot[] = [
  // ── Pending (3) ──────────────────────────────────────────────────────────────

  {
    id: 'shoot-001',
    vin: 'WP0AB2A91MS247831',      // Porsche Cayenne — BLR
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending',
    assetCount: 0,
    videoCount: 0,
    assetUrls: [],
    createdAt: '2026-03-01T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Cayenne',
    vehicleYear: 2022,
  },

  {
    id: 'shoot-002',
    vin: 'WP0ZZZ97ZNS112045',      // Porsche 911 — BLR
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending',
    assetCount: 0,
    videoCount: 0,
    assetUrls: [],
    createdAt: '2026-03-05T11:30:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Priority shoot — listed quickly',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: '911 Carrera',
    vehicleYear: 2022,
  },

  {
    id: 'shoot-003',
    vin: 'WDD2221971A012345',       // Mercedes C-Class — MUM
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending',
    assetCount: 0,
    videoCount: 0,
    assetUrls: [],
    createdAt: '2026-03-10T09:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'MUM-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'C-Class',
    vehicleYear: 2021,
  },

  // ── Scheduled (3) ────────────────────────────────────────────────────────────

  {
    id: 'shoot-004',
    vin: 'WP1ZZZ9YZPS034789',      // Porsche Macan — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-20T09:00:00.000Z',
    completedAt: null,
    status: 'scheduled',
    assetCount: 0,
    videoCount: 0,
    assetUrls: [],
    createdAt: '2026-03-15T12:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Studio slot booked',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Macan S',
    vehicleYear: 2023,
  },

  {
    id: 'shoot-005',
    vin: 'WP1ZZZ95ZNS078234',      // Porsche Cayenne GTS — MUM
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-22T10:00:00.000Z',
    completedAt: null,
    status: 'scheduled',
    assetCount: 0,
    videoCount: 0,
    assetUrls: [],
    createdAt: '2026-03-18T14:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'MUM-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Cayenne GTS',
    vehicleYear: 2021,
  },

  {
    id: 'shoot-006',
    vin: 'WDC1930561A456789',       // Mercedes GLC — CHE
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-25T08:30:00.000Z',
    completedAt: null,
    status: 'scheduled',
    assetCount: 0,
    videoCount: 0,
    assetUrls: [],
    createdAt: '2026-03-20T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Outdoor shoot requested',
    outletId: 'CHE-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'GLC 300',
    vehicleYear: 2022,
  },

  // ── In-Progress (2) ──────────────────────────────────────────────────────────

  {
    id: 'shoot-007',
    vin: 'WDD1900761A789012',       // Mercedes E-Class — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-10T09:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    assetCount: 6,
    videoCount: 0,
    assetUrls: photoUrls('WDD1900761A789012', 6),
    createdAt: '2026-03-25T11:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '4 more photos + 1 video remaining',
    outletId: 'BLR-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'E-Class',
    vehicleYear: 2020,
  },

  {
    id: 'shoot-008',
    vin: 'WDC2229601A234567',       // Mercedes GLE — MUM
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-12T10:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    assetCount: 8,
    videoCount: 0,
    assetUrls: photoUrls('WDC2229601A234567', 8),
    createdAt: '2026-03-28T09:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Almost done — need video',
    outletId: 'MUM-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'GLE 450',
    vehicleYear: 2021,
  },

  // ── Completed (4) ────────────────────────────────────────────────────────────

  {
    id: 'shoot-009',
    vin: 'WP0ZZZ98ZMS561902',       // Porsche Taycan — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-02-10T09:00:00.000Z',
    completedAt: '2026-02-10T13:00:00.000Z',
    status: 'completed',
    assetCount: 14,
    videoCount: 1,
    assetUrls: [
      ...photoUrls('WP0ZZZ98ZMS561902', 14),
      videoUrl('WP0ZZZ98ZMS561902'),
    ],
    createdAt: '2026-01-28T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Full studio session — editorial + walk-around video',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Taycan 4S',
    vehicleYear: 2023,
  },

  {
    id: 'shoot-010',
    vin: 'WBA5U5C08MCF12345',       // BMW 5 Series — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-02-15T10:00:00.000Z',
    completedAt: '2026-02-15T14:30:00.000Z',
    status: 'completed',
    assetCount: 12,
    videoCount: 1,
    assetUrls: [
      ...photoUrls('WBA5U5C08MCF12345', 12),
      videoUrl('WBA5U5C08MCF12345'),
    ],
    createdAt: '2026-02-01T09:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'BLR-01',
    vehicleMake: 'BMW',
    vehicleModel: '5 Series',
    vehicleYear: 2022,
  },

  {
    id: 'shoot-011',
    vin: 'WBAJY0C03MCG78901',       // BMW X5 — MUM
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-02-20T09:00:00.000Z',
    completedAt: '2026-02-20T13:45:00.000Z',
    status: 'completed',
    assetCount: 11,
    videoCount: 2,
    assetUrls: [
      ...photoUrls('WBAJY0C03MCG78901', 11),
      videoUrl('WBAJY0C03MCG78901', 1),
      videoUrl('WBAJY0C03MCG78901', 2),
    ],
    createdAt: '2026-02-05T11:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '2 videos — walk-around + feature highlight',
    outletId: 'MUM-01',
    vehicleMake: 'BMW',
    vehicleModel: 'X5',
    vehicleYear: 2021,
  },

  {
    id: 'shoot-012',
    vin: 'WDD2050301R567890',        // Mercedes S-Class — CHE
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-03-01T09:00:00.000Z',
    completedAt: '2026-03-01T15:00:00.000Z',
    status: 'completed',
    assetCount: 20,
    videoCount: 1,
    assetUrls: [
      ...photoUrls('WDD2050301R567890', 20),
      videoUrl('WDD2050301R567890'),
    ],
    createdAt: '2026-02-15T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Full day shoot — luxury editorial package',
    outletId: 'CHE-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'S-Class',
    vehicleYear: 2022,
  },
];
