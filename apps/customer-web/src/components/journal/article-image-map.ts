// ─── Article image map ────────────────────────────────────────────────────────
// Maps article slugs to Unsplash placeholder images, since fixtures use local paths.

export const ARTICLE_IMAGE_MAP: Record<string, string> = {
  'the-silence-of-concrete':
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',
  'beyond-the-odometer':
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  'monsoon-ready':
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80',
  'the-art-of-the-exit':
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
  'obsidian-graphite-crayon':
    'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&q=80',
  'porsche-in-the-subcontinent':
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
  'advanced-in-milliseconds':
    'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&q=80',
  'the-gentle-renaissance':
    'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=800&q=80',
};

export function getArticleImage(slug: string): string {
  return (
    ARTICLE_IMAGE_MAP[slug] ??
    'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80'
  );
}
