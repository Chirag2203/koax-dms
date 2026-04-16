# 01 · Design System — Luxury Pre-Owned DMS

Authoritative design system for the DMS product. Two surfaces, one token foundation.

- **Customer surface** combines Direction 01 Editorial Luxury (default light mode) with Direction 05 Dark Premium (dark mode + "collection" moments).
- **Staff surface** uses Direction 03 Modern Product Interface.

Both share type family pairings, spacing scale, motion grammar, and iconography primitives. They diverge in density, chrome, color expression, and motion intensity.

All tokens in this document are authoritative. The TypeScript source of truth lives at `/packages/tokens/src/`. Any token change must land in both places in the same PR.

---

## 1. Brand primitives

### 1.1 Voice & tone
- **Confident.** We sell cars to people who already know what they want.
- **Quiet.** We don't shout. We don't use exclamation marks.
- **Crafted.** Every word, every margin, every transition is intentional.
- **Precise.** Specs, history, and paperwork are stated, never implied.
- **Warm-formal.** We are formal but not cold. "Arrange a viewing," not "Book now."

### 1.2 Typographic system
Two families across both surfaces:
- **Display (Serif)** — Playfair Display. Used for customer-surface headlines, hero titles, section openers, and collection-mode moments.
- **Text (Sans)** — Inter. Used for all UI, body copy, buttons, labels, tables, forms. Entire staff surface is Inter-only.
- **Monospace** — IBM Plex Mono. Used for VIN, registration numbers, invoice numbers, IDs, keyboard shortcuts, and financial figures where tabular alignment matters.

No third family. Typography is the primary design element — we do not add flair via extra faces.

### 1.3 Type scale

Modular scale with a 1.25 ratio (minor third). Base size 16px.

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `display-2xl` | 96/1.00 | 0.96 | 400 | Customer hero-1 (serif) |
| `display-xl` | 72/1.05 | 1.05 | 400 | Customer hero-2 (serif) |
| `display-lg` | 56/1.1 | 1.1 | 400 | Customer section opener (serif) |
| `display-md` | 40/1.15 | 1.15 | 400 | Customer page title (serif) |
| `display-sm` | 32/1.2 | 1.2 | 400 | Card hero (serif) |
| `heading-xl` | 28/1.25 | 1.25 | 600 | Staff page title |
| `heading-lg` | 22/1.3 | 1.3 | 600 | Section heading |
| `heading-md` | 18/1.4 | 1.4 | 600 | Subsection |
| `heading-sm` | 16/1.4 | 1.4 | 600 | Card heading |
| `body-lg` | 18/1.55 | 1.55 | 400 | Customer body copy |
| `body-md` | 15/1.55 | 1.55 | 400 | Default body |
| `body-sm` | 13/1.5 | 1.5 | 400 | Secondary text |
| `body-xs` | 12/1.45 | 1.45 | 400 | Meta text, captions |
| `label-lg` | 14/1.2 | 1.2 | 500 | Form labels, dense UI |
| `label-md` | 12/1.2 | 1.2 | 500 | Table headers, chip labels |
| `label-sm` | 11/1.2 | 1.2 | 500 | Eyebrow, kicker (uppercase + 0.14em letter-spacing) |
| `mono-md` | 13/1.4 | 1.4 | 400 | VIN, invoice numbers |
| `mono-sm` | 11/1.35 | 1.35 | 400 | Keyboard shortcuts, IDs |

Letter-spacing: display styles `-0.02em`; heading styles `-0.01em`; labels `+0.02em` to `+0.14em` for uppercase small caps.

### 1.4 Spacing scale

4px base grid. No fractional spacing except at sub-pixel for hairlines.

```
space-0:     0px
space-1:     4px
space-2:     8px
space-3:    12px
space-4:    16px
space-5:    20px
space-6:    24px
space-8:    32px
space-10:   40px
space-12:   48px
space-16:   64px
space-20:   80px
space-24:   96px
space-32:  128px
space-40:  160px
space-48:  192px
```

Customer surface leans on 24–96 for layout rhythm. Staff surface leans on 4–16 for density.

### 1.5 Radius

