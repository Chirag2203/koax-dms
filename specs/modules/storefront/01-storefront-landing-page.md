---
spec_id: SPEC-STOREFRONT-001
domain: storefront
title: Landing Page (Home)
status: draft
risk_level: low
pii_sensitivity: none
flags: [storefront.landing.v1]
owners: [planner, ux-writer, qa-planner, integrator]
depends_on: []
docs_consulted:
  - Doc 02 §Storefront must-haves
  - Doc 03 §2.1 (Landing page), §6 (Luxury UX), §7 (Performance), §8 (Accessibility)
  - Doc 09 (Glossary)
  - Doc 12 §Performance, §SEO
  - Design 01 §1 (Brand primitives), §2 (Customer surface tokens), §2.4 (Layout), §2.5 (Imagery), §2.6 (Motion)
  - Design 02 (Stitch prompt — Screen 1 Landing)
  - Stitch export: 01-home.html, 01-home.jpg
  - Research agent findings: §1 (Prior art), §2 (Scenarios 1,2,6), §3 (Edge cases), §4 (Performance)
  - Plan agent findings: §1 (Routing), §2 (Layout architecture), §3 (Component map), §7 (Build order)
effective_date: 2026-04-16
---

# SPEC-STOREFRONT-001 --- Landing Page (Home)

---

## 1. Summary

The landing page is the brand front door for BN Automobiles. It must convince a discerning buyer in under 5 seconds that this is not CARS24 --- it is a curator of exceptional pre-owned vehicles across Bangalore, Mumbai, and Chennai.

The page combines the **Dark Premium** (05) theme above the fold with the **Editorial Luxury** (01) light theme below, creating a cinematic-to-editorial scroll progression. It introduces the brand, showcases 3 curated featured vehicles, presents 9 collection-preview vehicles, surfaces the certification program, links to services, and closes with editorial journal content.

This is **Slice 1** in the build order. It establishes the shared navigation shell (header, footer, city selector, theme system), the VehicleCard component family, and the section rhythm that every subsequent storefront page inherits.

---

## 2. Context & motivation

Indian luxury pre-owned platforms fall into two camps: OEM-branded (Porsche Approved, BMW Premium Selection) which have editorial quality but no price transparency, and aggregator marketplaces (CARS24, Spinny, CarDekho) which have transparency but mass-market UX. BN Automobiles occupies the whitespace between: editorial luxury tone with full price disclosure and a post-purchase customer portal (Research §1 cross-reference).

The landing page must signal this positioning within the first scroll. Photography is the product. Typography carries the brand. Whitespace signals luxury. Every element earns its place.

---

## 3. Goals

- First-time visitor understands BN's positioning (curated luxury, multi-city, certified) within one scroll (above the fold + trust strip).
- LCP < 2.0s at P75 on 4G India cellular (Doc 12 §Performance, Doc 03 §7).
- Core Web Vitals all green: CLS < 0.1, INP < 200ms.
- Page is fully usable at 375px mobile width (Doc 03 §6, Design 01 §2.4).
- WCAG 2.1 AA compliant: 4.5:1 contrast, keyboard navigable, screen reader coherent.
- City selector persists across session, affecting inventory counts and outlet information.
- VehicleCard component established as reusable across Collection, VDP (similar cars), and Account (saved cars).

---

## 4. Non-goals

- Search functionality on landing (deferred to Collection page, SPEC-STOREFRONT-003).
- Customer sign-up/login (deferred to SPEC-CUSTOMER-PORTAL-001).
- Real-time inventory counts (v1 uses seeded mock data; real-time when backend wires).
- Video walkarounds on landing cards (v1.5).
- Dynamic hero rotation (weekly manual update in v1; CMS-driven in v1.5).

---

## 5. Domain model changes

No new entities. Landing page is a **read-only projection** consuming:

- `Vehicle` (Doc 10): make, model, variant, year, km, fuel, transmission, color, city, price, images, certification status, editorial copy.
- `Outlet` (Doc 10): city, name, address, phone, email, vehicle count, service count.
- `Article` (future, Journal module): title, excerpt, hero image, slug, publish date.

**Mock data contract** (in `@dms/mocks`):
- `getFeaturedVehicles(city?: City): Vehicle[]` --- returns 3 editorially curated vehicles.
- `getCollectionPreview(city?: City, limit: number): Vehicle[]` --- returns 9 vehicles sorted by newest.
- `getJournalPreview(limit: number): Article[]` --- returns 3 latest articles.
- `getOutletSummary(city: City): OutletSummary` --- vehicle count, service count.

---

## 6. State machine changes

None. Landing page is stateless read-only.

