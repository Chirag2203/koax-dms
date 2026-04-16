---
spec_id: SPEC-STOREFRONT-002
domain: storefront
title: Vehicle Detail Page (VDP)
status: shipped
risk_level: medium
pii_sensitivity: none
flags: [storefront.vdp.v1]
owners: [planner, ux-writer, finance-reviewer, qa-planner, integrator]
depends_on:
  - SPEC-STOREFRONT-001 (landing — header, footer, theme, VehicleCard)
docs_consulted:
  - Doc 02 §Storefront must-haves (VDP line items)
  - Doc 03 §2.3 (VDP — authoritative), §6 (Luxury UX), §7 (Performance), §8 (Accessibility)
  - Doc 06 §GST.margin (margin-scheme pricing disclosure)
  - Doc 09 (Glossary — VIN, CPO, on-road price)
  - Doc 12 §Performance, §SEO
  - Design 01 §2 (Customer tokens), §2.5 (Imagery), §2.6 (Motion)
  - Design 02 (Stitch prompt — Screen 2 VDP)
  - Stitch export: 02-vehicle-detail.html, 02-vehicle-detail.jpg
  - Research: §1 (Prior art — Porsche Approved, SSENSE sticky CTA), §2 (Scenarios 1,3,7,8), §3 (Edge cases 3.1-3.11), §4 (Image optimization, gallery, 360), §6 (Accessibility)
  - Plan: §1 (Routing [vin]), §3 (Component map), §6 (Image strategy)
effective_date: 2026-04-16
---

# SPEC-STOREFRONT-002 — Vehicle Detail Page (VDP)

---

## 1. Summary

The VDP is the single most important page on the BN Automobiles storefront. It is where a buyer decides to reserve, book a test drive, or walk away. Every design decision on this page must argue for the car, not decorate it.

The page combines **Dark Premium** for the hero gallery and title block with **Editorial Luxury** light for the details, certification, and ownership economics. It renders a full vehicle profile: curated photography gallery, editorial narrative, 3-column spec grid, pricing breakdown with margin-scheme GST/TCS disclosure, 210-point certification panel, ownership cost estimator, EMI calculator, and similar vehicles.

Route: `/collection/[vin]` (ISR 60s per VIN).

---

## 2. Context & motivation

Luxury pre-owned competitors in India fail at the VDP: BMW Premium Selection India omits price breakdown; Porsche Approved shows no accident history; aggregators (Spinny, CARS24) show data tables without editorial prose. BN Automobiles VDP is the counter-argument: radical transparency (full pricing, accident history, service records) wrapped in editorial luxury (photography, prose, typography). This is what Doc 03 §2.3 calls "the most important page in the system" (Research §1 cross-reference).

---

## 3. Goals

- Buyer spends 3+ minutes on VDP (engagement target, tracked via analytics).
- Full pricing transparency: margin-scheme GST, TCS, RTO, insurance — every line visible per locked policy decision (2026-04-16).
- Accident history stated explicitly per locked policy decision (full disclosure including minor).
- Gallery loads hero image LCP < 2.0s (Doc 12 §Performance). Additional gallery images lazy-loaded.
- CPO certification badge links to inspection details on-page and downloadable PDF.
- Primary CTAs (Reserve, Schedule a Viewing, WhatsApp) always reachable — sticky bar on mobile.
- VDP is the #1 SEO landing page; structured data (JSON-LD `@type: Car`) per Research §3.10.
- Bookmarkable, shareable via Open Graph (hero image 1200x630 + title + price).

---

## 4. Non-goals

- Real payment processing for reservation (v1 shows success toast with dummy flow).
- Interior 360° viewer (v1.5 per Doc 02).
- Video walkaround embedded on VDP (v1.5; v1 shows placeholder).
- Finance partner pre-approval with real API (v1 shows EMI calculator with adjustable inputs only).
- Trade-in estimator with OBV API (deferred to Sell page, SPEC-STOREFRONT-008).
- Comparison tool (deferred to Collection page, SPEC-STOREFRONT-003).

