/**
 * /test-drives — Staff test-drive queue.
 *
 * Spec reference: SPEC-TEST-DRIVE-001 §6 S10 S13 S14
 */

import { TestDriveQueueView } from '@/src/components/test-drives/test-drive-queue-view';

export default function TestDrivesPage() {
  return <TestDriveQueueView />;
}

export const metadata = {
  title: 'Test Drives — BN DMS',
};
