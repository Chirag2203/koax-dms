import { notFound } from 'next/navigation';
import { vehicles, costLedgerEntries, appraisals, vehicleTimelineEvents, vehicleDocuments } from '@dms/mocks/fixtures';
import { VehicleDetailView } from '@/src/components/inventory/vehicle-detail-view';

// ─── Page ─────────────────────────────────────────────────────────────────────

interface VehicleDetailPageProps {
  params: Promise<{ vin: string }>;
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { vin } = await params;

  const vehicle = vehicles.find((v) => v.vin === vin);
  if (!vehicle) {
    notFound();
  }

  const ledger = costLedgerEntries.filter((e) => e.vin === vin);
  const appraisal = appraisals.find((a) => a.vin === vin) ?? null;
  const timeline = vehicleTimelineEvents.filter((t) => t.vin === vin);
  const docs = vehicleDocuments.filter((d) => d.vin === vin);

  return (
    <VehicleDetailView
      vehicle={vehicle}
      costLedger={ledger}
      appraisal={appraisal}
      timeline={timeline}
      documents={docs}
    />
  );
}

// Static metadata for tab title
export async function generateMetadata({ params }: VehicleDetailPageProps) {
  const { vin } = await params;
  const vehicle = vehicles.find((v) => v.vin === vin);
  if (!vehicle) return { title: 'Vehicle Not Found' };
  return { title: `${vehicle.year} ${vehicle.make} ${vehicle.model} — BN DMS` };
}
