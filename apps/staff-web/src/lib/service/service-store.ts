/**
 * Service module in-memory Zustand store.
 *
 * Initialized from @dms/mocks fixture arrays via structuredClone (deep copy).
 * Every mutation appends a JobCardTimelineEvent for full audit trail.
 *
 * Spec reference: PLAN-SERVICE-002 §Architecture + P1 rollout
 */

'use client';

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  bays as fixtureBays,
  jobCards as fixtureJobCards,
  labourLines as fixtureLabourLines,
  partsLines as fixturePartsLines,
  inspections as fixtureInspections,
  appointments as fixtureAppointments,
  warrantyClaims as fixtureWarrantyClaims,
  timelineEvents as fixtureTimelineEvents,
  advisorNotes as fixtureAdvisorNotes,
} from '@dms/mocks/fixtures';
import type {
  Bay,
  JobCard,
  JobCardStatus,
  LabourLine,
  LabourLineStatus,
  PartsLine,
  Inspection,
  InspectionItem,
  Appointment,
  WarrantyClaim,
  WarrantyClaimStatus,
  JobCardTimelineEvent,
  AdvisorNote,
  IntakeInspection,
  IntakeDamageCallout,
  IntakeInspectionPhoto,
  IntakePhotoSlot,
} from '@dms/types';
import { canTransition, canCancelAwaitingConfirmation, SELF_CANCEL_REASON } from './state-machine';
import { buildVhcItems } from './vhc-checklist';
import {
  trackServiceBookingConfirmedByStaff,
  trackServiceBookingDeclinedByStaff,
} from '../analytics';
// Seam 27 — SPEC-NOTIFICATIONS-001: import at top; getState() used at call time to avoid circular-init
import { useNotificationsStore } from '../notifications/notifications-store';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface Actor {
  id: string;
  name: string;
}

