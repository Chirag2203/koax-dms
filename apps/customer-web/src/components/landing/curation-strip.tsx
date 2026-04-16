'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Vehicle } from '@dms/types';

// ─── Inline featured vehicle card (dark variant) ─────────────────────────────
// VehicleCard from @/src/components/vehicle-card is being created by another
// agent. Until it lands, we render the exact dark-card pattern from the
// Stitch reference so this section is complete and visually correct.

interface FeaturedCardProps {
  vehicle: Vehicle;
  offset?: boolean;
  index: number;
}

function FeaturedCard({ vehicle, offset = false, index }: FeaturedCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(vehicle.price);

  const label = `${vehicle.year} · ${vehicle.make} ${vehicle.model} ${vehicle.variant}`;
  const primaryImage = vehicle.images[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
      className={`group cursor-pointer${offset ? ' md:translate-y-12' : ''}`}
    >
      <Link href={`/collection/${vehicle.vin}`} aria-label={`View ${vehicle.make} ${vehicle.model} ${vehicle.variant}`}>
        {/* Image */}
        <div className="mb-6 aspect-[16/10] overflow-hidden rounded-sm bg-stone-900">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt}
              width={primaryImage.width}
              height={primaryImage.height}
              className="h-full w-full object-cover opacity-80 grayscale transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0"
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            />
          ) : (
            <div className="h-full w-full bg-stone-800" aria-hidden="true" />
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-stone-500">
            {label}
          </span>
          <h3 className="font-display text-3xl text-white">
            {vehicle.editorialCopy.split('.')[0]}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-stone-400">
            {vehicle.color} · {vehicle.interiorColor.split(' with')[0]}
          </p>
          <div className="flex items-center justify-between pt-2">
            <span className="font-mono text-lg text-white">{formattedPrice}</span>
            <svg
              className="h-5 w-5 text-stone-600 transition-colors group-hover:text-accent"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Curation Strip ───────────────────────────────────────────────────────────

interface CurationStripProps {
  vehicles: Vehicle[];
}

export function CurationStrip({ vehicles }: CurationStripProps) {
  const featured = vehicles.slice(0, 3);

  return (
    <section
      aria-label="Featured vehicles"
      className="bg-[#0A0908] px-6 py-20 md:px-12 md:py-32 lg:px-24"
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {featured.map((vehicle, index) => (
          <FeaturedCard
            key={vehicle.vin}
            vehicle={vehicle}
            index={index}
            offset={index === 1}
          />
        ))}
      </div>
    </section>
  );
}
