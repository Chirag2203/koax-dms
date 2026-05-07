/**
 * Shoots fixtures — SPEC-SHOOTS-001 §5 (Fixtures) + SPEC-SHOOTS-002 §18 (Migration)
 *
 * 12 v1 shoots migrated to v2 format (assets:[], coverAssetId:null, aiVendor:'NONE')
 * + 3 new exemplar shoots with full 11-slot approved coverage.
 *
 * V1 shoots:
 *   - 3 pending  (just acquired, no photographer yet)
 *   - 3 scheduled  (photographer assigned, date set)
 *   - 2 in-progress (shoot underway, partial assets)
 *   - 4 completed   (completedAt stamped; v1 count-only guard removed in v2.1 — L_AI-20)
 *
 * V2 exemplar shoots:
 *   - shoot-v2-001: Porsche Taycan — all 11 required slots approved + exteriors redacted
 *   - shoot-v2-002: BMW M5 — all 11 required slots approved + 2 optional slots
 *   - shoot-v2-003: Mercedes G-Class — partial (8/11 approved, in-progress state)
 *
 * VINs are drawn from the inventory vehicles fixture so the VIN links resolve.
 *
 * L4: Asset URLs are mocked S3 paths — https://cdn.bn.example/shoots/{vin}/{n}.jpg
 * L_AI-1: v2 adds assets[], coverAssetId, aiVendor, aiPolicy (SPEC-SHOOTS-002)
 */

import type { Shoot, ShootAsset } from '@dms/types';

// ─── 1×1 transparent PNG data URL ────────────────────────────────────────────
// Used as placeholder rawUrl / processedUrl in v2 exemplar fixtures (L_AI-10)

const TINY_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ─── V2 asset builder helpers ─────────────────────────────────────────────────

function makeApprovedExteriorAsset(
  shootId: string,
  vin: string,
  kind: ShootAsset['kind'],
  idx: number,
): ShootAsset {
  return {
    id: `${shootId}-asset-${kind}`,
    shootId,
    vin,
    kind,
    sortOrder: idx,
    rawUrl: TINY_PNG,
    processedUrl: TINY_PNG, // rasterised with LP redacted
    approved: true,
    approvedAt: '2026-04-15T10:00:00.000Z',
    approvedBy: 'staff-r11-001',
    lpRedacted: true,
    redactedAt: '2026-04-15T09:30:00.000Z',
    redactedBy: 'staff-r11-001',
    aiStatus: 'manual-only',
    aiRequestedAt: '2026-04-15T09:00:00.000Z',
    aiCompletedAt: null,
    aiErrorMessage: null,
    aiRetryCount: 0,
    aiLastFailedAt: null,
    vendorJobId: null,
    capturedAt: '2026-04-15T08:00:00.000Z',
    capturedBy: 'staff-r11-001',
    s3Key: null,
    forceApprovedWithoutRedaction: false,
    forceApprovedReason: null,
    forceApprovedBy: null,
    forceApprovedAt: null,
  };
}

function makeApprovedInteriorAsset(
  shootId: string,
  vin: string,
  kind: ShootAsset['kind'],
  idx: number,
): ShootAsset {
  return {
    id: `${shootId}-asset-${kind}`,
    shootId,
    vin,
    kind,
    sortOrder: idx,
    rawUrl: TINY_PNG,
    processedUrl: TINY_PNG,
    approved: true,
    approvedAt: '2026-04-15T10:00:00.000Z',
    approvedBy: 'staff-r11-001',
    lpRedacted: false, // interior — no LP redaction required
    redactedAt: null,
    redactedBy: null,
    aiStatus: 'manual-only',
    aiRequestedAt: '2026-04-15T09:00:00.000Z',
    aiCompletedAt: null,
    aiErrorMessage: null,
    aiRetryCount: 0,
    aiLastFailedAt: null,
    vendorJobId: null,
    capturedAt: '2026-04-15T08:00:00.000Z',
    capturedBy: 'staff-r11-001',
    s3Key: null,
    forceApprovedWithoutRedaction: false,
    forceApprovedReason: null,
    forceApprovedBy: null,
    forceApprovedAt: null,
  };
}

