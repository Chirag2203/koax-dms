'use client';
import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { CityProvider } from './city-provider';
import { IntlProvider } from './intl-provider';

export function Providers({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown> & import('next-intl').AbstractIntlMessages;
}) {
  return (
    <IntlProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <CityProvider>{children}</CityProvider>
      </ThemeProvider>
    </IntlProvider>
  );
}
