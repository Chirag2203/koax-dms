// Evolved exports — owned-vehicle-card now accepts OwnedVehicleView
export { OwnedVehicleCard } from './owned-vehicle-card';
export type { OwnedVehicleCardProps } from './owned-vehicle-card';

// New grid wrapper
export { OwnedVehiclesGrid } from './owned-vehicles-grid';

// Claim flow
export { ClaimCta } from './claim-cta';
export { ClaimForm } from './claim-form';
export { AutoMatchFeedback } from './auto-match-feedback';

// My Claims
export { MyClaimsList } from './my-claims-list';

// Lifetime detail view
export { LifetimeVehicleView } from './lifetime-vehicle-view';
export { LifetimeHeader } from './lifetime-header';
export { GraceBanner } from './grace-banner';
export { SelfRevokeDialog } from './self-revoke-dialog';
export { ExportPdfButton } from './export-pdf-button';

// Tabs
export { OverviewTab } from './tabs/overview-tab';
export { ServiceTab } from './tabs/service-tab';
export { DocumentsTab } from './tabs/documents-tab';
export { TimelineTab } from './tabs/timeline-tab';
export { CpoTab } from './tabs/cpo-tab';

// ── Deleted (absorbed into tabs): ────────────────────────────────────────────
// service-timeline.tsx  → tabs/service-tab.tsx
// vehicle-documents.tsx → tabs/documents-tab.tsx
// vehicle-info-header.tsx → lifetime-header.tsx
