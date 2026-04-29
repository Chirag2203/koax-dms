/**
 * VisualizerPlayground — standalone 3D visualizer without a Build Job.
 *
 * L94: Showroom demo. Uses a synthetic empty BuildJob so VisualizerTab can
 * reuse its full state machine. "Save to Build" is disabled with a tooltip.
 * Customizations are local-only — not persisted to any store.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §38 L94
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info } from 'lucide-react';
import type { BuildJob } from '@dms/types';
import { VisualizerTab } from './visualizer-tab';

// ─── Synthetic empty BuildJob (local-only, no store) ─────────────────────────

function makeSyntheticJob(): BuildJob {
  return {
    id: '__playground__',
    title: 'Visualizer Playground',
    stage: 'ENQUIRY',
    customerId: '__demo__',
    vin: '__demo__',
    outletId: '__demo__',
    parts: [],
    marginPct: 15,
    activityLog: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VisualizerPlayground() {
  const syntheticJob = useMemo(() => makeSyntheticJob(), []);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1a]">
      {/* Playground header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-white/6 bg-black/40 flex-shrink-0">
        <Link
          href="/custom-builds"
          className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          <ArrowLeft size={13} aria-hidden />
          Back to Builds
        </Link>

        <div className="flex-1">
          <span className="text-[13px] font-semibold text-white/70">Visualizer Playground</span>
          <span className="ml-2 text-[11px] text-white/30">Demo mode — changes are not saved</span>
        </div>

        {/* Tooltip about Save to Build */}
        <div className="group relative">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/35 cursor-default">
            <Info size={11} aria-hidden />
            Save to Build disabled
          </div>
          <div className="absolute right-0 top-8 w-56 px-3 py-2.5 bg-slate-800 border border-white/10 rounded-lg text-[11px] text-white/60 leading-snug hidden group-hover:block z-50 shadow-xl">
            In playground mode, customizations are not persisted. To save, create a Build Job first from the Custom Builds board and open the Visualizer tab.
          </div>
        </div>
      </div>

      {/* Full-height visualizer — synthetic job, save action is a no-op for __playground__ */}
      <div className="flex-1 overflow-hidden">
        <VisualizerTab job={syntheticJob} />
      </div>
    </div>
  );
}
