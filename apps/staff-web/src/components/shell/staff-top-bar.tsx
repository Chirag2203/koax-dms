'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search } from 'lucide-react';
import { useCommandPalette } from '@/src/providers/command-palette-provider';
import { useOutlet } from '@/src/providers/outlet-provider';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface StaffTopBarProps {
  breadcrumbs?: Breadcrumb[];
}

// ── Breadcrumb derivation ────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  sales: 'Sales',
  service: 'Service',
  parts: 'Parts',
  customers: 'Customers',
  finance: 'Finance',
  reports: 'Reports',
  notifications: 'Notifications',
  settings: 'Settings',
  audit: 'Audit Log',
  new: 'New',
  edit: 'Edit',
};

function deriveFromPathname(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Dashboard' }];

  return segments.map((seg, idx) => {
    const label = ROUTE_LABELS[seg] ?? seg;
    const href = '/' + segments.slice(0, idx + 1).join('/');
    const isLast = idx === segments.length - 1;
    return { label, href: isLast ? undefined : href };
  });
}

// ── Outlet full labels ───────────────────────────────────────────────────────

const OUTLET_PILL_LABELS: Record<string, string> = {
  bangalore: 'Bangalore',
  mumbai: 'Mumbai',
  chennai: 'Chennai',
  all: 'All Outlets',
};

// ── Component ───────────────────────────────────────────────────────────────

export function StaffTopBar({ breadcrumbs }: StaffTopBarProps) {
  const pathname = usePathname();
  const { setOpen } = useCommandPalette();
  const { outlet } = useOutlet();
  const { user } = useStaffAuth();

  const crumbs = breadcrumbs ?? deriveFromPathname(pathname);

  return (
    <header
      className="sticky top-0 z-40 flex items-center h-12 bg-bg-canvas/95 backdrop-blur-sm border-b border-line px-4 gap-4 flex-shrink-0"
      aria-label="Top bar"
    >
      {/* ── Left zone: breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;

          return (
            <span key={idx} className="flex items-center gap-1 min-w-0">
              {idx > 0 && (
                <span className="text-[13px] text-ink-muted flex-shrink-0 select-none" aria-hidden="true">
                  /
                </span>
              )}

              {isLast || !crumb.href ? (
                <span
                  className="text-[13px] text-ink-primary font-medium truncate"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[13px] text-accent hover:text-accent-hover truncate transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg-canvas rounded-sm"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {/* ── Center zone: command palette trigger ── */}
      <div className="flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette (⌘K)"
          className={[
            'flex items-center gap-2 w-80 h-8 rounded-md px-3',
            'bg-bg-subtle hover:bg-bg-hover border border-line',
            'transition-colors duration-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
          ].join(' ')}
        >
          <Search size={14} className="text-ink-muted flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-[14px] text-ink-muted text-left select-none truncate">
            Search or jump to&hellip;
          </span>
          <kbd
            className="font-mono text-[11px] text-ink-muted px-1 py-0.5 rounded bg-bg-canvas border border-line leading-none flex-shrink-0 select-none"
            aria-label="Command K shortcut"
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right zone: actions ── */}
      <div className="flex-shrink-0 flex items-center gap-3">
        {/* Notifications bell */}
        <button
          type="button"
          aria-label="Notifications (unread)"
          className="relative flex items-center justify-center w-8 h-8 rounded-md text-ink-secondary hover:bg-bg-hover hover:text-ink-primary transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
        >
          <Bell size={18} aria-hidden="true" />
          {/* Unread indicator — always visible as placeholder */}
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border-2 border-bg-canvas"
            aria-hidden="true"
          />
        </button>

        {/* Outlet pill */}
        <div
          aria-label={`Current outlet: ${OUTLET_PILL_LABELS[outlet] ?? outlet}`}
          className="flex items-center px-2 py-1 rounded-md bg-bg-subtle border border-line text-[12px] font-medium text-ink-secondary whitespace-nowrap select-none"
        >
          {OUTLET_PILL_LABELS[outlet] ?? 'All Outlets'}
        </div>

        {/* User avatar */}
        <button
          type="button"
          aria-label={`User menu: ${user?.name ?? 'User'}`}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center font-mono text-[11px] font-medium text-white uppercase leading-none hover:ring-2 hover:ring-accent hover:ring-offset-2 hover:ring-offset-bg-canvas transition-shadow duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
        >
          {user?.avatar ?? '??'}
        </button>
      </div>
    </header>
  );
}
