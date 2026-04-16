'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Article } from '@dms/types';

// ─── Unsplash placeholder images for articles (used when heroImage is local) ─

const ARTICLE_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
];

// ─── Article Card ─────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: Article;
  placeholderImage: string;
}

function ArticleCard({ article, placeholderImage }: ArticleCardProps) {
  // Use the heroImage if it's an external URL, otherwise fall back to the
  // Unsplash placeholder so the page renders correctly in the mocked phase
  const imageUrl = article.heroImage.url.startsWith('http')
    ? article.heroImage.url
    : placeholderImage;

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishDate));

  return (
    <article className="group cursor-pointer">
      <Link
        href={`/journal/${article.slug}`}
        aria-label={`Read: ${article.title}`}
      >
        {/* Image — 16:10 aspect ratio */}
        <div className="mb-6 aspect-[16/10] overflow-hidden rounded-sm">
          <Image
            src={imageUrl}
            alt={article.heroImage.alt}
            width={800}
            height={500}
            className="h-full w-full object-cover grayscale transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0"
            sizes="(min-width: 768px) 33vw, 100vw"
          />
        </div>

        {/* Meta */}
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {formattedDate}
        </span>

        {/* Title */}
        <h4 className="mt-4 mb-2 font-display text-xl leading-snug text-ink-primary">
          {article.title}
        </h4>

        {/* Excerpt */}
        <p className="line-clamp-3 text-sm leading-relaxed text-ink-secondary">
          {article.excerpt}
        </p>

        {/* Read time */}
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {article.readTimeMinutes} min read · {article.category}
        </p>
      </Link>
    </article>
  );
}

// ─── Journal Strip ────────────────────────────────────────────────────────────

interface JournalStripProps {
  articles: Article[];
}

export function JournalStrip({ articles }: JournalStripProps) {
  const t = useTranslations('journal');
  const displayed = articles.slice(0, 3);

  return (
    <section
      aria-label="Journal"
      className="bg-bg-subtle px-6 py-20 md:px-12 md:py-32 lg:px-24"
    >
      {/* Header */}
      <div className="mb-12">
        <span className="mb-4 block font-mono text-xs uppercase tracking-[0.3em] text-accent">
          The BN Journal
        </span>
        <h2 className="font-display text-3xl font-normal text-ink-primary md:text-4xl">
          {t('headline')}
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {displayed.map((article, index) => (
          <ArticleCard
            key={article.slug}
            article={article}
            placeholderImage={
              ARTICLE_PLACEHOLDERS[index % ARTICLE_PLACEHOLDERS.length] as string
            }
          />
        ))}
      </div>
    </section>
  );
}
