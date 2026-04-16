import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle, className }: SectionHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <h2 className="font-display text-[2rem] leading-tight tracking-[-0.02em] text-ink-primary md:text-[3.5rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="font-sans text-lg leading-relaxed text-ink-secondary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
