'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MobileStickyBarProps {
  vehicle: Vehicle;
  /** Threshold in pixels from top of page before the bar becomes visible */
  scrollThreshold?: number;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileStickyBar({
  vehicle,
  scrollThreshold = 400,
  className,
}: MobileStickyBarProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    function handleScroll() {
      setIsVisible(window.scrollY > scrollThreshold);
    }

    // Passive listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check on mount in case page is already scrolled
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollThreshold]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="mobile-sticky-bar"
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40 md:hidden',
            'bg-[#171413]/90 backdrop-blur-md border-t border-stone-800',
            className,
          )}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          aria-label="Quick reservation bar"
          role="complementary"
        >
          <div className="flex items-center justify-between px-6 py-4">
            {/* Left: price + make/model */}
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-xl text-white tabular-nums leading-none">
                {formatINR(vehicle.price)}
              </span>
              <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest">
                {vehicle.make} {vehicle.model}
              </span>
            </div>

            {/* Right: CTA */}
            <Link
              href="#reserve"
              className={cn(
                'inline-flex items-center gap-2',
                'bg-accent text-white',
                'font-mono text-[11px] uppercase tracking-widest',
                'px-5 py-2.5 rounded-full',
                'hover:bg-accent/90 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#171413]',
                'active:scale-95 transition-transform',
              )}
            >
              Reserve
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
