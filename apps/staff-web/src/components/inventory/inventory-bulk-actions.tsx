'use client';

import { X, Download, RefreshCw, Building2, Archive } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryBulkActionsProps {
  selectedCount: number;
  onClear: () => void;
  onExport: () => void;
  onUpdateStatus: () => void;
  onAssignOutlet: () => void;
  onArchive: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryBulkActions({
  selectedCount,
  onClear,
  onExport,
  onUpdateStatus,
  onAssignOutlet,
  onArchive,
}: InventoryBulkActionsProps) {
  const btnClass = cn(
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5',
    'text-xs font-medium text-ink-secondary border border-line bg-bg-canvas',
    'hover:text-ink-primary hover:border-ink-secondary transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
  );

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        'bg-accent/5 border border-accent/20 rounded-t-md',
      )}
    >
      <span className="text-sm font-semibold text-accent shrink-0">
        {selectedCount} selected
      </span>

      <div className="h-4 w-px bg-line shrink-0" aria-hidden="true" />

      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={onExport} className={btnClass} aria-label="Export selected">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Export
        </button>
        <button type="button" onClick={onUpdateStatus} className={btnClass} aria-label="Update status of selected">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Update Status
        </button>
        <button type="button" onClick={onAssignOutlet} className={btnClass} aria-label="Assign outlet to selected">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          Assign Outlet
        </button>
        <button
          type="button"
          onClick={onArchive}
          aria-label="Archive selected"
          className={cn(
            btnClass,
            'text-state-danger border-state-danger/30 hover:bg-state-danger/5',
          )}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          Archive
        </button>
      </div>

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className={cn(
          'ml-auto rounded p-1 text-ink-muted hover:text-ink-primary',
          'hover:bg-bg-subtle transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
