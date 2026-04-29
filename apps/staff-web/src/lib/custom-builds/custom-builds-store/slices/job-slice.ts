/**
 * Build Job slice — CRUD + state machine transitions.
 *
 * L10: Finance gate — APPROVED→PARTS_ORDERING throws FinanceApprovalRequiredError
 *      if quoteTotal > 200_000 and financeApprovalAt is not set.
 * L15: Always use hasRank; never inline string role comparisons.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §4, §14.2
 */

import {
  FinanceApprovalRequiredError,
  InvalidStageTransitionError,
  InsufficientRoleError,
  JobDeliveredImmutableError,
  JobAlreadyDeliveredError,
} from '@dms/types';
import type { BuildJobStage, BuildJobPartLine, VisualizerState, BuildActivityEventType } from '@dms/types';
import { canTransitionBuildJob, canActorTransition, hasRank } from '../../state-machine';
import type { BuildJobActions, CustomBuildsSlice, Actor } from '../types';
import { makeJobId, makeActivityId, nowIso, nowDate, makeId } from '../id-helpers';
import { computeGstBreakdown } from '../../gst-breakdown';
import { computeCustomizationCost } from '../../customization-catalog';
import { PAINT_BY_KEY } from '../../paint-palette';
// Cross-store write (SPEC-CUSTOM-BUILDS-001 L9 / PLAN-VEHICLES-003 L8):
// useVehiclesStore.getState() is the approved pattern for UI-layer cross-store calls.
// No subscription or event-bus — direct imperative call on deliverJob only.
import { useVehiclesStore } from '../../../vehicles/vehicles-store';