---

## 5. Domain model changes

No new entities. VDP is a **read-only projection** of `Vehicle` (Doc 10). Consumes the existing `Vehicle` type from `@dms/types` which already includes: vin, make, model, variant, year, km, fuel, transmission, bodyType, color, interiorColor, city, pricing (VehiclePricing with full GST/TCS breakdown), images, isCertified, certificationPoints, previousOwners, accidentHistory, serviceHistorySummary, editorialCopy, slug, listedAt, status.

**Additional fields needed on Vehicle type** (extend `@dms/types`):
- `engine`: string (e.g., "2.9L V6 Biturbo")
- `power`: string (e.g., "330 PS")
- `torque`: string (e.g., "450 Nm")
- `topSpeed`: string (e.g., "268 km/h")
- `acceleration`: string (e.g., "0-100 in 5.6s")
- `driveType`: string (e.g., "AWD")
- `registrationState`: string (e.g., "KA" / "MH" / "TN")
- `registrationExpiry`: string (ISO date)
- `insuranceExpiry`: string (ISO date)
- `warrantyExpiry`: string | null (ISO date)
- `keyCount`: number (e.g., 2)
- `tyreCondition`: string (e.g., "85% Tread")

---

## 6. State machine changes

None. VDP reads the listing status. If `status === 'reserved'` or `status === 'sold'`, the page renders a status overlay (see §15 Edge cases).

---

## 7. API contracts

### GET /api/vehicles/:vin
- **Purpose:** Full vehicle detail
- **Auth:** Public
- **Response:** Full `Vehicle` object including all extended fields from §5
- **Error codes:** 404 (VIN not found), 410 (sold — return vehicle data + `status: 'sold'` for SEO per Research §3.1)

### GET /api/vehicles/:vin/similar
- **Purpose:** 3 similar vehicles (same make+bodyType or same price band ±20%)
- **Auth:** Public
- **Query params:** `limit` (default 3)
- **Response:** `{ vehicles: Vehicle[] }`

---

## 8. UI/UX outline

### 8.1 Page structure (top to bottom)

Reference: Stitch `02-vehicle-detail.jpg` + `02-vehicle-detail.html`.

