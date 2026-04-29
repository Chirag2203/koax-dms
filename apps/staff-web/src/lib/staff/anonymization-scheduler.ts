/**
 * Anonymization Scheduler — SPEC-STAFF-001 S8 / L23 / L12
 *
 * Staff PII is anonymized 7 years after last working day per:
 *   - Doc 06 §17 (Income Tax 7-year retention)
 *   - DPDP Act 2023 purpose-limitation + retention rules
 *
 * In production this runs as a server-side cron. For v1, we ship a manual
 * R02+ admin trigger per the MVP frontend-first philosophy.
 *
 * L12: name / PAN / Aadhaar / bank replaced with anonymized placeholders.
 *      Staff ID is retained as a ghost key for FK integrity in audit logs.
 *
 * The store's `exitStates` record holds:
 *   - `anonymizationScheduledFor` (ISO date — 7yr from lastWorkingDay)
 *   - `anonymizedAt` (ISO datetime — set when sweep runs)
 *   - `anonymizedBy` (actorId — set when sweep runs)
 *   - `status === 'FNF_FINALIZED'` — only finalized exits can be anonymized
 *
 * `StaffExitState` does not yet carry `anonymizedAt` / `anonymizedBy`.
 * We extend the type here with an augmented version to avoid touching the
 * Zod schema in @dms/types (no new deps allowed). The store's ExitState
 * interface is extended via module augmentation in staff-store.ts already —
 * but those two fields are missing. We add them here via a local extension
 * and mutate through the store's immer-backed set().
 */

import { useStaffStore } from './staff-store';
import type { StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';

// ─── PII placeholder constants (L12) ──────────────────────────────────────────

const ANON_NAME = 'ANONYMIZED_USER';
const ANON_EMAIL = 'anon@example.invalid';
const ANON_PHONE = '0000000000';
const ANON_AADHAAR = '0000';
const ANON_PAN = 'XXXXXXXXXX';
const ANON_BANK = 'XXXX0000';
const ANON_ADDRESS = '[REDACTED]';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AnonymizationRecord {
  staffId: string;
  scheduledFor: string;
  lastWorkingDay: string;
}

export interface AnonymizationSweepResult {
  processed: AnonymizationRecord[];
  count: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns all exit states that are due for anonymization:
 *   - status === 'FNF_FINALIZED'
 *   - anonymizationScheduledFor <= today
 *   - anonymizedAt == null (not yet anonymized)
 */
function getDueRecords(): AnonymizationRecord[] {
  const { exitStates } = useStaffStore.getState();
  const today = new Date().toISOString().split('T')[0]!;

  return Object.entries(exitStates)
    .filter(([, es]) => {
      if (es.status !== 'FNF_FINALIZED') return false;
      if (es.anonymizationScheduledFor > today) return false;
      // Skip already-anonymized records
      if (es.anonymizedAt != null) return false;
      return true;
    })
    .map(([staffId, es]) => ({
      staffId,
      scheduledFor: es.anonymizationScheduledFor,
      lastWorkingDay: es.lastWorkingDay,
    }));
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Dry-run variant — returns the list of records that WOULD be anonymized
 * without performing any writes. Safe to call at any time.
 *
 * @param actor - actor performing the check (R02+ required)
 * @returns List of due records, or error string if unauthorized
 */
export function runAnonymizationSweepDryRun(
  actor: { id: string; role: StaffRoleCode },
): { success: false; error: string } | { success: true; due: AnonymizationRecord[] } {
  if (!hasRank(actor.role, 'R02')) {
    return { success: false, error: 'Org Admin (R02) authority required to view anonymization queue.' };
  }
  return { success: true, due: getDueRecords() };
}

/**
 * Runs the anonymization sweep — iterates all FNF_FINALIZED exit states with
 * `anonymizationScheduledFor <= today` and `anonymizedAt == null`, and for each:
 *   1. Replaces PII fields on the StaffProfile with anonymized placeholders (L12)
 *   2. Sets `exitState.anonymizedAt = now` and `exitState.anonymizedBy = actor.id`
 *   3. Emits a `staff-anonymized` profile-audit event (L25)
 *
 * Requires R02+ authority (admin-level — matches staff.exit.initiate gate).
 *
 * @param actor - actor performing the sweep
 * @returns result with count of records processed, or error
 */
export function runAnonymizationSweep(
  actor: { id: string; role: StaffRoleCode },
): { success: false; error: string } | { success: true; result: AnonymizationSweepResult } {
  if (!hasRank(actor.role, 'R02')) {
    return { success: false, error: 'Org Admin (R02) authority required to run anonymization sweep.' };
  }

  const due = getDueRecords();
  if (due.length === 0) {
    return { success: true, result: { processed: [], count: 0 } };
  }

  const now = new Date().toISOString();

  // Perform mutations via the store's immer-backed setter
  // We use getState().set directly (Zustand exposes this via the store object)
  const store = useStaffStore;

  store.setState((state) => {
    for (const record of due) {
      const profile = state.staffById[record.staffId];
      if (profile) {
        // Replace PII fields with anonymized placeholders (L12)
        profile.name = ANON_NAME;
        profile.email = ANON_EMAIL;
        if (profile.phone !== undefined) profile.phone = ANON_PHONE;
        if (profile.aadhaarLast4 !== undefined) profile.aadhaarLast4 = ANON_AADHAAR;
        if (profile.panMasked !== undefined) profile.panMasked = ANON_PAN;
        if (profile.bankAccountMasked !== undefined) profile.bankAccountMasked = ANON_BANK;
        // addressLine1/2 are not on StaffProfile v1 schema but may be added in v1.5;
        // guard for forward-compatibility without breaking strict TS.
        const profileDynamic = profile as Record<string, unknown>;
        if (profileDynamic['addressLine1'] !== undefined) profileDynamic['addressLine1'] = ANON_ADDRESS;
        if (profileDynamic['addressLine2'] !== undefined) profileDynamic['addressLine2'] = ANON_ADDRESS;
        profile.updatedAt = now;
      }

      // Mark the exit state as anonymized (fields added to StaffExitState in staff-store.ts)
      const exitState = state.exitStates[record.staffId];
      if (exitState != null) {
        exitState.anonymizedAt = now;
        exitState.anonymizedBy = actor.id;
      }

      // Emit `staff-anonymized` profile-audit event (L25)
      state.profileAuditLog.push({
        id: `pae-anon-${Date.now()}-${record.staffId}`,
        staffId: record.staffId,
        kind: 'staff-anonymized',
        actorId: actor.id,
        at: now,
        before: { name: profile?.name ?? ANON_NAME, email: profile?.email ?? ANON_EMAIL },
        after: { name: ANON_NAME, email: ANON_EMAIL, note: 'PII anonymized per L12/Doc06§17' },
        reason: 'Anonymization sweep: 7-year retention period elapsed per Doc 06 §17 + DPDP',
        schemaVersion: 'v1',
      });
    }
  });

  return { success: true, result: { processed: due, count: due.length } };
}