/** Generate a UUID v4 without external dependencies. */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const createJobSlice: CustomBuildsSlice<BuildJobActions> = (set, get) => ({
  createBuildJob(draft, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }

    const now = nowIso();
    const job = {
      id: makeJobId(),
      title: draft.title,
      stage: 'ENQUIRY' as BuildJobStage,
      customerId: draft.customerId,
      vin: draft.vin,
      outletId: draft.outletId,
      advisorId: draft.advisorId,
      enquiryNotes: draft.enquiryNotes,
      parts: [],
      marginPct: 15,
      activityLog: [],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      state.jobs.push(job);
    });

    // Append creation activity
    get()._appendActivity(job.id, 'job_created', actor);

    return job;
  },

  advanceStage(jobId, next, actor) {
    const jobs = get().jobs;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    const from = job.stage;

    // State machine guard
    if (!canTransitionBuildJob(from, next)) {
      throw new InvalidStageTransitionError(from, next);
    }

    // Role gate
    if (!canActorTransition(actor.role, from, next)) {
      const required = `required for ${from}→${next}`;
      throw new InsufficientRoleError(required, actor.role);
    }

    // Finance gate (L10): APPROVED → PARTS_ORDERING
    if (from === 'APPROVED' && next === 'PARTS_ORDERING') {
      if ((job.quoteTotal ?? 0) > 200_000 && !job.financeApprovalAt) {
        throw new FinanceApprovalRequiredError(jobId);
      }
    }

    const now = nowIso();

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.stage = next;
      j.updatedAt = now;
      if (next === 'DELIVERED') j.deliveredAt = now;
    });

    const type: BuildActivityEventType =
      next === 'DELIVERED'
        ? 'job_delivered'
        : next === 'QC_FAILED'
          ? 'qc_failed'
          : 'stage_advanced';

    get()._appendActivity(jobId, type, actor, undefined, { from, to: next });
  },

  cancelJob(jobId, reason, actor) {
    if (!hasRank(actor.role, 'R19')) {
      throw new InsufficientRoleError('R19', actor.role);
    }

    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);
    if (job.stage === 'DELIVERED' || job.stage === 'CANCELLED') {
      throw new Error(`Cannot cancel job in terminal stage ${job.stage}`);
    }

    const now = nowIso();

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.stage = 'CANCELLED';
      j.cancelReason = reason;
      j.cancelledAt = now;
      j.cancelledBy = actor.id;
      j.updatedAt = now;
    });

    get()._appendActivity(jobId, 'job_cancelled', actor, reason);
  },

  assignVendor(jobId, vendorId, actor) {
    if (!hasRank(actor.role, 'R10')) {
      throw new InsufficientRoleError('R10', actor.role);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.vendorId = vendorId;
      j.updatedAt = nowIso();
    });
  },

  addPart(jobId, line, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }

    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    // Locked after APPROVED
    const lockedStages: BuildJobStage[] = [
      'APPROVED', 'PARTS_ORDERING', 'IN_PROGRESS', 'QC', 'QC_FAILED', 'DELIVERED',
    ];
    if (lockedStages.includes(job.stage)) {
      throw new Error(`Cannot add parts to job in stage ${job.stage}`);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      // Upsert: if SKU exists, replace it
      const idx = j.parts.findIndex((p) => p.partSku === line.partSku);
      if (idx >= 0) {
        j.parts[idx] = line;
      } else {
        j.parts.push(line);
      }
      j.updatedAt = nowIso();
    });
  },

  removePart(jobId, partSku, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }

    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    const lockedStages: BuildJobStage[] = [
      'APPROVED', 'PARTS_ORDERING', 'IN_PROGRESS', 'QC', 'QC_FAILED', 'DELIVERED',
    ];
    if (lockedStages.includes(job.stage)) {
      throw new Error(`Cannot remove parts from job in stage ${job.stage}`);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.parts = j.parts.filter((p) => p.partSku !== partSku);
      j.updatedAt = nowIso();
    });
  },

  approveFinance(jobId, actor) {
    if (!hasRank(actor.role, 'R12')) {
      throw new InsufficientRoleError('R12', actor.role);
    }

    const now = nowIso();

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.financeApprovalAt = now;
      j.financeApprovedBy = actor.id;
      j.updatedAt = now;
    });

    get()._appendActivity(jobId, 'finance_approved', actor);
  },

  saveVisualizerState(jobId, vizState, actor) {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);
    if (job.stage === 'DELIVERED') {
      throw new JobDeliveredImmutableError(jobId);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.visualizerState = vizState;
      j.updatedAt = nowIso();
    });
  },

  updatePartLine(jobId, partSku, patch, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }

    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    const lockedStages: BuildJobStage[] = [
      'APPROVED', 'PARTS_ORDERING', 'IN_PROGRESS', 'QC', 'QC_FAILED', 'DELIVERED',
    ];
    if (lockedStages.includes(job.stage)) {
      throw new Error(`Cannot edit parts on job in stage ${job.stage}`);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      const line = j.parts.find((p) => p.partSku === partSku);
      if (!line) return;
      if (patch.qty !== undefined) line.qty = patch.qty;
      if (patch.notes !== undefined) (line as Record<string, unknown>).notes = patch.notes;
      j.updatedAt = nowIso();
    });
  },

  addActivityNote(jobId, note, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }
    get()._appendActivity(jobId, 'note_added', actor, note);
  },

  updateSchedule(jobId, patch, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      if (patch.estimatedStartDate !== undefined) j.estimatedStartDate = patch.estimatedStartDate;
      if (patch.estimatedCompletionDate !== undefined) j.estimatedCompletionDate = patch.estimatedCompletionDate;
      if (patch.vendorNotes !== undefined) j.vendorNotes = patch.vendorNotes;
      if (patch.vendorConfirmationStatus !== undefined) j.vendorConfirmationStatus = patch.vendorConfirmationStatus;
      j.updatedAt = nowIso();
    });

    get()._appendActivity(jobId, 'note_added', actor, 'Schedule updated');
  },

  updateJobDetails(jobId, patch, actor) {
    if (!hasRank(actor.role, 'R10')) {
      throw new InsufficientRoleError('R10', actor.role);
    }

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      if (patch.title !== undefined) j.title = patch.title;
      if (patch.enquiryNotes !== undefined) j.enquiryNotes = patch.enquiryNotes;
      if (patch.targetCompletionDate !== undefined) {
        (j as Record<string, unknown>).targetCompletionDate = patch.targetCompletionDate;
      }
      j.updatedAt = nowIso();
    });
  },

  saveQuote(jobId, marginPct, actor) {
    if (!hasRank(actor.role, 'R09')) {
      throw new InsufficientRoleError('R09', actor.role);
    }

    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    const partsSubtotal = job.parts.reduce((s, p) => s + p.unitCost * p.qty, 0);
    const totalInstallHours = job.parts.reduce((s, p) => s + p.installHours * p.qty, 0);

    // vendorLabour: caller must pass dayRate via vendor lookup on UI side;
    // here we compute from the store's vendor list.
    const vendor = get().vendors.find((v) => v.id === job.vendorId);
    const vendorLabour = vendor ? Math.round((totalInstallHours / 8) * vendor.dayRate) : 0;

    const breakdown = computeGstBreakdown({
      partsSubtotal,
      partsListPriceSum: partsSubtotal, // bnCost used for quote total; listPrice shown on PDF
      vendorLabour,
      marginPct,
    });

    const token = uuidv4();
    const now = nowIso();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.quoteToken = token;
      j.quoteCreatedAt = now;
      j.quoteExpiresAt = expiresAt;
      j.quoteTotal = Math.round(breakdown.total);
      j.marginPct = marginPct;
      j.updatedAt = now;
    });

    get()._appendActivity(jobId, 'quote_saved', actor);

    const shareUrl = `/custom-builds/preview/${token}`;
    return { token, shareUrl, total: Math.round(breakdown.total) };
  },

  applyMarginAdjustment(jobId, newMarginPct, actor) {
    if (!hasRank(actor.role, 'R10')) {
      throw new InsufficientRoleError('R10', actor.role);
    }

    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.marginPct = newMarginPct;
      j.updatedAt = nowIso();
    });
  },

  /**
   * DELIVERED transition + cost-ledger write-back.
   *
   * SPEC-CUSTOM-BUILDS-001 L9/L10/L39:
   * - Finance gate: quoteTotal > 2L requires financeApprovalAt.
   * - Writes 3 cost-ledger entries to vehicles-store (parts, labour+GST, BN margin).
   * - Idempotent via costLedgerWriteRef — second call on same job is a no-op.
   * - Throws JobAlreadyDeliveredError if already DELIVERED.
   */
  deliverJob(jobId, actor) {
    if (!hasRank(actor.role, 'R10')) {
      throw new InsufficientRoleError('R10', actor.role);
    }

    const jobs = get().jobs;
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new Error(`BuildJob ${jobId} not found`);

    // Already delivered — idempotency guard (L39)
    if (job.stage === 'DELIVERED') {
      throw new JobAlreadyDeliveredError(jobId);
    }

    // Job must be in QC stage (only valid pre-DELIVERED stage)
    if (job.stage !== 'QC') {
      throw new InvalidStageTransitionError(job.stage, 'DELIVERED');
    }

    // Finance gate (L10) — independent of advanceStage, checked here too
    if ((job.quoteTotal ?? 0) > 200_000 && !job.financeApprovalAt) {
      throw new FinanceApprovalRequiredError(jobId);
    }

    // Idempotency: if costLedgerWriteRef already set, ledger entries were
    // already written on a prior call — skip the write (L39)
    if (job.costLedgerWriteRef) {
      // Still advance stage if somehow in QC (shouldn't happen with guard above,
      // but be safe). In practice this branch is unreachable: the stage===DELIVERED
      // guard above catches it first. Guard stays for defence-in-depth.
      return;
    }

    // Compute GST breakdown from job parts + vendor
    const partsSubtotal = job.parts.reduce((s, p) => s + p.unitCost * p.qty, 0);
    const totalInstallHours = job.parts.reduce((s, p) => s + p.installHours * p.qty, 0);
    const vendor = get().vendors.find((v) => v.id === job.vendorId);
    const vendorLabour = vendor ? Math.round((totalInstallHours / 8) * vendor.dayRate) : 0;
    const marginPct = job.marginPct ?? 15;
    const vendorName = vendor?.name ?? 'vendor';

    const breakdown = computeGstBreakdown({
      partsSubtotal,
      partsListPriceSum: partsSubtotal,
      vendorLabour,
      marginPct,
    });

    const now = nowIso();
    const today = nowDate();

    // §38 L95: Compute customization costs from visualizer state (if present).
    // These are separate from the parts-cost (which covers OEM/aftermarket catalog parts).
    const vizCustomizations = job.visualizerState?.customizations;
    // paintKey is stored as open-shape field on visualizerState (L93)
    const paintKey = (job.visualizerState as Record<string, unknown> | undefined)?.paintKey as string | undefined;
    const paintPrice = paintKey ? (PAINT_BY_KEY[paintKey]?.listPrice ?? 0) : 0;

    const customizationTotal: number = vizCustomizations
      ? computeCustomizationCost({
          paintPrice,
          wheelOptionId: vizCustomizations.wheelOptionId,
          tintOptionId: vizCustomizations.tintOptionId,
          exhaustOptionId: vizCustomizations.exhaustOptionId,
          suspensionOptionId: vizCustomizations.suspensionOptionId,
          hoodOptionId: vizCustomizations.hoodOptionId,
          wingOptionId: vizCustomizations.wingOptionId,
          decalCount: vizCustomizations.decals?.length ?? 0,
        }).total
      : 0;

    // Build the 3 core ledger entries
    const entry1Id = makeId('CLE-CB-P-');
    const entry2Id = makeId('CLE-CB-L-');
    const entry3Id = makeId('CLE-CB-F-');

    const entries: {
      id: string;
      vin: string;
      category: 'custom-build-parts' | 'custom-build-labour' | 'custom-build-vendor-fee' | 'custom-build-customizations';
      date: string;
      amount: number;
      note: string;
      addedBy: string;
      addedAt: string;
    }[] = [
      {
        id: entry1Id,
        vin: job.vin,
        category: 'custom-build-parts',
        date: today,
        amount: Math.round(breakdown.partsCostBN),
        note: `Custom build parts: ${job.title}`,
        addedBy: actor.id,
        addedAt: now,
      },
      {
        id: entry2Id,
        vin: job.vin,
        category: 'custom-build-labour',
        date: today,
        amount: Math.round(breakdown.vendorLabour + breakdown.gstOnLabour),
        note: `Vendor labour + GST: ${vendorName}`,
        addedBy: actor.id,
        addedAt: now,
      },
      {
        id: entry3Id,
        vin: job.vin,
        category: 'custom-build-vendor-fee',
        date: today,
        amount: Math.round(breakdown.bnMargin),
        note: `BN margin on build ${job.id}`,
        addedBy: actor.id,
        addedAt: now,
      },
    ];

    // §38 L95: 4th entry for visualizer customizations (when present and non-zero)
    const entry4Id = customizationTotal > 0 ? makeId('CLE-CB-C-') : null;
    if (entry4Id && customizationTotal > 0) {
      entries.push({
        id: entry4Id,
        vin: job.vin,
        category: 'custom-build-customizations',
        date: today,
        amount: customizationTotal,
        note: `Visualizer customizations (paint + wheels + tint + exhaust + suspension + hood + wing): ${job.title}`,
        addedBy: actor.id,
        addedAt: now,
      });
    }

    const allEntryIds = entry4Id
      ? [entry1Id, entry2Id, entry3Id, entry4Id]
      : [entry1Id, entry2Id, entry3Id];

    // Write to vehicles-store (cross-store call per PLAN-VEHICLES-003 L8 pattern)
    useVehiclesStore.getState().addCostLedgerEntries(job.vin, entries);

    // Advance stage + persist write ref
    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.stage = 'DELIVERED';
      j.deliveredAt = now;
      j.updatedAt = now;
      j.costLedgerWriteRef = {
        writtenAt: now,
        entryIds: allEntryIds,
      };
    });

    get()._appendActivity(jobId, 'job_delivered', actor, undefined, {
      from: 'QC',
      to: 'DELIVERED',
      ledgerEntries: allEntryIds,
    });
  },

  _appendActivity(jobId, type, actor, note, metadata) {
    const entry = {
      id: makeActivityId(),
      at: nowIso(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      type,
      note,
      metadata,
    };

    set((state) => {
      const j = state.jobs.find((x) => x.id === jobId);
      if (!j) return;
      j.activityLog.push(entry);
      j.updatedAt = entry.at;
    });
  },
});
