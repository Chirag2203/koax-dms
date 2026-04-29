/**
 * Settings store — SPEC-SETTINGS-001 §4
 *
 * Combines outlets, integrations, feature-flags, and audit slices.
 * Built with Zustand + immer (same pattern as staff-store.ts).
 *
 * Seam 18: Settings → Staff (outlet manager reference).
 *   The edit form reads from staff-store at the UI layer; this store
 *   accepts a pre-filtered staffProfiles map to avoid direct cross-store imports.
 *
 * Seam 19: Outlet deactivation → all modules.
 *   Consumers check outlets[id].active before creating new bookings/orders.
 *
 * Seam 20: Feature flags registry → all flag-gated features.
 *   getFlag() in registry.ts reads defaults; this store overrides in-memory (v1).
 *
 * L1: 3 outlets only — no addOutlet/deleteOutlet actions.
 * L6: Feature flag toggles are in-memory only in v1 (DEF-SETTINGS-1).
 * L7: Every mutation emits a SettingsAuditEvent.
 * L9: deactivateOutlet sets active=false (soft delete).
 * L14: Audit retention 3 years.
 * L15: Hub gated at R12+ — enforced at route level using Gate primitive.
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  OutletConfig,
  IntegrationCredential,
  IntegrationProvider,
  FeatureFlag,
  SettingsAuditEvent,
  SettingsAuditEventKind,
} from '@dms/types';
import { hasRank } from '@dms/types';
import type { StaffRoleCode } from '@dms/types';

import {
  buildInitialOutlets,
  validateOutletPatch,
  buildAuditEvent,
  deepDiff,
  OutletEditDeniedError,
  type StoreActor,
} from './slices/outlets-slice';
import {
  buildInitialCredentials,
  runConnectionTestStub,
  validateDisconnect,
} from './slices/integrations-slice';
import {
  buildInitialFlags,
  validateFlagToggle,
} from './slices/feature-flags-slice';
import {
  buildInitialAuditLog,
  filterAuditLog,
  type AuditFilters,
} from './slices/audit-slice';

// ─── State ────────────────────────────────────────────────────────────────────

export interface SettingsState {
  outlets: Record<string, OutletConfig>;
  credentials: Record<IntegrationProvider, IntegrationCredential>;
  flags: Record<string, FeatureFlag>;
  auditLog: SettingsAuditEvent[];
  hydrated: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface SettingsActions {
  hydrate: () => void;

  // Outlet actions
  updateOutlet(
    id: string,
    patch: Partial<OutletConfig>,
    actor: StoreActor,
    staffProfiles: Record<string, { role: StaffRoleCode; outlet: string }>,
  ): void;

  deactivateOutlet(id: string, actor: StoreActor): void;
  reactivateOutlet(id: string, actor: StoreActor): void;

  // Integration actions
  testConnection(
    provider: IntegrationProvider,
    actor: StoreActor,
  ): Promise<{ ok: boolean; message: string }>;

  disconnectIntegration(provider: IntegrationProvider, actor: StoreActor): void;

  // Feature flag actions
  toggleFlag(key: string, value: boolean | string, actor: StoreActor): void;

  // Audit actions
  getAuditLog(filters?: AuditFilters): SettingsAuditEvent[];
  logRbacViewed(actor: StoreActor): void;
  logRbacExported(actor: StoreActor): void;
}

export type SettingsStore = SettingsState & SettingsActions;

// ─── Initial state builder ────────────────────────────────────────────────────

function buildInitialState(): SettingsState {
  return {
    outlets: {},
    credentials: {} as Record<IntegrationProvider, IntegrationCredential>,
    flags: {},
    auditLog: buildInitialAuditLog(),
    hydrated: false,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()(
  immer((set, get) => ({
    ...buildInitialState(),

    hydrate() {
      set((state) => {
        state.outlets = buildInitialOutlets();
        state.credentials = buildInitialCredentials();
        state.flags = buildInitialFlags();
        state.hydrated = true;
      });
    },

    // ─── Outlet actions ───────────────────────────────────────────────────────

    updateOutlet(id, patch, actor, staffProfiles) {
      const outlet = get().outlets[id];
      if (!outlet) {
        throw new Error(`Outlet "${id}" not found.`);
      }

      // Validate patch (throws on violation — L2, L3, L10)
      validateOutletPatch(outlet, patch, actor, staffProfiles);

      // Compute diff (L7)
      const { before, after } = deepDiff(
        outlet as unknown as Record<string, unknown>,
        patch as Record<string, unknown>,
      );

      const auditEvent = buildAuditEvent(
        'outlet-edit',
        actor,
        id,
        before,
        after,
      );

      set((state) => {
        const target = state.outlets[id];
        if (target) {
          Object.assign(target, patch);
          target.updatedAt = auditEvent.at;
        }
        state.auditLog.push(auditEvent);
      });
    },

    deactivateOutlet(id, actor) {
      // L9: R02+ required
      if (!hasRank(actor.role, 'R02')) {
        throw new OutletEditDeniedError(
          `Org Admin (R02) required to deactivate an outlet. Actor role: ${actor.role}`,
        );
      }

      const outlet = get().outlets[id];
      if (!outlet) throw new Error(`Outlet "${id}" not found.`);

      const auditEvent = buildAuditEvent(
        'outlet-deactivated',
        actor,
        id,
        { active: true },
        { active: false },
        `Outlet ${outlet.code} deactivated`,
      );

      set((state) => {
        const target = state.outlets[id];
        if (target) {
          target.active = false;
          target.updatedAt = auditEvent.at;
        }
        state.auditLog.push(auditEvent);
      });
    },

    reactivateOutlet(id, actor) {
      if (!hasRank(actor.role, 'R02')) {
        throw new OutletEditDeniedError(
          `Org Admin (R02) required to reactivate an outlet. Actor role: ${actor.role}`,
        );
      }

      const outlet = get().outlets[id];
      if (!outlet) throw new Error(`Outlet "${id}" not found.`);

      const auditEvent = buildAuditEvent(
        'outlet-reactivated',
        actor,
        id,
        { active: false },
        { active: true },
        `Outlet ${outlet.code} reactivated`,
      );

      set((state) => {
        const target = state.outlets[id];
        if (target) {
          target.active = true;
          target.updatedAt = auditEvent.at;
        }
        state.auditLog.push(auditEvent);
      });
    },

    // ─── Integration actions ──────────────────────────────────────────────────

    async testConnection(provider, actor) {
      const result = await runConnectionTestStub(provider, actor);

      const auditEvent = buildAuditEvent(
        'integration-test',
        actor,
        provider,
        undefined,
        { result: result.message, testedAt: result.testedAt },
      );

      set((state) => {
        const cred = state.credentials[provider];
        if (cred) {
          cred.connectionTestedAt = result.testedAt;
          cred.connectionTestResult = {
            ok: result.ok,
            message: result.message,
            testedAt: result.testedAt,
          };
        }
        state.auditLog.push(auditEvent);
      });

      return { ok: result.ok, message: result.message };
    },

    disconnectIntegration(provider, actor) {
      // L16: role check — UI handles type-to-confirm "DISCONNECT"
      validateDisconnect(provider, actor);

      const now = new Date().toISOString();
      const auditEvent = buildAuditEvent(
        'integration-disconnected',
        actor,
        provider,
        { status: 'connected' },
        { status: 'disconnected', disconnectedAt: now },
      );

      set((state) => {
        const cred = state.credentials[provider];
        if (cred) {
          cred.status = 'disconnected';
          cred.disconnectedAt = now;
        }
        state.auditLog.push(auditEvent);
      });
    },

    // ─── Feature flag actions ─────────────────────────────────────────────────

    toggleFlag(key, value, actor) {
      // L6: R02+ only
      validateFlagToggle(actor);

      const flag = get().flags[key];
      if (!flag) {
        throw new Error(`Feature flag "${key}" not found in registry.`);
      }

      const now = new Date().toISOString();
      const auditEvent = buildAuditEvent(
        'feature-flag-toggled',
        actor,
        key,
        { value: flag.value },
        { value },
      );

      set((state) => {
        const target = state.flags[key];
        if (target) {
          target.value = value;
          target.updatedAt = now;
          target.updatedBy = actor.id;
        }
        state.auditLog.push(auditEvent);
      });
    },

    // ─── Audit actions ────────────────────────────────────────────────────────

    getAuditLog(filters) {
      const { auditLog } = get();
      if (!filters) return auditLog;
      return filterAuditLog(auditLog, filters);
    },

    logRbacViewed(actor) {
      const auditEvent = buildAuditEvent('rbac-matrix-viewed', actor, 'rbac-matrix');
      set((state) => {
        state.auditLog.push(auditEvent);
      });
    },

    logRbacExported(actor) {
      const auditEvent = buildAuditEvent('rbac-matrix-exported', actor, 'rbac-matrix');
      set((state) => {
        state.auditLog.push(auditEvent);
      });
    },
  })),
);

// ─── Hydrator ─────────────────────────────────────────────────────────────────

export function hydrateSettingsStore(): void {
  useSettingsStore.getState().hydrate();
}

// Re-export StoreActor for consumers
export type { StoreActor };
