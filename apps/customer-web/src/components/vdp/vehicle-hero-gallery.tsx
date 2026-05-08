'use client';

/**
 * VehicleHeroGallery — SPEC-SHOOTS-002 T10 (Seam 51 wiring)
 *
 * v2: reads from useCustomerShootsStore (selectStorefrontGalleryForVin)
 * instead of vehicle.images (deprecated per L_AI-9).
 *
 * Cross-process limitation: the customer-shoots-store is a per-process Zustand
 * instance. A staff-side cover change is NOT visible here until page reload.
 * Production swap: backend API serves the identical contract.
 *
 * Spec reference: SPEC-SHOOTS-002 T10, L_AI-9, L_AI-11, Seam 51
 */

import * as React from 'react';
import { useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@dms/ui';
import type { Vehicle, VehicleImage } from '@dms/types/domain';
import { VehicleLightbox } from './vehicle-lightbox';
import { useCustomerShootsStore } from '@/src/lib/shoots/customer-shoots-store';
import type { CustomerStorefrontGalleryItem } from '@/src/lib/shoots/customer-shoots-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleHeroGalleryProps {
  vehicle: Vehicle;
  className?: string;
}

// ─── Gallery Image Button ────────────────────────────────────────────────────

interface GalleryImageProps {
  image: VehicleImage;
  index: number;
  total: number;
  className?: string;
  priority?: boolean;
  onClick: () => void;
}

function GalleryImage({ image, index, total, className, priority, onClick }: GalleryImageProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden cursor-pointer group',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
        className,
      )}
      aria-label={`Photo ${index + 1} of ${total}: ${image.alt}`}
    >
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
        loading={priority ? 'eager' : 'lazy'}
        priority={priority}
      />
      {/* Hover scrim with zoom hint */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="absolute bottom-4 right-4 font-mono text-[10px] text-white/70 uppercase tracking-widest">
          Enlarge
        </span>
      </div>
    </button>
  );
}

// ─── "+N more" Overlay ───────────────────────────────────────────────────────

interface MoreOverlayProps {
  image: VehicleImage;
  remaining: number;
  index: number;
  total: number;
  onClick: () => void;
  className?: string;
}

