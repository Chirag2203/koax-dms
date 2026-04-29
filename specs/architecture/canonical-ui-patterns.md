---
spec_id: SPEC-ARCH-UI-001
title: Canonical UI Patterns — Staff Surface
domain: architecture
status: approved
risk_level: low
pii_sensitivity: none
owners: [engineering-lead]
depends_on: []
created: 2026-04-29
last_updated: 2026-04-29
---

# SPEC-ARCH-UI-001 · Canonical UI Patterns — Staff Surface

> **Purpose.** This document is the single source of truth for every reusable UI primitive, layout rule, color rule, and interaction pattern used on the staff surface (`apps/staff-web`). Before building a new module, read this document in full. Before adding a new pattern, update this document first. Drift from this spec is a review-blocking defect.

---

## 1. Summary

The staff surface has converged on a coherent visual language across eight shipped modules (inventory, sales, service, parts, vehicles, customers, custom-builds, staff-management). That language is encoded in a set of shared primitives—most of them living under `apps/staff-web/src/components/primitives/` and a canonical shared-card file under `custom-builds/shared/detail-card.tsx`. Without a centralised spec, each new module risks introducing duplicated variants, arbitrary colors, and inconsistent interaction patterns.

This spec catalogs every canonical primitive extracted from the codebase, states the rules governing their use, and provides worked examples so that future modules can be built to the same bar without archaeology.

---

## 2. Locked Decisions

Locked decisions (L-prefixed) are recorded in module specs and referenced here for cross-cutting visibility. They cannot be changed without a spec amendment.

| Lock | Decision | Where set |
|------|----------|-----------|
| **L42** | `Slider` is the canonical range input. All `<input type="range">` must be replaced with `<Slider>`. | `SPEC-CUSTOM-BUILDS-001`; `primitives/slider.tsx` |
| **L45** | WhatsApp + AI Call contact buttons in detail-view headers, R09+ gated, activity-feed-logged. Pattern: `rounded-md border border-line bg-bg-surface h-9 px-4`. | `custom-builds-detail-view.tsx` L192–217; replicated in `insurance/lead-detail-view.tsx` |
| **L48** | Sales-canon button: same class set as L45. | Established alongside L45 in `SPEC-VEHICLES-003`. |
| **L49** | Contact buttons use `Gate` for RBAC gating—not manual role-string checks. | `custom-builds-detail-view.tsx` L194, L205 |
| **L50** | Slider track progress via inline `style` gradient; thumb via CSS pseudo-elements (`[&::-webkit-slider-thumb]`). No overlay or hidden-input tricks. | `primitives/slider.tsx` L91–143 |

---

## 3. Primitive Catalog

### 3.1 Card

**File:** `apps/staff-web/src/components/custom-builds/shared/detail-card.tsx`
*(Also locally duplicated—but derivatively identical—in `staff/detail/profile-tab.tsx` and rendered inline in `customers/tabs/customer-profile-tab.tsx`. The shared file is the import to use.)*

**Props contract:**

```ts
{
  title: string;
  children: ReactNode;
  rightSlot?: ReactNode;   // edit button, badge, CTA — anything ≤ 32px tall
}
```

**Canonical class set:**

```tsx
<div className="rounded-md border border-line bg-bg-surface p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
    {rightSlot}
  </div>
  {children}
</div>
```

**Usage rules:**

- Import from `@/src/components/custom-builds/shared/detail-card` — never copy-paste the definition into a new file.
- `title` is always `text-sm font-semibold text-ink-primary`. Do not override it.
- `rightSlot` is optional. When used for an edit trigger, the trigger must be `text-xs text-ink-muted hover:text-accent` with a Pencil icon at 11px.
- A Card wraps a single logical group of fields (e.g., "Employment", "Contact", "Job Details"). Never nest Cards.
- `p-6` is fixed. Do not change to `p-4` or `p-8`.
- `border-line` (not `border-line-strong`, not an arbitrary hex). `bg-bg-surface` (not `bg-bg-subtle`, not `bg-bg-canvas`).

**Do / Don't:**

```tsx
// DO — correct import and rightSlot usage
import { Card, Field } from '@/src/components/custom-builds/shared/detail-card';

<Card title="Employment" rightSlot={<EditButton />}>
  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
    <Field label="Department" value={staff.department} />
  </dl>
</Card>

// DON'T — copy-pasting the primitive locally
function LocalCard({ title, children }) {
  return <div className="rounded-md border border-gray-200 bg-white p-5">{children}</div>;
  //                                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ arbitrary values
}

// DON'T — wrong padding or border
<div className="rounded-md border border-line bg-bg-surface p-4">
  //                                                          ^^ wrong — p-6 is canonical
```

---

### 3.2 Field (read-only dt/dd)

**File:** `apps/staff-web/src/components/custom-builds/shared/detail-card.tsx`

**Props contract:**

```ts
{
  label: string;
  value: ReactNode;   // renders '—' if null/undefined
}
```

**Canonical markup:**

```tsx
<div>
  <dt className="text-xs text-ink-muted uppercase tracking-wider">{label}</dt>
  <dd className="text-sm text-ink-primary mt-1">{value ?? '—'}</dd>
</div>
```

**Usage rules:**

- Always used inside a `<dl>` grid. The canonical grid is `grid grid-cols-2 gap-x-6 gap-y-4`.
- Label is `text-xs text-ink-muted uppercase tracking-wider`. Never use `text-[10px]` or `text-[11px]` for labels. `text-xs` (12px per token scale) is the floor.
- Value is `text-sm text-ink-primary`. For monospaced content (VINs, amounts, IDs), add `font-mono` and `tabular-nums` to the value element, not to the `dd`.
- When a field contains a link, the `<a>` or `<Link>` must be `text-accent hover:underline`.
- Null/undefined values render as `—` (em dash) automatically; pass `null` — do not pass an empty string.
- The `masked` variant (staff-profile-tab pattern) adds a `<Lock>` icon from lucide-react at `h-3 w-3 text-ink-muted` immediately after the value; it signals PII restriction to the viewer.

**Do / Don't:**

```tsx
// DO — standard field
<Field label="Outlet" value="Bangalore (BLR)" />

// DO — monospaced value
<Field
  label="VIN"
  value={<span className="font-mono text-xs">{vehicle.vin}</span>}
/>

// DON'T — never override label typography inline
<dt className="text-[11px] text-gray-400 uppercase">Outlet</dt>

// DON'T — don't pass empty string for missing data
<Field label="Exit Date" value={staff.exitDate || ''} />
// DO
<Field label="Exit Date" value={staff.exitDate ?? null} />
```

