/**
 * Period picker — SPEC-FINANCE-001 L4, L24
 *
 * L4: Indian FY = Apr 1 – Mar 31. Only FY periods offered — no calendar-year option.
 *     Quick selectors: This Month, Last Month, This Quarter, Last Quarter, This FY (YTD), Full Last FY.
 * L24: Period change is local-state only — no upstream writes.
 *
 * SPEC-ARCH-UI-001: uses standard form input classes.
 * IT Act §3; Doc 06 §FY.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { FYPeriod } from '@/src/lib/finance/math/period';
import {
  getCurrentFYPeriod,
  getFYPeriod,
  getQuarterPeriod,
  getMonthPeriod,
  getFYYear,
} from '@/src/lib/finance/math/period';

interface PeriodPickerProps {
  value: FYPeriod;
  onChange: (period: FYPeriod) => void;
  className?: string;
}

/**
 * FY-aware period picker with preset quick selectors.
 * L4: Apr 1 – Mar 31 only; IT Act §3; Doc 06 §FY.
 * L24: onChange updates local state only — no upstream mutations.
 */
export function PeriodPicker({ value, onChange, className = '' }: PeriodPickerProps) {
  const t = useTranslations('finance.period');

  const presets = useMemo(() => {
    const now = new Date();
    const fyYear = getFYYear(now);
    const currentMonth = now.getMonth() + 1; // 1-based

    // Determine current quarter
    const q = currentMonth >= 4 && currentMonth <= 6 ? 1
      : currentMonth >= 7 && currentMonth <= 9 ? 2
      : currentMonth >= 10 && currentMonth <= 12 ? 3
      : 4;

    // Previous quarter
    const prevQ = q === 1 ? 4 : q - 1 as 1 | 2 | 3 | 4;
    const prevQFy = prevQ === 4 ? fyYear - 1 : fyYear;

    return [
      { label: t('thisMonth'), period: getMonthPeriod(fyYear, currentMonth) },
      { label: t('lastMonth'), period: getMonthPeriod(fyYear, currentMonth === 4 ? 3 : currentMonth - 1 || 12) },
      { label: t('thisQuarter'), period: getQuarterPeriod(fyYear, q as 1 | 2 | 3 | 4) },
      { label: t('lastQuarter'), period: getQuarterPeriod(prevQFy, prevQ) },
      { label: t('thisYtd'), period: getCurrentFYPeriod() },
      { label: t('fullLastFy'), period: getFYPeriod(fyYear - 1) },
    ];
  }, [t]);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Quick preset chips */}
      {presets.map(({ label, period }) => {
        const active = period.label === value.label;
        return (
          <button
            key={period.label}
            type="button"
            onClick={() => onChange(period)}
            className={[
              'h-8 px-3 rounded-md text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              active
                ? 'bg-accent text-white'
                : 'bg-bg-subtle text-ink-secondary hover:bg-bg-hover hover:text-ink-primary border border-line',
            ].join(' ')}
            aria-pressed={active}
          >
            {label}
          </button>
        );
      })}

      {/* Current period label */}
      <span className="text-xs text-ink-muted ml-1">
        {value.label}
      </span>
    </div>
  );
}
