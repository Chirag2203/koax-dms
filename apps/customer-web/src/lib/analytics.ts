/**
 * Customer-web analytics helper.
 *
 * v1 implementation:
 *   - console.debug in non-production environments
 *   - pushes to window.__bn_analytics (typed array) for test harnesses / GTM
 *
 * Per SPEC-CUSTOMER-PORTAL-002 §11, the following events are emitted by this
 * module for the service booking surface:
 *
 *   service_booking_started        — wizard opened (on mount of /service/book)
 *   service_booking_step_completed — each step advance in the booking wizard
 *   service_booking_submitted      — POST /api/service/bookings succeeds (JC-P1)
 *   service_booking_confirmed_by_staff — SA confirms (JC-P2) — emitted from staff-web
 *   service_booking_declined_by_staff  — SA declines (JC-P3) — emitted from staff-web
 *
 * Usage:
 *   import { track } from '@/src/lib/analytics';
 *   track('service_booking_started', { customerId, source: 'portal' });
 */

// ─── Window extension (typed) ─────────────────────────────────────────────────

export interface BnAnalyticsEvent {
  event: string;
  payload: Record<string, unknown>;
  ts: string; // ISO-8601 timestamp
}

// Window prop is accessed via typed cast at call sites (avoids cross-package
// `declare global` collision with staff-web's mirror file).
interface AnalyticsWindow extends Window {
  __bn_analytics?: BnAnalyticsEvent[];
}

// ─── Core track function ──────────────────────────────────────────────────────

/**
 * Emit an analytics event.
 *
 * In v1:
 *  - Pushes to window.__bn_analytics[] for test harnesses and GTM data-layer
 *  - console.debug logs the event name + payload (non-production only)
 *
 * This function is intentionally synchronous and non-throwing — analytics
 * failures must never interrupt the user flow.
 */
export function track(event: string, payload: Record<string, unknown>): void {
  const entry: BnAnalyticsEvent = {
    event,
    payload,
    ts: new Date().toISOString(),
  };

  // Push to window.__bn_analytics for test harness / GTM datalayer access.
  // Guard for SSR — window is only available in the browser.
  if (typeof window !== 'undefined') {
    const w = window as AnalyticsWindow;
    if (!w.__bn_analytics) {
      w.__bn_analytics = [];
    }
    w.__bn_analytics.push(entry);
  }

  // Console debug — suppressed in production to avoid leaking event data.
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[BN Analytics]', event, payload);
  }
}

// ─── Typed event helpers (service booking) ───────────────────────────────────

/** §11 — service_booking_started */
export function trackServiceBookingStarted(payload: {
  customerId: string;
  source: 'portal';
}): void {
  track('service_booking_started', payload);
}

/** §11 — service_booking_step_completed */
export function trackServiceBookingStepCompleted(payload: {
  step: 1 | 2 | 3 | 4 | 5;
  serviceTypeId?: string; // present at step 2+
}): void {
  track('service_booking_step_completed', payload as Record<string, unknown>);
}

/** §11 — service_booking_submitted (JC-P1 succeeds) */
export function trackServiceBookingSubmitted(payload: {
  jobCardId: string;
  serviceTypeId: string;
  pickupMode: 'WORKSHOP_DROP' | 'HOME_PICKUP';
  outletId: string;
}): void {
  track('service_booking_submitted', payload);
}