---

### 3.3 EditableField (edit-in-place)

**File:** `apps/staff-web/src/components/staff/detail/profile-tab.tsx` (local to that module; pattern to replicate, not to import directly unless extracted)

**Props contract:**

```ts
{
  label: string;
  value: string;
  onSave: (newVal: string) => void;
  canEdit: boolean;
  type?: 'text' | 'email' | 'tel';
}
```

**Usage rules:**

- `canEdit` must be derived from a role check or `Gate`-level permission—never hardcoded `true`.
- The edit trigger (pencil icon) is `opacity-0 group-hover:opacity-100 focus-visible:opacity-100`—invisible at rest, revealed on hover or focus. The parent div must be `className="group"`.
- Inline input: `h-8 px-2 rounded-md border border-line bg-bg-canvas text-sm focus:ring-2 focus:ring-accent`.
- On Enter → save; on Escape → cancel. Both keys handled via `onKeyDown`.
- Confirm button: `Check` icon, `text-success`; Cancel button: `X` icon, `text-ink-muted`.

**When to use edit-in-place vs a Dialog:**  
See §12 (Form patterns).

---

### 3.4 StatTile

**File:** `apps/staff-web/src/components/custom-builds/detail/tabs/overview-tab.tsx` (L39–52)

**Canonical markup:**

```tsx
<div className="rounded-md border border-line bg-bg-surface p-4">
  <p className="text-xs text-ink-muted uppercase tracking-wider">{label}</p>
  <div className="mt-2">{value}</div>
</div>
```

**Usage rules:**

- StatTile is a **smaller variant of Card**: same `rounded-md border border-line bg-bg-surface` but `p-4` instead of `p-6`.
- Rendered in a `grid grid-cols-2 md:grid-cols-4 gap-4` KPI row at the top of a detail tab.
- The `value` slot is freeform—commonly a mono amount, a `<BuildStageChip>`, or a count.
- KPI values displayed as amounts use `font-mono text-base text-ink-primary tabular-nums`.
- Maximum 4 tiles per row (md breakpoint). If you need more than 4, split into two rows or promote to a Card with a data table.
- Do not add a `rightSlot`—StatTile has no header/action affordance by design.

**Do / Don't:**

```tsx
// DO — canonical KPI row
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <StatTile label="Stage"      value={<BuildStageChip stage={job.stage} />} />
  <StatTile label="Quote Total" value={<p className="font-mono text-base tabular-nums">{formatINR(job.quoteTotal)}</p>} />
  <StatTile label="Days Open"  value={<p className="font-mono text-base tabular-nums">{days}d</p>} />
  <StatTile label="Parts"      value={<p className="font-mono text-base tabular-nums">{job.parts.length}</p>} />
</div>

// DON'T — wrong padding
<div className="rounded-md border border-line bg-bg-surface p-6">  {/* p-6 is Card, not StatTile */}
```

---

### 3.5 Dialog

**File:** `apps/staff-web/src/components/primitives/dialog.tsx`

**Props contract:**

```ts
export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';   // defaults 'md'
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdrop?: boolean;   // defaults true
  dirty?: boolean;             // true = show "discard changes?" alert on close
}
```

**Size map:**

| Prop | max-width |
|------|-----------|
| `sm` | 480px |
| `md` | 560px (default) |
| `lg` | 720px |

**Usage rules:**

- Shell is `rounded-xl` (see §7 — `rounded-xl` is the **exception** that is approved for full-viewport overlay containers).
- Backdrop is `bg-black/60 backdrop-blur-sm z-50`.
- `dirty={true}` when the Dialog contains a form with unsaved state; this intercepts the close action and shows a nested `AlertDialog` asking "Discard changes?".
- `footer` slot renders in `px-6 py-4 border-t border-line flex justify-end gap-2`. Put primary CTA last (rightmost).
- Motion: `initial={{ opacity: 0, scale: 0.96 }}` animate to `opacity:1 scale:1` at 160ms ease-out. Respects `prefers-reduced-motion`—animation is skipped when the media query matches.
- Focus is trapped inside the dialog while open. ESC closes.
- `aria-labelledby="dialog-title"` is set automatically; do not override.

**Do / Don't:**

```tsx
// DO — standard form dialog
<Dialog
  open={open}
  onClose={handleClose}
  title="Edit Contact Details"
  dirty={form.isDirty}
  footer={
    <>
      <button onClick={handleClose} className="...secondary...">Cancel</button>
      <button onClick={handleSubmit} className="...primary...">Save</button>
    </>
  }
>
  {/* form fields */}
</Dialog>

// DON'T — use a Dialog for a simple destructive confirmation
// Use AlertDialog instead (see §3.6)

// DON'T — add rounded-xl to a non-overlay component
<div className="rounded-xl border border-line bg-bg-surface p-6">
  {/* This is a Card — use rounded-md */}
```

---

### 3.6 AlertDialog (with type-to-confirm)

**File:** `apps/staff-web/src/components/primitives/dialog.tsx`

**Props contract:**

```ts
export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;        // defaults 'Cancel'
  destructive?: boolean;       // true = red confirm button + AlertTriangle icon
  onConfirm: () => void;
  requireTypeToConfirm?: string;  // e.g. 'CANCEL' — user must type this string
}
```

**Usage rules:**

- Use `AlertDialog` (not `Dialog`) for any one-click, irreversible action (cancel, delete, revoke).
- `destructive={true}` must be set for all actions that cannot be undone.
- `requireTypeToConfirm` is required when the action is **permanent and affects external state** (e.g., cancelling a build job, deleting a document, revoking a consignor agreement). The string to type should be an uppercase noun that clearly describes the action: `"CANCEL"`, `"DELETE"`, `"REVOKE"`.
- `requireTypeToConfirm` is optional (can be omitted) for soft-irreversible actions that can be recovered via the activity feed or admin intervention.
- When `destructive=true`, the footer layout is reversed (`flex-row-reverse`) so the destructive button is on the left—this is a deliberate friction mechanism.
- `z-index` is `z-[60]` (one layer above `Dialog` at `z-50`) to enable the nested dirty-close pattern.

**Type-to-confirm threshold:**

| Action | `requireTypeToConfirm` |
|--------|------------------------|
| Cancel a build job | `"CANCEL"` |
| Delete a document | `"DELETE"` |
| Revoke an agreement | `"REVOKE"` |
| Remove a part from estimate | Not required |
| Reject a warranty claim | Not required |
| Dismiss a banner | Not required |

