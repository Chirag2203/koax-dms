/**
 * Integrations slice — SPEC-SETTINGS-001 §4
 * L5: Credentials are mocked. secretMasked shows last 4 chars only.
 * L11: Connection test stub: 800ms delay → "OK — mocked".
 * L16: Disconnect requires type-to-confirm in UI (guard at store level).
 */

import type { IntegrationCredential, IntegrationProvider } from '@dms/types';
import { hasRank } from '@dms/types';
import { MOCK_INTEGRATION_CREDENTIALS } from '@dms/mocks/fixtures';
import type { StoreActor } from './outlets-slice';

export interface IntegrationsSliceState {
  credentials: Record<IntegrationProvider, IntegrationCredential>;
}

export class IntegrationAccessDeniedError extends Error {
  constructor(action: string, role: string) {
    super(`${action} requires R02 or R22 authority. Actor role: ${role}`);
    this.name = 'IntegrationAccessDeniedError';
  }
}

/** Build initial credentials record from fixture */
export function buildInitialCredentials(): Record<IntegrationProvider, IntegrationCredential> {
  const result = {} as Record<IntegrationProvider, IntegrationCredential>;
  for (const c of MOCK_INTEGRATION_CREDENTIALS) {
    result[c.provider] = { ...c };
  }
  return result;
}

/**
 * L11: Connection test stub — 800ms delay → "OK — mocked"
 * Caller is responsible for dispatching the audit event.
 */
export async function runConnectionTestStub(
  provider: IntegrationProvider,
  actor: StoreActor,
): Promise<{ ok: boolean; message: string; testedAt: string }> {
  // R22+ or R02+ can test connections
  if (!hasRank(actor.role, 'R02') && !hasRank(actor.role, 'R22')) {
    throw new IntegrationAccessDeniedError('Test Connection', actor.role);
  }

  // L11: 800ms simulated delay per spec
  await new Promise<void>((resolve) => setTimeout(resolve, 800));

  const testedAt = new Date().toISOString();
  return {
    ok: true,
    message: `${provider} — OK (mocked)`,
    testedAt,
  };
}

/** L16: Disconnect validation — role check at store level. UI handles type-to-confirm. */
export function validateDisconnect(provider: IntegrationProvider, actor: StoreActor): void {
  if (!hasRank(actor.role, 'R02') && !hasRank(actor.role, 'R22')) {
    throw new IntegrationAccessDeniedError(
      `Disconnect ${provider}`,
      actor.role,
    );
  }
}

/** Display names for integrations per Doc 13 */
export const INTEGRATION_DISPLAY: Record<IntegrationProvider, { name: string; doc13Ref: string; dependencies: string[] }> = {
  razorpay: {
    name: 'Razorpay Payments',
    doc13Ref: 'Doc 13 §1',
    dependencies: ['Customer payments', 'Token collection'],
  },
  whatsapp_bsp: {
    name: 'WhatsApp BSP',
    doc13Ref: 'Doc 13 §2',
    dependencies: ['Insurance marketing', 'Service booking confirmations', 'Sales OTP'],
  },
  irp_einvoicing: {
    name: 'IRP E-invoicing',
    doc13Ref: 'Doc 13 §3',
    dependencies: ['Finance invoicing', 'Sales SOLD events'],
  },
  aadhaar_sub_kua: {
    name: 'Aadhaar sub-KUA',
    doc13Ref: 'Doc 13 §5',
    dependencies: ['Customer KYC', 'Staff onboarding'],
  },
  dlt_sms: {
    name: 'DLT SMS',
    doc13Ref: 'Doc 13 §10',
    dependencies: ['KYC OTP', 'Service notifications fallback'],
  },
  tally_prime: {
    name: 'Tally Prime',
    doc13Ref: 'Doc 13 §11',
    dependencies: ['Finance journal sync'],
  },
};
