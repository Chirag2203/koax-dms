/**
 * PeriodFilter — period selection buttons + custom date range picker.
 *
 * Renders 4 toggle buttons: Last 30d | This FY | Last FY | Custom.
 * Custom opens a Dialog (size="sm") with two <input type="date"> fields.
 * URL-driven period state managed by parent via onPeriodChange callback.
 *
 * L12: Period uses ReportPeriod type.
 * §9.4: Active button uses bg-accent; inactive uses border-line.
 * T-R-12: invalid from > to shows error message, disables Apply.
 *
 * Spec reference: SPEC-REPORTS-001 §9.4 (L12)
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReportPeriod } from '@/src/lib/reports/types';
import { thisFYPeriod, lastFYPeriod, last30dPeriod } from '@/src/lib/reports/period';

interface PeriodFilterProps {
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
}

type QuickPick = 'last30d' | 'thisFY' | 'lastFY';

export function PeriodFilter({ period, onPeriodChange }: PeriodFilterProps) {
  const t = useTranslations('reports.period');

  const [customOpen, setCustomOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(period.from);
  const [customTo,   setCustomTo]   = useState(period.to);
  const [rangeError, setRangeError] = useState<string | null>(null);

  function handleQuickPick(kind: QuickPick) {
    let next: ReportPeriod;
    if (kind === 'last30d') next = last30dPeriod();
    else if (kind === 'thisFY') next = thisFYPeriod();
    else next = lastFYPeriod();
    onPeriodChange(next);
    setCustomOpen(false);
  }

  function handleCustomApply() {
    if (!customFrom || !customTo) return;
    if (customFrom > customTo) {
      setRangeError('Start date must be before end date.');
      return;
    }
    setRangeError(null);
    onPeriodChange({ kind: 'custom', from: customFrom, to: customTo });
    setCustomOpen(false);
  }

  function handleFromBlur() {
    if (customFrom && customTo && customFrom > customTo) {
      setRangeError('Start date must be before end date.');
    } else {
      setRangeError(null);
    }
  }

  const activeClass  = 'bg-accent text-white rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1';
  const inactiveClass = 'border border-line rounded-md px-3 py-1.5 text-sm text-ink-secondary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1';

  const isApplyDisabled = !customFrom || !customTo || customFrom > customTo;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Quick-pick buttons */}
      {(['last30d', 'thisFY', 'lastFY'] as QuickPick[]).map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => handleQuickPick(kind)}
          aria-pressed={period.kind === kind}
          aria-label={t(kind)}
          className={period.kind === kind ? activeClass : inactiveClass}
        >
          {t(kind)}
        </button>
      ))}

      {/* Custom button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          aria-pressed={period.kind === 'custom'}
          aria-label={t('custom')}
          aria-expanded={customOpen}
          className={period.kind === 'custom' ? activeClass : inactiveClass}
        >
          {t('custom')}
        </button>

        {/* Custom date range picker — inline panel (Dialog sm) */}
        {customOpen && (
          <div
            role="dialog"
            aria-label="Custom date range"
            className="absolute top-full mt-2 right-0 z-50 bg-bg-surface border border-line-strong rounded-md shadow-3 p-4 w-72"
          >
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-ink-muted uppercase tracking-wider block mb-1" htmlFor="period-from">
                  {t('customFrom')}
                </label>
                <input
                  id="period-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  onBlur={handleFromBlur}
                  className="w-full border border-line rounded-md px-3 py-1.5 text-sm text-ink-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted uppercase tracking-wider block mb-1" htmlFor="period-to">
                  {t('customTo')}
                </label>
                <input
                  id="period-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    if (customFrom && e.target.value && customFrom <= e.target.value) {
                      setRangeError(null);
                    }
                  }}
                  min={customFrom}
                  className="w-full border border-line rounded-md px-3 py-1.5 text-sm text-ink-primary bg-bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* T-R-12: error for from > to */}
              {rangeError && (
                <p className="text-xs text-state-danger" role="alert">
                  {rangeError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setCustomOpen(false); setRangeError(null); }}
                  className="border border-line rounded-md px-3 py-1.5 text-sm text-ink-secondary hover:bg-bg-subtle transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  disabled={isApplyDisabled}
                  aria-disabled={isApplyDisabled}
                  className="rounded-md bg-accent text-white px-3 py-1.5 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {t('apply')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