**Do / Don't:**

```tsx
// DO — permanent destructive action
<AlertDialog
  open={showCancelDialog}
  onClose={() => setShowCancelDialog(false)}
  title="Cancel Build Job?"
  description={`This will cancel "${job.title}" permanently. This cannot be undone.`}
  confirmLabel="Cancel Job"
  cancelLabel="Keep Job"
  destructive
  requireTypeToConfirm="CANCEL"
  onConfirm={handleCancel}
/>

// DON'T — use AlertDialog for informational confirmations
// Use Dialog with a footer instead.

// DON'T — omit requireTypeToConfirm on a permanent, customer-facing action
<AlertDialog
  destructive
  confirmLabel="Delete Customer Record"
  onConfirm={deleteCustomer}
  // ^ missing requireTypeToConfirm — this would delete data with a single click
```

---

### 3.7 SlideInPanel

**File:** `apps/staff-web/src/components/primitives/slide-in-panel.tsx`

**Props contract:**

```ts
export interface SlideInPanelProps {
  open: boolean;
  onClose: () => void;
  width?: '40%' | '50%' | '60%';   // defaults '40%'
  title?: string;
  children: React.ReactNode;
}
```

**Usage rules:**

- SlideInPanel slides in from the right edge, over the page content.
- Backdrop is `bg-black/40 z-40`. Panel itself is `z-50`.
- Panel background is `bg-bg-canvas` (not `bg-bg-surface`)—it is treated as a sub-page, not a card.
- `min-w-[320px]` is enforced regardless of the `width` prop.
- Use for: **multi-field forms that do not require a title-bar close affordance** (e.g., the visualizer fullscreen in custom-builds, the parts-picker detail, onboarding wizards).
- Do not use for: simple confirmations (use `AlertDialog`) or small supplementary info (use `Dialog` sm).
- The panel header (`border-b border-line px-6 py-4`) is rendered only when `title` is provided. When omitted, the body must provide its own header.
- Motion: slides from `x: 100%` to `x: 0` at 160ms `[0.4, 0, 0.2, 1]` ease. Respects `prefers-reduced-motion`.
- ESC closes; backdrop click closes.

**Do / Don't:**

```tsx
// DO — multi-step form
<SlideInPanel open={open} onClose={onClose} title="Onboard New Vehicle" width="50%">
  <ProgressStepper steps={STEPS} currentIndex={step} />
  {/* step content */}
</SlideInPanel>

// DON'T — nested SlideInPanel inside a SlideInPanel
// DON'T — use SlideInPanel for a destructive confirmation
```

---

### 3.8 ProgressStepper

**File:** `apps/staff-web/src/components/primitives/progress-stepper.tsx`

**Props contract:**

```ts
export interface StepperStep { id: string; label: string; }

export interface ProgressStepperProps {
  steps: StepperStep[];
  currentIndex: number;
  className?: string;
}
```

**Step states:**

| State | Circle | Label |
|-------|--------|-------|
| Past (`index < current`) | `bg-success text-white` + Check icon | `text-ink-secondary` |
| Current (`index === current`) | `bg-accent text-white ring-4 ring-accent/20` | `font-semibold text-ink-primary` |
| Future (`index > current`) | `border-2 border-line bg-bg-canvas text-ink-muted` + number | `text-ink-muted` |

**Usage rules:**

- Use inside `SlideInPanel` or at the top of a create-wizard Dialog.
- Labels use `text-[11px]` — an explicit exception to the ban on pixel sizes; the stepper is a compact nav element where `text-xs` (12px) causes overflow at 6+ steps.
- The connector line between steps is `bg-success` when the preceding step is past, `bg-line` otherwise.
- `currentIndex` is zero-based. Pass the current step number, not a string.

---

### 3.9 Slider

**File:** `apps/staff-web/src/components/primitives/slider.tsx`

**Props contract:**

```ts
export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}
```

**Usage rules (L42, L50):**

- This is the **only** range input on the staff surface. Replace any raw `<input type="range">` with `<Slider>`.
- Track progress is rendered via inline `style` gradient: `linear-gradient(to right, accent 0% pct%, line pct% 100%)`. Do not use a custom CSS class for this—the gradient must be dynamic.
- Thumb is styled via `[&::-webkit-slider-thumb]` and `[&::-moz-range-thumb]`—no hidden-input overlay (L50).
- Label row shows `text-[11px] font-medium text-ink-muted uppercase tracking-wider` — another explicit exception to the pixel-size rule; this matches the label-sm token (11px).
- Value display uses `font-mono text-[11px] text-ink-secondary tabular-nums` with `aria-live="polite"`.
- `Home`/`End` keys jump to `min`/`max` respectively (arrow keys are natively handled by the browser).

---

### 3.10 Gate (RBAC primitive)

**File:** `apps/staff-web/src/components/primitives/gate.tsx`

**Props contract:**

```ts
export interface GateProps {
  role?: string | string[];        // any match grants access
  outlet?: string;                 // user must have this outlet or 'all'
  permission?: string;             // user.permissions must include this string
  fallback?: 'hide' | 'disable' | 'tooltip';   // defaults 'hide'
  tooltipMessage?: string;
  children: ReactNode;
}
```

**Usage rules:**

- `Gate` replaces all manual `if (user.role === 'R09')` guards in JSX. See §11 for full RBAC rules.
- `fallback="hide"` (default) renders `null` for unauthorized users—use this for CTAs that unauthorized users should not know exist.
- `fallback="disable"` renders the child with `disabled` and `aria-disabled="true"` at 40% opacity—use when the feature's existence should be visible but inaccessible (e.g., a locked tab header).
- `fallback="tooltip"` is `fallback="disable"` plus a `title` attribute with the reason—use for interactive tutorials or onboarding flows.
- Pass an array to `role` when multiple roles share the same permission level: `role={['R09', 'R10', 'R12', 'R19', 'R22', 'R24']}`.
- A wildcard permission (`*`) in `user.permissions` bypasses all checks—this is for the CEO/super-admin role (R24).
- `Gate` consumes `useStaffAuth` internally. Do not read `user` outside Gate and re-check roles redundantly.

**Do / Don't:**

