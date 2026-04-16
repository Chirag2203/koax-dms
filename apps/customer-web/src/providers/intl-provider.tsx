'use client';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { ReactNode } from 'react';

export function IntlProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Kolkata">
      {children}
    </NextIntlClientProvider>
  );
}
