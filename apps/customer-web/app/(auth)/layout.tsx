import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-paper flex flex-col items-center justify-center px-4 py-12">
      {/* Wordmark */}
      <p className="font-mono text-xs tracking-[0.18em] font-semibold text-ink-muted uppercase mb-10">
        BN AUTOMOBILES
      </p>

      {/* Card */}
      <div className="w-full max-w-sm bg-bg-elevated border border-line rounded-sm shadow-1 px-8 py-10">
        {children}
      </div>
    </div>
  );
}
