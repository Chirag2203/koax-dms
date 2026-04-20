'use client';

/**
 * Customers store — minimal Zustand store following parts-store pattern.
 *
 * Seeded from @dms/mocks/fixtures on first mount by CustomersStoreHydrator.
 * Provides customer lookup, profile updates, and audit logging for P2.
 *
 * Spec reference: SPEC-CUSTOMERS-001 §3 (store shape)
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Customer } from '@dms/types';

// ─── Audit event ──────────────────────────────────────────────────────────────

export type CustomerAuditEventKind = 'PROFILE_UPDATE' | 'PDF_EXPORT' | 'ERASURE';

export interface CustomerAuditEvent {
  id: string;
  customerId: string;
  kind: CustomerAuditEventKind;
  at: string;
  actorId: string;
  target?: string;
}

// ─── State shape ──────────────────────────────────────────────────────────────

export interface CustomersState {
  customers: Record<string, Customer>;
  auditEvents: CustomerAuditEvent[];
  hydrated: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface Actor {
  id: string;
  name: string;
  role?: string;
}

export interface CustomersActions {
  /** Upsert a batch of customers (called by hydrator). */
  hydrateCustomers(customers: Customer[]): void;

  /** Update mutable profile fields. */
  updateCustomerProfile(
    id: string,
    patch: Partial<Pick<Customer, 'name' | 'email' | 'phone'>>,
    actor: Actor,
  ): void;

  /** Log a C360 PDF export audit event. */
  logAuditExport(id: string, opts: { target: string }, actor: Actor): void;

  /** Log an erasure event and redact PII. */
  logErasure(id: string, actor: Actor): void;
}

export type CustomersStore = CustomersState & CustomersActions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _eventCounter = 0;

function nextEventId() {
  return `cust-evt-${Date.now()}-${++_eventCounter}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCustomersStore = create<CustomersStore>()(
  immer((set) => ({
    customers: {},
    auditEvents: [],
    hydrated: false,

    hydrateCustomers(customers) {
      set((state) => {
        if (state.hydrated) return;
        for (const c of customers) {
          state.customers[c.id] = c;
        }
        state.hydrated = true;
      });
    },

    updateCustomerProfile(id, patch, actor) {
      set((state) => {
        const customer = state.customers[id];
        if (!customer) return;
        Object.assign(customer, patch);
        state.auditEvents.push({
          id: nextEventId(),
          customerId: id,
          kind: 'PROFILE_UPDATE',
          at: new Date().toISOString(),
          actorId: actor.id,
        });
      });
    },

    logAuditExport(id, opts, actor) {
      set((state) => {
        state.auditEvents.push({
          id: nextEventId(),
          customerId: id,
          kind: 'PDF_EXPORT',
          at: new Date().toISOString(),
          actorId: actor.id,
          target: opts.target,
        });
      });
    },

    logErasure(id, actor) {
      set((state) => {
        const customer = state.customers[id];
        if (!customer) return;
        // Redact PII
        customer.name = '[Redacted]';
        customer.email = `redacted-${id}@erasure.invalid`;
        customer.phone = '[Redacted]';
        customer.pan = undefined;
        state.auditEvents.push({
          id: nextEventId(),
          customerId: id,
          kind: 'ERASURE',
          at: new Date().toISOString(),
          actorId: actor.id,
        });
      });
    },
  })),
);
