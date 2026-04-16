'use client';
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Article } from '@dms/types';
import { getArticleImage } from './article-image-map';

// ─── Featured Article ─────────────────────────────────────────────────────────

interface FeaturedArticleProps {
  article: Article;
}

export function FeaturedArticle({ article }: FeaturedArticleProps) {
  const t = useTranslations('journal');
  const imageUrl = getArticleImage(article.slug);

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishDate));

  return (
    <section
      aria-label="Featured article"
      className="px-6 py-12 md:px-12 lg:px-24"
    >
      <div className="grid grid-cols-1 items-start gap-0 md:grid-cols-12">
        {/* Image — 60% */}
        <div className="group relative overflow-hidden rounded-sm md:col-span-7">
          <div className="aspect-[4/3] overflow-hidden">
            <Image
              src={imageUrl}
              alt={article.heroImage.alt}
              width={1200}
              height={900}
              className="h-full w-full object-cover brightness-90 transition-transform duration-700 group-hover:scale-105"
              sizes="(min-width: 768px) 60vw, 100vw"
              priority
            />
          </div>
        </div>

        {/* Text — 40% */}
        <div className="pt-8 md:col-span-5 md:pl-12 md:pt-16">
          <span className="mb-4 block font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            {formattedDate} · {article.category}
          </span>
          <h2 className="mb-6 font-display text-3xl font-normal leading-tight md:text-4xl">
            {article.title}
          </h2>
          <p className="mb-8 leading-relaxed text-ink-secondary">
            {article.excerpt}
          </p>
          <Link
            href={`/journal/${article.slug}`}
            className="font-mono text-xs uppercase tracking-widest text-accent transition-opacity hover:opacity-70"
          >
            {t('readArticle')} →
          </Link>
        </div>
      </div>
    </section>
  );
}
