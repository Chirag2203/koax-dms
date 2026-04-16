import type { Metadata } from 'next';
import {
  CertificationHero,
  ThreePillars,
  DarkBand,
  InspectionProcess,
  QuoteBlock,
  CertificationCta,
} from '@/src/components/certification';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Certification — The BN Standard | BN Automobiles',
  description:
    'Every vehicle in our collection undergoes a rigorous 210-point inspection. The BN Standard is our promise of mechanical and aesthetic integrity.',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CertificationPage() {
  return (
    <>
      <CertificationHero />
      <ThreePillars />
      <DarkBand />
      <InspectionProcess />
      <QuoteBlock />
      <CertificationCta />
    </>
  );
}
