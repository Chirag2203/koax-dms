/**
 * Settings outlet fixtures — SPEC-SETTINGS-001
 * L1: 3 outlets are fixed (BLR, MUM, CHE). Adding a 4th is a v2 migration.
 * L2: GSTINs are real state codes (Karnataka=29, Maharashtra=27, Tamil Nadu=33).
 * L8: contactPhone / contactEmail are office numbers — no personal PII.
 */

import type { OutletConfig } from '@dms/types';

export const MOCK_OUTLET_CONFIGS: OutletConfig[] = [
  {
    id: 'outlet-blr',
    // L10: code is immutable after creation
    code: 'BLR',
    name: 'BN Automobiles Bangalore',
    address: {
      line1: '14, Intermediate Ring Road',
      line2: 'Domlur, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pin: '560071',
    },
    // L2: GSTIN validated — Karnataka state code 29
    gstin: '29AABCT1332L1ZQ',
    // L3: manager must be R03+ at this outlet — staff-r03-001 is Outlet Manager BLR
    managerId: 'staff-r03-001',
    // L8: Office/reception contact — not personal PII
    contactPhone: '+91 80 4118 8800',
    contactEmail: 'bangalore@bnautomobiles.in',
    active: true,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'outlet-mum',
    // L10: code is immutable after creation
    code: 'MUM',
    name: 'BN Automobiles Mumbai',
    address: {
      line1: 'Ground Floor, Turner Road',
      line2: 'Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400050',
    },
    // L2: GSTIN validated — Maharashtra state code 27
    gstin: '27AABCT1332L1ZQ',
    // L3: manager must be R03+ at this outlet — staff-r03-002 is Outlet Manager MUM
    managerId: 'staff-r03-002',
    // L8: Office/reception contact — not personal PII
    contactPhone: '+91 22 6132 5500',
    contactEmail: 'mumbai@bnautomobiles.in',
    active: true,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'outlet-che',
    // L10: code is immutable after creation
    code: 'CHE',
    name: 'BN Automobiles Chennai',
    address: {
      line1: '48, Khader Nawaz Khan Road',
      line2: 'Nungambakkam',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pin: '600006',
    },
    // L2: GSTIN validated — Tamil Nadu state code 33
    gstin: '33AABCT1332L1ZQ',
    // L3: manager must be R03+ at this outlet — staff-r03-003 is Outlet Manager CHE
    managerId: 'staff-r03-003',
    // L8: Office/reception contact — not personal PII
    contactPhone: '+91 44 4291 9900',
    contactEmail: 'chennai@bnautomobiles.in',
    active: true,
    createdAt: '2022-01-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
];
