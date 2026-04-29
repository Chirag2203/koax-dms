/**
 * Financial year period helpers — SPEC-FINANCE-001 L4
 *
 * L4: Indian Financial Year = April 1 – March 31.
 *     FY label format: FY26 = Apr 1 2025 → Mar 31 2026.
 *     Quarter labels: Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar.
 *     Calendar-year alternative is explicitly NOT offered.
 *     IT Act §3; Doc 06 §FY.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FYPeriod {
  fyStart: string; // ISO date 'YYYY-04-01'
  fyEnd: string;   // ISO date 'YYYY-03-31'
  month?: number;  // 1–12 (optional — if present, filters to that calendar month)
  label: string;   // e.g. 'FY26' or 'FY26-Q1' or 'FY26-M04'
}

// ─── FY helpers ───────────────────────────────────────────────────────────────

/**
 * Get the Indian FY year number for a given date.
 * Apr 2025 → Mar 2026 → FY year = 26 (the end year).
 *
 * L4: IT Act §3; Doc 06 §FY
 */
export function getFYYear(date: Date): number {
  const month = date.getMonth(); // 0-based (March = 2, April = 3)
  const year = date.getFullYear();
  // L4: Apr 1 – Mar 31; if month >= April (index 3), FY end year = year + 1
  return month >= 3 ? year + 1 : year;
}

/**
 * Get FY label string from a date.
 * L4: FY26 = Apr 1 2025 → Mar 31 2026.
 */
export function getFYLabel(date: Date): string {
  const fyYear = getFYYear(date);
  return `FY${String(fyYear).slice(-2)}`; // FY26
}

/**
 * Get the start date of the FY containing the given date.
 * L4: starts Apr 1; Doc 06 §FY
 */
export function getFYStart(date: Date): Date {
  const fyYear = getFYYear(date);
  // L4: Apr 1; the calendar year of Apr 1 is fyYear - 1
  return new Date(fyYear - 1, 3, 1); // month=3 = April (0-based)
}

/**
 * Get the end date of the FY containing the given date.
 * L4: ends Mar 31; Doc 06 §FY
 */
export function getFYEnd(date: Date): Date {
  const fyYear = getFYYear(date);
  return new Date(fyYear, 2, 31); // month=2 = March (0-based)
}

/**
 * Build a FYPeriod for the current FY.
 * L4: IT Act §3; Doc 06 §FY
 */
export function getCurrentFYPeriod(): FYPeriod {
  const now = new Date();
  const start = getFYStart(now);
  const end = getFYEnd(now);
  return {
    fyStart: toISODate(start),
    fyEnd: toISODate(end),
    label: getFYLabel(now),
  };
}

/**
 * Build a FYPeriod for a specific FY year (e.g. 26 → FY26).
 * L4: IT Act §3; Doc 06 §FY
 */
export function getFYPeriod(fyYear: number): FYPeriod {
  const startYear = fyYear + 2000 - 1; // FY26 → 2025
  const endYear = fyYear + 2000;       // FY26 → 2026
  return {
    fyStart: `${startYear}-04-01`,
    fyEnd: `${endYear}-03-31`,
    label: `FY${fyYear}`,
  };
}

/**
 * Get quarter period within a FY.
 * L4: Q1=Apr–Jun, Q2=Jul–Sep, Q3=Oct–Dec, Q4=Jan–Mar. Doc 06 §FY.
 */
export function getQuarterPeriod(fyYear: number, quarter: 1 | 2 | 3 | 4): FYPeriod {
  const calYear = fyYear + 2000;
  const prevYear = calYear - 1;

  const quarters: Record<number, { fyStart: string; fyEnd: string }> = {
    1: { fyStart: `${prevYear}-04-01`, fyEnd: `${prevYear}-06-30` },   // Q1: Apr–Jun
    2: { fyStart: `${prevYear}-07-01`, fyEnd: `${prevYear}-09-30` },   // Q2: Jul–Sep
    3: { fyStart: `${prevYear}-10-01`, fyEnd: `${prevYear}-12-31` },   // Q3: Oct–Dec
    4: { fyStart: `${calYear}-01-01`, fyEnd: `${calYear}-03-31` },     // Q4: Jan–Mar
  };

  return {
    ...quarters[quarter]!,
    label: `FY${fyYear}-Q${quarter}`,
  };
}

/**
 * Get month period within a FY.
 * L4: FY26-M04 = April 2025. Month labels are zero-padded (M04..M03). Doc 06 §FY.
 */
export function getMonthPeriod(fyYear: number, calMonth: number): FYPeriod {
  // calMonth: 1=Jan, 2=Feb, ..., 12=Dec
  const calYear = fyYear + 2000;
  const prevYear = calYear - 1;

  // Determine calendar year: Apr–Dec → prevYear; Jan–Mar → calYear
  const year = calMonth >= 4 ? prevYear : calYear;
  const lastDay = new Date(year, calMonth, 0).getDate(); // last day of month

  const monthStr = String(calMonth).padStart(2, '0');
  const dayStr = String(lastDay).padStart(2, '0');

  return {
    fyStart: `${year}-${monthStr}-01`,
    fyEnd: `${year}-${monthStr}-${dayStr}`,
    month: calMonth,
    label: `FY${fyYear}-M${monthStr}`,
  };
}

/**
 * Check if a timestamp is within the period's date range.
 */
export function isInPeriod(isoTimestamp: string, period: FYPeriod): boolean {
  const ts = isoTimestamp.slice(0, 10); // 'YYYY-MM-DD'
  return ts >= period.fyStart && ts <= period.fyEnd;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
