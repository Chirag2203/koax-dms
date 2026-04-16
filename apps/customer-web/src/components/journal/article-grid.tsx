'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Article } from '@dms/types';
import { getArticleImage } from './article-image-map';

// ─── Article Card ─────────────────────────────────────────────────────────────

interface ArticleCardProps {
  article: Article;
}

function ArticleCard({ article }: ArticleCardProps) {
  const imageUrl = getArticleImage(article.slug);

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
        {/* Image */}
        <div className="mb-6 aspect-[16/10] overflow-hidden rounded-sm bg-bg-elevated">
          <Image
            src={imageUrl}
            alt={article.heroImage.alt}
            width={800}
            height={500}
            className="h-full w-full object-cover grayscale transition-all duration-1000 group-hover:scale-105 group-hover:grayscale-0"
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          />
        </div>

        {/* Date */}
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {formattedDate}
        </span>

        {/* Title */}
        <h3 className="mb-2 mt-3 font-display text-xl leading-snug text-ink-primary">
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className="line-clamp-3 text-sm leading-relaxed text-ink-secondary">
          {article.excerpt}
        </p>

        {/* Category + read time */}
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          {article.category} · {article.readTimeMinutes} min read
        </p>
      </Link>
    </article>
  );
}

// ─── Article Grid ─────────────────────────────────────────────────────────────

interface ArticleGridProps {
  articles: Article[];
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  const t = useTranslations('journal');

  return (
    <section
      aria-label="Latest dispatch"
      className="bg-bg-subtle px-6 py-16 md:px-12 md:py-24 lg:px-24"
    >
      <h2 className="mb-8 font-display text-2xl font-normal md:text-3xl">
        {t('latestDispatch')}
      </h2>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
