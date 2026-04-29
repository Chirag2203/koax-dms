/**
 * Error boundary architecture tests.
 *
 * Verifies that every shell module has an `error.tsx` file at the root of
 * its route subtree, plus the shell-level boundary and the global one.
 *
 * If a new module is added under `app/(shell)/<module>/` without a
 * corresponding `error.tsx`, this test fails — preventing the "one bug
 * crashes the whole app" regression we hit on 2026-04-29.
 *
 * Spec reference: SPEC-ARCH-UI-001 §11 (Error Handling).
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APP_ROOT = join(__dirname, '..', '..', 'app');
const SHELL_ROOT = join(APP_ROOT, '(shell)');

function listShellModules(): string[] {
  return readdirSync(SHELL_ROOT)
    .filter((entry) => statSync(join(SHELL_ROOT, entry)).isDirectory())
    .sort();
}

describe('Error boundary architecture (SPEC-ARCH-UI-001 §11)', () => {
  it('every shell module has an error.tsx at its route root', () => {
    const modules = listShellModules();
    const missing: string[] = [];
    for (const mod of modules) {
      const errorTsx = join(SHELL_ROOT, mod, 'error.tsx');
      if (!existsSync(errorTsx)) missing.push(mod);
    }
    if (missing.length > 0) {
      throw new Error(
        '\n🚫 Missing error.tsx in shell modules: ' +
          missing.join(', ') +
          '\nEvery `app/(shell)/<module>/` MUST have an error.tsx that renders ' +
          '<ModuleErrorFallback moduleName="..." />. Without it, a crash in this ' +
          'module bubbles up and kills the whole app shell.',
      );
    }
    expect(missing).toEqual([]);
  });

  it('every module error.tsx imports the canonical ModuleErrorFallback', () => {
    const modules = listShellModules();
    const offenders: string[] = [];
    for (const mod of modules) {
      const errorTsx = join(SHELL_ROOT, mod, 'error.tsx');
      if (!existsSync(errorTsx)) continue; // first test catches missing
      const src = readFileSync(errorTsx, 'utf8');
      if (!src.includes('ModuleErrorFallback')) offenders.push(mod);
    }
    if (offenders.length > 0) {
      throw new Error(
        '\n🚫 Module error.tsx files NOT using ModuleErrorFallback: ' +
          offenders.join(', ') +
          '\nUse the canonical primitive — do NOT roll a custom fallback. ' +
          "Pattern: `<ModuleErrorFallback moduleName='Foo' error={error} reset={reset} />`",
      );
    }
    expect(offenders).toEqual([]);
  });

  it('shell-level error boundary exists at app/(shell)/error.tsx', () => {
    expect(existsSync(join(SHELL_ROOT, 'error.tsx'))).toBe(true);
  });

  it('global error boundary exists at app/global-error.tsx', () => {
    expect(existsSync(join(APP_ROOT, 'global-error.tsx'))).toBe(true);
  });

  it('global error boundary renders <html> + <body> (App Router requirement)', () => {
    const src = readFileSync(join(APP_ROOT, 'global-error.tsx'), 'utf8');
    // Per Next.js docs, global-error replaces the root layout; it MUST
    // render its own html/body or React errors at runtime.
    expect(src).toMatch(/<html\b/);
    expect(src).toMatch(/<body\b/);
  });

  it("every module error.tsx is marked 'use client' (required by Next.js)", () => {
    const modules = listShellModules();
    const offenders: string[] = [];
    for (const mod of modules) {
      const errorTsx = join(SHELL_ROOT, mod, 'error.tsx');
      if (!existsSync(errorTsx)) continue;
      const src = readFileSync(errorTsx, 'utf8');
      // Must be the first non-blank line
      const firstNonComment = src
        .split('\n')
        .find((l) => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && !l.trim().startsWith('*'));
      if (firstNonComment !== "'use client';") {
        offenders.push(mod);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        "\n🚫 error.tsx files missing 'use client' directive: " +
          offenders.join(', ') +
          "\nNext.js requires error boundaries to be client components.",
      );
    }
    expect(offenders).toEqual([]);
  });
});
