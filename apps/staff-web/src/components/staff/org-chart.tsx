'use client';

/**
 * OrgChart — horizontal tree layout (top-down, parent → children below).
 * SPEC-STAFF-001 §8.4, L26
 *
 * L26: Org chart is data-driven from StaffProfile.reportsTo field.
 *      Renders as a classic horizontal org chart with connector lines.
 *      Cycle detection — broken chain = root.
 *      Click node → detail panel slide-over.
 *      Click chevron → collapse/expand subtree.
 *
 * Layout strategy:
 *   1. Build adjacency list from staff array (children[managerId] = [staffId, ...])
 *   2. Detect roots (reportsTo === null or broken chain after cycle detection)
 *   3. Render as nested <ul> with `.org-tree` / `.org-tree-children` /
 *      `.org-tree-node` classes (defined in app/globals.css). Connector lines
 *      are drawn via CSS pseudo-elements (T-junction above each node + vertical
 *      drop from parent).
 *   4. Horizontally-scrollable wrapper — wide org charts overflow right.
 *
 * R02+ re-org: updateReportsTo action on store. FIXME: OQ-ROLE-1
 */
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronDown,
  Users,
  GitBranch,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
} from 'lucide-react';
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
    <li className="org-tree-node">
      {/* Card — clickable */}
      <div className="relative inline-flex items-stretch">
        <button
          type="button"
          onClick={() => onSelect(profile.id)}
          aria-label={`Select ${profile.name}`}
          aria-pressed={isSelected}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md border transition-colors duration-100 text-left min-w-[200px]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
            isSelected
              ? 'bg-accent/10 border-accent/30'
              : 'bg-bg-surface border-line hover:border-accent/30 hover:bg-bg-subtle',
          )}
        >
          <span
            className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center font-mono text-xs font-semibold text-accent uppercase flex-shrink-0"
            aria-hidden="true"
          >
            {profile.avatar}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-primary leading-tight truncate max-w-[160px]">
              {profile.name}
            </p>
            <p className="text-xs text-ink-secondary truncate max-w-[160px]">
              <span className="font-mono">{profile.role}</span>
              {' — '}
              {profile.roleName}
            </p>
          </div>
          <span
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0 ml-1',
              STATUS_DOT[profile.status] ?? 'bg-ink-muted',
            )}
            aria-label={`Status: ${profile.status}`}
          />
        </button>

        {/* Collapse/expand chevron — sits OUTSIDE the card, below it */}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={
              collapsed
                ? `Expand ${profile.name}'s team (${node.children.length} direct reports)`
                : `Collapse ${profile.name}'s team (${node.children.length} direct reports)`
            }
            title={collapsed ? `Show ${node.children.length} direct reports` : 'Collapse'}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 -bottom-3 z-10',
              'flex items-center justify-center w-6 h-6 rounded-full border transition-colors duration-100',
              'bg-bg-surface border-line text-ink-muted hover:text-ink-primary hover:border-accent/30',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas',
            )}
          >
            {collapsed ? (
              <ChevronRight size={12} aria-hidden="true" />
            ) : (
              <ChevronDown size={12} aria-hidden="true" />
            )}
            <span className="sr-only">
              {collapsed ? 'Expand' : 'Collapse'} {node.children.length} direct
            </span>
          </button>
        )}
      </div>

      {/* Direct-reports count chip below card (visible when expanded) */}
      {hasChildren && !collapsed && (
        <span className="mt-3 text-xs font-mono text-ink-muted">
          {node.children.length} direct
        </span>
      )}

      {/* Children — horizontal flex row, connector lines via .org-tree-children CSS */}
      {hasChildren && !collapsed && (
        <ul className="org-tree-children">
          {node.children.map((child) => (
            <OrgTreeNode
              key={child.profile.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
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

// ─── Zoom + pan constants ─────────────────────────────────────────────────────

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;
const DRAG_THRESHOLD_PX = 5; // suppress click if drag distance exceeds this

export function OrgChart({ staff, viewerRole }: OrgChartProps) {
  const { user } = useStaffAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reOrgTarget, setReOrgTarget] = useState<StaffProfile | null>(null);

  // Zoom + pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
    distance: number;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const canReOrg = hasRank(viewerRole, 'R02');
  const tree = useMemo(() => buildTree(staff), [staff]);
  const selectedProfile = selectedId ? staff.find((s) => s.id === selectedId) ?? null : null;

  // ── Zoom controls ─────────────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
  }, []);
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse-wheel zoom (Ctrl/Cmd + wheel zooms; bare wheel scrolls)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => {
        const next = +(z + direction * ZOOM_STEP).toFixed(2);
        return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
      });
    }
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // ── Pan (drag) handlers — pointer events for cross-input ──────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only start panning on primary button + on the viewport background, NOT on a card/button
      const target = e.target as HTMLElement;
      // If user clicked on an interactive element (card button, chevron, etc.) skip pan
      if (target.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        distance: 0,
      };
      setIsPanning(true);
    },
    [pan.x, pan.y],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    drag.distance = Math.max(drag.distance, Math.hypot(dx, dy));
    setPan({ x: drag.startPanX + dx, y: drag.startPanY + dy });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStateRef.current = null;
    setIsPanning(false);
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Users size={32} className="text-ink-muted opacity-40" aria-hidden="true" />
        <p className="text-sm text-ink-muted">No staff to display.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tree panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2 bg-bg-canvas z-10 border-b border-line flex-shrink-0">
          <GitBranch size={16} className="text-ink-muted" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink-primary">Organisation Chart</h2>
          <span className="font-mono text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded">
            {staff.length}
          </span>
          {tree.length > 1 && (
            <span className="ml-2 text-xs text-ink-muted">
              {tree.length} root nodes (broken-chain or multiple top-of-org)
            </span>
          )}

          {/* Zoom controls — top-right of header */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              aria-label="Zoom out"
              title="Zoom out (Ctrl/⌘ + scroll)"
              className="flex items-center justify-center w-8 h-8 rounded-md border border-line bg-bg-surface text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
            >
              <ZoomOut size={14} aria-hidden="true" />
            </button>
            <span
              className="font-mono text-xs text-ink-secondary tabular-nums w-12 text-center"
              aria-live="polite"
              aria-label={`Zoom level ${Math.round(zoom * 100)} percent`}
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              aria-label="Zoom in"
              title="Zoom in (Ctrl/⌘ + scroll)"
              className="flex items-center justify-center w-8 h-8 rounded-md border border-line bg-bg-surface text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
            >
              <ZoomIn size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label="Reset zoom and pan"
              title="Reset to 100% (centred)"
              className="ml-1 flex items-center justify-center h-8 px-2.5 gap-1 rounded-md border border-line bg-bg-surface text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas"
            >
              <Maximize2 size={12} aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        {/* Hint strip */}
        <div className="px-6 py-1.5 flex items-center gap-2 text-xs text-ink-muted border-b border-line bg-bg-subtle flex-shrink-0">
          <Hand size={12} aria-hidden="true" className="opacity-60" />
          <span>
            Drag to pan · Ctrl/⌘ + scroll to zoom · click a card for details
          </span>
        </div>

        {/* Viewport — pannable, contains zoomed tree */}
        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={cn(
            'flex-1 overflow-hidden relative select-none',
            isPanning ? 'cursor-grabbing' : 'cursor-grab',
          )}
          aria-label="Org chart viewport — draggable"
        >
          {/* Transform layer — applies zoom + pan */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '50% 0%',
              transition: isPanning ? 'none' : 'transform 80ms ease-out',
            }}
            className="px-6 py-8 min-w-fit inline-block w-full"
          >
            {tree.length === 0 ? (
              <p className="text-sm text-ink-muted">No root nodes found.</p>
            ) : (
              <ul className="org-tree">
                {tree.map((node) => (
                  <OrgTreeNode
                    key={node.profile.id}
                    node={node}
                    selectedId={selectedId}
                    onSelect={(id) => {
                      // Suppress click if the user was actually panning
                      const drag = dragStateRef.current;
                      if (drag && drag.distance > DRAG_THRESHOLD_PX) return;
                      setSelectedId(id);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
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
