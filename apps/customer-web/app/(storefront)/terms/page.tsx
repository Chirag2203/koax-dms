import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use — BN Automobiles',
  description:
    'Terms governing your use of bnautomobiles.in and the services offered by BN Automobiles Pvt. Ltd.',
};

const LAST_UPDATED = '08 May 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg-paper text-ink-primary pt-32 pb-24 px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-ink-muted">
            Legal · Terms
          </p>
          <h1 className="font-display text-5xl leading-tight">Terms of Use</h1>
          <p className="text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="space-y-10 text-base leading-relaxed text-ink-secondary">
          <Section title="1. Acceptance">
            By accessing bnautomobiles.in or visiting any of our outlets you
            agree to these terms. If you do not agree, please do not use our
            services. These terms are governed by the laws of India.
          </Section>

          <Section title="2. About BN Automobiles">
            BN Automobiles Pvt. Ltd. is a curator and reseller of pre-owned
            luxury automobiles, registered in India with operations in
            Bangalore, Mumbai, and Chennai.
          </Section>

          <Section title="3. Listings and pricing">
            Vehicle listings are provided in good faith. Prices are inclusive
            of applicable GST under the margin scheme. TCS @ 1% applies to
            sales above ₹10,00,000 per the Income Tax Act §206C(1F). We
            reserve the right to correct pricing errors before sale and to
            withdraw listings at any time.
          </Section>

          <Section title="4. Certification">
            Vehicles certified under &ldquo;The BN Standard&rdquo; have
            undergone our 210-point inspection. Certification reflects the
            vehicle&apos;s condition at the time of inspection and does not
            constitute a warranty beyond what is explicitly offered in the
            sale agreement.
          </Section>

          <Section title="5. Sale process">
            Reservations require a refundable token deposit. The token is
            applied to the final price on completion or returned in full if
            the deal does not proceed within the agreed window. Final sale
            is subject to satisfactory document verification, KYC under the
            DPDP Act, and (where applicable) successful financing approval.
          </Section>

          <Section title="6. Test drives">
            Test drives are subject to a valid driving licence and signature
            on our walk-around inspection sheet. We may decline any test
            drive request at our discretion.
          </Section>

          <Section title="7. Consignment (sell your car)">
            When you list a vehicle with us, you warrant that you are the
            lawful owner, that the vehicle is free of liens, and that the
            information you provide is accurate. We charge a curator fee per
            the consignment agreement signed at intake.
          </Section>

          <Section title="8. Warranty">
            Warranty terms are specific to each vehicle and outlined in the
            sale agreement. Warranty does not cover damage from accidents,
            misuse, unauthorised modifications, or normal wear-and-tear
            items.
          </Section>

          <Section title="9. Returns and refunds">
            Pre-owned vehicle sales are final once registration transfer is
            initiated. Refunds may be issued at our discretion in cases of
            material misrepresentation, undisclosed mechanical defects
            discovered within the first 30 days, or finance rejection
            outside the customer&apos;s control.
          </Section>

          <Section title="10. Intellectual property">
            All content on bnautomobiles.in — including photography,
            editorial copy, and design — is the property of BN Automobiles
            or used under license. You may not reproduce, redistribute, or
            scrape this content without written permission.
          </Section>

          <Section title="11. Liability">
            Our liability for any claim arising out of these terms is
            limited to the amount paid by you to BN Automobiles in the
            preceding 12 months. We are not liable for indirect or
            consequential damages.
          </Section>

          <Section title="12. Privacy">
            Our handling of your personal data is governed by our{' '}
            <a href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </a>
            . Please read it carefully.
          </Section>

          <Section title="13. Changes to these terms">
            We may update these terms from time to time. Material changes
            will be notified via email or via a banner on the site. Your
            continued use after the change constitutes acceptance.
          </Section>

          <Section title="14. Disputes">
            These terms are governed by the laws of India. Any dispute will
            be resolved in the courts of Bangalore, Karnataka, India,
            subject to applicable consumer protection laws which may grant
            you the right to your local courts.
          </Section>

          <Section title="15. Contact">
            Questions about these terms? Email{' '}
            <a href="mailto:hello@bnautomobiles.in" className="text-accent hover:underline">
              hello@bnautomobiles.in
            </a>
            .
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl text-ink-primary">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
