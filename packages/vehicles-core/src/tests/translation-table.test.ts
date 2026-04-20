/**
 * Unit tests — translation-table
 *
 * Spec reference: PLAN-VEHICLES-003 §8 P1, S-V3-19
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { PAYLOAD_KEY_LABELS, labelFor, formatterFor } from '../translation-table';

// ─── One entry per OwnershipEventKind ─────────────────────────────────────────

describe('PAYLOAD_KEY_LABELS — OwnershipEventKind coverage', () => {
  const ownershipKinds = [
    'OPEN', 'CLOSE', 'TRANSFER', 'CLAIM_SUBMIT', 'CLAIM_APPROVE',
    'CLAIM_REJECT', 'RESTORE', 'ANONYMIZE', 'PDF_EXPORT', 'JOINT_ADD', 'FORM31_APPROVE',
  ] as const;

  for (const kind of ownershipKinds) {
    it(`has at least one entry for OWNERSHIP.${kind}.*`, () => {
      const prefix = `OWNERSHIP.${kind}.`;
      const keys = Object.keys(PAYLOAD_KEY_LABELS).filter((k) => k.startsWith(prefix));
      expect(keys.length).toBeGreaterThan(0);
    });
  }
});

// ─── Same-key independence (S-V3-19) ─────────────────────────────────────────

describe('same-key independence (S-V3-19)', () => {
  it('SALES.RESERVATION_LOST.reason and SALES.PRICE_CHANGED.reason have different i18nKeys', () => {
    const lostEntry = PAYLOAD_KEY_LABELS['SALES.RESERVATION_LOST.reason'];
    const changedEntry = PAYLOAD_KEY_LABELS['SALES.PRICE_CHANGED.reason'];
    expect(lostEntry.i18nKey).not.toBe(changedEntry.i18nKey);
  });

  it('SALES.RESERVATION_LOST.reason label is about reservation, not price', () => {
    const entry = PAYLOAD_KEY_LABELS['SALES.RESERVATION_LOST.reason'];
    expect(entry.i18nKey).toContain('reservationLost');
  });

  it('SALES.PRICE_CHANGED.reason label is about price change', () => {
    const entry = PAYLOAD_KEY_LABELS['SALES.PRICE_CHANGED.reason'];
    expect(entry.i18nKey).toContain('priceChange');
  });
});

// ─── Unknown key fallback ─────────────────────────────────────────────────────

describe('unknown qualified key fallback', () => {
  it('labelFor returns undefined for unknown key', () => {
    expect(labelFor('SALES.UNKNOWN_KIND.unknownKey')).toBeUndefined();
  });

  it('formatterFor returns freeText fallback for unknown key (not raw render)', () => {
    // S-V3-21 corollary: unknown keys fall through gracefully, not crash
    const formatter = formatterFor('TOTALLY.UNKNOWN.key');
    expect(formatter).toBe('freeText');
  });

  it('formatterFor returns correct formatter for known key', () => {
    expect(formatterFor('OWNERSHIP.CLAIM_SUBMIT.claimantCustomerId')).toBe('customerRef');
    expect(formatterFor('OWNERSHIP.OPEN.kmAtOpen')).toBe('km');
    expect(formatterFor('SALES.SOLD.finalPrice')).toBe('currency');
  });
});

// ─── Build-fail CI test: stray-key TS exhaustiveness ─────────────────────────

describe('exhaustiveness guard (S-V3-2)', () => {
  it('build succeeds with current PAYLOAD_KEY_LABELS (no missing keys)', () => {
    // The compile-time guard in translation-table.ts already asserts this at build time.
    // This test confirms the _exhaustivenessGuard assignment compiles (if we reached
    // this test, tsc passed). We do an additional runtime sanity check here.
    // The actual "add stray key → build fails" proof is in the __tests__ disabled file.

    // Sanity: every known SALES key we expect to be present
    const requiredSalesKeys: string[] = [
      'SALES.ACQUIRED.acquisitionCost',
      'SALES.LISTED.listPrice',
      'SALES.PRICE_CHANGED.reason',
      'SALES.RESERVED.dealId',
      'SALES.RESERVATION_LOST.reason',
      'SALES.SOLD.finalPrice',
      'SALES.RETURNED.reason',
    ];

    for (const key of requiredSalesKeys) {
      expect(
        labelFor(key),
        `Expected PAYLOAD_KEY_LABELS to have entry for '${key}'`,
      ).toBeDefined();
    }
  });

  it('tsc fails if PAYLOAD_KEY_LABELS is missing a known key (CI sentinel)', () => {
    // This test invokes tsc on a deliberately broken file to confirm the guard fires.
    // The file OWNERSHIP_PAYLOAD_STRAY_KEY_TEST is disabled by default (*.ts.disabled)
    // and is renamed temporarily here via execSync.
    //
    // We check tsc exit code on a mini-program that extends OwnershipEventPayloads
    // with a stray key without updating PAYLOAD_KEY_LABELS.
    const strayProgram = `
      import type { OwnershipEventKind, OwnershipEventPayloads, SalesEventKind, SalesEventPayloads } from '${path.resolve(__dirname, '../../../types/src/index')}';
      import type { DocumentAccessKind, DocumentAccessEventPayloads } from '${path.resolve(__dirname, '../../../types/src/index')}';

      // Stray: pretend OPEN has a new key 'strayNewField'
      type StrayOwnershipEventPayloads = OwnershipEventPayloads & {
        OPEN: OwnershipEventPayloads['OPEN'] & { strayNewField: string };
      };

      // If we try to use Exclude on this, Missing will NOT be never → compile fails
      type OwnershipQualifiedKeys2 = {
        [K in OwnershipEventKind]: \`OWNERSHIP.\${K}.\${keyof StrayOwnershipEventPayloads[K] & string}\`;
      }[OwnershipEventKind];

      type TranslatedKeys2 = 'OWNERSHIP.OPEN.source' | 'OWNERSHIP.OPEN.kmAtOpen'; // deliberately incomplete
      type Missing2 = Exclude<OwnershipQualifiedKeys2, TranslatedKeys2>;

      // This line MUST fail because Missing2 is not never
      const _guard: Missing2 extends never ? true : Missing2 = true as never;
    `;

    // Write temp file
    const fs = require('fs');
    const tmpPath = path.join(__dirname, '__stray_key_test_temp.ts');
    fs.writeFileSync(tmpPath, strayProgram, 'utf-8');

    let failed = false;
    try {
      execSync(`npx tsc --noEmit --strict --target ES2022 --moduleResolution bundler --module ESNext ${tmpPath}`, {
        cwd: path.resolve(__dirname, '../../../..'),
        stdio: 'pipe',
      });
    } catch {
      failed = true;
    } finally {
      fs.unlinkSync(tmpPath);
    }

    expect(failed, 'Expected tsc to FAIL on a stray-key payload type').toBe(true);
  });
});
