'use client';

/**
 * OrgChart — CSS grid tree layout, no external lib.
 * SPEC-STAFF-001 §8.4, L26
 *
 * L26: Org chart is data-driven from StaffProfile.reportsTo field.
 *      Renders as CSS grid tree. Cycle detection — broken chain = root.
 *      Click node → detail panel slide-over.
 *
 * Layout strategy:
 *   1. Build adjacency list from staff array (children[managerId] = [staffId, ...])
 *   2. Detect roots (reportsTo === null or broken chain after cycle detection)
 *   3. Render recursively with indented nested divs
 *   4. Collapsed subtrees on click
 *
 * R02+ re-org: updateReportsTo action on store. FIXME: OQ-ROLE-1
 */
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Users, GitBranch } from 'lucide-react';
import { cn } from '@dms/ui';
import type { StaffProfile, StaffRoleCode } from '@dms/types';
import { hasRank } from '@dms/types';
import { useStaffStore } from '@/src/lib/staff/staff-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrgChartProps {
  staff: StaffProfile[];
  viewerRole: StaffRoleCode;
}

interface OrgNode {
  profile: StaffProfile;
  children: OrgNode[];
  depth: number;
}

// ─── Build tree (L26 — cycle detection) ──────────────────────────────────────

function buildTree(staff: StaffProfile[]): OrgNode[] {
  const byId = new Map<string, StaffProfile>(staff.map((s) => [s.id, s]));
  const childrenOf = new Map<string | null, string[]>();

  // DFS cycle detection: returns true if staffId is part of a reporting cycle
  function hasCycle(id: string, visited = new Set<string>()): boolean {
    if (visited.has(id)) return true;
    visited.add(id);
    const p = byId.get(id);
    if (!p?.reportsTo) return false;
    return hasCycle(p.reportsTo, visited);
  }

  for (const s of staff) {
    // L26: Broken chain or cycle → treat as root
    const managerId =
      s.reportsTo && byId.has(s.reportsTo) && !hasCycle(s.id)
        ? s.reportsTo
        : null;
    const siblings = childrenOf.get(managerId) ?? [];
    siblings.push(s.id);
    childrenOf.set(managerId, siblings);
  }

  function buildNode(id: string, depth: number): OrgNode {
    const profile = byId.get(id)!;
    const childIds = childrenOf.get(id) ?? [];
    return {
      profile,
      children: childIds.map((cid) => buildNode(cid, depth + 1)),
      depth,
    };
  }

  return (childrenOf.get(null) ?? []).map((id) => buildNode(id, 0));
}

// ─── Status dot ───────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  ON_LEAVE: 'bg-warning',
  EXITED: 'bg-ink-muted',
  ONBOARDING: 'bg-accent',
};

// ─── Node component ───────────────────────────────────────────────────────────

