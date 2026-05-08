import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — BN Automobiles',
  description:
    'India\'s premier curator of pre-owned luxury automobiles. Three outlets, one standard.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg-paper text-ink-primary pt-32 pb-24 px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-ink-muted">
            About
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-tight">
            The atelier behind every car.
          </h1>
        </header>

        <div className="space-y-8 text-base md:text-lg leading-relaxed text-ink-secondary">
          <p>
            BN Automobiles was founded with a single conviction: that buying a
            pre-owned luxury car should feel less like a transaction and more
            like an inheritance. Every vehicle that crosses our threshold is
            given the time, the inspection, and the storytelling it deserves.
          </p>

          <p>
            Three outlets — Bangalore, Mumbai, Chennai — each curated by a
            small team of specialists. We do not chase volume. We chase
            provenance, condition, and the right car for the right buyer.
          </p>

          <p>
            Every car listed has passed our 210-point certification. Every
            buyer is paired with a single advisor from first conversation
            through delivery. Every sale is backed by warranty, documented
            ownership history, and a relationship that begins — not ends —
            on the day the keys change hands.
          </p>
        </div>

        <section className="space-y-6 pt-8 border-t border-line">
          <h2 className="font-display text-3xl">Our outlets</h2>
          <ul className="space-y-4 text-sm text-ink-secondary">
            <li>
              <span className="block font-mono uppercase tracking-widest text-xs text-ink-muted">
                Bangalore
              </span>
              14, Lavelle Road, Ashok Nagar, Bangalore 560001
            </li>
            <li>
              <span className="block font-mono uppercase tracking-widest text-xs text-ink-muted">
                Mumbai
              </span>
              202, Pali Hill, Bandra West, Mumbai 400050
            </li>
            <li>
              <span className="block font-mono uppercase tracking-widest text-xs text-ink-muted">
                Chennai
              </span>
              7, Cathedral Road, Gopalapuram, Chennai 600086
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
