import Link from 'next/link';

// ─── Not Found ────────────────────────────────────────────────────────────────

export default function VehicleEditNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink-primary">Vehicle not found</h1>
        <p className="text-sm text-ink-muted max-w-sm">
          The vehicle you are trying to edit does not exist or has been removed.
        </p>
      </div>
      <Link
        href="/inventory"
        className="h-9 px-4 rounded-md text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors inline-flex items-center"
      >
        Back to inventory
      </Link>
    </div>
  );
}
