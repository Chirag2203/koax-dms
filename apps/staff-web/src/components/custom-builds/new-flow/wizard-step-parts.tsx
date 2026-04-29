/**
 * Wizard Step 4 — Pick parts (optional).
 *
 * Multi-select from parts catalog with running total.
 * Optional step — user can skip.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 P1.1 Issue 6 Step 4
 */

'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { cn } from '@dms/ui';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import type { CustomBuildPart } from '@dms/types';
import { formatINR } from '../shared/format-inr';
import type { WizardData } from './new-build-wizard';

interface Props {
  data: WizardData;
  onUpdate: (d: WizardData) => void;
}

export function WizardStepParts({ data, onUpdate }: Props) {
  const parts = useCustomBuildsStore((s) => s.parts);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return parts.slice(0, 24);
    const q = search.trim().toLowerCase();
    return parts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    ).slice(0, 24);
  }, [parts, search]);

  const getQty = (sku: string) => {
    return data.selectedParts.find((x) => x.part.sku === sku)?.qty ?? 0;
  };

  const addPart = (part: CustomBuildPart) => {
    const existing = data.selectedParts.find((x) => x.part.sku === part.sku);
    if (existing) {
      onUpdate({
        ...data,
        selectedParts: data.selectedParts.map((x) =>
          x.part.sku === part.sku ? { ...x, qty: x.qty + 1 } : x,
        ),
      });
    } else {
      onUpdate({ ...data, selectedParts: [...data.selectedParts, { part, qty: 1 }] });
    }
  };

  const removePart = (sku: string) => {
    const existing = data.selectedParts.find((x) => x.part.sku === sku);
    if (!existing) return;
    if (existing.qty <= 1) {
      onUpdate({ ...data, selectedParts: data.selectedParts.filter((x) => x.part.sku !== sku) });
    } else {
      onUpdate({
        ...data,
        selectedParts: data.selectedParts.map((x) =>
          x.part.sku === sku ? { ...x, qty: x.qty - 1 } : x,
        ),
      });
    }
  };

  const runningTotal = data.selectedParts.reduce(
    (sum, { part, qty }) => sum + (part.bnCost ?? part.listPrice) * qty,
    0,
  );

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-primary">Add Parts <span className="text-[13px] text-ink-muted font-normal">(optional)</span></h2>
        <p className="text-[13px] text-ink-muted mt-0.5">Select parts from the catalog. You can add more later.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search parts..."
          className="w-full h-9 pl-8 pr-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          aria-label="Search parts"
        />
      </div>

      <div className="flex gap-4">
        {/* Part list */}
        <div className="flex-1 rounded-md border border-line divide-y divide-line max-h-80 overflow-y-auto">
          {filtered.map((part) => {
            const qty = getQty(part.sku);
            return (
              <div
                key={part.sku}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5',
                  qty > 0 && 'bg-accent/5',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-ink-primary truncate">{part.name}</p>
                  <p className="text-[10px] text-ink-muted font-mono">{part.sku} · {part.category}</p>
                </div>
                <span className="font-mono text-[11px] text-ink-secondary tabular-nums shrink-0">
                  {formatINR(part.bnCost ?? part.listPrice)}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => removePart(part.sku)}
                    disabled={qty === 0}
                    className="w-6 h-6 rounded border border-line flex items-center justify-center text-ink-muted hover:text-ink-primary disabled:opacity-30 transition-colors"
                    aria-label={`Remove ${part.name}`}
                  >
                    <Minus size={10} aria-hidden="true" />
                  </button>
                  <span className="w-5 text-center font-mono text-[12px] text-ink-primary tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => addPart(part)}
                    className="w-6 h-6 rounded border border-line flex items-center justify-center text-ink-muted hover:text-accent transition-colors"
                    aria-label={`Add ${part.name}`}
                  >
                    <Plus size={10} aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Running total */}
        {data.selectedParts.length > 0 && (
          <div className="w-48 shrink-0 space-y-2">
            <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wider">Selected Parts</p>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {data.selectedParts.map(({ part, qty }) => (
                <div key={part.sku} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-ink-secondary truncate">{qty}× {part.name}</span>
                  <span className="font-mono text-ink-primary tabular-nums shrink-0">
                    {formatINR((part.bnCost ?? part.listPrice) * qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-line pt-2 flex justify-between text-[12px] font-medium">
              <span className="text-ink-primary">Subtotal</span>
              <span className="font-mono text-ink-primary tabular-nums">{formatINR(runningTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
