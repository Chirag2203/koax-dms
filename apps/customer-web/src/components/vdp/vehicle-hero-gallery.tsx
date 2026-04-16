'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@dms/ui';
import type { Vehicle, VehicleImage } from '@dms/types/domain';
import { VehicleLightbox } from './vehicle-lightbox';

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

  const images: VehicleImage[] = vehicle.images;
  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
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
