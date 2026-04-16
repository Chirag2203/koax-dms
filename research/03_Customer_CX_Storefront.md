# 03 · Customer CX & Storefront

Functional blueprint for everything the end customer touches — storefront, account portal, booking flows, and the reminder engine. Designed for luxury tone with India-first channel assumptions.

---

## 1. Design principles (non-negotiables)

1. **Transparency signals luxury.** Show accident history, odometer verification, previous-owner count, service history, certification details. Hiding information signals mass-market. Luxury trust is earned by over-disclosure.
2. **Whitespace and typography carry the brand.** Serif headlines, sans-serif body, generous padding (minimum 4rem section spacing), single brand accent color used sparingly.
3. **WhatsApp is the primary channel.** Every CTA should link to a conversation; every reminder and status update should arrive on WhatsApp first, SMS second, email for records.
4. **Performance is table stakes.** LCP under 2 seconds, inventory search under 200ms, VDP gallery loads progressively but above-the-fold is instant. Luxury buyers abandon slow sites.
5. **WCAG 2.1 AA minimum.** Contrast 4.5:1, keyboard navigation on every interactive element, alt text on every vehicle image.
6. **Photography is the product.** Every unit photographed against a consistent neutral background, daylight or studio, minimum 10 shots per car plus 360° and short video. Cheap photography kills luxury pricing.

---

## 2. Storefront architecture

### 2.1 Landing page
- Curated hero car rotated weekly, not auto-carousel. One premium vehicle with editorial copy (provenance, condition, scarcity).
- Trust strip: certification program logo + number of inspection points + "every car digitally verified on VAHAN before listing" (operational claim, requires matching internal workflow).
- Secondary: latest arrivals strip (6 units), curated collections (e.g., "Performance SUVs", "Low-mileage sedans", "Convertibles").
- Editorial panel: 2–3 stories — service coverage, customer testimonial, inside-the-workshop photography.
- Search affordance prominent.

### 2.2 Inventory listing
- **Faceted filters (primary):** Make, Model, Year range, Body, Fuel, Transmission, Price range, Kilometers range, Color, Outlet location, Certification status.
- **Secondary facets:** Features (sunroof, leather, navigation, ADAS, adaptive cruise).
- **Sort options:** Newest first (default), Best match, Price low→high, Price high→low, Lowest KM.
- **Listing card:** hero image, make/model/variant, year, KM, fuel/transmission badges, on-road price, location badge, days-in-stock indicator, "Certified" badge when applicable.
- **Density:** 4-column desktop, 2-column tablet, 1-column mobile.
- **Saved search** with email + WhatsApp alerts on new-match and price-drop.
- **No reviews/ratings** on cards or VDPs — mass-market signal, incompatible with luxury trust model.

### 2.3 Vehicle Detail Page (VDP)
The VDP is the most important page in the system. Build it first; everything else supports it.

**Above the fold:**
- Full-bleed hero image (lazy-loaded swipeable gallery underneath, 8–12 photos).
- Title: Year + Make + Model + Variant.
- Registration number (partial — e.g., MH01-AB-**34) and odometer verified badge.
- On-road price (prominent) with "What's included" disclosure link that expands the full breakdown.
- Primary CTAs: Book Test Drive, Chat on WhatsApp, Request Callback.

**Media block:**
- Swipeable image gallery with fullscreen lightbox zoom.
- 360° exterior (interactive spin, 24–36 frames minimum).
- Interior 360° (v1.5).
- 60–90s cinematic video walkaround.
- Undercarriage photos (2–3 shots).
- Downloadable high-resolution PDF spec sheet.

**Trust & provenance panel:**
- Previous owners count with registration geography (e.g., "2 owners, Delhi + Mumbai").
- Accident history — stated explicitly. "No reported major accidents" or "Minor claim 2022; repaired to OEM spec; photos available".
- Odometer verification badge with third-party reference (if used).
- Certification badge linked to certificate PDF and QR code (scannable public verification page hosted by the DMS).
- Service history summary: "5 services on record, last 3 months ago" with link to full timeline.

**Pricing breakdown (critical; this is where most Indian luxury competitors fail):**

Display each line explicitly. Margin-scheme GST on the dealer margin, not the full vehicle value. Example for illustration:

