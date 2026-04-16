'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Car,
  Users,
  Wrench,
  Plus,
  LayoutDashboard,
  Receipt,
  Clock,
} from 'lucide-react';

import { useCommandPalette } from '@/src/providers/command-palette-provider';

// ── Placeholder fixture data (will be replaced by Agent D's fixtures) ────────

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ElementType;
  shortcut?: string;
}

const PLACEHOLDER_VEHICLES: PaletteItem[] = [
  {
    id: 'WP0AB2A91MS247831',
    label: '2021 Porsche 911 Carrera S',
    hint: 'Bangalore \u00b7 \u20b91,51,38,160',
    href: '/inventory/WP0AB2A91MS247831',
    icon: Car,
  },
  {
    id: 'WDD2221971A012345',
    label: '2023 Mercedes-Benz S 450',
    hint: 'Bangalore \u00b7 \u20b92,11,04,060',
    href: '/inventory/WDD2221971A012345',
    icon: Car,
  },
  {
    id: 'WBAFR9C50BC784512',
    label: '2022 BMW 7 Series 730Ld',
    hint: 'Mumbai \u00b7 \u20b91,18,50,000',
    href: '/inventory/WBAFR9C50BC784512',
    icon: Car,
  },
];

const PLACEHOLDER_CUSTOMERS: PaletteItem[] = [
  {
    id: 'cust-001',
    label: 'Rahul Kapoor',
    hint: 'Bangalore \u00b7 +91 98765 43210',
    href: '/customers/cust-001',
    icon: Users,
  },
  {
    id: 'cust-002',
    label: 'Priya Nair',
    hint: 'Mumbai \u00b7 +91 87654 32109',
    href: '/customers/cust-002',
    icon: Users,
  },
];

const PLACEHOLDER_JOB_CARDS: PaletteItem[] = [
  {
    id: 'jc-2024-001',
    label: 'JC-2024-001 \u2014 Annual Service',
    hint: 'Porsche 911 \u00b7 In Progress',
    href: '/service/job-cards/jc-2024-001',
    icon: Wrench,
  },
  {
    id: 'jc-2024-002',
    label: 'JC-2024-002 \u2014 Brake Inspection',
    hint: 'BMW 7 Series \u00b7 Awaiting Parts',
    href: '/service/job-cards/jc-2024-002',
    icon: Wrench,
  },
];

const ACTIONS: PaletteItem[] = [
  {
    id: 'action-new-vehicle',
    label: 'Create new vehicle',
    hint: 'Add to inventory',
    href: '/inventory/new',
    icon: Plus,
    shortcut: 'G I N',
  },
  {
    id: 'action-new-lead',
    label: 'Create lead',
    hint: 'Start a new sales lead',
    href: '/sales/leads/new',
    icon: Receipt,
  },
  {
    id: 'action-new-appointment',
    label: 'New service appointment',
    hint: 'Schedule a service visit',
    href: '/service/appointments/new',
    icon: Wrench,
  },
  {
    id: 'action-dashboard',
    label: 'Go to dashboard',
    hint: 'Return to overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    shortcut: 'G D',
  },
];

// ── Group heading shared class ───────────────────────────────────────────────

const GROUP_CLS =
  '[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-ink-muted [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:select-none mb-1';

// ── Sub-components ───────────────────────────────────────────────────────────

interface PaletteItemRowProps {
  item: PaletteItem;
  onSelect: (href: string) => void;
}