```tsx
// DO — wrapping a CTA
<Gate role={['R09', 'R10', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
  <button onClick={() => setWhatsAppOpen(true)} aria-label={`Send WhatsApp to ${customer.name}`}>
    <MessageCircle className="h-4 w-4" /> WhatsApp
  </button>
</Gate>

// DO — disabled tab with tooltip
<Gate role="R12" fallback="tooltip" tooltipMessage="Requires Finance role (R12+)">
  <TabButton label="Cost Ledger" />
</Gate>

// DON'T — manual role check in JSX
{user?.role === 'R12' && <CostLedgerTab />}

// DON'T — double-gate (Gate already checks; the inner condition is redundant)
<Gate role="R12">
  {user?.role === 'R12' && <CostLedgerTab />}
</Gate>
```

---

### 3.11 ToastContainer + useToast

**Files:**
- `apps/staff-web/src/components/primitives/toast.tsx`
- `apps/staff-web/src/hooks/use-toast.ts`

**Hook API:**

```ts
const { toasts, toast, dismiss } = useToast();

// Signature
toast(message: string, variant?: ToastVariant, duration?: number): string
// variant: 'success' | 'error' | 'warning' | 'info'
// duration: ms before auto-dismiss; defaults 3500
```

**Usage rules:**

- Place `<ToastContainer toasts={toasts} onDismiss={dismiss} />` at the top of the component that owns the `useToast` hook—typically the tab root or detail view root.
- Never place `ToastContainer` inside a Dialog or SlideInPanel—the fixed positioning (`bottom-6 right-6 z-[100]`) means it will appear above everything regardless of its DOM parent, but its lifecycle is tied to the parent component. Place it in the highest stable ancestor within the route.
- Toast is `rounded-lg border border-line-strong bg-bg-surface` — note `rounded-lg` here is an **approved exception** for the notification pill (see §7).
- Every store action that can fail (try/catch) must surface either a success or error toast. Silent no-ops are a defect.
- Icon/color mapping:

| Variant | Icon | Color token |
|---------|------|-------------|
| `success` | `CheckCircle2` | `text-[rgb(var(--state-listed))]` |
| `error` | `AlertCircle` | `text-state-danger` |
| `warning` | `AlertTriangle` | `text-[rgb(var(--state-stale))]` |
| `info` | `Info` | `text-accent` |

**Do / Don't:**

```tsx
// DO — toast on action
const { toasts, toast, dismiss } = useToast();

const handleSave = () => {
  try {
    store.save(data);
    toast('Changes saved', 'success');
  } catch (e) {
    toast(e instanceof Error ? e.message : 'Save failed', 'error');
  }
};

// DO — container placement
return (
  <div className="p-6 space-y-6">
    <ToastContainer toasts={toasts} onDismiss={dismiss} />
    {/* ... rest of tab */}
  </div>
);

// DON'T — silent success (no feedback to user)
store.save(data);
setEditingNotes(false);  // closes edit mode but user has no confirmation

// DON'T — custom toast implementation
<div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded">
  Saved!
</div>
```

---

### 3.12 StateChip

**File:** `apps/staff-web/src/components/primitives/state-chip.tsx`

**Props contract:**

```ts
export interface StateChipProps {
  status: StateChipStatus;
  label?: string;       // override display label
  className?: string;
}
```

**Canonical markup:**

```tsx
<span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest {config.chip}">
  <span className="inline-block h-1.5 w-1.5 rounded-full {config.dot}" aria-hidden="true" />
  {displayLabel}
</span>
```

**Usage rules:**

- `StateChip` uses `rounded` (the 4px `radius.sm` token), not `rounded-md`. This is intentional—chips are tighter than cards.
- `text-[10px]` is an explicit exception to the pixel-size ban for chip labels; it matches the `label-sm` token (11px is the floor for chip legibility, 10px is used here for compactness at `tracking-widest`).
- The color combination is always `bg-[state-color/0.1] text-[state-color]`—a 10% opacity background with full-opacity text. Never invert this.
- The `label` override is for domain-specific renaming (e.g., `status="crit-safety"` with `label="Critical"`).
- `aria-label="Status: {displayLabel}"` is set on the outer span automatically.
- For new domain statuses, add them to `StateChipStatus` and `STATUS_CONFIG` in `state-chip.tsx`—do not create a local chip variant.

**InlineChip (customer-profile-tab pattern):**
`customer-profile-tab.tsx` uses an `InlineChip` local component with the same class set as `StateChip` (minus the dot). This is acceptable only for lifecycle/segment chips that map directly to customer-specific state tokens. For all other status chips, use `StateChip`.

---

### 3.13 VinBadge

**File:** `apps/staff-web/src/components/primitives/vin-badge.tsx`

**Props contract:**

```ts
{
  vin: string;
  masked?: boolean;     // shows first-9 + '•••' + last-4
  size?: 'sm' | 'md';  // defaults 'md'
  className?: string;
}
```

**Usage rules:**

- Always use `VinBadge` wherever a VIN is displayed—never render a raw monospaced string.
- `masked={true}` when the viewer's role does not have R19+ and the vehicle is confidential (per `SPEC-VEHICLES-002`).
- The copy-to-clipboard button is built in. Do not add a separate copy button next to `VinBadge`.
- Outer shell: `rounded-md bg-bg-subtle px-2 py-1`. Size `md` VIN text is `text-[13px]`; size `sm` is `text-[11px]`.

---

### 3.14 RoleBadge

**File:** `apps/staff-web/src/components/primitives/role-badge.tsx`

**Props contract:**

```ts
{
  roleCode: string;    // e.g. 'R09'
  roleName?: string;   // e.g. 'Sales Executive'
  size?: 'sm' | 'md';
  className?: string;
}
```

Shell: `rounded-md bg-bg-subtle px-2 py-0.5 border border-line`. Role code: `font-mono font-semibold text-ink-primary`. Role name: `text-ink-muted`.

---

### 3.15 OutletPill

**File:** `apps/staff-web/src/components/primitives/outlet-pill.tsx`

Shell: `rounded-md bg-bg-subtle font-mono text-[11px] uppercase text-ink-secondary`. When `crossOutlet={true}`, adds `ring-1 ring-accent` to signal cross-outlet context (R19+ access pattern).

---

## 4. Banner Patterns

Banners communicate page-level states that require user attention but do not block interaction. They live inside the tab body, above the card grid.

### 4.1 Warning / Error Banner (state-overdue)

Used for: finance approval pending, QC failed, overdue tasks, destructive-adjacent states.

```tsx
<div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]">
  <AlertTriangle
    size={18}
    className="text-[rgb(var(--state-overdue))] flex-shrink-0 mt-0.5"
    aria-hidden="true"
  />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-ink-primary">Banner Title</p>
    <p className="text-xs text-ink-secondary mt-0.5">Supporting detail text.</p>
  </div>
  {/* optional CTA */}
  <button className="shrink-0 h-8 px-3 rounded bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    Take Action
  </button>
</div>
```

