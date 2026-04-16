import { Check } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepperStep {
  id: string;
  label: string;
}

export interface ProgressStepperProps {
  steps: StepperStep[];
  currentIndex: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProgressStepper({ steps, currentIndex, className }: ProgressStepperProps) {
  return (
    <nav aria-label="Progress" className={cn('flex items-center', className)}>
      <ol className="flex w-full items-center">
        {steps.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                {/* Circle */}
                <div
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-colors',
                    isPast && 'bg-success text-white',
                    isCurrent && 'bg-accent text-white ring-4 ring-accent/20',
                    isFuture && 'border-2 border-line bg-bg-canvas text-ink-muted',
                  )}
                >
                  {isPast ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <span className="text-[11px] font-mono font-semibold">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'whitespace-nowrap text-[11px]',
                    isPast && 'text-ink-secondary',
                    isCurrent && 'font-semibold text-ink-primary',
                    isFuture && 'text-ink-muted',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'mx-2 mb-5 h-px flex-1 transition-colors',
                    isPast ? 'bg-success' : 'bg-line',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
