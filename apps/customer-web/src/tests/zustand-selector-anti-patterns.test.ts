/**
 * Zustand selector anti-pattern guardrail (customer-web).
 *
 * Mirrors the staff-web test of the same name. The staff-web test only walks
 * `apps/staff-web/src`, which is why a customer-web instance of the bug
 * slipped through (commit fc5e282 → react #185 from
 * `selectStorefrontGalleryForVin` called inside `useStore(...)`). Each app
 * gets its own walker.
 *
 * Per CLAUDE.md §17 #14 — Zustand selectors must return base refs. Patterns
 * that return fresh references on every call cause "Maximum update depth
 * exceeded" (React error #185).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP_ROOT = join(__dirname, '..', '..', 'app');
const SRC_ROOT = join(__dirname, '..', '..', 'src');
const REPO_ROOT = join(__dirname, '..', '..');

function walk(dir: string, results: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const name of entries) {
    if (
      name === 'node_modules' ||
      name === '.next' ||
      name === '__tests__' ||
      name === 'tests' ||
      name.startsWith('.') ||
      name === 'dist'
    ) {
      continue;
    }
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) {
      walk(abs, results);
    } else if (
      (name.endsWith('.tsx') || name.endsWith('.ts')) &&
      !name.endsWith('.test.ts') &&
      !name.endsWith('.test.tsx') &&
      !name.endsWith('.stories.tsx')
    ) {
      results.push(abs);
    }
  }
  return results;
}

function relPath(abs: string): string {
  return relative(REPO_ROOT, abs).replace(/\\/g, '/');
}

const SELECTOR_NULLISH_ARRAY_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*[^)]*\?\?\s*\[\]\s*\)/g;
const SELECTOR_NULLISH_OBJECT_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*[^)]*\?\?\s*\{\s*\}\s*\)/g;
const SELECTOR_FRESH_METHOD_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.[\w.]*\.(?:filter|map|sort|slice|reverse|concat|flatMap|flat|reduce)\s*\(/g;
// Allowlist `*ById` since Record lookups are stable refs.
const SELECTOR_STORE_METHOD_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.select(?!\w*ById\b)[A-Z]\w*\s*\(/g;

interface Violation {
  file: string;
  line: number;
  match: string;
  pattern: 'nullish-array' | 'nullish-object' | 'fresh-method' | 'store-selector-fn';
}

function stripComments(src: string): string {
  // Replace block comments and line comments with spaces (preserving line
  // numbers for accurate violation reporting). Comments often quote the
  // exact anti-pattern shape they're warning against — without this strip,
  // the test flags them as real bugs.
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1: string) => `${p1}${''}`);
  return out;
}

function scanFile(abs: string): Violation[] {
  const rawSrc = readFileSync(abs, 'utf8');
  const src = stripComments(rawSrc);
  const out: Violation[] = [];
  for (const re of [
    { re: SELECTOR_NULLISH_ARRAY_RE, kind: 'nullish-array' as const },
    { re: SELECTOR_NULLISH_OBJECT_RE, kind: 'nullish-object' as const },
    { re: SELECTOR_FRESH_METHOD_RE, kind: 'fresh-method' as const },
    { re: SELECTOR_STORE_METHOD_RE, kind: 'store-selector-fn' as const },
  ]) {
    re.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.re.exec(src)) !== null) {
      const before = src.substring(0, m.index);
      const line = before.split('\n').length;
      out.push({
        file: relPath(abs),
        line,
        match: (m[0] ?? '').trim().slice(0, 120),
        pattern: re.kind,
      });
    }
  }
  return out;
}

describe('Zustand selector anti-patterns — customer-web (CLAUDE.md §17 #14)', () => {
  const files = [...walk(APP_ROOT), ...walk(SRC_ROOT)];

  it('no `?? []` selectors (fresh array literal)', () => {
    const violations = files.flatMap(scanFile).filter((v) => v.pattern === 'nullish-array');
    if (violations.length > 0) {
      const summary = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.match}`).join('\n');
      throw new Error(`Found ${violations.length} fresh-array selectors:\n${summary}`);
    }
    expect(violations.length).toBe(0);
  });

  it('no `?? {}` selectors (fresh object literal)', () => {
    const violations = files.flatMap(scanFile).filter((v) => v.pattern === 'nullish-object');
    if (violations.length > 0) {
      const summary = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.match}`).join('\n');
      throw new Error(`Found ${violations.length} fresh-object selectors:\n${summary}`);
    }
    expect(violations.length).toBe(0);
  });

  it('no `.filter()` / `.map()` / etc. inside selectors', () => {
    const violations = files.flatMap(scanFile).filter((v) => v.pattern === 'fresh-method');
    if (violations.length > 0) {
      const summary = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.match}`).join('\n');
      throw new Error(
        `Found ${violations.length} selectors calling fresh-array methods. ` +
          `Pull base ref via the hook; compute in useMemo outside.\n${summary}`,
      );
    }
    expect(violations.length).toBe(0);
  });

  it('no store-side `selectXxx()` calls inside selectors (excluding `*ById`)', () => {
    const violations = files.flatMap(scanFile).filter((v) => v.pattern === 'store-selector-fn');
    if (violations.length > 0) {
      const summary = violations.map((v) => `  ${v.file}:${v.line}\n    ${v.match}`).join('\n');
      throw new Error(
        `Found ${violations.length} store-selector-fn calls inside useStore. ` +
          `These commonly filter internally and return a fresh array per call → ` +
          `infinite re-render (React #185). Fix: pull base collection, derive in useMemo.\n${summary}`,
      );
    }
    expect(violations.length).toBe(0);
  });
});
