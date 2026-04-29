'use client';

/**
 * /(portal)/service/bookings/[id] — Booking detail status tracker.
 *
 * Renders a vertical JC-stage timeline (AWAITING_CONFIRMATION → RECEIVED →
 * IN_PROGRESS → READY_FOR_DELIVERY → DELIVERED), a "Your vehicle is ready"
 * banner at READY_FOR_DELIVERY, customer-visible event filtering (B4), and
 * a cancelled / not-found empty state.
 *
 * Spec reference: SPEC-CUSTOMER-PORTAL-002 §8.1, §8.3, §7.3 (B4), S4
 */

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Car,
  MapPin,
  Phone,
  User,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@dms/ui';
import { usePortalAuth } from '@/src/providers/portal-auth-provider';
import { usePortalServiceStore } from '@/src/lib/service/service-booking-service-bridge';
import { serviceTypes, outlets, timelineEvents, MOCK_STAFF_PROFILES, vehicleMasters } from '@dms/mocks/fixtures';
import type { JobCard, JobCardTimelineEvent } from '@dms/types';

// ─── Lookup maps ─────────────────────────────────────────────────────────────

const SERVICE_TYPE_NAME: Record<string, string> = Object.fromEntries(
  serviceTypes.map((st) => [st.id, st.name]),
);

const OUTLET_MAP: Record<string, { name: string; address: string; phone: string }> =
  Object.fromEntries(
    outlets.map((o) => [o.id, { name: o.name, address: o.address, phone: o.phone }]),
  );

// Staff ID → { name, phone }
const ADVISOR_MAP: Record<string, { name: string; phone: string }> = Object.fromEntries(
  MOCK_STAFF_PROFILES.map((p) => [p.id, { name: p.name, phone: p.phone ?? '' }]),
);

// VIN → { year, make, model, variant }
const VEHICLE_MAP: Record<string, { year: number; make: string; model: string; variant: string }> =
  Object.fromEntries(
    vehicleMasters.map((v) => [
      v.vin,
      { year: v.year, make: v.make, model: v.model, variant: v.variant ?? '' },
    ]),
  );

// ─── Timeline stage config ─────────────────────────────────────────────────────

type MainlineStage = 'AWAITING_CONFIRMATION' | 'RECEIVED' | 'IN_PROGRESS' | 'READY_FOR_DELIVERY' | 'DELIVERED';

const MAINLINE_STAGES: MainlineStage[] = [
  'AWAITING_CONFIRMATION',
  'RECEIVED',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'DELIVERED',
];

// Map full JobCardStatus to the nearest mainline stage for progress rendering
const STATUS_TO_MAINLINE: Record<string, MainlineStage> = {
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  RECEIVED: 'RECEIVED',
  DIAGNOSED: 'IN_PROGRESS',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_PARTS: 'IN_PROGRESS',
  ADDITIONAL_WORK_APPROVAL: 'IN_PROGRESS',
  QC: 'IN_PROGRESS',
  READY_FOR_DELIVERY: 'READY_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  REOPENED: 'IN_PROGRESS',
};

// ─── Customer-visible timeline event kinds (B4, §7.3) ────────────────────────

const CUSTOMER_VISIBLE_EVENT_TYPES = new Set<string>([
  'received',
  'status_changed',
  'customer_note',
  'ready_for_delivery',
  'delivered',
  'cancelled',
]);

function isCustomerVisibleEvent(event: JobCardTimelineEvent): boolean {
  return CUSTOMER_VISIBLE_EVENT_TYPES.has(event.type);
}

// ─── Local primitive components ───────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-bg-surface,var(--color-bg-paper))] p-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="text-[14px] text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

// ─── Ready banner ─────────────────────────────────────────────────────────────