```
radius-none:  0px     (default for Editorial Luxury — sharp corners)
radius-xs:    2px     (subtle softening)
radius-sm:    4px     (staff chips, inputs)
radius-md:    6px     (staff buttons, cards)
radius-lg:   12px     (customer cards, modals)
radius-xl:   20px     (customer hero blocks)
radius-full: 9999px   (avatars, circular buttons)
```

### 1.6 Elevation

Shadow scale. Customer surface uses warm-tinted shadows; staff surface uses neutral.

```
elevation-0:  none
elevation-1:  0 1px 2px rgba(10, 10, 10, 0.04)
elevation-2:  0 2px 8px rgba(10, 10, 10, 0.06), 0 1px 2px rgba(10, 10, 10, 0.04)
elevation-3:  0 8px 24px rgba(10, 10, 10, 0.08), 0 2px 4px rgba(10, 10, 10, 0.04)
elevation-4:  0 16px 48px rgba(10, 10, 10, 0.12), 0 4px 8px rgba(10, 10, 10, 0.06)
```

Dark-mode shadows become borders-plus-glow; no drop shadow on pure black surfaces.

### 1.7 Motion grammar

All easing uses a custom curve, not browser defaults.

```
ease-standard:  cubic-bezier(0.2, 0, 0, 1)      // entering
ease-exit:      cubic-bezier(0.4, 0, 1, 1)      // exiting
ease-emphasize: cubic-bezier(0.2, 0, 0, 1.1)    // notable moments
ease-spring:    cubic-bezier(0.5, 1.8, 0.5, 1)  // attention flags (sparingly)
```

Duration tokens:

| Token | ms | Use |
|---|---|---|
| `duration-instant` | 0 | Prefers-reduced-motion |
| `duration-fast` | 120 | Staff hover, focus, active |
| `duration-quick` | 160 | Staff confirmations |
| `duration-medium` | 240 | Customer hover, reveals |
| `duration-slow` | 400 | Customer section reveals |
| `duration-deliberate` | 640 | Customer hero reveals |
| `duration-cinematic` | 1000 | Collection-mode scroll-tied hero |

`prefers-reduced-motion: reduce` forces all durations to `instant` and disables scroll-tied motion.

---

## 2. Customer surface — tokens

Editorial Luxury (default light) + Dark Premium (dark).

### 2.1 Color — light (Editorial)

| Token | Hex | Role |
|---|---|---|
| `bg-paper` | `#faf7f0` | Primary background (warm paper) |
| `bg-elevated` | `#ffffff` | Cards, modals |
| `bg-subtle` | `#f2ede2` | Section alternation |
| `bg-hover` | `#ede7d7` | Subtle hover surface |
| `ink-primary` | `#0e0d0b` | Primary text (near-black) |
| `ink-secondary` | `#4a463d` | Secondary text |
| `ink-muted` | `#78705f` | Meta, captions |
| `ink-subtle` | `#a19882` | Placeholder, disabled |
| `accent` | `#8a6a3d` | Brass — editorial accent |
| `accent-hover` | `#725730` | Brass hover |
| `accent-subtle` | `#e8dcc2` | Accent-tinted backgrounds |
| `line` | `#e6dfd0` | Dividers, hairlines |
| `line-strong` | `#c8bfa8` | Emphasized borders |
| `focus-ring` | `#8a6a3d` | Focus outline (brass) |
| `success` | `#4a7a3d` | Olive-green (not bright) |
| `warning` | `#a87a28` | Amber-brass |
| `danger` | `#8a3d3d` | Muted oxblood |

### 2.2 Color — dark (Dark Premium)

| Token | Hex | Role |
|---|---|---|
| `bg-paper` | `#0c0c0d` | Primary background |
| `bg-elevated` | `#15151a` | Cards, modals |
| `bg-subtle` | `#1a1a1f` | Section alternation |
| `bg-hover` | `#222228` | Hover surface |
| `ink-primary` | `#ede5d4` | Warm cream |
| `ink-secondary` | `#b9b0a0` | Secondary text |
| `ink-muted` | `#8a8272` | Meta |
| `ink-subtle` | `#5a5448` | Disabled |
| `accent` | `#c89b5a` | Brass (brighter for contrast) |
| `accent-hover` | `#d8ae74` | Brass hover |
| `accent-subtle` | `#3a2f1e` | Accent-tinted dark bg |
| `line` | `#2a2927` | Dividers |
| `line-strong` | `#3f3d38` | Emphasized |
| `focus-ring` | `#c89b5a` | Focus (brass) |
| `success` | `#6a9a4d` |  |
| `warning` | `#c89b5a` |  |
| `danger` | `#c86a6a` |  |

