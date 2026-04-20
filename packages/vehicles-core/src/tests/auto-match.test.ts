/**
 * Unit tests — computeAutoMatch
 * Spec reference: SPEC-VEHICLES-001 §3.4
 */

import { describe, it, expect } from 'vitest';
import { computeAutoMatch } from '../auto-match';
import type { Customer, OwnershipClaim } from '@dms/types';

const VIN = 'WBA3A5C50DF123456';

function makeCustomer(overrides: Partial<Customer> & { id: string; name: string }): Customer {
  return {
    email: 'test@example.com',
    phone: '+919876543210',
    avatar: 'TC',
    preferredCity: 'bangalore',
    preferredLanguage: 'en-IN',
    memberSince: '2023-01-01',
    ...overrides,
  };
}

const claimant = makeCustomer({
  id: 'cust-arjun',
  name: 'Arjun Mehta',
  pan: 'ABCDE1234F',
  email: 'arjun@example.com',
  phone: '+919876543210',
});

const matchingBuyer = makeCustomer({
  id: 'cust-buyer',
  name: 'Arjun Mehta',
  pan: 'ABCDE1234F',
});

const completedSO = {
  id: 'so-001',
  vin: VIN,
  status: 'COMPLETED',
  buyerId: 'cust-buyer',
};

const noClaims: OwnershipClaim[] = [];

describe('computeAutoMatch', () => {
  it('returns hit=true when claimant PAN matches SO buyer PAN', () => {
    const result = computeAutoMatch(
      VIN,
      claimant,
      [completedSO],
      [],
      [matchingBuyer],
      noClaims,
    );
    expect(result.hit).toBe(true);
    expect(result.matchedEntityId).toBe('so-001');
  });

  it('returns hit=false when VIN does not match any SO', () => {
    const result = computeAutoMatch(
      VIN,
      claimant,
      [{ ...completedSO, vin: 'WAUFGAFR9LA003456' }],
      [],
      [matchingBuyer],
      noClaims,
    );
    expect(result.hit).toBe(false);
  });

  it('returns hit=false when SO is not COMPLETED', () => {
    const result = computeAutoMatch(
      VIN,
      claimant,
      [{ ...completedSO, status: 'ACCEPTED' }],
      [],
      [matchingBuyer],
      noClaims,
    );
    expect(result.hit).toBe(false);
  });

  it('matches via JobCard when SO match fails', () => {
    const jc = { id: 'jc-001', vin: VIN, customerId: 'cust-buyer' };
    const result = computeAutoMatch(VIN, claimant, [], [jc], [matchingBuyer], noClaims);
    expect(result.hit).toBe(true);
    expect(result.matchedEntityId).toBe('jc-001');
  });

  it('matches via email+phone when PAN is absent', () => {
    const noPanClaimant = makeCustomer({
      id: 'cust-arjun',
      name: 'Arjun Mehta',
      email: 'arjun@example.com',
      phone: '+919876543210',
    });
    const noPanBuyer = makeCustomer({
      id: 'cust-buyer',
      name: 'Arjun Mehta',
      email: 'arjun@example.com',
      phone: '+919876543210',
    });
    const result = computeAutoMatch(
      VIN, noPanClaimant, [completedSO], [], [noPanBuyer], noClaims,
    );
    expect(result.hit).toBe(true);
  });

  it('rejection guard: prior REJECTED claim blocks auto-match', () => {
    const priorRejected: OwnershipClaim = {
      id: 'claim-001',
      vin: VIN,
      claimantCustomerId: 'cust-arjun',
      submittedAt: '2026-01-01T00:00:00.000Z',
      autoMatchHit: false,
      state: 'REJECTED',
      schemaVersion: 'v1',
    };
    const result = computeAutoMatch(
      VIN, claimant, [completedSO], [], [matchingBuyer], [priorRejected],
    );
    expect(result.hit).toBe(false);
  });

  it('rejection guard: PENDING claim on different VIN does NOT block auto-match', () => {
    const otherVinRejected: OwnershipClaim = {
      id: 'claim-002',
      vin: 'WAUFGAFR9LA003456',
      claimantCustomerId: 'cust-arjun',
      submittedAt: '2026-01-01T00:00:00.000Z',
      autoMatchHit: false,
      state: 'REJECTED',
      schemaVersion: 'v1',
    };
    const result = computeAutoMatch(
      VIN, claimant, [completedSO], [], [matchingBuyer], [otherVinRejected],
    );
    expect(result.hit).toBe(true);
  });
});
