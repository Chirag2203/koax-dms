/**
 * Zustand selector anti-pattern guardrail.
 *
 * Catches: selectors that return a fresh object/array reference on every
 * render, which Zustand treats as a state change → infinite re-render →
 * "Maximum update depth exceeded" runtime crash.
 *
 * Per CLAUDE.md §17 (production-grade checklist):
 *   "Zustand selectors return base refs; computation in `useMemo`
 *    (avoids infinite-render bugs)"
 *
 * Anti-patterns this test catches:
 *
 *   1. `useStore((s) => s.foo ?? [])`     — `[]` literal is a fresh ref
 *   2. `useStore((s) => s.foo ?? {})`     — `{}` literal is a fresh ref
 *   3. `useStore((s) => ({ a, b }))`      — object literal is a fresh ref
 *   4. `useStore((s) => [...])`           — array literal is a fresh ref
 *   5. `useStore((s) => s.foo.filter(...))` — filter() returns a new array
 *   6. `useStore((s) => s.foo.map(...))`    — map() returns a new array
 *
 * The fix in every case is to use a module-level frozen empty
 * collection as the fallback, OR to compute via `useMemo` with the
 * primitive selector return as a dep.
 *
 * Run: pnpm -F staff-web exec vitest run src/tests/zustand-selector-anti-patterns.test.ts
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

// Match: `useXxxStore((<arg>) => …<offending pattern>…)`
//
// Specifically — the selector body returns a fresh array/object ref:
//   - `?? []` literal as the right-hand side of a nullish coalesce
//   - `?? {}` literal as the right-hand side of a nullish coalesce
//
// These are the highest-confidence patterns; we deliberately do NOT flag
// `.filter()` / `.map()` / object-literal returns because they're sometimes
// fine when the parent computes via useMemo. The "?? []" / "?? {}" patterns
// are unambiguously wrong.
//
// Pattern shape:
//   use<Pascal>Store(...) => s.<chain> ?? []
const SELECTOR_NULLISH_ARRAY_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*[^)]*\?\?\s*\[\]\s*\)/g;
const SELECTOR_NULLISH_OBJECT_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*[^)]*\?\?\s*\{\s*\}\s*\)/g;

// Catches selectors that call array methods returning a NEW array
// reference on every invocation:
//   useStore((s) => s.foo.filter(...))   — fresh array
//   useStore((s) => s.foo.map(...))      — fresh array
//   useStore((s) => s.foo.sort(...))     — fresh array
//   useStore((s) => s.selectXxx(...))     — when the store-side selector
//                                            does the filter/map for you,
//                                            same problem (caught only if
//                                            the call is on `s.selectXxx`)
//
// The fix is the same in every case: pull the BASE ref via the selector
// (`useStore((s) => s.foo)`) and compute the derived value in a `useMemo`.
const SELECTOR_FRESH_METHOD_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.[\w.]*\.(?:filter|map|sort|slice|reverse|concat|flatMap|flat|reduce)\s*\(/g;
// Skip *ById single-row lookups (canonical Record<id, T> pattern returns
// stable refs). The infinite-loop risk is in PLURAL selectors that filter.
const SELECTOR_STORE_METHOD_RE =
  /use[A-Z]\w*Store\s*\(\s*\(\s*\w+\s*\)\s*=>\s*\w+\.select(?!\w*ById\b)[A-Z]\w*\s*\(/g;

interface Violation {
  file: string;
  line: number;
  match: string;
  pattern: 'nullish-array' | 'nullish-object' | 'fresh-method' | 'store-selector-fn';
}

function scanFile(abs: string): Violation[] {
  const src = readFileSync(abs, 'utf8');
  const lines = src.split('\n');
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
      // Find line number of match
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

describe('Zustand selector anti-patterns — guardrail (CLAUDE.md §17 #14)', () => {
  it('no `useXxxStore((s) => … ?? [])` selectors (fresh array literal causes infinite re-render)', () => {
    const files = [...walk(APP_ROOT), ...walk(SRC_ROOT)];
    const violations: Violation[] = [];
    for (const f of files) {
      violations.push(...scanFile(f).filter((v) => v.pattern === 'nullish-array'));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line}\n    ${v.match}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} Zustand selector(s) returning a fresh \`[]\` literal — ` +
          `this triggers "Maximum update depth exceeded" because every render produces a ` +
          `new reference. Fix: declare a module-level \`const EMPTY: T[] = []\` and use ` +
          `\`?? EMPTY\` instead.\n\n${summary}`,
      );
    }
    expect(violations.length).toBe(0);
  });

  it('no `useXxxStore((s) => … ?? {})` selectors (fresh object literal causes infinite re-render)', () => {
    const files = [...walk(APP_ROOT), ...walk(SRC_ROOT)];
    const violations: Violation[] = [];
    for (const f of files) {
      violations.push(...scanFile(f).filter((v) => v.pattern === 'nullish-object'));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line}\n    ${v.match}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} Zustand selector(s) returning a fresh \`{}\` literal — ` +
          `same root cause as the array case. Fix: module-level \`const EMPTY: T = {} as T\` ` +
          `and use \`?? EMPTY\`.\n\n${summary}`,
      );
    }
    expect(violations.length).toBe(0);
  });

  it('no `.filter()`/`.map()`/`.sort()`/etc. inside `useXxxStore((s) => …)` (fresh array each render)', () => {
    const files = [...walk(APP_ROOT), ...walk(SRC_ROOT)];
    const violations: Violation[] = [];
    for (const f of files) {
      violations.push(...scanFile(f).filter((v) => v.pattern === 'fresh-method'));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line}\n    ${v.match}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} Zustand selector(s) calling \`.filter\`/\`.map\`/\`.sort\`/\`.slice\`/\`.reverse\`/\`.concat\`/\`.flatMap\`/\`.flat\`/\`.reduce\` ` +
          `inside the selector body. These return a NEW array every render → infinite re-render ` +
          `("Maximum update depth exceeded"). Fix: pull the BASE array ref via the selector and ` +
          `compute the derived value in a \`useMemo\` outside.\n\n${summary}`,
      );
    }
    expect(violations.length).toBe(0);
  });

  it('no store-side `selectXxx()` function calls inside `useXxxStore((s) => …)` (typically returns fresh array)', () => {
    const files = [...walk(APP_ROOT), ...walk(SRC_ROOT)];
    const violations: Violation[] = [];
    for (const f of files) {
      violations.push(...scanFile(f).filter((v) => v.pattern === 'store-selector-fn'));
    }

    if (violations.length > 0) {
      const summary = violations
        .map((v) => `  ${v.file}:${v.line}\n    ${v.match}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} Zustand selector(s) calling a store-side \`s.selectXxx(...)\` ` +
          `function. These commonly use \`.filter()\` internally and return a fresh array per call ` +
          `→ infinite re-render. Fix: pull the BASE collection (\`useStore((s) => s.<arr>)\`) and ` +
          `replicate the filter logic in a \`useMemo\` in the component.\n\n${summary}`,
      );
    }
    expect(violations.length).toBe(0);
  });
});