function makeApprovedWalkaroundAsset(
  shootId: string,
  vin: string,
  idx: number,
): ShootAsset {
  return {
    id: `${shootId}-asset-video_walkaround`,
    shootId,
    vin,
    kind: 'video_walkaround',
    sortOrder: idx,
    rawUrl: TINY_PNG,
    processedUrl: TINY_PNG,
    approved: true,
    approvedAt: '2026-04-15T11:00:00.000Z',
    approvedBy: 'staff-r12-001', // walkaround requires R12+
    lpRedacted: true,
    redactedAt: '2026-04-15T10:30:00.000Z',
    redactedBy: 'staff-r11-001',
    aiStatus: 'manual-only',
    aiRequestedAt: '2026-04-15T09:00:00.000Z',
    aiCompletedAt: null,
    aiErrorMessage: null,
    aiRetryCount: 0,
    aiLastFailedAt: null,
    vendorJobId: null,
    capturedAt: '2026-04-15T08:00:00.000Z',
    capturedBy: 'staff-r11-001',
    s3Key: null,
    forceApprovedWithoutRedaction: false,
    forceApprovedReason: null,
    forceApprovedBy: null,
    forceApprovedAt: null,
  };
}

// ─── V2 exemplar: full 11-slot coverage ──────────────────────────────────────