---

## 7. API contracts

All data served via MSW handlers in v1. API shape defined here for future backend compatibility.

### GET /api/vehicles/featured
- **Purpose:** 3 curated vehicles for hero strip
- **Auth:** Public (no auth)
- **Query params:** `city` (optional, enum: bangalore | mumbai | chennai)
- **Response:**
```json
{
  "vehicles": [
    {
      "vin": "WP0AA2A9XNL012345",
      "make": "Porsche",
      "model": "911 Carrera S",
      "variant": "PDK",
      "year": 2021,
      "km": 12400,
      "fuel": "petrol",
      "transmission": "automatic",
      "color": "Agate Grey",
      "interiorColor": "Truffle Brown Leather",
      "city": "chennai",
      "price": 14500000,
      "images": [{ "url": "...", "alt": "...", "width": 2400, "height": 1500 }],
      "isCertified": true,
      "editorialCopy": "Finished in Agate Grey with Truffle Brown leather. Single owner, meticulously maintained.",
      "slug": "porsche-911-carrera-s-2021-chennai-WP0AA2"
    }
  ]
}
```

### GET /api/vehicles?limit=9&sort=newest
- **Purpose:** Collection preview grid
- **Auth:** Public
- **Query params:** `city`, `limit`, `sort`
- **Response:** Same shape as above with pagination metadata.

### GET /api/articles?limit=3
- **Purpose:** Journal preview strip
- **Auth:** Public
- **Response:**
```json
{
  "articles": [
    {
      "slug": "the-silence-of-concrete",
      "title": "The Silence of Concrete",
      "excerpt": "How architecture shapes the way we present automobiles.",
      "heroImage": { "url": "...", "alt": "...", "width": 1200, "height": 800 },
      "publishDate": "2026-04-10",
      "category": "Atelier"
    }
  ]
}
```

---

## 8. UI/UX outline

### 8.1 Page structure (top to bottom)

Reference: Stitch export `01-home.jpg` + `01-home.html` + Design 02 Screen 1.

| # | Section | Theme | Height | Key components |
|---|---------|-------|--------|----------------|
| 1 | **Top nav** | Transparent over dark | 80px | StorefrontHeader |
| 2 | **Hero** | Dark Premium | 100vh | HeroSection |
| 3 | **Curation strip** | Dark Premium | auto | FeaturedVehicleCard x3 |
| 4 | **Trust / Certification strip** | Light Editorial | auto | TrustStrip |
| 5 | **Collection preview** | Light Editorial | auto | VehicleCard x9 (3x3 grid) |
| 6 | **Services band** | Dark Premium | auto | ServiceCard x3 |
| 7 | **Journal strip** | Light Editorial | auto | JournalCard x3 |
| 8 | **Footer** | Dark (ink bg) | auto | StorefrontFooter |

### 8.2 Section details

**Section 1 --- Top Nav (StorefrontHeader)**
- Fixed, z-50, transparent over dark hero, transitions to `bg-paper/80 backdrop-blur-md` on scroll past hero.
- Left: "BN AUTOMOBILES" wordmark in Playfair Display 24px, bold, tracking -0.04em.
- Center (desktop): The Collection, Certification, Sell Your Car, Service, Journal --- mono label style, 12px uppercase, tracking 0.1em.
- Right: City selector (dropdown: Bangalore / Mumbai / Chennai), Sign In (pill button, accent bg, rounded-full).
- Mobile: hamburger icon triggers full-screen overlay menu with editorial type.
- Scroll behavior: solid background after hero exits viewport. Use `IntersectionObserver` on hero sentinel.

**Section 2 --- Hero**
- Full-viewport height (`min-h-screen`), dark bg `#0A0908`.
- Background: architectural showroom photograph, `object-cover`, `opacity-60`, `mix-blend-luminosity`.
- Film grain overlay: `::after` pseudo-element with noise texture at 5% opacity.
- Content (bottom-left, 12-col grid, `col-span-10`):
  - Headline: Playfair Display 112px, leading 0.9, tracking -0.04em, white: "A quieter way to own a great car"
  - Subline: Inter 20px, stone-400: "Each vehicle hand-selected, inspected on 210 points, and shown in three cities."
  - Primary CTA: Pill button, accent bg, uppercase tracking-widest: "View the collection --->"
  - Secondary: text link, muted: "Or sell your car privately"
- Bottom-left mono caption: "SPRING 2026 . NO. 04" in IBM Plex Mono 10px, stone-500, tracking 0.3em.
- Parallax: hero image moves at 0.12 factor on scroll (disabled for `prefers-reduced-motion`).

