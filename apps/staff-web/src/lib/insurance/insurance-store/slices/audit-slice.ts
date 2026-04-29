/**
 * Insurance audit slice — append-only event log.
 *
 * All insurance actions that mutate significant state should call
 * appendAuditEvent. Events are immutable once written (append-only).
 *
 * Gate: R12+ can read via /insurance/audit.
 * Spec reference: SPEC-INSURANCE-001 §39, Task 3 (Audit log), L_INT_1
 */

import type { InsuranceSlice, AuditActions, InsuranceAuditEvent } from '../types';

export const createAuditSlice: InsuranceSlice<AuditActions> = (set, get) => ({
  appendAuditEvent(event: Omit<InsuranceAuditEvent, 'auditId' | 'occurredAt'>): void {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const full: InsuranceAuditEvent = {
      ...event,
      auditId,
      occurredAt: new Date().toISOString(),
    };
    set((state) => {
      state.auditEvents.push(full);
    });
  },

  getAuditEvents(entityId?: string): InsuranceAuditEvent[] {
    const events = get().auditEvents;
    if (!entityId) return [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return events
      .filter((e) => e.entityId === entityId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  },
});
