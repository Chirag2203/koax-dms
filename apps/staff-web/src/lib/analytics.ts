/**
 * Staff-web analytics helper.
 *
 * v1 implementation mirrors customer-web/src/lib/analytics.ts — same
 * window.__bn_analytics array + console.debug pattern.
 *
 * Per SPEC-CUSTOMER-PORTAL-002 §11, the following events are emitted by
 * this module for the service booking surface:
 *
 *   service_booking_confirmed_by_staff — SA confirms portal booking (JC-P2)
 *   service_booking_declined_by_staff  — SA declines portal booking (JC-P3)
 *
 * Usage:
 *   import { track } from '@/src/lib/analytics';
 *   track('service_booking_confirmed_by_staff', { jobCardId, advisorId });
 */

// ─── Window extension (typed) ─────────────────────────────────────────────────

export interface BnAnalyticsEvent {
  event: string;
  payload: Record<string, unknown>;
  ts: string; // ISO-8601 timestamp
}

// Window prop is accessed via typed cast at call sites (avoids cross-package
// `declare global` collision with customer-web's mirror file).
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

// ─── Typed event helpers (service booking — staff-side) ──────────────────────

/** §11 — service_booking_confirmed_by_staff (JC-P2 succeeds) */
export function trackServiceBookingConfirmedByStaff(payload: {
  jobCardId: string;
  advisorId: string;
}): void {
  track('service_booking_confirmed_by_staff', payload);
}

/** §11 — service_booking_declined_by_staff (JC-P3 succeeds) */
export function trackServiceBookingDeclinedByStaff(payload: {
  jobCardId: string;
  declineReason: string;
}): void {
  track('service_booking_declined_by_staff', payload);
}
