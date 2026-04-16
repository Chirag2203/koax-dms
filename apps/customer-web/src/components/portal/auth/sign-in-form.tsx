'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/providers/auth-provider';

export function SignInForm() {
  const t = useTranslations('portal.auth');
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');
    // Simulate sending OTP
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    setOtpSent(true);
    setIsLoading(false);
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await signIn(email);
      router.push('/account');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink-primary mb-1">
        {t('signIn')}
      </h1>
      <p className="text-sm text-ink-muted mb-8">
        {t('noAccount')}{' '}
        <Link
          href="/sign-up"
          className="text-accent underline underline-offset-2 hover:text-accent-hover transition-colors"
        >
          {t('signUp')}
        </Link>
      </p>

      {!otpSent ? (
        <form onSubmit={handleEmailSubmit} noValidate>
          <div className="mb-5">
            <label
              htmlFor="email"
              className="block text-xs font-mono tracking-widest uppercase text-ink-secondary mb-2"
            >
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              className="w-full bg-bg-paper border border-line rounded-sm px-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full bg-accent text-white rounded-sm px-4 py-3 text-sm font-medium tracking-wide hover:bg-accent-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending…' : t('continue')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} noValidate>
          <p className="text-sm text-ink-secondary mb-6">
            {t('otpSent')}{' '}
            <span className="text-ink-primary font-medium">{email}</span>
          </p>

          <div className="mb-5">
            <label
              htmlFor="otp"
              className="block text-xs font-mono tracking-widest uppercase text-ink-secondary mb-2"
            >
              {t('otp')}
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              autoComplete="one-time-code"
              className="w-full bg-bg-paper border border-line rounded-sm px-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors tracking-[0.5em] text-center font-mono"
              placeholder="0000"
            />
            <p className="text-xs text-ink-muted mt-1">
              Any 4-digit code will work in this demo.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || otp.length < 4}
            className="w-full bg-accent text-white rounded-sm px-4 py-3 text-sm font-medium tracking-wide hover:bg-accent-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying…' : t('signIn')}
          </button>

          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
            }}
            className="w-full mt-3 text-sm text-ink-muted hover:text-ink-primary transition-colors underline underline-offset-2"
          >
            Change email
          </button>
        </form>
      )}
    </div>
  );
}
