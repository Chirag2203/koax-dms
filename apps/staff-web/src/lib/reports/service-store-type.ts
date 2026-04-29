/**
 * Minimal ServiceStore type for reports selectors.
 * Re-exported from the service store for use in reports types.
 * Spec reference: SPEC-REPORTS-001 Seam 22
 */

// The service-store exports a full ServiceStore type; we use a minimal subset
// for reports selectors (only jobCards needed).
import type { JobCard } from '@dms/types';

// Minimal shape — reports selectors only read jobCards
export interface ServiceStore {
  jobCards: JobCard[];
}
