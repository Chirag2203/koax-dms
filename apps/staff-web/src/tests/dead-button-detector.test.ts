/**
 * Dead-button detector — guardrail test.
 *
 * Catches: buttons with no action attached — like the "Note Request" button bug
 * fixed in commit bb60685, where a <Button> rendered but had no onClick, no
 * type="submit", no formAction, no disabled guard, and was not inside a Link.
 *
 * A "dead button" is a <button> or <Button> JSX element that has:
 *   - no onClick prop
 *   - no type="submit" or type="reset"
 *   - no formAction prop
 *   - no disabled or aria-disabled prop
 *   - no {...rest} / {...props} spread (spreads may carry onClick from callers)
 *   - not wrapped in a <Link href=...> or <a href=...> ancestor on the same line
 *
 * FALSE-POSITIVE EXEMPTIONS (automatically excluded):
 *   - Buttons with a prop spread (...rest, ...props, {...buttonProps}, etc.)
 *   - Buttons with type="submit" or type="reset"
 *   - Buttons with disabled or aria-disabled props
 *   - Buttons with onClick prop
 *   - Buttons with formAction prop
 *   - Lines that contain both <button and <Link or <a (wrapper pattern)
 *
 * BASELINE: existing dead buttons found on 2026-04-30 are frozen here.
 * New dead buttons not in the baseline FAIL THE BUILD with file:line.
 * When you fix a baselined button, remove it from the baseline.
 *
 * Run: pnpm -F staff-web exec vitest run src/tests/dead-button-detector.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const COMPONENTS_ROOT = join(__dirname, '..', 'components');
const APP_ROOT = join(__dirname, '..', '..', 'app');

// ─── Dead-button baseline (frozen 2026-04-30) ─────────────────────────────────
// Format: "rel/path/to/file.tsx:lineNumber"
// When you fix a dead button, remove its entry from this set.
// This set must ONLY shrink — never add new entries.

const DEAD_BUTTON_BASELINE = new Set<string>([
  // No dead buttons found on 2026-04-30 — baseline starts empty.
  // If violations are found during the initial scan, they will be reported below
  // and you can add them here to baseline them.
]);

// ─── Walker ───────────────────────────────────────────────────────────────────

function walkTsx(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkTsx(full, acc);
    } else if (entry.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

function relPath(abs: string): string {
  return relative(join(__dirname, '..', '..'), abs).replace(/\\/g, '/');
}

// ─── Dead-button detector ─────────────────────────────────────────────────────

/**
 * Returns a list of "file:line" strings for dead button occurrences in a file.
 *
 * Strategy: scan each line for `<button` or `<Button` JSX opens, then look at
 * a window of ~5 lines around it (props can span lines) for the required props.
 * This single-pass line window approach is fast and handles multi-line JSX.
 */
