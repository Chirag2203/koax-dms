/**
 * Unit tests — event-payload-validators
 *
 * 1 happy-path per SalesEventKind (7) + 1 per DocumentAccessKind (5)
 * + 5 reject cases per spec §8 P1.
 *
 * Spec reference: PLAN-VEHICLES-003 §2.5, §8 P1
 */

import { describe, it, expect } from 'vitest';
import {
  validateSalesEventPayload,
  validateDocumentAccessPayload,
  PayloadValidationError,
} from '../event-payload-validators';

// ─── SalesEvent happy paths ───────────────────────────────────────────────────

describe('validateSalesEventPayload — happy paths', () => {
  it('ACQUIRED — valid payload passes', () => {
    expect(() =>
      validateSalesEventPayload('ACQUIRED', {
        acquisitionCost: 1_000_000,
        kmAtAcquisition: 25_000,
        source: 'BN_SALE',
      }),
    ).not.toThrow();
  });

  it('LISTED — valid payload passes', () => {
    expect(() =>
      validateSalesEventPayload('LISTED', {
        listPrice: 1_200_000,
        outletId: 'BLR-01',
      }),
    ).not.toThrow();
  });

  it('PRICE_CHANGED — valid payload passes', () => {
    expect(() =>
      validateSalesEventPayload('PRICE_CHANGED', {
        fromPrice: 1_200_000,
        toPrice: 1_100_000,
        reason: 'Festive discount',
      }),
    ).not.toThrow();
  });

  it('RESERVED — valid payload passes', () => {
    expect(() =>
      validateSalesEventPayload('RESERVED', {
        dealId: 'deal-001',
        depositAmount: 50_000,
        expiresAt: '2026-05-01T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('RESERVATION_LOST — valid payload passes', () => {
    expect(() =>
      validateSalesEventPayload('RESERVATION_LOST', {
        dealId: 'deal-001',
        reason: 'EXPIRED',
      }),
    ).not.toThrow();
  });

  it('SOLD — valid full payload passes', () => {
    expect(() =>
      validateSalesEventPayload('SOLD', {
        salesOrderId: 'SO-001',
        finalPrice: 1_200_000,
        flow: 'MARGIN_SCHEME',
        tcsCollected: 12_000,
        tcsWaived: false,
        gstMargin: 30_508,
        sellerSignatures: [
          { customerId: 'cust-001', signedAt: '2026-04-20T10:00:00.000Z', actorId: 'staff-001' },
        ],
        buyerCustomerId: 'cust-001',
      }),
    ).not.toThrow();
  });

  it('RETURNED — valid payload passes', () => {
    expect(() =>
      validateSalesEventPayload('RETURNED', {
        salesOrderId: 'SO-001',
        reason: 'Customer changed mind',
      }),
    ).not.toThrow();
  });
});

// ─── DocumentAccessEvent happy paths ─────────────────────────────────────────

describe('validateDocumentAccessPayload — happy paths', () => {
  it('UPLOAD — valid payload passes', () => {
    expect(() =>
      validateDocumentAccessPayload('UPLOAD', {
        category: 'noc',
        subtype: 'rto',
        fileName: 'noc-form28.pdf',
        expiresAt: '2027-01-01T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('UPDATE — valid payload passes', () => {
    expect(() =>
      validateDocumentAccessPayload('UPDATE', {
        before: { expiresAt: '2026-01-01T00:00:00.000Z' },
        after: { expiresAt: '2027-01-01T00:00:00.000Z' },
      }),
    ).not.toThrow();
  });

  it('REPLACE — valid payload passes', () => {
    expect(() =>
      validateDocumentAccessPayload('REPLACE', {
        previousDocId: 'doc-001',
        previousVersion: 1,
        newVersion: 2,
      }),
    ).not.toThrow();
  });

  it('DELETE — valid payload passes (reason optional)', () => {
    expect(() =>
      validateDocumentAccessPayload('DELETE', {}),
    ).not.toThrow();
  });

  it('DOWNLOAD — valid payload passes (purpose optional)', () => {
    expect(() =>
      validateDocumentAccessPayload('DOWNLOAD', {
        purpose: 'RTO_FILING',
        purposeNote: 'Transferring registration to Chennai',
      }),
    ).not.toThrow();
  });
});

// ─── Reject cases ─────────────────────────────────────────────────────────────

describe('validateSalesEventPayload — reject cases', () => {
  it('missing required field: ACQUIRED without acquisitionCost throws PayloadValidationError', () => {
    expect(() =>
      validateSalesEventPayload('ACQUIRED', {
        kmAtAcquisition: 25_000,
        source: 'BN_SALE',
        // acquisitionCost missing
      }),
    ).toThrow(PayloadValidationError);
  });

  it('wrong type: ACQUIRED with acquisitionCost as string throws', () => {
    expect(() =>
      validateSalesEventPayload('ACQUIRED', {
        acquisitionCost: 'not-a-number',
        kmAtAcquisition: 25_000,
        source: 'BN_SALE',
      }),
    ).toThrow(PayloadValidationError);
  });

  it('invalid enum: RESERVATION_LOST with invalid reason throws', () => {
    expect(() =>
      validateSalesEventPayload('RESERVATION_LOST', {
        dealId: 'deal-001',
        reason: 'JUST_BECAUSE', // not in enum
      }),
    ).toThrow(PayloadValidationError);
  });

  it('invalid datetime: RESERVED with non-ISO expiresAt throws', () => {
    expect(() =>
      validateSalesEventPayload('RESERVED', {
        dealId: 'deal-001',
        depositAmount: 50_000,
        expiresAt: 'not-a-datetime',
      }),
    ).toThrow(PayloadValidationError);
  });

  it('extra keys are allowed (z.object does not strip by default in safeParse)', () => {
    // Extra keys on z.object are allowed by default (strict() would reject them)
    // This confirms our validators do NOT use .strict() — forward-compat friendly
    expect(() =>
      validateSalesEventPayload('LISTED', {
        listPrice: 1_200_000,
        outletId: 'BLR-01',
        futureField: 'allowed',
      }),
    ).not.toThrow();
  });
});
