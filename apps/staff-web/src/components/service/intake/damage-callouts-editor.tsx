'use client';

/**
 * DamageCalloutsEditor — inline editor for pre-existing damage annotations.
 *
 * Renders the 5-view body diagram (intake-diagram.svg) as a static image.
 * Lists current callouts with auto-numbering.
 * "Add callout" → modal with view picker, location text, code picker, severity slider.
 *
 * L4: damage callouts are part of Section B in INTAKE_FIELDS.
 * SPEC-ARCH-UI-001 §3.1: Card/Field imported, not redefined.
 * SPEC-ARCH-UI-001 §3.9: Slider is the canonical range input (L42).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/src/components/custom-builds/shared/detail-card';
import { Slider } from '@/src/components/primitives/slider';
import { Dialog } from '@/src/components/primitives/dialog';
import type { IntakeDamageCallout } from '@dms/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DamageView = 'TOP' | 'FRONT' | 'REAR' | 'LEFT' | 'RIGHT';
export type DamageCode = 'S' | 'D' | 'C' | 'R' | 'B' | 'P';

export interface DamageCalloutDraft {
  view: DamageView;
  locationText: string;
  code: DamageCode;
  severity: 1 | 2 | 3;
}

interface Props {
  callouts: IntakeDamageCallout[];
  onAdd: (draft: DamageCalloutDraft) => void;
  onRemove: (calloutId: string) => void;
  disabled?: boolean;
}

// ── Code / view label maps ─────────────────────────────────────────────────────

const CODE_LABELS: Record<DamageCode, string> = {
  S: 'Scratch',
  D: 'Dent',
  C: 'Chip / Crack',
  R: 'Rust',
  B: 'Broken / Missing',
  P: 'Paint Fade',
};

const VIEW_LABELS: Record<DamageView, string> = {
  TOP: 'Top / Roof',
  FRONT: 'Front',
  REAR: 'Rear',
  LEFT: 'Left Side',
  RIGHT: 'Right Side',
};

const SEV_LABELS: Record<number, string> = {
  1: 'Minor',
  2: 'Moderate',
  3: 'Severe',
};

// ── Empty draft ────────────────────────────────────────────────────────────────

const EMPTY_DRAFT: DamageCalloutDraft = {
  view: 'TOP',
  locationText: '',
  code: 'S',
  severity: 1,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DamageCalloutsEditor({ callouts, onAdd, onRemove, disabled = false }: Props) {
  const t = useTranslations('serviceIntake');
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<DamageCalloutDraft>(EMPTY_DRAFT);
  const [locationError, setLocationError] = useState('');

  function handleOpenAdd() {
    setDraft(EMPTY_DRAFT);
    setLocationError('');
    setAddOpen(true);
  }

  function handleSave() {
    if (!draft.locationText.trim()) {
      setLocationError('Location description is required');
      return;
    }
    onAdd(draft);
    setAddOpen(false);
  }

  return (
    <>
      <Card
        title={t('fields.damageCallouts.label')}
        rightSlot={
          !disabled && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              aria-label="Add damage callout"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Add callout
            </button>
          )
        }
      >
        {/* Body diagram (static — L6: v1 stub SVG, P2 adds clickable overlay) */}
        <div className="mb-4 rounded-md border border-line overflow-hidden bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/intake-diagram.svg"
            alt="5-view vehicle body diagram"
            className="w-full object-contain"
            style={{ maxHeight: '180px' }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.entries(CODE_LABELS) as [DamageCode, string][]).map(([code, label]) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-bg-subtle text-xs text-ink-secondary"
            >
              <span className="font-mono font-semibold text-ink-primary">{code}</span>
              {label}
            </span>
          ))}
        </div>

        {/* Callout table */}
        {callouts.length === 0 ? (
          <p className="text-sm text-ink-muted italic">No damage recorded — vehicle received in clean condition.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" role="table" aria-label="Damage callouts">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3 w-8">#</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3">View</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3">Location</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3">Code</th>
                  <th className="text-left text-xs text-ink-muted uppercase tracking-wider pb-2 pr-3">Sev.</th>
                  {!disabled && <th className="w-8 pb-2" />}
                </tr>
              </thead>
              <tbody>
                {callouts.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs text-ink-muted">{c.number}</td>
                    <td className="py-2 pr-3 text-sm text-ink-primary">{VIEW_LABELS[c.view as DamageView]}</td>
                    <td className="py-2 pr-3 text-sm text-ink-primary max-w-[200px] truncate">{c.locationText}</td>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs font-semibold text-ink-primary bg-bg-subtle px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-ink-secondary">{SEV_LABELS[c.severity] ?? c.severity}</td>
                    {!disabled && (
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => onRemove(c.id)}
                          className="text-ink-muted hover:text-state-danger transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
                          aria-label={`Remove callout ${c.number}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add callout dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Damage Callout"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Add
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* View picker */}
          <div>
            <label htmlFor="callout-view" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
              View
            </label>
            <select
              id="callout-view"
              value={draft.view}
              onChange={(e) => setDraft((d) => ({ ...d, view: e.target.value as DamageView }))}
              className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              {(Object.entries(VIEW_LABELS) as [DamageView, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Location text */}
          <div>
            <label htmlFor="callout-location" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
              Location Description
            </label>
            <input
              id="callout-location"
              type="text"
              value={draft.locationText}
              onChange={(e) => {
                setDraft((d) => ({ ...d, locationText: e.target.value }));
                setLocationError('');
              }}
              placeholder="e.g. Front left door, lower panel"
              className={`h-10 w-full bg-bg-subtle border rounded-md px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 ${locationError ? 'border-state-danger' : 'border-line'}`}
              aria-describedby={locationError ? 'location-error' : undefined}
            />
            {locationError && (
              <p id="location-error" className="text-xs text-state-danger mt-1">{locationError}</p>
            )}
          </div>

          {/* Code picker */}
          <div>
            <label htmlFor="callout-code" className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5">
              Damage Code
            </label>
            <select
              id="callout-code"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value as DamageCode }))}
              className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              {(Object.entries(CODE_LABELS) as [DamageCode, string][]).map(([c, l]) => (
                <option key={c} value={c}>{c} — {l}</option>
              ))}
            </select>
          </div>

          {/* Severity slider — L42: Slider is the canonical range input */}
          <div>
            <Slider
              label="Severity"
              value={draft.severity}
              onChange={(v) => setDraft((d) => ({ ...d, severity: v as 1 | 2 | 3 }))}
              min={1}
              max={3}
              step={1}
              formatValue={(v) => SEV_LABELS[v] ?? String(v)}
              aria-label="Damage severity"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
