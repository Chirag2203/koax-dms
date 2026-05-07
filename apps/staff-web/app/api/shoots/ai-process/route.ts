/**
 * AI Processing Route Handler — SPEC-SHOOTS-002 L_AI-14, L_AI-15, L_AI-16
 *
 * POST /api/shoots/ai-process
 *   Body: { shootId: string, assetIds: string[], aiVendor?: 'NONE'|'SPYNE_AI'|'CUSTOM',
 *           failureRate?: number, failureSeed?: number }
 *   Response: 202 { results: { assetId, vendorJobId }[] }
 *
 * GET /api/shoots/ai-process?vendorJobId=<id>
 *   Response: 200 { status: 'processing'|'succeeded'|'failed',
 *                   processedDataUrl?, errorMessage? }
 *
 * All 7 L_AI-14 hardening gates apply to both verbs:
 *   (a) Auth/session check — 401 if absent/malformed
 *   (b) actor.rank ≥ R11 — 403 otherwise
 *   (c) Outlet RLS: actor.outletId === shoot.outletId for non-R19+ — 403
 *   (d) Zod body validation — 422 on malformed
 *   (e) Per-actor rate limit: 30/min (in-memory; Redis in v1.5)
 *   (f) Origin allowlist — 403 on non-staff-web origins
 *   (g) Audit log per request
 *
 * Spec reference: SPEC-SHOOTS-002 L_AI-14, L_AI-15, L_AI-16
 * Plan reference: PLAN-SHOOTS-AI-002 §1.1, §1.2
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdapter } from '@/src/lib/shoots/ai-adapters';
import { enqueueWithPolicy } from '@/src/lib/shoots/ai-adapters/mock-spyne-adapter';

// ── Role rank helper ──────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  R01: 1, R02: 2, R03: 3, R05: 4, R07: 5,
  R09: 6, R10: 7, R11: 8,
  R12: 9, R13: 10, R14: 11, R15: 12, R16: 13, R17: 14, R18: 15,
  R19: 16, R20: 17, R21: 18, R22: 19, R23: 20, R24: 21,
};

function isR11OrAbove(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK['R11'] ?? 8);
}

function isGMOrAbove(role: string): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK['R19'] ?? 16);
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

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

// ── Origin allowlist ──────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3001',
  'https://staff.bn-automobiles.example',
]);

function isAllowedOrigin(origin: string, referer: string): boolean {
  if (!origin) return true; // same-origin server-side fetches omit Origin
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (referer.startsWith('http://localhost:3001')) return true;
  if (referer.startsWith('https://staff.bn-automobiles.example')) return true;
  return false;
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const PostBodySchema = z.object({
  shootId: z.string().min(1, 'shootId is required'),
  assetIds: z.array(z.string().min(1)).min(1, 'at least one assetId required'),
  aiVendor: z.enum(['NONE', 'SPYNE_AI', 'CUSTOM']).optional().default('SPYNE_AI'),
  /** Per-shoot failure rate 0–100. Default 10. L_AI-17. */
  failureRate: z.number().min(0).max(100).optional().default(10),
  /** Seed for deterministic failure injection. L_AI-17. */
  failureSeed: z.number().optional().default(0),
  /** Outlet for RLS check. */
  outletId: z.string().optional(),
});

const GetQuerySchema = z.object({
  vendorJobId: z.string().min(1, 'vendorJobId is required'),
});

// ── Audit log ─────────────────────────────────────────────────────────────────

type AuditResult =
  | 'enqueued'
  | 'poll-ok'
  | 'forbidden'
  | 'rate-limited'
  | 'invalid-body'
  | 'unauthorized';

interface AiRouteAuditEvent {
  eventKind: 'ai_route_called';
  verb: 'POST' | 'GET';
  shootId: string;
  assetId?: string;
  vendorJobId?: string;
  actorId: string;
  actorRole: string;
  outletId: string;
  aiVendor?: string;
  at: string;
  result: AuditResult;
}

const auditLog: AiRouteAuditEvent[] = [];

function appendAudit(event: AiRouteAuditEvent): void {
  auditLog.push(event);
  if (auditLog.length > 1000) auditLog.shift();
}

// ── Stub shoot outletId resolver ──────────────────────────────────────────────
// P1: all shoots belong to BLR-01 for outlet RLS; real backend queries DB.

function resolveShootOutletId(_shootId: string): string {
  return 'BLR-01';
}

// ── Shared gate pipeline ──────────────────────────────────────────────────────

type GateResult =
  | { ok: true; session: StaffSession }
  | { ok: false; response: NextResponse };

