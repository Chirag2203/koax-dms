import Link from 'next/link';
import { Car } from 'lucide-react';

// ─── Not Found ────────────────────────────────────────────────────────────────

export default function VehicleNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg-canvas px-6 py-24">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle">
          <Car className="h-6 w-6 text-ink-muted" aria-hidden="true" />
        </div>
        <h1 className="text-[22px] font-semibold leading-[1.3] text-ink-primary">
          Vehicle not found
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          No vehicle with that VIN exists in the system.
        </p>
        <Link
          href="/inventory"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Back to Inventory
        </Link>
      </div>
    </div>
  );
}