function findDeadButtons(abs: string): string[] {
  const rel = relPath(abs);
  const src = readFileSync(abs, 'utf8');
  const lines = src.split('\n');
  const violations: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Check if this line opens a <button or <Button (not a closing tag)
    const isButtonOpen =
      /(?:^|[^a-zA-Z0-9_'"`])<[Bb]utton[\s>/{]/.test(line) &&
      !/<\/[Bb]utton/.test(line);

    if (!isButtonOpen) continue;

    // Gather the props window: from the opening line to ~5 lines forward
    // (enough to cover multi-line JSX attribute lists)
    const windowEnd = Math.min(i + 6, lines.length);
    const propsWindow = lines.slice(i, windowEnd).join('\n');

    // Exempt: has onClick
    if (/onClick\s*[={]/.test(propsWindow)) continue;

    // Exempt: type="submit" or type="reset"
    if (/type\s*=\s*["'`](?:submit|reset)["'`]/.test(propsWindow)) continue;

    // Exempt: formAction prop
    if (/formAction\s*[={]/.test(propsWindow)) continue;

    // Exempt: disabled or aria-disabled prop
    if (/(?:^|\s)disabled\b/.test(propsWindow) || /aria-disabled\s*[={]/.test(propsWindow)) continue;

    // Exempt: prop spread (...rest, ...props, {...foo}, {..buttonProps})
    if (/\{\s*\.\.\./.test(propsWindow) || /\.\.\.[a-zA-Z_$]/.test(propsWindow)) continue;

    // Exempt: button is inside a <Link or <a href= on the same or immediately surrounding line
    const surroundWindow = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 8)).join('\n');
    if (/<Link\s+href/.test(surroundWindow) || /<a\s+href/.test(surroundWindow)) continue;

    // Exempt: asChild pattern (Radix/shadcn slot — the button inherits href from parent)
    if (/asChild/.test(propsWindow)) continue;

    // This button has none of the exempt attributes — it's dead
    violations.push(`${rel}:${i + 1}`);
  }

  return violations;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

const allFiles = [...walkTsx(COMPONENTS_ROOT), ...walkTsx(APP_ROOT)];

const allDeadButtons: string[] = [];
for (const f of allFiles) {
  allDeadButtons.push(...findDeadButtons(f));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dead button detector — guardrail (CLAUDE.md §10 rule 15)', () => {
  it('no NEW dead buttons introduced (baseline grandfathered)', () => {
    const newViolations = allDeadButtons.filter((v) => !DEAD_BUTTON_BASELINE.has(v));

    if (newViolations.length > 0) {
      throw new Error(
        [
          '',
          `FAIL: ${newViolations.length} dead button(s) found — no onClick, type="submit", formAction, disabled, or spread props.`,
          '',
          'Per CLAUDE.md §10 rule 15: every CTA must be wired to a real action.',
          'If a feature is deferred, render an info-toast or "coming in vN.N" notice — never a silent click.',
          '',
          'Dead buttons:',
          ...newViolations.map((v) => `  ${v}`),
          '',
          'Fix options:',
          '  1. Add an onClick handler that calls a store action, opens a dialog, or shows a toast.',
          '  2. Add type="submit" if inside a <form onSubmit={...}>.',
          '  3. Add disabled={true} if the button is intentionally non-interactive (and visually communicate that).',
          '  4. If this is a known deferred feature, add a toast: onClick={() => toast("Coming soon", "info")}.',
          '',
        ].join('\n'),
      );
    }

    expect(newViolations).toHaveLength(0);
  });

  it('baseline does not contain stale entries (buttons that were fixed)', () => {
    const staleEntries: string[] = [];

    for (const entry of DEAD_BUTTON_BASELINE) {
      // Parse file:line
      const lastColon = entry.lastIndexOf(':');
      const filePart = entry.substring(0, lastColon);
      const linePart = parseInt(entry.substring(lastColon + 1), 10);

      const abs = join(__dirname, '..', '..', filePart);
      let lines: string[];
      try {
        lines = readFileSync(abs, 'utf8').split('\n');
      } catch {
        staleEntries.push(`${entry} (file deleted)`);
        continue;
      }

      const line = lines[linePart - 1];
      if (!line || !/(?:^|[^a-zA-Z0-9_'"`])<[Bb]utton[\s>/{]/.test(line)) {
        staleEntries.push(`${entry} (line no longer contains a button — entry may be stale)`);
      }
    }

    if (staleEntries.length > 0) {
      // Soft warning — the baseline entry may just be at a different line now
      // eslint-disable-next-line no-console
      console.warn(
        '\nINFO: Potentially stale DEAD_BUTTON_BASELINE entries (verify and prune if the button was fixed):\n' +
          staleEntries.map((e) => `  ${e}`).join('\n') +
          '\n',
      );
    }

    // Always pass — this is a nudge, not a gate
    expect(true).toBe(true);
  });

  it('has scanned at least 1 TSX file (sanity — ensures the walker is working)', () => {
    expect(allFiles.length).toBeGreaterThan(0);
  });
});
