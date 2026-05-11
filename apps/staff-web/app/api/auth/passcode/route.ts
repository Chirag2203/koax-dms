/**
 * POST /api/auth/passcode
 *
 * Body: { passcode: string }
 * On match:
 *   - Sets HttpOnly signed cookie `staff_auth` (HMAC-SHA256 via Web Crypto).
 *   - Returns 200 { ok: true }.
 * On mismatch / missing env:
 *   - Returns 401 { ok: false, error: 'INVALID_PASSCODE' | 'CONFIG' }.
 *   - Includes a 1s artificial delay to slow brute-force attempts.
 *
 * Env required (set in Vercel project settings):
 *   - LOGIN_PASSCODE — the shared passcode
 *   - AUTH_SECRET    — HMAC signing key (generate with: `openssl rand -hex 32`)
 *
 * Both env vars MUST live in server-side env (NOT prefixed with NEXT_PUBLIC_)
 * — they must never reach the client bundle.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE_SECONDS,
  issueAuthToken,
  timingSafePasscodeMatch,
} from '@/src/lib/auth/passcode-cookie';

// In-memory rate limit per process. Production = Redis. Adequate for demo.
const ATTEMPTS = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS = 10;

function rateLimitKey(req: NextRequest): string {
  // x-forwarded-for is the canonical client IP on Vercel
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0]?.trim() || 'unknown';
}

function rateLimit(req: NextRequest): { ok: true } | { ok: false; retryAfter: number } {
  const key = rateLimitKey(req);
  const now = Date.now();
  const entry = ATTEMPTS.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    ATTEMPTS.set(key, { count: 1, firstAt: now });
    return { ok: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfter: Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000),
    };
  }
  entry.count += 1;
  return { ok: true };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limit = rateLimit(req);
  if (!limit.ok) {
    const res = NextResponse.json(
      { ok: false, error: 'RATE_LIMITED' },
      { status: 429 },
    );
    res.headers.set('Retry-After', String(limit.retryAfter));
    return res;
  }

  const passcode = process.env.LOGIN_PASSCODE;
  const secret = process.env.AUTH_SECRET;
  if (!passcode || !secret) {
    return NextResponse.json({ ok: false, error: 'CONFIG' }, { status: 500 });
  }

  let body: { passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_PASSCODE' }, { status: 400 });
  }

  const provided =
    typeof body.passcode === 'string' && body.passcode.length > 0 && body.passcode.length < 256
      ? body.passcode
      : null;

  if (!provided) {
    await delay(1000);
    return NextResponse.json({ ok: false, error: 'INVALID_PASSCODE' }, { status: 401 });
  }

  // Constant-time compare against the env var.
  const matches = timingSafePasscodeMatch(provided, passcode);

  // Pad slow path for unmatched attempts to hinder timing analysis.
  if (!matches) {
    await delay(1000);
    return NextResponse.json({ ok: false, error: 'INVALID_PASSCODE' }, { status: 401 });
  }

  const token = await issueAuthToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
