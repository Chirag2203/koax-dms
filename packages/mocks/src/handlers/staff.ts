import { http, HttpResponse } from 'msw';
import {
  staffUsers,
  commandPaletteItems,
  staffNotifications,
  dashboardStats,
} from '../fixtures/staff';

// ─── Staff Handlers ────────────────────────────────────────────────────────────

export const staffHandlers = [
  /**
   * GET /api/staff/me
   * Returns the current staff user.
   * Default: Arjun Mehta (R10, Sales Manager, Mumbai) — staffUsers[2].
   */
  http.get('/api/staff/me', () => {
    const currentUser = staffUsers[2];
    return HttpResponse.json({ data: currentUser });
  }),

  /**
   * GET /api/staff/users
   * Returns all staff user profiles.
   */
  http.get('/api/staff/users', () => {
    return HttpResponse.json({ data: staffUsers });
  }),

  /**
   * GET /api/staff/notifications
   * Returns all staff notifications, newest first.
   * Supports optional ?unread=true query param to filter unread only.
   */
  http.get('/api/staff/notifications', ({ request }) => {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const data = unreadOnly
      ? staffNotifications.filter((n) => !n.isRead)
      : staffNotifications;

    return HttpResponse.json({
      data,
      meta: {
        total: staffNotifications.length,
        unread: staffNotifications.filter((n) => !n.isRead).length,
      },
    });
  }),

  /**
   * GET /api/staff/command-palette
   * Returns all command palette items.
   * Supports optional ?q= search query to filter by label (case-insensitive).
   */
  http.get('/api/staff/command-palette', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();

    const data = q
      ? commandPaletteItems.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.hint?.toLowerCase().includes(q) ?? false) ||
            item.category.toLowerCase().includes(q),
        )
      : commandPaletteItems;

    return HttpResponse.json({ data });
  }),

  /**
   * GET /api/staff/dashboard/stats
   * Returns KPI dashboard stats for the current user's outlet.
   */
  http.get('/api/staff/dashboard/stats', () => {
    return HttpResponse.json({ data: dashboardStats });
  }),
];
