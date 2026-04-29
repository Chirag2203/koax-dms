/**
 * AddPartDialog — searchable part picker for adding a part to a Build Job.
 *
 * Opens from Parts & Estimate tab. Filters aftermarket parts catalog.
 * On submit calls store.addPart().
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §6 Tab 2, P1.1 L20
 */

'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '@/src/components/primitives/dialog';
import { cn } from '@dms/ui';
import type { CustomBuildPart } from '@dms/types';
import { formatINR } from '../shared/format-inr';

interface AddPartDialogProps {
  open: boolean;
  onClose: () => void;
  parts: CustomBuildPart[];
  onAdd: (part: CustomBuildPart, qty: number) => void;
  lockedStage?: boolean;
}

export function AddPartDialog({ open, onClose, parts, onAdd, lockedStage }: AddPartDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomBuildPart | null>(null);
  const [qty, setQty] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return parts.slice(0, 20);
    const q = search.trim().toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [parts, search]);

  const handleClose = () => {
    setSearch('');
    setSelected(null);
    setQty(1);
    onClose();
  };

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected, qty);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add Part"
      subtitle="Search the aftermarket parts catalog"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected || lockedStage}
            className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Part
          </button>
        </>
      }
    >
      {lockedStage ? (
        <p className="text-[13px] text-ink-muted text-center py-4">
          Parts cannot be added after the job is Approved.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Search by name, SKU, or brand..."
              className="w-full h-9 pl-8 pr-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              aria-label="Search parts"
              autoFocus
            />
          </div>

          {/* Part list */}
          <div className="max-h-64 overflow-y-auto rounded-md border border-line divide-y divide-line">
            {filtered.length === 0 ? (
              <p className="text-[13px] text-ink-muted text-center py-6">No parts found.</p>
            ) : (
              filtered.map((part) => (
                <button
                  key={part.sku}
                  type="button"
                  onClick={() => setSelected(part)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                    selected?.sku === part.sku
                      ? 'bg-accent/10 border-l-2 border-accent'
                      : 'hover:bg-bg-hover',
                  )}
                  aria-pressed={selected?.sku === part.sku}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink-primary truncate">{part.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      <span className="font-mono">{part.sku}</span> · {part.brand} · {part.category}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-[12px] text-ink-primary tabular-nums">{formatINR(part.listPrice)}</p>
                    <p className="text-[10px] text-ink-muted">{part.installHours}h install</p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Quantity picker */}
          {selected && (
            <div className="flex items-center gap-3 p-3 rounded-md bg-bg-subtle border border-line">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink-primary truncate">{selected.name}</p>
                <p className="text-[11px] text-ink-muted font-mono">{selected.sku}</p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="part-qty" className="text-[12px] text-ink-muted">Qty</label>
                <input
                  id="part-qty"
                  type="number"
                  min={1}
                  max={99}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 h-8 text-center rounded-md border border-line bg-bg-canvas text-[13px] font-mono text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
