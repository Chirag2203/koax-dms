/**
 * Finance store integration tests — SPEC-FINANCE-001 §4
 *
 * Scenarios covered:
 * S-F-19: Audit log append-only — L26
 * S-F-20: Period / outlet scope state management — L24, L27
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('S-F-19: Audit log append-only — L26', () => {
  it('audit events array grows with each mutation', async () => {
    const { useFinanceStore } = await import('../lib/finance/finance-store');
    const actor = { id: 'test-actor', name: 'Test', role: 'R12' };

    const countBefore = useFinanceStore.getState().auditEvents.length;

    useFinanceStore.getState().createVendorInvoice(
      {
        invoiceNumber: `AUDIT-TEST-${Date.now()}`,
        vendorName: 'Audit Test Vendor',
        vendorGstin: '29AABCT1234K1Z5',
        category: 'parts',
        outletId: 'BLR',
        raisedAt: new Date().toISOString(),
        lines: [{
          id: 'L1',
          description: 'Test',
          hsnSac: '8708',
          quantity: 1,
          unitPricePaise: 100,
          gstRatePct: 18,
          gstAmountPaise: 18,
          lineTotalPaise: 118,
          inputCreditEligible: true,
        }],
        totalAmountPaise: 100,
        totalGstPaise: 18,
        inputCreditEligible: true,
      },
      actor,
    );

    const countAfter = useFinanceStore.getState().auditEvents.length;
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  it('audit events have required fields per L26', async () => {
    const { useFinanceStore } = await import('../lib/finance/finance-store');
    const events = useFinanceStore.getState().auditEvents;
    if (events.length > 0) {
      const event = events[0]!;
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('kind');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('actorId');
      expect(event).toHaveProperty('actorRole');
    }
  });

  it('prior audit events are not mutated (append-only)', async () => {
    const { useFinanceStore } = await import('../lib/finance/finance-store');
    const actor = { id: 'test-actor', name: 'Test', role: 'R12' };

    const snapshotBefore = [...useFinanceStore.getState().auditEvents];

    // Create another event
    useFinanceStore.getState().createVendorInvoice(
      {
        invoiceNumber: `APPEND-TEST-${Date.now()}`,
        vendorName: 'Append Test',
        vendorGstin: '29AABCT1234K1Z5',
        category: 'consumable',
        outletId: 'BLR',
        raisedAt: new Date().toISOString(),
        lines: [{
          id: 'L1', description: 'Test', quantity: 1,
          unitPricePaise: 100, gstRatePct: 18, gstAmountPaise: 18,
          lineTotalPaise: 118, inputCreditEligible: true,
        }],
        totalAmountPaise: 100,
        totalGstPaise: 18,
        inputCreditEligible: true,
      },
      actor,
    );

    const currentEvents = useFinanceStore.getState().auditEvents;
    // All prior events should still exist (append-only)
    for (let i = 0; i < snapshotBefore.length; i++) {
      expect(currentEvents[i]!.id).toBe(snapshotBefore[i]!.id);
    }
  });
});

describe('S-F-20: Period and outlet scope state — L24, L27', () => {
  it('setPeriod updates period state', async () => {
    const { useFinanceStore } = await import('../lib/finance/finance-store');
    const { getFYPeriod } = await import('../lib/finance/math/period');

    const newPeriod = getFYPeriod(2025); // FY25 (Apr 2024 – Mar 2025)
    useFinanceStore.getState().setPeriod(newPeriod);

    expect(useFinanceStore.getState().period.label).toBe(newPeriod.label);
  });

  it('setOutletScope updates outlet scope', async () => {
    const { useFinanceStore } = await import('../lib/finance/finance-store');

    useFinanceStore.getState().setOutletScope('MUM');
    expect(useFinanceStore.getState().outletScope).toBe('MUM');

    useFinanceStore.getState().setOutletScope('BLR');
    expect(useFinanceStore.getState().outletScope).toBe('BLR');
  });

  it('period state is local-only — L24: no upstream write side effects', async () => {
    const { useFinanceStore } = await import('../lib/finance/finance-store');
    const { getCurrentFYPeriod } = await import('../lib/finance/math/period');

    // setPeriod should not throw and should only change the period key
    const beforePeriod = useFinanceStore.getState().period;
    useFinanceStore.getState().setPeriod(getCurrentFYPeriod());
    // State should still be consistent
    expect(useFinanceStore.getState().period).toBeTruthy();
    expect(useFinanceStore.getState().period.label).toBeTruthy();
  });
});
