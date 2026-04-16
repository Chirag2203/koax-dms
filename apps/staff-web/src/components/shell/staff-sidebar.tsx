'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Bell,
  Boxes,
  Car,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  Shield,
  Users,
  Wrench,
  ChevronDown,
  Check,
  Moon,
  Sun,
} from 'lucide-react';

// Providers created by Agent B — will resolve at compile time
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { useOutlet } from '@/src/providers/outlet-provider';
import { useTheme } from '@/src/providers/theme-provider';

const SIDEBAR_STORAGE_KEY = 'bn-staff-sidebar-collapsed';

// ── Nav config ──────────────────────────────────────────────────────────────

type NavItem = {
  key: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeDot?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { key: 'inventory', href: '/inventory', icon: Car, badge: '42' },
      { key: 'sales', href: '/sales', icon: Receipt },
      { key: 'service', href: '/service', icon: Wrench },
      { key: 'parts', href: '/parts', icon: Boxes },
    ],
  },
  {
    label: 'Operations',
    items: [
      { key: 'customers', href: '/customers', icon: Users },
      { key: 'finance', href: '/finance', icon: IndianRupee },
      { key: 'reports', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'notifications', href: '/notifications', icon: Bell, badgeDot: true },
      { key: 'settings', href: '/settings', icon: Settings },
      { key: 'audit', href: '/audit', icon: Shield },
    ],
  },
];

const OUTLET_LABELS: Record<string, string> = {
  bangalore: 'BLR',
  mumbai: 'MUM',
  chennai: 'CHE',
  all: 'ALL',
};

const OUTLET_FULL_LABELS: Record<string, string> = {
  bangalore: 'Bangalore',
  mumbai: 'Mumbai',
  chennai: 'Chennai',
  all: 'All Outlets',
};

type OutletCode = 'bangalore' | 'mumbai' | 'chennai' | 'all';
const OUTLET_OPTIONS: OutletCode[] = ['bangalore', 'mumbai', 'chennai', 'all'];

// ── Component ───────────────────────────────────────────────────────────────

