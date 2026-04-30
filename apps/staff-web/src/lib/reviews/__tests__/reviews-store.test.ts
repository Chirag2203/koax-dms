/**
 * Reviews store unit tests — SPEC-REVIEWS-001 §Test cases
 *
 * T-REV-1 through T-REV-15 (15 tests).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useReviewsStore } from '../reviews-store';
import type { Review } from '@dms/types';
import { DuplicateReviewError, MissingHideReasonError, ReviewNotFoundError, npsToStars } from '@dms/types';
import { reviews as fixtureReviews } from '@dms/mocks/fixtures';
import type { ReportPeriod, ReportScope } from '../../reports/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePeriod(from: string, to: string): ReportPeriod {
  return { kind: 'custom', from, to };
}

function makeScope(outletIds: string[] = ['BLR-01']): ReportScope {
  return { outletIds };
}

const BASE_REVIEW: Review = {
  id: 'rev-test-001',
  customerId: 'cust-arjun-mehta',
  vinOrJcId: 'VIN-TEST-001',
  kind: 'delivery',
  npsScore: 9,
  submittedAt: '2026-04-15T10:00:00.000Z',
  status: 'pending-moderation',
  outletId: 'BLR-01',
  customerFirstName: 'Arjun',
  customerCity: 'Bangalore',
};

function freshStore() {
  // Reset to empty state before each test
  useReviewsStore.getState()._seed([]);
}

// ─── T-REV-13: _seed ──────────────────────────────────────────────────────────

describe('T-REV-13: _seed loads fixture reviews', () => {
  it('seeds 12 fixture reviews', () => {
    
    useReviewsStore.getState()._seed(fixtureReviews);
    const state = useReviewsStore.getState();
    expect(state.reviews).toHaveLength(12);
  });

  it('T-REV-14: fixture has mix of delivery + service kinds', () => {
    
    useReviewsStore.getState()._seed(fixtureReviews);
    const state = useReviewsStore.getState();
    const deliveryCount = state.reviews.filter((r) => r.kind === 'delivery').length;
    const serviceCount = state.reviews.filter((r) => r.kind === 'service').length;
    expect(deliveryCount).toBeGreaterThan(0);
    expect(serviceCount).toBeGreaterThan(0);
  });
});

// ─── T-REV-1: submitReview ────────────────────────────────────────────────────

describe('T-REV-1: submitReview creates record with correct fields', () => {
  beforeEach(freshStore);

  it('creates a review with status pending-moderation', () => {
    const store = useReviewsStore.getState();
    const result = store.submitReview({
      id: 'rev-new-001',
      customerId: 'cust-arjun-mehta',
      vinOrJcId: 'VIN-ABC',
      kind: 'delivery',
      npsScore: 9,
      freeText: 'Great experience!',
      outletId: 'BLR-01',
      customerFirstName: 'Arjun',
      customerCity: 'Bangalore',
    });

    expect(result.id).toBe('rev-new-001');
    expect(result.status).toBe('pending-moderation');
    expect(result.npsScore).toBe(9);
    expect(result.kind).toBe('delivery');
    expect(result.freeText).toBe('Great experience!');
    expect(result.customerFirstName).toBe('Arjun');
    expect(result.customerCity).toBe('Bangalore');
    expect(result.outletId).toBe('BLR-01');
  });
});

// ─── T-REV-2: DuplicateReviewError ───────────────────────────────────────────

describe('T-REV-2: submitReview throws DuplicateReviewError on re-submit (L10)', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([BASE_REVIEW]);
  });

  it('throws DuplicateReviewError when same customerId + vinOrJcId', () => {
    const store = useReviewsStore.getState();
    expect(() =>
      store.submitReview({
        id: 'rev-test-002',
        customerId: BASE_REVIEW.customerId,
        vinOrJcId: BASE_REVIEW.vinOrJcId,
        kind: 'delivery',
        npsScore: 8,
        outletId: 'BLR-01',
        customerFirstName: 'Arjun',
        customerCity: 'Bangalore',
      }),
    ).toThrow(DuplicateReviewError);
  });
});

// ─── T-REV-3: approveReview ───────────────────────────────────────────────────

describe('T-REV-3: approveReview transitions to approved (L3)', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([{ ...BASE_REVIEW }]);
  });

  it('transitions pending-moderation to approved', () => {
    const store = useReviewsStore.getState();
    const result = store.approveReview(BASE_REVIEW.id, 'staff-r10-001');
    expect(result.status).toBe('approved');
    expect(result.moderatedBy).toBe('staff-r10-001');
    expect(result.moderatedAt).toBeDefined();
  });

  it('throws ReviewNotFoundError for unknown id', () => {
    expect(() =>
      useReviewsStore.getState().approveReview('no-such-id', 'staff-r10-001'),
    ).toThrow(ReviewNotFoundError);
  });
});

// ─── T-REV-4: hideReview ──────────────────────────────────────────────────────

describe('T-REV-4: hideReview transitions to hidden + stores hideReason (L12)', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([{ ...BASE_REVIEW }]);
  });

  it('transitions to hidden with reason', () => {
    const store = useReviewsStore.getState();
    const result = store.hideReview(BASE_REVIEW.id, 'staff-r02-001', 'Abusive language found');
    expect(result.status).toBe('hidden');
    expect(result.hideReason).toBe('Abusive language found');
    expect(result.moderatedBy).toBe('staff-r02-001');
    expect(result.moderatedAt).toBeDefined();
  });
});

// ─── T-REV-5: MissingHideReasonError ─────────────────────────────────────────

describe('T-REV-5: hideReview without reason throws MissingHideReasonError (L12, S-REV-5)', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([{ ...BASE_REVIEW }]);
  });

  it('throws when reason is empty string', () => {
    expect(() =>
      useReviewsStore.getState().hideReview(BASE_REVIEW.id, 'staff-r02-001', ''),
    ).toThrow(MissingHideReasonError);
  });

  it('throws when reason is less than 5 chars', () => {
    expect(() =>
      useReviewsStore.getState().hideReview(BASE_REVIEW.id, 'staff-r02-001', 'Bad'),
    ).toThrow(MissingHideReasonError);
  });

  it('succeeds with reason exactly 5 chars', () => {
    const result = useReviewsStore
      .getState()
      .hideReview(BASE_REVIEW.id, 'staff-r02-001', 'Spam!');
    expect(result.status).toBe('hidden');
  });
});

// ─── T-REV-6: selectApprovedForVin ───────────────────────────────────────────

describe('T-REV-6: selectApprovedForVin returns only approved reviews for VIN', () => {
  const vin = 'VIN-APPROVED-TEST';

  beforeEach(() => {
    useReviewsStore.getState()._seed([
      { ...BASE_REVIEW, id: 'rev-a1', vinOrJcId: vin, status: 'approved' },
      { ...BASE_REVIEW, id: 'rev-a2', vinOrJcId: vin, status: 'pending-moderation' },
      { ...BASE_REVIEW, id: 'rev-a3', vinOrJcId: vin, status: 'hidden' },
      { ...BASE_REVIEW, id: 'rev-a4', vinOrJcId: 'OTHER-VIN', status: 'approved' },
    ]);
  });

  it('returns only the approved review for the VIN', () => {
    const result = useReviewsStore.getState().selectApprovedForVin(vin);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('rev-a1');
  });

  // T-REV-15: hidden not in approved
  it('T-REV-15: hidden reviews excluded from selectApprovedForVin', () => {
    const result = useReviewsStore.getState().selectApprovedForVin(vin);
    expect(result.every((r) => r.status === 'approved')).toBe(true);
  });
});

// ─── T-REV-7: selectTopApprovedForVin ────────────────────────────────────────

describe('T-REV-7: selectTopApprovedForVin returns at most limit sorted by submittedAt DESC', () => {
  const vin = 'VIN-TOP-TEST';

  beforeEach(() => {
    useReviewsStore.getState()._seed([
      { ...BASE_REVIEW, id: 'rev-t1', vinOrJcId: vin, status: 'approved', submittedAt: '2026-04-01T00:00:00.000Z' },
      { ...BASE_REVIEW, id: 'rev-t2', vinOrJcId: vin, status: 'approved', submittedAt: '2026-04-10T00:00:00.000Z' },
      { ...BASE_REVIEW, id: 'rev-t3', vinOrJcId: vin, status: 'approved', submittedAt: '2026-04-20T00:00:00.000Z' },
      { ...BASE_REVIEW, id: 'rev-t4', vinOrJcId: vin, status: 'approved', submittedAt: '2026-03-01T00:00:00.000Z' },
    ]);
  });

  it('returns top 3 (default) sorted newest first', () => {
    const result = useReviewsStore.getState().selectTopApprovedForVin(vin);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe('rev-t3'); // newest
    expect(result[1]!.id).toBe('rev-t2');
    expect(result[2]!.id).toBe('rev-t1');
  });

  it('respects custom limit', () => {
    const result = useReviewsStore.getState().selectTopApprovedForVin(vin, 2);
    expect(result).toHaveLength(2);
  });
});

// ─── T-REV-8: selectPendingModeration with outlet scope ──────────────────────

describe('T-REV-8: selectPendingModeration filters by outlet (L13)', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([
      { ...BASE_REVIEW, id: 'rev-blr', outletId: 'BLR-01', status: 'pending-moderation' },
      { ...BASE_REVIEW, id: 'rev-mum', outletId: 'MUM-01', status: 'pending-moderation', vinOrJcId: 'ANOTHER-VIN', customerId: 'other-cust' },
    ]);
  });

  it('returns only BLR reviews when scopedOutletId = BLR-01', () => {
    const result = useReviewsStore.getState().selectPendingModeration('BLR-01');
    expect(result).toHaveLength(1);
    expect(result[0]!.outletId).toBe('BLR-01');
  });

  it('returns all pending when outletId undefined (R19+ use case)', () => {
    const result = useReviewsStore.getState().selectPendingModeration(undefined);
    expect(result).toHaveLength(2);
  });
});

// ─── T-REV-9: selectNpsAverage ───────────────────────────────────────────────

describe('T-REV-9: selectNpsAverage returns correct mean for given period', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([
      { ...BASE_REVIEW, id: 'r1', npsScore: 10, status: 'approved', submittedAt: '2026-04-15T00:00:00.000Z', outletId: 'BLR-01' },
      { ...BASE_REVIEW, id: 'r2', npsScore: 8,  status: 'approved', submittedAt: '2026-04-16T00:00:00.000Z', vinOrJcId: 'VIN-B', customerId: 'cust-2', outletId: 'BLR-01' },
      { ...BASE_REVIEW, id: 'r3', npsScore: 6,  status: 'approved', submittedAt: '2026-04-17T00:00:00.000Z', vinOrJcId: 'VIN-C', customerId: 'cust-3', outletId: 'BLR-01' },
      // Outside period — should not count
      { ...BASE_REVIEW, id: 'r4', npsScore: 10, status: 'approved', submittedAt: '2026-03-01T00:00:00.000Z', vinOrJcId: 'VIN-D', customerId: 'cust-4', outletId: 'BLR-01' },
    ]);
  });

  it('averages only reviews in period and scope', () => {
    const avg = useReviewsStore
      .getState()
      .selectNpsAverage(makePeriod('2026-04-01', '2026-04-30'), makeScope(['BLR-01']));
    // (10 + 8 + 6) / 3 = 8.0
    expect(avg).toBe(8.0);
  });
});

// ─── T-REV-10: selectNpsAverage returns null when empty ──────────────────────

describe('T-REV-10: selectNpsAverage returns null when no reviews in period (S-REV-10)', () => {
  beforeEach(freshStore);

  it('returns null when store is empty', () => {
    const avg = useReviewsStore
      .getState()
      .selectNpsAverage(makePeriod('2026-04-01', '2026-04-30'), makeScope(['BLR-01']));
    expect(avg).toBeNull();
  });

  it('returns null with empty outletIds scope', () => {
    useReviewsStore.getState()._seed([BASE_REVIEW]);
    const avg = useReviewsStore
      .getState()
      .selectNpsAverage(makePeriod('2026-04-01', '2026-04-30'), makeScope([]));
    expect(avg).toBeNull();
  });
});

// ─── T-REV-11: NPS → stars mapping ───────────────────────────────────────────

describe('T-REV-11: npsToStars mapping (L5)', () => {
  it('NPS 5 → 1 star (detractor)', () => {
    
    expect(npsToStars(5)).toBe(1);
    expect(npsToStars(0)).toBe(1);
    expect(npsToStars(6)).toBe(1);
  });

  it('NPS 8 → 4 stars (passive)', () => {
    
    expect(npsToStars(7)).toBe(4);
    expect(npsToStars(8)).toBe(4);
  });

  it('NPS 10 → 5 stars (promoter)', () => {
    
    expect(npsToStars(9)).toBe(5);
    expect(npsToStars(10)).toBe(5);
  });
});

// ─── T-REV-12: selectNpsAverage outlet scope ─────────────────────────────────

describe('T-REV-12: selectNpsAverage scopes by outletId (L13)', () => {
  beforeEach(() => {
    useReviewsStore.getState()._seed([
      { ...BASE_REVIEW, id: 'r-blr', npsScore: 10, status: 'approved', outletId: 'BLR-01', submittedAt: '2026-04-15T00:00:00.000Z' },
      { ...BASE_REVIEW, id: 'r-mum', npsScore: 5,  status: 'approved', outletId: 'MUM-01', submittedAt: '2026-04-15T00:00:00.000Z', vinOrJcId: 'VIN-MUM', customerId: 'cust-mum' },
    ]);
  });

  it('BLR scope returns 10.0, MUM scope returns 5.0', () => {
    const blrAvg = useReviewsStore
      .getState()
      .selectNpsAverage(makePeriod('2026-04-01', '2026-04-30'), makeScope(['BLR-01']));
    const mumAvg = useReviewsStore
      .getState()
      .selectNpsAverage(makePeriod('2026-04-01', '2026-04-30'), makeScope(['MUM-01']));
    expect(blrAvg).toBe(10.0);
    expect(mumAvg).toBe(5.0);
  });
});
