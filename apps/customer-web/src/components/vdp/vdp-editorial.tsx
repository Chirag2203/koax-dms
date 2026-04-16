import * as React from 'react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VdpEditorialProps {
  editorialCopy: string;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Split editorial copy into paragraphs.
 * Prefer double-newline splits, then fall back to sentence boundary (period + space).
 */
function splitIntoParagraphs(copy: string): string[] {
  const trimmed = copy.trim();

  // Try double-newline first
  const byDoubleLine = trimmed.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  if (byDoubleLine.length > 1) return byDoubleLine;

  // Fall back to splitting on ". " followed by uppercase (sentence boundary)
  const sentences = trimmed.split(/(?<=\.)\s+(?=[A-Z])/);
  if (sentences.length <= 1) return [trimmed];

  // Group into ~2 paragraph-sized chunks
  const half = Math.ceil(sentences.length / 2);
  return [
    sentences.slice(0, half).join(' '),
    sentences.slice(half).join(' '),
  ].filter(Boolean);
}

/**
 * Extract the first sentence to use as a pull quote.
 * Returns null if the copy is too short (< 60 chars).
 */
function extractPullQuote(copy: string): string | null {
  const match = copy.match(/^[^.!?]+[.!?]/);
  if (!match) return null;
  const candidate = match[0].trim();
  if (candidate.length < 60) return null;
  return candidate;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VdpEditorial({ editorialCopy, className }: VdpEditorialProps) {
  const pullQuote = extractPullQuote(editorialCopy);
  const paragraphs = splitIntoParagraphs(editorialCopy);

  return (
    <section
      className={cn(
        'bg-bg-paper py-20 md:py-32 px-6 md:px-12 lg:px-24',
        className,
      )}
    >
      <div className="max-w-[720px] mx-auto">
        {/* Pull quote */}
        {pullQuote && (
          <blockquote
            className="font-display text-3xl md:text-[40px] italic leading-tight text-ink-primary mb-12 md:mb-16"
          >
            &ldquo;{pullQuote}&rdquo;
          </blockquote>
        )}

        {/* Body paragraphs */}
        <div className="font-sans text-[17px] leading-relaxed text-ink-secondary space-y-8">
          {paragraphs.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
