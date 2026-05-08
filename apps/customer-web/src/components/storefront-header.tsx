'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, MapPin, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';
import { useCity } from '@/src/hooks/use-city';
import { useAuth } from '@/src/providers/auth-provider';
import type { CitySelection, CitySlug } from '@/src/providers/city-provider';

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { key: 'collection', href: '/collection' },
  { key: 'certification', href: '/certification' },
  { key: 'sell', href: '/sell' },
  { key: 'service', href: '/service' },
  { key: 'journal', href: '/journal' },
] as const;

// ─── City options ─────────────────────────────────────────────────────────────

const CITY_OPTIONS: { value: CitySelection; label: string }[] = [
  { value: null, label: 'All Cities' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'chennai', label: 'Chennai' },
];

// ─── CitySelector ─────────────────────────────────────────────────────────────

function CitySelector({ isTransparent }: { isTransparent: boolean }) {
  const { cityLabel, setCity } = useCity();
  const [open, setOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const optionRefs = React.useRef<Array<HTMLLIElement | null>>([]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, CITY_OPTIONS.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        {
          const option = CITY_OPTIONS[focusedIndex];
          if (option) {
            setCity(option.value);
            setOpen(false);
            triggerRef.current?.focus();
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  }

  React.useEffect(() => {
    if (open && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus();
    }
  }, [open, focusedIndex]);

  const mutedClass = isTransparent
    ? 'text-white/60 hover:text-white'
    : 'text-ink-muted hover:text-ink-primary';

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`City: ${cityLabel}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 cursor-pointer',
          'font-mono text-[11px] uppercase tracking-[0.1em]',
          'motion-safe:transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'focus-visible:shadow-[0_0_0_4px_white]',
          mutedClass,
        )}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{cityLabel}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 shrink-0',
            'motion-safe:transition-transform motion-safe:duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Select city"
          className={cn(
            'absolute right-0 top-full mt-2 z-[60]',
            'w-44 rounded-sm border border-line',
            'bg-bg-elevated shadow-2',
            'py-1',
          )}
        >
          {CITY_OPTIONS.map((option, index) => {
            const isSelected = option.label === cityLabel;
            return (
              <li
                key={option.label}
                ref={(el) => { optionRefs.current[index] = el; }}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => {
                  setCity(option.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                onMouseEnter={() => setFocusedIndex(index)}
                className={cn(
                  'px-4 py-2.5 cursor-pointer',
                  'font-mono text-[11px] uppercase tracking-[0.1em]',
                  'motion-safe:transition-colors',
                  'outline-none',
                  isSelected
                    ? 'text-accent bg-accent-subtle/30'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-bg-hover',
                  'focus:bg-bg-hover focus:text-ink-primary',
                )}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Mobile overlay ───────────────────────────────────────────────────────────

function MobileMenu({
  open,
  onClose,
  navLinks,
  isAuthenticated,
  userInitials,
}: {
  open: boolean;
  onClose: () => void;
  navLinks: { key: string; label: string; href: string }[];
  isAuthenticated: boolean;
  userInitials: string;
}) {
  const { cityLabel, setCity } = useCity();

  // Trap focus within overlay when open
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="fixed inset-0 z-[70] flex flex-col bg-[#0e0d0b]"
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-6">
        <Link
          href="/"
          onClick={onClose}
          className="font-display italic text-2xl tracking-tighter lowercase text-white"
          aria-label="BN Automobiles — home"
        >
          bn automobiles.
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className={cn(
            'text-white/60 hover:text-white',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col justify-center px-6 gap-2">
        {navLinks.map(({ key, label, href }) => (
          <Link
            key={key}
            href={href}
            onClick={onClose}
            className={cn(
              'block py-4 border-b border-white/10',
              'font-mono text-sm uppercase tracking-[0.1em] text-white/60',
              'hover:text-white motion-safe:transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-6 pb-12 flex flex-col gap-6">
        {/* City pills */}
        <div className="flex flex-wrap gap-2">
          {CITY_OPTIONS.map((opt) => {
            const isSelected = opt.label === cityLabel;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setCity(opt.value)}
                className={cn(
                  'px-4 py-2 rounded-full font-mono text-[11px] uppercase tracking-widest',
                  'border motion-safe:transition-colors',
                  isSelected
                    ? 'bg-accent border-accent text-white'
                    : 'bg-transparent border-white/20 text-white/40 hover:border-white/50 hover:text-white/70',
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Auth action */}
        {isAuthenticated ? (
          <Link
            href="/account"
            onClick={onClose}
            className={cn(
              'inline-flex items-center gap-3',
              'font-mono text-xs uppercase tracking-widest text-white/70',
              'hover:text-white motion-safe:transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            )}
          >
            <span className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-xs text-white leading-none select-none">
                {userInitials}
              </span>
            </span>
            My Account
          </Link>
        ) : (
          <Link
            href="/sign-in"
            onClick={onClose}
            className={cn(
              'inline-flex items-center justify-center',
              'bg-accent text-white rounded-full px-5 py-3',
              'font-mono text-xs uppercase tracking-widest',
              'hover:bg-accent-hover motion-safe:transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'focus-visible:shadow-[0_0_0_4px_#0e0d0b]',
            )}
          >
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function StorefrontHeader() {
  const t = useTranslations('nav');
  const { isAuthenticated, user } = useAuth();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navLinks = NAV_LINKS.map((link) => ({
    ...link,
    label: t(link.key),
  }));

  // Detect scroll — switch to solid as soon as the user scrolls past the
  // very top. Previously this used `0.8 * window.innerHeight` which only
  // tripped on the home page's tall hero. On routes WITHOUT a hero (e.g.
  // /the-collection), the user could scroll for ages and the navbar stayed
  // transparent — content underneath bled through and made the bar
  // illegible. User feedback 2026-05-08: navbar must be solid on scroll.
  // 8px gives an instant flip without flicker on minor wheel events.
  React.useEffect(() => {
    const threshold = 8;

    function handleScroll() {
      setScrolled(window.scrollY > threshold);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount in case page loads mid-scroll
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isTransparent = !scrolled && !mobileOpen;

  return (
    <>
      <header
        className={cn(
          'fixed top-0 w-full z-50',
          'flex items-center justify-between',
          'px-6 py-5 md:px-12 md:py-6',
          'motion-safe:transition-all motion-safe:duration-300',
          isTransparent
            ? 'bg-transparent text-white'
            // Fully opaque on scroll (was: `bg-bg-paper/80 backdrop-blur-md`
            // — frosted glass let underlying content read through, which the
            // user flagged as not "solid" enough on 2026-05-08).
            : 'bg-bg-paper text-ink-primary border-b border-line shadow-sm',
        )}
      >
        {/* Left: Wordmark */}
        <div className="flex items-center gap-10 lg:gap-14">
          <Link
            href="/"
            className={cn(
              'font-display italic text-2xl tracking-tighter lowercase shrink-0',
              isTransparent ? 'text-white' : 'text-ink-primary',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              'focus-visible:shadow-[0_0_0_4px_white]',
            )}
            aria-label="BN Automobiles — home"
          >
            bn automobiles.
          </Link>

          {/* Center: desktop nav links */}
          <nav
            aria-label="Main navigation"
            className="hidden md:flex items-center gap-8"
          >
            {navLinks.map(({ key, label, href }) => (
              <Link
                key={key}
                href={href}
                className={cn(
                  'font-mono text-[11px] uppercase tracking-[0.1em]',
                  'motion-safe:transition-colors motion-safe:duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  isTransparent
                    ? 'text-white/60 hover:text-white'
                    : 'text-ink-muted hover:text-ink-primary',
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: city selector + sign in + hamburger */}
        <div className="flex items-center gap-5 md:gap-6">
          {/* City selector — hidden on mobile (shown in menu instead) */}
          <div className="hidden md:block">
            <CitySelector isTransparent={isTransparent} />
          </div>

          {/* Auth action — hidden on mobile */}
          {isAuthenticated && user ? (
            <Link
              href="/account"
              aria-label="Go to your account"
              className={cn(
                'hidden md:flex items-center justify-center',
                'w-8 h-8 rounded-full bg-accent flex-shrink-0',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'focus-visible:shadow-[0_0_0_4px_white]',
                'hover:bg-accent-hover motion-safe:transition-colors',
              )}
            >
              <span className="font-mono text-xs text-white leading-none select-none">
                {(user.avatar ?? user.name.slice(0, 2)).toUpperCase()}
              </span>
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className={cn(
                'hidden md:inline-flex items-center',
                'bg-accent text-white rounded-full px-5 py-1.5',
                'font-mono text-xs uppercase tracking-widest',
                'hover:bg-accent-hover motion-safe:transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'focus-visible:shadow-[0_0_0_4px_white]',
              )}
            >
              {t('signIn')}
            </Link>
          )}

          {/* Hamburger — visible on mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className={cn(
              'md:hidden',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              isTransparent ? 'text-white' : 'text-ink-primary',
            )}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navLinks={navLinks}
        isAuthenticated={isAuthenticated}
        userInitials={user ? (user.avatar ?? user.name.slice(0, 2)).toUpperCase() : ''}
      />
    </>
  );
}
