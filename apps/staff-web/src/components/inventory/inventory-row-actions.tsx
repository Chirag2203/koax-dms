'use client';

import { useState, useRef, useEffect } from 'react';
import { Eye, Pencil, MoreHorizontal } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryRowActionsProps {
  vin: string;
  onView: (vin: string) => void;
  onEdit: (vin: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InventoryRowActions({ vin, onView, onEdit }: InventoryRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const iconBtn = cn(
    'rounded p-1.5 text-ink-muted hover:text-ink-primary hover:bg-bg-hover',
    'transition-colors focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
  );

  return (
    <div className="flex items-center gap-0.5" ref={menuRef}>
      <button
        type="button"
        onClick={() => onView(vin)}
        aria-label={`View vehicle ${vin}`}
        className={iconBtn}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={() => onEdit(vin)}
        aria-label={`Edit vehicle ${vin}`}
        className={iconBtn}
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={iconBtn}
        >
          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={cn(
              'absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-line',
              'bg-bg-canvas shadow-lg py-1',
            )}
          >
            {[
              { label: 'View Details', onClick: () => { onView(vin); setMenuOpen(false); } },
              { label: 'Edit Vehicle', onClick: () => { onEdit(vin); setMenuOpen(false); } },
              { label: 'Duplicate', onClick: () => setMenuOpen(false) },
              { label: 'Archive', onClick: () => setMenuOpen(false), danger: true },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-xs font-medium',
                  'hover:bg-bg-subtle transition-colors',
                  item.danger ? 'text-state-danger' : 'text-ink-primary',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
