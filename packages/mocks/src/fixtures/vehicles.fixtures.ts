// FIXTURE: demo data — SPEC-VEHICLES-001 §5
// 3 VehicleMaster records: VIN-A (BMW), VIN-B (Audi), VIN-C (Porsche)
// FIXTURE AUDIT 2026-04-20 (PLAN-VEHICLES-002 §1.5): removed VIN-X anonymized ghost — no longer needed for demo scenarios

import type { VehicleMaster } from '@dms/types';

export const vehicleMasters: VehicleMaster[] = [
  // ─── VIN-A: 2018 BMW M340i, Bangalore ─────────────────────────────────────
  {
    vin: 'WBA3A5C50DF123456',
    make: 'BMW',
    model: 'M340i',
    variant: 'xDrive Sedan',
    year: 2018,
    color: 'Alpine White',
    rcNumber: 'KA01AB1234',
    firstTouchedAt: '2019-03-15T09:00:00.000Z',
    firstTouchSource: 'SERVICE_ONLY_WALKIN',
    firstTouchOutletId: 'BLR-01',
    lastKnownKm: 93000,
    lastKnownKmAt: '2026-03-10T11:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ─── VIN-B: 2020 Audi RS5, Mumbai ─────────────────────────────────────────
  {
    vin: 'WAUFGAFR9LA003456',
    make: 'Audi',
    model: 'RS5',
    variant: 'Sportback',
    year: 2020,
    color: 'Nardo Grey',
    rcNumber: 'MH02CD5678',
    firstTouchedAt: '2020-06-01T10:00:00.000Z',
    firstTouchSource: 'BN_SALE',
    firstTouchOutletId: 'MUM-01',
    lastKnownKm: 78000,
    lastKnownKmAt: '2026-03-15T14:00:00.000Z',
    schemaVersion: 'v1',
  },

  // ─── VIN-C: 2019 Porsche 911 Carrera S, Chennai ───────────────────────────
  {
    vin: 'WP0AB2A98KS123456',
    make: 'Porsche',
    model: '911',
    variant: 'Carrera S',
    year: 2019,
    color: 'Guards Red',
    rcNumber: 'TN07EF9012',
    firstTouchedAt: '2019-07-20T09:30:00.000Z',
    firstTouchSource: 'BN_SALE',
    firstTouchOutletId: 'CHE-01',
    lastKnownKm: 41000,
    lastKnownKmAt: '2026-04-01T09:00:00.000Z',
    schemaVersion: 'v1',
  },

];
