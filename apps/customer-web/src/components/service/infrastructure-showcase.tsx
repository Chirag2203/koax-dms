import * as React from 'react';
import Image from 'next/image';

// ─── Infrastructure Showcase ──────────────────────────────────────────────────

export function InfrastructureShowcase() {
  return (
    <section
      aria-label="Infrastructure"
      className="relative overflow-hidden bg-[#0A0908] py-20 md:py-32"
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=1200&q=80"
          alt="BN Automobiles service workshop interior — clinical precision with high-end automotive tools"
          fill
          className="object-cover opacity-30 mix-blend-luminosity"
          sizes="100vw"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 md:px-12 lg:px-24">
        <div className="max-w-xl">
          <h2 className="mb-6 font-display text-3xl font-normal text-white md:text-5xl">
            Unrivalled Infrastructure
          </h2>
          <p className="text-lg leading-relaxed text-stone-400">
            Our three ateliers house the most advanced diagnostic and restoration
            equipment available in the Indian subcontinent. Every bay is
            climate-controlled. Every technician is factory-certified.
          </p>
        </div>
      </div>
    </section>
  );
}