Real instances: finance approval banner in `overview-tab.tsx` L154–173; QC failed banner in `overview-tab.tsx` L176–196.

### 4.2 Info Banner (state-pending)

Used for: awaiting document upload, optional steps not yet completed.

```tsx
<div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-pending)/0.08)] border border-[rgb(var(--state-pending)/0.3)]">
  <Info size={18} className="text-[rgb(var(--state-pending))] flex-shrink-0 mt-0.5" aria-hidden="true" />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-ink-primary">Banner Title</p>
    <p className="text-xs text-ink-secondary mt-0.5">Detail.</p>
  </div>
</div>
```

### 4.3 Success Banner (state-listed)

Used for: finance approved, CPO certification complete, onboarding step confirmed.

```tsx
<div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-listed)/0.08)] border border-[rgb(var(--state-listed)/0.3)]">
  <CheckCircle2 size={18} className="text-[rgb(var(--state-listed))] flex-shrink-0 mt-0.5" aria-hidden="true" />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-ink-primary">Banner Title</p>
    <p className="text-xs text-ink-secondary mt-0.5">Detail.</p>
  </div>
</div>
```

### 4.4 Banner rules

- `p-4 rounded-md` is fixed. Do not use `p-6` (that is Card) or `rounded-lg`.
- Background opacity is `0.08`; border opacity is `0.3`. These values are hard-coded in the class string because Tailwind JIT cannot produce arbitrary alpha from CSS vars without the inline pattern.
- Icon is always `size={18}` (`h-[18px] w-[18px]`), `flex-shrink-0 mt-0.5`, `aria-hidden="true"`.
- Optional CTA inside the banner must be `h-8 px-3 rounded bg-accent text-white text-xs font-medium` — not a full `h-9` button.
- One banner per state; do not stack multiple warning banners. If two conditions exist simultaneously, show the higher-severity one.

**Token reference for banner state colors:**

| Token (CSS var) | Hex (dark) | Semantic meaning |
|-----------------|------------|-----------------|
| `--state-overdue` | `#DC2626` | Error / overdue / danger |
| `--state-pending` | `#D97706` | Warning / awaiting action |
| `--state-listed` | `#10B981` | Success / active / healthy |
| `--state-reserved` | `#B45309` | Caution / in-process |
| `--state-refurb` | `#1E40AF` | Informational / in-refurb |
| `--state-stale` | `#4B5563` | Inactive / stale / neutral |
| `--state-sold` | `#7C3AED` | Terminal positive / sold |
| `--state-cpo` | `#059669` | Certified / premium |

> Note: `state-danger` is defined in `@dms/tokens`'s `staffTokens` but is **not** emitted as a CSS custom property in `globals.css`. Use `--state-overdue` as the error/danger color token in CSS-var contexts. `state-danger` is available as a Tailwind utility class (`text-state-danger`, `bg-state-danger`) via the preset because it is mapped to `rgb(var(--state-danger) / alpha)`, but the CSS var itself must be emitted by the consuming app's global CSS to resolve. Do not use `state-danger` without confirming the CSS var is defined in scope.

---

## 5. Tab Bar Pattern

All detail views use a URL-driven tab bar:

```tsx
<div
  className="flex items-end gap-0 mt-4 border-b border-line -mb-px overflow-x-auto"
  role="tablist"
>
  {TABS.map((t) => (
    <button
      key={t.key}
      role="tab"
      id={`tab-${t.key}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${t.key}`}
      className={cn(
        'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        isActive
          ? 'border-accent text-accent'
          : 'border-transparent text-ink-secondary hover:text-ink-primary',
        inaccessible && 'opacity-40 cursor-not-allowed',
      )}
    >
      {t.label}
    </button>
  ))}
</div>
```

- Active tab: `border-accent text-accent`.
- Inactive tab: `border-transparent text-ink-secondary hover:text-ink-primary`.
- Inaccessible tab (RBAC-locked): `opacity-40 cursor-not-allowed` + `disabled={true}` + `title` tooltip.
- `text-[13px]` is an explicit exception for tab labels (between `text-xs` at 12px and `text-sm` at 14px).
- The corresponding panel must have `role="tabpanel"`, `id="tabpanel-{key}"`, `aria-labelledby="tab-{key}"`.

---

## 6. Typography Rules

### 6.1 Permitted Tailwind text-size classes on the staff surface

| Class | Token equiv | Use |
|-------|-------------|-----|
| `text-xs` | 12px `body-xs` | Field labels, sub-labels, caption text |
| `text-sm` | 14px `label-lg` approx | Field values, body copy, button text |
| `text-base` | 15px `body-md` | KPI values in StatTile, primary data figures |
| `text-lg` | 18px `body-lg` | Section headings, modal titles (rarely) |
| `text-xl` | 20px | Page-level h1 (detail view title) |
| `text-2xl` | 24px | Reserved for dashboard hero numbers |

### 6.2 Explicit pixel-size exceptions

The following `text-[NNpx]` classes are approved in specific contexts and must not be used elsewhere:

| Pixel size | Component | Reason |
|------------|-----------|--------|
| `text-[10px]` | `StateChip` label | Chip compactness; matches `label-sm` token |
| `text-[11px]` | `ProgressStepper` label, Slider label/value, `RoleBadge` sm, `OutletPill` | Sub-caption elements where `text-xs` causes overflow |
| `text-[13px]` | Tab bar labels, `VinBadge` md text | Between xs and sm; tab compactness |
| `text-[20px]` | Detail-view `h1` | Non-standard heading between `text-lg` and `text-xl` |
| `text-[12px]` / `text-[10px]` | Audit diff entries (`profile-tab`) | Dense data; these are diff-text rows only |

**Rule: any `text-[NNpx]` class outside this table is a lint defect.** Use the canonical Tailwind scale class instead.

---

## 7. Border Radius Rules

| Value | When to use | Example |
|-------|-------------|---------|
| `rounded` | `StateChip`, inline chips | Status badges |
| `rounded-md` | **Canonical default.** Cards, StatTiles, banners, buttons, form inputs, VinBadge, RoleBadge, OutletPill, tab buttons | Everything |
| `rounded-lg` | Toast notification pill (`ToastItem`) | Approved exception for notification affordance |
| `rounded-xl` | `Dialog` and `AlertDialog` modal shells | Approved exception for full-viewport overlay containers |
| `rounded-full` | Avatar circles, dot indicators in StateChip/ProgressStepper, `bg-state-danger/10` icon ring in AlertDialog | Circular elements only |

