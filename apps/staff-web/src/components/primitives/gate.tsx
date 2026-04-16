'use client';

import { cloneElement, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { useStaffAuth } from '../../hooks/use-staff-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GateProps {
  /** Required role code(s) — any match grants access */
  role?: string | string[];
  /** Required outlet — user must be assigned this outlet or 'all' */
  outlet?: string;
  /** Required permission string in user.permissions */
  permission?: string;
  /** What to render when denied */
  fallback?: 'hide' | 'disable' | 'tooltip';
  /** Tooltip message when fallback='tooltip'. Defaults to auto-generated message. */
  tooltipMessage?: string;
  children: ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasAccess(
  userRole: string,
  userOutlet: string,
  userPermissions: string[],
  requiredRole?: string | string[],
  requiredOutlet?: string,
  requiredPermission?: string,
): boolean {
  // Wildcard permission grants all access
  if (userPermissions.includes('*')) return true;

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(userRole)) return false;
  }

  if (requiredOutlet) {
    if (userOutlet !== 'all' && userOutlet !== requiredOutlet) return false;
  }

  if (requiredPermission) {
    if (!userPermissions.includes(requiredPermission)) return false;
  }

  return true;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Gate({
  role,
  outlet,
  permission,
  fallback = 'hide',
  tooltipMessage,
  children,
}: GateProps) {
  const { user } = useStaffAuth();

  // While auth is loading or no user, deny access
  if (!user) {
    return fallback === 'hide' ? null : (
      <DisabledWrapper
        fallback={fallback}
        message={tooltipMessage ?? 'You must be signed in to perform this action.'}
      >
        {children}
      </DisabledWrapper>
    );
  }

  const allowed = hasAccess(
    user.role,
    user.outlet,
    user.permissions,
    role,
    outlet,
    permission,
  );

  if (allowed) return <>{children}</>;

  const defaultMessage = role
    ? `You need ${Array.isArray(role) ? role.join(' or ') : role} role to perform this action.`
    : permission
      ? `You need the '${permission}' permission to perform this action.`
      : 'You do not have access to this action.';

  if (fallback === 'hide') return null;

  return (
    <DisabledWrapper fallback={fallback} message={tooltipMessage ?? defaultMessage}>
      {children}
    </DisabledWrapper>
  );
}

// ─── Internal: DisabledWrapper ────────────────────────────────────────────────

interface DisabledWrapperProps {
  fallback: 'disable' | 'tooltip';
  message: string;
  children: ReactNode;
}

function DisabledWrapper({ fallback, message, children }: DisabledWrapperProps) {
  const child = isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>)
    : null;

  const cloned = child
    ? cloneElement(child, {
        disabled: true,
        'aria-disabled': true,
        ...(fallback === 'tooltip' ? { title: message } : {}),
      })
    : children;

  return (
    <span
      className="pointer-events-none opacity-40 inline-flex"
      aria-disabled="true"
      title={fallback === 'tooltip' ? message : undefined}
    >
      {cloned}
    </span>
  );
}
