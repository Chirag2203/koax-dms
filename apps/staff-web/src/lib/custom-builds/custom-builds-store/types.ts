/**
 * Custom Builds store — shared type definitions.
 *
 * LEAF file: imports only from @dms/types and zustand. No slice imports.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §14 (store contract)
 */

import type { StateCreator } from 'zustand';
import type {
  BuildJob,
  BuildJobStage,
  BuildJobPartLine,
  CustomBuildPart,
  CustomBuildVendor,
  VisualizerState,
  BuildActivityEventType,
} from '@dms/types';

// ─── Actor ────────────────────────────────────────────────────────────────────

export interface Actor {
  id: string;
  name: string;
  role: string;
}

// ─── State shape (§14.1) ──────────────────────────────────────────────────────

export interface CustomBuildsState {
  jobs: BuildJob[];
  parts: CustomBuildPart[];
  vendors: CustomBuildVendor[];
  hydrated: boolean;
}

// ─── Action signatures (§14.2) ────────────────────────────────────────────────

export interface BuildJobActions {
  /**
   * Create a new ENQUIRY-stage BuildJob. R09+.
   */
  createBuildJob(
    draft: {
      title: string;
      customerId: string;
      vin: string;
      outletId: string;
      advisorId?: string;
      enquiryNotes?: string;
    },
    actor: Actor,
  ): BuildJob;

  /**
   * Advance stage. Runs transition guard + finance gate (L10).
   * R10+ guard checked per transition table.
   * Throws InvalidStageTransitionError on invalid transition.
   * Throws InsufficientRoleError on role gate failure.
   * Throws FinanceApprovalRequiredError for APPROVED→PARTS_ORDERING with quoteTotal > 2L.
   */
  advanceStage(jobId: string, next: BuildJobStage, actor: Actor): void;

  /**
   * Cancel a job. R19+ only. Type-to-confirm in UI.
   */
  cancelJob(jobId: string, reason: string, actor: Actor): void;

  /**
   * Assign vendor to job. R10+.
   */
  assignVendor(jobId: string, vendorId: string, actor: Actor): void;

  /**
   * Add a part line to the job. R09+. Locked after APPROVED.
   */
  addPart(jobId: string, line: BuildJobPartLine, actor: Actor): void;

  /**
   * Remove a part line from the job by SKU. R09+. Locked after APPROVED.
   */
  removePart(jobId: string, partSku: string, actor: Actor): void;

  /**
   * Set financeApprovalAt for the job. R12+.
   */
  approveFinance(jobId: string, actor: Actor): void;

  /**
   * Save visualizer state. Throws JobDeliveredImmutableError if DELIVERED.
   */
  saveVisualizerState(jobId: string, state: VisualizerState, actor: Actor): void;

  /**
   * Update a part line's quantity and/or notes. R09+. Locked after APPROVED.
   */
  updatePartLine(
    jobId: string,
    partSku: string,
    patch: { qty?: number; notes?: string },
    actor: Actor,
  ): void;

  /**
   * Append a manual note to activity log. R09+.
   */
  addActivityNote(jobId: string, note: string, actor: Actor): void;

  /**
   * Update job schedule fields (start/completion dates, vendor notes). R09+.
   */
  updateSchedule(
    jobId: string,
    patch: {
      estimatedStartDate?: string;
      estimatedCompletionDate?: string;
      vendorNotes?: string;
      vendorConfirmationStatus?: 'pending' | 'confirmed' | 'revised';
    },
    actor: Actor,
  ): void;

  /**
   * Update job overview editable fields (title, description, targetCompletionDate). R10+.
   */
  updateJobDetails(
    jobId: string,
    patch: {
      title?: string;
      description?: string;
      targetCompletionDate?: string;
      enquiryNotes?: string;
    },
    actor: Actor,
  ): void;

  /**
   * Snapshot the current estimate, generate a quoteToken (UUID v4),
   * set quoteCreatedAt + quoteExpiresAt (+14d), persist quoteTotal.
   * Returns the share URL path. R09+.
   *
   * L25: Mutating parts after save creates a new revision; never edits
   * the saved quote in place.
   */
  saveQuote(jobId: string, marginPct: number, actor: Actor): { token: string; shareUrl: string; total: number };

  /**
   * Update marginPct on a BuildJob. R10+ gate.
   * L7/L17: Default is 15; adjustable by R10+.
   */
  applyMarginAdjustment(jobId: string, newMarginPct: number, actor: Actor): void;

  /**
   * DELIVERED transition + cost-ledger write-back (SPEC-CUSTOM-BUILDS-001 L9).
   * R10+.
   *
   * Writes 3 cost-ledger entries to vehicles-store:
   *   custom-build-parts      — partsSubtotal (BN cost of parts)
   *   custom-build-labour     — vendorLabour + gstOnLabour
   *   custom-build-vendor-fee — bnMargin
   *
   * Finance gate (L10): throws FinanceApprovalRequiredError if
   *   quoteTotal > 200_000 && financeApprovalAt is not set.
   *
   * Idempotent (L39): persists costLedgerWriteRef on the BuildJob.
   *   Calling deliverJob a second time is a no-op after first success.
   *
   * Throws JobAlreadyDeliveredError if job is already DELIVERED.
   */
  deliverJob(jobId: string, actor: Actor): void;

  /** Internal: append an activity event to a job. */
  _appendActivity(
    jobId: string,
    type: BuildActivityEventType,
    actor: Actor,
    note?: string,
    metadata?: Record<string, unknown>,
  ): void;
}

export interface BuildJobQueryActions {
  selectByCustomer(customerId: string): BuildJob[];
  selectByVin(vin: string): BuildJob[];
  selectByStage(stage: BuildJobStage): BuildJob[];
}

export interface VendorActions {
  /**
   * Create a vendor. R12+.
   */
  createVendor(input: Omit<CustomBuildVendor, 'id'>, actor: Actor): CustomBuildVendor;

  /**
   * Update a vendor. R12+.
   */
  updateVendor(id: string, patch: Partial<CustomBuildVendor>, actor: Actor): void;

  /**
   * Deactivate a vendor. R12+.
   */
  deactivateVendor(id: string, actor: Actor): void;
}

export interface PartsActions {
  /**
   * Hydrate the store with initial fixture data.
   * Called by the hydrator on first mount.
   */
  hydrate(
    jobs: BuildJob[],
    parts: CustomBuildPart[],
    vendors: CustomBuildVendor[],
  ): void;
}

// ─── Combined store type ──────────────────────────────────────────────────────

export type CustomBuildsActions = BuildJobActions &
  BuildJobQueryActions &
  VendorActions &
  PartsActions;

export type CustomBuildsStore = CustomBuildsState & CustomBuildsActions;

export type CustomBuildsSlice<T> = StateCreator<
  CustomBuildsStore,
  [['zustand/immer', never]],
  [],
  T
>;