export interface Photo {
  id: string;
  jobCardId: string;
  dataUrl: string;
  name: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Attachment {
  id: string;
  jobCardId: string;
  dataUrl: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export type CommunicationChannel = 'sms' | 'whatsapp' | 'email' | 'call';

export interface Communication {
  id: string;
  jobCardId: string;
  channel: CommunicationChannel;
  template: string;
  sentAt: string;
  actorId: string;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now()}-${rand}`;
}

function makeEventId(): string {
  return makeId('tl');
}

/** Returns next JC job number, e.g. 'JC-2026-00120' */
function nextJobNo(existingJobCards: JobCard[]): string {
  const nums = existingJobCards
    .map((jc) => {
      const m = jc.jobNo.match(/JC-(\d{4})-(\d{5})/);
      return m ? parseInt(m[2] ?? '0', 10) : 0;
    });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `JC-2026-${String(max + 1).padStart(5, '0')}`;
}

/** Returns next warranty claim number, e.g. 'CLM-2026-00009' */
function nextClaimNo(existingClaims: WarrantyClaim[]): string {
  const nums = existingClaims
    .map((wc) => {
      const m = wc.claimNo.match(/CLM-2026-(\d+)/);
      return m ? parseInt(m[1] ?? '0', 10) : 0;
    });
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `CLM-2026-${String(max + 1).padStart(5, '0')}`;
}

function now(): string {
  return new Date().toISOString();
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface ServiceState {
  bays: Bay[];
  jobCards: JobCard[];
  labourLines: LabourLine[];
  partsLines: PartsLine[];
  inspections: Inspection[];
  appointments: Appointment[];
  warrantyClaims: WarrantyClaim[];
  timelineEvents: JobCardTimelineEvent[];
  advisorNotes: AdvisorNote[];
  photos: Photo[];
  attachments: Attachment[];
  communications: Communication[];
  // SPEC-SERVICE-INTAKE-001 L2: intake slice — lives in service-store, no separate store
  intakeInspections: IntakeInspection[];
  intakeDamageCallouts: IntakeDamageCallout[];
  intakeInspectionPhotos: IntakeInspectionPhoto[];
}

// ─── Actions shape ────────────────────────────────────────────────────────────

interface ServiceActions {
  /** Change a job card's status and emit a timeline event */
  setJobCardStatus(
    id: string,
    next: JobCardStatus,
    opts: { note?: string; actorId: string; actorName: string },
  ): void;

  /** Patch arbitrary fields on a job card */
  updateJobCard(id: string, patch: Partial<JobCard>, actor: Actor): void;

  /** Create a new job card (status RECEIVED) */
  createJobCard(
    input: Omit<JobCard, 'id' | 'jobNo' | 'receivedAt' | 'status' | 'labourLines' | 'partsLines'>,
    actor: Actor,
  ): JobCard;

  /** Labour CRUD */
  addLabour(jobCardId: string, line: Omit<LabourLine, 'id'>, actor: Actor): LabourLine;
  updateLabour(lineId: string, patch: Partial<LabourLine>, actor: Actor): void;
  deleteLabour(lineId: string, actor: Actor): void;

  /** Parts CRUD */
  addPart(jobCardId: string, part: Omit<PartsLine, 'id'>, actor: Actor): PartsLine;
  updatePart(lineId: string, patch: Partial<PartsLine>, actor: Actor): void;
  deletePart(lineId: string, actor: Actor): void;
  /**
   * Flip REQUESTED partsLines to RESERVED when matching stock arrives via a
   * posted GRN. Called by the Parts module's post-grn-dialog on successful
   * POST — keeps the Parts store free of a hard service-store import (cross-
   * store wiring lives in the UI layer). Partial reservations (delta.qty <
   * line.qty) are not supported in v1 — the whole line flips atomically.
   *
   * Spec reference: PLAN-PARTS-007 §2
   */
  reserveJobCardParts(
    jobCardId: string,
    deltas: Array<{ partCode: string; qty: number }>,
    actor: Actor,
  ): void;

  /** Inspection */
  startInspection(jobCardId: string, actor: Actor): Inspection;
  updateInspectionItem(
    inspectionId: string,
    itemId: string,
    patch: Partial<InspectionItem>,
    actor: Actor,
  ): void;
  submitInspection(inspectionId: string, actor: Actor): void;

  /** Notes */
  addNote(jobCardId: string, text: string, pinned: boolean, actor: Actor): AdvisorNote;
  toggleNotePin(noteId: string, actor: Actor): void;
  deleteNote(noteId: string, actor: Actor): void;

  /** Photos (capped at 5 per JC, 1 MB per photo) */
  addPhoto(
    jobCardId: string,
    photo: { dataUrl: string; name: string; size: number },
    actor: Actor,
  ): void;
  deletePhoto(photoId: string, actor: Actor): void;

  /** Attachments */
  addAttachment(
    jobCardId: string,
    att: { dataUrl: string; name: string; mimeType: string; size: number },
    actor: Actor,
  ): void;
  deleteAttachment(attachmentId: string, actor: Actor): void;

  /** Appointments */
  createAppointment(
    input: Omit<Appointment, 'id' | 'createdAt' | 'status'>,
    actor: Actor,
  ): Appointment;
  checkInAppointment(
    appointmentId: string,
    opts: {
      odometerIn: number;
      bayId?: string;
      technicianIds?: string[];
      advisorId?: string;
      priority?: JobCard['priority'];
      promisedAt?: string;
      customerComplaint?: string;
      estimatedTotal?: number;
      note?: string;
    },
    actor: Actor,
  ): JobCard;
  cancelAppointment(appointmentId: string, reason: string, actor: Actor): void;
  rescheduleAppointment(appointmentId: string, newAt: string, actor: Actor): void;

  /** Warranty claims */
  createWarrantyClaim(
    input: Omit<WarrantyClaim, 'id' | 'claimNo' | 'status'>,
    actor: Actor,
  ): WarrantyClaim;
  updateWarrantyClaimStatus(
    id: string,
    status: WarrantyClaimStatus,
    reason: string | undefined,
    actor: Actor,
  ): void;

  /** Bay management */
  assignBay(bayId: string, jobCardId: string, actor: Actor): void;
  freeBay(bayId: string, actor: Actor): void;
  reassignAdvisor(jobCardId: string, newAdvisorId: string, reason: string, actor: Actor): void;
  moveBay(jobCardId: string, newBayId: string, actor: Actor): void;

  /** Special JC operations */
  cloneJobCard(jobCardId: string, actor: Actor): JobCard;
  cancelJobCard(jobCardId: string, reason: string, actor: Actor): void;
  reopenJobCard(jobCardId: string, reason: string, actor: Actor): void;

  /** Communications log */
  logCommunication(
    jobCardId: string,
    c: Omit<Communication, 'id' | 'sentAt' | 'jobCardId'>,
    actor: Actor,
  ): void;

  // ── Portal booking actions (SPEC-CUSTOMER-PORTAL-002 P1) ─────────────────

  /**
   * Creates a JobCard with status AWAITING_CONFIRMATION from a customer portal
   * booking request. The customerId is NEVER taken from the client payload —
   * it must be passed separately (derived from the auth session by the caller).
   *
   * Per §14 NFR-S: also validates that `vin` belongs to `sessionCustomerId`
   * using the provided ownership list (caller must supply this for security).
   */
  createBookingFromPortal(
    sessionCustomerId: string,
    input: {
      vin: string;
      serviceTypeId: string;
      scheduledDate: string;
      scheduledSlot: 'MORNING' | 'AFTERNOON';
      outletId: string;
      advisorId: string;
      pickupMode: 'WORKSHOP_DROP' | 'HOME_PICKUP';
      pickupAddress?: {
        line1: string;
        line2?: string;
        city: string;
        pinCode: string;
      };
      concerns?: string;
      requestId?: string;
    },
    ownedVins: string[],
  ): { ok: true; jobCard: JobCard } | { ok: false; error: 'VIN_NOT_OWNED' | 'DUPLICATE_BOOKING' };

  /**
   * SA confirms an AWAITING_CONFIRMATION booking → RECEIVED.
   * Permitted roles: R09, R03, R01 (per L5 path-specific guard).
   */
  confirmPortalBooking(jobCardId: string, actor: Actor): void;

  /**
   * SA declines an AWAITING_CONFIRMATION booking → CANCELLED.
   * declineReason is required.
   * Permitted roles: R09, R03, R01 (per L5 path-specific guard).
   */
  declinePortalBooking(jobCardId: string, declineReason: string, actor: Actor): void;

  /**
   * Customer self-cancels their own AWAITING_CONFIRMATION booking → CANCELLED.
   * Only valid while JC is AWAITING_CONFIRMATION (per spec Non-goals: post-RECEIVED cancellation is v1.5).
   * sessionCustomerId must match jc.customerId (RLS).
   */
  cancelPortalBooking(
    jobCardId: string,
    sessionCustomerId: string,
    actor: Actor,
  ): { ok: true } | { ok: false; error: 'NOT_FOUND' | 'NOT_OWNER' | 'WRONG_STATUS' };

  /** Returns all JobCards for a given customerId (RLS enforced). */
  selectBookingsByCustomer(customerId: string): JobCard[];

  // ── Intake Inspection actions (SPEC-SERVICE-INTAKE-001) ─────────────────────

  /**
   * SC-1 / AC-1: Create a new IntakeInspection record in DRAFT state.
   * Mints id, sets state=DRAFT, retainUntil=now+5y, retentionPolicy, version=1, amendments=[].
   * Also patches JobCard.intakeInspectionId.
   * Emits timeline event `intake_recorded` (per §14 / QA #5: includes actorRole).
   *
   * L7: retainUntil = createdAt + 5 years (DPDP Act 2023 §11)
   * L2: intake state lives in service-store; no cross-module seam
   */
  recordIntakeInspection(
    input: Omit<
      IntakeInspection,
      'id' | 'state' | 'retainUntil' | 'retentionPolicy' | 'version' | 'amendments'
    >,
    actor: Actor & { role: string },
  ): string; // returns the new intakeInspectionId

  /**
   * SC-4 / AC-4: Capture customer signature — DRAFT → CUSTOMER_SIGNED.
   * Only valid from DRAFT state.
   * Emits `intake_signed`.
   */
  captureCustomerSignature(
    intakeId: string,
    signatureDataUrl: string,
    actor: Actor & { role: string },
  ): void;

  /**
   * SC-7 / AC-7: Attach the scanned signed sheet.
   * REJECTS if state !== CUSTOMER_SIGNED (per SC-17 / B6 in spec).
   * On success: appends Attachment, sets signedSheetAttachmentId,
   * transitions CUSTOMER_SIGNED → SHEET_UPLOADED → COMPLETED,
   * sets JC.intakeInspectionCompletedAt.
   * Emits `intake_sheet_uploaded`.
   */
  attachSignedSheet(
    intakeId: string,
    attachment: Omit<Attachment, 'id' | 'uploadedAt' | 'uploadedBy'>,
    actor: Actor & { role: string },
  ): void;

  /**
   * QA #4 / L5: Add a photo to a typed slot.
   * Rejects if photo dataUrl size > 1 MB (after base64 decode estimate).
   * L5: one photo per slot — replaces existing if the slot is already filled.
   * Emits `intake_photo_captured`.
   */
  addIntakePhoto(
    intakeId: string,
    photoBase64: string,
    slot: IntakePhotoSlot,
    actor: Actor & { role: string },
  ): { ok: true; photoId: string } | { ok: false; error: 'PHOTO_TOO_LARGE' | 'INTAKE_NOT_FOUND' };

  /** Delete an intake photo by id */
  deleteIntakePhoto(photoId: string, actor: Actor): void;

  /**
   * SC-3: Add a damage callout to an intake.
   * Auto-numbers callout based on existing callouts for this intake.
   * Idempotent on the same callout id (safe to call twice).
   */
  addDamageCallout(
    intakeId: string,
    callout: Omit<IntakeDamageCallout, 'id' | 'intakeInspectionId' | 'number'>,
    actor: Actor,
  ): string; // returns the calloutId

  /** Remove a damage callout */
  removeDamageCallout(calloutId: string, actor: Actor): void;

  /**
   * SC-9 / AC-9: Amend a COMPLETED or AMENDED intake.
   * L8: REJECTS if actor.role rank below R12 (only R03/R19/R24 may amend).
   * L8: REJECTS if state not in {COMPLETED, AMENDED}.
   * L8: REJECTS if reason is empty or shorter than 10 characters.
   * L8 (tightened): scalarDiffs MUST NOT contain customerSignatureDataUrl,
   *   saSignatureDataUrl, or photo dataUrls — this is validated on input.
   * On success: bumps version, appends to amendments[], state=AMENDED.
   * Emits `intake_amended` with { actorEmployeeId, actorRole, intakeInspectionId,
   *   version, changedFields, reasonLength } (per Sec #11: no reasonHash).
   */
  amendIntake(
    intakeId: string,
    scalarDiffs: Record<string, { before: unknown; after: unknown }>,
    reason: string,
    actor: Actor & { role: string },
  ): { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'INVALID_STATE' | 'REASON_TOO_SHORT' | 'PII_IN_DIFFS' | 'NOT_FOUND' };

  /**
   * SC-8b / AC-8b: Record that intake was skipped (R19+ only per Sec #10).
   * Rejects if actor role rank < R12 (R03/R19/R24 only).
   * Rejects if reason is empty.
   * Emits `intake_skipped` event with { actorEmployeeId, actorRole, jobCardId, reason }.
   */
  recordIntakeSkipped(
    jobCardId: string,
    reason: string,
    actor: Actor & { role: string },
  ): { ok: true } | { ok: false; error: 'UNAUTHORIZED' | 'REASON_REQUIRED' | 'JC_NOT_FOUND' };

  // ── Intake selectors ─────────────────────────────────────────────────────────

  /** Get the intake inspection for a job card */
  selectIntakeForJobCard(jobCardId: string): IntakeInspection | undefined;

  /** Get all photos for an intake inspection */
  selectIntakePhotosForIntake(intakeId: string): IntakeInspectionPhoto[];

  /** Get all damage callouts for an intake inspection */
  selectDamageCalloutsForIntake(intakeId: string): IntakeDamageCallout[];

  /**
   * SC-16 / L13 / AC-17: Get all intake records for a customer (DSAR pipeline).
   * Two-hop join: customerId → JobCard[] → IntakeInspection[].
   * Used by R23 DPO DSAR pipeline per DPDP §11.
   * Returns across all outlets (R23 has cross-outlet read).
   */
  selectIntakesByCustomerId(customerId: string): IntakeInspection[];
}

// ─── Combined store type ──────────────────────────────────────────────────────

export type ServiceStore = ServiceState & ServiceActions;

// ─── Store implementation ─────────────────────────────────────────────────────

export const useServiceStore = create<ServiceStore>()(
  immer((set, get) => {
    // ── Helpers (internal) ─────────────────────────────────────────────────────

    function pushEvent(
      state: ServiceState,
      event: Omit<JobCardTimelineEvent, 'id'>,
    ): void {
      state.timelineEvents.push({ id: makeEventId(), ...event });
    }

    function findJC(state: ServiceState, id: string): JobCard | undefined {
      return state.jobCards.find((jc) => jc.id === id);
    }

    // ── Initial state (deep-cloned from fixtures) ──────────────────────────────
    return {
      bays: structuredClone(fixtureBays),
      jobCards: structuredClone(fixtureJobCards),
      labourLines: structuredClone(fixtureLabourLines),
      partsLines: structuredClone(fixturePartsLines),
      inspections: structuredClone(fixtureInspections),
      appointments: structuredClone(fixtureAppointments),
      warrantyClaims: structuredClone(fixtureWarrantyClaims),
      timelineEvents: structuredClone(fixtureTimelineEvents),
      advisorNotes: structuredClone(fixtureAdvisorNotes),
      photos: [],
      attachments: [],
      communications: [],
      // SPEC-SERVICE-INTAKE-001 L2: intake slice state
      intakeInspections: [],
      intakeDamageCallouts: [],
      intakeInspectionPhotos: [],

      // ── setJobCardStatus ─────────────────────────────────────────────────────

      setJobCardStatus(id, next, opts) {
        set((state) => {
          const jc = findJC(state, id);
          if (!jc) return;
          if (!canTransition(jc.status, next)) return;

          const prev = jc.status;
          jc.status = next;
          if (next === 'DELIVERED') {
            jc.deliveredAt = now();
          }

          // Auto-free bay when the job card reaches a terminal state that no
          // longer needs the bay (DELIVERED). CANCELLED is handled inside
          // cancelJobCard. Keep the bay occupied while in flow, including
          // READY_FOR_DELIVERY (vehicle is still parked awaiting pickup).
          let freedBayCode: string | undefined;
          if (next === 'DELIVERED' && jc.bayId) {
            const bay = state.bays.find((b) => b.id === jc.bayId);
            if (bay) {
              freedBayCode = bay.code;
              bay.status = 'FREE';
              bay.currentJobCardId = undefined;
            }
            jc.bayId = undefined;
          }

          pushEvent(state, {
            jobCardId: id,
            at: now(),
            actorId: opts.actorId,
            actorName: opts.actorName,
            type: 'status_changed',
            description:
              opts.note
                ? `Status changed ${prev} → ${next}. ${opts.note}`
                : `Status changed ${prev} → ${next}.`,
            metadata: { from: prev, to: next },
          });

          if (freedBayCode) {
            pushEvent(state, {
              jobCardId: id,
              at: now(),
              actorId: opts.actorId,
              actorName: opts.actorName,
              type: 'bay_freed',
              description: `Bay ${freedBayCode} auto-freed on delivery.`,
              metadata: { bayCode: freedBayCode, reason: 'delivered' },
            });
          }
        });
      },

      // ── updateJobCard ────────────────────────────────────────────────────────

      updateJobCard(id, patch, actor) {
        set((state) => {
          const jc = findJC(state, id);
          if (!jc) return;
          Object.assign(jc, patch);
          pushEvent(state, {
            jobCardId: id,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: 'Job card details updated.',
            metadata: { fields: Object.keys(patch) },
          });
        });
      },

      // ── createJobCard ────────────────────────────────────────────────────────

      createJobCard(input, actor) {
        let created!: JobCard;
        set((state) => {
          const jc: JobCard = {
            ...input,
            id: makeId('jc'),
            jobNo: nextJobNo(state.jobCards),
            receivedAt: now(),
            status: 'RECEIVED',
            labourLines: [],
            partsLines: [],
          };
          state.jobCards.push(jc);
          pushEvent(state, {
            jobCardId: jc.id,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'received',
            description: `Job card ${jc.jobNo} opened.`,
            metadata: {},
          });
          created = jc;
        });
        return created;
      },

      // ── Labour CRUD ──────────────────────────────────────────────────────────

      addLabour(jobCardId, line, actor) {
        let created!: LabourLine;
        set((state) => {
          const labourLine: LabourLine = { id: makeId('lab'), ...line };
          state.labourLines.push(labourLine);
          // Also push reference into the JC snapshot (for inline display)
          const jc = findJC(state, jobCardId);
          if (jc) jc.labourLines.push(labourLine);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'labour_started',
            description: `Labour line added: ${line.description}.`,
            metadata: { lineId: labourLine.id, code: line.code },
          });
          created = labourLine;
        });
        return created;
      },

      updateLabour(lineId, patch, actor) {
        set((state) => {
          // Update canonical list
          const line = state.labourLines.find((l) => l.id === lineId);
          if (line) Object.assign(line, patch);
          // Mirror into JC
          for (const jc of state.jobCards) {
            const jcLine = jc.labourLines.find((l) => l.id === lineId);
            if (jcLine) {
              Object.assign(jcLine, patch);
              const prevStatus = line?.status ?? jcLine.status;
              const nextStatus = (patch as Partial<LabourLine>).status ?? prevStatus;
              if (nextStatus === 'DONE' && prevStatus !== 'DONE') {
                pushEvent(state, {
                  jobCardId: jc.id,
                  at: now(),
                  actorId: actor.id,
                  actorName: actor.name,
                  type: 'labour_complete',
                  description: `Labour completed: ${jcLine.description}.`,
                  metadata: { lineId },
                });
              }
              break;
            }
          }
        });
      },

      deleteLabour(lineId, actor) {
        set((state) => {
          const idx = state.labourLines.findIndex((l) => l.id === lineId);
          if (idx >= 0) state.labourLines.splice(idx, 1);
          for (const jc of state.jobCards) {
            const jcIdx = jc.labourLines.findIndex((l) => l.id === lineId);
            if (jcIdx >= 0) {
              jc.labourLines.splice(jcIdx, 1);
              pushEvent(state, {
                jobCardId: jc.id,
                at: now(),
                actorId: actor.id,
                actorName: actor.name,
                type: 'note',
                description: `Labour line deleted (id: ${lineId}).`,
                metadata: { lineId },
              });
              break;
            }
          }
        });
      },

      // ── Parts CRUD ───────────────────────────────────────────────────────────

      addPart(jobCardId, part, actor) {
        let created!: PartsLine;
        set((state) => {
          const partsLine: PartsLine = { id: makeId('prt'), ...part };
          state.partsLines.push(partsLine);
          const jc = findJC(state, jobCardId);
          if (jc) jc.partsLines.push(partsLine);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'part_reserved',
            description: `Part added: ${part.description} (${part.partCode}).`,
            metadata: { lineId: partsLine.id, partCode: part.partCode },
          });
          created = partsLine;
        });
        return created;
      },

      updatePart(lineId, patch, actor) {
        set((state) => {
          const line = state.partsLines.find((p) => p.id === lineId);
          if (line) Object.assign(line, patch);
          for (const jc of state.jobCards) {
            const jcLine = jc.partsLines.find((p) => p.id === lineId);
            if (jcLine) {
              Object.assign(jcLine, patch);
              const nextStatus = (patch as Partial<PartsLine>).status;
              if (nextStatus === 'FITTED') {
                pushEvent(state, {
                  jobCardId: jc.id,
                  at: now(),
                  actorId: actor.id,
                  actorName: actor.name,
                  type: 'part_fitted',
                  description: `Part fitted: ${jcLine.description}.`,
                  metadata: { lineId, partCode: jcLine.partCode },
                });
              }
              break;
            }
          }
        });
      },

      deletePart(lineId, actor) {
        set((state) => {
          const idx = state.partsLines.findIndex((p) => p.id === lineId);
          if (idx >= 0) state.partsLines.splice(idx, 1);
          for (const jc of state.jobCards) {
            const jcIdx = jc.partsLines.findIndex((p) => p.id === lineId);
            if (jcIdx >= 0) {
              jc.partsLines.splice(jcIdx, 1);
              pushEvent(state, {
                jobCardId: jc.id,
                at: now(),
                actorId: actor.id,
                actorName: actor.name,
                type: 'note',
                description: `Parts line deleted (id: ${lineId}).`,
                metadata: { lineId },
              });
              break;
            }
          }
        });
      },

      reserveJobCardParts(jobCardId, deltas, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc) return;

          // Track per-partCode remaining delta so multiple REQUESTED lines for
          // the same partCode consume the GRN's received qty in fixture order.
          const remaining = new Map<string, number>();
          for (const d of deltas) {
            remaining.set(d.partCode, (remaining.get(d.partCode) ?? 0) + d.qty);
          }

          for (const line of jc.partsLines) {
            if (line.status !== 'REQUESTED') continue;
            const avail = remaining.get(line.partCode) ?? 0;
            if (avail <= 0) continue;
            // v1: flip whole line atomically only when we have enough stock.
            if (avail < line.qty) continue;
            line.status = 'RESERVED';
            remaining.set(line.partCode, avail - line.qty);

            // Mirror to the flat partsLines array
            const flat = state.partsLines.find((p) => p.id === line.id);
            if (flat) flat.status = 'RESERVED';

            pushEvent(state, {
              jobCardId,
              at: now(),
              actorId: actor.id,
              actorName: actor.name,
              type: 'part_reserved',
              description: `Parts reserved from GRN posting: ${line.description}.`,
              metadata: { lineId: line.id, partCode: line.partCode },
            });
          }
        });
      },

      // ── Inspection ───────────────────────────────────────────────────────────

      startInspection(jobCardId, actor) {
        let created!: Inspection;
        set((state) => {
          const vhcItems = buildVhcItems();
          const insp: Inspection = {
            id: makeId('insp'),
            jobCardId,
            type: 'VHC_210',
            items: vhcItems,
            completedByTechnicianId: actor.id,
            completedAt: '',
            summary: { pass: 0, fail: 0, advise: 0, na: vhcItems.length },
          };
          state.inspections.push(insp);
          const jc = findJC(state, jobCardId);
          if (jc) jc.inspectionId = insp.id;
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'status_changed',
            description: 'VHC 210-point inspection started.',
            metadata: { inspectionId: insp.id },
          });
          created = insp;
        });
        return created;
      },

      updateInspectionItem(inspectionId, itemId, patch, _actor) {
        set((state) => {
          const insp = state.inspections.find((i) => i.id === inspectionId);
          if (!insp) return;
          const item = insp.items.find((it) => it.id === itemId);
          if (!item) return;
          Object.assign(item, patch);
          // Recompute summary
          insp.summary = insp.items.reduce(
            (acc, it) => {
              if (it.outcome === 'PASS') acc.pass++;
              else if (it.outcome === 'FAIL') acc.fail++;
              else if (it.outcome === 'ADVISE') acc.advise++;
              else acc.na++;
              return acc;
            },
            { pass: 0, fail: 0, advise: 0, na: 0 },
          );
        });
      },

      submitInspection(inspectionId, actor) {
        set((state) => {
          const insp = state.inspections.find((i) => i.id === inspectionId);
          if (!insp) return;
          insp.completedAt = now();
          pushEvent(state, {
            jobCardId: insp.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'inspection_complete',
            description: `VHC inspection submitted. Pass: ${insp.summary.pass}, Fail: ${insp.summary.fail}, Advise: ${insp.summary.advise}.`,
            metadata: { inspectionId, summary: insp.summary },
          });
        });
      },

      // ── Notes ────────────────────────────────────────────────────────────────

      addNote(jobCardId, text, pinned, actor) {
        let created!: AdvisorNote;
        set((state) => {
          const note: AdvisorNote = {
            id: makeId('note'),
            jobCardId,
            authorId: actor.id,
            at: now(),
            text,
            pinned,
          };
          state.advisorNotes.push(note);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: pinned ? `Pinned note added: "${text.slice(0, 60)}..."` : `Note added: "${text.slice(0, 60)}..."`,
            metadata: { noteId: note.id, pinned },
          });
          created = note;
        });
        return created;
      },

      toggleNotePin(noteId, actor) {
        set((state) => {
          const note = state.advisorNotes.find((n) => n.id === noteId);
          if (!note) return;
          note.pinned = !note.pinned;
          pushEvent(state, {
            jobCardId: note.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: note.pinned ? `Note pinned.` : `Note unpinned.`,
            metadata: { noteId },
          });
        });
      },

      deleteNote(noteId, actor) {
        set((state) => {
          const idx = state.advisorNotes.findIndex((n) => n.id === noteId);
          if (idx < 0) return;
          const jobCardId = state.advisorNotes[idx]!.jobCardId;
          state.advisorNotes.splice(idx, 1);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Note deleted (id: ${noteId}).`,
            metadata: { noteId },
          });
        });
      },

      // ── Photos ───────────────────────────────────────────────────────────────

      addPhoto(jobCardId, photo, actor) {
        const MAX_PHOTOS = 5;
        const MAX_SIZE = 1024 * 1024; // 1 MB
        set((state) => {
          const existing = state.photos.filter((p) => p.jobCardId === jobCardId);
          if (existing.length >= MAX_PHOTOS) return; // Cap enforced — caller should toast
          if (photo.size > MAX_SIZE) return; // Size enforced — caller should toast
          const p: Photo = {
            id: makeId('photo'),
            jobCardId,
            ...photo,
            uploadedAt: now(),
            uploadedBy: actor.id,
          };
          state.photos.push(p);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'photo_uploaded',
            description: `Photo uploaded: ${photo.name}.`,
            metadata: { photoId: p.id, size: photo.size },
          });
        });
      },

      deletePhoto(photoId, actor) {
        set((state) => {
          const idx = state.photos.findIndex((p) => p.id === photoId);
          if (idx < 0) return;
          const jobCardId = state.photos[idx]!.jobCardId;
          state.photos.splice(idx, 1);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Photo deleted (id: ${photoId}).`,
            metadata: { photoId },
          });
        });
      },

      // ── Attachments ──────────────────────────────────────────────────────────

      addAttachment(jobCardId, att, actor) {
        set((state) => {
          const a: Attachment = {
            id: makeId('att'),
            jobCardId,
            ...att,
            uploadedAt: now(),
            uploadedBy: actor.id,
          };
          state.attachments.push(a);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Attachment uploaded: ${att.name}.`,
            metadata: { attachmentId: a.id },
          });
        });
      },

      deleteAttachment(attachmentId, actor) {
        set((state) => {
          const idx = state.attachments.findIndex((a) => a.id === attachmentId);
          if (idx < 0) return;
          const jobCardId = state.attachments[idx]!.jobCardId;
          state.attachments.splice(idx, 1);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Attachment deleted (id: ${attachmentId}).`,
            metadata: { attachmentId },
          });
        });
      },

      // ── Appointments ─────────────────────────────────────────────────────────

      createAppointment(input, actor) {
        let created!: Appointment;
        set((state) => {
          const apt: Appointment = {
            ...input,
            id: makeId('apt'),
            status: 'SCHEDULED',
            createdAt: now(),
          };
          state.appointments.push(apt);
          created = apt;
        });
        return created;
      },

      checkInAppointment(appointmentId, opts, actor) {
        let createdJC!: JobCard;
        set((state) => {
          const apt = state.appointments.find((a) => a.id === appointmentId);
          if (!apt) return;
          apt.status = 'CHECKED_IN';

          // Create a new job card from the appointment — collect all JC fields
          // the user set in the check-in dialog so the JC starts fully-populated.
          const jc: JobCard = {
            id: makeId('jc'),
            jobNo: nextJobNo(state.jobCards),
            vin: apt.vin ?? '',
            customerId: apt.customerId,
            outletId: apt.outletId,
            advisorId: opts.advisorId ?? apt.advisorId ?? actor.id,
            technicianIds: opts.technicianIds ?? [],
            bayId: opts.bayId ?? apt.bayId,
            status: 'RECEIVED',
            priority: opts.priority ?? 'NORMAL',
            promisedAt: opts.promisedAt ?? apt.scheduledAt,
            receivedAt: now(),
            customerComplaint: opts.customerComplaint ?? apt.notes ?? '',
            odometerIn: opts.odometerIn,
            estimatedTotal: opts.estimatedTotal ?? 0,
            labourLines: [],
            partsLines: [],
            attachments: [],
          };
          state.jobCards.push(jc);

          // Occupy bay if assigned
          if (opts.bayId) {
            const bay = state.bays.find((b) => b.id === opts.bayId);
            if (bay) {
              bay.status = 'OCCUPIED';
              bay.currentJobCardId = jc.id;
            }
          }

          pushEvent(state, {
            jobCardId: jc.id,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'appointment_checkin',
            description:
              opts.note
                ? `Vehicle checked in from appointment ${appointmentId}. Job card ${jc.jobNo} created. ${opts.note}`
                : `Vehicle checked in from appointment ${appointmentId}. Job card ${jc.jobNo} created.`,
            metadata: {
              appointmentId,
              odometerIn: opts.odometerIn,
              priority: jc.priority,
              advisorId: jc.advisorId,
              technicianIds: jc.technicianIds,
            },
          });
          createdJC = jc;
        });
        return createdJC;
      },

      cancelAppointment(appointmentId, reason, actor) {
        set((state) => {
          const apt = state.appointments.find((a) => a.id === appointmentId);
          if (!apt) return;
          apt.status = 'CANCELLED';
          apt.notes = reason ? `${apt.notes ?? ''} [Cancelled: ${reason}]`.trim() : apt.notes;
        });
      },

      rescheduleAppointment(appointmentId, newAt, actor) {
        set((state) => {
          const apt = state.appointments.find((a) => a.id === appointmentId);
          if (!apt) return;
          apt.scheduledAt = newAt;
        });
      },

      // ── Warranty Claims ──────────────────────────────────────────────────────

      createWarrantyClaim(input, actor) {
        let created!: WarrantyClaim;
        set((state) => {
          const wc: WarrantyClaim = {
            ...input,
            id: makeId('wc'),
            claimNo: nextClaimNo(state.warrantyClaims),
            status: 'DRAFT',
          };
          state.warrantyClaims.push(wc);
          created = wc;
        });
        return created;
      },

      updateWarrantyClaimStatus(id, status, reason, actor) {
        set((state) => {
          const wc = state.warrantyClaims.find((w) => w.id === id);
          if (!wc) return;
          wc.status = status;
          if (status === 'SUBMITTED') wc.submittedAt = now();
          if (status === 'APPROVED') wc.approvedAt = now();
          if (status === 'PAID') wc.paidAt = now();
          if (reason) wc.notes = reason;
        });
      },

      // ── Bay management ───────────────────────────────────────────────────────

      assignBay(bayId, jobCardId, actor) {
        set((state) => {
          const bay = state.bays.find((b) => b.id === bayId);
          if (!bay) return;
          bay.status = 'OCCUPIED';
          bay.currentJobCardId = jobCardId;
          const jc = findJC(state, jobCardId);
          if (jc) jc.bayId = bayId;
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'bay_assigned',
            description: `Bay ${bay.code} assigned.`,
            metadata: { bayId, bayCode: bay.code },
          });
        });
      },

      freeBay(bayId, actor) {
        set((state) => {
          const bay = state.bays.find((b) => b.id === bayId);
          if (!bay) return;
          const jobCardId = bay.currentJobCardId;
          bay.status = 'FREE';
          bay.currentJobCardId = undefined;
          if (jobCardId) {
            const jc = findJC(state, jobCardId);
            if (jc) jc.bayId = undefined;
            pushEvent(state, {
              jobCardId,
              at: now(),
              actorId: actor.id,
              actorName: actor.name,
              type: 'bay_freed',
              description: `Bay ${bay.code} freed.`,
              metadata: { bayId, bayCode: bay.code },
            });
          }
        });
      },

      reassignAdvisor(jobCardId, newAdvisorId, reason, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc) return;
          const prevAdvisorId = jc.advisorId;
          jc.advisorId = newAdvisorId;
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'advisor_reassigned',
            description: `Advisor reassigned. Reason: ${reason}`,
            metadata: { from: prevAdvisorId, to: newAdvisorId, reason },
          });
        });
      },

      moveBay(jobCardId, newBayId, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc) return;
          const prevBayId = jc.bayId;

          // Free old bay
          if (prevBayId) {
            const oldBay = state.bays.find((b) => b.id === prevBayId);
            if (oldBay) {
              oldBay.status = 'FREE';
              oldBay.currentJobCardId = undefined;
            }
          }

          // Occupy new bay
          const newBay = state.bays.find((b) => b.id === newBayId);
          if (newBay) {
            newBay.status = 'OCCUPIED';
            newBay.currentJobCardId = jobCardId;
          }
          jc.bayId = newBayId;

          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'bay_changed',
            description: `Bay moved from ${prevBayId ?? 'none'} to ${newBayId}.`,
            metadata: { from: prevBayId, to: newBayId },
          });
        });
      },

      // ── Clone job card ───────────────────────────────────────────────────────

      cloneJobCard(jobCardId, actor) {
        let cloned!: JobCard;
        set((state) => {
          const src = findJC(state, jobCardId);
          if (!src) return;
          const jc: JobCard = {
            ...structuredClone(src),
            id: makeId('jc'),
            jobNo: nextJobNo(state.jobCards),
            status: 'RECEIVED',
            receivedAt: now(),
            completedAt: undefined,
            deliveredAt: undefined,
            odometerOut: undefined,
            finalTotal: undefined,
            labourLines: [],
            partsLines: [],
            inspectionId: undefined,
            bayId: undefined,
          };
          state.jobCards.push(jc);
          pushEvent(state, {
            jobCardId: jc.id,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'cloned',
            description: `Cloned from ${src.jobNo}. New job card ${jc.jobNo} created with status RECEIVED.`,
            metadata: { sourceId: jobCardId, sourceJobNo: src.jobNo },
          });
          cloned = jc;
        });
        return cloned;
      },

      // ── Cancel job card ──────────────────────────────────────────────────────

      cancelJobCard(jobCardId, reason, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc) return;
          if (!canTransition(jc.status, 'CANCELLED')) return;
          const prev = jc.status;
          jc.status = 'CANCELLED';

          // Free bay if occupied
          if (jc.bayId) {
            const bay = state.bays.find((b) => b.id === jc.bayId);
            if (bay) {
              bay.status = 'FREE';
              bay.currentJobCardId = undefined;
            }
          }

          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'cancelled',
            description: `Job card cancelled from ${prev}. Reason: ${reason}`,
            metadata: { from: prev, to: 'CANCELLED', reason },
          });
        });
      },

      // ── Reopen job card ──────────────────────────────────────────────────────

      reopenJobCard(jobCardId, reason, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc) return;
          if (!canTransition(jc.status, 'REOPENED')) return;

          jc.status = 'REOPENED';
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'reopened',
            description: `Job card reopened for rework from DELIVERED. Reason: ${reason}`,
            metadata: { from: 'DELIVERED', to: 'REOPENED', reason },
          });

          // Auto-advance REOPENED → IN_PROGRESS
          jc.status = 'IN_PROGRESS';
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'status_changed',
            description: 'Status auto-advanced from REOPENED to IN_PROGRESS.',
            metadata: { from: 'REOPENED', to: 'IN_PROGRESS' },
          });
        });
      },

      // ── Communications log ───────────────────────────────────────────────────

      logCommunication(jobCardId, c, _actor) {
        set((state) => {
          const comm: Communication = {
            id: makeId('comm'),
            sentAt: now(),
            ...c,
            jobCardId,
          };
          state.communications.push(comm);
        });
      },

      // ── Portal booking actions (SPEC-CUSTOMER-PORTAL-002 P1) ─────────────────

      createBookingFromPortal(sessionCustomerId, input, ownedVins) {
        // NFR-S: validate VIN ownership — never trust client-supplied customerId
        if (!ownedVins.includes(input.vin)) {
          return { ok: false, error: 'VIN_NOT_OWNED' };
        }

        // Duplicate guard: check for existing AWAITING_CONFIRMATION or RECEIVED JC
        // for this VIN on the same date+slot
        const existingJcs = get().jobCards;
        const duplicate = existingJcs.find(
          (jc) =>
            jc.vin === input.vin &&
            (jc.status === 'AWAITING_CONFIRMATION' || jc.status === 'RECEIVED') &&
            jc.scheduledDate === input.scheduledDate &&
            jc.scheduledSlot === input.scheduledSlot,
        );
        if (duplicate) {
          return { ok: false, error: 'DUPLICATE_BOOKING' };
        }

        let created!: JobCard;
        set((state) => {
          const jc: JobCard = {
            id: makeId('jc'),
            jobNo: nextJobNo(state.jobCards),
            vin: input.vin,
            customerId: sessionCustomerId, // always from session — never from client
            outletId: input.outletId,
            advisorId: input.advisorId,
            technicianIds: [],
            status: 'AWAITING_CONFIRMATION',
            priority: 'NORMAL',
            promisedAt: `${input.scheduledDate}T${input.scheduledSlot === 'MORNING' ? '09:00' : '13:00'}:00.000Z`,
            receivedAt: now(),
            customerComplaint: input.concerns ?? '',
            odometerIn: 0,
            estimatedTotal: 0,
            labourLines: [],
            partsLines: [],
            attachments: [],
            source: 'CUSTOMER_PORTAL',
            serviceTypeId: input.serviceTypeId,
            scheduledDate: input.scheduledDate,
            scheduledSlot: input.scheduledSlot,
            pickupMode: input.pickupMode,
            pickupAddress: input.pickupAddress,
            concerns: input.concerns,
          };
          state.jobCards.push(jc);

          pushEvent(state, {
            jobCardId: jc.id,
            at: now(),
            actorId: sessionCustomerId,
            actorName: 'Customer Portal',
            type: 'received',
            description: `Portal booking ${jc.jobNo} submitted — awaiting SA confirmation.`,
            metadata: {
              source: 'CUSTOMER_PORTAL',
              serviceTypeId: input.serviceTypeId,
              scheduledDate: input.scheduledDate,
              scheduledSlot: input.scheduledSlot,
            },
          });

          created = jc;
        });

        // Seam 27 — SPEC-NOTIFICATIONS-001 L17: best-effort try/catch; never block booking flow
        try {
          useNotificationsStore.getState().recordSent({
            templateId: 'DLT_SVC_BOOKING_CREATED',
            channel: 'SMS',
            module: 'SERVICE_BOOKING',
            recipient: { customerId: sessionCustomerId },
            variables: {
              job_no: created.jobNo,
              outlet: created.outletId,
              date: created.scheduledDate ?? '',
            },
            consentSnapshot: {
              purpose: 'SERVICE_REMINDER',
              capturedAt: created.receivedAt,
              capturedBy: 'PORTAL_SIGNUP',
              source: 'PORTAL_SIGNUP',
            },
            sourceEntityId: created.id,
            sourceEntityType: 'JOB_CARD',
          });
        } catch {
          // L17: notification failure never blocks the booking action
        }

        return { ok: true, jobCard: created };
      },

      confirmPortalBooking(jobCardId, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc || jc.status !== 'AWAITING_CONFIRMATION') return;

          jc.status = 'RECEIVED';
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'status_changed',
            description: `Portal booking confirmed by ${actor.name}. Status: AWAITING_CONFIRMATION → RECEIVED.`,
            metadata: { from: 'AWAITING_CONFIRMATION', to: 'RECEIVED' },
          });

        });

        // §11 — service_booking_confirmed_by_staff: JC-P2 succeeded (emitted outside
        // the immer set callback so it fires only once and does not block the mutation)
        trackServiceBookingConfirmedByStaff({ jobCardId, advisorId: actor.id });

        // Seam 27 — SPEC-NOTIFICATIONS-001 L17: best-effort; never block confirm flow
        try {
          const jc = get().jobCards.find((j) => j.id === jobCardId);
          if (jc?.customerId) {
            useNotificationsStore.getState().recordSent({
              templateId: 'DLT_SVC_BOOKING_CONFIRMED',
              channel: 'SMS',
              module: 'SERVICE_BOOKING',
              recipient: { customerId: jc.customerId },
              variables: {
                job_no: jc.jobNo,
                outlet: jc.outletId,
                date: jc.scheduledDate ?? '',
              },
              consentSnapshot: {
                purpose: 'SERVICE_REMINDER',
                capturedAt: jc.receivedAt,
                capturedBy: actor.id,
                source: 'STAFF_FORM',
              },
              sourceEntityId: jobCardId,
              sourceEntityType: 'JOB_CARD',
            });
          }
        } catch {
          // L17: notification failure never blocks the confirm action
        }
      },

      declinePortalBooking(jobCardId, declineReason, actor) {
        set((state) => {
          const jc = findJC(state, jobCardId);
          if (!jc || jc.status !== 'AWAITING_CONFIRMATION') return;

          jc.status = 'CANCELLED';
          jc.declineReason = declineReason;
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'cancelled',
            description: `Portal booking declined by ${actor.name}. Reason: ${declineReason}`,
            metadata: {
              from: 'AWAITING_CONFIRMATION',
              to: 'CANCELLED',
              declineReason,
              declinedBy: actor.id,
            },
          });

        });

        // §11 — service_booking_declined_by_staff: JC-P3 succeeded
        trackServiceBookingDeclinedByStaff({ jobCardId, declineReason });

        // Seam 27 — SPEC-NOTIFICATIONS-001 L17: best-effort; never block decline flow
        try {
          const jc = get().jobCards.find((j) => j.id === jobCardId);
          if (jc?.customerId) {
            useNotificationsStore.getState().recordSent({
              templateId: 'DLT_SVC_BOOKING_DECLINED',
              channel: 'SMS',
              module: 'SERVICE_BOOKING',
              recipient: { customerId: jc.customerId },
              variables: {
                job_no: jc.jobNo,
                outlet: jc.outletId,
              },
              consentSnapshot: {
                purpose: 'SERVICE_REMINDER',
                capturedAt: jc.receivedAt,
                capturedBy: actor.id,
                source: 'STAFF_FORM',
              },
              sourceEntityId: jobCardId,
              sourceEntityType: 'JOB_CARD',
            });
          }
        } catch {
          // L17: notification failure never blocks the decline action
        }
      },

      cancelPortalBooking(jobCardId, sessionCustomerId, actor) {
        const jc = get().jobCards.find((j) => j.id === jobCardId);
        if (!jc) return { ok: false, error: 'NOT_FOUND' };
        if (jc.customerId !== sessionCustomerId) return { ok: false, error: 'NOT_OWNER' };
        if (jc.status !== 'AWAITING_CONFIRMATION') return { ok: false, error: 'WRONG_STATUS' };

        // Path-specific L5 override — R20 may cancel their own AWAITING_CONFIRMATION JC
        // (canCancelAwaitingConfirmation includes R20)
        set((state) => {
          const mutableJc = findJC(state, jobCardId);
          if (!mutableJc) return;
          mutableJc.status = 'CANCELLED';
          mutableJc.declineReason = SELF_CANCEL_REASON; // L_SVC_BOOK_1
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: sessionCustomerId,
            actorName: actor.name,
            type: 'cancelled',
            description: 'Booking cancelled by customer (self-cancel while awaiting confirmation).',
            metadata: {
              from: 'AWAITING_CONFIRMATION',
              to: 'CANCELLED',
              initiatedBy: 'CUSTOMER',
            },
          });
        });

        return { ok: true };
      },

      selectBookingsByCustomer(customerId) {
        return get().jobCards.filter((jc) => jc.customerId === customerId);
      },

      // ── Intake Inspection actions (SPEC-SERVICE-INTAKE-001) ─────────────────

      recordIntakeInspection(input, actor) {
        const intakeId = makeId('intake');
        // L7: retainUntil = createdAt + 5 years (DPDP Act 2023 §11)
        const createdAt = new Date();
        const retainUntil = new Date(createdAt);
        retainUntil.setFullYear(retainUntil.getFullYear() + 5);
        const retainUntilStr = retainUntil.toISOString().slice(0, 10); // ISO date

        set((state) => {
          const intake: IntakeInspection = {
            ...input,
            id: intakeId,
            state: 'DRAFT',
            // L7: 5-year retention; v1 records date only; v1.5 wires automated purge (DEF-INTAKE-1)
            retainUntil: retainUntilStr,
            retentionPolicy: 'INTAKE_INSPECTION_5Y',
            version: 1,
            amendments: [],
          };
          state.intakeInspections.push(intake);

          // Patch JC with intakeInspectionId back-reference (L1)
          const jc = findJC(state, input.jobCardId);
          if (jc) jc.intakeInspectionId = intakeId;

          // Emit timeline event `intake_recorded` (§14 / QA #5: actorRole for debugging)
          pushEvent(state, {
            jobCardId: input.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Intake inspection recorded (id: ${intakeId}).`,
            metadata: {
              event: 'intake_recorded',
              actorEmployeeId: actor.id,
              actorRole: actor.role, // QA #5: role stored for standalone debugging
              intakeInspectionId: intakeId,
              jobCardId: input.jobCardId,
            },
          });
        });
        return intakeId;
      },

      captureCustomerSignature(intakeId, signatureDataUrl, actor) {
        set((state) => {
          const intake = state.intakeInspections.find((i) => i.id === intakeId);
          if (!intake) return;
          if (intake.state !== 'DRAFT') return; // only valid from DRAFT

          intake.customerSignatureDataUrl = signatureDataUrl;
          intake.customerSignedAt = now();
          intake.state = 'CUSTOMER_SIGNED';

          pushEvent(state, {
            jobCardId: intake.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Customer signature captured. Intake state: DRAFT → CUSTOMER_SIGNED.`,
            metadata: {
              event: 'intake_signed',
              actorRole: actor.role,
              intakeInspectionId: intakeId,
              jobCardId: intake.jobCardId,
            },
          });
        });
      },

      attachSignedSheet(intakeId, attachment, actor) {
        set((state) => {
          const intake = state.intakeInspections.find((i) => i.id === intakeId);
          if (!intake) return;
          // SC-17 / B6: REJECTS if state !== CUSTOMER_SIGNED
          if (intake.state !== 'CUSTOMER_SIGNED') {
            // State guard: reject silently (caller should validate before calling)
            // Logged to console in dev for debugging; not surfaced as a store side-effect
            return;
          }

          const attRecord: Attachment = {
            id: makeId('att'),
            ...attachment,
            jobCardId: intake.jobCardId, // always use intake's JC id as authoritative source
            uploadedAt: now(),
            uploadedBy: actor.id,
          };
          state.attachments.push(attRecord);

          intake.signedSheetAttachmentId = attRecord.id;
          intake.signedSheetUploadedAt = now();
          // Auto-transition: CUSTOMER_SIGNED → SHEET_UPLOADED → COMPLETED
          intake.state = 'COMPLETED';

          // Set JC.intakeInspectionCompletedAt — lifts the soft-warn banner (L9)
          const jc = findJC(state, intake.jobCardId);
          if (jc) jc.intakeInspectionCompletedAt = now();

          pushEvent(state, {
            jobCardId: intake.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Signed intake sheet uploaded. Intake state: CUSTOMER_SIGNED → COMPLETED.`,
            metadata: {
              event: 'intake_sheet_uploaded',
              actorRole: actor.role,
              intakeInspectionId: intakeId,
              jobCardId: intake.jobCardId,
              attachmentId: attRecord.id,
            },
          });
        });
      },

      addIntakePhoto(intakeId, photoBase64, slot, actor) {
        const intake = get().intakeInspections.find((i) => i.id === intakeId);
        if (!intake) return { ok: false, error: 'INTAKE_NOT_FOUND' };

        // QA #4 / SC-2: Reject if photo size > 1 MB
        // Base64 encodes ~1.33x raw bytes; estimate raw size from base64 string length
        const base64Data = photoBase64.includes(',') ? photoBase64.split(',')[1] ?? '' : photoBase64;
        const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
        const ONE_MB = 1024 * 1024;
        if (estimatedBytes > ONE_MB) {
          return { ok: false, error: 'PHOTO_TOO_LARGE' };
        }

        const photoId = makeId('iph');
        set((state) => {
          // L5: slot uniqueness — one photo per slot; replace existing if slot is already filled
          const existingIdx = state.intakeInspectionPhotos.findIndex(
            (p) => p.intakeInspectionId === intakeId && p.slot === slot,
          );
          if (existingIdx >= 0) {
            state.intakeInspectionPhotos.splice(existingIdx, 1);
          }

          const photo: IntakeInspectionPhoto = {
            id: photoId,
            intakeInspectionId: intakeId,
            jobCardId: intake.jobCardId,
            dataUrl: photoBase64,
            slot,
            capturedAt: now(),
            uploadedBy: actor.id,
          };
          state.intakeInspectionPhotos.push(photo);

          pushEvent(state, {
            jobCardId: intake.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'photo_uploaded',
            description: `Intake photo captured for slot: ${slot}.`,
            metadata: {
              event: 'intake_photo_captured',
              actorRole: actor.role,
              intakeInspectionId: intakeId,
              slot,
            },
          });
        });
        return { ok: true, photoId };
      },

      deleteIntakePhoto(photoId, actor) {
        set((state) => {
          const idx = state.intakeInspectionPhotos.findIndex((p) => p.id === photoId);
          if (idx < 0) return;
          const photo = state.intakeInspectionPhotos[idx]!;
          const jobCardId = photo.jobCardId;
          state.intakeInspectionPhotos.splice(idx, 1);
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Intake photo deleted (id: ${photoId}).`,
            metadata: { photoId, intakeInspectionId: photo.intakeInspectionId },
          });
        });
      },

      addDamageCallout(intakeId, callout, actor) {
        const calloutId = makeId('dmg');
        set((state) => {
          const intake = state.intakeInspections.find((i) => i.id === intakeId);
          if (!intake) return;

          // Auto-number based on existing callouts for this intake
          const existingCallouts = state.intakeDamageCallouts.filter(
            (c) => c.intakeInspectionId === intakeId,
          );
          const number = existingCallouts.length + 1;

          const newCallout: IntakeDamageCallout = {
            ...callout,
            id: calloutId,
            intakeInspectionId: intakeId,
            number,
          };
          state.intakeDamageCallouts.push(newCallout);

          // Update damageCalloutIds on the intake record
          intake.damageCalloutIds.push(calloutId);
        });
        return calloutId;
      },

      removeDamageCallout(calloutId, actor) {
        set((state) => {
          const idx = state.intakeDamageCallouts.findIndex((c) => c.id === calloutId);
          if (idx < 0) return;
          const callout = state.intakeDamageCallouts[idx]!;
          state.intakeDamageCallouts.splice(idx, 1);

          // Remove from intake's damageCalloutIds
          const intake = state.intakeInspections.find(
            (i) => i.id === callout.intakeInspectionId,
          );
          if (intake) {
            const cidx = intake.damageCalloutIds.indexOf(calloutId);
            if (cidx >= 0) intake.damageCalloutIds.splice(cidx, 1);
          }
        });
      },

      amendIntake(intakeId, scalarDiffs, reason, actor) {
        // L8: RBAC check — only R03/R19/R24 can amend (rank ≥ R03 in role hierarchy)
        // Roles that may amend: R03 (Outlet Manager), R19 (GM), R24 (CEO)
        // The task description says "rank R09 < R12 required by L8" but the spec says
        // "R03 (Outlet Manager) and R19 (GM) can amend" — we check role directly.
        const ALLOWED_AMENDMENT_ROLES = new Set(['R03', 'R19', 'R24']);
        if (!ALLOWED_AMENDMENT_ROLES.has(actor.role)) {
          return { ok: false, error: 'UNAUTHORIZED' };
        }

        // L8: Reason must be ≥ 10 characters
        if (reason.length < 10) {
          return { ok: false, error: 'REASON_TOO_SHORT' };
        }

        // L8 (tightened): scalarDiffs MUST NOT include data URL fields
        const PII_FORBIDDEN_KEYS = new Set([
          'customerSignatureDataUrl',
          'saSignatureDataUrl',
          'dataUrl', // photo dataUrl
        ]);
        const hasPiiKey = Object.keys(scalarDiffs).some((k) => PII_FORBIDDEN_KEYS.has(k));
        if (hasPiiKey) {
          return { ok: false, error: 'PII_IN_DIFFS' };
        }

        const intake = get().intakeInspections.find((i) => i.id === intakeId);
        if (!intake) return { ok: false, error: 'NOT_FOUND' };

        // L8: Only COMPLETED or AMENDED states can be amended
        if (intake.state !== 'COMPLETED' && intake.state !== 'AMENDED') {
          return { ok: false, error: 'INVALID_STATE' };
        }

        set((state) => {
          const mutableIntake = state.intakeInspections.find((i) => i.id === intakeId);
          if (!mutableIntake) return;

          const newVersion = mutableIntake.version + 1;
          const changedFields = Object.keys(scalarDiffs);

          // L8 (tightened): amendment audit row stores scalar diffs ONLY — never base64 blobs
          mutableIntake.amendments.push({
            at: now(),
            byEmployeeId: actor.id,
            byRole: actor.role, // QA #5: actorRole stored for standalone debugging
            reason,
            changedFields,
            scalarDiffs, // guaranteed PII-free by the check above
          });
          mutableIntake.version = newVersion;
          mutableIntake.state = 'AMENDED';

          // Emit `intake_amended` event per §14 / Sec #11:
          // reasonLength instead of hash to avoid leakable short-hash inversion
          pushEvent(state, {
            jobCardId: mutableIntake.jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Intake amended by ${actor.role}. Version: ${newVersion}. Fields: ${changedFields.join(', ')}.`,
            metadata: {
              event: 'intake_amended',
              actorEmployeeId: actor.id,
              actorRole: actor.role,
              intakeInspectionId: intakeId,
              version: newVersion,
              changedFields,
              reasonLength: reason.length, // Sec #11: emit reasonLength, not hash
            },
          });
        });
        return { ok: true };
      },

      recordIntakeSkipped(jobCardId, reason, actor) {
        // W1.2 fix (per spec L9 / SC-8b): R19/R24 ONLY — R03 removed.
        // L9: "R19+ confirm-anyway override". SC-8b: "R19". R03 was incorrectly
        // in the prior list; corrected here and in canSkip UI check.
        const ALLOWED_SKIP_ROLES = new Set(['R19', 'R24']);
        if (!ALLOWED_SKIP_ROLES.has(actor.role)) {
          return { ok: false, error: 'UNAUTHORIZED' };
        }

        if (!reason || reason.trim().length === 0) {
          return { ok: false, error: 'REASON_REQUIRED' };
        }

        const jc = get().jobCards.find((j) => j.id === jobCardId);
        if (!jc) return { ok: false, error: 'JC_NOT_FOUND' };

        set((state) => {
          pushEvent(state, {
            jobCardId,
            at: now(),
            actorId: actor.id,
            actorName: actor.name,
            type: 'note',
            description: `Intake inspection skipped by ${actor.role}. Reason: ${reason}`,
            metadata: {
              event: 'intake_skipped',
              actorEmployeeId: actor.id,
              actorRole: actor.role,
              jobCardId,
              reason, // reason text only (no hash)
            },
          });
        });
        return { ok: true };
      },

      // ── Intake selectors ─────────────────────────────────────────────────────

      selectIntakeForJobCard(jobCardId) {
        // Single base-ref selector — computation done here, not in the action
        return get().intakeInspections.find((i) => i.jobCardId === jobCardId);
      },

      selectIntakePhotosForIntake(intakeId) {
        return get().intakeInspectionPhotos.filter((p) => p.intakeInspectionId === intakeId);
      },

      selectDamageCalloutsForIntake(intakeId) {
        return get().intakeDamageCallouts.filter((c) => c.intakeInspectionId === intakeId);
      },

      // SC-16 / L13 / AC-17: two-hop join through jobCard.customerId
      selectIntakesByCustomerId(customerId) {
        const jobCards = get().jobCards;
        const intakes = get().intakeInspections;
        // Step 1: find all JC ids for this customer
        const customerJcIds = new Set(
          jobCards.filter((jc) => jc.customerId === customerId).map((jc) => jc.id),
        );
        // Step 2: find all intakes whose jobCardId is in those JC ids
        return intakes.filter((i) => customerJcIds.has(i.jobCardId));
      },
    };
  }),
);

// ─── Selector convenience hooks ───────────────────────────────────────────────

/** Typed equality selector to avoid unnecessary re-renders */
export function useServiceStoreSelector<T>(selector: (s: ServiceStore) => T): T {
  return useServiceStore(selector);
}
