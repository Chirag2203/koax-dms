/**
 * Vehicles store — shared type definitions.
 *
 * LEAF file: imports only from @dms/types and zustand. No slice imports.
 * Every slice file imports VehiclesStore + VehiclesSlice from here.
 *
 * Spec reference: SPEC-VEHICLES-001 §3.2 + §3.3
 */

import type { StateCreator } from 'zustand';
import type {
  VehicleMaster,
  VehicleOwnership,
  OwnershipClaim,
  OwnershipChangeEvent,
  SalesEvent,
  SalesEventKind,
  VehicleTouchSource,
  CloseReason,
  RejectionReason,
  Document,
  StaffDocumentMetadata,
  DocumentAccessEvent,
  CostLedgerEntry,
} from '@dms/types';

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Actor identity stamped onto every mutation for audit. */
export interface Actor {
  id: string;
  name: string;
  role?: string;
}

// ─── State shape (§3.2) ───────────────────────────────────────────────────────

export interface VehiclesState {
  vehicles: Record<string, VehicleMaster>;      // key: vin
  ownerships: Record<string, VehicleOwnership>; // key: id
  claims: Record<string, OwnershipClaim>;       // key: id
  events: OwnershipChangeEvent[];               // append-only
  /** SalesEvent append-only log, keyed by VIN. PLAN-VEHICLES-003 P2. */
  salesEvents: Record<string, SalesEvent[]>;    // key: vin
  // ── P3: Documents state (PLAN-VEHICLES-003 §3.1, L31) ─────────────────────
  /** All document entities keyed by docId. Includes superseded + soft-deleted. */
  documents: Record<string, Document>;
  /** Staff-only metadata sibling, keyed by docId (L9). */
  staffMeta: Record<string, StaffDocumentMetadata>;
  /** Append-only DocumentAccessEvent log (L3, L33). */
  documentAccessEvents: DocumentAccessEvent[];
  // ── P4: Runtime cost-ledger entries (SPEC-CUSTOM-BUILDS-001 L9 / L39) ─────
  /**
   * Runtime cost-ledger entries keyed by VIN. Written by custom-builds-store
   * on deliverJob. Merged with fixture entries in VehicleDetailView (L40).
   */
  costLedger: Record<string, CostLedgerEntry[]>;
  // Indices maintained on mutation — not persisted
  ownershipIdByVin: Record<string, string[]>;
  claimIdByVin: Record<string, string[]>;
  ownershipIdByCustomer: Record<string, string[]>;
  hydrated: boolean;
}

// ─── Action signatures (§3.3) ─────────────────────────────────────────────────

export interface VehicleActions {
  /**
   * Upsert a VehicleMaster. VIN is normalized before writing.
   * If the vehicle already exists, mutable fields (color, km, etc.) are merged.
   */
  upsertVehicle(
    input: Omit<VehicleMaster, 'schemaVersion'>,
    actor: Actor,
  ): { vin: string; created: boolean };

  /**
   * Update odometer reading — only applies if `at > lastKnownKmAt`.
   */
  updateVehicleKm(vin: string, km: number, at: string, actor: Actor): void;

  /** Link this VIN to an inventory vehicle record. */
  linkInventoryVehicle(vin: string, inventoryVin: string): void;
}

export interface OwnershipActions {
  /**
   * Open a new ownership row.
   * Preconditions:
   *   - VIN must exist in vehicles map
   *   - No ACTIVE row unless isJoint: true on BOTH new + existing AND total ≤ 2
   * Emits OPEN event.
   */
  openOwnership(
    input: {
      vin: string;
      customerId: string;
      source: VehicleTouchSource;
      isJoint?: boolean;
      fromAt?: string;
      kmAtOpen: number;
      linkedSalesOrderId?: string;
      linkedJobCardId?: string;
    },
    actor: Actor,
  ): string; // ownershipId

  /**
   * Close an existing ownership row.
   * Sets state to TRANSFERRED or REVOKED depending on reason.
   * Computes graceUntilAt = toAt + 7d for revoke paths.
   * kmStale = true if last JC is > 90 days old.
   */
  closeOwnership(
    id: string,
    opts: {
      kmAtClose?: number;
      reason: CloseReason;
      toAt?: string;
    },
    actor: Actor,
  ): void;

