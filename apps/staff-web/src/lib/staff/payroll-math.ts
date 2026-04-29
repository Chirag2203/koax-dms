/**
 * Payroll math helpers — SPEC-STAFF-001 §P2
 *
 * All formulas are PREVIEW-ONLY. Production statutory filing is via greytHR/Keka
 * per Doc 06 §15.2. The DMS never submits PF/ESI/PT returns directly (L1).
 *
 * PT slabs are flagged `unverified: true` per L16 — OQ-PT-1 pending tax-counsel
 * sign-off. Do NOT use these for actual PT remittance.
 *
 * L5:  PF cap ₹1,800/month (12% of ₹15,000 basic ceiling per EPF Act)
 * L5:  ESIC — employee 0.75% of gross if gross ≤ ₹21,000
 * L16: PT slabs — KA/MH/TN placeholders; unverified
 * L21: ESIC has employee + employer shares (employee 0.75%, employer 3.25%)
 * L20: Gratuity capped at ₹20,00,000 per PoG Amendment 2018
 * L11: Gratuity formula: (basic + da) × 15/26 × completedYears
 * L19: EL encashment: min(balance, 300) / 30 × monthlyBasic
 * L22: DA is a first-class field (not folded into specialAllowance)
 * L23: Pro-rated salary: (monthlyBasic / 30) × daysWorked
 */

import type { SalaryStructure } from '@dms/types';

// ─── Gross computation ────────────────────────────────────────────────────────

export function computeGross(s: SalaryStructure): number {
  return s.basic + s.hra + s.specialAllowance + (s.conveyance ?? 0) + (s.medical ?? 0) + (s.da ?? 0) + (s.performanceBonus ?? 0);
}

// ─── PF (Employee's share — 12% of basic, capped at ₹1,800) ─────────────────
// EPF Act: employer ceiling = ₹15,000 basic → max employee contribution ₹1,800.

export function computePF(basic: number): number {
  return Math.min(1800, Math.round(basic * 0.12));
}

// ─── ESIC ─────────────────────────────────────────────────────────────────────
// L21: Employee: gross × 0.0075 if gross ≤ ₹21,000, else 0
//      Employer: gross × 0.0325 if gross ≤ ₹21,000, else 0

export function computeESIC(gross: number): { employee: number; employer: number } {
  if (gross > 21000) return { employee: 0, employer: 0 };
  return {
    employee: Math.round(gross * 0.0075),
    employer: Math.round(gross * 0.0325),
  };
}

// ─── Professional Tax ─────────────────────────────────────────────────────────
// L16: PLACEHOLDER SLABS — unverified: true. OQ-PT-1 pending tax-counsel confirmation.
// NOT FOR PRODUCTION USE.
//
// KA: ₹200/mo if monthly gross > ₹25,000, else ₹0
// MH: ₹200/mo (non-Feb) / ₹300 (Feb) if monthly gross > ₹10,000, else ₹0
// TN: half-yearly slab, ~₹208/mo equivalent for half-year gross > ₹75,000
//     (computed as ₹1,250 per half-year / 6 months ≈ ₹208.33, rounded to ₹208)
//
// month: 1–12 (needed for MH Feb special case)

export function computePT(
  state: 'KA' | 'MH' | 'TN',
  gross: number,
  month: number,
): { amount: number; unverified: true } {
  let amount = 0;
  if (state === 'KA') {
    amount = gross > 25000 ? 200 : 0;
  } else if (state === 'MH') {
    if (gross > 10000) {
      amount = month === 2 ? 300 : 200;
    }
  } else if (state === 'TN') {
    // Half-yearly slab: ₹1,250 if half-year gross > ₹75,000 → ~₹208/mo avg
    // Simplified to monthly equivalent; actual filing is half-yearly
    const halfYearGross = gross * 6;
    amount = halfYearGross > 75000 ? 208 : 0;
  }
  return { amount, unverified: true };
}

// ─── TDS (informational estimate — not actual filing) ─────────────────────────
// Simplified new-tax-regime slabs for display only.
// Actual TDS calculation requires Form 12BB declarations and investment proofs.
// Returns monthly avg deduction estimate.

export function computeTDS(annualGross: number): number {
  if (annualGross <= 300000) return 0;
  if (annualGross <= 700000) return Math.round((annualGross - 300000) * 0.05) / 12;
  if (annualGross <= 1000000) return Math.round(20000 + (annualGross - 700000) * 0.10) / 12;
  if (annualGross <= 1200000) return Math.round(50000 + (annualGross - 1000000) * 0.15) / 12;
  if (annualGross <= 1500000) return Math.round(80000 + (annualGross - 1200000) * 0.20) / 12;
  return Math.round(140000 + (annualGross - 1500000) * 0.30) / 12;
}

