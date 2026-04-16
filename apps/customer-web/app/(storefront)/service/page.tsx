import type { Metadata } from 'next';
import { serviceTypes, outlets } from '@dms/mocks/fixtures';
import {
  ServiceHero,
  ServiceTypeCards,
  AtelierLocator,
  ServiceBookingForm,
  InfrastructureShowcase,
} from '@/src/components/service';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Service & Maintenance | BN Automobiles',
  description:
    'Manufacturer-trained technicians at three ateliers in Bangalore, Mumbai, and Chennai offer bespoke care for your investment.',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServicePage() {
  return (
    <main>
      <ServiceHero />
      <ServiceTypeCards services={serviceTypes} />
      <AtelierLocator outlets={outlets} />
      <ServiceBookingForm />
      <InfrastructureShowcase />
    </main>
  );
}
