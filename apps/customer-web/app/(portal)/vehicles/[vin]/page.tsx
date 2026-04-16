'use client';

import * as React from 'react';
import { notFound } from 'next/navigation';
import { ownedVehicles, serviceRecords, documents } from '@dms/mocks/fixtures';
import {
  VehicleInfoHeader,
  ServiceTimeline,
  VehicleDocuments,
} from '@/src/components/portal/vehicles';

// ─── Props ────────────────────────────────────────────────────────────────────

interface VehicleDetailPageProps {
  params: {
    vin: string;
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const vehicle = ownedVehicles.find((v) => v.vin === params.vin);

  if (!vehicle) {
    notFound();
  }

  const vehicleServiceRecords = serviceRecords.filter(
    (r) => r.vehicleVin === vehicle.vin,
  );

  const vehicleDocuments = documents.filter(
    (d) => d.vehicleVin === vehicle.vin,
  );

  return (
    <div className="max-w-5xl">
      {/* ── 1. Vehicle info + photo header ──────────────────────────────────── */}
      <VehicleInfoHeader vehicle={vehicle} />

      {/* ── 2. Service timeline ledger ──────────────────────────────────────── */}
      <ServiceTimeline records={vehicleServiceRecords} />

      {/* ── 3. Documents vault ──────────────────────────────────────────────── */}
      <VehicleDocuments documents={vehicleDocuments} />

      {/* Bottom padding for mobile tab bar */}
      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
