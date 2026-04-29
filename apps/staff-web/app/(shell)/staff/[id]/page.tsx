'use client';

/**
 * /staff/[id] — Staff Detail
 * SPEC-STAFF-001 §8.2
 *
 * Tabs:
 * - Profile (shipped)
 * - Roles & Permissions (shipped)
 * - Salary (shipped)
 * - Attendance (shipped)
 * - Leaves (shipped)
 * - Efficiency (shipped)
 * - Exit (shipped — S8 exit workflow + F&F)
 */
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ChevronRight, LogOut } from 'lucide-react';
import type { StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import { ProfileTab } from '@/src/components/staff/detail/profile-tab';
import { RolesTab } from '@/src/components/staff/detail/roles-tab';
import { SalaryTab } from '@/src/components/staff/detail/salary-tab';
import { AttendanceTab } from '@/src/components/staff/detail/attendance-tab';
import { LeavesTab } from '@/src/components/staff/detail/leaves-tab';
import { EfficiencyTab } from '@/src/components/staff/detail/efficiency-tab';
import { ExitTab } from '@/src/components/staff/detail/exit-tab';

type TabId = 'profile' | 'roles' | 'salary' | 'attendance' | 'leaves' | 'efficiency' | 'exit';

const TABS: { id: TabId; label: string; icon?: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'salary', label: 'Salary' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leaves', label: 'Leaves' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'exit', label: 'Exit', icon: <LogOut size={13} aria-hidden="true" /> },
];

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'BLR', mumbai: 'MUM', chennai: 'CHE', all: 'ALL',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-success', ON_LEAVE: 'text-warning',
  EXITED: 'text-ink-muted', ONBOARDING: 'text-accent',
};

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = params.id as string;
  const { user } = useStaffAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const hydrated = useStaffStore((s) => s.hydrated);
  const selectStaffById = useStaffStore((s) => s.selectStaffById);
  const staff = selectStaffById(staffId);

  // ─── Auth guard ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ink-muted text-sm">Sign in required.</p>
      </div>
    );
  }

  // Self-service: any staff can view own profile
  const isSelf = user.id === staffId;
  const canView =
    isSelf ||
    hasRank(user.role as StaffRoleCode, 'R09') ||
    (user.outlet !== 'all' && staff?.outlet === user.outlet);

  if (!hydrated) {
    return (
      <div className="px-6 py-4">
        <div className="h-32 rounded-xl bg-bg-subtle animate-pulse" aria-label="Loading" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-warning" aria-hidden="true" />
        <p className="text-ink-muted text-sm">Staff member not found.</p>
        <Link href="/staff" className="text-accent text-sm underline">
          Back to Staff Directory
        </Link>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={28} className="text-warning" aria-hidden="true" />
        <p className="text-ink-muted text-sm">
          You do not have permission to view this staff profile.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-surface="staff">
      {/* ─── Breadcrumb ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-6 py-3 border-b border-line text-[12px] text-ink-muted flex-shrink-0">
        <Link href="/staff" className="hover:text-accent transition-colors duration-100">
          Staff
        </Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="text-ink-primary">{staff.name}</span>
      </div>

      {/* ─── Staff Header ────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-line flex-shrink-0">
        <div className="flex items-center gap-4">
          <span
            className="flex-shrink-0 w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center font-mono text-[18px] font-semibold text-accent uppercase"
            aria-hidden="true"
          >
            {staff.avatar}
          </span>
          <div>
            <h1 className="text-[20px] font-bold text-ink-primary">{staff.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-[11px] text-ink-muted bg-bg-subtle px-1.5 py-0.5 rounded">
                {staff.role}
              </span>
              <span className="text-[13px] text-ink-secondary">{staff.roleName}</span>
              <span className="text-ink-muted text-[13px]">·</span>
              <span className="font-mono text-[11px] text-accent bg-accent/10 px-1.5 py-0.5 rounded uppercase">
                {OUTLET_LABEL[staff.outlet] ?? staff.outlet}
              </span>
              <span className="text-[12px] font-medium ml-1">
                <span className={STATUS_COLOR[staff.status] ?? 'text-ink-muted'}>
                  {staff.status.replace('_', ' ')}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab bar ─────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Staff profile sections"
        className="flex items-center px-6 border-b border-line overflow-x-auto scrollbar-none flex-shrink-0"
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
                active
                  ? 'border-accent text-ink-primary'
                  : 'border-transparent text-ink-muted hover:text-ink-secondary hover:border-line',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── Tab content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'profile' && (
          <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile">
            <ProfileTab staff={staff} viewer={user} />
          </div>
        )}
        {activeTab === 'roles' && (
          <div role="tabpanel" id="panel-roles" aria-labelledby="tab-roles">
            <RolesTab staff={staff} viewer={user} staffId={staffId} />
          </div>
        )}
        {activeTab === 'salary' && (
          <div role="tabpanel" id="panel-salary" aria-labelledby="tab-salary">
            <SalaryTab staff={staff} viewer={user} />
          </div>
        )}
        {activeTab === 'attendance' && (
          <div role="tabpanel" id="panel-attendance" aria-labelledby="tab-attendance">
            <AttendanceTab staff={staff} viewer={user} />
          </div>
        )}
        {activeTab === 'leaves' && (
          <div role="tabpanel" id="panel-leaves" aria-labelledby="tab-leaves">
            <LeavesTab staff={staff} viewer={user} />
          </div>
        )}
        {activeTab === 'efficiency' && (
          <div role="tabpanel" id="panel-efficiency" aria-labelledby="tab-efficiency">
            <EfficiencyTab staff={staff} />
          </div>
        )}
        {activeTab === 'exit' && (
          <div role="tabpanel" id="panel-exit" aria-labelledby="tab-exit">
            <ExitTab staff={staff} viewer={user} />
          </div>
        )}
      </div>
    </div>
  );
}