```
On-Road Price                                 ₹46,75,000
  Vehicle price (ex-showroom)                 ₹40,00,000
  Dealer margin (for GST calc only, approx.)  ₹5,00,000
  GST @ 18% on margin (margin scheme)         ₹90,000
  TCS @ 1% on sale > ₹10 lakh                 ₹46,750
  RTO registration (state-specific)           ₹3,30,000
  Road tax (state-specific)                   ₹98,000
  Insurance (1-year comprehensive)            ₹1,05,000
  Dealer-issued warranty (standard)           ₹5,000
Extended warranty (optional)                  +₹1,50,000
```

Exact margin disclosure is a policy choice — dealer may prefer to show only the tax-inclusive total with a footnote. The internal data model must separate each component regardless; presentation can be tuned.

**Interactive tools:**
- EMI calculator: tenure (12–84 months), interest rate range placeholder, down payment slider. If v1.5 finance partner pre-approval is live, call soft-pull API and show real rates.
- Trade-in estimator: short form (make, model, year, KM) → ballpark + "schedule physical inspection" CTA.
- "Add to compare" (up to 5 cars).
- "Save" / "Notify me" (creates saved search + price-drop alert).

**Below-fold:**
- Full specifications table.
- Service history timeline (date, type, KM, advisor).
- Warranty coverage matrix.
- Similar vehicles (4 units, same make+body or same price band).
- Outlet information with map and call/WhatsApp buttons.

### 2.4 "Sell Your Car" flow
- Short form: make/model/variant, year, KM, condition, photos optional.
- OBV (OrangeBookValue) API integration for instant ballpark on submit.
- Customer confirms acceptance-in-principle or requests physical inspection.
- Appointment scheduling with nearest outlet.
- WhatsApp and SMS confirmation with appointment details and what to bring (RC, insurance, service records).

---

## 3. Customer account & portal

The portal is the most underbuilt surface in Indian luxury pre-owned. It is cheap to build, hard for incumbents to retrofit, and drives lifetime value.

### 3.1 Account identity
- Sign-up: email + phone OTP. Social login optional.
- MFA optional (recommended for high-net-worth customers).
- Profile: name, communication preferences (channel + frequency), preferred language (English / Hindi / regional), preferred outlet.

### 3.2 My Vehicles (multi-vehicle support)
One customer, many registered vehicles — explicit project requirement.

For each registered vehicle:
- Basics: make, model, variant, year, registration, color, VIN (last 6 digits visible).
- Documents vault: RC (upload or OCR on capture), insurance policy + expiry, PUC certificate + expiry, warranty card, loan / finance documents if financed through dealer, invoices (purchase + all service + accessories).
- Service history timeline: chronological list with date, type, KM, advisor, cost, items replaced, digital invoice link, technician notes visible to customer.
- Upcoming reminders (see Section 5).
- Quick actions: Book Service, Get Pickup, Request Callback, File Warranty Claim.

