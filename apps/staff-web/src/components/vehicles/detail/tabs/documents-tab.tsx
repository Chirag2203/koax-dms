'use client';

import { FileText } from 'lucide-react';
import type { VehicleMaster } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentsTabProps {
  vehicle: VehicleMaster;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsTab({ vehicle: _vehicle }: DocumentsTabProps) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-8 text-center">
      <div className="flex justify-center mb-3">
        <FileText className="h-8 w-8 text-ink-muted" aria-hidden="true" />
      </div>
      <p className="text-sm text-ink-muted">
        Document management (RC, insurance, service docs) — read-only P2.
      </p>
      <p className="text-xs text-ink-muted mt-2">
        Upload and management flows ship in P5 with the documents module.
      </p>
    </div>
  );
}