### 2.3 Customer surface — typography application

- Hero and section-opener use serif display (Playfair Display), italic for emphasis.
- Body always Inter.
- All-caps used rarely, only for small eyebrow labels with letter-spacing 0.16–0.24em.
- Quote marks are curly, not straight.
- Ellipsis uses `…`, not three dots.
- Numbers in context of money use tabular-nums.

### 2.4 Customer surface — layout

- 12-column grid on desktop (≥1024px), 8-column on tablet, 4-column on mobile.
- Max content width 1280px. Editorial content narrower (680px) for reading.
- Generous vertical rhythm — sections separated by 96–160px on desktop.
- Mobile-first: every page must be usable at 375px width.

### 2.5 Customer surface — imagery rules

- Every vehicle has a minimum of 20 photos: 5 exterior (front 3/4, rear 3/4, side profile, wheel detail, badge), 5 interior (dashboard, seats, rear cabin, cargo, roof), 5 detail (keys, paperwork, service record, VIN plate, odometer), 5 optional (owner story, location, drive-away, close-ups).
- All photography is studio-or-location quality. No dealer-lot phone shots on customer surface.
- Photos served as AVIF with WebP fallback. Three sizes: hero (2400w), card (1200w), thumbnail (600w).
- Color-adjusted per shot for consistency; paint color rendered accurately.

### 2.6 Customer surface — motion rules

- Scroll-tied hero reveals (500–1000ms).
- Fade-up for content blocks as they enter viewport.
- No carousel auto-advance. User-initiated only.
- No parallax unless explicitly approved per moment.
- Page transitions: 240ms cross-fade.
- Respect `prefers-reduced-motion`.

---

## 3. Staff surface — tokens

Modern Product Interface. Desktop-first. Keyboard-first. Dark-mode is the shipped default.

### 3.1 Color — light

| Token | Hex | Role |
|---|---|---|
| `bg-canvas` | `#fbfbfa` | App background |
| `bg-surface` | `#ffffff` | Cards, tables |
| `bg-subtle` | `#f4f4f3` | Alternating rows, subtle panels |
| `bg-hover` | `#ececea` | Hover |
| `bg-active` | `#e0e0dd` | Selected row |
| `ink-primary` | `#0a0a0a` |  |
| `ink-secondary` | `#4a4a4a` |  |
| `ink-muted` | `#6b7280` |  |
| `ink-subtle` | `#9ca3af` | Placeholder |
| `accent` | `#2563eb` | Action blue |
| `accent-hover` | `#1d4ed8` |  |
| `accent-subtle` | `#eff6ff` |  |
| `line` | `#ececea` | Row dividers |
| `line-strong` | `#d4d4d0` | Panel borders |
| `focus-ring` | `#2563eb` |  |
| `state-listed` | `#10b981` / bg `#ecfdf5` |  |
| `state-reserved` | `#b45309` / bg `#fffbeb` |  |
| `state-refurb` | `#1e40af` / bg `#eff6ff` |  |
| `state-stale` | `#4b5563` / bg `#f3f4f6` |  |
| `state-sold` | `#7c3aed` / bg `#faf5ff` |  |

### 3.2 Color — dark (default for staff)

| Token | Hex | Role |
|---|---|---|
| `bg-canvas` | `#0a0a0a` |  |
| `bg-surface` | `#141414` |  |
| `bg-subtle` | `#1a1a1a` |  |
| `bg-hover` | `#222222` |  |
| `bg-active` | `#2a2a2a` |  |
| `ink-primary` | `#ededed` |  |
| `ink-secondary` | `#a3a3a3` |  |
| `ink-muted` | `#737373` |  |
| `ink-subtle` | `#525252` |  |
| `accent` | `#3b82f6` |  |
| `accent-hover` | `#60a5fa` |  |
| `accent-subtle` | `#172554` |  |
| `line` | `#262626` |  |
| `line-strong` | `#404040` |  |
| `focus-ring` | `#3b82f6` |  |
| State chips as light-mode with adjusted bg opacity |  |  |

