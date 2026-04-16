'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Car,
  Wallet,
  MessageSquare,
  FileText,
  ArrowLeft,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', href: '/consignor', icon: LayoutDashboard, exact: true },
  { key: 'vehicles', href: '/consignor/vehicles', icon: Car, exact: false },
  { key: 'payouts', href: '/consignor/payouts', icon: Wallet, exact: false },
  { key: 'messages', href: '/consignor/messages', icon: MessageSquare, exact: false },
  { key: 'documents', href: '/consignor/documents', icon: FileText, exact: false },
] as const;

const mobileNavItems = navItems.slice(0, 5);

export function ConsignorNav() {
  const pathname = usePathname();
  const t = useTranslations('portal.consignor.nav');

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 flex-col shrink-0 border-r border-line bg-bg-paper min-h-screen sticky top-0 h-screen overflow-y-auto">
        {/* Wordmark */}
        <div className="px-6 pt-8 pb-6 border-b border-line">
          <p className="font-mono text-xs tracking-[0.15em] font-semibold text-ink-primary uppercase">
            BN AUTOMOBILES
          </p>
          <p className="font-mono text-[10px] tracking-widest text-ink-muted uppercase mt-1">
            {t('portalLabel')}
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4" aria-label="Consignor navigation">
          <ul className="space-y-0.5">
            {navItems.map(({ key, href, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <li key={key}>
                  <Link
                    href={href}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                      active
                        ? 'border-l-2 border-accent text-accent font-medium'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-bg-hover border-l-2 border-transparent',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    <span>{t(key)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Back to Account */}
        <div className="px-3 pb-8 pt-4 border-t border-line">
          <Link
            href="/account"
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-sm text-sm text-ink-muted hover:text-ink-primary hover:bg-bg-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>{t('backToAccount')}</span>
          </Link>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-paper border-t border-line"
        aria-label="Consignor navigation"
      >
        <ul className="flex items-center justify-around px-2 h-16">
          {mobileNavItems.map(({ key, href, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <li key={key} className="flex-1">
                <Link
                  href={href}
                  className={[
                    'flex flex-col items-center gap-0.5 py-2 w-full text-[10px] tracking-wide transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-accent',
                    active
                      ? 'text-accent'
                      : 'text-ink-secondary hover:text-ink-primary',
                  ].join(' ')}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} strokeWidth={1.5} />
                  <span className="uppercase font-mono">{t(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