**`rounded-xl` is banned for any non-overlay component.** If you find `rounded-xl` on a card, banner, or button, it is a defect.

**`rounded-lg` is banned outside Toast.** Use `rounded-md` for everything else.

---

## 8. Spacing Rules

| Context | Rule |
|---------|------|
| Card body padding | `p-6` (24px) — fixed, not overridable |
| StatTile / banner padding | `p-4` (16px) — fixed |
| Field dt/dd grid | `grid grid-cols-2 gap-x-6 gap-y-4` — fixed column gap (24px) and row gap (16px) |
| Tab body | `p-6 space-y-6` — 24px outer + 24px between sections |
| Dialog body | `p-6` |
| Dialog header | `px-6 py-4` |
| Dialog footer | `px-6 py-4` |
| SlideInPanel header | `px-6 py-4` |
| StatTile grid | `grid grid-cols-2 md:grid-cols-4 gap-4` |
| Card grid | `grid grid-cols-1 md:grid-cols-2 gap-6` (for 2-column layouts) |
| Button gap in action bar | `gap-3` |
| Dialog footer button gap | `gap-2` |

---

## 9. Color Rules

Only `@dms/tokens` semantic color names (mapped to CSS custom properties via `globals.css` and the Tailwind preset) are permitted. No arbitrary hex values, no arbitrary RGB, no Tailwind palette colors (e.g., `gray-200`, `blue-500`).

### 9.1 Permitted semantic color tokens

**Backgrounds:**

| Token | Role |
|-------|------|
| `bg-canvas` | App chrome, page background |
| `bg-surface` | Cards, panels, modals, tables |
| `bg-subtle` | Alternate rows, secondary panels, pill backgrounds (VinBadge, RoleBadge, OutletPill) |
| `bg-hover` | Button/row hover state |
| `bg-active` | Selected row or pressed state |

**Ink (text):**

| Token | Role |
|-------|------|
| `ink-primary` | Primary text, headings, values |
| `ink-secondary` | Supporting text, inactive tab labels |
| `ink-muted` | Labels, captions, placeholders |
| `ink-subtle` | Placeholder text, invisible-at-rest affordances |

**Borders:**

| Token | Role |
|-------|------|
| `line` | Row dividers, card borders, input borders at rest |
| `line-strong` | Panel borders, modal borders, toast borders |

**Accent:**

| Token | Role |
|-------|------|
| `accent` | CTAs, focus rings, active tab indicator, links, slider thumb |
| `accent-hover` | CTA hover |
| `accent-subtle` | Tinted accent backgrounds (rarely used) |

**State (for status chips, banners, state indicators):**  
See §4.4 table above. All consumed via `rgb(var(--state-*))` inline pattern or `text-[rgb(var(--state-*))]`.

**Success / Warning / Danger:**  
`success`, `warning`, and `danger` Tailwind classes are available via the preset but rely on CSS vars (`--success`, `--warning`, `--danger`) that must be explicitly emitted by the app. On the staff surface these are used in `ProgressStepper` (`bg-success`), `EditableField` (`text-success`), and `AlertDialog` (`bg-state-danger`, `text-state-danger`). Use them only where they are already established—do not introduce `success`/`warning`/`danger` tokens in new contexts without confirming the var is defined.

### 9.2 Prohibited color patterns

```tsx
// DON'T — arbitrary hex
<div className="bg-[#141414]">   // use bg-bg-surface

// DON'T — Tailwind palette color
<div className="bg-gray-800">    // use bg-bg-canvas or bg-bg-surface

// DON'T — arbitrary RGB without CSS var
<div className="bg-[rgb(20,20,20)]">  // use bg-bg-surface

// DON'T — hardcoded banner color
<div className="bg-red-50 border-red-200">  // use the state-overdue pattern
```

The single intentional exception is the `#25D366` WhatsApp green on the WhatsApp button text (L45). This is a brand color with no token equivalent and is approved only for that one element.

---

## 10. Toast vs Dialog Decision Rules

| Situation | Use |
|-----------|-----|
| Action succeeded (save, assign, advance stage) | `toast('...', 'success')` |
| Action failed with a recoverable error | `toast('...', 'error')` |
| Background process started (not blocking) | `toast('...', 'info')` |
| One-click irreversible action (cancel, delete) | `AlertDialog` with `destructive` |
| Form with multiple fields, dirty state | `Dialog` with `dirty={form.isDirty}` |
| Gathering input before a destructive action | `AlertDialog` with `requireTypeToConfirm` |
| Confirming a recoverable action (reassign, archive) | `AlertDialog` without `requireTypeToConfirm` |
| Showing a large form for a sub-resource | `SlideInPanel` |

**Never show a Dialog to present a success state.** Toasts are the success feedback mechanism. Dialogs are for input-gathering only.

---

## 11. RBAC Gate Usage

Full role matrix is in Doc 14. Summarized gate rules for UI:

| Gate scenario | Implementation |
|---------------|---------------|
| Completely hide a CTA | `<Gate role={[...]} fallback="hide">` |
| Show CTA but disabled | `<Gate role={...} fallback="disable">` |
| Show locked tab with tooltip | `<Gate role="R12" fallback="tooltip" tooltipMessage="...">` |
| Blur-and-lock a full tab panel | Manual check + blurred placeholder div (see cost-ledger pattern in `custom-builds-detail-view.tsx` L262–270) |
| PII masking | `maskedContactFor()` helper + `masked` prop on `Field`; not a Gate concern |

Gate is client-side only. All store actions and server routes must enforce RBAC independently.

---

## 12. Form Patterns

Three interaction modes exist. Choose based on the form complexity and reversibility:

| Mode | When to use | Primitives |
|------|-------------|-----------|
| **Edit-in-place** | Single field, reversible, low-friction (name, phone, notes) | `EditableField` in `profile-tab.tsx` |
| **Dialog** | 3–8 fields, moderate complexity, reversible (assign vendor, update pricing) | `Dialog` with `dirty` prop |
| **SlideInPanel** | Multi-step, creation wizard, or feature-rich form (onboard vehicle, create build job) | `SlideInPanel` + `ProgressStepper` |

**Shared form input class (for fields inside Dialog/SlideInPanel):**

```tsx
// Standard text input
"h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary
 placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"

// Textarea
"w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary
 placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
```

**Validation error state:** add `border-state-danger` to the input; render `<p className="text-xs text-state-danger mt-1">{error}</p>` beneath it. Do not use `border-red-500` or `text-red-600`.

