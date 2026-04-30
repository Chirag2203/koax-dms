import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter, Playfair_Display } from 'next/font/google';
import { getStaffThemeScript } from '@/src/lib/theme-script';
// Providers is created by Agent B — will resolve at typecheck time once Agent B completes
import { Providers } from '@/src/providers';
import enIN from '@/messages/en-IN.json';
import './globals.css';

// ── Typefaces ──────────────────────────────────────────────────────────────
// Staff surface: Inter + IBM Plex Mono only. No serif (Design 03).

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

// Playfair Display — Editorial display serif used ONLY for the brand
// wordmark (sidebar logo). Matches the customer-web footer mark for cross-
// surface brand parity per user direction (2026-04-30). Body copy + UI
// chrome remains Inter (Design 03 §typography).
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700'],
  style: ['italic'],
});

// ── Metadata ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: 'BN Automobiles DMS',
    template: '%s | BN Automobiles DMS',
  },
  description: 'Internal dealer management system — BN Automobiles',
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
      data-surface="staff"
      data-theme="dark"
      className={[inter.variable, ibmPlexMono.variable, playfairDisplay.variable].join(' ')}
      suppressHydrationWarning
    >
      <head>
        {/* Inline theme script runs before hydration to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: getStaffThemeScript() }} />
      </head>
      <body>
        <Providers locale="en-IN" messages={enIN}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
