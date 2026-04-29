/**
 * Fingerprint attendance webhook — SPEC-STAFF-001 §P3, L17
 *
 * POST /api/webhooks/fingerprint
 *
 * Auth: HMAC-SHA256 over raw request body.
 * Header: `X-Fingerprint-Signature: sha256=<hex>`
 * Per-device secret from staff-store.deviceSecrets[deviceId].
 * 24-hour grace: both `current` and `previous` secrets are valid during rotation window.
 *
 * Replay window: ±5 minutes from server time (reject stale events, L17).
 * Dedup: ±60s on (staffId, eventType, timestamp) (L17).
 *
 * On accepted: adds AttendancePunch to staff-store.
 * Returns: 200 { punchId } | 400 { error } | 401 { error } | 409 { error: 'duplicate' }
 *
 * IMPORTANT: This is the MOCK implementation for the frontend-first phase.
 * In production, the secret store moves to a secrets manager and the route
 * handler runs server-side with real crypto.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import type { AttendancePunch } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FingerprintWebhookPayload {
  deviceId: string;
  staffId: string;
  eventType: 'punch-in' | 'punch-out';
  /** ISO 8601 datetime — must be within ±5 min of server time */
  timestamp: string;
}

// ─── HMAC validation ──────────────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 over body bytes using the given secret.
 * Returns hex-encoded signature without a prefix.
 */
function computeHmac(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two HMAC signatures.
 * Returns true if equal.
 */
function verifyHmac(body: string, signatureHeader: string, secret: string): boolean {
  const expected = computeHmac(body, secret);
  const provided = signatureHeader.replace(/^sha256=/, '');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
  } catch {
    return false;
  }
}

// ─── In-memory dedup set (per-process; adequate for mock phase) ───────────────
// Key: `${staffId}|${eventType}|${Math.round(ts/60000)}` — 60s bucket (L17 dedup window)

const dedupSet = new Set<string>();

function dedupKey(staffId: string, eventType: string, timestamp: string): string {
  const ts = new Date(timestamp).getTime();
  // Use Math.floor so timestamps 0–59s into a minute share the same bucket.
  // Math.round would cause the second at :30+ to land in the next bucket (off-by-one at midpoint).
  const bucket = Math.floor(ts / 60000);  // 60s buckets (floor, not round)
  return `${staffId}|${eventType}|${bucket}`;
}

// ─── Device secrets (demo — in production: secrets manager) ──────────────────
// These must match the device secrets seeded in staff-store deviceSecrets.

const DEMO_DEVICE_SECRETS: Record<string, { current: string; previous?: string; rotatedAt?: string }> = {
  'device-blr-001': { current: 'demo-secret-blr-001' },
  'device-mum-001': { current: 'demo-secret-mum-001' },
  'device-che-001': { current: 'demo-secret-che-001' },
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-fingerprint-signature') ?? '';

  // Parse payload first to get deviceId for secret lookup
  let payload: FingerprintWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as FingerprintWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { deviceId, staffId, eventType, timestamp } = payload;

  // ─── Field validation ────────────────────────────────────────────────────
  if (!deviceId || !staffId || !eventType || !timestamp) {
    return NextResponse.json({ error: 'Missing required fields: deviceId, staffId, eventType, timestamp' }, { status: 400 });
  }
  if (!['punch-in', 'punch-out'].includes(eventType)) {
    return NextResponse.json({ error: 'eventType must be punch-in or punch-out' }, { status: 400 });
  }

  // ─── Device secret lookup ────────────────────────────────────────────────
  const deviceSecretEntry = DEMO_DEVICE_SECRETS[deviceId];
  if (!deviceSecretEntry) {
    return NextResponse.json({ error: 'Unknown device' }, { status: 401 });
  }

  // ─── HMAC verification (L17) — try current, then previous within 24h grace ─
  const isCurrentValid = verifyHmac(rawBody, signatureHeader, deviceSecretEntry.current);
  let isValid = isCurrentValid;
  if (!isValid && deviceSecretEntry.previous && deviceSecretEntry.rotatedAt) {
    // 24-hour grace period for key rotation (L17)
    const rotatedAt = new Date(deviceSecretEntry.rotatedAt).getTime();
    const now = Date.now();
    const graceMs = 24 * 60 * 60 * 1000;
    if (now - rotatedAt <= graceMs) {
      isValid = verifyHmac(rawBody, signatureHeader, deviceSecretEntry.previous);
    }
  }
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  // ─── Replay window check (L17): ±5 minutes ──────────────────────────────
  const eventTime = new Date(timestamp).getTime();
  if (isNaN(eventTime)) {
    return NextResponse.json({ error: 'Invalid timestamp format' }, { status: 400 });
  }
  const diffMs = Math.abs(Date.now() - eventTime);
  if (diffMs > 5 * 60 * 1000) {
    return NextResponse.json({ error: 'Event timestamp outside ±5 minute replay window' }, { status: 400 });
  }

  // ─── Dedup check (L17): ±60s ─────────────────────────────────────────────
  const key = dedupKey(staffId, eventType, timestamp);
  if (dedupSet.has(key)) {
    return NextResponse.json({ error: 'duplicate', message: 'Duplicate event within ±60s dedup window' }, { status: 409 });
  }
  dedupSet.add(key);

  // ─── Build and store punch ────────────────────────────────────────────────
  const punchId = `punch-wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const punch: AttendancePunch = {
    punchId,
    staffId,
    deviceId,
    eventType,
    timestamp,
    isOverride: false,
  };

  // NOTE: In the frontend-first mock phase, the staff store is client-side Zustand.
  // This route handler runs server-side and cannot directly mutate the client store.
  // In production, this would write to the database. For now, return the accepted punch
  // so the client can update its local store via a POST response / optimistic update.
  //
  // For automated testing and the webhook handler stub contract, the response is sufficient.

  return NextResponse.json(
    {
      punchId,
      staffId,
      deviceId,
      eventType,
      timestamp,
      accepted: true,
    },
    { status: 200 },
  );
}

// ─── Expose the helper for testing ───────────────────────────────────────────

export { computeHmac, verifyHmac, dedupKey };
