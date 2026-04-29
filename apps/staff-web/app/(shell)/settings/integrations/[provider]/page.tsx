/**
 * Integration detail — SPEC-SETTINGS-001 §6.6
 * [provider] = 'whatsapp_bsp' | 'dlt_sms' | 'irp_einvoicing' | 'aadhaar_sub_kua' | 'razorpay' | 'tally_prime'
 * 404 for unknown provider values.
 */

import { IntegrationDetailView } from '@/src/components/settings/integrations/integration-detail-view';
import { SettingsStoreHydrator } from '@/src/lib/settings/settings-store-hydrator';

interface IntegrationDetailPageProps {
  params: { provider: string };
}

export default function IntegrationDetailPage({ params }: IntegrationDetailPageProps) {
  return (
    <>
      <SettingsStoreHydrator />
      <IntegrationDetailView provider={params.provider} />
    </>
  );
}
