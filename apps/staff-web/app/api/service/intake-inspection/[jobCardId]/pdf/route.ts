/**
 * PDF Route Handler — Vehicle Intake Inspection Sheet download.
 *
 * L3: Server-only. @react-pdf/renderer imported HERE and in intake-pdf-document.tsx ONLY.
 *     Must never be imported by any client bundle code path.
 *
 * L12: Hardening contract (executed in order):
 *   (a) Auth/session check FIRST before any store read.
 *       v1: stub getStaffSession() returning mock session; real check lands v1.5.
 *   (b) Outlet isolation: session.user.outletId === jobCard.outletId for non-R19+ roles.
 *   (c) Per-IP rate limit: 30 req/min sliding window (in-memory Map; Redis in v1.5).
 *   (d) Audit log: writes intake_pdf_downloaded event with actor+ip+ua on success.
 *   (e) Cache-Control: private, no-store.
 *   (f) Origin allow-list: rejects CSRF-origin requests from non-staff-web origins.
 *
 * L11: R11 (Workshop Tech) receives 403 — never sees signature image.
 *
 * SC-5: Response carries correct Content-Type + Content-Disposition headers.
 * SC-6: R11 → 403.
 * SC-14: outletId mismatch → 403.
 * SC-15: audit event emitted after successful render.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import React, { type JSXElementConstructor, type ReactElement } from 'react';
import { IntakePdfDocument } from '@/src/lib/service/intake/intake-pdf-document';
import type { IntakePdfData } from '@/src/lib/service/intake/intake-pdf-document';

// ── Type stubs ────────────────────────────────────────────────────────────────

interface StaffSession {
  user: {
    id: string;
    name: string;
    role: string;   // e.g. 'R09'
    outletId: string;
    employeeId: string;
  };
}

// ── Role rank helper ──────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  R05: 1, R07: 2, R09: 3, R03: 3, R12: 4, R13: 5, R19: 6, R22: 7, R23: 7, R24: 8,
};

function isR11(role: string): boolean {
  return role === 'R11';
}

function isGMOrAbove(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK['R19']!;
}

// ── Rate limiter (in-memory; Redis-backed in v1.5 per L12-c) ─────────────────

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) return false;
  return true;
}

// ── Allow-list (in mock: localhost only; real origins in v1.5 per L12-f) ──────

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3001',
  'https://staff.bnautos.in',
]);

// ── Stub session reader (v1 mock — real auth in v1.5 per L12-a comment) ──────

function getStaffSession(_req: NextRequest): StaffSession {
  // v1 mock-phase stub: returns a mock R09 SA session.
  // Real implementation reads JWT/session cookie and validates with auth-service.
  // MUST be the FIRST thing checked per L12-a contract.
  return {
    user: {
      id: 'staff-r09-001',
      name: 'Priya Sharma',
      role: 'R09',
      outletId: 'BLR-01',
      employeeId: 'EMP-R09-001',
    },
  };
}

// ── Stub audit log (v1 mock — real audit store in v1.5) ───────────────────────

type AuditEntry = {
  type: 'intake_pdf_downloaded';
  timestamp: string;
  actorEmployeeId: string;
  actorRole: string;
  jobCardId: string;
  intakeInspectionId: string;
  ip: string;
  userAgent: string;
};

// In-memory audit log for mock phase (never persisted; real store in v1.5)
const auditLog: AuditEntry[] = [];

function logPdfDownload(entry: Omit<AuditEntry, 'type' | 'timestamp'>): void {
  // SC-15: emit intake_pdf_downloaded audit event
  // L12-d: chain-of-custody record (subject to consumer-court subpoena in prod)
  const record: AuditEntry = {
    type: 'intake_pdf_downloaded',
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(record);
  // v1: console-only (telemetry stub per SPEC-ARCH-UI-001 §17 / Doc 12 §observability)
  console.info('[intake-pdf] download audit:', record);
}

// Export for test assertions (SC-15)
export { auditLog };

// ── Stub fixture reader ───────────────────────────────────────────────────────
// v1 mock-phase: fixture data read server-side.
// Real implementation queries DB via server action in v1.5.

async function getIntakePdfData(jobCardId: string): Promise<IntakePdfData | null> {
  // In mock phase, return a deterministic fixture for any jobCardId.
  // The real implementation loads intake + jobCard + vehicle + customer from DB.
  const mockData: IntakePdfData = {
    id: `intake-${jobCardId}`,
    jobCardId,
    jobNo: `JC-2026-00001`,
    inspectionAt: new Date().toISOString(),
    outletId: 'BLR-01',
    outletGstin: '29AABCB1234A1Z5',
    regNumber: 'KA01-AB-1234',
    vin: 'WBA12345678901234',
    make: 'BMW',
    model: '5 Series',
    variant: '520d M Sport',
    year: 2022,
    exteriorColor: 'Mineral White',
    odometerKm: 28450,
    fuelLevel: 'Q3',
    damageCallouts: [],
    spareTyrePresent: true,
    toolKitPresent: true,
    keyCount: '2',
    keyType: 'SMART_ONLY',
    serviceBookPresent: false,
    rcInVehicle: 'PRESENT',
    insuranceCertInVehicle: 'PRESENT',
    cabinAccessoriesNote: '',
    battery12VCondition: 'OK',
    tyreCondition: { FL: 'GOOD', FR: 'GOOD', RL: 'GOOD', RR: 'GOOD' },
    acFunctional: true,
    wipersFunctional: true,
    lightsFunctional: true,
    infotainmentFunctional: true,
    dashboardWarningLightsNote: '',
    customerName: 'Rohit Malhotra',
    customerSignatureDataUrl: undefined,
    customerSignedAt: undefined,
    saName: 'Priya Sharma',
    saEmployeeId: 'EMP-R09-001',
    // Stub SA signature: a 1x1 transparent PNG in base64
    saSignatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    saSignedAt: new Date().toISOString(),
    qrPayload: `https://dms.bnautos.in/service/jobcards/${jobCardId}`,
    state: 'COMPLETED',
    version: 1,
  };

  return mockData;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { jobCardId: string } },
) {
  const { jobCardId } = params;

  // ── (a) Auth/session check — FIRST per L12-a ──────────────────────────────
  const session = getStaffSession(req);

  // ── (b) R11 gate — per L11 / SC-6 ────────────────────────────────────────
  if (isR11(session.user.role)) {
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden — Workshop Technicians may not download intake PDFs' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── (f) Origin allow-list — per L12-f ────────────────────────────────────
  const origin = req.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden — origin not in allow-list' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── (c) Rate limit — per L12-c ───────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '127.0.0.1';

  if (!checkRateLimit(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      },
    );
  }

  // ── Fetch intake data ─────────────────────────────────────────────────────
  const data = await getIntakePdfData(jobCardId);
  if (!data) {
    return new NextResponse(
      JSON.stringify({ error: 'Intake inspection not found for this job card' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── (b) Outlet isolation check — per L12-b / SC-14 ───────────────────────
  // R19+ may cross outlets; all others must match
  if (!isGMOrAbove(session.user.role) &&
      data.outletId !== session.user.outletId) {
    return new NextResponse(
      JSON.stringify({ error: 'Forbidden — outlet mismatch' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Generate PDF ──────────────────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      // reason: renderToBuffer requires ReactElement<DocumentProps>; coerce via unknown
      // since @react-pdf/renderer JSX types diverge from React's JSX types at the generic level
      React.createElement(IntakePdfDocument, { data }) as unknown as ReactElement<DocumentProps, JSXElementConstructor<DocumentProps>>,
    );
  } catch (err) {
    console.error('[intake-pdf] render failed:', err);
    return new NextResponse(
      JSON.stringify({ error: 'PDF generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── (d) Audit log — per L12-d / SC-15 ────────────────────────────────────
  const ua = req.headers.get('user-agent') ?? 'unknown';
  logPdfDownload({
    actorEmployeeId: session.user.employeeId,
    actorRole: session.user.role,
    jobCardId,
    intakeInspectionId: data.id,
    ip,
    userAgent: ua,
  });

  // ── (e) Response headers — per L12-e / SC-5 ──────────────────────────────
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="intake-${jobCardId}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      // L12-e: never cached at any intermediary
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
