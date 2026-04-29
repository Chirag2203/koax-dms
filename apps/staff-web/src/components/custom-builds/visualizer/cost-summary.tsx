/**
 * CostSummary — premium cost footer for the visualizer.
 *
 * L38 (locked): Live ticker animation when total changes, visual breakdown
 *   bar, hover-elevation CTA, delta chip vs saved estimate.
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §9.5, §9.6, §24
 */

'use client';

import { Save, Share2, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@dms/ui';
import type { BuildJob } from '@dms/types';
import { formatINR } from '../shared/format-inr';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CostSummaryProps {
  job: BuildJob;
  selectedTotal: number;
  /** L89: Full customization total (paint + all 6 catalog categories + decals).
   *  When provided, the "SELECTED OPTIONS" footer shows paintPrice + customizationTotal.
   *  Defaults to 0 for backwards compatibility. */
  customizationTotal?: number;
  isSaving: boolean;
  isSaved: boolean;
  onSave: () => void;
  onShare: () => void;
  canSave: boolean;
  isDelivered: boolean;
}

// ─── Animated ticker ──────────────────────────────────────────────────────────

function TickerNumber({ value, className }: { value: number; className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(value);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    setDirection(value > prevRef.current ? 'up' : 'down');
    prevRef.current = value;

    if (prefersReducedMotion) {
      setDisplayed(value);
      return;
    }

    // Animate from prev to new over ~400ms with step-easing
    const start = displayed;
    const end = value;
    const duration = 400;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out quad
      const ease = 1 - (1 - progress) ** 2;
      setDisplayed(Math.round(start + (end - start) * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={`ticker-${value}`}
        initial={prefersReducedMotion ? {} : { y: direction === 'up' ? 8 : -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={prefersReducedMotion ? {} : { y: direction === 'up' ? -8 : 8, opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={className}
        aria-live="polite"
        aria-atomic="true"
      >
        {formatINR(displayed)}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

function BreakdownBar({ total, estimate }: { total: number; estimate: number | null | undefined }) {
  if (!total && !estimate) return null;

  const max = Math.max(total, estimate ?? 0, 1);
  const partsBarW = Math.round((total / max) * 100);
  const estBarW = estimate != null ? Math.round((estimate / max) * 100) : 0;

  return (
    <div className="flex items-center gap-2 mt-1.5" aria-hidden>
      <div className="flex-1 flex flex-col gap-0.5">
        {total > 0 && (
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${partsBarW}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        )}
        {estimate != null && estimate > 0 && (
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white/30"
              initial={{ width: 0 }}
              animate={{ width: `${estBarW}%` }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-right">
        {total > 0 && <span className="text-[8px] text-accent/70 font-mono leading-none">Selected</span>}
        {estimate != null && estimate > 0 && <span className="text-[8px] text-white/25 font-mono leading-none">Saved</span>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CostSummary({
  job,
  selectedTotal,
  customizationTotal = 0,
  isSaving,
  isSaved,
  onSave,
  onShare,
  canSave,
  isDelivered,
}: CostSummaryProps) {
  const savedEstimate = job.quoteTotal;
  // L89: Footer aggregates full customization total. selectedTotal covers overlay
  // parts + paint from the 2D rail; customizationTotal covers catalog customizations
  // from the 3D panel. Sum both to get the true bottom-left "Selected Options" figure.
  const displayTotal = selectedTotal + customizationTotal;
  const diff = savedEstimate != null ? displayTotal - savedEstimate : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-3 border-t border-white/6',
        'bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-sm',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
      )}
    >
      {/* Cost breakdown */}
      <div className="flex flex-wrap gap-4 min-w-0">
        {/* Selected total with ticker */}
        <div className="min-w-[120px]">
          <p className="text-[12px] text-white/35 uppercase tracking-widest mb-0.5">
            Selected options
          </p>
          <TickerNumber
            value={displayTotal}
            className="text-[20px] font-bold font-mono text-white/85 block"
          />
          <BreakdownBar total={displayTotal} estimate={savedEstimate} />
          <p className="text-[9px] text-white/25 mt-0.5">List prices · excl. labour &amp; GST</p>
        </div>

        {/* Saved estimate + delta chip */}
        {savedEstimate != null && (
          <>
            <div className="w-px bg-white/6 hidden sm:block self-stretch" aria-hidden />
            <div>
              <p className="text-[12px] text-white/35 uppercase tracking-widest mb-0.5">
                Saved estimate
              </p>
              <p
                className="text-[18px] font-semibold font-mono text-white/45"
                aria-label={`Saved build estimate: ${formatINR(savedEstimate)}`}
              >
                {formatINR(savedEstimate)}
              </p>

              {/* Delta chip */}
              {diff !== null && diff !== 0 && (
                <motion.div
                  key={diff}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md mt-0.5',
                    'text-[10px] font-mono font-medium',
                    diff > 0
                      ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                      : 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
                  )}
                  aria-label={`${diff > 0 ? 'Over' : 'Under'} estimate by ${formatINR(Math.abs(diff))}`}
                >
                  {diff > 0
                    ? <TrendingUp size={9} aria-hidden />
                    : <TrendingDown size={9} aria-hidden />}
                  {diff > 0 ? '+' : ''}{formatINR(diff)}
                </motion.div>
              )}
              {diff === 0 && (
                <span className="text-[10px] text-white/30 font-mono ml-0.5">matches estimate</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* CTAs */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Share Preview */}
        <button
          type="button"
          onClick={onShare}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium',
            'border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/6',
            'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
          aria-label="Share preview link (generates 14-day token)"
        >
          <Share2 size={13} aria-hidden />
          Share
        </button>

        {/* Save to Build — with hover elevation */}
        <motion.button
          type="button"
          onClick={onSave}
          disabled={!canSave || isSaving || isDelivered}
          whileHover={canSave && !isDelivered ? { scale: 1.03, y: -1 } : {}}
          whileTap={canSave && !isDelivered ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold',
            'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            canSave && !isDelivered
              ? 'bg-accent text-white shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:bg-accent/90'
              : 'bg-white/6 text-white/25 cursor-not-allowed opacity-60',
          )}
          aria-label={
            isDelivered
              ? 'Build is delivered — visualizer state is immutable'
              : 'Save visualizer state to this build job'
          }
          title={
            isDelivered
              ? 'Immutable after DELIVERED'
              : !canSave
              ? 'Requires R09+ role'
              : undefined
          }
        >
          {isSaved && !isSaving ? (
            <>
              <CheckCircle size={13} aria-hidden />
              Saved
            </>
          ) : (
            <>
              <Save size={13} aria-hidden />
              {isSaving ? 'Saving…' : 'Save to Build'}
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
