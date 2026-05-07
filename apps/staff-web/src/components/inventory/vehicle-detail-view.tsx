'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Copy,
  Check,
  ExternalLink,
  Edit,
  Download,
  Trash2,
  FileText,
  FileBarChart,
  Shield,
  Receipt,
  FileCheck,
  ChevronRight,
  Plus,
  Upload,
  Wrench,
  Truck,
  HardHat,
  RefreshCw,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { useShootsStore } from '@/src/lib/shoots/shoots-store';
import { useStaffAuth } from '@/src/providers/staff-auth-provider';
import type { ShootAsset } from '@dms/types';
import { AssetApprovalPreconditionError } from '@dms/types';
import { cn } from '@dms/ui';
import type { Vehicle } from '@dms/types';
import type {
  CostLedgerEntry,
  Appraisal,
  VehicleTimelineEvent,
  VehicleDocument,
  VehicleDocumentType,
} from '@dms/types';
import { useVehiclesStore } from '@/src/lib/vehicles/vehicles-store';
import {
  StateChip,
  VinBadge,
  AmountCell,
  Gate,
  ToastContainer,
} from '@/src/components/primitives';
import type { StateChipStatus } from '@/src/components/primitives';
import { useToast } from '@/src/hooks/use-toast';
import {
  CostEntryModal,
  PhotosUploadModal,
  AppraisalEditPanel,
  DocumentUploadModal,
  MoreActionsMenu,
} from '@/src/components/inventory/action-flows';

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffVehicleStatus =
  | 'published'
  | 'reserved'
  | 'sold'
  | 'draft'
  | 'in-refurb'
  | 'stale'
  | 'archived'
  | 'unpublished'
  | 'in-review';

type DetailTab =
  | 'overview'
  | 'cost-ledger'
  | 'photos'
  | 'appraisal'
  | 'timeline'
  | 'documents';

export interface VehicleDetailViewProps {
  vehicle: Vehicle;
  costLedger: CostLedgerEntry[];
  appraisal: Appraisal | null;
  timeline: VehicleTimelineEvent[];
  documents: VehicleDocument[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Stable empty-array reference for the runtime-ledger selector below.
// Returning a fresh `[]` literal from a Zustand selector triggers
// "Maximum update depth exceeded" because every render produces a new
// reference, which Zustand treats as a state change. Per CLAUDE.md §17:
// selectors must return base refs.
const EMPTY_LEDGER: CostLedgerEntry[] = [];

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function daysOnLot(listedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(listedAt).getTime()) / (1000 * 60 * 60 * 24)));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function toStaffStatus(v: Vehicle): StaffVehicleStatus {
  if (v.status === 'published') {
    return daysOnLot(v.listedAt) > 60 ? 'stale' : 'published';
  }
  return v.status as StaffVehicleStatus;
}

const STATUS_TO_CHIP: Record<StaffVehicleStatus, StateChipStatus> = {
  published: 'listed',
  reserved: 'reserved',
  sold: 'sold',
  draft: 'draft',
  'in-refurb': 'in-refurb',
  stale: 'stale',
  archived: 'pending',
  unpublished: 'pending',
  'in-review': 'pending',
};

// Category display labels
const CATEGORY_LABEL: Record<string, string> = {
  acquisition: 'Base Acquisition',
  'refurb-mechanical': 'Refurbishment (Mechanical)',
  'refurb-cosmetic': 'Refurbishment (Cosmetic)',
  'refurb-detailing': 'Refurbishment (Detailing)',
  transport: 'Inbound Transport',
  'registration-tax': 'State Registration Tax',
  insurance: 'Insurance',
  'floor-plan-interest': 'Floor-Plan Interest',
  overhead: 'Overhead Allocation',
  photography: 'Photography',
  misc: 'Miscellaneous',
  // P4 Custom Builds (L17)
  'custom-build-parts': 'Custom Build — Parts',
  'custom-build-labour': 'Custom Build — Labour & GST',
  'custom-build-vendor-fee': 'Custom Build — BN Margin',
};

// Category dot colours
const CATEGORY_DOT: Record<string, string> = {
  acquisition: 'bg-accent',
  'refurb-mechanical': 'bg-[rgb(var(--state-in-refurb))]',
  'refurb-cosmetic': 'bg-[rgb(var(--state-reserved))]',
  'refurb-detailing': 'bg-[rgb(var(--state-pending))]',
  transport: 'bg-[rgb(var(--state-stale))]',
  'registration-tax': 'bg-[rgb(var(--state-sold))]',
  insurance: 'bg-[rgb(var(--state-listed))]',
  'floor-plan-interest': 'bg-[rgb(var(--state-overdue))]',
  overhead: 'bg-ink-muted',
  photography: 'bg-[rgb(var(--state-cpo))]',
  misc: 'bg-ink-secondary',
  // P4 Custom Builds (L17)
  'custom-build-parts': 'bg-[rgb(var(--state-in-refurb))]',
  'custom-build-labour': 'bg-[rgb(var(--state-reserved))]',
  'custom-build-vendor-fee': 'bg-accent',
};

// Timeline event type label + colour
const TIMELINE_EVENT_LABEL: Record<string, string> = {
  created: 'Record Created',
  submitted: 'Submitted for Review',
  approved: 'Approved by GM',
  rejected: 'Listing Rejected',
  published: 'Published to Storefront',
  unpublished: 'Unpublished',
  reserved: 'Reserved by Customer',
  sold: 'Vehicle Sold',
  archived: 'Archived',
  'cost-added': 'Cost Entry Added',
  'price-changed': 'Asking Price Revised',
  'refurb-started': 'Refurb Started',
  'refurb-complete': 'Refurb Complete',
};

