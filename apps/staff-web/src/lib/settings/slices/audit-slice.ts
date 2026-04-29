/**
 * Audit slice — SPEC-SETTINGS-001 §4
 * L7: Every mutation produces a SettingsAuditEvent with before/after diff.
 * L14: Retention 3 years. No customer PII (operator-only data).
 */

import type { SettingsAuditEvent, SettingsAuditEventKind } from '@dms/types';

export interface AuditSliceState {
  auditLog: SettingsAuditEvent[];
}

export function buildInitialAuditLog(): SettingsAuditEvent[] {
  return [];
}

export interface AuditFilters {
  kind?: SettingsAuditEventKind;
  from?: string; // ISO date string
  to?: string;   // ISO date string
  actorId?: string;
}

/** Filter audit log — used by both store and UI */
export function filterAuditLog(
  log: SettingsAuditEvent[],
  filters: AuditFilters,
): SettingsAuditEvent[] {
  return log.filter((event) => {
    if (filters.kind && event.kind !== filters.kind) return false;
    if (filters.actorId && event.actorId !== filters.actorId) return false;
    if (filters.from && event.at < filters.from) return false;
    if (filters.to && event.at > filters.to) return false;
    return true;
  });
}
