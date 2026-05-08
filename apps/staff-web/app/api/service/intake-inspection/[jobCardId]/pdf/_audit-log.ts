/**
 * Intake PDF download audit log — sibling module to `route.ts`.
 *
 * The leading-underscore filename excludes it from Next.js routing, so the
 * route handler can re-import it without making `auditLog` an export of the
 * route file (which Next.js App Router forbids — only `GET`/`POST`/etc.
 * and a fixed set of config exports are allowed).
 *
 * v1 mock-phase: in-memory, never persisted. v1.5 swaps to a real audit
 * store (per SPEC-SERVICE-INTAKE-001 L12-d / SC-15).
 */

export type IntakePdfAuditEntry = {
  type: 'intake_pdf_downloaded';
  timestamp: string;
  actorEmployeeId: string;
  actorRole: string;
  jobCardId: string;
  intakeInspectionId: string;
  ip: string;
  userAgent: string;
};

// In-memory audit log for mock phase (never persisted; real store in v1.5).
export const auditLog: IntakePdfAuditEntry[] = [];

export function logPdfDownload(
  entry: Omit<IntakePdfAuditEntry, 'type' | 'timestamp'>,
): void {
  // SC-15: emit intake_pdf_downloaded audit event
  // L12-d: chain-of-custody record (subject to consumer-court subpoena in prod)
  const record: IntakePdfAuditEntry = {
    type: 'intake_pdf_downloaded',
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(record);
  // v1: console-only (telemetry stub per Doc 12 §observability)
  console.info('[intake-pdf] download audit:', record);
}
