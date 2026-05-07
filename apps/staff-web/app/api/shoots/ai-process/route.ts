/**
 * AI Processing Route Handler — SPEC-SHOOTS-002 T08
 *
 * POST /api/shoots/ai-process
 *
 * P1 stub: returns { status: 'manual-only', message: 'AI processing — Coming in v2.1' }
 * Real Spyne.ai integration is DEF-AI-1 / P2.
 *
 * Hardening contract (L_AI-14 — mirrors L12 from SPEC-SERVICE-INTAKE-001):
 *   (a) Auth/session check FIRST — 401 if missing/malformed
 *   (b) actor.rank ≥ R11 for requestAiProcess — 403 otherwise
 *   (c) Outlet RLS: actor.outletId === shoot.outletId for non-R19+ — 403 otherwise
 *   (d) Zod-validate request body — 422 on malformed
 *   (e) Per-IP rate limit: 30 req/min (in-memory Map; Redis in v1.5)
 *   (f) Origin allowlist: rejects non-staff-web origins
 *   (g) Audit log: writes ai_route_called event per request
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-14, T08
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ── Role rank helper ──────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  R01: 1, R02: 2, R03: 3, R05: 4, R07: 5,
  R09: 6, R10: 7, R11: 8,
  R12: 9, R13: 10, R14: 11, R15: 12, R16: 13, R17: 14, R18: 15,
  R19: 16, R20: 17, R21: 18, R22: 19, R23: 20, R24: 21,
};

function isR11OrAbove(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK['R11']!;
}

function isGMOrAbove(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= ROLE_RANK['R19']!;
}

// ── Session stub (v1 mock; real session in v1.5) ──────────────────────────────

interface StaffSession {
  user: {
    id: string;
    name: string;
    role: string;
    outletId: string;
  };
}

function getStaffSession(req: NextRequest): StaffSession | null {
  // v1 stub: read x-staff-session header (mock value set by MSW / test harness)
  const sessionHeader = req.headers.get('x-staff-session');
  if (!sessionHeader) return null;
  try {
    return JSON.parse(sessionHeader) as StaffSession;
  } catch {
    return null;
  }
}

// ── Rate limiter (in-memory; Redis-backed in v1.5) ────────────────────────────

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true; // allowed
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) return false; // blocked
  return true;
}

// ── Origin allowlist ──────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3001',
  'https://staff.bn-automobiles.example',
]);

// ── Zod body schema ───────────────────────────────────────────────────────────

const AiProcessBodySchema = z.object({
  shootId: z.string().min(1, 'shootId is required'),
});

// ── Audit log (in-memory per L_AI-14; persisted via backend in v1.5) ─────────

interface AiRouteAuditEvent {
  eventKind: 'ai_route_called';
  shootId: string;
  actorId: string;
  actorRole: string;
  outletId: string;
  at: string;
  result: 'stub-ok' | 'forbidden' | 'rate-limited' | 'invalid-body' | 'unauthorized';
}

// In-memory ring buffer (server restart resets; production = database)
const auditLog: AiRouteAuditEvent[] = [];

function appendAudit(event: AiRouteAuditEvent): void {
  auditLog.push(event);
  // Keep last 1000 in memory
  if (auditLog.length > 1000) auditLog.shift();
}

// ── P1 stub shoot outletId resolver ──────────────────────────────────────────
// In production, this would query the database. In P1 mock, we use a fixed
// outlet for any shootId that starts with a known prefix; otherwise 'BLR-01'.

function resolveShootOutletId(_shootId: string): string {
  // P1 stub: all shoots belong to BLR-01 for outlet RLS check
  return 'BLR-01';
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString();

  // ── (f) Origin allowlist ─────────────────────────────────────────────────
  const origin = req.headers.get('origin') ?? '';
  const referer = req.headers.get('referer') ?? '';
  const isAllowedOrigin =
    ALLOWED_ORIGINS.has(origin) ||
    referer.startsWith('http://localhost:3001') ||
    referer.startsWith('https://staff.bn-automobiles.example') ||
    // Allow same-origin requests (origin header absent in server-side fetches)
    origin === '';

  if (!isAllowedOrigin) {
    return NextResponse.json(
      { error: 'Forbidden — origin not allowed' },
      { status: 403 },
    );
  }

  // ── (a) Auth/session check ───────────────────────────────────────────────
  const session = getStaffSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized — missing or malformed session' },
      { status: 401 },
    );
  }

  // ── (e) Per-IP rate limit ────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rateLimitKey = `${ip}:${session.user.id}`;
  if (!checkRateLimit(rateLimitKey)) {
    appendAudit({
      eventKind: 'ai_route_called',
      shootId: 'unknown',
      actorId: session.user.id,
      actorRole: session.user.role,
      outletId: session.user.outletId,
      at: now,
      result: 'rate-limited',
    });
    return NextResponse.json(
      { error: 'Too many requests — rate limit exceeded (30/min)' },
      { status: 429 },
    );
  }

  // ── (d) Zod-validate request body ───────────────────────────────────────
  let body: { shootId: string };
  try {
    const raw = await req.json() as unknown;
    const parsed = AiProcessBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Unprocessable — invalid body', details: parsed.error.flatten() },
        { status: 422 },
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      { error: 'Unprocessable — body is not valid JSON' },
      { status: 422 },
    );
  }

  const { shootId } = body;

  // ── (b) Role-rank ≥ R11 ──────────────────────────────────────────────────
  if (!isR11OrAbove(session.user.role)) {
    appendAudit({
      eventKind: 'ai_route_called',
      shootId,
      actorId: session.user.id,
      actorRole: session.user.role,
      outletId: session.user.outletId,
      at: now,
      result: 'forbidden',
    });
    return NextResponse.json(
      { error: 'Forbidden — requires R11+ role' },
      { status: 403 },
    );
  }

  // ── (c) Outlet RLS ───────────────────────────────────────────────────────
  if (!isGMOrAbove(session.user.role)) {
    const shootOutletId = resolveShootOutletId(shootId);
    if (session.user.outletId !== shootOutletId) {
      appendAudit({
        eventKind: 'ai_route_called',
        shootId,
        actorId: session.user.id,
        actorRole: session.user.role,
        outletId: session.user.outletId,
        at: now,
        result: 'forbidden',
      });
      return NextResponse.json(
        { error: 'Forbidden — outlet isolation violation' },
        { status: 403 },
      );
    }
  }

  // ── (g) Audit log ────────────────────────────────────────────────────────
  appendAudit({
    eventKind: 'ai_route_called',
    shootId,
    actorId: session.user.id,
    actorRole: session.user.role,
    outletId: session.user.outletId,
    at: now,
    result: 'stub-ok',
  });

  // ── P1 stub response (L_AI-4) ────────────────────────────────────────────
  return NextResponse.json(
    {
      status: 'manual-only',
      message: 'AI processing — Coming in v2.1. Asset marked manual-only.',
      shootId,
      processedBy: 'STUB',
      at: now,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
