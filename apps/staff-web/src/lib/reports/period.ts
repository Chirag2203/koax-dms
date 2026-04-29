/**
 * Reports — FY period helpers.
 *
 * L3: Indian Financial Year = April 1 to March 31.
 *   "This FY"   → April 1 of current year → March 31 of next year
 *   "Last FY"   → April 1 of prior year → March 31 of current year
 *   "Last 30d"  → rolling 30 calendar days from today
 * All boundaries in IST (UTC+5:30). For client-side pure math we use local date.
 *
 * L12: Helpers return { kind, from, to } with ISO date strings (date portion only).
 *
 * Spec reference: SPEC-REPORTS-001 L3, L12
 */

import type { ReportPeriod } from './types';

/** Format a Date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Returns the "This FY" period.
 * FY starts April 1. If today is before April 1, the current FY started in the prior year.
 *
 * T-R-11: thisFYPeriod() when today = 2026-04-29 → from '2026-04-01', to '2027-03-31'
 */
export function thisFYPeriod(today: Date = new Date()): ReportPeriod {
  // L3: FY starts April 1 (month index 3)
  const month = today.getMonth(); // 0-indexed
  const year  = today.getFullYear();

  // April = month 3; if current month < April, FY started last year
  const fyStart = month >= 3 ? year : year - 1;

  const from = `${fyStart}-04-01`;
  const to   = `${fyStart + 1}-03-31`;

  return { kind: 'thisFY', from, to };
}

/**
 * Returns the "Last FY" period.
 *
 * T-R-11: lastFYPeriod() when today = 2026-04-29 → from '2025-04-01', to '2026-03-31'
 */
export function lastFYPeriod(today: Date = new Date()): ReportPeriod {
  const month = today.getMonth();
  const year  = today.getFullYear();

  const fyStart = month >= 3 ? year - 1 : year - 2;

  const from = `${fyStart}-04-01`;
  const to   = `${fyStart + 1}-03-31`;

  return { kind: 'lastFY', from, to };
}

/**
 * Returns the "Last 30 days" rolling period.
 */
export function last30dPeriod(today: Date = new Date()): ReportPeriod {
  const to   = toDateStr(today);
  const fromD = new Date(today);
  fromD.setDate(fromD.getDate() - 29); // 30 days inclusive of today
  const from = toDateStr(fromD);

  return { kind: 'last30d', from, to };
}

/**
 * Check whether an ISO datetime string falls within [from, to] inclusive.
 * Compares only date portions (YYYY-MM-DD).
 *
 * @param isoString - Full ISO datetime e.g. '2026-04-15T09:00:00.000Z'
 * @param period    - ReportPeriod with date-only from/to
 */
export function isInPeriod(isoString: string, period: ReportPeriod): boolean {
  if (!isoString) return false;
  // Take date portion only (first 10 chars)
  const date = isoString.slice(0, 10);
  return date >= period.from && date <= period.to;
}

/**
 * Returns the count of calendar days in a period (inclusive).
 */
export function daysInPeriod(period: ReportPeriod): number {
  const from = new Date(period.from + 'T00:00:00');
  const to   = new Date(period.to   + 'T00:00:00');
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Returns an array of 8 weekly bucket start dates (ISO date strings) ending at period.to.
 * Used for sparkline trend computation (sales velocity, insurance attachment).
 */
export function last8WeekBuckets(period: ReportPeriod): Array<{ from: string; to: string }> {
  const endDate = new Date(period.to + 'T00:00:00');
  const buckets: Array<{ from: string; to: string }> = [];

  for (let i = 7; i >= 0; i--) {
    const bucketEnd = new Date(endDate);
    bucketEnd.setDate(endDate.getDate() - i * 7);

    const bucketStart = new Date(bucketEnd);
    bucketStart.setDate(bucketEnd.getDate() - 6);

    buckets.push({ from: toDateStr(bucketStart), to: toDateStr(bucketEnd) });
  }

  return buckets;
}

/**
 * Returns count of working days in a period.
 * "Working day" = Monday–Saturday (Indian DMS context).
 * Sunday is excluded. Holidays are not modelled in v1 (configurable in v1.5 per L15).
 */
export function workingDaysInPeriod(period: ReportPeriod): number {
  let count = 0;
  const current = new Date(period.from + 'T00:00:00');
  const end     = new Date(period.to   + 'T00:00:00');

  while (current <= end) {
    const day = current.getDay(); // 0=Sun
    if (day !== 0) count++;       // Exclude Sunday
    current.setDate(current.getDate() + 1);
  }

  return count;
}