**Section 3 --- Curation Strip (3 Featured Vehicles)**
- Dark bg `#0A0908`, py-32 (128px vertical padding), 96px horizontal gutter.
- 3 cards in 12-col grid (4-col each on desktop, full-width stacked on mobile).
- Card anatomy:
  - 16:10 aspect ratio image, rounded-sm, grayscale + opacity-80 default.
  - Hover: color restores, 1.05 scale over 700ms.
  - Mono meta: "2021 . PORSCHE 911 CARRERA S" --- IBM Plex Mono 11px, stone-500, uppercase, tracking-widest.
  - Title: Playfair Display 30px, white: editorial name (e.g., "The Timeless Silhouette").
  - Description: Inter 14px, stone-400, line-clamp-2.
  - Price: IBM Plex Mono 18px, white: "Rs.1,45,00,000" (Indian grouping).
  - Arrow icon (east) on right, stone-600, transitions to accent on hover.
- Middle card offset `translate-y-12` for editorial asymmetry.
- Stagger-reveal: 120ms between cards, 400ms duration fade-up (Research §4.2).

**Section 4 --- Trust / Certification Strip**
- Light bg `bg-paper`, py-32.
- Two-column layout (8-col text + 4-col stats on desktop).
- Left: 3 short editorial paragraphs (Inter 20/32) describing the certification program.
- Right: vertical mono-type figures:
  - "210" --- large display number, accent color
  - "checks . 12 month warranty . 3 outlet network" --- mono 12px stacked.
- Link: "Learn about our certification --->" (text link, accent).

**Section 5 --- Collection Preview (9 Vehicles)**
- Light bg, py-32.
- Section header: Playfair Display 56px: "Available Inventory" (or per Stitch: "The Collection").
- 3x3 grid (4-col each desktop, 2-col tablet, 1-col mobile).
- Card anatomy (VehicleCard --- light variant):
  - 4:5 aspect ratio image, 2px radius.
  - Mono meta: "2022 . 18,420 KM . BANGALORE" --- 12px.
  - Title: Playfair Display 22px.
  - Sub-line: Inter 14px, trim + color.
  - Price: Inter 500, 18px, with hairline divider above.
  - Footer: "View --->" text link in accent.
- Hover: title underline animates from left, image 1.02x scale over 700ms.
- Bottom CTA: "Browse the full collection --->" pill button, centered.

**Section 6 --- Services Band**
- Dark bg, py-32.
- 3 card columns: Service & Maintenance, Pre-Purchase Inspection, Sell Privately.
- Each: Playfair Display 36px title, Inter 16px 2-sentence description, mono "Learn more --->" link.

**Section 7 --- Journal Strip**
- Light bg, py-32.
- Section header: Playfair 40px: "Dispatches from The Atelier" (or "The Journal").
- 3 article cards in row: hero image (16:10), Playfair 22px title, Inter 14px excerpt (line-clamp-3), mono date.

**Section 8 --- Footer (StorefrontFooter)**
- Dark bg (ink-primary on customer dark tokens).
- 4 columns: Visit (3 outlet addresses), Contact (phone in mono, email), Company (About, Certification, Privacy, Terms), Newsletter (email input + subscribe).
- Bottom: "BN Automobiles" wordmark, copyright, mono caption.

### 8.3 Empty states
- **Zero featured vehicles (cold start):** Show 3 placeholder cards with car silhouette and "Coming soon" label. This state should not persist past day 1.
- **Zero collection vehicles:** "Our collection is being curated. Leave your details and we will notify you." + email/phone capture form.
- **Zero articles:** Hide Journal section entirely. Do not show empty.

### 8.4 Loading states
- **Page skeleton:** Hero placeholder (dark rect), 3 card skeletons below, then light section with 9 card skeletons.
- Each skeleton uses the component's exact dimensions with `bg-subtle` animated shimmer.
- Skeleton reveals match the final stagger animation timing.

### 8.5 Error states
- **API failure (MSW down, network error):** Banner at top of page: "We are experiencing a temporary issue. Please refresh or try again shortly." Retry button. Do not break the page layout.
- **Image load failure:** Car silhouette placeholder with "Image unavailable" in mono 11px. Retry on click.

### 8.6 Responsive breakpoints

| Breakpoint | Grid | Hero headline | Cards per row | Gutter |
|------------|------|---------------|---------------|--------|
| Mobile (< 640px) | 4-col | 48px | 1 | 16px |
| Tablet (640-1023px) | 8-col | 72px | 2 | 24px |
| Desktop (>= 1024px) | 12-col | 112px | 3 | 96px |
| Wide (>= 1280px) | 12-col, max-w-1280 | 112px | 3 | 96px |

