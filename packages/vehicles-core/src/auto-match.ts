/**
 * Auto-match computation — pure helper, single source of truth.
 *
 * Imported by both staff-web and customer-web. The claim-slice is NOT allowed
 * to import this — auto-match is pre-computed by the UI layer and passed as a
 * boolean flag into `submitClaim`. This keeps the claim-slice pure (D9, §7.3).
 *
 * Rejection guard (§3.4): if the claimant had a prior REJECTED claim on the
 * same VIN, auto-match returns { hit: false } unconditionally — even if PII
 * fingerprints would otherwise match. This prevents gaming via re-submission.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.4
 */

import type { Customer, OwnershipClaim } from '@dms/types';
import { normalizeVin } from './vin-normalizer';

// ─── Internal types ───────────────────────────────────────────────────────────

/** Minimal SalesOrder shape needed for matching (avoids full import). */
interface MatchableSalesOrder {
  id: string;
  vin: string;
  status: string; // 'COMPLETED' for eligible SOs
  buyerId: string;
}

/** Minimal JobCard shape needed for matching. */
interface MatchableJobCard {
  id: string;
  vin: string;
  customerId: string;
}

// ─── computeAutoMatch ─────────────────────────────────────────────────────────

/**
 * Computes whether a claimant's PII fingerprint matches a known BN sales or
 * service record for the given VIN.
 *
 * Match criteria (§3.4):
 * 1. PAN match (PAN + PAN): if both have PAN and they match → hit
 * 2. Email + phone match (both must match simultaneously): email AND E.164-normalized phone
 *
 * Matched against the LATEST customer record for the buyer/service customer,
 * not the PII snapshot stored on the JC/SO at creation time.
 *
 * @returns `{ hit: true, matchedEntityId }` or `{ hit: false }`
 */
export function computeAutoMatch(
  vin: string,
  claimantCustomer: Customer,
  salesOrders: MatchableSalesOrder[],
  jobCards: MatchableJobCard[],
  customers: Customer[],
  /** Rejection-history guard: if claimant has a prior REJECTED claim → no auto-match */
  priorClaims: OwnershipClaim[],
): { hit: boolean; matchedEntityId?: string } {
  const normalizedVin = normalizeVin(vin);

  // Rejection guard — prior REJECTED claim on this VIN blocks auto-match
  const priorRejected = priorClaims.some(
    (c) =>
      c.vin === normalizedVin &&
      c.claimantCustomerId === claimantCustomer.id &&
      c.state === 'REJECTED',
  );
  if (priorRejected) return { hit: false };

  // Extract claimant PII fingerprints
  const pan = claimantCustomer.pan?.trim().toUpperCase();
  const emailKey = claimantCustomer.email?.trim().toLowerCase();
  const phoneKey = claimantCustomer.phone?.replace(/\D/g, '');

  /** Returns true if `c` fingerprint-matches the claimant */
  function fingerprintMatches(c: Customer | undefined): boolean {
    if (!c) return false;
    const cpan = c.pan?.trim().toUpperCase();
    const cemail = c.email?.trim().toLowerCase();
    const cphone = c.phone?.replace(/\D/g, '');
    // Rule 1: PAN match
    if (pan && cpan && pan === cpan) return true;
    // Rule 2: email + phone both match
    if (emailKey && phoneKey && cemail === emailKey && cphone === phoneKey) return true;
    return false;
  }

  // Check completed SalesOrders for this VIN
  const matchingSo = salesOrders
    .filter((so) => so.vin === normalizedVin && so.status === 'COMPLETED')
    .find((so) => fingerprintMatches(customers.find((c) => c.id === so.buyerId)));
  if (matchingSo) return { hit: true, matchedEntityId: matchingSo.id };

  // Check JobCards for this VIN
  const matchingJc = jobCards
    .filter((jc) => jc.vin === normalizedVin)
    .find((jc) => fingerprintMatches(customers.find((c) => c.id === jc.customerId)));
  if (matchingJc) return { hit: true, matchedEntityId: matchingJc.id };

  return { hit: false };
}
