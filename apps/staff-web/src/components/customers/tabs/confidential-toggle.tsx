'use client';

/**
 * ConfidentialToggle — PLAN-VEHICLES-002 §E
 *
 * Toggle switch that sets/clears the contactConfidential flag on a customer.
 * Renders a ToastContainer for its own feedback; the profile tab just mounts it.
 *
 * LoC budget: ≤80
 */

import { Lock, Unlock } from 'lucide-react';
import { cn } from '@dms/ui';
import { ToastContainer } from '@/src/components/primitives';
import { useCustomersStore } from '@/src/lib/customers/customers-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useToast } from '@/src/hooks/use-toast';
import type { Customer } from '@dms/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfidentialToggleProps {
  customer: Customer;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfidentialToggle({ customer }: ConfidentialToggleProps) {
  const { user } = useStaffAuth();
  const updateCustomerProfile = useCustomersStore((s) => s.updateCustomerProfile);
  const { toasts, toast, dismiss } = useToast();

  const isOn = customer.contactConfidential === true;

  function handleChange() {
    if (!user) return;
    const next = !isOn;
    updateCustomerProfile(
      customer.id,
      { contactConfidential: next },
      { id: user.id, name: user.name, role: user.role },
    );
    toast(
      next
        ? 'Contact details marked confidential — visible to R19+ only.'
        : 'Contact details set to visible for all staff.',
      'success',
    );
  }

  return (
    <>
      <div className="flex items-start gap-3 rounded-md border border-line bg-bg-surface p-4">
        {/* Icon */}
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {isOn
            ? <Lock className="h-4 w-4 text-accent" />
            : <Unlock className="h-4 w-4 text-ink-muted" />}
        </span>

        {/* Label + helper */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-primary leading-snug">
            Mark contact details as confidential
          </p>
          <p className="text-xs text-ink-muted mt-0.5">
            When enabled, phone / email / address are visible only to General Manager and above (R19+).
          </p>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-label="Toggle contact confidentiality"
          onClick={handleChange}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
            'transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-accent focus-visible:ring-offset-2',
            isOn ? 'bg-accent' : 'bg-line',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm',
              'ring-0 transition duration-200 ease-in-out',
              isOn ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