- Mobile: curation strip becomes horizontal snap-scroll.
- City selector: sheet (bottom slide-up) on mobile, dropdown on desktop.
- Hero CTA: full-width on mobile.

### 8.7 Accessibility

- **Hero contrast:** Gradient overlay from bottom (0% to 70% opacity) ensures AA contrast on text. Additional `text-shadow: 0 2px 8px rgba(0,0,0,0.4)` as safety net (Research §6.1).
- **Skip navigation:** Skip-to-content link visible on focus, targets `<main>`.
- **Focus rings:** Brass focus ring on all interactive elements. Note: Research flagged that `#8a6a3d` on `#faf7f0` is ~3.5:1. **Mitigation:** add 2px white inner outline when focus-visible over light backgrounds: `outline: 2px solid var(--focus-ring); outline-offset: 2px; box-shadow: 0 0 0 4px white`.
- **City selector:** `role="listbox"` with `aria-activedescendant`. Keyboard: arrow keys navigate, Enter selects, Escape closes.
- **VehicleCard:** `<article>` with heading hierarchy. Image `alt` describes car: "2021 Porsche 911 Carrera S in Agate Grey, side profile".
- **Motion:** All animations respect `prefers-reduced-motion: reduce` --- fade-ups become instant reveals, parallax disabled, scale transitions disabled. Framer Motion `useReducedMotion()` hook.
- **Heading hierarchy:** h1 (hero), h2 (section titles), h3 (card titles). No skips.

### 8.8 Copy tone

Per Design 01 §1.1 and Doc 03 §6.6:
- Sentence case, no exclamation marks.
- "View the collection" not "SHOP NOW".
- "Or sell your car privately" not "Sell your car today!".
- Editorial, confident, quiet. Numbers do the rhetorical work.
- All copy via `next-intl` keys under `messages/{locale}/storefront.json`.

---

## 9. Notifications

None. Landing page triggers no outbound communications.

---

## 10. Integrations

None. All data from MSW mock layer in v1.

---

## 11. Data & analytics

Events to emit (via `window.gtag` or custom event bus):

| Event | Properties | Trigger |
|-------|------------|---------|
| `page_view` | `page: "home", city` | On mount |
| `hero_cta_click` | `target: "collection" \| "sell"` | CTA click |
| `featured_vehicle_click` | `vin, make, model, position` | Card click |
| `collection_vehicle_click` | `vin, make, model, position` | Card click |
| `service_band_click` | `service_type` | Card click |
| `journal_card_click` | `article_slug, position` | Card click |
| `city_changed` | `from_city, to_city` | City selector change |
| `newsletter_subscribe` | `email` | Form submit |

---

## 12. Permissions & RBAC

Landing page is fully public. No authentication required. No RBAC gates.

---

## 13. Privacy & compliance

- **PII:** Newsletter email capture stores email address. Consent text displayed inline: "By subscribing, you agree to receive quarterly updates. Unsubscribe anytime." Per DPDP Act 2023 purpose limitation.
- **Cookies:** City preference stored in cookie (functional, no consent required). Analytics cookies require consent banner (separate platform concern, not this spec).
- **No Aadhaar, PAN, phone, or address collected on landing page.**

---

## 14. Non-functional requirements

| NFR | Target | Reference |
|-----|--------|-----------|
| LCP | < 2.0s P75 on 4G India | Doc 03 §7, Doc 12 §Performance |
| CLS | < 0.1 | Doc 12 |
| INP | < 200ms | Doc 12 |
| Core Web Vitals | All green | Doc 03 §7 |
| Image formats | AVIF primary, WebP fallback | Design 01 §2.5 |
| Hero image preload | `<link rel="preload" as="image" fetchpriority="high">` | Research §4.2 |
| Font loading | `font-display: swap`, WOFF2 preloaded | Research §4.2 |
| Page weight | < 2MB initial load, < 5MB total | Research §3.8 |
| Mobile usable at | 375px width | Doc 03 §6, Design 01 §2.4 |
| Contrast | 4.5:1 body, 3:1 large text, 3:1 non-text (WCAG AA) | Doc 03 §8 |
| Keyboard nav | Full tab + arrow key support | Doc 03 §8 |
| Reduced motion | All animations instant when `prefers-reduced-motion` | Design 01 §1.7 |
| SEO | Semantic HTML, JSON-LD Organization, OG tags | Research §3.10 |
| ISR | 60-second revalidation | Plan §1 |

---

## 15. Failure modes & edge cases

