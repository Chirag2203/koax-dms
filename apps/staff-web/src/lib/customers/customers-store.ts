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

export type CustomerAuditEventKind = 'CREATE' | 'PROFILE_UPDATE' | 'PDF_EXPORT' | 'ERASURE';

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

// ─── createCustomer input ─────────────────────────────────────────────────────

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email: string;
  preferredCity?: Customer['preferredCity'];
  contactConfidential?: boolean;
}

export interface CustomersActions {
  /** Upsert a batch of customers (called by hydrator). */
  hydrateCustomers(customers: Customer[]): void;

  /**
   * Create a new customer.
   * Idempotency: if phone + email match an existing customer, returns the existing one.
   * Emits a CREATE audit event.
   */
  createCustomer(input: CreateCustomerInput, actor?: Actor): Customer;

  /** Update mutable profile fields. */
  updateCustomerProfile(
    id: string,
    patch: Partial<Pick<Customer, 'name' | 'email' | 'phone' | 'contactConfidential'>>,
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

/** Slugify a customer name into a URL-safe fragment. */
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

/** Generate a customer id like `cust-{slug}-{random}`. */
function nextCustomerId(name: string): string {
  const slug = slugifyName(name) || 'customer';
  const rand = Math.random().toString(36).slice(2, 7);
  return `cust-${slug}-${rand}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCustomersStore = create<CustomersStore>()(
  immer((set, get) => ({
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

    createCustomer(input, actor) {
      // Idempotency: return existing customer if phone + email already match
      const existing = Object.values(get().customers).find(
        (c) => c.phone === input.phone && c.email === input.email,
      );
      if (existing) return existing;

      const newCustomer: Customer = {
        id: nextCustomerId(input.name),
        name: input.name,
        phone: input.phone,
        email: input.email,
        avatar: input.name
          .split(' ')
          .map((w) => w[0] ?? '')
          .slice(0, 2)
          .join('')
          .toUpperCase(),
        preferredCity: input.preferredCity ?? 'bangalore',
        preferredLanguage: 'en-IN',
        memberSince: new Date().toISOString().split('T')[0]!,
        contactConfidential: input.contactConfidential ?? false,
      };

      set((state) => {
        state.customers[newCustomer.id] = newCustomer;
        state.auditEvents.push({
          id: nextEventId(),
          customerId: newCustomer.id,
          kind: 'CREATE',
          at: new Date().toISOString(),
          actorId: actor?.id ?? 'staff-system',
        });
      });

      return newCustomer;
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
