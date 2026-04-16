'use client';

export function PortalSkeleton() {
  return (
    <div className="flex min-h-screen bg-surface-primary">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex w-60 flex-col border-r border-border-primary bg-surface-primary shrink-0">
        {/* Wordmark */}
        <div className="px-6 pt-8 pb-6 border-b border-border-primary">
          <div className="h-4 w-32 rounded bg-surface-secondary animate-pulse" />
          <div className="h-3 w-20 rounded bg-surface-secondary animate-pulse mt-2" />
        </div>
        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded"
            >
              <div className="h-4 w-4 rounded bg-surface-secondary animate-pulse" />
              <div className="h-3 w-20 rounded bg-surface-secondary animate-pulse" />
            </div>
          ))}
        </nav>
        {/* Sign out */}
        <div className="px-3 pb-6">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-4 w-4 rounded bg-surface-secondary animate-pulse" />
            <div className="h-3 w-16 rounded bg-surface-secondary animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page heading */}
          <div className="space-y-2">
            <div className="h-8 w-64 rounded bg-surface-secondary animate-pulse" />
            <div className="h-4 w-80 rounded bg-surface-secondary animate-pulse" />
          </div>
          {/* Card grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-lg bg-surface-secondary animate-pulse"
              />
            ))}
          </div>
          {/* List items */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-surface-secondary animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>

      {/* Mobile bottom tab skeleton */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-primary border-t border-border-primary flex items-center justify-around px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-5 w-5 rounded bg-surface-secondary animate-pulse" />
            <div className="h-2 w-10 rounded bg-surface-secondary animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