### 3.3 Service booking flow (customer side)
1. Select vehicle from My Vehicles.
2. Select service type (periodic / general repair / detailing / warranty claim / accident).
3. Select outlet (pre-selected to customer's preferred; override allowed).
4. Select slot from real-time bay availability.
5. Select logistics option: drop-off / pickup-and-drop / chauffeur-at-home (v1.5).
6. Optionally select service advisor (repeat customers value continuity).
7. Confirm.
8. Receive WhatsApp + SMS confirmation with RO number, expected completion, contact.

During service:
- Real-time RO status in portal: Received → Inspection → Awaiting Approval → In Progress → QC → Ready for Pickup.
- Push notifications on each transition.
- VHC traffic-light report delivered on WhatsApp with photos and short video.
- Additional-work approval: WhatsApp message with estimate, photos, Approve / Decline buttons.
- Digital invoice on completion.
- Pickup scheduling if applicable.

### 3.4 Test drive booking flow
1. From VDP: Book Test Drive.
2. Select slot (7-day view, next available highlighted).
3. Select option: at outlet / chauffeur-at-home (v1.5).
4. DL upload (photo) for verification.
5. Confirm.
6. Receive WhatsApp + SMS with advisor name, location, contact, directions link.
7. 2-hour reminder before slot.

### 3.5 Document vault
- All documents from purchase, service, warranty stored in one place per vehicle.
- OCR on upload to extract key fields (RC number, insurance expiry, PUC expiry, warranty expiry).
- Download as PDF or image.
- Share via WhatsApp (deep-link to customer's own WhatsApp with doc attached).

### 3.6 Loyalty & lifetime value
- v1.0: referral tracking with fixed credit toward next service; service-visit points; birthday/anniversary credit.
- v1.5: exclusive event invites (track days, new-arrival previews), tier-based benefits, member-only inventory preview window.
- v2+: trade-in pre-qualification based on current vehicle value + dealer stock match.

---

## 4. Mobile strategy

**v1.0: PWA (Progressive Web App)** — Next.js / React with service worker for offline catalog cache and WhatsApp-deep-link CTAs. Installable to home screen on Android; acceptable on iOS.
- Rationale: one codebase, faster to ship, sufficient for luxury buyer demographics who primarily browse on desktop/tablet and book via WhatsApp.

**v1.5 / v2: Native mobile (React Native)** — only if PWA engagement data shows retention gap. Focus on service advisor console and customer service tracking as the two native-first experiences.

**Expect customer usage split:** ~60% mobile web, ~30% desktop, ~10% installed PWA / native app (Indian luxury demographic still skews to desktop for research, mobile for booking).

---

## 5. Notifications & reminders engine

### 5.1 Channels
- **WhatsApp Business API via BSP** (Gupshup / AiSensy / MSG91 / Wati) — primary channel for transactional and service comms. Template approval through Meta via BSP; plan 6–10 week lead time.
- **SMS via MSG91 / Kaleyra** — DLT-registered entity ID and templates (separate from WhatsApp). Transactional fallback.
- **Email via SES / SendGrid** — records, invoices, long-form newsletters.
- **In-app / PWA push** — secondary, for users who installed the app.

Important clarification: DLT (Distributed Ledger Technology for telecom) applies to SMS only. WhatsApp template approval is a separate Meta process via the BSP. Several references in the market conflate the two.

### 5.2 Event matrix

| Event | Trigger rule | WhatsApp | SMS | Email | In-app | Copy owner |
|---|---|---|---|---|---|---|
| Service due (date) | 60 / 30 / 7 days before scheduled date | ✓ | — | ✓ | ✓ | Service module |
| Service due (KM) | Estimated km based on avg usage + service-interval map | ✓ | — | — | ✓ | Service module |
| Insurance expiry | 60 / 30 / 7 days before expiry | ✓ | ✓ | ✓ | ✓ | Finance module |
| PUC expiry | 60 / 30 / 14 / 7 days before | ✓ | ✓ | — | ✓ | Service module |
| Warranty expiry | 90 / 60 / 30 days before | ✓ | — | ✓ | ✓ | Finance module |
| RTO tax / registration renewal | 90 / 60 / 30 days before | ✓ | ✓ | ✓ | ✓ | Finance module |
| Test drive confirmation | On booking | ✓ | ✓ | — | ✓ | Sales module |
| Test drive reminder | 2 hours before | ✓ | ✓ | — | ✓ | Sales module |
| Service booking confirmation | On booking | ✓ | ✓ | — | ✓ | Service module |
| RO status change | On each state transition | ✓ | — | — | ✓ | Service module |
| VHC report ready | On VHC completion | ✓ | — | ✓ | ✓ | Service module |
| Additional work approval | Mid-service discovery | ✓ (buttons) | — | — | ✓ | Service module |
| RO complete / ready for pickup | On QC pass | ✓ | ✓ | ✓ | ✓ | Service module |
| Digital invoice | On RO close | ✓ | — | ✓ | ✓ | Finance module |
| New inventory match | Matches saved search + within 7 days of notification | ✓ | — | ✓ | ✓ | Inventory module |
| Price drop on saved car | Price reduction vs saved price | ✓ | — | ✓ | ✓ | Pricing module |
| Birthday / anniversary | Date match + opt-in | ✓ | — | — | ✓ | CRM |
| Post-delivery feedback | 7 days after delivery | ✓ | — | ✓ | ✓ | CRM |
| Post-service feedback (NPS) | 3 days after service pickup | ✓ | — | — | ✓ | Service module |
| Finance sanction letter | On partner API callback | ✓ | — | ✓ | ✓ | Sales module |
| Recall notification | On OEM recall match | ✓ | ✓ | ✓ | ✓ | Service module |

### 5.3 Cadence & consent
- Transactional events (RO, invoices, approvals, confirmations): always send, no unsubscribe.
- Reminders (service, insurance, PUC, warranty, RTO): unsubscribe available per category; max 3 per quarter per vehicle per category.
- Marketing (inventory match, price drop, events): explicit opt-in at signup; per-channel toggle in account settings; max 2 per week.
- Birthday / anniversary: explicit opt-in; max 1 per person per year per event.

### 5.4 Implementation notes
- Queue and scheduler: Redis-backed (BullMQ on Node) or RabbitMQ worker pattern.
- Daily enqueue at 2am IST; send in windows (9am–9pm) respecting DLT / WhatsApp active-hours.
- Retry logic: exponential backoff, max 3 attempts; after failure queue to manual-review table.
- Idempotency keys on every send to prevent duplicate messages on retry.
- Consent and preferences stored per customer per channel per category, with audit trail.

---

## 6. Luxury UI/UX principles (applied)

1. **Typography:** Serif headline (Playfair Display / Fraunces), sans-serif body (Inter / Söhne / Neue Haas), 62.5% base, 1.6× line height.
2. **Spacing:** Minimum 4rem section padding vertically, 2rem gutter between list items.
3. **Color:** Off-white background (#FAFAFA), charcoal text (#1A1A1A), single brand accent (navy or oxblood) used for CTAs and status badges only.
4. **Photography:** Daylight, consistent background per car; no watermarks on primary images; trust signals shown as badges, not stamps across the image.
5. **Motion:** Subtle — 100–200ms fades, 1.02× hover scale, no auto-play video on VDPs (user-triggered only).
6. **Copy:** Editorial tone. "Single owner, full service history, garaged in Bandra" rather than "Amazing deal, don't miss out". Short sentences. No exclamation marks in sales copy.
7. **Trust signals:** third-party inspection verification, certification QR, service-history transparency — these are features, surfaced as UI primitives.

---

## 7. Performance targets

| Metric | Target | Measurement |
|---|---|---|
| Storefront LCP | < 2.0s (P75) | Web Vitals real user monitoring |
| VDP LCP | < 2.0s | Same |
| Inventory search latency | < 200ms (P95) | Elasticsearch slow-query log |
| API response time | < 500ms (P95) | Grafana + Prometheus |
| Image delivery | CDN-backed, responsive sizes (480 / 768 / 1200 / 1920), WebP + AVIF | CDN hit rate monitor |
| Core Web Vitals | All green | PageSpeed, Search Console |

---

## 8. Accessibility baseline (WCAG 2.1 AA)

- Contrast: 4.5:1 normal text, 3:1 large text.
- All vehicle imagery with descriptive alt text.
- Keyboard navigation with visible focus outlines on every interactive element.
- Form labels associated with inputs (not placeholder-only).
- Video captions for walkarounds and testimonials (v1.5).
- Heading hierarchy without skips.
- Skip-to-content link on all pages.
- Testing: Axe and Lighthouse in CI; NVDA / JAWS / VoiceOver manual pass before each release.

---

## 9. Content operations

Every car listed requires a content package produced by operations. The DMS should enforce completeness before listing goes live.

**Required for listing:**
- 10–14 photos, consistent background and lighting.
- 360° exterior (v1.0).
- 60–90s video walkaround (v1.5 required; v1.0 if photography team can deliver).
- Certification PDF (auto-generated from inspection).
- Service history summary (from inbound documents).
- Editorial copy block (150–250 words, human-written initially; templated later).
- Pricing breakdown components populated.

**Content QA workflow:** inventory cannot transition to "Listed" state until every field passes a validation check. This forces discipline on day one rather than retrofitting it.

---

## 10. Open questions specific to CX

1. **Certification branding** — "[Your brand] Assured" vs ride on OEM program labels when applicable. Affects VDP badge design and customer messaging.
2. **Price transparency level** — show margin-scheme GST explicitly to the customer (radical transparency), or show only inclusive price with line-item tax breakdown on request. Policy call.
3. **Accident history disclosure standard** — full disclosure including minor incidents, or threshold ("major incidents only"). Legal and trust implications.
4. **Outlet geography year 1** — determines the chauffeur-at-home feasibility envelope and regional language priorities.
5. **Referral program economics** — credit amount, cap per customer, service-credit vs purchase-credit.
6. **Third-party verification partner** — add a neutral inspection partner (OBD-Eleven, CarWale verified, independent inspector brand) for an additional trust badge, or rely on in-house certification alone.

---

Cross-references: inspection flows and CPO programs live in Doc 04 (Sales & Inventory); service-side RO and VHC live in Doc 05 (Service); reminder data model and consent storage live in Doc 07 (Tech); regulatory specifics for pricing display live in Doc 06 (Finance).
