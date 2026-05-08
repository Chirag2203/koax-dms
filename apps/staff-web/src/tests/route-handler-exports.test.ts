/**
 * Next.js App Router route-handler export guardrail.
 *
 * Catches: arbitrary exports from `app/.../route.ts` files. The Next.js
 * App Router permits ONLY:
 *   - HTTP method handlers: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD
 *   - Config exports: dynamic, dynamicParams, revalidate, fetchCache,
 *     runtime, preferredRegion, maxDuration
 *   - generateStaticParams (special-case)
 *
 * Anything else (helpers, audit logs, type re-exports) MUST live in a
 * sibling file. The convention is a leading-underscore filename
 * (e.g. `_helpers.ts`, `_audit-log.ts`) which Next.js excludes from
 * routing.
 *
 * Two production-build failures in the same day (commits `5d4aa29` for
 * intake PDF route, plus the fingerprint route caught by Vercel after)
 * pushed this rule to a guardrail test. `tsc --noEmit` and vitest both
 * miss the route-shape constraint — only `next build` enforces it. We
 * front-run that here.
 *
 * Run: pnpm -F staff-web exec vitest run src/tests/route-handler-exports.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_ROOT = join(__dirname, '..', '..', 'app');
const REPO_ROOT = join(__dirname, '..', '..');

const ALLOWED_EXPORTS = new Set([
  // HTTP method handlers
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'OPTIONS',
  'HEAD',
  // Config exports
  'dynamic',
  'dynamicParams',
  'revalidate',
  'fetchCache',
  'runtime',
  'preferredRegion',
  'maxDuration',
  // Static params
  'generateStaticParams',
  'generateMetadata',
]);

function findRouteFiles(dir: string, results: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      findRouteFiles(abs, results);
    } else if (name === 'route.ts' || name === 'route.tsx') {
      results.push(abs);
    }
  }
  return results;
}

interface Violation {
  file: string;
  line: number;
  exportName: string;
  full: string;
}

// Match common export forms — function, async function, const/let/var,
// type/interface, and re-export `export { name }`.
//
// Group 1: the symbol name we care about.
const EXPORT_PATTERNS: { re: RegExp; group: number }[] = [
  // export async function NAME (
  { re: /^export\s+(?:async\s+)?function\s+(\w+)\s*\(/gm, group: 1 },
  // export const NAME =  (also let / var)
  { re: /^export\s+(?:const|let|var)\s+(\w+)\s*[:=]/gm, group: 1 },
  // export class NAME
  { re: /^export\s+(?:abstract\s+)?class\s+(\w+)/gm, group: 1 },
  // export type / interface NAME
  { re: /^export\s+(?:type|interface)\s+(\w+)/gm, group: 1 },
];

// Re-export form `export { foo, bar }` — needs special handling.
const REEXPORT_RE = /^export\s*\{\s*([^}]+)\s*\}/gm;

function scanFile(abs: string): Violation[] {
  const src = readFileSync(abs, 'utf8');
  const lineOf = (idx: number): number => src.substring(0, idx).split('\n').length;
  const out: Violation[] = [];

  for (const { re, group } of EXPORT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const name = m[group];
      if (!name) continue;
      if (!ALLOWED_EXPORTS.has(name)) {
        out.push({
          file: relative(REPO_ROOT, abs).replace(/\\/g, '/'),
          line: lineOf(m.index),
          exportName: name,
          full: (m[0] ?? '').trim().slice(0, 100),
        });
      }
    }
  }

  // Re-exports: `export { foo, bar as baz }`
  REEXPORT_RE.lastIndex = 0;
  let mm: RegExpExecArray | null;
  while ((mm = REEXPORT_RE.exec(src)) !== null) {
    const list = mm[1] ?? '';
    const names = list.split(',').map((s) => {
      const trimmed = s.trim();
      // `foo as bar` → bar (the exposed name)
      const asMatch = /\sas\s+(\w+)$/.exec(trimmed);
      if (asMatch?.[1]) return asMatch[1];
      return trimmed;
    });
    for (const name of names) {
      if (!name) continue;
      if (!ALLOWED_EXPORTS.has(name)) {
        out.push({
          file: relative(REPO_ROOT, abs).replace(/\\/g, '/'),
          line: lineOf(mm.index),
          exportName: name,
          full: (mm[0] ?? '').trim().slice(0, 100),
        });
      }
    }
  }

  return out;
}

describe('Next.js App Router route-handler exports — guardrail', () => {
  it('every `route.ts` exports ONLY HTTP method handlers + Next.js config keys', () => {
    const files = findRouteFiles(APP_ROOT);
    const violations: Violation[] = [];
    for (const f of files) {
      violations.push(...scanFile(f));
    }

    if (violations.length > 0) {
      const summary = violations
        .map(
          (v) =>
            `  ${v.file}:${v.line}\n    exports "${v.exportName}"\n    ${v.full}`,
        )
        .join('\n');
      throw new Error(
        `Found ${violations.length} forbidden export(s) from Next.js route handler files. ` +
          `Next.js App Router only allows: GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD, ` +
          `dynamic, revalidate, runtime, generateStaticParams, etc. Anything else fails ` +
          `the production build with "<name> is not a valid Route export field".\n\n` +
          `Move the export to a sibling module (convention: leading-underscore filename ` +
          `like \`_helpers.ts\` or \`_audit-log.ts\`, which Next.js excludes from routing).\n\n` +
          summary,
      );
    }
    expect(violations.length).toBe(0);
  });
});
