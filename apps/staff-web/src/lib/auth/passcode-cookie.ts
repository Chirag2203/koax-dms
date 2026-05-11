/**
 * Passcode-gate auth cookie helpers (Edge-compatible).
 *
 * Tamper-proof flow:
 *   1. User POSTs the passcode to `/api/auth/passcode`.
 *   2. Server constant-time-compares against `process.env.LOGIN_PASSCODE`.
 *   3. On match, server signs a payload `{ ok: 1, exp: <epoch> }` with
 *      HMAC-SHA256 using `process.env.AUTH_SECRET` and sets a cookie:
 *        `staff_auth=<base64url(payload)>.<base64url(signature)>`
 *      with attributes: `HttpOnly; Secure; SameSite=Lax; Path=/`.
 *   4. Middleware on every request verifies the cookie by re-signing the
 *      payload and constant-time-comparing the signature. Forgery requires
 *      `AUTH_SECRET` which never leaves the server.
 *
 * Why this design beats `localStorage` + a JS-set flag:
 *   - `HttpOnly` means JavaScript (and therefore browser DevTools' console)
 *     cannot read or modify the cookie.
 *   - Even if an attacker writes the cookie via the network (e.g. via
 *     DevTools' Application panel), the HMAC signature won't match without
 *     the server-side secret.
 *   - Constant-time comparison prevents timing-attack leakage of the
 *     valid signature.
 *
 * Uses Web Crypto (`crypto.subtle`) so this works in both the Edge runtime
 * (Next.js middleware) and the Node runtime (route handlers).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const AUTH_COOKIE_NAME = 'staff_auth';

/** 7-day cookie lifetime. Re-prompt for passcode after expiry. */
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

// ─── Encoding helpers ─────────────────────────────────────────────────────────

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const buf =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── HMAC ─────────────────────────────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return toBase64Url(sig);
}

/** Constant-time comparison of two equal-length byte sequences. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

// ─── Token issue + verify ────────────────────────────────────────────────────

interface AuthPayload {
  /** `1` if authenticated. Always 1 in this single-passcode mode. */
  ok: 1;
  /** Expiry epoch seconds. */
  exp: number;
}

/**
 * Issue a signed auth token. Caller sets it as a cookie:
 *   `staff_auth=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...`
 */
export async function issueAuthToken(secret: string): Promise<string> {
  const payload: AuthPayload = {
    ok: 1,
    exp: Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SECONDS,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes);
  const signature = await sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a token. Returns true iff the signature is valid AND not expired.
 * Returns false on any malformed input — never throws.
 */
export async function verifyAuthToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) return false;

  // Re-sign the payload with the server secret.
  let expectedSignature: string;
  try {
    expectedSignature = await sign(payloadB64, secret);
  } catch {
    return false;
  }

  // Constant-time compare to prevent timing leaks.
  let provided: Uint8Array;
  let expected: Uint8Array;
  try {
    provided = fromBase64Url(signatureB64);
    expected = fromBase64Url(expectedSignature);
  } catch {
    return false;
  }
  if (!timingSafeEqual(provided, expected)) return false;

  // Parse + check expiry.
  let payload: AuthPayload;
  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    payload = JSON.parse(json) as AuthPayload;
  } catch {
    return false;
  }
  if (payload.ok !== 1) return false;
  if (typeof payload.exp !== 'number') return false;
  if (Math.floor(Date.now() / 1000) >= payload.exp) return false;

  return true;
}

/** Constant-time string compare (UTF-8). */
export function timingSafePasscodeMatch(provided: string, expected: string): boolean {
  // Reject empty / unset env early — never allow login if passcode unset.
  if (!expected || expected.length === 0) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  // Pad shorter side to longer to keep compare time independent of provided length.
  const max = Math.max(a.length, b.length);
  const aPad = new Uint8Array(max);
  const bPad = new Uint8Array(max);
  aPad.set(a);
  bPad.set(b);
  return timingSafeEqual(aPad, bPad) && a.length === b.length;
}