export function StaffSidebar() {
  const t = useTranslations('staff.nav');
  const pathname = usePathname();

  // Collapsed state — persisted to localStorage
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Outlet dropdown
  const [outletOpen, setOutletOpen] = useState(false);
  const outletRef = useRef<HTMLDivElement>(null);

  // User dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, signOut } = useStaffAuth();
  const { outlet, setOutlet } = useOutlet();
  const { resolvedTheme, setTheme } = useTheme();

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (outletRef.current && !outletRef.current.contains(e.target as Node)) {
        setOutletOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  // Suppress layout shift during hydration
  const width = hydrated ? (collapsed ? 56 : 220) : 220;

  return (
    <aside
      className="flex-shrink-0 flex flex-col bg-bg-surface border-r border-line relative z-30 transition-all duration-120 overflow-hidden"
      style={{ width }}
      aria-label="Main navigation"
    >
      {/* ── Logo area ── */}
      <div className="flex items-center h-14 px-3 border-b border-line flex-shrink-0">
        {collapsed ? (
          <span className="font-mono font-semibold text-[15px] text-ink-primary tracking-tight w-8 text-center">
            BN
          </span>
        ) : (
          <span className="font-sans font-semibold text-[16px] text-ink-primary tracking-tight whitespace-nowrap">
            BN DMS
          </span>
        )}
      </div>

      {/* ── Nav groups ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none" aria-label="Staff navigation">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {/* Group separator (except first group) */}
            {gi > 0 && (
              <div className="mx-3 my-1 border-t border-line" />
            )}

            {/* Group label — only visible when expanded */}
            {!collapsed && (
              <div className="px-3 py-2 mt-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">
                  {group.label}
                </span>
              </div>
            )}

            {/* Group items */}
            <ul className="px-2 space-y-0.5" role="list">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      title={collapsed ? t(item.key) : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'flex items-center h-10 rounded-md gap-2 transition-colors duration-100',
                        collapsed ? 'justify-center px-0 w-full' : 'px-3',
                        active
                          ? 'bg-bg-active text-ink-primary border-l-2 border-accent pl-2.5'
                          : 'text-ink-secondary hover:bg-bg-hover hover:text-ink-primary',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
                      ].join(' ')}
                    >
                      {/* Icon */}
                      <span className="flex-shrink-0">
                        <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                      </span>

                      {/* Label + badge (hidden when collapsed) */}
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-[14px] font-medium leading-none truncate">
                            {t(item.key)}
                          </span>

                          {/* Badge — numeric count */}
                          {item.badge && (
                            <span className="font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-full bg-accent/15 text-accent leading-none">
                              {item.badge}
                            </span>
                          )}

                          {/* Badge — unread dot */}
                          {item.badgeDot && (
                            <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" aria-label="Unread notifications" />
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Bottom section ── */}
      <div className="flex-shrink-0 border-t border-line pb-2 pt-2 space-y-1 px-2">

        {/* Outlet selector */}
        <div ref={outletRef} className="relative">
          <button
            type="button"
            onClick={() => setOutletOpen((o) => !o)}
            aria-label={`Current outlet: ${OUTLET_FULL_LABELS[outlet] ?? outlet}. Click to change.`}
            aria-expanded={outletOpen}
            aria-haspopup="listbox"
            className={[
              'flex items-center gap-2 w-full h-9 rounded-md transition-colors duration-100',
              collapsed ? 'justify-center px-0' : 'px-3',
              'bg-bg-subtle hover:bg-bg-hover text-ink-secondary hover:text-ink-primary',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
            ].join(' ')}
          >
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-accent leading-none">
              {OUTLET_LABELS[outlet] ?? 'ALL'}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1 text-[13px] text-ink-secondary leading-none truncate text-left">
                  {OUTLET_FULL_LABELS[outlet] ?? 'All Outlets'}
                </span>
                <ChevronDown size={14} aria-hidden="true" className="text-ink-muted flex-shrink-0" />
              </>
            )}
          </button>

          {/* Outlet dropdown */}
          {outletOpen && (
            <div
              role="listbox"
              aria-label="Select outlet"
              className={[
                'absolute bottom-full mb-1 bg-bg-surface border border-line-strong rounded-md shadow-3 overflow-hidden z-50 py-1',
                collapsed ? 'left-full ml-2 w-40' : 'left-0 right-0',
              ].join(' ')}
            >
              {OUTLET_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={outlet === opt}
                  onClick={() => {
                    setOutlet(opt);
                    setOutletOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 h-9 text-left hover:bg-bg-hover text-ink-secondary hover:text-ink-primary transition-colors duration-100 text-[13px]"
                >
                  <span className="font-mono text-[11px] font-medium text-accent w-8 uppercase tracking-widest">
                    {OUTLET_LABELS[opt]}
                  </span>
                  <span className="flex-1">{OUTLET_FULL_LABELS[opt]}</span>
                  {outlet === opt && (
                    <Check size={14} className="text-accent flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User card */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            aria-label={`User menu: ${user?.name ?? 'User'}`}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            className={[
              'flex items-center gap-2 w-full h-10 rounded-md transition-colors duration-100',
              collapsed ? 'justify-center px-0' : 'px-2',
              'hover:bg-bg-hover',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
            ].join(' ')}
          >
            {/* Avatar */}
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center font-mono text-[12px] font-medium text-white leading-none uppercase"
              aria-hidden="true"
            >
              {user?.avatar ?? '??'}
            </span>

            {/* Name + role (hidden when collapsed) */}
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium text-ink-primary truncate leading-tight">
                  {user?.name ?? 'Staff User'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[10px] text-ink-muted">{user?.role}</span>
                  <span className="text-ink-muted text-[10px]">·</span>
                  <span className="text-[10px] text-ink-muted truncate">{user?.roleName}</span>
                </div>
              </div>
            )}
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div
              role="menu"
              aria-label="User menu"
              className={[
                'absolute bottom-full mb-1 bg-bg-surface border border-line-strong rounded-md shadow-3 overflow-hidden z-50 py-1',
                collapsed ? 'left-full ml-2 w-48' : 'left-0 right-0',
              ].join(' ')}
            >
              {/* Profile */}
              <button
                type="button"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 h-9 text-left hover:bg-bg-hover text-ink-secondary hover:text-ink-primary transition-colors duration-100 text-[13px]"
              >
                Profile
              </button>

              {/* Preferences */}
              <button
                type="button"
                role="menuitem"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 h-9 text-left hover:bg-bg-hover text-ink-secondary hover:text-ink-primary transition-colors duration-100 text-[13px]"
              >
                Preferences
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 h-9 text-left hover:bg-bg-hover text-ink-secondary hover:text-ink-primary transition-colors duration-100 text-[13px]"
              >
                {resolvedTheme === 'dark' ? (
                  <>
                    <Sun size={14} aria-hidden="true" />
                    Light mode
                  </>
                ) : (
                  <>
                    <Moon size={14} aria-hidden="true" />
                    Dark mode
                  </>
                )}
              </button>

              <div className="mx-2 my-1 border-t border-line" />

              {/* Sign out */}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  signOut();
                  setUserMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-3 h-9 text-left hover:bg-bg-hover text-danger hover:text-danger transition-colors duration-100 text-[13px]"
              >
                <LogOut size={14} aria-hidden="true" />
                {t('signOut')}
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={[
            'flex items-center gap-2 w-full h-9 rounded-md transition-colors duration-100',
            collapsed ? 'justify-center px-0' : 'px-3',
            'text-ink-muted hover:bg-bg-hover hover:text-ink-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
          ].join(' ')}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose size={16} aria-hidden="true" />
              <span className="text-[12px]">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
