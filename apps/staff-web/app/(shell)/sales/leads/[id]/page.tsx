import { notFound } from 'next/navigation';
import {
  deals,
  interactions,
  kycStatuses,
  testDriveBookings,
} from '@dms/mocks/fixtures';
import type { Interaction, TestDriveBooking } from '@dms/types';
import { EnquiryDetailView } from '@/src/components/sales/enquiry-detail-view';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string };
}

// ─── Test-drive → Interaction adapter ─────────────────────────────────────────
// Maps a TestDriveBooking that's tied to this deal's customer + VIN into a
// synthetic `Interaction` of type `'test-drive-scheduled'` so it shows up in
// the deal's interaction ledger alongside notes/calls/system events.
//
// Per user direction (2026-04-30): the ledger should reflect every customer
// interaction, including test drives.

const SLOT_LABEL: Record<TestDriveBooking['requestedSlot'], string> = {
  MORNING: 'Morning · 9am–12pm',
  AFTERNOON: 'Afternoon · 12pm–4pm',
  EVENING: 'Evening · 4pm–7pm',
  FULL_DAY: 'Full day',
};

const STATUS_LABEL: Record<TestDriveBooking['status'], string> = {
  PENDING: 'Pending confirmation',
  SCHEDULED: 'Scheduled',
  EXECUTING: 'In progress',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
  CANCELLED: 'Cancelled',
};

function bookingToInteraction(
  booking: TestDriveBooking,
  dealId: string,
): Interaction {
  const slotLabel = SLOT_LABEL[booking.requestedSlot] ?? booking.requestedSlot;
  const statusLabel = STATUS_LABEL[booking.status] ?? booking.status;
  const dateStr = new Date(booking.requestedDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const bodyParts: string[] = [
    `${dateStr} · ${slotLabel}`,
    `Status: ${statusLabel}`,
  ];
  if (booking.notes) bodyParts.push(`Notes: ${booking.notes}`);
  if (booking.governmentIdType && booking.governmentIdValue) {
    const idMasked =
      booking.governmentIdType === 'AADHAAR_L4'
        ? `XXXX-XXXX-${booking.governmentIdValue}`
        : booking.governmentIdValue;
    bodyParts.push(`ID on file: ${booking.governmentIdType} (${idMasked})`);
  }
  return {
    id: `td-${booking.id}`,
    dealId,
    type: 'test-drive-scheduled',
    title: `Test drive · ${booking.vehicleYear} ${booking.vehicleMake} ${booking.vehicleModel}`,
    body: bodyParts.join(' — '),
    createdAt: booking.createdAt,
    // TestDriveBooking has `assignedAdvisorName` (or no advisor when PENDING)
    addedByName: (booking as { assignedAdvisorName?: string }).assignedAdvisorName ?? 'System',
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EnquiryDetailPage({ params }: PageProps) {
  const deal = deals.find((d) => d.id === params.id);

  if (!deal) {
    notFound();
  }

  // Existing fixture interactions (notes / calls / messages / system)
  const fixtureInteractions = interactions.filter((i) => i.dealId === params.id);

  // Synthetic interactions from test-drive bookings — match by
  // (customerName, vehicleVin) since bookings predate Seam 44 linkedDealId.
  const tdInteractions: Interaction[] = testDriveBookings
    .filter(
      (b) =>
        b.customerName === deal.customerName &&
        b.vehicleVin === deal.vehicleVin,
    )
    .map((b) => bookingToInteraction(b, deal.id));

  // Merged + sorted DESC by createdAt — view re-sorts but we ship a deterministic order
  const dealInteractions: Interaction[] = [
    ...fixtureInteractions,
    ...tdInteractions,
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const kyc = kycStatuses.find((k) => k.dealId === params.id) ?? null;

  return (
    <EnquiryDetailView
      deal={deal}
      interactions={dealInteractions}
      kyc={kyc}
    />
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export function generateMetadata({ params }: PageProps) {
  const deal = deals.find((d) => d.id === params.id);
  return {
    title: deal ? `${deal.customerName} — Enquiry` : 'Enquiry Detail',
  };
}
