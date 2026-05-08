import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — BN Automobiles',
  description:
    'How BN Automobiles collects, uses, and protects your personal data under the Digital Personal Data Protection Act 2023.',
};

const LAST_UPDATED = '08 May 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg-paper text-ink-primary pt-32 pb-24 px-6 md:px-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-ink-muted">
            Legal · Privacy
          </p>
          <h1 className="font-display text-5xl leading-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-muted">Last updated: {LAST_UPDATED}</p>
        </header>

        <div className="space-y-10 text-base leading-relaxed text-ink-secondary">
          <Section title="1. Who we are">
            BN Automobiles Pvt. Ltd. (&ldquo;BN Automobiles&rdquo;,
            &ldquo;we&rdquo;, &ldquo;our&rdquo;) operates the website at
            bnautomobiles.in and our three outlets in Bangalore, Mumbai, and
            Chennai. We are the data fiduciary for personal data you provide
            to us, as defined under the Digital Personal Data Protection Act,
            2023 (DPDP Act).
          </Section>

          <Section title="2. What we collect">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Identity &amp; contact: name, phone, email, address, PAN
                (where required for &gt; ₹10L sales under Income Tax Act
                §206C), Aadhaar last-4 (where required for KYC).
              </li>
              <li>
                Vehicle &amp; ownership: VIN, registration number, ownership
                history, service records of vehicles you list with us or
                purchase from us.
              </li>
              <li>
                Communication: enquiries, test-drive bookings, support
                tickets, consent preferences.
              </li>
              <li>
                Site usage: pages visited, search queries, device information
                — collected via essential cookies and (with your consent)
                analytics cookies.
              </li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            <ul className="list-disc pl-6 space-y-2">
              <li>To respond to enquiries and complete sales.</li>
              <li>
                To meet legal obligations: GST invoicing, TCS reporting,
                e-invoicing, MV Act registration transfer.
              </li>
              <li>
                To send you transactional updates about your vehicle, service
                appointments, and consigned listings.
              </li>
              <li>
                With your separate consent: marketing about new arrivals,
                events, and offers. You can withdraw this consent at any
                time.
              </li>
            </ul>
          </Section>

          <Section title="4. Your rights (DPDP Act §11)">
            You have the right to:
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Access a copy of all personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete information.</li>
              <li>
                Request erasure of your data (subject to lawful-purpose
                retention under DPDP §17 — typically 5 years for sale
                records under Consumer Protection Act §69).
              </li>
              <li>
                Withdraw consent for any purpose previously granted, with the
                same ease used to grant it.
              </li>
              <li>
                Nominate a person to exercise these rights in case of
                incapacity or death.
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, email our Data Protection
              Officer at{' '}
              <a href="mailto:dpo@bnautomobiles.in" className="text-accent hover:underline">
                dpo@bnautomobiles.in
              </a>
              . We will respond within 30 days as required by the DPDP Act.
            </p>
          </Section>

          <Section title="5. Retention">
            Sale records: 5 years (Consumer Protection Act). Tax records:
            8 years (Income Tax Act / GST). Marketing communications log:
            until consent withdrawn + 90 days. Site analytics: 13 months.
          </Section>

          <Section title="6. Sharing">
            We share data with: payment processors (Razorpay), credit
            bureaus (where you apply for finance), the Income Tax
            Department (TCS / e-invoicing), the Regional Transport Office
            (registration transfer), and our outlet teams. We do not sell
            your data.
          </Section>

          <Section title="7. Cookies">
            Essential cookies are always active. Analytics and marketing
            cookies are activated only with your consent via the cookie
            banner.
          </Section>

          <Section title="8. Contact">
            <ul className="space-y-1">
              <li>Data Protection Officer: dpo@bnautomobiles.in</li>
              <li>Customer support: hello@bnautomobiles.in</li>
              <li>Phone: +91 98400 12345</li>
            </ul>
          </Section>

          <Section title="9. Grievance redressal">
            If you are not satisfied with our response, you may file a
            complaint with the Data Protection Board of India under DPDP
            Act §28.
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
