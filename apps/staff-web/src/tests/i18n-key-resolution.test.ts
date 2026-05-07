/**
 * i18n key-resolution guardrail test.
 *
 * Catches: raw i18n keys rendering (e.g. "staff.enquiryDetail.testDrivesCard.title"
 * instead of "Test Drives") caused by useTranslations() + t() calls that point
 * to a key path that does not exist or resolves to an object rather than a string.
 *
 * Strategy:
 *   1. Walk every .tsx / .ts file under app/ and src/ (skip test + story files).
 *   2. For each file, find every `useTranslations('ns.path')` call → extract namespace.
 *   3. Find every `t('key.path')` or `t('key', …)` static call → combine to full path.
 *   4. Walk messages/en-IN.json to verify the combined path resolves to a string.
 *   5. Same check against messages/hi-IN.json (keys allowed to be missing only if in
 *      HI_IN_ALLOWLIST — the English fallback policy per CLAUDE.md §17 rule 5).
 *
 * Dynamic keys (t(`stages.${stage}`) — template literals) are skipped; they are a
 * runtime concern.
 *
 * Run: pnpm -F staff-web exec vitest run src/tests/i18n-key-resolution.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const APP_ROOT = join(__dirname, '..', '..', 'app');
const SRC_ROOT = join(__dirname, '..', '..', 'src');
const MSG_ROOT = join(__dirname, '..', '..', 'messages');

// ─── Messages ─────────────────────────────────────────────────────────────────

const EN_MESSAGES = JSON.parse(readFileSync(join(MSG_ROOT, 'en-IN.json'), 'utf8')) as Record<string, unknown>;
const HI_MESSAGES = JSON.parse(readFileSync(join(MSG_ROOT, 'hi-IN.json'), 'utf8')) as Record<string, unknown>;

// ─── Hi-IN missing-key baseline (frozen 2026-04-30) ─────────────────────────
// These paths exist in en-IN.json but are missing from hi-IN.json as of the
// baseline date. They represent genuine hi-IN gaps frozen rather than blocking
// the build retroactively.
//
// HOW TO REDUCE THIS BASELINE:
//   1. Add the missing key to messages/hi-IN.json (English fallback is fine per
//      CLAUDE.md §17 rule 5 — the key MUST exist, translation can come later).
//   2. Remove the entry from this set.
//   3. Run the test — it should now pass AND the set should shrink.
//
// DO NOT add new entries here for keys added after 2026-04-30. Those must be
// added to hi-IN.json at the same time as en-IN.json.

const HI_IN_MISSING_BASELINE = new Set<string>([
  'staff.settings.audit.columns.actor',
  'staff.settings.audit.columns.kind',
  'staff.settings.audit.columns.subject',
  'staff.settings.audit.columns.summary',
  'staff.settings.audit.columns.timestamp',
  'staff.settings.audit.empty',
  'staff.settings.audit.exportCsv',
  'staff.settings.audit.exportedToast',
  'staff.settings.audit.filters.actorSearch',
  'staff.settings.audit.filters.allKinds',
  'staff.settings.audit.filters.from',
  'staff.settings.audit.filters.kind',
  'staff.settings.audit.filters.to',
  'staff.settings.audit.retentionNotice',
  'staff.settings.audit.subtitle',
  'staff.settings.audit.title',
  'staff.settings.featureFlags.inMemoryBanner',
  'staff.settings.featureFlags.nonBoolean',
  'staff.settings.featureFlags.nonBooleanToggle',
  'staff.settings.featureFlags.subtitle',
  'staff.settings.featureFlags.title',
  'staff.settings.featureFlags.toggleDialog.confirm',
  'staff.settings.featureFlags.toggleDialog.description',
  'staff.settings.featureFlags.toggleDialog.title',
  'staff.settings.featureFlags.toggleFailed',
  'staff.settings.featureFlags.toggledToast',
  'staff.settings.hub.sections.audit.description',
  'staff.settings.hub.sections.audit.title',
  'staff.settings.hub.sections.featureFlags.description',
  'staff.settings.hub.sections.featureFlags.title',
  'staff.settings.hub.sections.integrations.description',
  'staff.settings.hub.sections.integrations.restrictedNote',
  'staff.settings.hub.sections.integrations.title',
  'staff.settings.hub.sections.outlets.description',
  'staff.settings.hub.sections.outlets.title',
  'staff.settings.hub.sections.rbac.description',
  'staff.settings.hub.sections.rbac.title',
  'staff.settings.hub.sections.rbacEdit.comingSoon',
  'staff.settings.hub.sections.rbacEdit.description',
  'staff.settings.hub.sections.rbacEdit.title',
  'staff.settings.hub.subtitle',
  'staff.settings.hub.title',
  'staff.settings.integrations.detail.connectedAt',
  'staff.settings.integrations.detail.credentialCard',
  'staff.settings.integrations.detail.endpoint',
  'staff.settings.integrations.detail.lastTest',
  'staff.settings.integrations.detail.lastUsed',
  'staff.settings.integrations.detail.notTested',
  'staff.settings.integrations.detail.secret',
  'staff.settings.integrations.detail.usedBy',
  'staff.settings.integrations.detail.usedByNote',
  'staff.settings.integrations.disconnect',
  'staff.settings.integrations.disconnectDialog.confirm',
  'staff.settings.integrations.disconnectDialog.description',
  'staff.settings.integrations.disconnectDialog.title',
  'staff.settings.integrations.disconnectFailed',
  'staff.settings.integrations.disconnectedToast',
  'staff.settings.integrations.lastUsed',
  'staff.settings.integrations.notFound',
  'staff.settings.integrations.reconnect',
  'staff.settings.integrations.reconnectDeferred',
  'staff.settings.integrations.restricted',
  'staff.settings.integrations.subtitle',
  'staff.settings.integrations.testConnection',
  'staff.settings.integrations.testFailed',
  'staff.settings.integrations.testing',
  'staff.settings.integrations.title',
  'staff.settings.integrations.viewDetails',
  'staff.settings.outlets.detail.deactivate',
  'staff.settings.outlets.detail.deactivateDialog.confirm',
  'staff.settings.outlets.detail.deactivateDialog.description',
  'staff.settings.outlets.detail.deactivateDialog.title',
  'staff.settings.outlets.detail.deactivateFailed',
  'staff.settings.outlets.detail.deactivatedToast',
  'staff.settings.outlets.detail.fields.createdAt',
  'staff.settings.outlets.detail.fields.updatedAt',
  'staff.settings.outlets.detail.reactivate',
  'staff.settings.outlets.detail.reactivateDialog.confirm',
  'staff.settings.outlets.detail.reactivateDialog.description',
  'staff.settings.outlets.detail.reactivateDialog.title',
  'staff.settings.outlets.detail.reactivateFailed',
  'staff.settings.outlets.detail.reactivatedToast',
  'staff.settings.outlets.detail.sections.address',
  'staff.settings.outlets.detail.sections.contact',
  'staff.settings.outlets.detail.sections.identification',
  'staff.settings.outlets.detail.sections.management',
  'staff.settings.outlets.edit.codeImmutable',
  'staff.settings.outlets.edit.contactNote',
  'staff.settings.outlets.edit.errors.gstinInvalid',
  'staff.settings.outlets.edit.errors.pinInvalid',
  'staff.settings.outlets.edit.fields.city',
  'staff.settings.outlets.edit.fields.code',
  'staff.settings.outlets.edit.fields.email',
  'staff.settings.outlets.edit.fields.gstin',
  'staff.settings.outlets.edit.fields.line1',
  'staff.settings.outlets.edit.fields.line2',
  'staff.settings.outlets.edit.fields.line2Placeholder',
  'staff.settings.outlets.edit.fields.manager',
  'staff.settings.outlets.edit.fields.name',
  'staff.settings.outlets.edit.fields.phone',
  'staff.settings.outlets.edit.fields.pin',
  'staff.settings.outlets.edit.fields.state',
  'staff.settings.outlets.edit.managerNote',
  'staff.settings.outlets.edit.noEligibleManagers',
  'staff.settings.outlets.edit.saveFailed',
  'staff.settings.outlets.edit.savedToast',
  'staff.settings.outlets.edit.sections.address',
  'staff.settings.outlets.edit.sections.contact',
  'staff.settings.outlets.edit.sections.identification',
  'staff.settings.outlets.edit.sections.management',
  'staff.settings.outlets.edit.subtitle',
  'staff.settings.outlets.edit.title',
  'staff.settings.outlets.notFound',
  'staff.settings.outlets.subtitle',
  'staff.settings.outlets.title',
  'staff.settings.rbac.exportCsv',
  'staff.settings.rbac.exportedToast',
  'staff.settings.rbac.noResults',
  'staff.settings.rbac.readOnlyBanner',
  'staff.settings.rbac.searchPlaceholder',
  'staff.settings.rbac.subtitle',
  'staff.settings.rbac.title',
]);

// ─── Hi-IN allowlist ─────────────────────────────────────────────────────────
// Keys allowed to be permanently absent from hi-IN (intentional English fallback
// approved by translator). Distinct from the baseline above.

const HI_IN_ALLOWLIST = new Set<string>([
  // empty — start clean; add keys here as needed
]);

// ─── Resolver ─────────────────────────────────────────────────────────────────

/** Walk a JSON tree and resolve a dot-separated path. Returns the value or undefined. */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

