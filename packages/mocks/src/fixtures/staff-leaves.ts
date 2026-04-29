/**
 * Staff leave fixtures — SPEC-STAFF-001 §P4
 *
 * 24 staff × FY2026 leave balances.
 * ~30 leave applications across all 24 staff:
 *   - 60% approved, 20% pending, 15% rejected, 5% cancelled
 * Realistic dates Jan–Apr 2026.
 *
 * L32: CL 12, SL 12, EL 21. Maternity 26wk per Maternity Benefit Act 2017.
 */

import type { LeaveApplication, LeaveBalance } from '@dms/types';
import { MOCK_STAFF_PROFILES } from './staff-profiles';

// ─── Deterministic ID generator ───────────────────────────────────────────────

let seq = 1;
function nextLeaveId(): string {
  return `leave-${String(seq++).padStart(5, '0')}`;
}

// ─── Default entitlements (L32) ───────────────────────────────────────────────

const CL_ENTITLED = 12;
const SL_ENTITLED = 12;
const EL_ENTITLED = 21;

// ─── Leave balances — one per staff for FY2026 (Apr 2026 – Mar 2027) ─────────

function makeBalance(
  staffId: string,
  clUsed: number,
  slUsed: number,
  elUsed: number,
  elCF: number,
  compOffAccrued: number,
  compOffUsed: number,
): LeaveBalance {
  return {
    staffId,
    fyStart: '2026-04-01',
    CL: { entitled: CL_ENTITLED, used: clUsed },
    SL: { entitled: SL_ENTITLED, used: slUsed },
    EL: { entitled: EL_ENTITLED, used: elUsed, carriedForward: elCF },
    CompOff: { accrued: compOffAccrued, used: compOffUsed },
  };
}

export const MOCK_LEAVE_BALANCES: LeaveBalance[] = MOCK_STAFF_PROFILES.map((p) => {
  // Vary usage based on staff position in list for diversity
  const idx = MOCK_STAFF_PROFILES.indexOf(p);
  const clUsed = (idx % 5 === 0) ? 3 : (idx % 3 === 0) ? 2 : (idx % 2 === 0) ? 1 : 0;
  const slUsed = (idx % 7 === 0) ? 2 : (idx % 4 === 0) ? 1 : 0;
  const elUsed = (idx % 6 === 0) ? 5 : (idx % 3 === 0) ? 3 : 0;
  const elCF = (idx % 4 === 0) ? 3 : (idx % 3 === 0) ? 1 : 0;
  const compOffAccrued = (idx % 5 === 0) ? 3 : (idx % 3 === 0) ? 2 : 1;
  const compOffUsed = (idx % 5 === 0) ? 1 : 0;
  return makeBalance(p.id, clUsed, slUsed, elUsed, elCF, compOffAccrued, compOffUsed);
});

// ─── Leave applications (~30 applications) ────────────────────────────────────

const ALL_IDS = MOCK_STAFF_PROFILES.map((p) => p.id);

// Helper to get an approver for a staff member (uses reportsTo or falls back to R02)
function getApprover(staffId: string): string {
  const staff = MOCK_STAFF_PROFILES.find((p) => p.id === staffId);
  return staff?.reportsTo ?? 'staff-r02-001';
}

