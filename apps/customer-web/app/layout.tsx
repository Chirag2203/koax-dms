import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter, Playfair_Display } from 'next/font/google';
import { Providers } from '@/src/providers';
import { getThemeScript } from '@/src/lib/theme-script';
import enIN from '@/messages/en-IN.json';
import './globals.css';

// ── Typefaces ──────────────────────────────────────────────────────────────

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

// ── Metadata ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'BN Automobiles',
    template: '%s | BN Automobiles',
  },
  description:
    'Discover curated pre-owned luxury automobiles. BN Automobiles — Bangalore, Mumbai, Chennai.',
  metadataBase: new URL('https://bnautomobiles.in'),
  openGraph: {
    siteName: 'BN Automobiles',
    type: 'website',
    locale: 'en_IN',
  },
};

// ── Root Layout ────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-surface="customer"
      data-theme="light"
      className={[
        playfairDisplay.variable,
        inter.variable,
        ibmPlexMono.variable,
      ].join(' ')}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeScript() }} />
      </head>
      <body className="min-h-screen bg-bg-paper font-sans text-ink-primary antialiased">
        <Providers locale="en-IN" messages={enIN}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
