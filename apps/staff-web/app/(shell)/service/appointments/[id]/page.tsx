'use client';

import { notFound } from 'next/navigation';
import { useServiceStore } from '@/src/lib/service/service-store';
import { AppointmentDetailView } from '@/src/components/service/appointment-detail-view';

/**
 * Appointment detail page.
 *
 * Reads from the in-memory Zustand store so mutations
 * (check-in, reschedule, cancel) are visible without a page refresh.
 *
 * Spec reference: PLAN-SERVICE-002 §U13, P5
 */

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const appointment = useServiceStore((s) => s.appointments.find((a) => a.id === params.id));

  if (!appointment) {
    notFound();
  }

  return <AppointmentDetailView appointment={appointment} />;
}
