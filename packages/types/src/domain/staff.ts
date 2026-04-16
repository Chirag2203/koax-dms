import { z } from 'zod';
import { CityEnum } from './vehicle';

// ─── Role Codes (Doc 14 — 24 roles R01–R24) ───────────────────────────────────

export const StaffRoleCodeEnum = z.enum([
  'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'R08', 'R09', 'R10',
  'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20',
  'R21', 'R22', 'R23', 'R24',
]);
export type StaffRoleCode = z.infer<typeof StaffRoleCodeEnum>;

// ─── Outlet (city-scoped or cross-outlet) ─────────────────────────────────────

export const StaffOutletEnum = z.union([CityEnum, z.literal('all')]);
export type StaffOutlet = z.infer<typeof StaffOutletEnum>;

// ─── Staff User ───────────────────────────────────────────────────────────────

export const StaffUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  /** 2-letter initials for avatar display */
  avatar: z.string(),
  role: StaffRoleCodeEnum,
  /** Human-readable role name e.g. "Sales Manager" */
  roleName: z.string(),
  outlet: StaffOutletEnum,
  permissions: z.array(z.string()),
});
export type StaffUser = z.infer<typeof StaffUserSchema>;

// ─── Command Palette ──────────────────────────────────────────────────────────

export const CommandPaletteItemSchema = z.object({
  id: z.string(),
  type: z.enum(['vehicle', 'customer', 'job-card', 'invoice', 'deal', 'action']),
  label: z.string(),
  hint: z.string().optional(),
  category: z.string(),
  shortcut: z.string().optional(),
  href: z.string().optional(),
});
export type CommandPaletteItem = z.infer<typeof CommandPaletteItemSchema>;

// ─── Staff Notifications ──────────────────────────────────────────────────────

export const StaffNotificationTypeEnum = z.enum([
  'inventory', 'sales', 'service', 'finance', 'parts', 'system',
]);
export type StaffNotificationType = z.infer<typeof StaffNotificationTypeEnum>;

export const StaffNotificationSchema = z.object({
  id: z.string(),
  type: StaffNotificationTypeEnum,
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  isRead: z.boolean(),
  href: z.string().optional(),
});
export type StaffNotification = z.infer<typeof StaffNotificationSchema>;

// ─── Vehicle Listing Status (Staff-specific extended set) ─────────────────────

export const VehicleListingStatusEnum = z.enum([
  'draft',
  'in-review',
  'published',
  'reserved',
  'sold',
  'unpublished',
  'archived',
]);
export type VehicleListingStatus = z.infer<typeof VehicleListingStatusEnum>;

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const DashboardStatSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  deltaType: z.enum(['up', 'down', 'neutral']).optional(),
  subtitle: z.string().optional(),
});
export type DashboardStat = z.infer<typeof DashboardStatSchema>;
