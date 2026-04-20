'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Eye, UserPlus, UserX } from 'lucide-react';
import { cn } from '@dms/ui';
import { Gate } from '@/src/components/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleRowActionsProps {
  vin: string;
  onView: () => void;
  onAssignOwner: () => void;
  onRevoke: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleRowActions({
  onView,
  onAssignOwner,
  onRevoke,
}: VehicleRowActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'rounded p-1.5 text-ink-muted hover:text-ink-primary hover:bg-bg-subtle',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-line bg-bg-surface shadow-lg py-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { onView(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 h-9 text-left text-sm text-ink-secondary hover:bg-bg-hover hover:text-ink-primary transition-colors"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View
          </button>

          <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={() => { onAssignOwner(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 h-9 text-left text-sm text-ink-secondary hover:bg-bg-hover hover:text-ink-primary transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Assign Owner
            </button>
          </Gate>

          <Gate role={['R09', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              role="menuitem"
              onClick={() => { onRevoke(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 h-9 text-left text-sm text-danger hover:bg-bg-hover transition-colors"
            >
              <UserX className="h-3.5 w-3.5" aria-hidden="true" />
              Revoke
            </button>
          </Gate>
        </div>
      )}
    </div>
  );
}
