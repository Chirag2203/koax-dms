import { notFound } from 'next/navigation';
import { vehicles } from '@dms/mocks/fixtures';
import { VehicleEditForm } from '@/src/components/inventory/vehicle-edit-form';

// ─── Page ─────────────────────────────────────────────────────────────────────

interface VehicleEditPageProps {
  params: Promise<{ vin: string }>;
}

export default async function VehicleEditPage({ params }: VehicleEditPageProps) {
  const { vin } = await params;

  const vehicle = vehicles.find((v) => v.vin === vin);
  if (!vehicle) {
    notFound();
  }

  return <VehicleEditForm vehicle={vehicle} />;
}

export async function generateMetadata({ params }: VehicleEditPageProps) {
  const { vin } = await params;
  const vehicle = vehicles.find((v) => v.vin === vin);
  if (!vehicle) return { title: 'Vehicle Not Found' };
  return { title: `Edit ${vehicle.year} ${vehicle.make} ${vehicle.model} — BN DMS` };
}