| # | Section | Theme | Component |
|---|---------|-------|-----------|
| 1 | **Breadcrumb** | Dark | VDPBreadcrumb |
| 2 | **Hero gallery** | Dark Premium | VehicleHeroGallery |
| 3 | **Title & price block** | Dark Premium | VDPTitleBlock |
| 4 | **Editorial paragraph** | Light Editorial | VDPEditorial |
| 5 | **Details grid** | Light (subtle bg) | VDPSpecGrid |
| 6 | **Certification panel** | Forest green (#002114) | CertificationPanel |
| 7 | **Ownership economics** | Light Editorial | OwnershipCostCard |
| 8 | **EMI calculator** | Light Editorial | EMICalculator |
| 9 | **Similar vehicles** | Light (container bg) | SimilarVehicles |
| 10 | **Mobile sticky CTA bar** | Dark | MobileStickyBar |

### 8.2 Section details

**Section 1 — Breadcrumb**
- Dark bg, below fixed header: `pt-24 bg-[#171413] px-6 md:px-12 lg:px-24 pb-4`
- Path: THE COLLECTION · SEDANS · 2022 PORSCHE PANAMERA 4
- `font-mono text-[10px] uppercase tracking-[0.2em]`
- Current segment in `text-stone-300`, parents in `text-stone-500`
- Generates Schema.org BreadcrumbList JSON-LD

**Section 2 — Hero Gallery (Cinematic Grid — Proposal 2)**
- Dark bg `#0c0c0d`, padded `px-0 lg:px-8 py-0 lg:py-8`, max-w-1440
- **Desktop (lg+):** Asymmetric grid — hero image spans 2/3 width (`col-span-2 row-span-2`, `aspect-[16/10]`), 2 side images stacked in right 1/3 (`aspect-[16/10]` each), `gap-2`. Below: bottom row of remaining images (up to 3) at `aspect-[3/2]`. If more than 6 images total, last cell shows "+N more" dark overlay.
- **Mobile:** Hero full-width at `aspect-[4/3]`, remaining images in a horizontal snap-scroll strip (`w-[75vw]`, `snap-center`).
- Metadata (VIN, odometer, location, CPO status) **moved to title block** (Section 3) as a compact mono row — no longer in the gallery.
- Hover: 3% scale-up + brightness lift over 500ms, gradient scrim reveals "Enlarge" label.
- Click any image: opens fullscreen lightbox.
- Hero image: `priority` + `fetchpriority="high"` for LCP. Side images lazy-loaded.
- Keyboard: Tab into grid, Enter/Space opens lightbox on focused image.
- Lightbox: fullscreen modal, swipe/arrow navigation, pinch-zoom on mobile, Escape closes, focus trap. `role="dialog"`, `aria-modal="true"`.

**Section 3 — Title & Price Block**
- Dark bg `#1e1b1a`, py-24, `id="vehicle-details"` (scroll target from gallery skip link)
- **Metadata row** (moved from gallery): `font-mono text-[11px] uppercase tracking-widest text-stone-500` — "WP0AA2A9••••1234 · 18,400 KM · Bangalore · CPO Certified" (dot-separated, CPO in accent color). Placed above h1.
- Two-column layout: title left, price+CTAs right
- Left:
  - Title: `font-display text-[56px] md:text-[88px] leading-[0.95] tracking-[-0.04em]` — "2022 Porsche Panamera 4"
  - Sub-line: `text-lg text-stone-400` — "Carrera S · Agate Grey · Black leather · 1 owner" (dot-separated)
- Right (lg:items-end):
  - Price: `font-display text-[56px] text-white` — "₹1,28,50,000" (Indian grouping, `tabular-nums`)
  - Mono caption: `font-mono text-[11px] text-stone-500` — "inclusive of GST margin · TCS applicable"
  - **Primary CTA**: pill button accent bg — "Reserve for ₹1,00,000 →"
  - **Secondary CTA**: outlined pill — "Schedule a viewing"
  - **Tertiary**: text link — "Ask about financing" (scrolls to #emi-calculator)
- All CTAs are dummy: Reserve shows success toast. Schedule a viewing shows success toast. No real API calls.

**Section 4 — Editorial Paragraph**
- Light bg `bg-bg-paper`, py-32
- Centered column: `max-w-[720px] mx-auto`
- Pull quote: `font-display text-[40px] italic leading-tight mb-16`
- Body: `font-sans text-[17px] leading-relaxed text-ink-secondary space-y-8`, 2-3 paragraphs from `vehicle.editorialCopy`

**Section 5 — Details Grid (3-column spec table)**
- Light subtle bg `bg-bg-subtle`, py-24
- 3 columns with hairline dividers between: Provenance, Technical, Ownership
- Each column:
  - Header: `font-mono text-[11px] uppercase tracking-widest text-accent mb-12`
  - Rows: label (`text-sm text-ink-muted`) | value (`font-sans font-medium text-ink-primary`)
  - Hairline separator: `border-b border-line pb-2`
- **Provenance**: Previous Owners, Service History, Original Region, Keys Provided, Accident History
- **Technical**: Engine, Power, Torque, Transmission, Top Speed, 0-100, Drive Type
- **Ownership**: Insurance Validity, Tyre Condition, Warranty, Road Tax, Registration State

**Section 6 — Certification Panel**
- Forest green bg `#002114`, text white, py-24, `overflow-hidden relative`
- Watermark: oversized checkmark icon (Shield from lucide-react) at `text-[400px] opacity-10` positioned top-right
- Header row: `font-display text-[48px]` "210-point certification" + "Download inspection report (PDF)" button
- Description: `text-stone-400 max-w-xl`
- 3-column grid: Mechanical, Cosmetic, Documentation
  - Each: icon (Wrench, Palette, FileText from lucide) + mono label + checklist items with `/` prefix markers
- Only visible when `vehicle.isCertified === true`. Hidden otherwise.

**Section 7 — Ownership Economics**
- Light bg, py-24
- Two-column: left = text + cost card, right = workshop image
- Cost card: `bg-bg-elevated p-8 rounded-sm shadow-sm border border-line`
  - Line items: Annual Service Est., Tyre Replacement, Comprehensive Insurance
  - Total: `font-display text-2xl text-accent` — estimated yearly total
  - Values are static estimates per make (Porsche ₹7,35,000/yr, BMW ₹4,20,000/yr, etc.) from fixture data

**Section 8 — EMI Calculator**
- Light bg, py-24
- Card with sliders:
  - Down payment: slider + input (range: 10-90% of vehicle price)
  - Tenure: slider + input (12-84 months, step 12)
  - Interest rate: slider + input (8-14%, step 0.5)
- Output: `font-display text-4xl text-accent` monthly EMI
- Formula: standard reducing-balance EMI = P × r × (1+r)^n / ((1+r)^n - 1) where P = (price - downPayment), r = monthly rate, n = months
- Disclaimer: `font-mono text-[11px] text-ink-muted` — "Indicative calculation only. Actual rates depend on credit assessment and lender terms."
- All client-side computation, no API call.

**Section 9 — Similar Vehicles**
- Subtle bg `bg-bg-subtle`, py-32
- Header: `font-display text-[48px]` "Curated Alternatives" + "View Full Collection" link
- 3 cards using `VehicleCard variant="collection"` from Slice 1

**Section 10 — Mobile Sticky CTA Bar**
- Appears on mobile when title block scrolls out of view
- Fixed bottom: `fixed bottom-0 left-0 right-0 z-40`
- Dark bg with blur: `bg-[#171413]/90 backdrop-blur-md`
- Contains: price (compact) + primary CTA "Reserve →"
- Per SSENSE sticky bar pattern (Research §1.6)
- `md:hidden` — desktop never shows this

### 8.3 States

**Loading state:**
- Dark skeleton for hero gallery (animated shimmer)
- Light skeleton for details sections

**Error state:**
- Vehicle not found (404): editorial 404 page "This vehicle is no longer in our collection." + "Browse the collection →" link
- API failure: "We could not load this vehicle. Please try again." + retry button

**Sold state (Research §3.1):**
- Semi-transparent overlay on hero: "This vehicle has been sold."
- All CTAs disabled/hidden
- Similar vehicles section promoted: "Explore similar in The Collection"
- Page stays live for SEO (200 status for 90 days, then 301 to collection)

**Reserved state:**
- Banner above title: "This vehicle is currently reserved."
- Reserve CTA changes to "Join waitlist"
- Other CTAs remain active

### 8.4 Responsive

| Breakpoint | Gallery | Title | Price | Spec grid | CTAs |
|------------|---------|-------|-------|-----------|------|
| Mobile (<640px) | Horizontal snap-scroll, 4:3 | 36px | Below title | 1-col stacked | Sticky bottom bar |
| Tablet (640-1023px) | Horizontal strip + hero | 56px | Below title | 2-col | Inline buttons |
| Desktop (>=1024px) | Centered hero + thumbnail strip + sidebar meta | 88px | Right-aligned | 3-col | Inline buttons |

### 8.5 Accessibility

- **Gallery**: `role="region"` + `aria-roledescription="Image gallery"`. Each thumbnail is a `button` with `aria-label="View photo N of M"`. Arrow keys navigate.
- **Lightbox**: `role="dialog"` + `aria-modal="true"`. Focus trap. Escape closes. `aria-label="Vehicle photo gallery"`.
- **Price breakdown**: Use `<table>` for screen reader navigation. `scope="row"` on labels. `aria-label="Price breakdown"`.
- **EMI calculator**: Sliders have `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`. Output has `aria-live="polite"`.
- **Certification checklist**: `<ul>` with `role="list"`. Slash markers are `aria-hidden="true"`.
- **VIN masking**: Full VIN never rendered in DOM. Only last 4 visible. Screen reader: "VIN ending in 1234".
- **Reduced motion**: Gallery crossfade instant. Parallax disabled. Sticky bar snap instead of slide.
- **Focus rings**: Contrast-safe brass ring with white shadow (per SPEC-001 §8.7).
- **Skip link**: "Skip to price and booking" targets the title block.

### 8.6 SEO

- **URL**: `/collection/[vin]` where vin is the full VIN (SEO-friendly slug not needed — VIN is authoritative)
- **Title tag**: "2022 Porsche Panamera 4 | BN Automobiles | Bangalore" (<60 chars)
- **Meta description**: Editorial copy first sentence + price
- **JSON-LD**: `@type: Car` with `brand`, `model`, `vehicleModelDate`, `mileageFromOdometer`, `offers` (price, currency, availability), `seller`
- **Open Graph**: `og:image` = hero image resized to 1200x630, `og:title`, `og:description`, `og:type: product`
- **Canonical**: `/collection/{vin}`
- **Sold VDPs**: 200 for 90 days, then 301 redirect to `/collection?make={make}&bodyType={bodyType}`

---

## 9. Notifications

None triggered from VDP view. Reservation/booking flows will trigger notifications in their respective specs.

---

## 10. Integrations

None in v1. All data from MSW mocks.

---

## 11. Data & analytics

| Event | Properties | Trigger |
|-------|------------|---------|
| `vdp_view` | vin, make, model, price, city, source (referrer) | Page mount |
| `gallery_interact` | vin, image_index, action (thumbnail_click \| lightbox_open \| lightbox_close) | Gallery interaction |
| `gallery_scroll` | vin, images_viewed_count | 3s after last gallery interaction |
| `reserve_click` | vin, price | Reserve CTA click |
| `viewing_click` | vin | Schedule a viewing click |
| `whatsapp_click` | vin, platform (mobile \| desktop) | WhatsApp CTA click |
| `financing_click` | vin | "Ask about financing" click |
| `emi_calculate` | vin, down_payment, tenure, rate, monthly_emi | EMI slider interaction (debounced 1s) |
| `certification_pdf_click` | vin | Download PDF click |
| `similar_vehicle_click` | vin, clicked_vin, position | Similar vehicle card click |
| `vdp_scroll_depth` | vin, depth_percent (25/50/75/100) | Scroll milestones |
| `time_on_vdp` | vin, seconds | Page unload (beacon) |

---

## 12. Permissions & RBAC

VDP is fully public. No authentication required.

---

## 13. Privacy & compliance

- **PII:** VIN last-4 displayed; full VIN never in DOM. No personal data collected on VDP view.
- **Booking form** (Schedule a Viewing): collects phone number. Consent text: "We will contact you to confirm your viewing." Phone stored only for session (mock) or in CRM (post-backend).
- **WhatsApp deep-link**: pre-fills message with vehicle stock number for advisor routing. No PII in the URL.

---

## 14. Non-functional requirements

| NFR | Target | Reference |
|-----|--------|-----------|
| LCP | < 2.0s P75 on 4G India (hero image) | Doc 03 §7 |
| CLS | < 0.1 (explicit image dimensions) | Doc 12 |
| INP | < 200ms (gallery, EMI slider) | Doc 12 |
| Hero image | Preloaded, priority, AVIF/WebP | Research §4.2 |
| Gallery images | Lazy-loaded after hero, responsive srcsets | Research §4.1 |
| Page weight | < 2.5MB initial, < 8MB total (image-heavy) | Research §3.8 |
| SEO | JSON-LD Car, OG tags, canonical | Research §3.10 |
| ISR | 60-second revalidation per VIN | Plan §1 |

---

## 15. Failure modes & edge cases

| # | What can go wrong | Recovery | User-facing |
|---|-------------------|----------|-------------|
| 1 | Vehicle sold while viewing (Research §3.1) | Overlay + disable CTAs + promote similar | "This vehicle has been sold." |
| 2 | Vehicle reserved while viewing | Banner + change Reserve to "Join waitlist" | "This vehicle is currently reserved." |
| 3 | VIN not found | 404 page with collection link | "This vehicle is no longer in our collection." |
| 4 | Hero image fails to load | Dark placeholder with car silhouette | Gallery degrades, text content intact |
| 5 | Gallery thumbnail fails | Grey placeholder | Silent degradation |
| 6 | Very long vehicle name (Research §3.6) | Responsive clamp: 88px desktop → 56px tablet → 36px mobile | Truncate with ellipsis only if still overflows |
| 7 | Price is ₹0 or missing | Hide price, show "Price on request" + WhatsApp CTA | "Price on request. Contact us for details." |
| 8 | Vehicle not certified (isCertified=false) | Hide certification panel entirely | No message, section absent |
| 9 | EMI calculator extreme inputs (0 down, 84mo, 14%) | Clamp inputs to valid ranges, show warning for unrealistic combos | "This is an indicative estimate." |
| 10 | Lightbox on slow connection | Load full-res on open, show skeleton/blur during load | Blur-up placeholder transitions to sharp |
| 11 | Back-button after save/bookmark | VDP state fully URL-driven, no ephemeral state lost | (no message) |
| 12 | WhatsApp deep-link on desktop (Research §3.9) | Detect platform, fallback to web.whatsapp.com | Opens WhatsApp Web |

---

## 16. Migration & rollout

- No database migration.
- Feature flag: `storefront.vdp.v1`
- Rollout: Dev → internal review → stakeholder demo → public
- VDP depends on Landing (Slice 1) being live for header/footer/nav.

---

## 17. Test plan

### Unit tests (Vitest)
- PriceBreakdown renders all line items correctly (GST, TCS, RTO, insurance)
- EMICalculator computes correctly: known inputs → known EMI output
- Gallery state management: thumbnail click updates hero, keyboard navigation
- VIN masking: only last 4 digits visible
- Responsive title sizing
- Sold/reserved state rendering

### E2E tests (Playwright)
- **S1:** Navigate from landing → click vehicle card → VDP loads with correct data
- **S2:** Gallery: click thumbnails, verify hero swap. Open lightbox, navigate with arrows, close with Escape.
- **S3:** EMI calculator: adjust sliders, verify output updates. Extreme values handled.
- **S4:** Mobile (375px): sticky CTA bar appears on scroll, gallery snap-scrolls, all sections visible.
- **S5:** Sold vehicle: overlay renders, CTAs disabled, similar vehicles visible.
- **S6:** SEO: verify `<title>`, meta description, JSON-LD, OG tags present and correct.

### Accessibility tests
- Axe: 0 violations on VDP
- Gallery keyboard navigation: arrows, Enter, Escape
- Lightbox focus trap
- Price table screen reader navigation
- EMI slider aria attributes
- Focus ring contrast on both dark and light sections

---

## 18. Open questions

None. All policy decisions locked (2026-04-16).

---

## 19. Dependencies

- SPEC-STOREFRONT-001 (header, footer, theme, VehicleCard, PriceDisplay) — **shipped**
- Extended Vehicle type fields (§5) — add to `@dms/types`
- Extended vehicle fixture data with technical specs — add to `@dms/mocks`
- Unsplash/Pexels hero images for gallery seed data

---

## 20. Rollback plan

Feature flag `storefront.vdp.v1` kill switch. VDP routes return 404 when flag is off. No data writes to roll back.

---

## 21. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-16 | 0.1 | Claude (integrator) | Initial draft from research + plan + Stitch reference |
| 2026-04-16 | 0.2 | Claude (integrator) | Gallery redesigned from centered hero+thumbnails to Cinematic Grid (Proposal 2): asymmetric grid with 2/3 hero + 2 stacked side images + bottom row + "+N more" overlay. Metadata relocated from gallery sidebar to title block as compact mono row. Mobile uses horizontal snap-scroll strip. All vehicle fixture images replaced with verified Unsplash URLs. |