// ─── File walker ──────────────────────────────────────────────────────────────

function walkTs(dir: string, acc: string[] = []): string[] {
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
      walkTs(full, acc);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function relPath(abs: string): string {
  return relative(join(__dirname, '..', '..'), abs).replace(/\\/g, '/');
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Strip single-line comments (// ...) and block comments (/* ... *\/) from source
 * to avoid false-positive matches in JSDoc/comment blocks.
 */
function stripComments(src: string): string {
  // Remove /* ... */ block comments (non-greedy, including multi-line)
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove // line comments
  out = out.replace(/\/\/[^\n]*/g, '');
  return out;
}

/** Regex to find useTranslations('ns') or useTranslations("ns") calls. Captures the namespace string. */
const USE_TRANSLATIONS_RE = /useTranslations\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Regex to find t('key') or t("key") static calls (no template literals). Captures the key string. */
const T_CALL_RE = /\bt\s*\(\s*['"]([^'"]+)['"]/g;

interface ParsedCall {
  namespace: string;
  key: string;
  fullPath: string;
  line: number;
  file: string;
}

function parseFile(abs: string): ParsedCall[] {
  const rel = relPath(abs);
  const rawSrc = readFileSync(abs, 'utf8');
  // Strip comments so JSDoc examples like `* useTranslations('foo.bar')` don't false-positive
  const src = stripComments(rawSrc);
  const lines = rawSrc.split('\n'); // keep original lines for line-number reporting

  // Collect all (offset, namespace) pairs from useTranslations() calls, sorted by offset
  const nsDeclarations: Array<{ offset: number; ns: string }> = [];
  let m: RegExpExecArray | null;
  USE_TRANSLATIONS_RE.lastIndex = 0;
  while ((m = USE_TRANSLATIONS_RE.exec(src)) !== null) {
    nsDeclarations.push({ offset: m.index, ns: m[1]! });
  }

  if (nsDeclarations.length === 0) return [];

  const results: ParsedCall[] = [];

  // For each t('key') call, find the closest PRECEDING useTranslations namespace.
  // This correctly handles files with multiple sub-components, each with their own
  // const t = useTranslations('...') declaration.
  T_CALL_RE.lastIndex = 0;
  while ((m = T_CALL_RE.exec(src)) !== null) {
    const key = m[1]!;
    const offset = m.index;

    // Find closest preceding namespace declaration
    let closestNs: string | null = null;
    for (const decl of nsDeclarations) {
      if (decl.offset <= offset) {
        closestNs = decl.ns;
      } else {
        break; // sorted by offset, so we can stop once we pass the current offset
      }
    }

    if (closestNs === null) {
      // t() call before any useTranslations — use first namespace as fallback
      closestNs = nsDeclarations[0]!.ns;
    }

    // Compute line number (1-based) from raw source
    const linesBefore = rawSrc.substring(0, src.substring(0, offset).length).split('\n').length;
    const fullPath = `${closestNs}.${key}`;
    results.push({ namespace: closestNs, key, fullPath, line: linesBefore, file: rel });
  }

  return results;
}

// ─── Scan ─────────────────────────────────────────────────────────────────────

function isSkippedFile(abs: string): boolean {
  const rel = relPath(abs);
  // Skip test files, storybook stories, and the test directory itself
  return (
    rel.includes('/tests/') ||
    rel.includes('/__tests__/') ||
    rel.endsWith('.test.ts') ||
    rel.endsWith('.test.tsx') ||
    rel.endsWith('.stories.ts') ||
    rel.endsWith('.stories.tsx') ||
    rel.endsWith('.spec.ts') ||
    rel.endsWith('.spec.tsx')
  );
}

const allFiles = [...walkTs(APP_ROOT), ...walkTs(SRC_ROOT)].filter((f) => !isSkippedFile(f));

const allCalls: ParsedCall[] = [];
for (const f of allFiles) {
  allCalls.push(...parseFile(f));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('i18n key resolution — guardrail (CLAUDE.md §17 rule 7)', () => {
  it('every static t() call resolves to a string in messages/en-IN.json', () => {
    const failures: string[] = [];

    for (const call of allCalls) {
      const value = resolvePath(EN_MESSAGES, call.fullPath);
      if (value === undefined) {
        failures.push(
          `  MISSING  ${call.file}:${call.line} → t('${call.key}') with ns='${call.namespace}' → path '${call.fullPath}' not found in en-IN.json`,
        );
      } else if (typeof value !== 'string') {
        failures.push(
          `  OBJECT   ${call.file}:${call.line} → t('${call.key}') with ns='${call.namespace}' → path '${call.fullPath}' resolves to an object, not a string (raw key would render)`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        [
          '',
          `FAIL: ${failures.length} i18n key(s) do not resolve to strings in en-IN.json.`,
          'Fix: add the missing key to messages/en-IN.json, or correct the namespace/key path.',
          '',
          ...failures,
          '',
        ].join('\n'),
      );
    }

    expect(failures).toHaveLength(0);
  });

  it('every static t() call resolves to a string in messages/hi-IN.json (or is baselined/allowlisted)', () => {
    // NEW violations (not in the baseline) fail immediately.
    // Baselined violations are frozen debt — the baseline should shrink over time,
    // never grow. Add new keys to hi-IN.json when you add them to en-IN.json.
    const newFailures: string[] = [];
    const baselineHits: string[] = [];

    for (const call of allCalls) {
      if (HI_IN_ALLOWLIST.has(call.fullPath)) continue;

      const value = resolvePath(HI_MESSAGES, call.fullPath);
      const isMissing = value === undefined;
      const isObject = !isMissing && typeof value !== 'string';

      if (isMissing || isObject) {
        const kind = isMissing ? 'MISSING' : 'OBJECT ';
        const msg = `  ${kind}  ${call.file}:${call.line} → path '${call.fullPath}'`;
        if (HI_IN_MISSING_BASELINE.has(call.fullPath)) {
          baselineHits.push(msg);
        } else {
          newFailures.push(msg);
        }
      }
    }

    // Soft-warn about baselined debt (does NOT fail the test)
    if (baselineHits.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\nINFO: ${baselineHits.length} hi-IN keys are in the baseline (frozen debt — fix these by adding them to messages/hi-IN.json and removing from HI_IN_MISSING_BASELINE).\n`,
      );
    }

    if (newFailures.length > 0) {
      throw new Error(
        [
          '',
          `FAIL: ${newFailures.length} NEW i18n key(s) do not resolve to strings in hi-IN.json.`,
          'Fix: add the key to messages/hi-IN.json (use English text as fallback value if translator',
          '     hasn\'t shipped yet — per CLAUDE.md §17 rule 5 the key MUST exist).',
          'If the key intentionally uses English verbatim, add it to HI_IN_ALLOWLIST in this file.',
          'Do NOT add to HI_IN_MISSING_BASELINE — that set should only shrink, never grow.',
          '',
          ...newFailures,
          '',
        ].join('\n'),
      );
    }

    expect(newFailures).toHaveLength(0);
  });

  it('has scanned at least 1 t() call (sanity — ensures the walker is working)', () => {
    expect(allCalls.length).toBeGreaterThan(0);
  });
});
