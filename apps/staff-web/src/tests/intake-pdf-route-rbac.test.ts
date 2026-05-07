/**
 * PDF Route Handler — L12 RBAC hardening tests (W1.1).
 *
 * Spec reference: SPEC-SERVICE-INTAKE-001 v1.1
 * Covers:
 *   SC-6  (W1.1): missing x-staff-session header → 401
 *   SC-6  (W1.1): malformed x-staff-session header → 401
 *   SC-6  (W1.1): R11 session → 403 (Workshop Tech cannot download PDF, per L11)
 *   SC-6  (W1.1): R09 same-outlet → 200
 *   SC-14 (W1.1): cross-outlet SA (BLR-01 session on MUM-01 fixture) → 403
 *   SC-14 (W1.1): R19 GM cross-outlet bypass → 200 (R19+ exempt per L12-b)
 *
 * @react-pdf/renderer is mocked to avoid the server-side renderer dependency
 * that is not resolvable in the Vitest node bundle.
 *
 * Test placement: top-level integration tests → src/tests/ (DoD §10.9).
 */

import { describe, it, expect, vi } from 'vitest';

// Mock @react-pdf/renderer so renderToBuffer returns a stub buffer.
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  Document: vi.fn(),
  Page: vi.fn(),
  View: vi.fn(),
  Text: vi.fn(),
  Image: vi.fn(),
  Svg: vi.fn(),
  Path: vi.fn(),
  StyleSheet: { create: vi.fn((s: unknown) => s) },
}));

// Mock IntakePdfDocument so it doesn't pull in the renderer's JSX types.
vi.mock('../lib/service/intake/intake-pdf-document', () => ({
  IntakePdfDocument: vi.fn(() => null),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(headers: Record<string, string> = {}): Request {
  return new Request(
    'http://localhost:3001/api/service/intake-inspection/jc-001/pdf',
    {
      method: 'GET',
      headers: new Headers({
        origin: 'http://localhost:3001',
        ...headers,
      }),
    },
  );
}

function sessionHeader(session: {
  id: string;
  name: string;
  role: string;
  outletId: string;
  employeeId: string;
}): Record<string, string> {
  return { 'x-staff-session': JSON.stringify(session) };
}

const SA_BLR   = { id: 'staff-r09-001', name: 'Priya Sharma', role: 'R09', outletId: 'BLR-01', employeeId: 'EMP-R09-001' };
const SA_MUM   = { id: 'staff-r09-002', name: 'Ravi Kumar',   role: 'R09', outletId: 'MUM-01', employeeId: 'EMP-R09-002' };
const TECH_BLR = { id: 'tech-r11-001',  name: 'K. Kumar',     role: 'R11', outletId: 'BLR-01', employeeId: 'EMP-R11-001' };
const GM_MUM   = { id: 'staff-r19-001', name: 'Meera Iyer',   role: 'R19', outletId: 'MUM-01', employeeId: 'EMP-R19-001' };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PDF Route Handler — L12 RBAC hardening (SC-6 + SC-14, W1.1)', () => {
  // Dynamic import inside tests uses the @ alias resolved at test runtime.
  // The [jobCardId] bracket in the path is a real directory name; vitest
  // resolves it correctly when using the path alias.

  it('SC-6 (W1.1): missing x-staff-session header → 401', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    const req = makeReq(); // no session header
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/missing|invalid/i);
  });

  it('SC-6 (W1.1): malformed x-staff-session header → 401', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    const req = makeReq({ 'x-staff-session': 'not-valid-json{{{{' });
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    expect(res.status).toBe(401);
  });

  it('SC-6 (W1.1): incomplete session payload (missing outletId) → 401', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    const req = makeReq({ 'x-staff-session': JSON.stringify({ id: 'x', role: 'R09' }) }); // missing outletId+employeeId
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    expect(res.status).toBe(401);
  });

  it('SC-6 (W1.1): R11 (Workshop Tech) with valid session → 403 per L11', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    const req = makeReq(sessionHeader(TECH_BLR));
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Workshop Technician/i);
  });

  it('SC-14 (W1.1): SA from MUM-01 outlet on BLR-01 job card → 403', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    // Fixture returns outletId='BLR-01'; SA claims MUM-01 → mismatch → 403
    const req = makeReq(sessionHeader(SA_MUM));
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/outlet mismatch/i);
  });

  it('SC-14 (W1.1): R19 GM from MUM-01 on BLR-01 job → 200 (cross-outlet bypass per L12-b)', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    const req = makeReq(sessionHeader(GM_MUM));
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    // R19+ bypasses outlet isolation check — should succeed with 200
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('SC-6 (W1.1): R09 SA from BLR-01 on BLR-01 job → 200 (same outlet, allowed)', async () => {
    const { GET } = await import('@/app/api/service/intake-inspection/[jobCardId]/pdf/route');
    const req = makeReq(sessionHeader(SA_BLR));
    const res = await GET(req as never, { params: { jobCardId: 'jc-001' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Content-Disposition')).toMatch(/attachment/);
  });
});
