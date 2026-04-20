'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { FileDown } from 'lucide-react';
import { usePortalVehiclesStore } from '@/src/lib/vehicles/vehicles-client-store';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';

interface ExportPdfButtonProps {
  vin: string;
}

export function ExportPdfButton({ vin }: ExportPdfButtonProps) {
  const t = useTranslations('portal.vehicles');
  const { customerId } = usePortalAuth();
  const logPdfExport = usePortalVehiclesStore((s) => s.logPdfExport);

  const handleExport = React.useCallback(() => {
    // Log the export event
    logPdfExport(vin, customerId);
    // Trigger browser print on the hidden iframe containing the watermarked HTML
    window.print();
  }, [vin, customerId, logPdfExport]);

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest border border-line px-4 py-2.5 text-ink-secondary hover:border-ink-primary hover:text-ink-primary transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label={t('exportPdfAriaLabel')}
    >
      <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
      {t('exportPdf')}
    </button>
  );
}
