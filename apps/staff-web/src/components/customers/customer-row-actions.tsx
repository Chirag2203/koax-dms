'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Eye } from 'lucide-react';
import { cn } from '@dms/ui';

export interface CustomerRowActionsProps {
  customerId: string;
  onView: () => void;
}

export function CustomerRowActions({ onView }: CustomerRowActionsProps) {
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
        className={cn(
          'rounded p-1.5 text-ink-muted hover:text-ink-primary hover:bg-bg-subtle',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-bg-surface shadow-lg py-1">
          <button
            type="button"
            role="menuitem"
            onClick={() => { onView(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 h-9 text-left text-sm text-ink-secondary hover:bg-bg-hover hover:text-ink-primary transition-colors"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View Profile
          </button>
        </div>
      )}
    </div>
  );
}
