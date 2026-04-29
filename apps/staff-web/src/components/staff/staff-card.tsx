'use client';

/**
 * StaffCard — compact profile card for directory grid view.
 * SPEC-STAFF-001 §8.1
 */
import Link from 'next/link';
import type { StaffProfile } from '@dms/types';

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  ON_LEAVE: 'bg-warning',
  EXITED: 'bg-ink-muted',
  ONBOARDING: 'bg-accent',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  ON_LEAVE: 'On Leave',
  EXITED: 'Exited',
  ONBOARDING: 'Onboarding',
};

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'BLR',
  mumbai: 'MUM',
  chennai: 'CHE',
  all: 'ALL',
};

interface StaffCardProps {
  staff: StaffProfile;
}

export function StaffCard({ staff }: StaffCardProps) {
  return (
    <Link
      href={`/staff/${staff.id}`}
      className="block bg-bg-surface border border-line rounded-xl p-4 hover:border-accent/40 hover:bg-bg-hover transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
      aria-label={`View profile: ${staff.name}, ${staff.roleName}`}
    >
      {/* Avatar + status */}
      <div className="flex items-start justify-between mb-3">
        <div className="relative">
          <span
            className="flex w-10 h-10 rounded-full bg-accent/20 items-center justify-center font-mono text-[13px] font-semibold text-accent uppercase"
            aria-hidden="true"
          >
            {staff.avatar}
          </span>
          {/* Status dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-surface ${STATUS_DOT[staff.status] ?? 'bg-ink-muted'}`}
            aria-label={`Status: ${STATUS_LABEL[staff.status] ?? staff.status}`}
          />
        </div>

        {/* Outlet chip */}
        <span className="font-mono text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase tracking-widest">
          {OUTLET_LABEL[staff.outlet] ?? staff.outlet}
        </span>
      </div>

      {/* Name + role */}
      <div className="mb-2">
        <p className="text-[14px] font-semibold text-ink-primary leading-snug truncate">
          {staff.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="font-mono text-[10px] text-ink-muted">{staff.role}</span>
          <span className="text-ink-muted text-[10px]">·</span>
          <span className="text-[12px] text-ink-secondary truncate">{staff.roleName}</span>
        </div>
      </div>

      {/* Department + status */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[11px] text-ink-muted bg-bg-subtle px-2 py-0.5 rounded">
          {staff.department}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-ink-muted">
          <span
            className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[staff.status] ?? 'bg-ink-muted'}`}
            aria-hidden="true"
          />
          {STATUS_LABEL[staff.status] ?? staff.status}
        </span>
      </div>
    </Link>
  );
}
