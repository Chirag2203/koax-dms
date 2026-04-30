/**
 * /test-drives/new — Staff-initiated test drive booking wizard.
 *
 * Accepts ?customerId={id}&vehicleVin={vin} query params for pre-fill
 * when navigated from a sales deal's "Book Test Drive" CTA.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 P1 (staff creation path)
 */

import { Suspense } from 'react';
import { NewTestDriveWizard } from '@/src/components/test-drives/new-test-drive-wizard';

export const metadata = {
  title: 'New Test Drive Booking — BN DMS',
};

export default function NewTestDrivePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="h-64 bg-bg-subtle rounded-md animate-pulse" />
        </div>
      }
    >
      <NewTestDriveWizard />
    </Suspense>
  );
}
