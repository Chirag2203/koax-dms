'use client';

/**
 * StaffTable — dense table view for staff directory.
 * SPEC-STAFF-001 §8.1
 */
import Link from 'next/link';
import type { StaffProfile } from '@dms/types';

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-success',
  ON_LEAVE: 'text-warning',
  EXITED: 'text-ink-muted',
  ONBOARDING: 'text-accent',
};

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'BLR',
  mumbai: 'MUM',
  chennai: 'CHE',
  all: 'ALL',
};

interface StaffTableProps {
  staff: StaffProfile[];
}

export function StaffTable({ staff }: StaffTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full text-[13px]" role="table" aria-label="Staff directory">
        <thead>
          <tr className="border-b border-line bg-bg-subtle">
            <th scope="col" className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Staff
            </th>
            <th scope="col" className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Role
            </th>
            <th scope="col" className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Department
            </th>
            <th scope="col" className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Outlet
            </th>
            <th scope="col" className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Status
            </th>
            <th scope="col" className="text-left px-4 py-3 text-[11px] font-medium uppercase tracking-widest text-ink-muted">
              Start Date
            </th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr
              key={s.id}
              className="border-b border-line last:border-0 hover:bg-bg-hover transition-colors duration-100"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/staff/${s.id}`}
                  className="flex items-center gap-3 group focus-visible:outline-none"
                  aria-label={`View ${s.name}'s profile`}
                >
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center font-mono text-[10px] font-semibold text-accent uppercase"
                    aria-hidden="true"
                  >
                    {s.avatar}
                  </span>
                  <div>
                    <p className="text-ink-primary font-medium group-hover:text-accent transition-colors duration-100 leading-tight">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-ink-muted">{s.email}</p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-ink-muted">{s.role}</span>
                  <span className="text-ink-secondary">{s.roleName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-ink-secondary">{s.department}</td>
              <td className="px-4 py-3">
                <span className="font-mono text-[11px] text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase">
                  {OUTLET_LABEL[s.outlet] ?? s.outlet}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-[12px] font-medium ${STATUS_COLOR[s.status] ?? 'text-ink-muted'}`}>
                  {s.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-muted">{s.startDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
