'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@dms/ui';
import type { OwnedVehicleView } from '@/src/lib/portal/portal-vehicle-adapter';

interface CpoTabProps {
  vehicle: OwnedVehicleView;
}

export function CpoTab({ vehicle }: CpoTabProps) {
  const t = useTranslations('portal.vehicles');
  const badge = vehicle.cpoEligibility;

  return (
    <div className="max-w-xl">
      {badge === 'ELIGIBLE' && (
        <div>
          <div className="flex items-start gap-3 mb-5">
            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-success mb-1">
                {t('cpoEligible')}
              </p>
              <h3 className="font-display text-xl text-ink-primary">{t('cpoEligibleTitle')}</h3>
            </div>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">{t('cpoEligibleBody')}</p>
        </div>
      )}

      {badge === 'AT_RISK' && (
        <div>
          <div className="flex items-start gap-3 mb-5">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-warning mb-1">
                {t('cpoAtRisk')}
              </p>
              <h3 className="font-display text-xl text-ink-primary">{t('cpoAtRiskTitle')}</h3>
            </div>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed mb-5">{t('cpoAtRiskBody')}</p>
          <a
            href="/service/schedule"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest border border-ink-primary px-5 py-3 hover:bg-ink-primary hover:text-bg-paper transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('scheduleService')}
          </a>
        </div>
      )}

      {badge === 'NOT_ELIGIBLE' && (
        <div>
          <div className="flex items-start gap-3 mb-5">
            <XCircle className="h-5 w-5 text-ink-muted flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-1">
                {t('cpoNotEligible')}
              </p>
              <h3 className="font-display text-xl text-ink-primary">{t('cpoNotEligibleTitle')}</h3>
            </div>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed mb-5">
            {t('cpoNotEligibleBody')}
          </p>
          <a
            href="/service/schedule"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest border border-ink-primary px-5 py-3 hover:bg-ink-primary hover:text-bg-paper transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('scheduleService')}
          </a>
        </div>
      )}

      {/* CPO programme explainer */}
      <div className="mt-8 pt-6 border-t border-line">
        <h4 className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
          {t('cpoExplainerTitle')}
        </h4>
        <ul className="space-y-2 text-sm text-ink-secondary">
          <li>{t('cpoRule1')}</li>
          <li>{t('cpoRule2')}</li>
          <li>{t('cpoRule3')}</li>
          <li>{t('cpoRule4')}</li>
        </ul>
      </div>
    </div>
  );
}
