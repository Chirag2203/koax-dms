import type { Metadata } from 'next';
import { vehicles, articles } from '@dms/mocks/fixtures';
import {
  HeroSection,
  CurationStrip,
  TrustStrip,
  CollectionGrid,
  ServicesBand,
  JournalStrip,
} from '@/src/components/landing';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'BN Automobiles — A Quieter Way to Own a Great Car',
  description:
    'Hand-selected pre-owned luxury vehicles, inspected on 210 points, available in Bangalore, Mumbai, and Chennai.',
  openGraph: {
    title: 'BN Automobiles',
    description:
      'Hand-selected pre-owned luxury vehicles, inspected on 210 points, available across three cities.',
    type: 'website',
  },
};

// ─── Data slices ──────────────────────────────────────────────────────────────

// Published vehicles only
const publishedVehicles = vehicles.filter((v) => v.status === 'published');

// Curation strip: first 3 published vehicles (editorial picks)
const featuredVehicles = publishedVehicles.slice(0, 3);

// Collection grid: next 9 published vehicles
const collectionVehicles = publishedVehicles.slice(3, 12);

// Journal: first 3 articles (most recent)
const journalArticles = articles.slice(0, 3);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StorefrontPage() {
  return (
    <main>
      {/* 1 — Hero: full-viewport dark section with parallax image */}
      <HeroSection />

      {/* 2 — Curation strip: 3 editorial featured vehicles on dark bg */}
      <CurationStrip vehicles={featuredVehicles} />

      {/* 3 — Trust strip: The BN Standard copy + 210/12/3 stats */}
      <TrustStrip />

      {/* 4 — Collection grid: 9-vehicle preview on light bg */}
      <CollectionGrid vehicles={collectionVehicles} />

      {/* 5 — Services band: 3 service cards on dark bg */}
      <ServicesBand />

      {/* 6 — Journal strip: 3 article cards on subtle bg */}
      <JournalStrip articles={journalArticles} />
    </main>
  );
}