**Button heights:**

| Context | Height |
|---------|--------|
| Primary/secondary CTA in action bars and card footers | `h-9` (36px) |
| Small CTA inside banners or inline edit | `h-8` (32px) |
| Icon-only utility buttons (copy, edit pencil) | no explicit height; padding-based |

---

## 13. Accessibility Checklist

Every component and page must satisfy this checklist before marking a phase complete.

### 13.1 Focus rings

- The global `*:focus-visible` rule in `globals.css` sets `ring-2 ring-focus-ring ring-offset-2 ring-offset-bg-canvas` on all focusable elements. Do not override this unless the element has a custom ring already set.
- Buttons with custom focus rings must use `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`—note `focus-visible:` (not `focus:`).

### 13.2 Keyboard navigation

- `Dialog` and `SlideInPanel` implement full focus traps (see `trapFocus` in `dialog.tsx`). ESC always closes.
- `Dialog` restores focus to the trigger element on close (consumer responsibility—save a ref to the trigger before opening).
- Tab bar uses `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`, `aria-controls`, `aria-labelledby`.
- `ProgressStepper` uses `<nav aria-label="Progress">` with `aria-current="step"` on the active step.

### 13.3 Reduced motion

- `Dialog` and `AlertDialog` check `window.matchMedia('(prefers-reduced-motion: reduce)')` and suppress animation props when true.
- `SlideInPanel` animation uses `transition: { duration: 0.16 }` with Framer Motion's `AnimatePresence`. To honor `prefers-reduced-motion`, wrap the `motion` props in the same pattern: check the media query; pass empty objects when it matches.
- `Slider` thumb uses `[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150` — CSS transitions, not JS animations; honored automatically by the browser.

### 13.4 Screen reader labels

- All icon-only buttons must have `aria-label` (e.g., `aria-label="Close dialog"`, `aria-label="Copy VIN"`).
- Icons that are decorative must have `aria-hidden="true"`.
- `VinBadge` copy button uses dynamic label: `aria-label={copied ? 'VIN copied' : 'Copy VIN'}`.
- `StateChip` outer span sets `aria-label="Status: {displayLabel}"`.
- `Slider` sets `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-label`.
- `Toast` items use `role="status"` and `aria-live="polite"`.
- `AlertDialog` uses `role="alertdialog"` with `aria-labelledby` and `aria-describedby`.

### 13.5 Color contrast

- All `ink-*` on `bg-*` combinations in the dark theme meet WCAG AA (4.5:1 for body, 3:1 for large text).
- State chip text-on-background combinations (`text-[state-*]` on `bg-[state-*/0.1]`) should be verified against the light theme—the dark theme's opacity-based backgrounds are lighter than expected.
- Do not rely solely on color to convey status—always pair with a text label or icon.

---

## 14. Spec Drift Prevention

### 14.1 Adding a new pattern

1. **Update this spec first.** A PR adding a new UI pattern without updating this spec will be rejected at review.
2. Add the primitive entry to §3 (or a new section if warranted) with: props contract, canonical markup, usage rules, do/don't examples.
3. Add any new color token to §9.1 or §4.4.
4. Add any new `text-[NNpx]` exception to §6.2.
5. Add any new `rounded-*` exception to §7.

### 14.2 Modifying an existing primitive

1. If the change affects the props contract (adding/removing a prop), the spec must be updated before the code change.
2. If the change is purely visual (color tweak, spacing tweak), update the spec in the same PR.
3. If the change aligns with a locked decision (L-number), the lock must be explicitly amended.

### 14.3 Auditing for drift

Run a search for these drift signals periodically:

```
# Arbitrary hex in className
grep -r 'className=.*#[0-9a-fA-F]{3,6}' apps/staff-web/src

# Tailwind palette colors (not tokens)
grep -rE 'className=.*(gray|red|green|blue|yellow|purple|indigo)-[0-9]' apps/staff-web/src

# Arbitrary pixel sizes (not in the approved exceptions list)
grep -rE 'text-\[[0-9]+px\]' apps/staff-web/src

# rounded-xl outside dialog
grep -r 'rounded-xl' apps/staff-web/src --include="*.tsx" | grep -v dialog.tsx

# rounded-lg outside toast
grep -r 'rounded-lg' apps/staff-web/src --include="*.tsx" | grep -v toast.tsx
```

---

## 15. Worked Example: Vendor Reassignment Feature

This section shows every primitive and rule applied to a hypothetical "Vendor Reassignment" feature—a dialog for reassigning a build job's vendor, accessible to R10+.

```tsx
// File: apps/staff-web/src/components/custom-builds/dialogs/reassign-vendor-dialog.tsx

'use client';

import { useState } from 'react';
import { Dialog } from '@/src/components/primitives/dialog';
import { Gate } from '@/src/components/primitives/gate';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import type { CustomBuildVendor } from '@dms/types';

interface ReassignVendorDialogProps {
  open: boolean;
  onClose: () => void;
  vendors: CustomBuildVendor[];
  currentVendorId?: string;
  onReassign: (vendorId: string, reason: string) => void;
}

export function ReassignVendorDialog({
  open,
  onClose,
  vendors,
  currentVendorId,
  onReassign,
}: ReassignVendorDialogProps) {
  const [vendorId, setVendorId] = useState(currentVendorId ?? '');
  const [reason, setReason] = useState('');
  const { toasts, toast, dismiss } = useToast();

  const isDirty = vendorId !== (currentVendorId ?? '') || reason !== '';

  const handleSubmit = () => {
    if (!vendorId) {
      toast('Please select a vendor', 'error');
      return;
    }
    try {
      onReassign(vendorId, reason);
      toast('Vendor reassigned', 'success');     // toast — not a Dialog confirmation
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Reassignment failed', 'error');
    }
  };

  return (
    <>
      {/* ToastContainer at stable ancestor — this component IS the ancestor here */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/*
        Gate wraps the entire dialog trigger in the parent; the dialog itself
        is rendered regardless so we don't lose it on role change mid-open.
        The CTA in the detail view is gated:

        <Gate role={['R10', 'R12', 'R19', 'R22', 'R24']} fallback="hide">
          <button onClick={() => setOpen(true)}>Reassign Vendor</button>
        </Gate>
      */}

      <Dialog
        open={open}
        onClose={onClose}
        title="Reassign Vendor"
        subtitle="Change the vendor assigned to this build job."
        size="sm"                     // 480px — appropriate for a 2-field form
        dirty={isDirty}               // intercepts close if user has touched a field
        footer={
          <>
            {/* Cancel left, primary right — standard footer order */}
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Reassign
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Vendor selector */}
          <div>
            <label
              htmlFor="vendor-select"
              className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
            >
              Vendor
            </label>
            <select
              id="vendor-select"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="h-10 w-full bg-bg-subtle border border-line rounded-md px-3 text-sm text-ink-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">Select vendor…</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Reason textarea */}
          <div>
            <label
              htmlFor="reason-input"
              className="block text-xs text-ink-muted uppercase tracking-wider mb-1.5"
            >
              Reason (optional)
            </label>
            <textarea
              id="reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-line bg-bg-subtle px-3 py-2 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
              placeholder="Explain why the vendor is being changed…"
              aria-label="Reason for reassignment"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
```

