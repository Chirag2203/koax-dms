'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/src/providers/auth-provider';
import type { Customer } from '@dms/types';

const CITIES: { value: Customer['preferredCity']; label: string }[] = [
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'chennai', label: 'Chennai' },
];

const LANGUAGES: { value: Customer['preferredLanguage']; label: string }[] = [
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
];

export function SignUpForm() {
  const t = useTranslations('portal.auth');
  const { signUp } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferredCity: 'bangalore' as Customer['preferredCity'],
    preferredLanguage: 'en-IN' as Customer['preferredLanguage'],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) return;
    setIsLoading(true);
    setError('');
    try {
      await signUp(form);
      router.push('/account');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full bg-bg-paper border border-line rounded-sm px-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent transition-colors';
  const labelClass =
    'block text-xs font-mono tracking-widest uppercase text-ink-secondary mb-2';

  return (
    <div>
      <h1 className="font-serif text-2xl text-ink-primary mb-1">
        {t('createAccount')}
      </h1>
      <p className="text-sm text-ink-muted mb-8">
        {t('hasAccount')}{' '}
        <Link
          href="/sign-in"
          className="text-accent underline underline-offset-2 hover:text-accent-hover transition-colors"
        >
          {t('signIn')}
        </Link>
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          <div>
            <label htmlFor="name" className={labelClass}>
              {t('name')}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
              autoComplete="name"
              className={inputClass}
              placeholder="Arjun Mehta"
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              {t('phone')}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              required
              autoComplete="tel"
              className={inputClass}
              placeholder="+91 98XX XXXX XX"
            />
          </div>

          <div>
            <label htmlFor="preferredCity" className={labelClass}>
              {t('city')}
            </label>
            <select
              id="preferredCity"
              name="preferredCity"
              value={form.preferredCity}
              onChange={handleChange}
              className={inputClass}
            >
              {CITIES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="preferredLanguage" className={labelClass}>
              {t('language')}
            </label>
            <select
              id="preferredLanguage"
              name="preferredLanguage"
              value={form.preferredLanguage}
              onChange={handleChange}
              className={inputClass}
            >
              {LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            isLoading || !form.name || !form.email || !form.phone
          }
          className="w-full mt-8 bg-accent text-white rounded-sm px-4 py-3 text-sm font-medium tracking-wide hover:bg-accent-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account…' : t('createAccount')}
        </button>
      </form>
    </div>
  );
}
