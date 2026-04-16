'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@dms/ui';
import type { VehicleImage } from '@dms/types/domain';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleLightboxProps {
  images: VehicleImage[];
  initialIndex: number;
  onClose: () => void;
  vehicleName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleLightbox({
  images,
  initialIndex,
  onClose,
  vehicleName,
}: VehicleLightboxProps) {
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const [mounted, setMounted] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const prevButtonRef = React.useRef<HTMLButtonElement>(null);
  const nextButtonRef = React.useRef<HTMLButtonElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeImage: VehicleImage | undefined = images[activeIndex];
  const total = images.length;

  // Mount for portal
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll
  React.useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Focus close button on open
  React.useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function goNext() {
    setActiveIndex((i) => (i + 1) % total);
  }

  function goPrev() {
    setActiveIndex((i) => (i - 1 + total) % total);
  }

  // Keyboard navigation + focus trap
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'Tab': {
          // Focus trap
          const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
          break;
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, total]);

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const contentVariants = shouldReduceMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 }, exit: { opacity: 1 } }
    : {
        hidden: { scale: 0.96, opacity: 0 },
        visible: { scale: 1, opacity: 1 },
        exit: { scale: 0.96, opacity: 0 },
      };

  const transition = { duration: 0.24, ease: 'easeOut' };

  const lightboxContent = (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Vehicle photo gallery — ${vehicleName}`}
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
        initial={shouldReduceMotion ? undefined : 'hidden'}
        animate="visible"
        exit={shouldReduceMotion ? undefined : 'exit'}
        variants={overlayVariants}
        transition={transition}
      >
        {/* Drag container for swipe */}
        <motion.div
          className="relative flex-1 w-full flex items-center justify-center"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, info) => {
            if (info.offset.x < -60) goNext();
            else if (info.offset.x > 60) goPrev();
          }}
        >
          <motion.div
            key={activeIndex}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={transition}
            className="relative w-full max-w-6xl mx-auto px-16 md:px-24 h-[60vh] md:h-[80vh]"
          >
            {activeImage && (
              <Image
                src={activeImage.url}
                alt={activeImage.alt}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            )}
          </motion.div>
        </motion.div>

        {/* Close button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className={cn(
            'absolute top-6 right-6 z-10',
            'flex h-10 w-10 items-center justify-center rounded-sm',
            'text-stone-400 hover:text-white transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>

        {/* Prev button */}
        {total > 1 && (
          <button
            ref={prevButtonRef}
            type="button"
            onClick={goPrev}
            aria-label="Previous photo"
            className={cn(
              'absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10',
              'flex h-12 w-12 items-center justify-center rounded-sm',
              'text-stone-400 hover:text-white bg-black/30 hover:bg-black/60 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}

        {/* Next button */}
        {total > 1 && (
          <button
            ref={nextButtonRef}
            type="button"
            onClick={goNext}
            aria-label="Next photo"
            className={cn(
              'absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10',
              'flex h-12 w-12 items-center justify-center rounded-sm',
              'text-stone-400 hover:text-white bg-black/30 hover:bg-black/60 transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        )}

        {/* Counter */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[11px] text-stone-500 tracking-widest"
          aria-live="polite"
          aria-atomic="true"
        >
          {activeIndex + 1} / {total}
        </div>
      </motion.div>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(lightboxContent, document.body);
}
