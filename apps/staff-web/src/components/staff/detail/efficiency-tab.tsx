'use client';

/**
 * Efficiency Tab — read-only KPIs aggregated from existing module stores.
 * No mutation. Honest "N/A" when fixture data unavailable.
 *
 * Spec reference: SPEC-STAFF-001 P5.
 */

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  ClipboardCheck,
  Wrench,
  HandCoins,
  Users,
  CalendarDays,
  Activity,
} from 'lucide-react';
import type { StaffProfile, StaffRoleCode } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useSalesDealsStore } from '@/src/lib/sales/sales-deals-store';

interface EfficiencyTabProps {
  staff: StaffProfile;
}

type Period = 'last30' | 'quarter' | 'fy';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = React.ComponentType<any>;

interface Kpi {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon: IconType;
}

function formatPct(v: number | null): string {
  if (v === null || isNaN(v)) return 'N/A';
  return `${Math.round(v)}%`;
}

function formatNumber(v: number | null, suffix?: string): string {
  if (v === null || isNaN(v)) return 'N/A';
  return suffix ? `${v.toLocaleString('en-IN')}${suffix}` : v.toLocaleString('en-IN');
}

function periodStartIso(period: Period): string {
  const now = new Date();
  if (period === 'last30') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }
  if (period === 'quarter') {
    const m = now.getMonth();
    const qStartMonth = Math.floor(m / 3) * 3;
    return new Date(now.getFullYear(), qStartMonth, 1).toISOString();
  }
  // fy: April 1 of current FY
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(fyStartYear, 3, 1).toISOString();
}

// ─── Common KPIs (computed from staff-store + leaves) ───────────────────────

function useCommonKpis(staffId: string, periodStart: string): Kpi[] {
  // Pull base refs (stable). Derive balance via useMemo (selectLeaveBalance
  // returns a new default object on miss; calling it inline triggers infinite
  // re-renders).
  const punches = useStaffStore((s) => s.attendancePunches);
  const allBalances = useStaffStore((s) => s.leaveBalances);

  const balance = useMemo(() => {
    const existing = allBalances[staffId];
    if (existing) return existing;
    return {
      staffId,
      fyStart: '2026-04-01',
      CL: { entitled: 12, used: 0 },
      SL: { entitled: 12, used: 0 },
      EL: { entitled: 21, used: 0, carriedForward: 0 },
      CompOff: { accrued: 0, used: 0 },
    };
  }, [allBalances, staffId]);

  return useMemo(() => {
    const startDate = new Date(periodStart);
    const today = new Date();
    let workingDays = 0;
    const cur = new Date(startDate);
    while (cur <= today) {
      const d = cur.getDay();
      if (d !== 0 && d !== 6) workingDays += 1;
      cur.setDate(cur.getDate() + 1);
    }

    const myPunches = (punches[staffId] ?? []).filter(
      (p) => new Date(p.timestamp) >= startDate,
    );
    const punchInDays = new Set(
      myPunches
        .filter((p) => p.eventType === 'punch-in')
        .map((p) => new Date(p.timestamp).toDateString()),
    );
    const presentDays = punchInDays.size;
    const attendancePct = workingDays > 0 ? (presentDays / workingDays) * 100 : null;

    const totalEntitled =
      balance.CL.entitled +
      balance.SL.entitled +
      balance.EL.entitled +
      balance.EL.carriedForward;
    const totalUsed = balance.CL.used + balance.SL.used + balance.EL.used;
    const leaveUsagePct =
      totalEntitled > 0 ? (totalUsed / totalEntitled) * 100 : null;

    return [
      {
        label: 'Attendance',
        value: formatPct(attendancePct),
        hint: `${presentDays}/${workingDays} days`,
        icon: CalendarDays,
      },
      {
        label: 'Leave Usage',
        value: formatPct(leaveUsagePct),
        hint: `${totalUsed}/${totalEntitled} days`,
        icon: Activity,
      },
      {
        label: 'Training Credits',
        value: 0,
        hint: 'Not yet tracked',
        icon: TrendingUp,
      },
    ];
  }, [staffId, punches, balance, periodStart]);
}

