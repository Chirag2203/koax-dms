/**
 * Mock salary structures for SPEC-STAFF-001 §P2 demo data.
 * One current salary per staff member, keyed by staffId.
 *
 * These are representative values for preview/demo only.
 * Actual salary structures are configured by R22+ (CFO) post-onboarding.
 *
 * IMPORTANT: PT slabs computed from these are marked `unverified: true` per L16.
 */

import type { SalaryStructure } from '@dms/types';

/** Map of staffId → current SalaryStructure */
export const MOCK_SALARY_STRUCTURES: Record<string, SalaryStructure> = {
  // BLR staff
  'staff-r05-001': {
    basic: 35000, hra: 14000, specialAllowance: 8000, conveyance: 1600,
    medical: 1250, performanceBonus: 3000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r04-001': {
    basic: 70000, hra: 28000, specialAllowance: 15000, conveyance: 1600,
    medical: 1250, performanceBonus: 8000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r09-001': {
    basic: 40000, hra: 16000, specialAllowance: 9000, conveyance: 1600,
    medical: 1250, performanceBonus: 2500, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r08-001': {
    basic: 75000, hra: 30000, specialAllowance: 15000, conveyance: 1600,
    medical: 1250, performanceBonus: 8000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r16-001': {
    basic: 120000, hra: 48000, specialAllowance: 20000, conveyance: 3200,
    medical: 1250, performanceBonus: 15000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r03-001': {
    basic: 90000, hra: 36000, specialAllowance: 18000, conveyance: 3200,
    medical: 1250, performanceBonus: 12000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r17-001': {
    basic: 55000, hra: 22000, specialAllowance: 10000, conveyance: 1600,
    medical: 1250, performanceBonus: 4000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r23-001': {
    basic: 80000, hra: 32000, specialAllowance: 15000, conveyance: 3200,
    medical: 1250, performanceBonus: 8000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  // MUM staff
  'staff-r12-001': {
    basic: 65000, hra: 26000, specialAllowance: 12000, conveyance: 1600,
    medical: 1250, performanceBonus: 6000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r11-001': {
    basic: 28000, hra: 11200, specialAllowance: 5000, conveyance: 1600,
    medical: 1250, performanceBonus: 1500, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r15-001': {
    basic: 50000, hra: 20000, specialAllowance: 10000, conveyance: 1600,
    medical: 1250, performanceBonus: 4000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r19-001': {
    basic: 150000, hra: 60000, specialAllowance: 25000, conveyance: 3200,
    medical: 1250, performanceBonus: 20000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r06-001': {
    basic: 38000, hra: 15200, specialAllowance: 8000, conveyance: 1600,
    medical: 1250, performanceBonus: 2500, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r18-001': {
    basic: 45000, hra: 18000, specialAllowance: 8000, conveyance: 1600,
    medical: 1250, performanceBonus: 3000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r20-001': {
    basic: 55000, hra: 22000, specialAllowance: 10000, conveyance: 1600,
    medical: 1250, performanceBonus: 4000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  // CHE staff
  'staff-r07-001': {
    basic: 65000, hra: 26000, specialAllowance: 12000, conveyance: 1600,
    medical: 1250, performanceBonus: 6000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r10-001': {
    basic: 55000, hra: 22000, specialAllowance: 10000, conveyance: 1600,
    medical: 1250, performanceBonus: 4000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r14-001': {
    basic: 75000, hra: 30000, specialAllowance: 15000, conveyance: 1600,
    medical: 1250, performanceBonus: 8000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r13-001': {
    basic: 30000, hra: 12000, specialAllowance: 5000, conveyance: 1600,
    medical: 1250, performanceBonus: 1500, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r21-001': {
    basic: 25000, hra: 10000, specialAllowance: 4000, conveyance: 1600,
    medical: 1250, performanceBonus: 1000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r03-002': {
    basic: 90000, hra: 36000, specialAllowance: 18000, conveyance: 3200,
    medical: 1250, performanceBonus: 12000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r05-002': {
    basic: 35000, hra: 14000, specialAllowance: 8000, conveyance: 1600,
    medical: 1250, performanceBonus: 3000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  // Org-level roles
  'staff-r02-001': {
    basic: 180000, hra: 72000, specialAllowance: 30000, conveyance: 3200,
    medical: 1250, performanceBonus: 25000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r22-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r22-001': {
    basic: 250000, hra: 100000, specialAllowance: 40000, conveyance: 6400,
    medical: 1250, performanceBonus: 50000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r24-001',
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
  'staff-r24-001': {
    basic: 500000, hra: 200000, specialAllowance: 80000, conveyance: 6400,
    medical: 1250, performanceBonus: 100000, da: 0,
    effectiveFrom: '2026-01-01', approvedBy: 'staff-r24-001',  // self-approved for CEO
    approvedAt: '2025-12-20T11:00:00.000Z', reason: 'Annual revision 2026',
  },
};