// ─── Gratuity (L11, L20) ──────────────────────────────────────────────────────
// Payment of Gratuity Act 1972: (basic + da) × 15/26 × completedYears
// Capped at ₹20,00,000 per Payment of Gratuity (Amendment) Act 2018 §4(3).
// Payable only after 5 years of continuous service.

export function computeGratuity(
  basic: number,
  da: number,
  completedYears: number,
): { amount: number; capped: boolean } {
  if (completedYears < 5) return { amount: 0, capped: false };
  const raw = Math.round((basic + da) * 15 / 26 * completedYears);
  const capped = Math.min(2000000, raw);  // ₹20,00,000 cap
  return { amount: capped, capped: capped < raw };
}

// ─── EL Encashment (L19) ──────────────────────────────────────────────────────
// L19: elEncashAmount = round((min(eligibleELDays, 300) / 30) × monthlyBasic)
// 300-day cap per Income Tax Act §10(10AA).

export function computeELEncashment(eligibleELDays: number, monthlyBasic: number): number {
  const cappedDays = Math.min(eligibleELDays, 300);
  return Math.round((cappedDays / 30) * monthlyBasic);
}

// ─── Pro-rated salary (L23) ───────────────────────────────────────────────────
// F&F: proRatedSalary = round((monthlyBasic / 30) × daysWorkedInExitMonth)

export function computeProRatedSalary(monthlyBasic: number, daysWorked: number): number {
  return Math.round((monthlyBasic / 30) * daysWorked);
}

// ─── Payslip computation ──────────────────────────────────────────────────────

export interface PayslipData {
  staffId: string;
  month: number;  // 1–12
  year: number;
  salary: SalaryStructure;
  gross: number;
  pf: number;
  esicEmployee: number;
  esicEmployer: number;
  pt: { amount: number; unverified: true };
  tds: number;
  totalDeductions: number;
  netPay: number;
  stateOfPosting: 'KA' | 'MH' | 'TN';
}

export function computePayslip(
  staffId: string,
  salary: SalaryStructure,
  stateOfPosting: 'KA' | 'MH' | 'TN',
  month: number,
  year: number,
): PayslipData {
  const gross = computeGross(salary);
  const pf = computePF(salary.basic);
  const { employee: esicEmployee, employer: esicEmployer } = computeESIC(gross);
  const pt = computePT(stateOfPosting, gross, month);
  const tds = Math.round(computeTDS(gross * 12));
  const totalDeductions = pf + esicEmployee + pt.amount + tds;
  const netPay = gross - totalDeductions;

  return {
    staffId,
    month,
    year,
    salary,
    gross,
    pf,
    esicEmployee,
    esicEmployer,
    pt,
    tds,
    totalDeductions,
    netPay,
    stateOfPosting,
  };
}

// ─── F&F Summary ──────────────────────────────────────────────────────────────

export interface FFInput {
  staffId: string;
  basic: number;
  da: number;
  monthlyGross: number;
  exitDate: string;
  startDate: string;
  daysWorkedInExitMonth: number;
  eligibleELDays: number;
  deductions?: {
    advance?: number;
    noticeShortfall?: number;
    assetLoss?: number;
    other?: number;
  };
}

export interface FFSummary {
  proRatedSalary: number;
  elEncashment: number;
  gratuity: number;
  gratuityCapped: boolean;
  deductionsTotal: number;
  netPayout: number;
}

export function computeFFSummary(input: FFInput): FFSummary {
  const exitDateObj = new Date(input.exitDate);
  const startDateObj = new Date(input.startDate);
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const completedYears = Math.floor((exitDateObj.getTime() - startDateObj.getTime()) / msPerYear);

  const proRatedSalary = computeProRatedSalary(input.basic, input.daysWorkedInExitMonth);
  const elEncashment = computeELEncashment(input.eligibleELDays, input.basic);
  const { amount: gratuity, capped: gratuityCapped } = computeGratuity(input.basic, input.da, completedYears);

  const d = input.deductions ?? {};
  const deductionsTotal = (d.advance ?? 0) + (d.noticeShortfall ?? 0) + (d.assetLoss ?? 0) + (d.other ?? 0);
  const netPayout = proRatedSalary + elEncashment + gratuity - deductionsTotal;

  return { proRatedSalary, elEncashment, gratuity, gratuityCapped, deductionsTotal, netPayout };
}