const TIMELINE_EVENT_COLOUR: Record<string, string> = {
  created: 'border-ink-muted',
  submitted: 'border-accent',
  approved: 'border-[rgb(var(--state-listed))]',
  rejected: 'border-[rgb(var(--state-overdue))]',
  published: 'border-[rgb(var(--state-listed))]',
  unpublished: 'border-[rgb(var(--state-stale))]',
  reserved: 'border-[rgb(var(--state-reserved))]',
  sold: 'border-[rgb(var(--state-sold))]',
  archived: 'border-ink-muted',
  'cost-added': 'border-accent',
  'price-changed': 'border-[rgb(var(--state-stale))]',
  'refurb-started': 'border-[rgb(var(--state-in-refurb))]',
  'refurb-complete': 'border-[rgb(var(--state-listed))]',
};

// Document type icons + colours
const DOC_TYPE_LABEL: Record<VehicleDocumentType, string> = {
  rc: 'LEGAL',
  insurance: 'COMPLIANCE',
  appraisal: 'VALUATION',
  inspection: 'INSPECTION',
  'tally-export': 'FINANCIAL',
  invoice: 'INVOICE',
  'transfer-deed': 'LEGAL',
  other: 'OTHER',
};

function DocTypeIcon({ type }: { type: VehicleDocumentType }) {
  switch (type) {
    case 'appraisal':
    case 'inspection':
      return <FileBarChart className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />;
    case 'insurance':
      return <Shield className="h-4 w-4 shrink-0 text-[rgb(var(--state-listed))]" aria-hidden="true" />;
    case 'tally-export':
    case 'invoice':
      return <Receipt className="h-4 w-4 shrink-0 text-[rgb(var(--state-sold))]" aria-hidden="true" />;
    case 'transfer-deed':
      return <FileCheck className="h-4 w-4 shrink-0 text-[rgb(var(--state-reserved))]" aria-hidden="true" />;
    default:
      return <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-line last:border-0">
      <span className="text-[12px] font-medium uppercase tracking-wider text-ink-muted shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[13px] text-ink-primary text-right font-mono">
        {value}
      </span>
    </div>
  );
}

function SpecGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      <h3 className="mb-3 text-[11px] font-mono uppercase tracking-widest text-ink-muted">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SpecGroup title="Provenance">
        <SpecRow label="Previous Owners" value={vehicle.previousOwners} />
        <SpecRow label="Service History" value={vehicle.serviceHistorySummary} />
        <SpecRow label="Accident History" value={vehicle.accidentHistory || 'None reported'} />
        <SpecRow label="Keys" value={`${vehicle.keyCount} key${vehicle.keyCount !== 1 ? 's' : ''}`} />
      </SpecGroup>

      <SpecGroup title="Technical">
        <SpecRow label="Engine" value={vehicle.engine} />
        <SpecRow label="Power" value={vehicle.power} />
        <SpecRow label="Torque" value={vehicle.torque} />
        <SpecRow label="Transmission" value={vehicle.transmission} />
        <SpecRow label="Top Speed" value={vehicle.topSpeed} />
        <SpecRow label="0-100 km/h" value={vehicle.acceleration} />
        <SpecRow label="Drive Type" value={vehicle.driveType} />
        <SpecRow label="Fuel" value={vehicle.fuel} />
      </SpecGroup>

      <SpecGroup title="Ownership & Compliance">
        <SpecRow label="Odometer" value={`${vehicle.km.toLocaleString('en-IN')} km`} />
        <SpecRow label="Registration State" value={vehicle.registrationState} />
        <SpecRow label="Reg. Expiry" value={formatDate(vehicle.registrationExpiry)} />
        <SpecRow label="Insurance Expiry" value={formatDate(vehicle.insuranceExpiry)} />
        <SpecRow label="Warranty Expiry" value={vehicle.warrantyExpiry ? formatDate(vehicle.warrantyExpiry) : 'Expired'} />
        <SpecRow label="Tyre Condition" value={vehicle.tyreCondition} />
        <SpecRow label="CPO Certified" value={vehicle.isCertified ? 'Yes' : 'No'} />
      </SpecGroup>
    </div>
  );
}

// ─── Helpers: custom-build entry metadata ─────────────────────────────────────

const CUSTOM_BUILD_CATEGORIES = new Set([
  'custom-build-parts',
  'custom-build-labour',
  'custom-build-vendor-fee',
]);

/**
 * Extract build job ID from a cost-ledger entry note.
 * Note formats (set by deliverJob):
 *   "Custom build parts: {title}"            → no explicit job ID
 *   "Vendor labour + GST: {vendorName}"      → no explicit job ID
 *   "BN margin on build {jobId}"             → parse last word
 * We also look for the entry ID prefix "CLE-CB-" to identify the job.
 * Fallback: render a generic "Custom Build" badge with no link.
 */
function extractBuildJobId(entry: CostLedgerEntry): string | null {
  if (!CUSTOM_BUILD_CATEGORIES.has(entry.category)) return null;
  // "BN margin on build CBJ-xxx" — parse last word
  if (entry.note) {
    const m = entry.note.match(/\b(CBJ-[^\s]+)$/);
    if (m?.[1]) return m[1];
  }
  return null;
}

// ─── Tab: Cost Ledger ─────────────────────────────────────────────────────────