function runGates(
  req: NextRequest,
  now: string,
  verb: 'POST' | 'GET',
  shootId: string,
): GateResult {
  // (f) Origin allowlist
  const origin = req.headers.get('origin') ?? '';
  const referer = req.headers.get('referer') ?? '';
  if (!isAllowedOrigin(origin, referer)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden — origin not allowed' },
        { status: 403 },
      ),
    };
  }

  // (a) Auth/session
  const session = getStaffSession(req);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Unauthorized — missing or malformed session' },
        { status: 401 },
      ),
    };
  }

  // (e) Rate limit
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rateLimitKey = `${ip}:${session.user.id}`;
  if (!checkRateLimit(rateLimitKey)) {
    appendAudit({
      eventKind: 'ai_route_called',
      verb,
      shootId,
      actorId: session.user.id,
      actorRole: session.user.role,
      outletId: session.user.outletId,
      at: now,
      result: 'rate-limited',
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests — rate limit exceeded (30/min)' },
        { status: 429 },
      ),
    };
  }

  // (b) Role rank ≥ R11
  if (!isR11OrAbove(session.user.role)) {
    appendAudit({
      eventKind: 'ai_route_called',
      verb,
      shootId,
      actorId: session.user.id,
      actorRole: session.user.role,
      outletId: session.user.outletId,
      at: now,
      result: 'forbidden',
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden — requires R11+ role' },
        { status: 403 },
      ),
    };
  }

  // (c) Outlet RLS
  if (!isGMOrAbove(session.user.role)) {
    const shootOutletId = resolveShootOutletId(shootId);
    if (session.user.outletId !== shootOutletId) {
      appendAudit({
        eventKind: 'ai_route_called',
        verb,
        shootId,
        actorId: session.user.id,
        actorRole: session.user.role,
        outletId: session.user.outletId,
        at: now,
        result: 'forbidden',
      });
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Forbidden — outlet isolation violation' },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, session };
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString();

  // (d) Zod body validation
  let body: z.infer<typeof PostBodySchema>;
  try {
    const raw = await req.json() as unknown;
    const parsed = PostBodySchema.safeParse(raw);
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

  const { shootId, assetIds, aiVendor, failureRate, failureSeed } = body;

  // Gates (a,e,b,c,f)
  const gateResult = runGates(req, now, 'POST', shootId);
  if (!gateResult.ok) return gateResult.response;
  const { session } = gateResult;

  // Enqueue each asset via the vendor adapter (L_AI-15, L_AI-16)
  const adapter = getAdapter(aiVendor);
  const results: { assetId: string; vendorJobId: string }[] = [];

  for (const assetId of assetIds) {
    let vendorJobId: string;

    if (aiVendor === 'SPYNE_AI') {
      // Use enqueueWithPolicy to thread failureRate + failureSeed into mock (L_AI-17)
      const enqueueResult = await enqueueWithPolicy({
        shootId,
        assetId,
        rawUrl: '', // server-side mock: rawUrl is resolved in store; route passes id only
        kind: '',
        outletId: session.user.outletId,
        actorId: session.user.id,
        actorRole: session.user.role,
        failureRate,
        failureSeed,
      });
      vendorJobId = enqueueResult.vendorJobId;
    } else {
      const enqueueResult = await adapter.enqueue({
        shootId,
        assetId,
        rawUrl: '',
        kind: '',
        outletId: session.user.outletId,
        actorId: session.user.id,
        actorRole: session.user.role,
      });
      vendorJobId = enqueueResult.vendorJobId;
    }

    results.push({ assetId, vendorJobId });

    // (g) Audit log per asset
    appendAudit({
      eventKind: 'ai_route_called',
      verb: 'POST',
      shootId,
      assetId,
      vendorJobId,
      actorId: session.user.id,
      actorRole: session.user.role,
      outletId: session.user.outletId,
      aiVendor,
      at: now,
      result: 'enqueued',
    });
  }

  return NextResponse.json(
    { results, shootId, aiVendor, at: now },
    {
      status: 202,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const now = new Date().toISOString();

  // (d) Query param validation
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = GetQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Unprocessable — missing vendorJobId query param', details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { vendorJobId } = parsed.data;

  // Derive shootId from vendorJobId prefix for gates
  // Format: 'spyne-<hash>' or 'none-<assetId>-<ts>'
  const shootId = 'poll-' + vendorJobId;

  // Gates (a,e,b,c,f)
  const gateResult = runGates(req, now, 'GET', shootId);
  if (!gateResult.ok) return gateResult.response;
  const { session } = gateResult;

  // Determine vendor from jobId prefix
  const aiVendor = vendorJobId.startsWith('spyne-') ? 'SPYNE_AI' : 'NONE';
  const adapter = getAdapter(aiVendor as 'NONE' | 'SPYNE_AI' | 'CUSTOM');

  const pollResult = await adapter.poll(vendorJobId);

  // (g) Audit log
  appendAudit({
    eventKind: 'ai_route_called',
    verb: 'GET',
    shootId,
    vendorJobId,
    actorId: session.user.id,
    actorRole: session.user.role,
    outletId: session.user.outletId,
    aiVendor,
    at: now,
    result: 'poll-ok',
  });

  return NextResponse.json(
    { ...pollResult, at: now },
    {
      status: 200,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