### 3.3 Staff surface — typography application

- Inter UI only. No serif.
- IBM Plex Mono for VINs, IDs, invoice numbers, file paths, keyboard shortcuts.
- Tabular nums on: prices, quantities, percentages, dates, times.
- Dense: 12–14px base for table rows; 15px for primary body.
- Uppercase eyebrow labels max 11px, letter-spacing 0.06em.

### 3.4 Staff surface — layout

- App shell: left sidebar nav (220px collapsible to 56px) + top command bar + main canvas.
- Tables are first-class. Every list view has: column config, saved views, keyboard selection, row-level actions.
- Command palette (⌘K) is always one keystroke away.
- Detail panels slide in from right (40–60% viewport width) rather than full-page navigation where possible.

### 3.5 Staff surface — motion rules

- 80–160ms only.
- No scroll-tied motion.
- Action confirmations: subtle scale/fade on button click.
- Panel slide-ins: 160ms ease-standard.
- Table row insertion/deletion: 120ms fade.
- Success states: 240ms pulse once.

---

## 4. Component inventory

Shared primitives. Each component has both surface variants where applicable.

### 4.1 Primitives
- Button (variants: primary, secondary, ghost, destructive, link)
- IconButton
- Input (text, number, password, search)
- Textarea
- Select (single, multi, searchable)
- Combobox
- Checkbox
- Radio
- Switch
- Slider
- DatePicker (Indian date format by default; i18n-aware)
- DateRangePicker
- TimePicker
- NumberInput (with currency ₹ mode and tabular nums)
- PhoneInput (India +91 locked; E.164 validated)
- PANInput (format validated)
- GSTINInput (format validated)
- FileUpload (single, multi, drag-drop)
- Avatar

### 4.2 Surfaces
- Card
- Panel
- Dialog / Modal
- Drawer
- Sheet (slide-up mobile)
- Popover
- Tooltip
- Toast / Notification

### 4.3 Navigation
- TopBar (customer vs staff variants)
- Sidebar (staff)
- Breadcrumb
- Tabs
- Stepper
- Pagination

### 4.4 Data display
- Table (sortable, filterable, selectable, keyboard nav)
- DataList (definition list)
- Stat
- Badge / Chip
- Progress (linear, circular)
- Skeleton
- EmptyState
- Timeline
- KanbanBoard (for RO board, deal pipeline)

### 4.5 Forms
- Form (RHF + Zod wrapper)
- FormField
- FormError
- FormSection

### 4.6 Feedback
- Alert
- Banner
- Callout
- ConfirmDialog

### 4.7 Domain-specific components
- VehicleCard (customer card, staff row, storefront feature)
- PriceDisplay (with EMI, on-road breakdown)
- GSTBreakdown (CGST/SGST/IGST/TCS split)
- VINBadge (mono + copy-to-clipboard)
- StateChip (Listed / Reserved / Refurb / Stale / Sold / Certified etc.)
- CPOBadge (180-point certified badge)
- WhatsAppButton (with consent gate)
- OTPInput (6-digit)
- AadhaarConsentFlow
- DigiLockerConnectFlow
- KYCChecklist
- RoleBadge
- OutletPill
- CustomerAvatarCard
- VehicleSpecTable
- ServiceScheduleCard
- ROStatusPill
- InvoicePreview
- IRNBadge

### 4.8 Accessibility non-negotiables

Every component ships with:
- Keyboard support (tab, arrows, esc, enter, space as appropriate)
- Focus-visible ring using the surface's focus-ring token
- ARIA roles and labels
- Screen-reader-only helper text where visual meaning is implicit
- Color-contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI components (WCAG 2.1 AA; some AAA targets where easy)
- Touch target ≥ 44×44 px on touch devices (Android/iOS)
- Error messages associated with inputs via aria-describedby

---

## 5. Content & microcopy principles

