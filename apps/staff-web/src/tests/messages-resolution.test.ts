/**
 * i18n key existence test (L30).
 *
 * Loads messages/en-IN.json and asserts:
 * 1. Every PAYLOAD_KEY_LABELS[*].i18nKey resolves to a non-empty string.
 * 2. Every titleKey enumerated in TIMELINE_LABELS resolves to a non-empty string
 *    in the messages file.
 *
 * This catches translation drift at CI time — if a key is added to
 * translation-table.ts or timeline-i18n.ts without a matching en-IN.json
 * entry, this test fails.
 *
 * Spec reference: PLAN-VEHICLES-003 L30, §8 P1
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PAYLOAD_KEY_LABELS } from '@dms/vehicles-core';
import { TIMELINE_LABELS } from '../components/vehicles/detail/tabs/shared/timeline-i18n';

// ─── Load messages ────────────────────────────────────────────────────────────

const messagesPath = join(__dirname, '../../messages/en-IN.json');
const messages: Record<string, unknown> = JSON.parse(readFileSync(messagesPath, 'utf-8'));

/**
 * Resolve a dotted key path like "staff.vehicles.timeline.keys.source"
 * against a nested JSON object.
 */
function resolveKey(obj: Record<string, unknown>, dotPath: string): string | undefined {
  const parts = dotPath.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

// ─── PAYLOAD_KEY_LABELS i18n keys ────────────────────────────────────────────

describe('PAYLOAD_KEY_LABELS i18n key resolution (L30)', () => {
  const entries = Object.entries(PAYLOAD_KEY_LABELS);

  it(`has ${entries.length} qualified keys to check`, () => {
    expect(entries.length).toBeGreaterThan(40);
  });

  for (const [qualifiedKey, entry] of entries) {
    it(`"${qualifiedKey}" → i18nKey "${entry.i18nKey}" resolves to non-empty string`, () => {
      const resolved = resolveKey(messages, entry.i18nKey);
      expect(
        resolved,
        `Key "${entry.i18nKey}" is missing from en-IN.json (for qualified key "${qualifiedKey}")`,
      ).toBeDefined();
      expect(resolved!.length).toBeGreaterThan(0);
    });
  }
});

// ─── TIMELINE_LABELS title keys ───────────────────────────────────────────────

describe('TIMELINE_LABELS title key resolution (L30)', () => {
  for (const [i18nKey, value] of Object.entries(TIMELINE_LABELS)) {
    it(`TIMELINE_LABELS["${i18nKey}"] exists in en-IN.json`, () => {
      const resolved = resolveKey(messages, i18nKey);
      expect(
        resolved,
        `Timeline label key "${i18nKey}" is missing from en-IN.json`,
      ).toBeDefined();
      expect(resolved!.length).toBeGreaterThan(0);
      // Also confirm the static value matches (no drift between static map and JSON)
      expect(resolved).toBe(value);
    });
  }
});