function MoreOverlay({ image, remaining, index, total, onClick, className }: MoreOverlayProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative overflow-hidden cursor-pointer group',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
        className,
      )}
      aria-label={`View all ${total} photos`}
    >
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes="(min-width: 1024px) 33vw, 50vw"
        className="object-cover brightness-50"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-sm text-white uppercase tracking-widest">
          +{remaining} more
        </span>
      </div>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VehicleHeroGallery({ vehicle, className }: VehicleHeroGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  // Seam 51: read from customer-shoots-store (L_AI-9, L_AI-11)
  //
  // BUG (fixed 2026-05-08): the previous shape called
  //   useCustomerShootsStore((s) => s.selectStorefrontGalleryForVin(vin))
  // The selector internally `.filter()`s + `.map()`s + returns a fresh object
  // literal `{ coverUrl, gallery, status }`. Every render therefore handed
  // Zustand a NEW reference, which triggers React error #185 ("Maximum update
  // depth exceeded") on any subsequent state change. Same anti-pattern as
  // staff-web fixes 6dd2c63 + a0e0c5f.
  //
  // Fix: read the base refs (shoots + shootIdByVin) via stable selectors,
  // then derive the gallery in a `useMemo` outside the store call. The
  // `selectStorefrontGalleryForVin` function still exists for tests + the
  // production-API contract; just not safe inside `useStore(...)`.
  const shoots = useCustomerShootsStore((s) => s.shoots);
  const shootIdByVin = useCustomerShootsStore((s) => s.shootIdByVin);
  const gallery = useMemo(() => {
    // Resolve via getState() to reuse the same logic without subscribing.
    return useCustomerShootsStore.getState().selectStorefrontGalleryForVin(vehicle.vin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.vin, shoots, shootIdByVin]);
  const { status, coverUrl, gallery: galleryItems } = gallery;

  // Convert shoots gallery to VehicleImage shape for compatibility with VehicleLightbox
  // width/height are nominal (1600×900 aspect 16:9) — Next.js Image uses fill layout
  const images: VehicleImage[] = useMemo(() => {
    if (status !== 'ready' || !coverUrl) return [];
    const coverItem: VehicleImage = {
      url: coverUrl,
      alt: `${vehicleName} — cover photo`,
      width: 1600,
      height: 900,
    };
    const rest = galleryItems
      .filter((g) => g.url !== coverUrl)
      .map((g: CustomerStorefrontGalleryItem): VehicleImage => ({
        url: g.url,
        alt: `${vehicleName} — ${g.kind.replace(/_/g, ' ')}`,
        width: 1600,
        height: 900,
      }));
    return [coverItem, ...rest];
  }, [status, coverUrl, galleryItems, vehicleName]);

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  // Gallery being prepared (pending) — render placeholder
  if (status === 'pending') {
    return (
      <section
        className={cn('bg-[#0c0c0d] px-0 lg:px-8 py-8', className)}
        aria-label={`Photo gallery — ${vehicleName}`}
        role="region"
      >
        <div className="max-w-[1440px] mx-auto">
          <div className="aspect-[16/9] lg:aspect-[21/9] flex items-center justify-center bg-[#1a1a1b] rounded-sm">
            <div className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-mono text-sm text-white/40 uppercase tracking-widest">Gallery being prepared</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Unavailable — hide gallery entirely (L_AI-9)
  if (status === 'unavailable' || images.length === 0) {
    return null;
  }

  // Split images into grid positions
  const hero = images[0];
  const sideTop = images[1];
  const sideBottom = images[2];
  const bottomRow = images.slice(3, 6); // show max 3 in bottom row
  const hiddenCount = Math.max(0, images.length - 6);

  return (
    <>
      <section
        className={cn('bg-[#0c0c0d] px-0 lg:px-8 py-0 lg:py-8', className)}
        aria-label={`Photo gallery — ${vehicleName}`}
        role="region"
      >
        <div className="max-w-[1440px] mx-auto">
          {/* ── Top row: Hero (2/3) + 2 stacked side images (1/3) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {/* Hero — spans 2 columns, 2 rows */}
            {hero && (
              <GalleryImage
                image={hero}
                index={0}
                total={images.length}
                priority
                onClick={() => openLightbox(0)}
                className="lg:col-span-2 lg:row-span-2 aspect-[4/3] lg:aspect-[16/10]"
              />
            )}

            {/* Side top */}
            {sideTop && (
              <GalleryImage
                image={sideTop}
                index={1}
                total={images.length}
                onClick={() => openLightbox(1)}
                className="hidden lg:block aspect-[16/10]"
              />
            )}

            {/* Side bottom */}
            {sideBottom && (
              <GalleryImage
                image={sideBottom}
                index={2}
                total={images.length}
                onClick={() => openLightbox(2)}
                className="hidden lg:block aspect-[16/10]"
              />
            )}
          </div>

          {/* ── Bottom row: remaining images ── */}
          {bottomRow.length > 0 && (
            <div className={cn(
              'grid gap-2 mt-2',
              bottomRow.length === 1 && 'grid-cols-1',
              bottomRow.length === 2 && 'grid-cols-2',
              bottomRow.length >= 3 && 'grid-cols-3',
            )}>
              {bottomRow.map((img, i) => {
                const realIndex = i + 3;
                const isLast = i === bottomRow.length - 1 && hiddenCount > 0;

                if (isLast) {
                  return (
                    <MoreOverlay
                      key={img.url}
                      image={img}
                      remaining={hiddenCount}
                      index={realIndex}
                      total={images.length}
                      onClick={() => openLightbox(realIndex)}
                      className="aspect-[3/2]"
                    />
                  );
                }

                return (
                  <GalleryImage
                    key={img.url}
                    image={img}
                    index={realIndex}
                    total={images.length}
                    onClick={() => openLightbox(realIndex)}
                    className="aspect-[3/2]"
                  />
                );
              })}
            </div>
          )}

          {/* ── Mobile: horizontal scroll for images 2+ ── */}
          {images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto snap-x snap-mandatory lg:hidden pb-2">
              {images.slice(1).map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => openLightbox(i + 1)}
                  className="flex-shrink-0 w-[75vw] aspect-[4/3] relative overflow-hidden snap-center rounded-sm focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Photo ${i + 2} of ${images.length}`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt}
                    fill
                    sizes="75vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightboxOpen && (
        <VehicleLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          vehicleName={vehicleName}
        />
      )}
    </>
  );
}