- Write sentences, not commands. "Arrange a viewing" not "BOOK NOW".
- No exclamation marks in UI copy outside of explicit celebration moments (delivery confirmation).
- Indian numbering with grouping (`12,45,000` for lakhs, `1,24,50,000` for crores) on customer surface. Staff surface can use raw with explicit unit.
- Currency always `₹` prefix with non-breaking space: `₹ 1,24,50,000`.
- Dates on customer surface: "14 March 2026". Dates on staff surface: "14 Mar 2026" or ISO `2026-03-14` in tables. Time in IST always; label as `IST` only when ambiguous.
- Plurals respected: "1 owner" / "2 owners".
- Error messages explain what went wrong and what to do next, in that order. Never just "something went wrong".

Full microcopy library lives in `/packages/ui/src/copy/` with i18n keys.

---

## 6. Iconography

- Base: Lucide Icons (matches shadcn/ui default, MIT licensed, consistent stroke).
- Custom: commissioned set for domain-specific actions — CPO badge, handover, consignment, VIN, RC, Aadhaar, DigiLocker, PAN, GSTIN. Designed on same stroke grid as Lucide (1.5px @ 24px).
- Icon sizes: 16, 20, 24, 32.
- Icons are always paired with text labels on customer surface. Icon-only buttons only appear on staff surface and always have a tooltip.

---

## 7. Dark mode

- Staff surface: dark is default shipped; user can switch to light. Stored per user preference.
- Customer surface: follows system preference by default; user can override; stored per session for anonymous, per account for logged-in.
- Both modes ship with full parity — no feature gaps, no visual polish gaps.
- Images adjust: vehicle photos get 92% brightness filter in dark mode to reduce glare; disabled by toggle.

---

## 8. Internationalization

- Base: English (en-IN).
- Phase 1 additional: Hindi (hi-IN).
- Per-outlet state: Kannada (kn-IN) for Bangalore, Marathi (mr-IN) for Mumbai, Tamil (ta-IN) for Chennai — added per outlet go-live.
- Right-to-left: not required in v1 (no Urdu/Arabic).
- All strings through `next-intl`. No hardcoded copy in components.
- Date, number, currency formatting via `Intl.DateTimeFormat` / `Intl.NumberFormat` with locale-appropriate grouping.

---

## 9. Reference frames — customer surface direction

When a designer or agent is unsure about a customer-surface decision, resolve toward the spirit of these references:

- **Editorial Luxury inputs**: Porsche Approved, Aston Martin Q, SSENSE, Hermès.com editorial, The Gentleman's Journal.
- **Dark Premium inputs**: Porsche Taycan configurator dark mode, 1stDibs dark, Bowers & Wilkins, Nomos Glashütte.
- **Product rigor inputs**: Aesop product pages, Rimowa configurator, Mr Porter PDP.

Do not reference: Carvana, Spinny, CarDekho, OLX Autos, Cars24, Droom. We are deliberately above this tier.

---

## 10. Reference frames — staff surface direction

- **Primary inputs**: Linear, Stripe Dashboard, Vercel, Notion, Height, Raycast, Superhuman.
- **Tables + dense data**: Retool, Metabase, Looker (as floor, not ceiling).
- **Not references**: Salesforce, Dynamics, SAP, any Indian ERP. We are deliberately above this tier too.

---

## 11. Rendering in code

- Tokens: TypeScript source of truth at `/packages/tokens/src/index.ts`. Exports `customerTokens`, `staffTokens`, `sharedTokens`.
- Tailwind preset at `/packages/config-tailwind/` consumes tokens and generates utility classes. Customer app and staff app each extend this preset.
- CSS variables are emitted per surface under `[data-surface="customer"]` and `[data-surface="staff"]` with light/dark variants under `[data-theme="light"]` / `[data-theme="dark"]`.
- All components read from CSS variables, never hex literals. This allows single-source theme switching.

---

## 12. Governance

- Any new token requires a PR against `/packages/tokens/` + an entry in this document + a Storybook preview.
- Any deprecation of a token requires a 2-week migration window with codemod or documented replacement.
- Component changes that alter API require version bump + changelog.
- Visual regression snapshots via Chromatic (or Playwright snapshots as a free alternative) on every PR.

This document is living. Changes flow through PR-with-diff.
