/**
 * Settings integration credential fixtures — SPEC-SETTINGS-001
 * L5: Real credentials live in env vars/vault. UI shows masked values only.
 * secretMasked shows '••••' prefix + last 4 chars of mock secret key.
 */

import type { IntegrationCredential } from '@dms/types';

export const MOCK_INTEGRATION_CREDENTIALS: IntegrationCredential[] = [
  {
    provider: 'razorpay',
    status: 'connected',
    // L5: last 4 chars of mock key visible; rest masked
    secretMasked: '••••••••••••K4F2',
    endpoint: 'https://api.raz…',
    lastUsedAt: '2026-04-28T14:30:00.000Z',
    connectionTestedAt: '2026-04-28T14:30:00.000Z',
    connectionTestResult: {
      ok: true,
      message: 'OK — mocked',
      testedAt: '2026-04-28T14:30:00.000Z',
    },
    connectedAt: '2022-06-15T09:00:00.000Z',
  },
  {
    provider: 'whatsapp_bsp',
    status: 'connected',
    secretMasked: '••••••••••••9XP1',
    endpoint: 'https://api.wha…',
    lastUsedAt: '2026-04-29T08:15:00.000Z',
    connectionTestedAt: '2026-04-27T11:00:00.000Z',
    connectionTestResult: {
      ok: true,
      message: 'OK — mocked',
      testedAt: '2026-04-27T11:00:00.000Z',
    },
    connectedAt: '2022-08-01T09:00:00.000Z',
  },
  {
    provider: 'irp_einvoicing',
    status: 'connected',
    secretMasked: '••••••••••••M7G3',
    endpoint: 'https://einv-ap…',
    lastUsedAt: '2026-04-28T16:00:00.000Z',
    connectionTestedAt: '2026-04-28T16:00:00.000Z',
    connectionTestResult: {
      ok: true,
      message: 'OK — mocked',
      testedAt: '2026-04-28T16:00:00.000Z',
    },
    connectedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    provider: 'aadhaar_sub_kua',
    status: 'connected',
    secretMasked: '••••••••••••B2T8',
    endpoint: 'https://uidai.g…',
    lastUsedAt: '2026-04-25T10:00:00.000Z',
    connectionTestedAt: '2026-04-20T09:00:00.000Z',
    connectionTestResult: {
      ok: true,
      message: 'OK — mocked',
      testedAt: '2026-04-20T09:00:00.000Z',
    },
    connectedAt: '2023-03-01T00:00:00.000Z',
  },
  {
    provider: 'dlt_sms',
    status: 'disconnected',
    secretMasked: '••••••••••••Q5R9',
    endpoint: undefined,
    lastUsedAt: '2026-03-10T12:00:00.000Z',
    connectionTestedAt: '2026-03-10T12:00:00.000Z',
    connectionTestResult: {
      ok: false,
      message: 'Connection refused — mocked',
      testedAt: '2026-03-10T12:00:00.000Z',
    },
    connectedAt: '2022-10-01T00:00:00.000Z',
    disconnectedAt: '2026-03-10T12:05:00.000Z',
  },
  {
    provider: 'tally_prime',
    status: 'connected',
    secretMasked: '••••••••••••W1N4',
    endpoint: 'https://tally.b…',
    lastUsedAt: '2026-04-29T07:00:00.000Z',
    connectionTestedAt: '2026-04-28T07:00:00.000Z',
    connectionTestResult: {
      ok: true,
      message: 'OK — mocked',
      testedAt: '2026-04-28T07:00:00.000Z',
    },
    connectedAt: '2022-07-01T00:00:00.000Z',
  },
];