function PaletteItemRow({ item, onSelect }: PaletteItemRowProps) {
  const Icon = item.icon;

  return (
    <Command.Item
      value={`${item.label} ${item.hint ?? ''}`}
      onSelect={() => onSelect(item.href)}
      className={[
        'flex items-center gap-3 px-3 h-10 rounded-md cursor-pointer',
        'text-ink-secondary',
        'data-[selected=true]:bg-bg-hover data-[selected=true]:text-ink-primary',
        'transition-colors duration-75 outline-none select-none',
      ].join(' ')}
    >
      {/* Icon */}
      <span className="flex-shrink-0 text-ink-muted" aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>

      {/* Primary + secondary text */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-ink-primary leading-tight truncate">
          {item.label}
        </div>
        {item.hint && (
          <div className="text-[12px] text-ink-muted leading-tight truncate">
            {item.hint}
          </div>
        )}
      </div>

      {/* Optional keyboard shortcut */}
      {item.shortcut && (
        <kbd
          className="flex-shrink-0 font-mono text-[11px] text-ink-muted px-1.5 py-0.5 rounded bg-bg-subtle border border-line leading-none select-none"
          aria-label={`Shortcut: ${item.shortcut}`}
        >
          {item.shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter();
  const { open, setOpen, recentItems, markItemOpened } = useCommandPalette();

  const handleOpenChange = useCallback(
    (value: boolean) => {
      setOpen(value);
    },
    [setOpen],
  );

  const handleSelect = useCallback(
    (href: string, id: string) => {
      markItemOpened(id);
      setOpen(false);
      router.push(href);
    },
    [markItemOpened, router, setOpen],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Command palette"
      /**
       * overlayClassName — backdrop rendered by cmdk via Radix Dialog.Overlay.
       * contentClassName — wraps the Command root; we use it for positioning only.
       * The actual panel chrome is on the Command element via `className`.
       */
      overlayClassName="fixed inset-0 bg-black/60 z-50"
      contentClassName="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none"
      className={[
        /* Panel */
        'pointer-events-auto w-full max-w-[560px]',
        'bg-bg-surface rounded-lg border border-line-strong shadow-4 overflow-hidden',
      ].join(' ')}
    >
      {/* ── Search input ── */}
      <div className="flex items-center px-4 border-b border-line">
        <Command.Input
          autoFocus
          placeholder="Type a command or search\u2026"
          className={[
            'flex-1 h-12 bg-transparent border-0 outline-none ring-0',
            'text-[16px] text-ink-primary placeholder:text-ink-muted',
            'font-sans',
          ].join(' ')}
        />
      </div>

      {/* ── Results list ── */}
      <Command.List
        className="overflow-y-auto max-h-[400px] py-2 px-2"
        aria-label="Command palette results"
      >
        {/* Empty state */}
        <Command.Empty className="flex items-center justify-center h-16 text-[14px] text-ink-muted">
          No results found.
        </Command.Empty>

        {/* Recent items */}
        {recentItems.length > 0 && (
          <Command.Group heading="Recent" className={GROUP_CLS}>
            {recentItems.slice(0, 4).map((item) => (
              <Command.Item
                key={item.id}
                value={item.label}
                onSelect={() => handleSelect(item.href ?? '/dashboard', item.id)}
                className={[
                  'flex items-center gap-3 px-3 h-10 rounded-md cursor-pointer',
                  'text-ink-secondary',
                  'data-[selected=true]:bg-bg-hover data-[selected=true]:text-ink-primary',
                  'transition-colors duration-75 outline-none select-none',
                ].join(' ')}
              >
                <span className="flex-shrink-0 text-ink-muted" aria-hidden="true">
                  <Clock size={14} />
                </span>
                <span className="flex-1 text-[14px] text-ink-primary truncate">
                  {item.label}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Vehicles */}
        <Command.Group heading="Vehicles" className={GROUP_CLS}>
          {PLACEHOLDER_VEHICLES.map((item) => (
            <PaletteItemRow
              key={item.id}
              item={item}
              onSelect={(href) => handleSelect(href, item.id)}
            />
          ))}
        </Command.Group>

        {/* Customers */}
        <Command.Group heading="Customers" className={GROUP_CLS}>
          {PLACEHOLDER_CUSTOMERS.map((item) => (
            <PaletteItemRow
              key={item.id}
              item={item}
              onSelect={(href) => handleSelect(href, item.id)}
            />
          ))}
        </Command.Group>

        {/* Job Cards */}
        <Command.Group heading="Job Cards" className={GROUP_CLS}>
          {PLACEHOLDER_JOB_CARDS.map((item) => (
            <PaletteItemRow
              key={item.id}
              item={item}
              onSelect={(href) => handleSelect(href, item.id)}
            />
          ))}
        </Command.Group>

        {/* Actions */}
        <Command.Group heading="Actions" className={GROUP_CLS}>
          {ACTIONS.map((item) => (
            <PaletteItemRow
              key={item.id}
              item={item}
              onSelect={(href) => handleSelect(href, item.id)}
            />
          ))}
        </Command.Group>
      </Command.List>

      {/* ── Footer helper bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-line bg-bg-subtle">
        <span className="text-[11px] text-ink-muted select-none font-sans">
          <kbd className="font-mono">&uarr;&darr;</kbd> Navigate
          <span className="mx-2">&middot;</span>
          <kbd className="font-mono">&#8629;</kbd> Open
          <span className="mx-2">&middot;</span>
          <kbd className="font-mono">&#9099;</kbd> Close
        </span>
      </div>
    </Command.Dialog>
  );
}
