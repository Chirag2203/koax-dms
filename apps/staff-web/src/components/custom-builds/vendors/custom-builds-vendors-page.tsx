/**
 * CustomBuildsVendorsPage — vendor directory.
 *
 * DataTable with row-click (slide-in stub), filter by city + specialty.
 * Vendor create/edit is R12+ (CTA shown, stub for P1).
 *
 * Spec reference: SPEC-CUSTOM-BUILDS-001 §8
 */

'use client';

import { useState, useMemo } from 'react';
import { Plus, Star } from 'lucide-react';
import type { CustomBuildVendor } from '@dms/types';
import { useCustomBuildsStore } from '@/src/lib/custom-builds/custom-builds-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';
import { hasRank } from '@/src/lib/custom-builds/state-machine';
import { formatINR } from '../shared/format-inr';
import { NewVendorDialog } from '../dialogs/new-vendor-dialog';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(rating) ? 'text-[rgb(var(--state-in-refurb))] fill-current' : 'text-ink-muted'}
          aria-hidden="true"
        />
      ))}
      <span className="ml-1 font-mono text-[11px] text-ink-secondary tabular-nums">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function VendorRow({
  vendor,
  onClick,
}: {
  vendor: CustomBuildVendor;
  onClick: () => void;
}) {
  return (
    <tr
      className="border-b border-line hover:bg-bg-hover transition-colors cursor-pointer"
      onClick={onClick}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`View vendor ${vendor.name}`}
    >
      <td className="px-4 py-3">
        <p className="text-[13px] font-medium text-ink-primary">{vendor.name}</p>
        <p className="text-[11px] text-ink-muted">{vendor.city}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {vendor.specialties.slice(0, 3).map((s) => (
            <span
              key={s}
              className="px-1.5 py-0.5 rounded bg-bg-subtle text-[10px] text-ink-secondary capitalize"
            >
              {s}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <StarRating rating={vendor.rating} />
      </td>
      <td className="px-4 py-3 font-mono text-[12px] text-ink-secondary tabular-nums text-right">
        {vendor.activeJobCount}
      </td>
      <td className="px-4 py-3 font-mono text-[12px] text-ink-secondary tabular-nums text-right">
        {vendor.onTimePct}%
      </td>
      <td className="px-4 py-3 font-mono text-[12px] text-ink-secondary tabular-nums text-right">
        {vendor.lifetimeJobCount}
      </td>
      <td className="px-4 py-3 text-[12px] text-ink-secondary">
        {vendor.paymentTerms}
      </td>
      <td className="px-4 py-3 font-mono text-[12px] text-ink-secondary tabular-nums text-right">
        {formatINR(vendor.dayRate)}/day
      </td>
    </tr>
  );
}

export function CustomBuildsVendorsPage() {
  const vendors = useCustomBuildsStore((s) => s.vendors);
  const hydrated = useCustomBuildsStore((s) => s.hydrated);
  const { user } = useStaffAuth();
  const canManageVendors = user && hasRank(user.role, 'R12');

  const [cityFilter, setCityFilter] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<CustomBuildVendor | null>(null);
  const [addVendorOpen, setAddVendorOpen] = useState(false);

  const cities = useMemo(() => {
    const set = new Set(vendors.map((v) => v.city));
    return Array.from(set).sort();
  }, [vendors]);

  const filtered = useMemo(() => {
    if (!cityFilter) return vendors;
    return vendors.filter((v) => v.city === cityFilter);
  }, [vendors, cityFilter]);

  if (!hydrated) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-subtle rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-line">
        <div>
          <h1 className="text-[18px] font-semibold text-ink-primary">Vendor Directory</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">{vendors.length} vendors</p>
        </div>
        {canManageVendors && (
          <button
            type="button"
            onClick={() => setAddVendorOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Add new vendor"
          >
            <Plus size={16} aria-hidden="true" />
            Add Vendor
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 border-b border-line flex items-center gap-3">
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-9 px-3 rounded-md bg-bg-subtle border border-line text-[13px] text-ink-secondary focus:outline-none focus:border-accent"
          aria-label="Filter by city"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-[15px] font-medium text-ink-primary">No vendors yet.</p>
            {canManageVendors && (
              <p className="text-[13px] text-ink-muted mt-1">Add your first vendor.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-line overflow-hidden">
            <table className="w-full" role="table">
              <thead className="bg-bg-subtle border-b border-line">
                <tr role="row">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-ink-muted uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-ink-muted uppercase tracking-wider">Specialties</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-ink-muted uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-ink-muted uppercase tracking-wider">Active Jobs</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-ink-muted uppercase tracking-wider">On-Time %</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-ink-muted uppercase tracking-wider">Lifetime</th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-ink-muted uppercase tracking-wider">Payment Terms</th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium text-ink-muted uppercase tracking-wider">Day Rate</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((vendor) => (
                  <VendorRow
                    key={vendor.id}
                    vendor={vendor}
                    onClick={() => setSelectedVendor(vendor)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Vendor dialog */}
      <NewVendorDialog open={addVendorOpen} onClose={() => setAddVendorOpen(false)} />

      {/* Vendor detail side panel (simple inline view for P1) */}
      {selectedVendor && (
        <div
          className="fixed inset-y-0 right-0 w-80 bg-bg-surface border-l border-line shadow-3 z-50 overflow-y-auto p-5 space-y-4"
          role="dialog"
          aria-label={`Vendor details: ${selectedVendor.name}`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink-primary">{selectedVendor.name}</h2>
            <button
              type="button"
              onClick={() => setSelectedVendor(null)}
              className="text-ink-muted hover:text-ink-primary text-[20px] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              aria-label="Close vendor panel"
            >
              ×
            </button>
          </div>

          <dl className="space-y-2 text-[13px]">
            <div><dt className="text-ink-muted text-[11px] uppercase tracking-wider">City</dt><dd className="text-ink-secondary mt-0.5">{selectedVendor.city}</dd></div>
            <div><dt className="text-ink-muted text-[11px] uppercase tracking-wider">Contact</dt><dd className="text-ink-secondary mt-0.5">{selectedVendor.contactName}<br />{selectedVendor.contactPhone}<br />{selectedVendor.contactEmail}</dd></div>
            <div><dt className="text-ink-muted text-[11px] uppercase tracking-wider">Day Rate</dt><dd className="font-mono text-ink-primary mt-0.5">{formatINR(selectedVendor.dayRate)}/day</dd></div>
            <div><dt className="text-ink-muted text-[11px] uppercase tracking-wider">Payment Terms</dt><dd className="text-ink-secondary mt-0.5">{selectedVendor.paymentTerms}</dd></div>
            {selectedVendor.gstIn && (
              <div><dt className="text-ink-muted text-[11px] uppercase tracking-wider">GSTIN</dt><dd className="font-mono text-[11px] text-ink-secondary mt-0.5">{selectedVendor.gstIn}</dd></div>
            )}
          </dl>

          <div>
            <p className="text-[11px] text-ink-muted uppercase tracking-wider mb-2">Specialties</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedVendor.specialties.map((s) => (
                <span key={s} className="px-2 py-0.5 rounded bg-bg-subtle text-[11px] text-ink-secondary capitalize">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
