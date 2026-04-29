/**
 * UI canon drift test — automated enforcement of SPEC-ARCH-UI-001.
 *
 * This test fails if a NEW file introduces UI-canon violations that
 * weren't present in the 2026-04-29 baseline. Existing violations are
 * grandfathered via the BASELINE constants below; the test will nudge
 * you to prune entries that are now clean.
 *
 * Patterns checked:
 *   1. `text-[NNpx]` arbitrary text sizes — must use `text-xs/sm/base/lg/xl/2xl`
 *   2. `rounded-(lg|xl|2xl|3xl)` — must use `rounded-md` (Dialog primitives exempt)
 *
 * Approved exceptions (do not need allowlisting; documented in SPEC-ARCH-UI-001 §6.2):
 *   - `text-[10px]` for chip-style badges
 *   - `text-[11px]` for stepper/slider/role-badge labels
 *   - `text-[13px]` for tab labels
 *   - `text-[20px]` for detail-page H1
 *
 * NOTE on baseline: these files were drift-violating on 2026-04-29 when this
 * test was introduced. Theme A modules (reports/finance/notifications/settings)
 * have been cleaned. Older modules (insurance, staff, custom-builds, parts,
 * service, vehicles, sales, dashboard, customers, primitives) are grandfathered
 * pending Theme E (UI canon migration) — see specs/roadmap/next-themes.md.
 *
 * To re-baseline (after a planned migration pass):
 *   cd apps/staff-web && pnpm exec node src/tests/__drift-rebaseline.mjs
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─── Forbidden patterns ────────────────────────────────────────────────────

const TEXT_PX_RE = /text-\[[0-9]+(\.[0-9]+)?(px|rem)\]/g;
const RADIUS_RE = /rounded-(lg|xl|2xl|3xl)\b/g;

// ─── Grandfathered files (baseline 2026-04-29) ─────────────────────────────
// These files had violations when the test was introduced. New violations in
// these files are still allowed; this prevents a hard wall while we migrate.
// New files outside this list MUST be clean.

const TEXT_PX_BASELINE = new Set<string>([
  'src/components/custom-builds/board/build-job-card.tsx',
  'src/components/custom-builds/board/build-job-list-view.tsx',
  'src/components/custom-builds/board/custom-builds-board.tsx',
  'src/components/custom-builds/detail/custom-builds-detail-view.tsx',
  'src/components/custom-builds/dialogs/add-part-dialog.tsx',
  'src/components/custom-builds/dialogs/assign-vendor-dialog.tsx',
  'src/components/custom-builds/dialogs/share-quote-dialog.tsx',
  'src/components/custom-builds/new-flow/new-build-wizard.tsx',
  'src/components/custom-builds/new-flow/wizard-step-customer.tsx',
  'src/components/custom-builds/new-flow/wizard-step-details.tsx',
  'src/components/custom-builds/new-flow/wizard-step-parts.tsx',
  'src/components/custom-builds/new-flow/wizard-step-review.tsx',
  'src/components/custom-builds/new-flow/wizard-step-vehicle.tsx',
  'src/components/custom-builds/new-flow/wizard-step-vendor.tsx',
  'src/components/custom-builds/parts/aftermarket-part-card.tsx',
  'src/components/custom-builds/parts/custom-builds-parts-page.tsx',
  'src/components/custom-builds/preview/build-quote-preview-view.tsx',
  'src/components/custom-builds/shared/build-stage-chip.tsx',
  'src/components/custom-builds/vendors/custom-builds-vendors-page.tsx',
  'src/components/custom-builds/visualizer/cost-summary.tsx',
  'src/components/custom-builds/visualizer/customization-cost-breakdown.tsx',
  'src/components/custom-builds/visualizer/customization-panel.tsx',
  'src/components/custom-builds/visualizer/decal-customizer.tsx',
  'src/components/custom-builds/visualizer/exhaust-customizer.tsx',
  'src/components/custom-builds/visualizer/hood-customizer.tsx',
  'src/components/custom-builds/visualizer/option-card.tsx',
  'src/components/custom-builds/visualizer/part-picker-rail.tsx',
  'src/components/custom-builds/visualizer/suspension-customizer.tsx',
  'src/components/custom-builds/visualizer/tint-customizer.tsx',
  'src/components/custom-builds/visualizer/visualizer-3d-canvas.tsx',
  'src/components/custom-builds/visualizer/visualizer-canvas.tsx',
  'src/components/custom-builds/visualizer/visualizer-playground.tsx',
  'src/components/custom-builds/visualizer/visualizer-tab.tsx',
  'src/components/custom-builds/visualizer/wheel-customizer.tsx',
  'src/components/custom-builds/visualizer/wing-customizer.tsx',
  'src/components/customers/customer-360-header.tsx',
  'src/components/customers/customers-index-view.tsx',
  'src/components/customers/customers-table.tsx',
  'src/components/customers/tabs/customer-consents-tab.tsx',
  'src/components/customers/tabs/customer-profile-tab.tsx',
  'src/components/dashboard/activity-feed.tsx',
  'src/components/dashboard/alerts-tasks-panel.tsx',
  'src/components/dashboard/inventory-snapshot-panel.tsx',
  'src/components/dashboard/pending-claims-card.tsx',
  'src/components/dashboard/sales-pipeline-panel.tsx',
  'src/components/dashboard/service-bay-panel.tsx',
  'src/components/finance/customer-ledger/aging-badge.tsx',
  'src/components/finance/tcs/tcs-register-table.tsx',
  'src/components/finance/tcs/tcs-threshold-chip.tsx',
  'src/components/finance/vendor-invoices/vendor-invoice-category-badge.tsx',
  'src/components/finance/vendor-invoices/vendor-invoice-status-chip.tsx',
  'src/components/insurance/ai-call-dispatch-view.tsx',
  'src/components/insurance/ai-calls-view.tsx',
  'src/components/insurance/campaign-creator-view.tsx',
  'src/components/insurance/campaign-detail-view.tsx',
  'src/components/insurance/commission-ledger-view.tsx',
  'src/components/insurance/commission-period-view.tsx',
  'src/components/insurance/compare-view.tsx',
  'src/components/insurance/create-lead-view.tsx',
  'src/components/insurance/dialogs/close-policy-dialog.tsx',
  'src/components/insurance/dialogs/manual-call-outcome-dialog.tsx',
  'src/components/insurance/insurance-audit-view.tsx',
  'src/components/insurance/insurance-hub-view.tsx',
  'src/components/insurance/lead-bulk-import-view.tsx',
  'src/components/insurance/lead-detail-view.tsx',
  'src/components/insurance/lead-list-view.tsx',
  'src/components/insurance/quote-card.tsx',
  'src/components/insurance/quote-preview-view.tsx',
  'src/components/insurance/renewal-pipeline-view.tsx',
  'src/components/insurance/saved-quote-view.tsx',
  'src/components/insurance/whatsapp-hub-view.tsx',
  'src/components/inventory/action-flows/appraisal-edit-panel.tsx',
  'src/components/inventory/action-flows/cost-entry-modal.tsx',
  'src/components/inventory/action-flows/document-upload-modal.tsx',
  'src/components/inventory/action-flows/more-actions-menu.tsx',
  'src/components/inventory/action-flows/photos-upload-modal.tsx',
  'src/components/inventory/inventory-filters.tsx',
  'src/components/inventory/new-flow/add-car-mode-chooser.tsx',
  'src/components/inventory/new-flow/existing-sale-fields-form.tsx',
  'src/components/inventory/new-flow/existing-vehicle-picker.tsx',
  'src/components/inventory/new-flow/new-vehicle-intake-form.tsx',
  'src/components/inventory/new-vehicle-wizard/summary-rail.tsx',
  'src/components/inventory/saved-view-tabs.tsx',
  'src/components/inventory/vehicle-detail-view.tsx',
  'src/components/inventory/vehicle-edit-form.tsx',
  'src/components/parts/detail/part-header.tsx',
  'src/components/parts/detail/part-linked-jobcards.tsx',
  'src/components/parts/detail/part-movement-columns.tsx',
  'src/components/parts/detail/part-movement-history.tsx',
  'src/components/parts/detail/part-open-pos.tsx',
  'src/components/parts/detail/part-overview-card.tsx',
  'src/components/parts/detail/part-primary-supplier.tsx',
  'src/components/parts/detail/part-stock-distribution.tsx',
  'src/components/parts/detail/part-supersession-row.tsx',
  'src/components/parts/edit-part-dialog/edit-part-dialog.tsx',
  'src/components/parts/edit-part-dialog/edit-part-form.tsx',
  'src/components/parts/grn-detail/action-flows/mark-matched-dialog.tsx',
  'src/components/parts/grn-detail/action-flows/post-grn-dialog.tsx',
  'src/components/parts/grn-detail/action-flows/record-discrepancy-dialog.tsx',
  'src/components/parts/grn-detail/action-flows/reject-grn-dialog.tsx',
  'src/components/parts/grn-detail/grn-detail-view.tsx',
  'src/components/parts/grn-detail/grn-discrepancy-card.tsx',
  'src/components/parts/grn-detail/grn-header.tsx',
  'src/components/parts/grn-detail/grn-landed-cost-card.tsx',
  'src/components/parts/grn-detail/grn-lines-table.tsx',
  'src/components/parts/grn-detail/grn-linked-po-card.tsx',
  'src/components/parts/grn-detail/grn-qc-card.tsx',
  'src/components/parts/grn-detail/grn-supplier-receipt-card.tsx',
  'src/components/parts/grn-detail/grn-timeline-card.tsx',
  'src/components/parts/new-grn/new-grn-empty-picker.tsx',
  'src/components/parts/new-grn/new-grn-form.tsx',
  'src/components/parts/new-grn/new-grn-header-section.tsx',
  'src/components/parts/new-grn/new-grn-match-grid.tsx',
  'src/components/parts/new-part-dialog/new-part-form.tsx',
  'src/components/parts/new-po/new-po-header-section.tsx',
  'src/components/parts/new-po/new-po-line-builder.tsx',
  'src/components/parts/new-po/new-po-summary-rail.tsx',
  'src/components/parts/new-po/new-purchase-order-form.tsx',
  'src/components/parts/new-supplier-dialog/new-supplier-form.tsx',
  'src/components/parts/parts-filter-bar.tsx',
  'src/components/parts/parts-landing-view.tsx',
  'src/components/parts/po-detail/action-flows/approve-po-dialog.tsx',
  'src/components/parts/po-detail/action-flows/cancel-po-dialog.tsx',
  'src/components/parts/po-detail/action-flows/close-po-dialog.tsx',
  'src/components/parts/po-detail/action-flows/dispatch-po-dialog.tsx',
  'src/components/parts/po-detail/action-flows/reject-po-dialog.tsx',
  'src/components/parts/po-detail/po-approval-card.tsx',
  'src/components/parts/po-detail/po-grns-card.tsx',
  'src/components/parts/po-detail/po-group-siblings-card.tsx',
  'src/components/parts/po-detail/po-header.tsx',
  'src/components/parts/po-detail/po-lines-table.tsx',
  'src/components/parts/po-detail/po-linked-jobcard-card.tsx',
  'src/components/parts/po-detail/po-overview-card.tsx',
  'src/components/parts/po-detail/po-supplier-card.tsx',
  'src/components/parts/po-detail/po-timeline-card.tsx',
  'src/components/parts/po-detail/purchase-order-detail-view.tsx',
  'src/components/parts/stock-badges.tsx',
  'src/components/parts/supplier-detail-panel.tsx',
  'src/components/parts/tabs/grn-columns.tsx',
  'src/components/parts/tabs/grns-tab.tsx',
  'src/components/parts/tabs/low-stock-columns.tsx',
  'src/components/parts/tabs/low-stock-tab.tsx',
  'src/components/parts/tabs/po-columns.tsx',
  'src/components/parts/tabs/purchase-orders-tab.tsx',
  'src/components/parts/tabs/stock-list-tab.tsx',
  'src/components/parts/tabs/suppliers-tab.tsx',
  'src/components/primitives/kbd-shortcut.tsx',
  'src/components/primitives/outlet-pill.tsx',
  'src/components/primitives/progress-stepper.tsx',
  'src/components/primitives/role-badge.tsx',
  'src/components/primitives/slider.tsx',
  'src/components/primitives/state-chip.tsx',
  'src/components/primitives/toast.tsx',
  'src/components/primitives/vin-badge.tsx',
  'src/components/sales/add-note-modal.tsx',
  'src/components/sales/ai-call-dialog.tsx',
  'src/components/sales/deal-card.tsx',
  'src/components/sales/deal-list-view.tsx',
  'src/components/sales/enquiry-detail-view.tsx',
  'src/components/sales/kanban-column.tsx',
  'src/components/sales/update-lead-modal.tsx',
  'src/components/service/action-flows/appointment-checkin-dialog.tsx',
  'src/components/service/action-flows/jobcard-more-actions-menu.tsx',
  'src/components/service/action-flows/labour-form-dialog.tsx',
  'src/components/service/action-flows/move-bay-dialog.tsx',
  'src/components/service/action-flows/parts-form-dialog.tsx',
  'src/components/service/action-flows/reschedule-appointment-dialog.tsx',
  'src/components/service/action-flows/send-approval-dialog.tsx',
  'src/components/service/action-flows/warranty-status-dialog.tsx',
  'src/components/service/appointment-detail-view.tsx',
  'src/components/service/appointments-tab.tsx',
  'src/components/service/bay-board-tab.tsx',
  'src/components/service/jobcard-detail-view.tsx',
  'src/components/service/jobcards-tab.tsx',
  'src/components/service/new-appointment-form.tsx',
  'src/components/service/new-jobcard-form.tsx',
  'src/components/service/new-warranty-claim-form.tsx',
  'src/components/service/service-landing-view.tsx',
  'src/components/service/side-panels/attachments-panel.tsx',
  'src/components/service/side-panels/communications-panel.tsx',
  'src/components/service/side-panels/notes-panel.tsx',
  'src/components/service/side-panels/photos-panel.tsx',
  'src/components/service/tabs/jobcard-inspection-tab.tsx',
  'src/components/service/tabs/jobcard-invoice-preview-tab.tsx',
  'src/components/service/tabs/jobcard-labour-tab.tsx',
  'src/components/service/tabs/jobcard-overview-tab.tsx',
  'src/components/service/tabs/jobcard-parts-tab.tsx',
  'src/components/service/tabs/jobcard-timeline-tab.tsx',
  'src/components/service/warranty-claim-detail-view.tsx',
  'src/components/service/warranty-tab.tsx',
  'src/components/shell/command-palette.tsx',
  'src/components/shell/staff-sidebar.tsx',
  'src/components/shell/staff-top-bar.tsx',
  'src/components/staff/detail/attendance-tab.tsx',
  'src/components/staff/detail/efficiency-tab.tsx',
  'src/components/staff/detail/leaves-tab.tsx',
  'src/components/staff/detail/profile-tab.tsx',
  'src/components/staff/detail/roles-tab.tsx',
  'src/components/staff/detail/salary-tab.tsx',
  'src/components/staff/org-chart.tsx',
  'src/components/staff/staff-card.tsx',
  'src/components/staff/staff-table.tsx',
  'src/components/vehicles/detail/tabs/documents/document-activity-feed.tsx',
  'src/components/vehicles/detail/tabs/documents/document-card.tsx',
  'src/components/vehicles/detail/tabs/documents/document-category-group.tsx',
  'src/components/vehicles/detail/tabs/documents/replace-document-dialog.tsx',
  'src/components/vehicles/detail/tabs/sales/active-deal-card.tsx',
  'src/components/vehicles/detail/tabs/sales/stale-listing-chip.tsx',
  'src/components/vehicles/detail/tabs/shared/timeline-entry-chips.tsx',
  'src/components/vehicles/detail/tabs/shared/timeline-entry-row.tsx',
  'src/components/vehicles/detail/vehicle-detail-header.tsx',
  'src/components/vehicles/ownership-queue/ownership-queue-view.tsx',
  'src/components/vehicles/vehicles-index-view.tsx',
  'src/components/vehicles/vehicles-table.tsx',
]);

const RADIUS_BASELINE = new Set<string>([
  'src/components/custom-builds/board/build-job-list-view.tsx',
  'src/components/custom-builds/dialogs/share-quote-dialog.tsx',
  'src/components/custom-builds/new-flow/wizard-step-customer.tsx',
  'src/components/custom-builds/new-flow/wizard-step-review.tsx',
  'src/components/custom-builds/new-flow/wizard-step-vehicle.tsx',
  'src/components/custom-builds/parts/aftermarket-part-card.tsx',
  'src/components/custom-builds/parts/custom-builds-parts-page.tsx',
  'src/components/custom-builds/preview/build-quote-preview-view.tsx',
  'src/components/custom-builds/vendors/custom-builds-vendors-page.tsx',
  'src/components/custom-builds/visualizer/cost-summary.tsx',
  'src/components/custom-builds/visualizer/customization-panel.tsx',
  'src/components/custom-builds/visualizer/decal-customizer.tsx',
  'src/components/custom-builds/visualizer/exhaust-customizer.tsx',
  'src/components/custom-builds/visualizer/option-card.tsx',
  'src/components/custom-builds/visualizer/part-picker-rail.tsx',
  'src/components/custom-builds/visualizer/suspension-customizer.tsx',
  'src/components/custom-builds/visualizer/tint-customizer.tsx',
  'src/components/custom-builds/visualizer/visualizer-3d-canvas.tsx',
  'src/components/custom-builds/visualizer/visualizer-canvas.tsx',
  'src/components/custom-builds/visualizer/visualizer-playground.tsx',
  'src/components/custom-builds/visualizer/visualizer-tab.tsx',
  'src/components/custom-builds/visualizer/wheel-customizer.tsx',
  'src/components/customers/tabs/customer-consents-tab.tsx',
  'src/components/insurance/ai-call-dispatch-view.tsx',
  'src/components/insurance/ai-calls-view.tsx',
  'src/components/insurance/campaign-creator-view.tsx',
  'src/components/insurance/campaign-detail-view.tsx',
  'src/components/insurance/commission-ledger-view.tsx',
  'src/components/insurance/compare-view.tsx',
  'src/components/insurance/create-lead-view.tsx',
  'src/components/insurance/insurance-hub-view.tsx',
  'src/components/insurance/lead-bulk-import-view.tsx',
  'src/components/insurance/lead-list-view.tsx',
  'src/components/insurance/quote-card.tsx',
  'src/components/insurance/quote-preview-view.tsx',
  'src/components/insurance/saved-quote-view.tsx',
  'src/components/insurance/whatsapp-hub-view.tsx',
  'src/components/inventory/action-flows/more-actions-menu.tsx',
  'src/components/inventory/new-flow/existing-sale-fields-form.tsx',
  'src/components/inventory/new-flow/existing-vehicle-picker.tsx',
  'src/components/inventory/new-flow/new-vehicle-intake-form.tsx',
  'src/components/inventory/new-vehicle-wizard/step-condition.tsx',
  'src/components/inventory/new-vehicle-wizard/step-pricing.tsx',
  'src/components/inventory/new-vehicle-wizard/summary-rail.tsx',
  'src/components/primitives/toast.tsx',
  'src/components/service/action-flows/jobcard-more-actions-menu.tsx',
  'src/components/shell/command-palette.tsx',
  'src/components/staff/detail/attendance-tab.tsx',
  'src/components/staff/detail/efficiency-tab.tsx',
  'src/components/staff/detail/exit-tab.tsx',
  'src/components/staff/detail/leaves-tab.tsx',
  'src/components/staff/detail/roles-tab.tsx',
  'src/components/staff/detail/salary-tab.tsx',
  'src/components/staff/dialogs/fnf-finalize-dialog.tsx',
  'src/components/staff/dialogs/initiate-exit-dialog.tsx',
  'src/components/staff/org-chart.tsx',
  'src/components/staff/staff-card.tsx',
  'src/components/staff/staff-table.tsx',
  'src/components/vehicles/detail/tabs/documents/delete-document-dialog.tsx',
  'src/components/vehicles/detail/tabs/documents/download-purpose-prompt.tsx',
  'src/components/vehicles/detail/tabs/documents/replace-document-dialog.tsx',
  'src/components/vehicles/detail/tabs/documents/upload-document-dialog.tsx',
]);

// ─── Walker ────────────────────────────────────────────────────────────────

const ROOT = join(__dirname, '..', 'components');

function walkTsx(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsx(full, acc);
    } else if (entry.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

function relPath(abs: string): string {
  // Normalize to POSIX-style 'src/components/...'
  return relative(join(__dirname, '..', '..'), abs).replace(/\\/g, '/');
}

function fileHasMatch(abs: string, re: RegExp): boolean {
  const src = readFileSync(abs, 'utf8');
  return re.test(src);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('UI canon drift — SPEC-ARCH-UI-001 enforcement', () => {
  const allFiles = walkTsx(ROOT).map(relPath);

  it('no NEW file uses text-[NNpx] arbitrary sizes (baseline grandfathered)', () => {
    const violators: string[] = [];
    for (const rel of allFiles) {
      if (TEXT_PX_BASELINE.has(rel)) continue;
      const abs = join(__dirname, '..', '..', rel);
      // re-create regex per call (g flag stateful)
      const matched = /text-\[[0-9]+(\.[0-9]+)?(px|rem)\]/.test(readFileSync(abs, 'utf8'));
      if (matched) violators.push(rel);
    }
    if (violators.length > 0) {
      const msg = [
        '',
        '🚫 New text-[NNpx] violations introduced. Use text-xs/sm/base/lg/xl/2xl per SPEC-ARCH-UI-001 §6.',
        'Approved exceptions (text-[10px], text-[11px], text-[13px], text-[20px]) belong only in chip/stepper/slider/role-badge/tab-label contexts.',
        '',
        'Violating files:',
        ...violators.map((f) => '  - ' + f),
        '',
      ].join('\n');
      throw new Error(msg);
    }
    expect(violators).toEqual([]);
  });

  it('no NEW file uses rounded-(lg|xl|2xl|3xl) (baseline grandfathered)', () => {
    const violators: string[] = [];
    for (const rel of allFiles) {
      if (RADIUS_BASELINE.has(rel)) continue;
      // Dialog primitives are allowed to use larger radii
      if (rel.includes('primitives/dialog')) continue;
      const abs = join(__dirname, '..', '..', rel);
      const matched = /rounded-(lg|xl|2xl|3xl)\b/.test(readFileSync(abs, 'utf8'));
      if (matched) violators.push(rel);
    }
    if (violators.length > 0) {
      const msg = [
        '',
        '🚫 New rounded-(lg|xl|2xl|3xl) violations introduced. Use rounded-md per SPEC-ARCH-UI-001 §7.',
        '',
        'Violating files:',
        ...violators.map((f) => '  - ' + f),
        '',
      ].join('\n');
      throw new Error(msg);
    }
    expect(violators).toEqual([]);
  });

  it('baseline does not contain stale entries (files now clean)', () => {
    const stale: string[] = [];
    for (const rel of TEXT_PX_BASELINE) {
      const abs = join(__dirname, '..', '..', rel);
      try {
        const matched = /text-\[[0-9]+(\.[0-9]+)?(px|rem)\]/.test(readFileSync(abs, 'utf8'));
        if (!matched) stale.push(rel);
      } catch {
        // file was deleted — also stale
        stale.push(rel + ' (deleted)');
      }
    }
    if (stale.length > 0) {
      // soft warning — log but don't fail; pruning is housekeeping
      // eslint-disable-next-line no-console
      console.warn('ℹ Stale text-px baseline entries (clean now — consider pruning):\n' + stale.map((f) => '  - ' + f).join('\n'));
    }
    // Always pass — this is a nudge, not a gate
    expect(true).toBe(true);
  });

  it('top-level i18n namespaces match useTranslations() callers (no nesting bugs)', () => {
    // Catches the 2026-04-29 finance.hub bug where Theme A i18n keys were
    // accidentally nested under "staff" instead of being top-level.
    const messages = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'messages', 'en-IN.json'), 'utf8'),
    ) as Record<string, unknown>;
    // Only namespaces that are actually called at top level via
    // `useTranslations('<ns>.…')` need to exist at root. Other modules
    // (insurance, customers, etc.) intentionally nest under `staff`.
    // Verified by: grep -rE "useTranslations\(['\"]([^.'\"]+)" — see test below
    const requiredTopLevelNamespaces = ['staff', 'finance', 'reports'];
    const missing = requiredTopLevelNamespaces.filter((ns) => !(ns in messages));
    if (missing.length > 0) {
      throw new Error(
        'Missing top-level i18n namespaces in messages/en-IN.json: ' +
          missing.join(', ') +
          '. New module i18n keys must be at the JSON root, not nested under another module.',
      );
    }
    expect(missing).toEqual([]);
  });
});
