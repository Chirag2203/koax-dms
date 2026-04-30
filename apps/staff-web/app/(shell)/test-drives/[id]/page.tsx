/**
 * /test-drives/[id] — Test-drive booking detail.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S2 S4 S5 S7 S8 S9 S15
 */

import { TestDriveDetailView } from '@/src/components/test-drives/test-drive-detail-view';

interface PageProps {
  params: { id: string };
}

export default function TestDriveDetailPage({ params }: PageProps) {
  return <TestDriveDetailView bookingId={params.id} />;
}

export function generateMetadata({ params }: PageProps) {
  return {
    title: `${params.id} — Test Drive Detail`,
  };
}
