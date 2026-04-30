/**
 * Exhaustiveness test for INSURANCE_AUDIT_KIND_LABELS.
 *
 * Belt-and-suspenders runtime guard: the compile-time guard is the
 * Record<InsuranceAuditEventKind, string> type on INSURANCE_AUDIT_KIND_LABELS.
 * This test catches any future mismatch at CI time.
 *
 * Spec reference: SPEC-INSURANCE-001 §20.1 (DEF-INS-2)
 */

import { describe, it, expect } from 'vitest';
import { InsuranceAuditEventKindEnum } from '@dms/types';
import {
  INSURANCE_AUDIT_KIND_LABELS,
  labelForInsuranceAuditKind,
} from '../audit-event-labels';

describe('INSURANCE_AUDIT_KIND_LABELS', () => {
  it('every InsuranceAuditEventKind enum value has a display label', () => {
    for (const kind of InsuranceAuditEventKindEnum.options) {
      expect(INSURANCE_AUDIT_KIND_LABELS[kind]).toBeDefined();
      expect(INSURANCE_AUDIT_KIND_LABELS[kind]).not.toEqual('');
    }
  });

  it('labelForInsuranceAuditKind returns the correct label for each kind', () => {
    for (const kind of InsuranceAuditEventKindEnum.options) {
      expect(labelForInsuranceAuditKind(kind)).toBe(INSURANCE_AUDIT_KIND_LABELS[kind]);
    }
  });

  it('label count matches enum options count', () => {
    const labelKeys = Object.keys(INSURANCE_AUDIT_KIND_LABELS);
    expect(labelKeys).toHaveLength(InsuranceAuditEventKindEnum.options.length);
  });
});
