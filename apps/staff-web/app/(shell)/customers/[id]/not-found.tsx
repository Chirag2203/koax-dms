import Link from 'next/link';

export default function CustomerNotFound() {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg-canvas px-6 py-24">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">404</p>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.25] text-ink-primary">
          Customer not found
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          This customer does not exist in the system.
        </p>
        <Link
          href="/customers"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          Back to Customers
        </Link>
      </div>
    </div>
  );
}
