'use client';

/**
 * Attendance tab — SPEC-STAFF-001 §P3
 *
 * L17: Fingerprint webhook (HMAC-SHA256 + ±5min replay + ±60s dedup).
 * L30: Late = first punch-in > 09:30 AM; half-day = total hours < 4.
 * L31: Thresholds configurable in v1.5 via outlet settings.
 *
 * Manual override R12+ gate.
 * Sync status shows last device contact (demo: static "2 mins ago").
 */

import { useState } from 'react';
import { ChevronDown, RefreshCw, AlertCircle, Calendar, Clock } from 'lucide-react';
import type { StaffProfile, StaffRoleCode, AttendancePunch } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { computeDailyHours, classifyDay, computeMonthlySummary } from '@/src/lib/staff/attendance-math';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AttendanceTabProps {
  staff: StaffProfile;
  viewer: { role: string; id: string };
}

// ─── Primitives ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  present: 'bg-success',
  absent: 'bg-danger',
  'half-day': 'bg-warning',
  late: 'bg-warning/60',
};

const STATUS_LABEL: Record<string, string> = {
  present: 'Present',
  absent: 'Absent',
  'half-day': 'Half Day',
  late: 'Late',
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  present: 'text-success',
  absent: 'text-danger',
  'half-day': 'text-warning',
  late: 'text-warning',
};

const MONTH_OPTS = [
  { value: '4-2026', label: 'April 2026', month: 4, year: 2026 },
  { value: '3-2026', label: 'March 2026', month: 3, year: 2026 },
  { value: '2-2026', label: 'February 2026', month: 2, year: 2026 },
];

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Manual override dialog ───────────────────────────────────────────────────

interface OverrideDialogProps {
  staffId: string;
  date: string;
  existingPunches: AttendancePunch[];
  actor: { id: string; role: StaffRoleCode };
  onClose: () => void;
}