function CostLedgerTab({
  costLedger,
  onAddEntry,
  onEditEntry,
}: {
  costLedger: CostLedgerEntry[];
  onAddEntry: () => void;
  onEditEntry: (entry: CostLedgerEntry) => void;
}) {
  const total = costLedger.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-ink-primary">Expense Breakdown</h2>
        <Gate role={['R10', 'R19', 'R22', 'R24']} fallback="hide">
          <button
            type="button"
            onClick={onAddEntry}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Entry
          </button>
        </Gate>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-line">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_140px_160px] border-b border-line bg-bg-subtle px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Category</span>
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Date</span>
          <span className="text-right font-mono text-[11px] uppercase tracking-widest text-ink-muted">Amount (₹)</span>
        </div>

        {costLedger.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            No cost entries recorded yet.
          </div>
        ) : (
          <div>
            {costLedger.map((entry, i) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onEditEntry(entry)}
                className={cn(
                  'grid grid-cols-[1fr_140px_160px] w-full items-center px-4 py-3 text-left',
                  i % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle',
                  'hover:bg-accent/5 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                )}
              >
                {/* Category */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'inline-block h-2 w-2 shrink-0 rounded-full',
                      CATEGORY_DOT[entry.category] ?? 'bg-ink-muted',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate text-[13px] text-ink-primary">
                        {CATEGORY_LABEL[entry.category] ?? entry.category}
                      </span>
                      {/* Custom-build link badge (L41) */}
                      {CUSTOM_BUILD_CATEGORIES.has(entry.category) && (() => {
                        const jobId = extractBuildJobId(entry);
                        return jobId ? (
                          <Link
                            href={`/custom-builds/${jobId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent shrink-0"
                          >
                            Build #{jobId}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider bg-accent/10 text-accent border border-accent/20 shrink-0">
                            Custom Build
                          </span>
                        );
                      })()}
                    </div>
                    {entry.note && (
                      <span className="block truncate text-[11px] text-ink-muted">
                        {entry.note}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="font-mono text-[12px] text-ink-secondary">
                  {formatDate(entry.date)}
                </span>

                {/* Amount */}
                <AmountCell amount={entry.amount} align="right" />
              </button>
            ))}
          </div>
        )}

        {/* Total row */}
        <div className="grid grid-cols-[1fr_140px_160px] items-center border-t border-line bg-bg-subtle px-4 py-3">
          <span className="col-span-2 text-[13px] font-semibold text-ink-primary">
            Total Landed Cost
          </span>
          <span className="text-right font-mono text-[16px] font-semibold tabular-nums text-ink-primary">
            {INR.format(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Photos ──────────────────────────────────────────────────────────────

const IMAGE_KIND_LABELS = [
  'EXTERIOR_FRONT',
  'EXTERIOR_REAR',
  'EXTERIOR_SIDE',
  'INTERIOR_DASH',
  'INTERIOR_SEATS',
  'ENGINE_BAY',
];

/**
 * PhotosTab — SPEC-SHOOTS-002 T09 (Seam 50 wiring)
 *
 * v2: reads from useShootsStore instead of vehicle.images.
 * Allowed writes: setCoverAsset, reorderGallery, requestReshoot.
 * Forbidden: addRawAsset, approveAsset, redactLicensePlate (L_AI-3, L_AI-11).
 * "Upload more photos" CTA REMOVED — replaced with link to /shoots/{shootId}.
 *
 * Spec reference: SPEC-SHOOTS-002 T09, L_AI-3, L_AI-11, Seam 50
 */
// Module-level EMPTY fallback (CLAUDE.md §17.1 zustand rule)
const EMPTY_ASSETS_PHOTOS: ShootAsset[] = [];

function PhotosTab({
  vehicle,
}: {
  vehicle: Vehicle;
  onUpload: () => void; // kept for interface compat but no longer used
}) {
  const { user } = useStaffAuth();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [reshootReason, setReshootReason] = useState('');
  const [reshootDialogOpen, setReshootDialogOpen] = useState(false);
  const { toast } = useToast();

  const actor = useMemo(
    () => ({
      id: user?.id ?? 'anonymous',
      name: user?.name ?? 'Unknown',
      role: user?.role ?? 'R01',
    }),
    [user],
  );

  // Seam 50: read shoot + assets from shoots-store (L_AI-11)
  const shoot = useShootsStore((s) => {
    const id = s.shootIdByVin[vehicle.vin];
    return id ? s.shoots[id] : undefined;
  });

  const rawAssets = useShootsStore(
    (s) => s.shoots[s.shootIdByVin[vehicle.vin] ?? '']?.assets ?? EMPTY_ASSETS_PHOTOS,
  );

  // Sort assets by sortOrder in useMemo (CLAUDE.md §17.1)
  const assets = useMemo(
    () => [...rawAssets]
      .filter((a) => a.approved && a.forceApprovedWithoutRedaction === false && a.processedUrl !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    [rawAssets],
  );

  // Check for any non-approved exterior assets (B2 note)
  const hasPendingRedaction = useMemo(
    () => rawAssets.some((a) => !a.approved && a.kind !== 'dashboard' && a.kind !== 'rear_seats' && a.kind !== 'odometer' && a.kind !== 'engine_bay' && a.kind !== 'boot'),
    [rawAssets],
  );

  const currentAsset = lightboxIndex !== null ? assets[lightboxIndex] : null;

  function handleSetCover(assetId: string) {
    if (!shoot) return;
    try {
      useShootsStore.getState().setCoverAsset(shoot.id, assetId, actor);
      toast('Cover photo updated', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error');
    }
  }

  function handleRequestReshoot() {
    if (reshootReason.trim().length < 5) {
      toast('Please provide a reason (min 5 characters)', 'error');
      return;
    }
    try {
      useShootsStore.getState().requestReshoot(vehicle.vin, reshootReason.trim(), actor);
      toast('Re-shoot requested', 'success');
      setReshootDialogOpen(false);
      setReshootReason('');
    } catch (err) {
      if (err instanceof AssetApprovalPreconditionError) {
        toast('An open shoot already exists — resolve it before requesting a new one', 'error');
      } else {
        toast(err instanceof Error ? err.message : String(err), 'error');
      }
    }
  }

  return (
    <div>
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-muted">
            {assets.length} approved photo{assets.length !== 1 ? 's' : ''} in gallery
          </p>
          {hasPendingRedaction && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle size={12} aria-hidden="true" />
              Some assets pending redaction
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Manage in Shoots link (R11+ visible, L_AI-3) */}
          {shoot && (
            <Gate role={['R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
              <Link
                href={`/shoots/${shoot.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-surface px-3 py-1.5 text-sm font-medium text-ink-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              >
                Manage assets in Shoots →
              </Link>
            </Gate>
          )}
          {/* Request Re-shoot (R09+, Seam 50) */}
          <Gate role={['R09', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={() => setReshootDialogOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-surface px-3 py-1.5 text-sm font-medium text-ink-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Request Re-Shoot
            </button>
          </Gate>
        </div>
      </div>

      {/* No shoot state */}
      {!shoot && (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted">
          No shoot exists for this VIN yet.
        </div>
      )}

      {/* Gallery grid */}
      {shoot && assets.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted">
          No approved photos yet.{' '}
          <Link href={`/shoots/${shoot.id}`} className="ml-1 text-accent hover:underline">
            Upload in Shoots →
          </Link>
        </div>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset, i) => (
            <div key={asset.id} className="relative group">
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="w-full overflow-hidden rounded-md border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                aria-label={`View photo ${i + 1}: ${asset.kind}`}
              >
                <div className="aspect-[4/3] relative">
                  <Image
                    src={asset.processedUrl!}
                    alt={asset.kind.replace(/_/g, ' ')}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                </div>
                {/* Kind label */}
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider text-white">
                  {asset.kind.replace(/_/g, ' ')}
                </span>
                {/* Cover indicator */}
                {shoot?.coverAssetId === asset.id && (
                  <span className="absolute top-1 left-1 bg-amber-500/90 text-white rounded-md p-0.5">
                    <Star size={10} aria-label="Cover" />
                  </span>
                )}
              </button>

              {/* Set cover CTA (R09+, Seam 50 allowed write) */}
              {shoot?.coverAssetId !== asset.id && asset.kind !== 'video_walkaround' && (
                <Gate role={['R09', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24']} fallback="hide">
                  <button
                    type="button"
                    onClick={() => handleSetCover(asset.id)}
                    className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 bg-black/70 text-white px-1.5 py-0.5 rounded-md text-xs hover:bg-black/90 transition-colors"
                  >
                    <Star size={10} aria-hidden="true" />
                    Cover
                  </button>
                </Gate>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {currentAsset && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded p-2 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close lightbox"
            onClick={() => setLightboxIndex(null)}
          >
            ✕
          </button>
          <div
            className="relative max-h-[85vh] max-w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentAsset.processedUrl!}
              alt={currentAsset.kind.replace(/_/g, ' ')}
              width={1920}
              height={1080}
              className="max-h-[85vh] max-w-[85vw] rounded-md object-contain"
              unoptimized
            />
            <p className="mt-2 text-center font-mono text-xs uppercase tracking-wider text-white/60">
              {currentAsset.kind.replace(/_/g, ' ')}&nbsp;· {lightboxIndex + 1} / {assets.length}
            </p>
          </div>
          {lightboxIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded p-2 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Previous photo"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >&#8592;</button>
          )}
          {lightboxIndex < assets.length - 1 && (
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-2 text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Next photo"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >&#8594;</button>
          )}
        </div>
      )}

      {/* Re-shoot dialog */}
      {reshootDialogOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reshoot-dialog-title"
        >
          <div className="bg-bg-surface border border-line rounded-md w-full max-w-[480px] shadow-xl">
            <div className="px-6 pt-6 pb-4">
              <h2 id="reshoot-dialog-title" className="text-base font-semibold text-ink-primary">
                Request Re-Shoot
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                This will create a new shoot for VIN {vehicle.vin}. Provide a reason.
              </p>
            </div>
            <div className="px-6 pb-4">
              <textarea
                value={reshootReason}
                onChange={(e) => setReshootReason(e.target.value)}
                rows={3}
                placeholder="Reason for re-shoot (min 5 characters)..."
                className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 resize-none"
              />
            </div>
            <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setReshootDialogOpen(false); setReshootReason(''); }}
                className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestReshoot}
                disabled={reshootReason.trim().length < 5}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Request Re-Shoot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Appraisal ───────────────────────────────────────────────────────────

const GRADE_COLOUR: Record<string, string> = {
  A: 'bg-[rgb(var(--state-listed)/0.15)] text-[rgb(var(--state-listed))]',
  'A-': 'bg-[rgb(var(--state-listed)/0.15)] text-[rgb(var(--state-listed))]',
  'B+': 'bg-accent/10 text-accent',
  B: 'bg-accent/10 text-accent',
  'B-': 'bg-[rgb(var(--state-stale)/0.15)] text-[rgb(var(--state-stale))]',
  C: 'bg-[rgb(var(--state-overdue)/0.15)] text-[rgb(var(--state-overdue))]',
};

function AppraisalTab({
  appraisal,
  onEdit,
}: {
  appraisal: Appraisal | null;
  onEdit: () => void;
}) {
  if (!appraisal) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Gate role={['R10', 'R11', 'R19', 'R22', 'R24']} fallback="hide">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create Appraisal
            </button>
          </Gate>
        </div>
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted">
          No appraisal recorded for this vehicle.
        </div>
      </div>
    );
  }

  const pct = Math.round((appraisal.pointsCompleted / appraisal.pointsTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Edit button */}
      <div className="flex justify-end">
        <Gate role={['R10', 'R11', 'R19', 'R22', 'R24']} fallback="hide">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-surface px-3 py-1.5 text-sm font-medium text-ink-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Appraisal
          </button>
        </Gate>
      </div>

      {/* Grade + score row */}
      <div className="flex items-start gap-6 rounded-md border border-line bg-bg-surface p-6">
        {/* Grade badge */}
        <div
          className={cn(
            'flex h-20 w-20 shrink-0 items-center justify-center rounded-md text-5xl font-semibold',
            GRADE_COLOUR[appraisal.grade] ?? 'bg-bg-subtle text-ink-primary',
          )}
        >
          {appraisal.grade}
        </div>

        {/* Score + meta */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[13px] text-ink-muted">Points Verified</p>
            <p className="text-[22px] font-semibold text-ink-primary">
              {appraisal.pointsCompleted}
              <span className="text-[16px] font-normal text-ink-muted">
                &nbsp;/ {appraisal.pointsTotal} points
              </span>
            </p>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-subtle">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${pct}% of points verified`}
            />
          </div>
          <p className="text-[12px] font-mono text-ink-muted">{pct}% complete</p>

          {/* Inspector + date */}
          <div className="flex items-center gap-4 text-[13px]">
            <span className="text-ink-muted">Inspector:</span>
            <span className="font-medium text-ink-primary">{appraisal.inspectorName}</span>
            <span className="text-ink-muted">Date:</span>
            <span className="font-mono text-ink-secondary">{formatDate(appraisal.inspectionDate)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {appraisal.notes && (
        <div className="rounded-md border border-line bg-bg-surface p-4">
          <h3 className="mb-2 text-[11px] font-mono uppercase tracking-widest text-ink-muted">
            Inspector Notes
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-primary">{appraisal.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Timeline ────────────────────────────────────────────────────────────

function TimelineTab({ timeline }: { timeline: VehicleTimelineEvent[] }) {
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="relative pl-12">
      {/* Vertical connector line */}
      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-line" aria-hidden="true" />

      <div className="space-y-6">
        {sorted.map((event) => (
          <div key={event.id} className="relative flex items-start gap-4">
            {/* Avatar with border colour */}
            <div
              className={cn(
                'absolute -left-12 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                'bg-bg-surface border-2 text-[11px] font-semibold text-ink-primary',
                TIMELINE_EVENT_COLOUR[event.type] ?? 'border-line',
              )}
              aria-hidden="true"
            >
              {getInitials(event.actorName)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 rounded-md border border-line bg-bg-surface px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink-primary">
                    {TIMELINE_EVENT_LABEL[event.type] ?? event.type}
                  </p>
                  <p className="text-[12px] text-ink-muted">{event.actorName}</p>
                  {event.note && (
                    <p className="mt-1 text-[13px] text-ink-secondary">{event.note}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[11px] text-ink-muted whitespace-nowrap">
                  {formatDate(event.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function DocumentsTab({
  documents,
  onUpload,
}: {
  documents: VehicleDocument[];
  onUpload: () => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[18px] font-semibold text-ink-primary">File Repository</h2>
        <Gate role={['R05', 'R10', 'R19', 'R22', 'R24']} fallback="hide">
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-surface px-3 py-1.5 text-sm font-medium text-ink-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Upload File
          </button>
        </Gate>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-line">
        {/* Header */}
        <div className="grid grid-cols-[minmax(180px,1fr)_110px_140px_120px_80px_72px] border-b border-line bg-bg-subtle px-4 py-2">
          {(['Document Name', 'Type', 'Uploaded By', 'Date Uploaded', 'Size', 'Actions'] as const).map((h) => (
            <span key={h} className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              {h}
            </span>
          ))}
        </div>

        {documents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            No documents uploaded yet.
          </div>
        ) : (
          documents.map((doc, i) => (
            <div
              key={doc.id}
              className={cn(
                'grid grid-cols-[minmax(180px,1fr)_110px_140px_120px_80px_72px] items-center px-4 py-3',
                i % 2 === 0 ? 'bg-bg-canvas' : 'bg-bg-subtle',
                'hover:bg-accent/5 transition-colors',
              )}
            >
              {/* Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <DocTypeIcon type={doc.type} />
                <span className="truncate text-[14px] text-ink-primary">{doc.name}</span>
              </div>

              {/* Type chip */}
              <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider bg-bg-subtle text-ink-secondary w-fit">
                {DOC_TYPE_LABEL[doc.type]}
              </span>

              {/* Uploaded by */}
              <span className="truncate text-[13px] text-ink-secondary">
                {doc.uploadedBy.replace(/^R\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>

              {/* Date */}
              <span className="font-mono text-[12px] text-ink-secondary">
                {formatDate(doc.uploadedAt)}
              </span>

              {/* Size */}
              <span className="font-mono text-[12px] text-ink-muted">{doc.fileSize}</span>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <a
                  href={doc.fileUrl}
                  download
                  className="rounded p-1.5 text-ink-muted hover:text-ink-primary hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  aria-label={`Download ${doc.name}`}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <Gate role={['R10', 'R19', 'R22', 'R24']} fallback="hide">
                  <button
                    type="button"
                    className="rounded p-1.5 text-ink-muted hover:text-[rgb(var(--state-overdue))] hover:bg-bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    aria-label={`Delete ${doc.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </Gate>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Financial Snapshot ───────────────────────────────────────────────────────

function FinancialSnapshot({
  vehicle,
  costLedger,
  status,
  onMoreActions,
}: {
  vehicle: Vehicle;
  costLedger: CostLedgerEntry[];
  status: StaffVehicleStatus;
  onMoreActions: React.ReactNode;
}) {
  const askPrice = vehicle.price;
  const landedCost = costLedger.reduce((sum, e) => sum + e.amount, 0);
  const margin = askPrice - landedCost;
  const marginPct = landedCost > 0 ? ((margin / landedCost) * 100).toFixed(1) : '0.0';
  const days = daysOnLot(vehicle.listedAt);

  return (
    <div className="rounded-md border border-line bg-bg-surface p-4">
      {/* Eyebrow */}
      <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
        Financial Snapshot
      </p>

      {/* Ask Price — large */}
      <div className="mb-4">
        <p className="text-[12px] text-ink-muted">Ask Price</p>
        <p className="font-mono text-[24px] font-semibold tabular-nums text-ink-primary leading-tight">
          {INR.format(askPrice)}
        </p>
      </div>

      {/* Landed Cost */}
      <div className="mb-3">
        <p className="text-[12px] text-ink-muted">Landed Cost</p>
        <p className="font-mono text-[15px] tabular-nums text-ink-secondary">
          {landedCost > 0 ? INR.format(landedCost) : '—'}
        </p>
      </div>

      {/* Projected Margin */}
      <div className="mb-3">
        <p className="text-[12px] text-ink-muted">Projected Margin</p>
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              'font-mono text-[15px] tabular-nums font-medium',
              margin >= 0 ? 'text-[rgb(var(--state-listed))]' : 'text-[rgb(var(--state-overdue))]',
            )}
          >
            {landedCost > 0 ? INR.format(margin) : '—'}
          </p>
          {landedCost > 0 && (
            <span
              className={cn(
                'font-mono text-[12px]',
                margin >= 0 ? 'text-[rgb(var(--state-listed))]' : 'text-[rgb(var(--state-overdue))]',
              )}
            >
              {marginPct}%
            </span>
          )}
        </div>
      </div>

      {/* Days in Inventory */}
      <div className="mb-4 pb-4 border-b border-line">
        <p className="text-[12px] text-ink-muted">Days in Inv.</p>
        <p
          className={cn(
            'font-mono text-[15px] tabular-nums font-medium',
            days < 30
              ? 'text-[rgb(var(--state-listed))]'
              : days <= 60
                ? 'text-[rgb(var(--state-stale))]'
                : 'text-[rgb(var(--state-overdue))]',
          )}
        >
          {days}
        </p>
      </div>

      {/* CTA buttons */}
      <div className="space-y-2">
        {/* Primary action */}
        {status === 'published' && (
          <a
            href={`/collection/${vehicle.vin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            View on Storefront
          </a>
        )}

        {status === 'draft' && (
          <Gate role={['R05', 'R10', 'R19', 'R22', 'R24']} fallback="disable">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              Submit for Review
            </button>
          </Gate>
        )}

        {status === 'in-review' && (
          <Gate role={['R10', 'R19', 'R22', 'R24']} fallback="disable">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              Publish Vehicle
            </button>
          </Gate>
        )}

        {status === 'in-refurb' && (
          <Gate role={['R10', 'R11', 'R19', 'R22', 'R24']} fallback="disable">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              Mark Refurb Complete
            </button>
          </Gate>
        )}

        {/* Secondary action */}
        {status === 'published' && (
          <Gate role={['R10', 'R19', 'R22', 'R24']} fallback="disable">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-bg-surface px-4 py-2 text-sm font-medium text-ink-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              Unpublish
            </button>
          </Gate>
        )}

        {(status === 'draft' || status === 'in-review' || status === 'in-refurb') && (
          <Gate role={['R05', 'R10', 'R19', 'R22', 'R24']} fallback="disable">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-bg-surface px-4 py-2 text-sm font-medium text-ink-primary transition-colors hover:bg-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
            >
              <Edit className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          </Gate>
        )}

        {/* More actions — injected from parent so it has access to modal state */}
        {onMoreActions}
      </div>
    </div>
  );
}

// ─── Mock timeline event logger ───────────────────────────────────────────────

function addTimelineEvent(vin: string, type: string, note: string) {
  console.log('[Timeline]', { vin, type, note, timestamp: new Date().toISOString() });
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'cost-ledger', label: 'Cost Ledger' },
  { id: 'photos', label: 'Photos' },
  { id: 'appraisal', label: 'Appraisal' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'documents', label: 'Documents' },
];

function maskVin(vin: string): string {
  if (vin.length < 13) return vin;
  return `${vin.slice(0, 9)}\u2022\u2022\u2022${vin.slice(-4)}`;
}

export function VehicleDetailView({
  vehicle,
  costLedger: initialCostLedger,
  appraisal: initialAppraisal,
  timeline,
  documents: initialDocuments,
}: VehicleDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('cost-ledger');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // ── Runtime cost-ledger from vehicles-store (L40 merge) ──────────────────
  const runtimeLedger = useVehiclesStore(
    (s) => s.costLedger[vehicle.vin] ?? EMPTY_LEDGER,
  );

  // ── Local state (optimistic) ───────────────────────────────────────────────
  // Merge fixture + runtime entries, deduped by id (L40)
  const [fixtureEntries, setFixtureEntries] = useState<CostLedgerEntry[]>(initialCostLedger);
  const costLedger = useMemo<CostLedgerEntry[]>(() => {
    const seen = new Set(runtimeLedger.map((e) => e.id));
    const deduped = fixtureEntries.filter((e) => !seen.has(e.id));
    return [...deduped, ...runtimeLedger];
  }, [fixtureEntries, runtimeLedger]);
  const [appraisal, setAppraisal] = useState<Appraisal | null>(initialAppraisal);
  const [documents, setDocuments] = useState<VehicleDocument[]>(initialDocuments);

  // ── Modal open states ──────────────────────────────────────────────────────
  const [costEntryModalOpen, setCostEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CostLedgerEntry | undefined>(undefined);
  const [photosModalOpen, setPhotosModalOpen] = useState(false);
  const [appraisalPanelOpen, setAppraisalPanelOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const { toasts, toast, dismiss } = useToast();

  const status = toStaffStatus(vehicle);
  const chipStatus = STATUS_TO_CHIP[status];
  const vehicleTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.variant}`;
  const subtitle = [vehicle.variant, vehicle.color, vehicle.interiorColor, `${vehicle.km.toLocaleString('en-IN')} km`]
    .filter(Boolean)
    .join(' · ');

  const activeImage = vehicle.images[activeImageIndex] ?? null;

  async function handleCopyVin() {
    try {
      await navigator.clipboard.writeText(vehicle.vin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail
    }
  }

  // ── Cost ledger handlers ──────────────────────────────────────────────────

  const handleSaveCostEntry = useCallback(async (data: Partial<CostLedgerEntry>) => {
    // Simulate API
    await new Promise<void>((resolve) => setTimeout(resolve, 500));

    if (editingEntry) {
      // Edit — update in fixture entries
      setFixtureEntries((prev) =>
        prev.map((e) => (e.id === editingEntry.id ? { ...e, ...data } : e)),
      );
      addTimelineEvent(vehicle.vin, 'cost-added', `Cost entry updated: ${data.category ?? ''}`);
      toast('Cost entry updated', 'success');
    } else {
      // Add — append to fixture entries
      const newEntry: CostLedgerEntry = {
        id: `CLE-NEW-${Date.now()}`,
        vin: vehicle.vin,
        category: data.category ?? 'misc',
        date: data.date ?? new Date().toISOString().split('T')[0]!,
        amount: data.amount ?? 0,
        note: data.note,
        addedBy: 'current-user',
        addedAt: new Date().toISOString(),
      };
      setFixtureEntries((prev) => [...prev, newEntry]);
      addTimelineEvent(vehicle.vin, 'cost-added', `Cost entry added: ${newEntry.category}`);
      toast('Cost entry added', 'success');
    }
  }, [editingEntry, vehicle.vin, toast]);

  const handleDeleteCostEntry = useCallback(async (id: string) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    setFixtureEntries((prev) => prev.filter((e) => e.id !== id));
    addTimelineEvent(vehicle.vin, 'cost-added', `Cost entry deleted`);
    toast('Cost entry deleted', 'info');
  }, [vehicle.vin, toast]);

  // ── Photos handler ────────────────────────────────────────────────────────

  const handleSavePhotos = useCallback(async (
    _photos: Array<{ file: File; kind: string; isPrimary: boolean }>,
  ) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    addTimelineEvent(vehicle.vin, 'published', `Photos uploaded`);
    toast(`${_photos.length} photo${_photos.length !== 1 ? 's' : ''} uploaded`, 'success');
  }, [vehicle.vin, toast]);

  // ── Appraisal handler ─────────────────────────────────────────────────────

  const handleSaveAppraisal = useCallback(async (data: Partial<Appraisal>) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    if (appraisal) {
      setAppraisal((prev) => prev ? { ...prev, ...data } : prev);
      toast('Appraisal updated', 'success');
    } else {
      const newAppraisal: Appraisal = {
        id: `APR-NEW-${Date.now()}`,
        vin: vehicle.vin,
        grade: data.grade ?? 'B+',
        pointsCompleted: data.pointsCompleted ?? 0,
        pointsTotal: 210,
        inspectorName: data.inspectorName ?? '',
        inspectionDate: data.inspectionDate ?? new Date().toISOString().split('T')[0]!,
        notes: data.notes,
      };
      setAppraisal(newAppraisal);
      toast('Appraisal created', 'success');
    }
    addTimelineEvent(vehicle.vin, 'submitted', `Appraisal ${appraisal ? 'updated' : 'created'}`);
  }, [appraisal, vehicle.vin, toast]);

  // ── Document handler ──────────────────────────────────────────────────────

  const handleSaveDocument = useCallback(async (data: {
    file: File;
    type: string;
    name: string;
    issueDate?: string;
    expiryDate?: string;
    notes?: string;
  }) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    const newDoc: VehicleDocument = {
      id: `DOC-NEW-${Date.now()}`,
      vin: vehicle.vin,
      type: data.type as VehicleDocumentType,
      name: data.name,
      uploadedBy: 'current-user',
      uploadedAt: new Date().toISOString(),
      fileSize: `${(data.file.size / 1024).toFixed(0)} KB`,
      fileUrl: '#',
    };
    setDocuments((prev) => [...prev, newDoc]);
    addTimelineEvent(vehicle.vin, 'submitted', `Document uploaded: ${data.name}`);
    toast(`Document "${data.name}" uploaded`, 'success');
  }, [vehicle.vin, toast]);

  // ── More actions handlers ─────────────────────────────────────────────────

  const handleTransfer = useCallback(async (outlet: string, _reason: string, _notify: boolean) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    addTimelineEvent(vehicle.vin, 'submitted', `Vehicle transferred to ${outlet}`);
    toast(`Vehicle transferred to ${outlet}`, 'success');
  }, [vehicle.vin, toast]);

  const handleClone = useCallback(async (newVin: string, _newKm: number, _outlet?: string) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    addTimelineEvent(vehicle.vin, 'created', `Vehicle cloned as ${newVin}`);
    toast(`Clone created: ${newVin}`, 'success');
  }, [vehicle.vin, toast]);

  const handleMarkStale = useCallback(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    addTimelineEvent(vehicle.vin, 'price-changed', 'Marked as stale');
    toast('Vehicle marked as stale', 'warning');
  }, [vehicle.vin, toast]);

  const handleUnpublish = useCallback(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    addTimelineEvent(vehicle.vin, 'unpublished', 'Vehicle unpublished');
    toast('Vehicle unpublished', 'info');
  }, [vehicle.vin, toast]);

  const handleArchive = useCallback(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    addTimelineEvent(vehicle.vin, 'archived', 'Vehicle archived');
    toast('Vehicle archived', 'info');
  }, [vehicle.vin, toast]);

  return (
    <div className="min-h-full bg-bg-canvas">
      <div className="mx-auto max-w-[1440px] px-6 pb-12 pt-6">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1">
          <Link
            href="/inventory"
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            Inventory
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <Link
            href="/inventory"
            className="font-mono text-[13px] text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
          >
            Vehicles
          </Link>
          <ChevronRight className="h-3 w-3 text-ink-muted" aria-hidden="true" />
          <span className="font-mono text-[13px] text-ink-primary" aria-current="page">
            {maskVin(vehicle.vin)}
          </span>
        </nav>

        {/* Status-specific banners */}
        {status === 'draft' && (
          <div
            className="mb-4 flex items-start gap-3 rounded-md border border-[rgb(var(--state-stale)/0.4)] bg-[rgb(var(--state-stale)/0.08)] px-4 py-3"
            role="status"
          >
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--state-stale))]" aria-hidden="true" />
            <p className="text-[13px] text-ink-secondary">
              This vehicle is a draft. Complete required fields and submit for review.
            </p>
          </div>
        )}

        {status === 'in-refurb' && (
          <div
            className="mb-4 flex items-start gap-3 rounded-md border border-[rgb(var(--state-in-refurb)/0.4)] bg-[rgb(var(--state-in-refurb)/0.08)] px-4 py-3"
            role="status"
          >
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--state-in-refurb))]" aria-hidden="true" />
            <p className="text-[13px] text-ink-secondary">
              This vehicle is in refurbishment. Mark refurb complete when ready.
            </p>
          </div>
        )}

        {/* Top section: 2 columns */}
        <div className="flex gap-6 items-start">
          {/* Left: Photo hero */}
          <div className="flex-1 min-w-0">
            {/* Hero image */}
            <div className="relative aspect-video overflow-hidden rounded-md bg-bg-subtle">
              {activeImage ? (
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-muted">
                  <span className="font-mono text-sm">No photos</span>
                </div>
              )}
            </div>

            {/* Thumbnail dots */}
            {vehicle.images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {vehicle.images.map((img, i) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setActiveImageIndex(i)}
                    aria-label={`Switch to photo ${i + 1}`}
                    className={cn(
                      'relative h-12 w-16 overflow-hidden rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1',
                      i === activeImageIndex ? 'border-accent' : 'border-transparent hover:border-line',
                    )}
                  >
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Financial snapshot sidebar */}
          <div className="w-80 shrink-0">
            <FinancialSnapshot
              vehicle={vehicle}
              costLedger={costLedger}
              status={status}
              onMoreActions={
                <MoreActionsMenu
                  vin={vehicle.vin}
                  currentStatus={status}
                  currentOutlet={vehicle.city}
                  onTransfer={handleTransfer}
                  onClone={handleClone}
                  onMarkStale={handleMarkStale}
                  onUnpublish={handleUnpublish}
                  onArchive={handleArchive}
                />
              }
            />
          </div>
        </div>

        {/* Title block */}
        <div className="mt-6">
          {/* Name + status chip */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] font-semibold leading-[1.25] text-ink-primary">
              {vehicleTitle}
            </h1>
            <StateChip status={chipStatus} />
          </div>

          {/* VIN badge — full for staff */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <VinBadge vin={vehicle.vin} masked={false} />
            <button
              type="button"
              onClick={handleCopyVin}
              aria-label={copied ? 'VIN copied' : 'Copy VIN'}
              className="rounded p-1 text-ink-muted hover:text-ink-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[rgb(var(--state-listed))]" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <span className="font-mono text-[12px] text-ink-muted uppercase tracking-wider">
              {vehicle.city.charAt(0).toUpperCase() + vehicle.city.slice(1)} · {vehicle.bodyType}
            </span>
          </div>

          {/* Subtitle */}
          <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>
        </div>

        {/* Tabs row */}
        <div
          className="mt-6 flex items-end gap-0 border-b border-line"
          role="tablist"
          aria-label="Vehicle detail tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                activeTab === tab.id
                  ? 'text-ink-primary'
                  : 'text-ink-muted hover:text-ink-secondary',
              )}
            >
              {tab.label}
              {/* Underline indicator */}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm bg-accent"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content panels */}
        <div className="mt-6">
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            hidden={activeTab !== 'overview'}
          >
            {activeTab === 'overview' && <OverviewTab vehicle={vehicle} />}
          </div>

          <div
            role="tabpanel"
            id="panel-cost-ledger"
            aria-labelledby="tab-cost-ledger"
            hidden={activeTab !== 'cost-ledger'}
          >
            {activeTab === 'cost-ledger' && (
              <CostLedgerTab
                costLedger={costLedger}
                onAddEntry={() => {
                  setEditingEntry(undefined);
                  setCostEntryModalOpen(true);
                }}
                onEditEntry={(entry) => {
                  setEditingEntry(entry);
                  setCostEntryModalOpen(true);
                }}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="panel-photos"
            aria-labelledby="tab-photos"
            hidden={activeTab !== 'photos'}
          >
            {activeTab === 'photos' && (
              <PhotosTab
                vehicle={vehicle}
                onUpload={() => setPhotosModalOpen(true)}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="panel-appraisal"
            aria-labelledby="tab-appraisal"
            hidden={activeTab !== 'appraisal'}
          >
            {activeTab === 'appraisal' && (
              <AppraisalTab
                appraisal={appraisal}
                onEdit={() => setAppraisalPanelOpen(true)}
              />
            )}
          </div>

          <div
            role="tabpanel"
            id="panel-timeline"
            aria-labelledby="tab-timeline"
            hidden={activeTab !== 'timeline'}
          >
            {activeTab === 'timeline' && <TimelineTab timeline={timeline} />}
          </div>

          <div
            role="tabpanel"
            id="panel-documents"
            aria-labelledby="tab-documents"
            hidden={activeTab !== 'documents'}
          >
            {activeTab === 'documents' && (
              <DocumentsTab
                documents={documents}
                onUpload={() => setDocumentModalOpen(true)}
              />
            )}
          </div>
        </div>

      </div>

      {/* ─── Action modals ──────────────────────────────────────────────────── */}

      <CostEntryModal
        open={costEntryModalOpen}
        onClose={() => {
          setCostEntryModalOpen(false);
          setEditingEntry(undefined);
        }}
        vin={vehicle.vin}
        entry={editingEntry}
        onSave={handleSaveCostEntry}
        onDelete={editingEntry ? handleDeleteCostEntry : undefined}
      />

      <PhotosUploadModal
        open={photosModalOpen}
        onClose={() => setPhotosModalOpen(false)}
        vin={vehicle.vin}
        onSave={handleSavePhotos}
      />

      <AppraisalEditPanel
        open={appraisalPanelOpen}
        onClose={() => setAppraisalPanelOpen(false)}
        vin={vehicle.vin}
        appraisal={appraisal ?? undefined}
        onSave={handleSaveAppraisal}
      />

      <DocumentUploadModal
        open={documentModalOpen}
        onClose={() => setDocumentModalOpen(false)}
        vin={vehicle.vin}
        onSave={handleSaveDocument}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