function buildFullApprovedAssets(shootId: string, vin: string): ShootAsset[] {
  return [
    makeApprovedExteriorAsset(shootId, vin, 'front_3q_driver', 0),
    makeApprovedExteriorAsset(shootId, vin, 'front_3q_passenger', 1),
    makeApprovedExteriorAsset(shootId, vin, 'rear_3q_driver', 2),
    makeApprovedExteriorAsset(shootId, vin, 'rear_3q_passenger', 3),
    makeApprovedExteriorAsset(shootId, vin, 'driver_profile', 4),
    makeApprovedExteriorAsset(shootId, vin, 'passenger_profile', 5),
    makeApprovedExteriorAsset(shootId, vin, 'front_straight', 6),
    makeApprovedExteriorAsset(shootId, vin, 'rear_straight', 7),
    makeApprovedInteriorAsset(shootId, vin, 'dashboard', 8),
    makeApprovedInteriorAsset(shootId, vin, 'rear_seats', 9),
    makeApprovedInteriorAsset(shootId, vin, 'odometer', 10),
    makeApprovedWalkaroundAsset(shootId, vin, 11),
  ];
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

export const shoots: Shoot[] = [
  // ── Pending (3) — v1 migrated ─────────────────────────────────────────────

  {
    id: 'shoot-001',
    vin: 'WP0AB2A91MS247831',      // Porsche Cayenne — BLR
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending',
    createdAt: '2026-03-01T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Cayenne',
    vehicleYear: 2022,
    // v2 migration (L_AI-1, spec §18)
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-002',
    vin: 'WP0ZZZ97ZNS112045',      // Porsche 911 — BLR
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending',
    createdAt: '2026-03-05T11:30:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Priority shoot — listed quickly',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: '911 Carrera',
    vehicleYear: 2022,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-003',
    vin: 'WDD2221971A012345',       // Mercedes C-Class — MUM
    photographerId: null,
    scheduledAt: null,
    completedAt: null,
    status: 'pending',
    createdAt: '2026-03-10T09:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'MUM-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'C-Class',
    vehicleYear: 2021,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  // ── Scheduled (3) — v1 migrated ───────────────────────────────────────────

  {
    id: 'shoot-004',
    vin: 'WP1ZZZ9YZPS034789',      // Porsche Macan — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-20T09:00:00.000Z',
    completedAt: null,
    status: 'scheduled',
    createdAt: '2026-03-15T12:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Studio slot booked',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Macan S',
    vehicleYear: 2023,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-005',
    vin: 'WP1ZZZ95ZNS078234',      // Porsche Cayenne GTS — MUM
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-22T10:00:00.000Z',
    completedAt: null,
    status: 'scheduled',
    createdAt: '2026-03-18T14:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'MUM-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Cayenne GTS',
    vehicleYear: 2021,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-006',
    vin: 'WDC1930561A456789',       // Mercedes GLC — CHE
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-25T08:30:00.000Z',
    completedAt: null,
    status: 'scheduled',
    createdAt: '2026-03-20T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Outdoor shoot requested',
    outletId: 'CHE-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'GLC 300',
    vehicleYear: 2022,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  // ── In-Progress (2) — v1 migrated ─────────────────────────────────────────

  {
    id: 'shoot-007',
    vin: 'WDD1900761A789012',       // Mercedes E-Class — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-10T09:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    createdAt: '2026-03-25T11:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '4 more photos + 1 video remaining',
    outletId: 'BLR-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'E-Class',
    vehicleYear: 2020,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-008',
    vin: 'WDC2229601A234567',       // Mercedes GLE — MUM
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-04-12T10:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    createdAt: '2026-03-28T09:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Almost done — need video',
    outletId: 'MUM-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'GLE 450',
    vehicleYear: 2021,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  // ── Completed (4) — v1 migrated ───────────────────────────────────────────

  {
    id: 'shoot-009',
    vin: 'WP0ZZZ98ZMS561902',       // Porsche Taycan — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-02-10T09:00:00.000Z',
    completedAt: '2026-02-10T13:00:00.000Z',
    status: 'completed',
    createdAt: '2026-01-28T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Full studio session — editorial + walk-around video',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Taycan 4S',
    vehicleYear: 2023,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-010',
    vin: 'WBA5U5C08MCF12345',       // BMW 5 Series — BLR
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-02-15T10:00:00.000Z',
    completedAt: '2026-02-15T14:30:00.000Z',
    status: 'completed',
    createdAt: '2026-02-01T09:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '',
    outletId: 'BLR-01',
    vehicleMake: 'BMW',
    vehicleModel: '5 Series',
    vehicleYear: 2022,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-011',
    vin: 'WBAJY0C03MCG78901',       // BMW X5 — MUM
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-02-20T09:00:00.000Z',
    completedAt: '2026-02-20T13:45:00.000Z',
    status: 'completed',
    createdAt: '2026-02-05T11:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: '2 videos — walk-around + feature highlight',
    outletId: 'MUM-01',
    vehicleMake: 'BMW',
    vehicleModel: 'X5',
    vehicleYear: 2021,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-012',
    vin: 'WDD2050301R567890',        // Mercedes S-Class — CHE
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-03-01T09:00:00.000Z',
    completedAt: '2026-03-01T15:00:00.000Z',
    status: 'completed',
    createdAt: '2026-02-15T10:00:00.000Z',
    createdBy: 'staff-r10-001',
    notes: 'Full day shoot — luxury editorial package',
    outletId: 'CHE-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'S-Class',
    vehicleYear: 2022,
    assets: [],
    coverAssetId: null,
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  // ── V2 Exemplar shoots (full 11-slot approved coverage) ───────────────────

  {
    id: 'shoot-v2-001',
    vin: 'WP0ZZZ98ZMS561902',       // Reuses Taycan VIN from completed v1 shoot (new in-progress v2 shoot)
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-05-01T09:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    createdAt: '2026-04-28T10:00:00.000Z',
    createdBy: 'staff-r11-001',
    notes: 'V2 exemplar — all 11 slots fully approved and LP-redacted',
    outletId: 'BLR-01',
    vehicleMake: 'Porsche',
    vehicleModel: 'Taycan 4S',
    vehicleYear: 2023,
    assets: buildFullApprovedAssets('shoot-v2-001', 'WP0ZZZ98ZMS561902'),
    coverAssetId: 'shoot-v2-001-asset-front_3q_driver',
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-v2-002',
    vin: 'WBA5U5C08MCF12345',       // BMW 5 Series — all slots + 2 optional
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-05-03T09:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    createdAt: '2026-04-29T11:00:00.000Z',
    createdBy: 'staff-r11-001',
    notes: 'V2 exemplar — 11 required + engine_bay + boot optional slots',
    outletId: 'BLR-01',
    vehicleMake: 'BMW',
    vehicleModel: '5 Series',
    vehicleYear: 2022,
    assets: [
      ...buildFullApprovedAssets('shoot-v2-002', 'WBA5U5C08MCF12345'),
      makeApprovedInteriorAsset('shoot-v2-002', 'WBA5U5C08MCF12345', 'engine_bay', 12),
      makeApprovedInteriorAsset('shoot-v2-002', 'WBA5U5C08MCF12345', 'boot', 13),
    ],
    coverAssetId: 'shoot-v2-002-asset-front_3q_driver',
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },

  {
    id: 'shoot-v2-003',
    vin: 'WDC1930561A456789',       // Mercedes GLC — partial (8/11 approved)
    photographerId: 'staff-r11-001',
    scheduledAt: '2026-05-05T09:00:00.000Z',
    completedAt: null,
    status: 'in-progress',
    createdAt: '2026-04-30T10:00:00.000Z',
    createdBy: 'staff-r11-001',
    notes: 'V2 exemplar — partial (missing odometer + rear_seats + video_walkaround)',
    outletId: 'CHE-01',
    vehicleMake: 'Mercedes-Benz',
    vehicleModel: 'GLC 300',
    vehicleYear: 2022,
    assets: [
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'front_3q_driver', 0),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'front_3q_passenger', 1),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'rear_3q_driver', 2),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'rear_3q_passenger', 3),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'driver_profile', 4),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'passenger_profile', 5),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'front_straight', 6),
      makeApprovedExteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'rear_straight', 7),
      makeApprovedInteriorAsset('shoot-v2-003', 'WDC1930561A456789', 'dashboard', 8),
      // Missing: odometer, rear_seats, video_walkaround
    ],
    coverAssetId: 'shoot-v2-003-asset-front_3q_driver',
    aiVendor: 'NONE',
    aiPolicy: { autoQueueOnUpload: false, autoApproveProcessed: false, failureRate: 10, failureSeed: 0, maxRetries: 3 },
  },
];