function ReadyBanner({
  outletId,
  advisorId,
  t,
}: {
  outletId: string;
  advisorId: string;
  t: ReturnType<typeof useTranslations<'portal.serviceBooking.detail'>>;
}) {
  const outlet = OUTLET_MAP[outletId];
  const advisor = ADVISOR_MAP[advisorId];

  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-green-300 bg-green-50 p-5 rounded-md mb-6"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          size={20}
          className="text-green-600 shrink-0 mt-0.5"
          strokeWidth={1.5}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="font-display text-[17px] text-green-800 mb-1">
            {t('readyBannerTitle')}
          </p>
          {outlet && (
            <p className="text-[13px] text-green-700 flex items-start gap-1.5 mt-1">
              <MapPin size={13} className="shrink-0 mt-0.5 text-green-500" strokeWidth={1.5} aria-hidden />
              {outlet.address}
            </p>
          )}
          {advisor?.name && (
            <p className="text-[13px] text-green-700 flex items-center gap-1.5 mt-1">
              <User size={13} className="shrink-0 text-green-500" strokeWidth={1.5} aria-hidden />
              {t('readyBannerAdvisor', { name: advisor.name })}
              {advisor.phone && (
                <>
                  {' · '}
                  <a
                    href={`tel:${advisor.phone.replace(/\s/g, '')}`}
                    className="underline underline-offset-2 decoration-dotted hover:text-green-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-600"
                    aria-label={`Call ${advisor.name}`}
                  >
                    <Phone size={11} className="inline shrink-0 mr-0.5" strokeWidth={1.5} aria-hidden />
                    {advisor.phone}
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cancelled empty state ────────────────────────────────────────────────────

function CancelledState({
  booking,
  t,
}: {
  booking: JobCard;
  t: ReturnType<typeof useTranslations<'portal.serviceBooking.detail'>>;
}) {
  const isCustomerCancel = booking.declineReason === 'Cancelled by customer';

  return (
    <div className="py-16 text-center border border-dashed border-[var(--color-line)]">
      <AlertCircle
        size={36}
        className="mx-auto mb-4 text-[var(--color-ink-muted)]"
        strokeWidth={1}
        aria-hidden
      />
      <p className="font-display text-xl italic text-[var(--color-ink-secondary)] mb-3">
        {isCustomerCancel ? t('cancelledByYou') : t('cancelledByStaff')}
      </p>
      {!isCustomerCancel && booking.declineReason && (
        <p className="text-[13px] text-[var(--color-ink-muted)] mb-6">
          {t('declineReason', { reason: booking.declineReason })}
        </p>
      )}
      <Link
        href="/service/book"
        className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
      >
        {t('bookNewCta')} →
      </Link>
    </div>
  );
}

// ─── Stage timeline ───────────────────────────────────────────────────────────

const STAGE_LABEL_KEY: Record<MainlineStage, string> = {
  AWAITING_CONFIRMATION: 'stageAwaitingConfirmation',
  RECEIVED: 'stageReceived',
  IN_PROGRESS: 'stageInProgress',
  READY_FOR_DELIVERY: 'stageReadyForDelivery',
  DELIVERED: 'stageDelivered',
};

function StageTimeline({
  booking,
  events,
  t,
}: {
  booking: JobCard;
  events: JobCardTimelineEvent[];
  t: ReturnType<typeof useTranslations<'portal.serviceBooking.detail'>>;
}) {
  const currentMainline = STATUS_TO_MAINLINE[booking.status] ?? 'AWAITING_CONFIRMATION';
  const currentIndex = MAINLINE_STAGES.indexOf(currentMainline);

  // Customer-visible timeline events, sorted chronologically
  const visibleEvents = events
    .filter(isCustomerVisibleEvent)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  // Map events by their nearest mainline stage for timestamp display
  function getStageTimestamp(stage: MainlineStage): string | null {
    const relevantEventTypes: Record<MainlineStage, string[]> = {
      AWAITING_CONFIRMATION: ['status_changed'],
      RECEIVED: ['received', 'status_changed'],
      IN_PROGRESS: ['status_changed'],
      READY_FOR_DELIVERY: ['ready_for_delivery', 'status_changed'],
      DELIVERED: ['delivered', 'status_changed'],
    };
    const types = relevantEventTypes[stage];
    const event = visibleEvents.find((e) => types.includes(e.type));
    return event?.at ?? null;
  }

  return (
    <div>
      {/* Stage dots */}
      <ol className="relative border-l border-[var(--color-line)] ml-4 space-y-6" aria-label={t('timelineAriaLabel')}>
        {MAINLINE_STAGES.map((stage, i) => {
          const isDone = i < currentIndex || (booking.status === 'DELIVERED' && i === currentIndex);
          const isCurrent = i === currentIndex && booking.status !== 'DELIVERED';
          const isFuture = !isDone && !isCurrent;
          const timestamp = isDone || isCurrent ? getStageTimestamp(stage) : null;

          return (
            <li key={stage} className="ml-6">
              <span
                className={cn(
                  'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border-2',
                  isDone
                    ? 'bg-green-600 border-green-600'
                    : isCurrent
                    ? 'bg-white border-[var(--color-brass)] ring-4 ring-[var(--color-brass)] ring-opacity-25'
                    : 'bg-white border-[var(--color-line)]',
                )}
                aria-hidden
              >
                {isDone ? (
                  <CheckCircle2 size={12} className="text-white" strokeWidth={2} />
                ) : isCurrent ? (
                  <Circle size={7} className="text-[var(--color-brass)]" fill="currentColor" />
                ) : null}
              </span>

              <div className="pt-0.5 pb-1 min-h-[1.75rem]">
                <p
                  className={cn(
                    'font-mono text-[12px] uppercase tracking-widest leading-snug',
                    isDone
                      ? 'text-[var(--color-ink-secondary)]'
                      : isCurrent
                      ? 'text-[var(--color-brass)] font-semibold'
                      : 'text-[var(--color-ink-muted)]',
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {t(STAGE_LABEL_KEY[stage] as Parameters<typeof t>[0])}
                </p>

                {isCurrent && (
                  <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                    {t('currentStageHint')}
                  </p>
                )}

                {timestamp && (
                  <p className="font-mono text-[10px] text-[var(--color-ink-muted)] mt-0.5">
                    {new Date(timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}

                {isFuture && (
                  <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5 opacity-60">
                    {t('pendingHint')}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Customer-visible timeline events below the stage dots */}
      {visibleEvents.length > 0 && (
        <div className="mt-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-4">
            {t('activitySectionLabel')}
          </p>
          <ol className="relative border-l border-[var(--color-line)] ml-4 space-y-4">
            {visibleEvents.map((event) => (
              <li key={event.id} className="ml-6">
                <span
                  className="absolute -left-2 w-4 h-4 rounded-full bg-[var(--color-bg-paper,#fff)] border-2 border-[var(--color-line)] flex items-center justify-center"
                  aria-hidden
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-brass)]" />
                </span>
                <p className="text-[13px] text-[var(--color-ink)] leading-snug">
                  {event.description}
                </p>
                <p className="font-mono text-[10px] text-[var(--color-ink-muted)] mt-0.5">
                  {event.actorName} ·{' '}
                  {new Date(event.at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl px-6 md:px-12 lg:px-16 py-16" aria-busy="true" aria-label="Loading">
      <div className="h-3 w-24 bg-[var(--color-line)] rounded animate-pulse mb-8" />
      <div className="h-8 w-64 bg-[var(--color-line)] rounded animate-pulse mb-4" />
      <div className="h-4 w-48 bg-[var(--color-line)] rounded animate-pulse mb-12" />
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <div className="w-6 h-6 rounded-full bg-[var(--color-line)] animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-[var(--color-line)] rounded animate-pulse mb-1.5" />
              <div className="h-2.5 w-20 bg-[var(--color-line)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ServiceBookingDetailPage() {
  const t = useTranslations('portal.serviceBooking.detail');
  const { customerId } = usePortalAuth();
  const params = useParams<{ id: string }>();
  const bookingId = params.id;

  const selectBookings = usePortalServiceStore((s) => s.selectBookingsByCustomer);

  // Get this customer's portal bookings (RLS)
  const booking: JobCard | undefined = React.useMemo(() => {
    const bookings = selectBookings(customerId);
    return bookings.find((b) => b.id === bookingId);
  }, [selectBookings, customerId, bookingId]);

  // Loading guard — store is synchronous, but we need to handle the edge case
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingSkeleton />;
  }

  // Not found → 404
  if (!booking) {
    notFound();
  }

  // Cancelled state — no timeline
  const isCancelled = booking.status === 'CANCELLED';
  const isReadyForDelivery = booking.status === 'READY_FOR_DELIVERY';

  // Derive enriched data
  const serviceTypeName =
    (booking.serviceTypeId ? SERVICE_TYPE_NAME[booking.serviceTypeId] : null) ??
    booking.serviceTypeId ??
    t('unknownService');

  const formattedScheduledDate = booking.scheduledDate
    ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const slotLabel =
    booking.scheduledSlot === 'MORNING'
      ? t('slotMorning')
      : booking.scheduledSlot === 'AFTERNOON'
      ? t('slotAfternoon')
      : null;

  const vehicle = booking.vin ? VEHICLE_MAP[booking.vin] : null;
  const outlet = booking.outletId ? OUTLET_MAP[booking.outletId] : null;
  const advisor = ADVISOR_MAP[booking.advisorId];

  // Show advisor only if past AWAITING_CONFIRMATION (per spec S4 side panel)
  const showAdvisor = booking.status !== 'AWAITING_CONFIRMATION' && advisor;

  // Filter timeline events for this booking (B4: customer-visible only)
  const bookingEvents = timelineEvents.filter((e) => e.jobCardId === booking.id);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="px-6 md:px-12 lg:px-16 pt-12 md:pt-16 pb-8">
        <Link
          href="/service/bookings"
          className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-brass)] mb-6 hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brass)]"
        >
          <ArrowLeft size={12} aria-hidden />
          {t('backToBookings')}
        </Link>

        <div className="mb-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-1">
            {booking.jobNo}
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] leading-tight">
            {serviceTypeName}
          </h1>
        </div>

        {(formattedScheduledDate || slotLabel) && (
          <div className="flex items-center gap-2 mt-3">
            <CalendarDays size={14} className="text-[var(--color-ink-muted)] shrink-0" strokeWidth={1.5} aria-hidden />
            <p className="text-[14px] text-[var(--color-ink-secondary)]">
              {formattedScheduledDate}
              {slotLabel && ` · ${slotLabel}`}
            </p>
          </div>
        )}

        <div className="mt-8 border-t border-[var(--color-line)]" />
      </header>

      <div className="px-6 md:px-12 lg:px-16 pb-16">
        {/* Ready-for-delivery banner */}
        {isReadyForDelivery && (
          <ReadyBanner
            outletId={booking.outletId}
            advisorId={booking.advisorId}
            t={t}
          />
        )}

        {/* Cancelled / awaiting-cancel empty state */}
        {isCancelled ? (
          <CancelledState booking={booking} t={t} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
            {/* Main: timeline */}
            <section aria-label={t('timelineSectionLabel')}>
              <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-ink-muted)] mb-6">
                {t('timelineSectionLabel')}
              </p>
              <StageTimeline
                booking={booking}
                events={bookingEvents}
                t={t}
              />
            </section>

            {/* Sidebar: info cards */}
            <aside className="space-y-4" aria-label={t('sidebarAriaLabel')}>
              {/* Vehicle card */}
              {vehicle && (
                <Card title={t('vehicleCardTitle')}>
                  <div className="flex items-start gap-3">
                    <Car
                      size={16}
                      className="text-[var(--color-ink-muted)] shrink-0 mt-1"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <dl className="flex-1 min-w-0 divide-y divide-[var(--color-line)]">
                      <Field
                        label={t('vehicleLabel')}
                        value={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`}
                      />
                      <Field
                        label="VIN"
                        value={
                          <span className="font-mono text-[12px] tracking-widest">
                            {booking.vin}
                          </span>
                        }
                      />
                    </dl>
                  </div>
                </Card>
              )}

              {/* Outlet card */}
              {outlet && (
                <Card title={t('outletCardTitle')}>
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="text-[var(--color-ink-muted)] shrink-0 mt-1"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <dl className="flex-1 min-w-0 divide-y divide-[var(--color-line)]">
                      <Field label={t('outletNameLabel')} value={outlet.name} />
                      <Field
                        label={t('outletAddressLabel')}
                        value={
                          <span className="text-[13px] leading-relaxed">
                            {outlet.address}
                          </span>
                        }
                      />
                    </dl>
                  </div>
                </Card>
              )}

              {/* Advisor card — shown only after AWAITING_CONFIRMATION */}
              {showAdvisor && (
                <Card title={t('advisorCardTitle')}>
                  <div className="flex items-start gap-3">
                    <User
                      size={16}
                      className="text-[var(--color-ink-muted)] shrink-0 mt-1"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <dl className="flex-1 min-w-0 divide-y divide-[var(--color-line)]">
                      <Field label={t('advisorNameLabel')} value={advisor.name} />
                      {advisor.phone && (
                        <Field
                          label={t('advisorPhoneLabel')}
                          value={
                            <a
                              href={`tel:${advisor.phone.replace(/\s/g, '')}`}
                              className="font-mono text-[12px] text-[var(--color-brass)] hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-brass)]"
                              aria-label={`Call ${advisor.name}`}
                            >
                              <Phone size={10} className="inline shrink-0 mr-1" strokeWidth={1.5} aria-hidden />
                              {advisor.phone}
                            </a>
                          }
                        />
                      )}
                    </dl>
                  </div>
                </Card>
              )}
            </aside>
          </div>
        )}
      </div>

      <div className="pb-20 lg:pb-8" />
    </div>
  );
}
