import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { vehicles } from '@dms/mocks/fixtures';
import {
  VdpBreadcrumb,
  VehicleHeroGallery,
  VdpTitleBlock,
  VdpEditorial,
  VdpSpecGrid,
  CertificationPanel,
  OwnershipCostCard,
  EmiCalculator,
  SimilarVehicles,
  MobileStickyBar,
} from '@/src/components/vdp';
import { ReviewsSection } from '@/src/components/storefront/reviews-section';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VdpPageProps {
  params: { vin: string };
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function findSimilarVehicles(vin: string, make: string, bodyType: string) {
  return vehicles
    .filter(
      (v) =>
        v.vin !== vin &&
        v.status === 'published' &&
        (v.make === make || v.bodyType === bodyType),
    )
    .slice(0, 3);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: VdpPageProps): Promise<Metadata> {
  const vehicle = vehicles.find((v) => v.vin === params.vin);

  if (!vehicle) {
    return {
      title: 'Vehicle Not Found | BN Automobiles',
    };
  }

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant} | BN Automobiles`;
  const description = vehicle.editorialCopy.slice(0, 160);
  const heroImage = vehicle.images[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: heroImage
        ? [
            {
              url: heroImage.url,
              width: heroImage.width,
              height: heroImage.height,
              alt: heroImage.alt,
            },
          ]
        : [],
      type: 'website',
    },
  };
}

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return vehicles.map((v) => ({ vin: v.vin }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VdpPage({ params }: VdpPageProps) {
  const vehicle = vehicles.find((v) => v.vin === params.vin);

  if (!vehicle) {
    notFound();
    // notFound() throws — return is unreachable but satisfies the type checker
    return null;
  }

  const similarVehicles = findSimilarVehicles(
    vehicle.vin,
    vehicle.make,
    vehicle.bodyType,
  );

  return (
    <>
      {/* 1 — Breadcrumb navigation */}
      <VdpBreadcrumb vehicle={vehicle} />

      {/* 2 — Hero gallery with lightbox */}
      <VehicleHeroGallery vehicle={vehicle} />

      {/* 3 — Title block: make/model/price/CTAs */}
      <VdpTitleBlock vehicle={vehicle} />

      {/* 4 — Editorial copy */}
      <VdpEditorial editorialCopy={vehicle.editorialCopy} />

      {/* 5 — Specification grid */}
      <VdpSpecGrid vehicle={vehicle} />

      {/* 6 — CPO certification panel */}
      <CertificationPanel vehicle={vehicle} />

      {/* 7 — Ownership economics */}
      <OwnershipCostCard vehicle={vehicle} />

      {/* 8 — EMI calculator (scroll target from "Ask about financing") */}
      <EmiCalculator vehiclePrice={vehicle.price} />

      {/* 9 — Similar vehicles */}
      <SimilarVehicles vehicles={similarVehicles} />

      {/* 10 — Owner reviews (SPEC-REVIEWS-001 L6) */}
      <ReviewsSection vin={vehicle.vin} />

      {/* 11 — Mobile sticky reservation bar (client, fixed) */}
      <MobileStickyBar vehicle={vehicle} />
    </>
  );
}