export const MOCK_LEAVE_APPLICATIONS: LeaveApplication[] = [
  // ─── Approved applications (60% = 18 leaves) ──────────────────────────────

  // Jan 2026
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[0]!,   // staff-r05-001 Rahul Kumar
    type: 'CL',
    fromDate: '2026-01-06',
    toDate: '2026-01-07',
    reason: 'Family function',
    status: 'approved',
    appliedAt: '2026-01-03T10:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[0]!),
    approvedAt: '2026-01-04T09:30:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[1]!,   // staff-r04-001 Deepa Nair
    type: 'EL',
    fromDate: '2026-01-12',
    toDate: '2026-01-16',
    reason: 'Annual vacation',
    status: 'approved',
    appliedAt: '2026-01-05T11:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[1]!),
    approvedAt: '2026-01-07T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[2]!,   // staff-r09-001 Priya Sharma
    type: 'SL',
    fromDate: '2026-01-20',
    toDate: '2026-01-21',
    reason: 'Fever and doctor visit',
    status: 'approved',
    appliedAt: '2026-01-20T08:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[2]!),
    approvedAt: '2026-01-20T10:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[3]!,   // staff-r08-001 Rajan Pillai
    type: 'CompOff',
    fromDate: '2026-01-26',
    toDate: '2026-01-26',
    reason: 'Worked on Republic Day (holiday)',
    status: 'approved',
    appliedAt: '2026-01-27T09:00:00.000Z',
    compOffEarnedFromDate: '2026-01-26',
    approvedBy: getApprover(ALL_IDS[3]!),
    approvedAt: '2026-01-28T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[4]!,   // staff-r16-001 Anita Desai
    type: 'CL',
    fromDate: '2026-01-29',
    toDate: '2026-01-30',
    reason: 'Personal work',
    status: 'approved',
    appliedAt: '2026-01-27T15:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[4]!),
    approvedAt: '2026-01-28T11:00:00.000Z',
  },

  // Feb 2026
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[5]!,   // staff-r13-001 Harish Naidu
    type: 'SL',
    fromDate: '2026-02-03',
    toDate: '2026-02-04',
    reason: 'Stomach infection, medical certificate attached',
    status: 'approved',
    appliedAt: '2026-02-03T07:30:00.000Z',
    approvedBy: getApprover(ALL_IDS[5]!),
    approvedAt: '2026-02-03T12:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[6]!,   // staff-r03-001 Neha Kapoor
    type: 'EL',
    fromDate: '2026-02-09',
    toDate: '2026-02-13',
    reason: 'Family trip to Coorg',
    status: 'approved',
    appliedAt: '2026-02-01T09:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[6]!),
    approvedAt: '2026-02-02T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[7]!,   // staff-r11-001 Suresh Babu
    type: 'CL',
    fromDate: '2026-02-16',
    toDate: '2026-02-16',
    reason: 'Child school event',
    status: 'approved',
    appliedAt: '2026-02-13T10:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[7]!),
    approvedAt: '2026-02-14T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[8]!,   // staff-r05-002 Vikrant Joshi
    type: 'CL',
    fromDate: '2026-02-23',
    toDate: '2026-02-24',
    reason: 'Personal errand',
    status: 'approved',
    appliedAt: '2026-02-20T10:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[8]!),
    approvedAt: '2026-02-21T09:30:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[9]!,   // staff-r10-001 Arjun Mehta
    type: 'EL',
    fromDate: '2026-02-24',
    toDate: '2026-02-27',
    reason: 'Wedding anniversary vacation',
    status: 'approved',
    appliedAt: '2026-02-10T09:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[9]!),
    approvedAt: '2026-02-12T10:00:00.000Z',
  },

  // Mar 2026
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[10]!, // staff-r12-001 Vikram Singh
    type: 'SL',
    fromDate: '2026-03-02',
    toDate: '2026-03-03',
    reason: 'Back pain, physiotherapy advised',
    status: 'approved',
    appliedAt: '2026-03-02T08:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[10]!),
    approvedAt: '2026-03-02T11:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[11]!, // staff-r08-002 Mohan Das
    type: 'CL',
    fromDate: '2026-03-10',
    toDate: '2026-03-10',
    reason: 'Family function',
    status: 'approved',
    appliedAt: '2026-03-07T12:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[11]!),
    approvedAt: '2026-03-08T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[12]!, // staff-r15-001 Lakshmi Rao
    type: 'CompOff',
    fromDate: '2026-03-17',
    toDate: '2026-03-17',
    reason: 'Comp off for weekend audit support',
    status: 'approved',
    appliedAt: '2026-03-14T09:00:00.000Z',
    compOffEarnedFromDate: '2026-03-08',
    approvedBy: getApprover(ALL_IDS[12]!),
    approvedAt: '2026-03-15T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[13]!, // staff-r03-002 Sunita Reddy
    type: 'EL',
    fromDate: '2026-03-23',
    toDate: '2026-03-27',
    reason: 'Holi vacation with family',
    status: 'approved',
    appliedAt: '2026-03-10T09:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[13]!),
    approvedAt: '2026-03-11T11:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[14]!, // staff-r06-001 Kavya Menon
    type: 'CL',
    fromDate: '2026-03-31',
    toDate: '2026-03-31',
    reason: 'Ugadi festival',
    status: 'approved',
    appliedAt: '2026-03-27T12:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[14]!),
    approvedAt: '2026-03-28T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[15]!, // staff-r19-001 Sunita Reddy GM
    type: 'CL',
    fromDate: '2026-03-05',
    toDate: '2026-03-06',
    reason: 'Personal medical check-up',
    status: 'approved',
    appliedAt: '2026-03-03T08:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[15]!),
    approvedAt: '2026-03-04T09:30:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[16]!, // staff-r05-003 Karthik Rajan
    type: 'SL',
    fromDate: '2026-03-18',
    toDate: '2026-03-19',
    reason: 'Viral fever, medical certificate submitted',
    status: 'approved',
    appliedAt: '2026-03-18T07:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[16]!),
    approvedAt: '2026-03-18T11:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[17]!, // staff-r04-002 Preethi Balaji
    type: 'LWP',
    fromDate: '2026-03-25',
    toDate: '2026-03-25',
    reason: 'Personal — urgent out-of-station travel',
    status: 'approved',
    appliedAt: '2026-03-22T09:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[17]!),
    approvedAt: '2026-03-23T09:00:00.000Z',
  },

  // ─── Pending applications (20% = 6 leaves) ────────────────────────────────

  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[0]!,   // Rahul Kumar
    type: 'CL',
    fromDate: '2026-04-14',
    toDate: '2026-04-14',
    reason: 'Baisakhi festival',
    status: 'pending',
    appliedAt: '2026-04-10T10:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[2]!,   // Priya Sharma
    type: 'SL',
    fromDate: '2026-04-22',
    toDate: '2026-04-23',
    reason: 'Routine dental surgery',
    status: 'pending',
    appliedAt: '2026-04-15T11:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[18]!, // staff-r12-002 Senthil Kumar
    type: 'EL',
    fromDate: '2026-05-01',
    toDate: '2026-05-05',
    reason: 'Summer vacation with family to Ooty',
    status: 'pending',
    appliedAt: '2026-04-20T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[19]!, // staff-r09-002 Amutha Devi
    type: 'CompOff',
    fromDate: '2026-04-28',
    toDate: '2026-04-28',
    reason: 'Comp off for Sunday overtime on 2026-04-20',
    status: 'pending',
    appliedAt: '2026-04-21T09:00:00.000Z',
    compOffEarnedFromDate: '2026-04-20',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[20]!, // staff-r08-003 Murugan Raj
    type: 'CL',
    fromDate: '2026-04-29',
    toDate: '2026-04-30',
    reason: 'Home renovation work',
    status: 'pending',
    appliedAt: '2026-04-24T12:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[22]!, // staff-r22-001 Karan Shah CFO
    type: 'CL',
    fromDate: '2026-05-02',
    toDate: '2026-05-02',
    reason: 'Board meeting preparation day',
    status: 'pending',
    appliedAt: '2026-04-28T10:00:00.000Z',
  },

  // ─── Rejected applications (15% ≈ 4 leaves) ───────────────────────────────

  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[1]!,   // Deepa Nair
    type: 'EL',
    fromDate: '2026-02-14',
    toDate: '2026-02-20',
    reason: 'Extended vacation',
    status: 'rejected',
    appliedAt: '2026-02-05T10:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[1]!),
    approvedAt: '2026-02-06T11:00:00.000Z',
    rejectionReason: 'Peak sales period — cannot approve during last fortnight of month.',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[8]!,   // Vikrant Joshi
    type: 'CL',
    fromDate: '2026-03-15',
    toDate: '2026-03-16',
    reason: 'Personal',
    status: 'rejected',
    appliedAt: '2026-03-13T09:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[8]!),
    approvedAt: '2026-03-14T10:00:00.000Z',
    rejectionReason: 'Insufficient balance — only 0 CL days remaining.',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[21]!, // staff-r03-003 Jayashree Iyer
    type: 'EL',
    fromDate: '2026-01-08',
    toDate: '2026-01-09',
    reason: 'Pongal celebrations',
    status: 'rejected',
    appliedAt: '2026-01-05T09:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[21]!),
    approvedAt: '2026-01-06T09:00:00.000Z',
    rejectionReason: 'Already on leave list for Pongal — this is a public holiday, no EL deduction required.',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[5]!,   // Harish Naidu
    type: 'CompOff',
    fromDate: '2026-04-01',
    toDate: '2026-04-01',
    reason: 'Comp off for Saturday visit',
    status: 'rejected',
    appliedAt: '2026-03-30T14:00:00.000Z',
    approvedBy: getApprover(ALL_IDS[5]!),
    approvedAt: '2026-03-31T09:00:00.000Z',
    rejectionReason: 'No comp-off approved for unscheduled visits. Please register with team lead first.',
  },

  // ─── Cancelled applications (5% ≈ 1–2 leaves) ────────────────────────────

  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[6]!,   // Neha Kapoor
    type: 'CL',
    fromDate: '2026-04-07',
    toDate: '2026-04-08',
    reason: 'Medical appointment',
    status: 'cancelled',
    appliedAt: '2026-04-04T09:00:00.000Z',
  },
  {
    leaveId: nextLeaveId(),
    staffId: ALL_IDS[9]!,   // Arjun Mehta
    type: 'SL',
    fromDate: '2026-04-10',
    toDate: '2026-04-10',
    reason: 'Felt unwell',
    status: 'cancelled',
    appliedAt: '2026-04-10T07:30:00.000Z',
  },
];