function OrgTreeNode({
  node,
  selectedId,
  onSelect,
}: {
  node: OrgNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = node;
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === profile.id;

  return (
    <div>
      <div className="flex items-center gap-2 py-1">
        {/* Expand/collapse */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          disabled={!hasChildren}
          aria-label={
            hasChildren
              ? collapsed
                ? `Expand ${profile.name}'s team`
                : `Collapse ${profile.name}'s team`
              : undefined
          }
          className={cn(
            'w-4 h-4 flex items-center justify-center text-ink-muted flex-shrink-0',
            hasChildren
              ? 'hover:text-ink-primary cursor-pointer focus-visible:outline-none'
              : 'opacity-0 cursor-default pointer-events-none',
          )}
        >
          {hasChildren && (
            collapsed
              ? <ChevronRight size={12} aria-hidden="true" />
              : <ChevronDown size={12} aria-hidden="true" />
          )}
        </button>

        {/* Node card */}
        <button
          type="button"
          onClick={() => onSelect(profile.id)}
          aria-label={`Select ${profile.name}`}
          aria-pressed={isSelected}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors duration-100 text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
            isSelected
              ? 'bg-accent/10 border-accent/30'
              : 'bg-bg-surface border-line hover:border-accent/20 hover:bg-bg-hover',
          )}
        >
          <span
            className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center font-mono text-[11px] font-semibold text-accent uppercase flex-shrink-0"
            aria-hidden="true"
          >
            {profile.avatar}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ink-primary leading-tight truncate max-w-[160px]">
              {profile.name}
            </p>
            <p className="text-[11px] text-ink-secondary truncate max-w-[160px]">
              <span className="font-mono">{profile.role}</span>
              {' — '}
              {profile.roleName}
            </p>
          </div>
          <span
            className={cn('w-2 h-2 rounded-full flex-shrink-0 ml-1', STATUS_DOT[profile.status] ?? 'bg-ink-muted')}
            aria-label={`Status: ${profile.status}`}
          />
        </button>

        {hasChildren && (
          <span className="text-[10px] font-mono text-ink-muted">
            {node.children.length} direct
          </span>
        )}
      </div>

      {/* Children (indented) */}
      {!collapsed && hasChildren && (
        <div className="ml-8 border-l border-line pl-3 space-y-0">
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.profile.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Detail slide-over panel ──────────────────────────────────────────────────

const OUTLET_LABEL: Record<string, string> = {
  bangalore: 'BLR', mumbai: 'MUM', chennai: 'CHE', all: 'ALL',
};

function DetailPanel({
  staff,
  onClose,
  onReOrg,
  canReOrg,
}: {
  staff: StaffProfile;
  onClose: () => void;
  onReOrg: () => void;
  canReOrg: boolean;
}) {
  return (
    <aside
      role="complementary"
      aria-label={`${staff.name} detail`}
      className="w-72 border-l border-line bg-bg-surface flex flex-col flex-shrink-0"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="text-[13px] font-semibold text-ink-primary">Staff Detail</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="text-ink-muted hover:text-ink-primary focus-visible:outline-none p-1"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center font-mono text-[15px] font-semibold text-accent uppercase"
            aria-hidden="true"
          >
            {staff.avatar}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-ink-primary">{staff.name}</p>
            <p className="text-[12px] text-ink-secondary">{staff.roleName}</p>
          </div>
        </div>

        {[
          { label: 'Role', value: `${staff.role} — ${staff.roleName}` },
          { label: 'Department', value: staff.department },
          { label: 'Outlet', value: OUTLET_LABEL[staff.outlet] ?? staff.outlet },
          { label: 'Status', value: staff.status.replace('_', ' ') },
          { label: 'Start Date', value: staff.startDate },
          { label: 'Reports To', value: staff.reportsTo ?? 'None (root)' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start gap-3 mb-2.5">
            <span className="w-24 flex-shrink-0 text-[11px] text-ink-muted">{label}</span>
            <span className="text-[12px] text-ink-primary">{value}</span>
          </div>
        ))}

        <div className="flex items-start gap-3 mb-4">
          <span className="w-24 flex-shrink-0 text-[11px] text-ink-muted">DPDP</span>
          <span className={cn('text-[11px] font-medium', staff.dpdpConsentGiven ? 'text-success' : 'text-warning')}>
            {staff.dpdpConsentGiven ? 'Consent given' : 'Pending'}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-line space-y-2">
        {canReOrg && (
          <button
            type="button"
            onClick={onReOrg}
            className="w-full flex items-center justify-center gap-1.5 h-7 text-[12px] text-ink-secondary hover:text-ink-primary border border-line rounded-md transition-colors duration-100"
          >
            Change Manager
          </button>
        )}
        <Link
          href={`/staff/${staff.id}`}
          className="w-full flex items-center justify-center gap-1.5 h-8 text-[13px] font-medium bg-accent text-white rounded-md hover:bg-accent/90 transition-colors duration-100"
        >
          View Full Profile
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

// ─── Re-org dialog ────────────────────────────────────────────────────────────
// FIXME: OQ-ROLE-1 — re-org guard pending Doc 14 verification

function ReOrgDialog({
  targetStaff,
  allStaff,
  viewerRole,
  viewerId,
  onClose,
}: {
  targetStaff: StaffProfile;
  allStaff: StaffProfile[];
  viewerRole: StaffRoleCode;
  viewerId: string;
  onClose: () => void;
}) {
  const [newManagerId, setNewManagerId] = useState<string>(targetStaff.reportsTo ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateReportsTo = useStaffStore((s) => s.updateReportsTo);
  const candidates = allStaff.filter((s) => s.id !== targetStaff.id && s.status !== 'EXITED');

  function handleConfirm() {
    setError(null);
    const result = updateReportsTo(
      targetStaff.id,
      newManagerId || null,
      reason,
      { id: viewerId, role: viewerRole },
    );
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? 'Re-org failed.');
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reorg-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-bg-surface border border-line rounded-xl shadow-3 w-full max-w-md mx-4 p-6">
        <h2 id="reorg-title" className="text-[16px] font-semibold text-ink-primary mb-1">
          Change Manager
        </h2>
        <p className="text-[13px] text-ink-muted mb-4">
          Re-org: <strong className="text-ink-primary">{targetStaff.name}</strong>
        </p>

        <div className="mb-4">
          <label htmlFor="new-manager-select" className="block text-[12px] text-ink-muted mb-1.5">
            New Manager
          </label>
          <select
            id="new-manager-select"
            value={newManagerId}
            onChange={(e) => setNewManagerId(e.target.value)}
            className="w-full h-9 px-3 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">No manager (root)</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.role} — {c.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="reorg-reason" className="block text-[12px] text-ink-muted mb-1.5">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            id="reorg-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for re-org (min 5 characters)..."
            className="w-full px-3 py-2 text-[13px] bg-bg-subtle border border-line rounded-md text-ink-primary placeholder:text-ink-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && (
          <p className="mb-3 text-[12px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        <p className="text-[11px] text-ink-muted mb-4">
          {/* FIXME: OQ-ROLE-1 */}
          Emits REPORTS_TO_CHANGED event (L13). Cycle detection active (L26, DFS).
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-8 text-[13px] text-ink-secondary hover:text-ink-primary border border-line rounded-md"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 h-8 text-[13px] font-medium bg-accent text-white rounded-md hover:bg-accent/90"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main OrgChart component ──────────────────────────────────────────────────

export function OrgChart({ staff, viewerRole }: OrgChartProps) {
  const { user } = useStaffAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reOrgTarget, setReOrgTarget] = useState<StaffProfile | null>(null);

  const canReOrg = hasRank(viewerRole, 'R02');
  const tree = useMemo(() => buildTree(staff), [staff]);
  const selectedProfile = selectedId ? staff.find((s) => s.id === selectedId) ?? null : null;

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Users size={32} className="text-ink-muted opacity-40" aria-hidden="true" />
        <p className="text-[14px] text-ink-muted">No staff to display.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tree panel */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={16} className="text-ink-muted" aria-hidden="true" />
          <h2 className="text-[14px] font-semibold text-ink-primary">Organisation Chart</h2>
          <span className="font-mono text-[11px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
            {staff.length}
          </span>
        </div>

        {tree.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No root nodes found.</p>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <OrgTreeNode
                key={node.profile.id}
                node={node}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel (slide-over) */}
      {selectedProfile && (
        <DetailPanel
          staff={selectedProfile}
          onClose={() => setSelectedId(null)}
          onReOrg={() => setReOrgTarget(selectedProfile)}
          canReOrg={canReOrg}
        />
      )}

      {/* Re-org dialog */}
      {reOrgTarget && user && (
        <ReOrgDialog
          targetStaff={reOrgTarget}
          allStaff={staff}
          viewerRole={viewerRole}
          viewerId={user.id}
          onClose={() => setReOrgTarget(null)}
        />
      )}
    </div>
  );
}
