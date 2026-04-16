import type { Metadata } from 'next';
import { articles } from '@dms/mocks/fixtures';
import {
  JournalHero,
  FeaturedArticle,
  ArticleGrid,
  JournalNewsletter,
} from '@/src/components/journal';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'The Journal | BN Automobiles',
  description:
    'Dispatches from the world of automotive culture — stories, analysis, and perspectives from the BN Automobiles atelier.',
};

// ─── Data slices ──────────────────────────────────────────────────────────────

const [featuredArticle, ...remainingArticles] = articles;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JournalPage() {
  return (
    <main>
      {/* 1 — Hero: large editorial title */}
      <JournalHero />

      {/* 2 — Featured article: large two-column layout */}
      {featuredArticle && <FeaturedArticle article={featuredArticle} />}

      {/* 3 — Article grid: remaining articles */}
      <ArticleGrid articles={remainingArticles} />

      {/* 4 — Newsletter signup */}
      <JournalNewsletter />
    </main>
  );
}