function OverrideDialog({ staffId, date, existingPunches, actor, onClose }: OverrideDialogProps) {
  const addAttendancePunch = useStaffStore((s) => s.addAttendancePunch);
  const [inTime, setInTime] = useState('09:00');
  const [outTime, setOutTime] = useState('18:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit() {
    if (reason.trim().length < 5) {
      setError('Reason must be at least 5 characters.');
      return;
    }

    const inPunch: AttendancePunch = {
      punchId: `punch-override-${Date.now()}-in`,
      staffId,
      deviceId: 'manual-override',
      eventType: 'punch-in',
      timestamp: `${date}T${inTime}:00.000Z`,
      isOverride: true,
      overrideBy: actor.id,
      overrideReason: reason.trim(),
    };

    const outPunch: AttendancePunch = {
      punchId: `punch-override-${Date.now()}-out`,
      staffId,
      deviceId: 'manual-override',
      eventType: 'punch-out',
      timestamp: `${date}T${outTime}:00.000Z`,
      isOverride: true,
      overrideBy: actor.id,
      overrideReason: reason.trim(),
    };

    const r1 = addAttendancePunch(inPunch, actor);
    const r2 = addAttendancePunch(outPunch, actor);

    if (!r1.success || !r2.success) {
      setError(r1.error ?? r2.error ?? 'Override failed.');
      return;
    }
    setSaved(true);
    setTimeout(onClose, 800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Manual punch override"
    >
      <div className="bg-bg-canvas border border-line rounded-2xl w-[420px] shadow-2xl">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-[15px] font-bold text-ink-primary">Manual Punch Override</h2>
          <p className="text-[12px] text-ink-muted mt-0.5">{date}</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          {saved ? (
            <p className="text-[13px] text-success font-medium">Override saved successfully.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-ink-muted mb-1" htmlFor="ov-in">
                    Punch In
                  </label>
                  <input
                    id="ov-in"
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="w-full h-9 px-3 text-[13px] bg-bg-subtle border border-line rounded-lg text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ink-muted mb-1" htmlFor="ov-out">
                    Punch Out
                  </label>
                  <input
                    id="ov-out"
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="w-full h-9 px-3 text-[13px] bg-bg-subtle border border-line rounded-lg text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink-muted mb-1" htmlFor="ov-reason">
                  Reason (required)
                </label>
                <textarea
                  id="ov-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Fingerprint device offline; confirmed from supervisor"
                  className="w-full px-3 py-2 text-[13px] bg-bg-subtle border border-line rounded-lg text-ink-primary resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {error && (
                <p className="text-[12px] text-danger flex items-center gap-1">
                  <AlertCircle size={12} aria-hidden="true" />
                  {error}
                </p>
              )}
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-ink-muted border border-line rounded-lg hover:text-ink-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cancel
          </button>
          {!saved && (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-[13px] font-medium bg-accent text-white rounded-lg hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Save Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day cell for calendar ────────────────────────────────────────────────────

interface DayCellProps {
  day: number;
  month: number;
  year: number;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'weekend';
  hours: number;
  isToday: boolean;
  canOverride: boolean;
  staffId: string;
  punches: AttendancePunch[];
  actor: { id: string; role: StaffRoleCode };
}

function DayCell({ day, month, year, status, hours, isToday, canOverride, staffId, punches, actor }: DayCellProps) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${year}-${mm}-${dd}`;

  if (status === 'weekend') {
    return (
      <div className="aspect-square flex items-center justify-center rounded-lg text-[12px] text-ink-muted bg-bg-subtle/40">
        {day}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        title={STATUS_LABEL[status] ?? status}
        aria-label={`${dateStr}: ${STATUS_LABEL[status] ?? status}${hours > 0 ? `, ${hours.toFixed(1)}h` : ''}`}
        onClick={() => setShowDetail((v) => !v)}
        className={[
          'aspect-square relative flex flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          isToday ? 'ring-2 ring-accent' : '',
          status === 'present' ? 'bg-success/10 text-success hover:bg-success/20' : '',
          status === 'absent' ? 'bg-danger/10 text-danger hover:bg-danger/20' : '',
          status === 'half-day' ? 'bg-warning/10 text-warning hover:bg-warning/20' : '',
          status === 'late' ? 'bg-warning/5 text-warning hover:bg-warning/10' : '',
        ].filter(Boolean).join(' ')}
      >
        <span>{day}</span>
        <span
          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${STATUS_COLOR[status] ?? 'bg-line'}`}
          aria-hidden="true"
        />
      </button>

      {showDetail && (
        <div className="col-span-7 mt-1 mb-2 px-4 py-3 rounded-xl border border-line bg-bg-surface text-[12px]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink-primary">{dateStr}</p>
              <p className={`${STATUS_TEXT_COLOR[status] ?? 'text-ink-muted'} mt-0.5`}>
                {STATUS_LABEL[status]}
                {hours > 0 && ` · ${hours.toFixed(1)} hrs`}
              </p>
              {punches.length > 0 && (
                <p className="text-ink-muted text-[11px] mt-0.5">
                  In: {new Date(punches.find((p) => p.eventType === 'punch-in')?.timestamp ?? '').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  Out: {new Date(punches.find((p) => p.eventType === 'punch-out')?.timestamp ?? '').toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {punches.some((p) => p.isOverride) && (
                <p className="text-[10px] text-accent mt-0.5">Manual override recorded</p>
              )}
            </div>
            {canOverride && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDetail(false); setOverrideOpen(true); }}
                className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-accent/10 text-accent border border-accent/25 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent whitespace-nowrap"
              >
                Manual Override
              </button>
            )}
          </div>
        </div>
      )}

      {overrideOpen && (
        <OverrideDialog
          staffId={staffId}
          date={dateStr}
          existingPunches={punches}
          actor={actor}
          onClose={() => setOverrideOpen(false)}
        />
      )}
    </>
  );
}

// ─── Attendance tab ───────────────────────────────────────────────────────────

export function AttendanceTab({ staff, viewer }: AttendanceTabProps) {
  const viewerRole = viewer.role as StaffRoleCode;
  // R12+ can override punches
  const canOverride = hasRank(viewerRole, 'R12');

  const [selectedPeriod, setSelectedPeriod] = useState('4-2026');
  const period = MONTH_OPTS.find((o) => o.value === selectedPeriod) ?? MONTH_OPTS[0]!;

  const selectAttendancePunches = useStaffStore((s) => s.selectAttendancePunches);
  const monthPunches = selectAttendancePunches(staff.id, period.year, period.month);

  // Build day-level map
  const byDay = new Map<string, AttendancePunch[]>();
  for (const p of monthPunches) {
    const d = p.timestamp.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(p);
  }

  const summary = computeMonthlySummary(staff.id, period.year, period.month, monthPunches);

  // Build calendar grid (use UTC to avoid timezone-related day-of-week drift)
  const daysInMonth = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  const firstDow = new Date(Date.UTC(period.year, period.month - 1, 1)).getUTCDay();  // 0=Sun

  // Build padded day array (null for empty cells)
  const calDays: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);
  while (calDays.length % 7 !== 0) calDays.push(null);

  const today = new Date();

  const actor = { id: viewer.id, role: viewerRole };

  return (
    <div className="py-4">
      {/* ─── Period selector + sync status ──────────────────────────────── */}
      <div className="flex items-center justify-between px-6 mb-5">
        <div className="relative">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="appearance-none h-9 pl-3 pr-8 text-[13px] bg-bg-canvas border border-line rounded-lg text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Select attendance month"
          >
            {MONTH_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" aria-hidden="true" />
        </div>

        {/* Sync status */}
        <div className="flex items-center gap-2 text-[12px] text-ink-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden="true" />
          <span>Last device sync: 2 mins ago</span>
          <button
            type="button"
            aria-label="Manual sync"
            className="p-1.5 rounded-lg border border-line hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <RefreshCw size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ─── Monthly Summary card ────────────────────────────────────────── */}
      <div className="px-6 mb-5">
        <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
          <div className="px-4 py-2.5 bg-bg-subtle">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
              Monthly Summary — {period.label}
            </p>
          </div>
          <div className="px-4 py-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: 'Working Days', value: summary.workingDays, icon: Calendar },
              { label: 'Present', value: summary.presentDays, color: 'text-success' },
              { label: 'Absent', value: summary.absentDays, color: 'text-danger' },
              { label: 'Half Days', value: summary.halfDays, color: 'text-warning' },
              { label: 'Late Marks', value: summary.lateMarks, color: 'text-warning' },
              { label: 'OT Hours', value: summary.overtimeHours.toFixed(1), icon: Clock },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-[20px] font-bold ${stat.color ?? 'text-ink-primary'}`}>
                  {stat.value}
                </p>
                <p className="text-[10px] text-ink-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Calendar legend ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 mb-3">
        {[
          { label: 'Present', color: 'bg-success' },
          { label: 'Absent', color: 'bg-danger' },
          { label: 'Half Day', color: 'bg-warning' },
          { label: 'Late', color: 'bg-warning/60' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span className={`w-2 h-2 rounded-full ${item.color}`} aria-hidden="true" />
            {item.label}
          </div>
        ))}
      </div>

      {/* ─── Calendar grid ───────────────────────────────────────────────── */}
      <div className="px-6 mb-5">
        <div className="rounded-xl border border-line overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 bg-bg-subtle">
            {DOW_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold text-ink-muted">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1 p-3">
            {calDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} aria-hidden="true" />;
              }
              const dow = new Date(Date.UTC(period.year, period.month - 1, day)).getUTCDay();
              const isWeekend = dow === 0 || dow === 6;
              const mm = String(period.month).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const dateKey = `${period.year}-${mm}-${dd}`;
              const dayPunches = byDay.get(dateKey) ?? [];
              const status = isWeekend ? 'weekend' : classifyDay(dayPunches);
              const hours = isWeekend ? 0 : computeDailyHours(dayPunches);
              const isToday =
                today.getFullYear() === period.year &&
                today.getMonth() + 1 === period.month &&
                today.getDate() === day;

              return (
                <DayCell
                  key={day}
                  day={day}
                  month={period.month}
                  year={period.year}
                  status={status as 'present' | 'absent' | 'half-day' | 'late' | 'weekend'}
                  hours={hours}
                  isToday={isToday}
                  canOverride={canOverride}
                  staffId={staff.id}
                  punches={dayPunches}
                  actor={actor}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Daily Punch Records table ───────────────────────────────────── */}
      <div className="px-6 mb-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
          Daily Punch Records
        </h2>
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-bg-subtle">
                <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Punch In</th>
                <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Punch Out</th>
                <th className="text-right px-4 py-2.5 font-semibold text-ink-muted">Hours</th>
                <th className="text-left px-4 py-2.5 font-semibold text-ink-muted">Status</th>
                {canOverride && (
                  <th className="px-4 py-2.5 font-semibold text-ink-muted text-center">Override</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows: React.ReactNode[] = [];
                for (let d = 1; d <= daysInMonth; d++) {
                  const dow = new Date(Date.UTC(period.year, period.month - 1, d)).getUTCDay();
                  if (dow === 0 || dow === 6) continue;
                  const mm = String(period.month).padStart(2, '0');
                  const dd = String(d).padStart(2, '0');
                  const dateKey = `${period.year}-${mm}-${dd}`;
                  const dayPunches = byDay.get(dateKey) ?? [];
                  const status = classifyDay(dayPunches);
                  const hours = computeDailyHours(dayPunches);
                  const inPunch = dayPunches.find((p) => p.eventType === 'punch-in');
                  const outPunch = dayPunches.find((p) => p.eventType === 'punch-out');
                  const hasOverride = dayPunches.some((p) => p.isOverride);

                  rows.push(
                    <tr key={dateKey} className="border-t border-line">
                      <td className="px-4 py-2.5 font-mono text-ink-primary">{dateKey}</td>
                      <td className="px-4 py-2.5 text-ink-primary">
                        {inPunch
                          ? new Date(inPunch.timestamp).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-ink-primary">
                        {outPunch
                          ? new Date(outPunch.timestamp).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-primary">
                        {hours > 0 ? hours.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[11px] font-medium ${STATUS_TEXT_COLOR[status] ?? 'text-ink-muted'}`}>
                          {STATUS_LABEL[status] ?? status}
                          {hasOverride && (
                            <span className="ml-1 text-[10px] text-accent">(override)</span>
                          )}
                        </span>
                      </td>
                      {canOverride && (
                        <td className="px-4 py-2.5 text-center">
                          {/* Override button rendered per row; opens from day detail */}
                          <span className="text-[10px] text-ink-muted">Click day →</span>
                        </td>
                      )}
                    </tr>,
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>
        {canOverride && (
          <p className="mt-2 text-[11px] text-ink-muted">
            Click a calendar day to open the manual override dialog. R12+ authority required (L17).
          </p>
        )}
      </div>
    </div>
  );
}
