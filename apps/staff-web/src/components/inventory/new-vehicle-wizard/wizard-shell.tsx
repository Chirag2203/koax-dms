'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@dms/ui';
import { ProgressStepper } from '@/src/components/primitives';
import type { StepperStep } from '@/src/components/primitives';
import { KbdShortcut } from '@/src/components/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WizardShellProps {
  currentStep: number;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  children: React.ReactNode;
  rail?: React.ReactNode;
}

// ─── Wizard steps ─────────────────────────────────────────────────────────────

const STEPS: StepperStep[] = [
  { id: 'acquisition', label: 'Acquisition' },
  { id: 'specs',       label: 'Vehicle Specs' },
  { id: 'condition',   label: 'Condition & History' },
  { id: 'pricing',     label: 'Pricing' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardShell({
  currentStep,
  onCancel,
  onSaveDraft,
  onSubmit,
  isSubmitting = false,
  children,
  rail,
}: WizardShellProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-bg-canvas">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'sticky top-0 z-20 h-14 shrink-0 flex items-center justify-between',
          'px-6 bg-bg-canvas border-b border-line',
        )}
      >
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/inventory"
            className="text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            Inventory
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
          <span className="font-medium text-ink-primary">New Vehicle</span>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSaveDraft}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-medium border border-line',
              'bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              'inline-flex items-center gap-2',
            )}
          >
            Save as Draft
            <KbdShortcut keys="⌘S" />
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              'h-9 px-4 rounded-md text-sm font-semibold text-white',
              'bg-accent hover:bg-accent/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'inline-flex items-center gap-2',
            )}
          >
            {isSubmitting ? 'Submitting…' : 'Submit for Review'}
            {!isSubmitting && <KbdShortcut keys="⌘↵" />}
          </button>
        </div>
      </div>

      {/* ── Stepper ───────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-line shrink-0 bg-bg-canvas">
        <ProgressStepper steps={STEPS} currentIndex={currentStep} />
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex gap-8 px-6 py-10 max-w-[1160px] mx-auto">
          {/* Main form area */}
          <div className="flex-1 min-w-0 max-w-[720px]">
            {children}
          </div>

          {/* Right rail (desktop) */}
          {rail && (
            <aside className="hidden lg:block w-[320px] shrink-0">
              <div className="sticky top-4">
                {rail}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
