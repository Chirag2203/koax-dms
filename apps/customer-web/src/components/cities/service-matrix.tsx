'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@dms/ui';

// ─── Data ─────────────────────────────────────────────────────────────────────

type ServiceKey =
  | 'sales'
  | 'service'
  | 'bodyShop'
  | 'parts'
  | 'certification'
  | 'detailing';

interface ServiceRow {
  key: ServiceKey;
  bangalore: boolean;
  mumbai: boolean;
  chennai: boolean;
}

const SERVICE_ROWS: ServiceRow[] = [
  { key: 'sales',         bangalore: true,  mumbai: true,  chennai: true  },
  { key: 'service',       bangalore: true,  mumbai: true,  chennai: true  },
  { key: 'bodyShop',      bangalore: true,  mumbai: false, chennai: false },
  { key: 'parts',         bangalore: true,  mumbai: true,  chennai: true  },
  { key: 'certification', bangalore: true,  mumbai: true,  chennai: true  },
  { key: 'detailing',     bangalore: true,  mumbai: true,  chennai: false },
];

// ─── Cell component ───────────────────────────────────────────────────────────

function MatrixCell({ available }: { available: boolean }) {
  return (
    <td className="py-4 text-center">
      {available ? (
        <span
          className="inline-flex items-center justify-center text-success font-mono text-sm"
          aria-label="Available"
        >
          ✓
        </span>
      ) : (
        <span
          className="inline-flex items-center justify-center text-ink-subtle font-mono text-sm"
          aria-label="Not available"
        >
          —
        </span>
      )}
    </td>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ServiceMatrix() {
  const t = useTranslations('cities.serviceMatrix');

  return (
    <section className="bg-bg-subtle px-6 md:px-12 lg:px-24 py-20 md:py-28">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">

          {/* Left — heading */}
          <div className="md:col-span-4">
            <h3
              className={cn(
                'font-display text-3xl md:text-4xl tracking-[-0.03em] text-ink-primary mb-4',
              )}
            >
              {t('title')}
            </h3>
            <p className="font-sans text-sm text-ink-muted leading-relaxed max-w-xs">
              {t('subtitle')}
            </p>
          </div>

          {/* Right — table */}
          <div className="md:col-span-8 overflow-x-auto">
            <table
              className="w-full text-left"
              aria-label="Service availability by city"
            >
              <thead>
                <tr className="border-b border-line">
                  <th className="pb-4 font-mono text-[10px] uppercase tracking-widest text-ink-muted font-normal">
                    {t('capability')}
                  </th>
                  <th className="pb-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink-primary font-medium">
                    Bangalore
                  </th>
                  <th className="pb-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink-primary font-medium">
                    Mumbai
                  </th>
                  <th className="pb-4 text-center font-mono text-[10px] uppercase tracking-widest text-ink-primary font-medium">
                    Chennai
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {SERVICE_ROWS.map((row) => (
                  <tr key={row.key} className="hover:bg-bg-hover motion-safe:transition-colors">
                    <td className="py-4 font-mono text-xs uppercase tracking-widest text-ink-secondary">
                      {t(row.key)}
                    </td>
                    <MatrixCell available={row.bangalore} />
                    <MatrixCell available={row.mumbai} />
                    <MatrixCell available={row.chennai} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
