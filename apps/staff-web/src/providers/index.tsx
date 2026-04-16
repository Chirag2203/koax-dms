'use client';
import { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { StaffAuthProvider } from './staff-auth-provider';
import { OutletProvider } from './outlet-provider';
import { CommandPaletteProvider } from './command-palette-provider';
import { IntlProvider } from './intl-provider';
import { QueryProvider } from './query-provider';

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
      <QueryProvider>
        <ThemeProvider>
          <StaffAuthProvider>
            <OutletProvider>
              <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </OutletProvider>
          </StaffAuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </IntlProvider>
  );
}