| # | What can go wrong | Detection | Recovery | User-facing message |
|---|-------------------|-----------|----------|---------------------|
| 1 | Featured vehicles API returns empty | Response length check | Show 3 placeholder cards | "Our featured selection is being updated." |
| 2 | Collection preview returns < 9 vehicles | Response length check | Render available cards, hide empty slots | (no message, graceful degradation) |
| 3 | Hero image fails to load | `onError` handler | Show dark gradient background only, headline still renders | (no message, hero degrades gracefully) |
| 4 | Vehicle card image fails | `onError` handler | Car silhouette placeholder | (no alt text change needed) |
| 5 | City selector fails to persist | `localStorage` exception catch | Fall back to "All cities" default | (no message) |
| 6 | Newsletter subscribe fails | Network error catch | Toast: "Could not subscribe. Please try again." | Red toast, retry button |
| 7 | Extremely long vehicle name overflows card | CSS `line-clamp-2` + responsive font | Truncate with ellipsis | (no message, visual truncation) |
| 8 | User on non-served city (Research §3.4) | N/A (landing shows all cities) | City selector includes all 3 served cities; no geo-restriction | (no message) |
| 9 | Stale ISR cache shows sold vehicle in preview | ISR revalidation (60s) | Vehicle disappears on next revalidation | (no message, max 60s stale) |
| 10 | JavaScript fails to load (progressive enhancement) | N/A | Hero image + headline render via SSR. Interactions degrade. | (no message) |

---

## 16. Migration & rollout

- **No database migration.** Landing page is read-only with MSW mock data.
- **Feature flag:** `storefront.landing.v1` --- controls visibility of the landing page. When off, shows a "Coming soon" placeholder.
- **Rollout stages:** Development -> Internal review -> Stakeholder demo -> Public.
- **No staff training needed** (customer-facing only).

---

## 17. Test plan

### Unit tests (Vitest)
- VehicleCard renders all variants (featured dark, collection light, compact).
- PriceDisplay formats correctly: 14500000 -> "Rs.1,45,00,000".
- CitySelector persists and restores from localStorage.
- HeroSection renders with and without image.
- TrustStrip renders figures from API response.
- Newsletter form validates email, shows success/error toast.

### Integration tests (Vitest + MSW)
- Landing page renders with MSW data, all sections present.
- City change updates featured vehicles and collection.
- Newsletter submit returns success toast.
- Navigation links route correctly.

### E2E tests (Playwright)
- **S1:** First-time visitor scrolls landing, clicks featured vehicle, navigates to VDP.
- **S2:** User changes city, verifies collection updates.
- **S3:** Mobile viewport (375px): hero renders, curation strip snap-scrolls, all sections visible.
- **S4:** Keyboard-only navigation: Tab through all interactive elements, focus rings visible.
- **S5:** Dark mode toggle: all sections render correctly in both themes.

### Accessibility tests
- Axe audit: 0 violations on landing page.
- Lighthouse accessibility: >= 95.
- Focus ring contrast meets 3:1 on both light and dark backgrounds.
- `prefers-reduced-motion` respected: no animations fire.

### Performance tests
- Lighthouse Performance: >= 90 on mobile throttled.
- LCP < 2.0s with hero image preloaded.
- CLS < 0.1 (images have explicit dimensions).
- Total page weight < 2MB initial.

---

## 18. Open questions

None. All policy decisions locked per user call 2026-04-16:
- Brand: BN Automobiles (confirmed)
- Certification: own-brand + co-branded (confirmed)
- Price transparency: full disclosure (confirmed)
- Cities: Bangalore, Mumbai, Chennai (confirmed)
- Referral: v1.5 (confirmed)

---

## 19. Dependencies

- **Phase 0 foundation** must be complete: Next.js scaffold, Tailwind wiring, CSS variable pipeline, font loading, i18n, theme provider, city provider, MSW + TanStack Query, type definitions, UI primitives, mock fixtures, provider composition.
- `@dms/tokens` customer light + dark tokens (exists, complete).
- `@dms/config-tailwind` preset consuming tokens (needs creation).
- `@dms/types` Vehicle, Outlet, Article types (needs creation).
- `@dms/mocks` fixtures and handlers for vehicles, outlets, articles (needs creation).
- `@dms/ui` primitives: Button, Card, Badge, Skeleton, Toast, Input (needs creation).
- High-quality car photography assets for seed data (Unsplash/Pexels luxury car collections).

---

## 20. Rollback plan

Low risk. Feature flag `storefront.landing.v1` kill switch hides entire landing page, shows "Coming soon" placeholder. No data writes to roll back. No customer communications to retract.

---

## 21. Changelog

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-04-16 | 0.1 | Claude (integrator) | Initial draft from research + plan agent outputs |