**Pattern checklist for this example:**

- `Dialog` used (not a custom modal) — `rounded-xl` comes for free.
- `dirty={isDirty}` set — ESC / backdrop-click intercepts if user has touched fields.
- `size="sm"` — 2-field form does not need `md`.
- Footer: cancel (secondary) left, submit (primary) right, both `h-9 rounded-md`.
- Toast on success; toast on error — no Dialog-within-Dialog for success state.
- Label typography: `text-xs text-ink-muted uppercase tracking-wider` — matches Field label.
- Input: `h-10 w-full bg-bg-subtle border border-line rounded-md` — canonical form input.
- Textarea: `rounded-md border border-line bg-bg-subtle ... resize-none` — canonical.
- Gate applied in the parent view (not shown here) to hide the trigger button for R09 and below.
- No arbitrary hex, no Tailwind palette colors, no `rounded-xl` on inputs.

---

---

## 17. Error handling (locked 2026-04-29)

### Why this section exists

Until 2026-04-29 a single uncaught error in any module crashed the whole
staff-web shell — sidebar, top bar, and all other modules went blank.
The Finance module's Zustand object-selector infinite-render bug exposed
this; a customer using `/dashboard` would see the entire app go white if
they had previously visited `/finance`. This is unacceptable for a
multi-module CRM where operators depend on partial functionality even
when a module is mid-rollout.

### Layered architecture

| Layer | File | Catches | Renders |
|---|---|---|---|
| **L1 Global** | `app/global-error.tsx` | Errors that escape L2 + errors in `app/layout.tsx` itself | Standalone HTML page (no provider tree) |
| **L2 Shell** | `app/(shell)/error.tsx` | Errors in the `(shell)` layout but not caught by a module boundary | Sidebar + top bar preserved; `<ModuleErrorFallback moduleName="this page" />` |
| **L3 Module** | `app/(shell)/<module>/error.tsx` | Errors anywhere in a single module's route subtree | Sidebar + top bar preserved; `<ModuleErrorFallback moduleName="<DisplayName>" />` |
| **L4 Component** | Manual class `<ErrorBoundary>` | Specific risky widgets (3D canvas, external embeds) | Inline error chip with retry within the section |

### L1 — Global error boundary

App Router replaces the root layout when this fires, so the file MUST
render its own `<html>` and `<body>`. No provider tree (no IntlProvider,
theme, auth, store hydrators). Markup is fully inline-styled to avoid
depending on the @dms/tokens CSS that might not have loaded.

Body shows: error message (dev only) or digest hash (prod), "Try again"
button calling `reset()`, and a "Go to dashboard" link.

### L2 — Shell-level error boundary

Catches errors in providers (auth, theme), command palette, top bar.
Sidebar and top bar are already rendered (the shell layout completed
before the error). The fallback replaces the main content area only.

Renders `<ModuleErrorFallback moduleName="this page" />` — the user sees
they can navigate elsewhere via the still-functional sidebar.

### L3 — Module-level error boundaries (THE primary defence)

Every module under `app/(shell)/` MUST have an `error.tsx` at its route
root. Without one, errors bubble up to L2 and the user loses module
context.

Canonical template (paste verbatim):

```tsx
'use client';
import { ModuleErrorFallback } from '@/src/components/primitives/module-error-fallback';

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ModuleErrorFallback
      moduleName="<DisplayName>"
      error={error}
      reset={reset}
    />
  );
}
```

`<DisplayName>` matches the sidebar nav label (e.g., `"Custom Builds"`,
`"Sale Inventory"` — not the slug).

### L4 — In-component class boundary (rare)

Only when a specific widget should fail without affecting the rest of the
module. Example: 3D visualizer crashing on a missing GLB shouldn't kill
the Build Job detail page's Overview/Parts/Activity tabs.

Canonical 30-line implementation lives at
`apps/staff-web/src/components/primitives/error-boundary.tsx` (TODO —
ship this when the first widget needs it; not in v1 scope).

### Canonical fallback component

`apps/staff-web/src/components/primitives/module-error-fallback.tsx`:

- Card-style border (`rounded-md border border-line bg-bg-surface p-6`)
- AlertCircle icon (lucide) in a `bg-state-danger/10` rounded badge
- H1: "Something went wrong in {moduleName}"
- Body: "The rest of the app is still working..."
- Error details: full `error.message` in dev; `digest` hash in prod
- Two CTAs: "Try again" (Button primary) + "Back to dashboard" (Link with
  canonical secondary recipe)

### Enforcement

`apps/staff-web/src/tests/error-boundaries.test.ts` runs 6 checks on
every `pnpm test`:

1. Every shell module has `error.tsx`
2. Every `error.tsx` imports `ModuleErrorFallback`
3. `(shell)/error.tsx` exists
4. `global-error.tsx` exists with `<html>` + `<body>`
5. Every `error.tsx` has `'use client'` as first directive
6. (Future) ModuleErrorFallback prop `moduleName` is non-empty

CI/test-suite blocks merges that violate any check.

### Telemetry hook (v1 stub, v1.5 wire-up)

`ModuleErrorFallback` calls `console.error('[<module>] module crashed:', error)`
in a `useEffect`. Per Doc 12 §observability, v1.5 wires this to a Sentry
or Datadog capture. v1 ships console-only — operators can grab the
digest hash to share with support.

---

## 18. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-04-29 | Initial spec authored from codebase audit of 8 shipped modules | SPEC-ARCH-UI-001 |
| 2026-04-29 | §17 Error handling added — 4-layer boundary architecture, ModuleErrorFallback primitive, error-boundaries.test.ts enforcement (6 checks). Triggered by 2026-04-29 Finance crash that took down the whole shell. | SPEC-ARCH-UI-001 |
