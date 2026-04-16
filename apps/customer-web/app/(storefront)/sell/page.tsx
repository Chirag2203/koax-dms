import type { Metadata } from 'next';
import { SellHero, SellForm } from '@/src/components/sell';

export const metadata: Metadata = {
  title: 'Sell Your Car',
  description:
    'A discreet, curated exit for your vehicle. BN Automobiles offers private consignment with valuation within 48 hours.',
};

export default function SellPage() {
  return (
    <>
      <SellHero />
      <SellForm />

      {/* Trust quote */}
      <section className="border-t border-line px-6 py-16 md:px-12 md:py-24 lg:px-24">
        <blockquote className="mx-auto max-w-3xl text-center font-display text-2xl italic leading-relaxed text-ink-primary md:text-3xl">
          &ldquo;Privacy is the ultimate luxury. In the world of high-value
          assets, the quietest transactions are often the most
          significant.&rdquo;
        </blockquote>
      </section>
    </>
  );
}