  /**
   * Transfer ownership atomically — single immer transaction.
   * Discovers all ACTIVE rows inside set(), closes them, opens new row(s).
   * Input shape is locked per spec §3.3.
   *
   * §7.1 transfer-first ordering: the sales UI calls this BEFORE marking the
   * SalesOrder complete. Only if this succeeds does the SO proceed. This action
   * is side-effect free on failure — immer ensures no partial mutations.
   *
   * @returns { closedIds, openedIds } — openedIds is length 1 or 2 (joint)
   */
  transferOwnership(
    input: {
      vin: string;
      toCustomerId: string;
      joint?: { withCustomerId: string };
      source: 'BN_SALE' | 'BN_CONSIGNMENT';
      kmAtClose: number;
      kmAtOpen: number;
      linkedSalesOrderId?: string;
      /**
       * Override the close reason stamped on every discovered ACTIVE row.
       * Defaults to 'BN_SALE_TRANSFER' when omitted.
       * PLAN-VEHICLES-002 §A (L8: same reason for ALL discovered ACTIVE rows).
       */
      closeReason?: CloseReason;
    },
    actor: Actor,
  ): { closedIds: string[]; openedIds: string[] };

  /** R09+ — manual revoke with 7-day grace. */
  manualRevoke(id: string, reason: CloseReason, actor: Actor): void;

  /**
   * Portal self-revoke. Only the row with `id` is affected (D16: joint peer
   * is untouched). 7-day grace applied.
   */
  selfRevoke(
    id: string,
    reason: CloseReason,
    actor: Actor,
    options?: { newOwnerHint?: { name: string; phone: string } },
  ): void;

  /**
   * R19+ DPDP erasure. Immediate revoke + anonymize (no grace, no retention).
   * Calls anonymizeRow(id, actor) directly.
   */
  forceRevoke(id: string, reason: 'ERASURE_REQUEST', actor: Actor): void;

  /**
   * R09+ restore from REVOKED. Resurrects same row:
   * toAt=undefined, state=ACTIVE, graceUntilAt=undefined, closeReason=undefined,
   * closedBy=undefined, closedAt=undefined.
   * Emits RESTORE event with payload { priorCloseReason }.
   */
  restoreOwnership(id: string, reason: string, actor: Actor): void;

  /** R09+ — add a joint owner to an existing ACTIVE row (caps at 2 total). */
  addJointOwner(existingId: string, newCustomerId: string, actor: Actor): void;

  /** R12+ — Form 31 deceased transfer. */
  approveForm31Transfer(
    vin: string,
    heirCustomerId: string,
    scanUrl: string,
    actor: Actor,
  ): void;

  /**
   * Production-safe anonymization. Replaces customerId with 'anon-{N}'.
   * Emits ANONYMIZE event. Called by forceRevoke and runAnonymizationSweep.
   */
  anonymizeRow(id: string, actor: Actor): void;

  /** Internal — sets piiRetentionUntil = toAt + 2555d on close. */
  scheduleAnonymization(id: string): void;

  /**
   * Dev-only walker. Iterates ownerships with piiRetentionUntil <= now
   * and calls anonymizeRow for each. Not called in production paths.
   */
  runAnonymizationSweep(now: string): void;
}

export interface ClaimActions {
  /**
   * Submit a portal claim. VIN normalized at entry.
   *
   * - Duplicate guard: if (vin, claimantCustomerId) already has PENDING →
   *   returns { claimId: existing, autoApproved: false, duplicate: true }
   * - autoMatchHit=true: state=AUTO_APPROVED, calls openOwnership immediately
   * - autoMatchHit=false: state=PENDING; sets overlapsClaimId/overlapsOwnershipId
   *
   * Emits CLAIM_SUBMIT.
   */
  submitClaim(
    input: {
      vin: string;
      claimantCustomerId: string;
      rcScanUrl?: string;
      identityProofScanUrl?: string;
      autoMatchHit: boolean;
      matchedEntityId?: string;
    },
    actor: Actor,
  ): {
    claimId: string;
    autoApproved: boolean;
    overlapsClaimId?: string;
    overlapsOwnershipId?: string;
    duplicate?: boolean;
  };

  /**
   * R09+ approve claim. Single immer transaction:
   * if overlapsOwnershipId: close all ACTIVE rows + open new; else openOwnership.
   * Emits CLAIM_APPROVE.
   */
  approveClaim(claimId: string, actor: Actor): { ownershipIds: string[] };

  /** Reject a claim. Emits CLAIM_REJECT. */
  rejectClaim(claimId: string, category: RejectionReason, actor: Actor): void;
}

export interface EventActions {
  /** Append-only event emitter. Only exported method on event-slice. */
  appendEvent(
    kind: OwnershipChangeEvent['kind'],
    payload: Record<string, unknown>,
    actor: Actor,
    refs?: { ownershipId?: string; claimId?: string; vin?: string },
  ): void;

  /**
   * Convenience wrapper for PDF export audit events.
   * Used by the portal PDF export flow.
   */
  logPdfExport(vin: string, customerId: string, actor: Actor): void;
}

