/**
 * POST /api/auth/logout
 *
 * Clears the `staff_auth` cookie. Middleware then redirects subsequent
 * requests to `/auth/passcode`.
 */

import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/src/lib/auth/passcode-cookie';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
