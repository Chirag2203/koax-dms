/**
 * Journal / Tally export page — SPEC-FINANCE-001 §1.5, §6.7
 *
 * L5: CSV download. Manual monthly upload to Tally Prime.
 * L8: R22+ export journal.
 * L9: Tally Prime column format.
 * L19: Filename BN_<outletCode>_<periodLabel>_journal.csv
 * L24: Period + outlet scope.
 * L28: Balance assertion before export.
 * L30: Idempotent export.
 */

'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { JournalPreview } from '@/src/components/finance/journal/journal-preview';
import { TallyExportDialog } from '@/src/components/finance/journal/tally-export-dialog';
import { PeriodPicker } from '@/src/components/finance/shared/period-picker';
import { OutletScopeToggle } from '@/src/components/finance/shared/outlet-scope-toggle';
import { Gate } from '@/src/components/primitives';
import { useFinanceStore } from '@/src/lib/finance/finance-store';
import { FinanceStoreHydrator } from '@/src/lib/finance/finance-store-hydrator';

export default function JournalPage() {
  const t = useTranslations('finance.journal');
  const { period, outletScope, setPeriod, setOutletScope, getJournalEntries } =
    useFinanceStore((s) => ({
      period: s.period,
      outletScope: s.outletScope,
      setPeriod: s.setPeriod,
      setOutletScope: s.setOutletScope,
      getJournalEntries: s.getJournalEntries,
    }));

  const [exportOpen, setExportOpen] = useState(false);

  // L14: pure selector
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entries = useMemo(() => getJournalEntries(period, outletScope), [period, outletScope]);

  const totalDebitPaise = useMemo(
    () => entries.flatMap((e) => e.legs).filter((l) => l.drCr === 'Dr').reduce((s, l) => s + l.amountPaise, 0),
    [entries],
  );

  return (
    <>
      <FinanceStoreHydrator />
      <div className="px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink-primary">{t('pageTitle')}</h1>
            <p className="text-sm text-ink-muted mt-1">{t('pageSubtitle')}</p>
          </div>
          {/* L8: R22+ only — export CTA */}
          <Gate role={['R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 shrink-0"
            >
              <Download size={14} aria-hidden="true" />
              {t('exportCsv')}
            </button>
          </Gate>
        </div>

        {/* Controls — L24 */}
        <div className="flex items-center gap-3 flex-wrap">
          <PeriodPicker value={period} onChange={setPeriod} />
          <OutletScopeToggle value={outletScope} onChange={setOutletScope} />
        </div>

        <JournalPreview entries={entries} />
      </div>

      {/* L5, L19, L28, L30: export dialog */}
      <TallyExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        entryCount={entries.length}
        totalDebitPaise={totalDebitPaise}
      />
    </>
  );
}