export interface QueryActions {
  /** ACTIVE + ACTIVE_JOINT rows only, derived via effectiveState. */
  selectCurrentOwnerships(state: VehiclesState, vin: string): VehicleOwnership[];

  /** Customer IDs of current active owners. */
  selectCurrentOwnerIds(state: VehiclesState, vin: string): string[];

  /**
   * Merged chronological timeline of ownership rows + events for a VIN.
   * Perf budget: ≤ 20ms for 100 events (S-V-15).
   */
  selectOwnershipTimeline(
    state: VehiclesState,
    vin: string,
  ): Array<VehicleOwnership | OwnershipChangeEvent>;

  /**
   * All ownership rows for a customer. Single canonical signature shared
   * by staff AND portal adapter (§3.3).
   */
  selectVehiclesByCustomer(
    state: VehiclesState,
    customerId: string,
    opts: { includeGrace: boolean; now: string },
  ): VehicleOwnership[];

  /** Portal "My Claims" list. */
  selectClaimsByCustomer(state: VehiclesState, customerId: string): OwnershipClaim[];

  /** Pending claims — city-scoped for R05-R10. */
  selectPendingClaims(
    state: VehiclesState,
    opts: { outletId?: string },
  ): OwnershipClaim[];

  /** Dev panel — rows whose piiRetentionUntil <= now. */
  selectAnonymizationDue(state: VehiclesState, now: string): VehicleOwnership[];
}

// ─── CostLedgerActions (SPEC-CUSTOM-BUILDS-001 P4, L39) ──────────────────────

export interface CostLedgerActions {
  /**
   * Append cost-ledger entries for a VIN. Written by custom-builds-store
   * on deliverJob (L9). Idempotent: entries with a duplicate id are silently
   * skipped (no double-write on repeated deliverJob calls).
   *
   * L39: single owner of the ledger is vehicles-store.
   */
  addCostLedgerEntries(vin: string, entries: CostLedgerEntry[]): void;

  /**
   * Return all runtime cost-ledger entries for a VIN (empty array if none).
   * Callers merge with fixture entries and dedupe by id (L40).
   */
  selectCostLedgerEntries(vin: string): CostLedgerEntry[];
}

// ─── SalesEventsActions (PLAN-VEHICLES-003 P2) ───────────────────────────────

export interface SalesEventsActions {
  /**
   * Validate + append a SalesEvent for the given VIN.
   * Throws PayloadValidationError on bad payload (L28).
   * Throws SellerSignaturesIncomplete if SOLD without all signatures and no override.
   * Side-effect: LISTED sets vehicles[vin].listedAt (L39).
   */
  emitSalesEvent(
    vin: string,
    kind: SalesEventKind,
    payload: unknown,
    actor: Actor,
  ): void;

  /** Returns all SalesEvents for a VIN (empty array if none). */
  selectSalesEvents(vin: string): SalesEvent[];

  /**
   * Bulk-seed SalesEvents from fixtures / hydrator.
   * Called by VehiclesStoreHydrator after Phase A+B hydration.
   */
  hydrateSalesEvents(seed: SalesEvent[]): void;

  /**
   * R10+ gate — apply a suggested price drop.
   * Emits PRICE_CHANGED SalesEvent via existing emitSalesEvent.
   *
   * SPEC-INVENTORY-AGING-001:
   *   L6: throws InsufficientRoleError if actor.role not in allowed R10+ set.
   *   L11: payload includes { previousPrice, newPrice, reason, source: 'AGING_SUGGESTION' }.
   */
  applySuggestedPriceDrop(
    vin: string,
    newPrice: number,
    reason: string,
    actor: Actor,
  ): void;
}

// ─── Combined store type ──────────────────────────────────────────────────────

// Forward-declare the docs action types imported from slices at store composition time
// (avoids circular imports — types.ts must remain a leaf file)
import type { DocsSelectors } from './slices/docs-slice';
import type { DocsMutations } from './slices/docs-mutations';

export type VehiclesActions = VehicleActions &
  OwnershipActions &
  ClaimActions &
  EventActions &
  QueryActions &
  SalesEventsActions &
  DocsSelectors &
  DocsMutations &
  CostLedgerActions;

export type VehiclesStore = VehiclesState & VehiclesActions;

/**
 * Slice factory alias — every slice file exports a `create*Slice: VehiclesSlice<T>`.
 * The middleware tag instructs Zustand that `set` inside the slice receives an
 * immer draft.
 */
export type VehiclesSlice<T> = StateCreator<
  VehiclesStore,
  [['zustand/immer', never]],
  [],
  T
>;