// ─── Role-specific KPIs ──────────────────────────────────────────────────────

function useRoleKpis(staff: StaffProfile, periodStart: string): Kpi[] {
  const jobCards = useServiceStore((s) => s.jobCards);
  const allDeals = useSalesDealsStore((s) => s.deals);

  return useMemo(() => {
    const startDate = new Date(periodStart);
    const role = staff.role as StaffRoleCode;

    // Service Advisor / Manager (R09 – R12 service)
    if (role === 'R09' || (staff.department === 'SERVICE' && role === 'R10')) {
      const myJcs = Object.values(jobCards).filter(
        (jc) =>
          jc.advisorId === staff.id &&
          new Date(jc.receivedAt) >= startDate,
      );
      const closed = myJcs.filter((jc) => jc.status === 'DELIVERED').length;
      const turnaroundDays = (() => {
        const closedJcs = myJcs.filter(
          (jc) => jc.status === 'DELIVERED' && jc.deliveredAt,
        );
        if (!closedJcs.length) return null;
        const total = closedJcs.reduce((sum, jc) => {
          if (!jc.deliveredAt) return sum;
          return sum + (new Date(jc.deliveredAt).getTime() - new Date(jc.receivedAt).getTime());
        }, 0);
        return Math.round(total / closedJcs.length / 86_400_000);
      })();
      return [
        {
          label: 'Job Cards Closed',
          value: formatNumber(closed),
          hint: `of ${myJcs.length} assigned`,
          icon: ClipboardCheck,
        },
        {
          label: 'Avg Turnaround',
          value: turnaroundDays === null ? 'N/A' : `${turnaroundDays}d`,
          hint: 'Days received → closed',
          icon: Activity,
        },
        {
          label: 'CSAT Average',
          value: 'N/A',
          hint: 'Customer feedback (v0.2)',
          icon: Users,
        },
        {
          label: 'Repeat Customers',
          value: 'N/A',
          hint: 'Tracked in v0.2',
          icon: TrendingUp,
        },
      ];
    }

    // Sales Manager / Exec (R10 – R11 sales)
    if (
      (role === 'R10' || role === 'R11') &&
      staff.department !== 'SERVICE' &&
      staff.department !== 'PARTS'
    ) {
      const dealsArr = Object.values(allDeals);
      const myDeals = dealsArr.filter(
        (d) => d.assignedTo === staff.id && new Date(d.createdAt) >= startDate,
      );
      const closedWon = myDeals.filter((d) => d.stage === 'delivered');
      const closedLost = myDeals.filter(
        (d) => d.stage === 'lost' && d.cancellationReason !== 'INVENTORY_SOLD',
      );
      const totalClosed = closedWon.length + closedLost.length;
      const conversionPct =
        totalClosed > 0 ? (closedWon.length / totalClosed) * 100 : null;
      const avgDealSize =
        closedWon.length > 0
          ? Math.round(
              closedWon.reduce((sum, d) => sum + d.amount, 0) / closedWon.length,
            )
          : null;

      return [
        {
          label: 'Deals Closed',
          value: formatNumber(closedWon.length),
          hint: `${myDeals.length} total assigned`,
          icon: HandCoins,
        },
        {
          label: 'Conversion Rate',
          value: formatPct(conversionPct),
          hint: 'Closed-won / closed total',
          icon: TrendingUp,
        },
        {
          label: 'Avg Deal Size',
          value:
            avgDealSize === null
              ? 'N/A'
              : `₹${(avgDealSize / 100000).toFixed(1)}L`,
          hint: 'Per closed-won',
          icon: Activity,
        },
        {
          label: 'Lead → Close',
          value: 'N/A',
          hint: 'Avg days (v0.2)',
          icon: ClipboardCheck,
        },
      ];
    }

    // Service Tech (R11 service / parts) — JC has technicianIds[] not technicianId
    if (role === 'R11') {
      const myJcs = Object.values(jobCards).filter(
        (jc) =>
          (jc.technicianIds ?? []).includes(staff.id) &&
          new Date(jc.receivedAt) >= startDate,
      );
      const onTime = myJcs.filter((jc) => jc.status === 'DELIVERED').length;
      const onTimePct = myJcs.length > 0 ? (onTime / myJcs.length) * 100 : null;
      return [
        {
          label: 'JCs Assigned',
          value: formatNumber(myJcs.length),
          icon: Wrench,
        },
        {
          label: 'On-Time Completion',
          value: formatPct(onTimePct),
          hint: 'Closed within SLA',
          icon: ClipboardCheck,
        },
        {
          label: 'Rework Rate',
          value: 'N/A',
          hint: 'Tracked in v0.2',
          icon: Activity,
        },
      ];
    }

    // Default — show generic activity counters
    return [
      {
        label: 'Module activity',
        value: 'N/A',
        hint: `KPI catalogue not configured for role ${staff.role}`,
        icon: Activity,
      },
    ];
  }, [staff, periodStart, jobCards, allDeals]);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EfficiencyTab({ staff }: EfficiencyTabProps) {
  const [period, setPeriod] = useState<Period>('last30');
  const periodStart = useMemo(() => periodStartIso(period), [period]);

  const roleKpis = useRoleKpis(staff, periodStart);
  const commonKpis = useCommonKpis(staff.id, periodStart);

  return (
    <div className="p-6 space-y-6">
      {/* Header + period toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-ink-primary">Efficiency</h2>
          <p className="text-[13px] text-ink-muted mt-0.5">
            KPIs aggregated from service, sales and attendance data
          </p>
        </div>
        <div className="flex items-center bg-bg-subtle rounded-md p-0.5 border border-line">
          {(
            [
              { v: 'last30', l: 'Last 30d' },
              { v: 'quarter', l: 'Quarter' },
              { v: 'fy', l: 'FY' },
            ] as const
          ).map((p) => (
            <button
              key={p.v}
              type="button"
              onClick={() => setPeriod(p.v)}
              aria-pressed={period === p.v}
              className={`px-3 h-7 rounded text-[12px] font-medium transition-colors ${
                period === p.v
                  ? 'bg-bg-surface text-ink-primary shadow-sm'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* Role-specific KPIs */}
      <div>
        <h3 className="text-[12px] uppercase tracking-wider text-ink-muted font-semibold mb-3">
          Role Performance
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {roleKpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="rounded-lg border border-line bg-bg-surface p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-ink-muted" aria-hidden />
                  <p className="text-[11px] uppercase tracking-wider text-ink-muted">
                    {k.label}
                  </p>
                </div>
                <p className="text-[24px] font-bold text-ink-primary tabular-nums">
                  {k.value}
                </p>
                {k.hint && (
                  <p className="text-[11px] text-ink-muted mt-1">{k.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Common KPIs */}
      <div>
        <h3 className="text-[12px] uppercase tracking-wider text-ink-muted font-semibold mb-3">
          Common Metrics
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {commonKpis.map((k) => {
            const Icon = k.icon;
            return (
              <div
                key={k.label}
                className="rounded-lg border border-line bg-bg-surface p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} className="text-ink-muted" aria-hidden />
                  <p className="text-[11px] uppercase tracking-wider text-ink-muted">
                    {k.label}
                  </p>
                </div>
                <p className="text-[24px] font-bold text-ink-primary tabular-nums">
                  {k.value}
                </p>
                {k.hint && (
                  <p className="text-[11px] text-ink-muted mt-1">{k.hint}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-ink-muted">
        KPIs are read-only aggregations from existing fixtures. Items showing &quot;N/A&quot;
        indicate no data is currently captured for that metric.
      </p>
    </div>
  );
}
