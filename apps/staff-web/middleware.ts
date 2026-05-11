/**
 * Passcode gate for staff-web.
 *
 * Runs on every request before the route handler. If the visitor doesn't
 * have a valid `staff_auth` cookie (HMAC-signed by `AUTH_SECRET`), we
 * redirect them to `/auth/passcode` where they enter the shared passcode.
 *
 * Public paths (no auth required):
 *   - `/auth/passcode` (the login page itself)
 *   - `/api/auth/passcode` (the verification endpoint)
 *   - `/api/auth/logout`
 *   - `/_next/*` static assets
 *   - `/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/assets/*`
 *
 * Why a middleware rather than per-page client-side check:
 *   - Server-enforced. JavaScript inspect-element can't set
 *     `isAuthenticated=true` because the cookie is HttpOnly + HMAC-signed.
 *   - Runs before any route HTML is served, so deep-link refreshes work.
 *   - No flash of authenticated content for unauthenticated visitors.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/src/lib/auth/passcode-cookie';

const PUBLIC_PATH_PREFIXES = [
  '/auth/passcode',
  '/api/auth/passcode',
  '/api/auth/logout',
  '/_next/',
  '/assets/',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  // If AUTH_SECRET is unset, refuse to serve protected content rather
  // than silently passing through. Fail-closed.
  if (!secret) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/passcode';
    url.searchParams.set('error', 'config');
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const ok = await verifyAuthToken(token, secret);

  if (ok) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to passcode page with the original target
  // so we can bounce back on success.
  const url = req.nextUrl.clone();
  url.pathname = '/auth/passcode';
  url.search = '';
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

/**
 * Matcher excludes static files + RSC payloads + image optimisation routes
 * so the auth check only runs on real page/API requests. Everything else
 * is handled by the runtime PUBLIC_PATH_PREFIXES check above for an extra
 * belt-and-braces layer.
 */
export const config = {
  matcher: [
    // Apply to every path EXCEPT:
    //   - Next.js internals (_next/static, _next/image, _next/data)
    //   - Common static files at root
    //   - Files with an extension (assets)
    '/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)',
  ],
};
