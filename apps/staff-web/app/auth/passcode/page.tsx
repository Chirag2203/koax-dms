import type { Metadata } from 'next';
import { PasscodeGate } from '@/src/components/auth/passcode-gate';

export const metadata: Metadata = {
  title: 'Sign in — BN Automobiles DMS',
  description: 'Enter your access passcode to continue.',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: { next?: string; error?: string };
}

export default function PasscodePage({ searchParams }: PageProps) {
  const nextUrl =
    typeof searchParams.next === 'string' && searchParams.next.startsWith('/')
      ? searchParams.next
      : '/';
  const configError = searchParams.error === 'config';

  return (
    <>
      {/* Blurred backdrop that hints at the dashboard underneath without
          revealing real data. Pointer-events-none so it never traps focus. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-bg-canvas"
      >
        <div className="absolute inset-0 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-bg-canvas via-bg-canvas/95 to-bg-subtle/40" />
      </div>

      <PasscodeGate nextUrl={nextUrl} configError={configError} />
    </>
  );
}
