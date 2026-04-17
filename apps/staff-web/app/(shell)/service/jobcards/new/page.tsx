import { Suspense } from 'react';
import { NewJobCardForm } from '@/src/components/service/new-jobcard-form';

/**
 * /service/jobcards/new
 *
 * New Job Card creation form.
 * Reads ?bay=<code> and ?appointmentId=<id> query params for pre-fill.
 *
 * Spec reference: PLAN-SERVICE-002 §P2, U16
 */
export default function NewJobCardPage() {
  return (
    <Suspense fallback={
      <div className="px-6 py-5 text-sm text-ink-muted">Loading form…</div>
    }>
      <NewJobCardForm />
    </Suspense>
  );
}
