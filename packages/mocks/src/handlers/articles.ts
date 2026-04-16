import { http, HttpResponse } from 'msw';
import { articles } from '../fixtures/articles';

export const articleHandlers = [
  /**
   * GET /api/articles
   * Returns paginated articles. Optionally filtered by category.
   * Query params: category, page, pageSize
   */
  http.get('/api/articles', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? '8')));

    const filtered = category
      ? articles.filter((a) => a.category.toLowerCase() === category.toLowerCase())
      : articles;

    // Most recently published first
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime(),
    );

    const total = sorted.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = sorted.slice(start, start + pageSize);

    return HttpResponse.json({
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  }),

  /**
   * GET /api/articles/:slug
   * Returns a single article by slug.
   */
  http.get('/api/articles/:slug', ({ params }) => {
    const { slug } = params as { slug: string };
    const article = articles.find((a) => a.slug === slug);

    if (!article) {
      return HttpResponse.json(
        { error: 'Article not found', code: 'ARTICLE_NOT_FOUND' },
        { status: 404 },
      );
    }

    return HttpResponse.json({ data: article });
  }),
];
