'use client';

/**
 * MobileBlocker — staff-web is a desktop-first DMS.
 *
 * The staff surface is keyboard-driven, multi-column dense, and assumes a
 * pointer device. Trying to operate it on a phone breaks the workflow more
 * than it helps. Below the `lg:` breakpoint (1024px) we hide the shell
 * entirely and show a message asking the user to switch to a laptop.
 *
 * Customer-web is mobile-friendly by design — this component is staff-web only.
 *
 * Implementation:
 *   - Mobile-first: blocker renders by default; `lg:hidden` removes it on
 *     ≥1024px viewports.
 *   - The AppShell wraps its main tree in `hidden lg:flex` so the shell is
 *     mounted only on desktop. Below `lg`, ONLY this blocker renders.
 *   - i18n via `mobileBlocker.*` namespace.
 */

import { Laptop, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function MobileBlocker() {
  const t = useTranslations('mobileBlocker');

  return (
    <div
      className="lg:hidden fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-canvas px-6 py-12 text-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-blocker-title"
      aria-describedby="mobile-blocker-body"
    >
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-bg-subtle">
          <Laptop
            className="size-8 text-accent"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>

        <div className="space-y-3">
          <h1
            id="mobile-blocker-title"
            className="text-2xl font-semibold text-ink-primary"
          >
            {t('title')}
          </h1>
          <p
            id="mobile-blocker-body"
            className="text-sm text-ink-muted leading-relaxed"
          >
            {t('body')}
          </p>
        </div>

        <div className="rounded-md border border-line bg-bg-surface px-4 py-3 text-left w-full">
          <p className="text-xs uppercase tracking-wide text-ink-muted mb-2">
            {t('whyLabel')}
          </p>
          <ul className="text-xs text-ink-secondary space-y-1.5">
            <li className="flex items-start gap-2">
              <ArrowRight
                className="size-3 shrink-0 mt-0.5 text-accent"
                aria-hidden="true"
              />
              <span>{t('reasons.dense')}</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight
                className="size-3 shrink-0 mt-0.5 text-accent"
                aria-hidden="true"
              />
              <span>{t('reasons.keyboard')}</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight
                className="size-3 shrink-0 mt-0.5 text-accent"
                aria-hidden="true"
              />
              <span>{t('reasons.multitask')}</span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-ink-subtle">{t('hint')}</p>
      </div>
    </div>
  );
}
