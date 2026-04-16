import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KbdShortcutProps {
  /** Key sequence e.g. "\u2318K", "G+I", "\u238b" */
  keys: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KbdShortcut({ keys, className }: KbdShortcutProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5',
        'font-mono text-[11px] text-ink-muted bg-bg-subtle',
        'border border-line',
        className,
      )}
    >
      {keys}
    </kbd>
  );
}
