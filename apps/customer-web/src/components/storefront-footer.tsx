'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input, cn } from '@dms/ui';

// ─── Outlet address data ───────────────────────────────────────────────────────

const OUTLETS = [
  {
    city: 'Bangalore',
    address: '14, Lavelle Road, Ashok Nagar, Bangalore 560001',
  },
  {
    city: 'Mumbai',
    address: '202, Pali Hill, Bandra West, Mumbai 400050',
  },
  {
    city: 'Chennai',
    address: '7, Cathedral Road, Gopalapuram, Chennai 600086',
  },
] as const;

// ─── Contact details ──────────────────────────────────────────────────────────

const CONTACT = {
  phone: '+91 98400 12345',
  email: 'hello@bnautomobiles.in',
} as const;

// ─── Social links ─────────────────────────────────────────────────────────────

const SOCIALS = [
  { label: 'Instagram', href: '#' },
  { label: 'LinkedIn', href: '#' },
  { label: 'X (Twitter)', href: '#' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function StorefrontFooter() {
  const t = useTranslations('footer');
  const [email, setEmail] = React.useState('');
  const [subscribed, setSubscribed] = React.useState(false);

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    // In v0 this is a no-op; real handler will go through a server action
    setSubscribed(true);
    setEmail('');
  }

  return (
    <footer className="bg-[#0e0d0b] text-ink-muted font-mono uppercase text-xs tracking-widest">
      {/* Main grid */}
      <div className="px-6 py-24 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12 mb-24">

          {/* Brand + Newsletter */}
          <div className="md:col-span-4 space-y-12">
            <Link
              href="/"
              className={cn(
                'block font-display italic text-3xl tracking-tighter lowercase text-white',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'focus-visible:shadow-[0_0_0_4px_#0e0d0b]',
              )}
              aria-label="BN Automobiles — home"
            >
              bn automobiles.
            </Link>

            <div className="space-y-4">
              <p className="text-ink-muted leading-loose normal-case tracking-normal">
                Subscribe to the atelier dispatch
              </p>

              {subscribed ? (
                <p className="text-accent text-[11px] tracking-widest">
                  Thank you — you&apos;re subscribed.
                </p>
              ) : (
                <form onSubmit={handleSubscribe} noValidate>
                  <Input
                    id="footer-newsletter"
                    variant="newsletter"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('newsletter.placeholder')}
                    aria-label={t('newsletter.placeholder')}
                    className="bg-transparent text-white placeholder:text-ink-subtle border-0 border-b border-[#2a2927] rounded-none px-0 py-2 text-xs tracking-widest focus:ring-0 focus:border-accent"
                    actionSlot={
                      <button
                        type="submit"
                        className={cn(
                          'shrink-0 px-3 text-[11px] font-mono uppercase tracking-widest text-accent',
                          'hover:text-accent-hover motion-safe:transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                        )}
                      >
                        {t('newsletter.subscribe')}
                      </button>
                    }
                  />
                  <p className="mt-2 text-[10px] tracking-wider normal-case text-ink-subtle">
                    {t('newsletter.consent')}
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Visit */}
          <div className="md:col-span-3 space-y-6">
            <h5 className="text-white">{t('visit')}</h5>
            <ul className="space-y-5">
              {OUTLETS.map(({ city, address }) => (
                <li key={city}>
                  <span className="block text-white mb-1">{city.toUpperCase()}</span>
                  <span className="normal-case tracking-normal text-ink-muted text-[11px] leading-relaxed">
                    {address}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-2 space-y-6">
            <h5 className="text-white">{t('contact')}</h5>
            <ul className="space-y-4 text-ink-muted">
              <li>
                <a
                  href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}
                  className="hover:text-white motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {CONTACT.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="hover:text-white motion-safe:transition-colors normal-case tracking-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-3 space-y-6">
            <h5 className="text-white">{t('company')}</h5>
            <ul className="space-y-4 text-ink-muted">
              <li>
                <Link
                  href="/about"
                  className="hover:text-white motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link
                  href="/certification"
                  className="hover:text-white motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {t('certification')}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {t('terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-8 border-t border-[#1c1b19] pt-12 md:flex-row md:items-center md:justify-between">
          <span className="text-[10px] text-ink-subtle">
            {t('copyright')}
          </span>

          {/* Social links */}
          <nav aria-label="Social media" className="flex gap-8">
            {SOCIALS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className={cn(
                  'text-[10px] text-ink-subtle',
                  'hover:text-accent motion-safe:transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                {label.toUpperCase()}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
