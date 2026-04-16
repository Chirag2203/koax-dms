# Google Stitch prompt — Customer surface (01 Editorial Luxury + 05 Dark Premium)

Paste the **Global brief** first to establish the visual language, then run each **Screen prompt** in sequence. Stitch handles one screen per run best.

---

## Global brief (paste once, before any screen)

We are designing the customer surface of a luxury pre-owned car platform serving India. The audience is HNI buyers, enthusiasts, and family decision-makers in Bangalore, Mumbai, and Chennai. The tone is editorial and quiet — think *Monocle* meets *Porsche Approved*. Not a marketplace. A curator.

**Brand primitives**

- Logo mark: a slim monogram, 28px; pair with a wordmark at 20px using Playfair Display letter-spacing -0.02em.
- Display type: **Playfair Display**, weights 400 and 500, for hero headlines and vehicle titles. Set it large — 72 to 120 px on desktop, 36 to 56 px on mobile.
- Body type: **Inter**, weights 400 and 500, 15/24 default.
- Mono type: **IBM Plex Mono**, 12 px, uppercase, tracking 0.08 em, for labels like VIN, year, mileage, certification codes.
- Color palette (light / editorial):
  - Paper: #FAF7F2 (warm cream)
  - Ink: #171413 (near-black, warm)
  - Muted ink: #605954
  - Hairline: #E6DFD6
  - Accent: #7A5B3A (burnt brass) — used sparingly
  - Signal: #1F4D3A (forest), used only for verified / CPO badges
- Color palette (dark / premium):
  - Stage: #0A0908 (near-black, warm)
  - Surface: #151210
  - Elevated: #1E1A17
  - Body: #E8E2D8
  - Muted: #8D857B
  - Accent: #C79A5E (champagne brass)
  - Hairline: #2A2522
- Spacing uses a 4 px base. Prefer 8, 16, 24, 32, 48, 64, 96, 128.
- Radius: most surfaces 2 px (precision). Feature cards 12 px. Buttons 999 px (pill) or 2 px (mono-caps label).
- Elevation: almost none. Use hairlines, not shadows. One accepted shadow: 0 24 48 rgba(17,16,15,0.10) on hero-level overlays.
- Motion: slow — 400 to 700 ms for reveals, 600 to 900 ms for hero parallax; `cubic-bezier(0.22, 1, 0.36, 1)` emphasize curve. Respect reduced-motion: cross-fade only.
- Imagery: studio-lit cars on neutral backgrounds, or architectural environmental shots at dusk. Subtle film grain (2–4%). Never bright saturated automotive marketing imagery.
- Layout: 12-column grid, 1440 px reference, 96 px gutter on desktop; editorial asymmetry is welcome. Headlines can bleed to edges.
- Copy tone: sentence case, no exclamations, no emoji, no bullet salad. Numbers are authoritative — the price and the year do the rhetorical work.

**Accessibility**

- Minimum body contrast AA, titles AAA where feasible.
- Focus rings on every interactive element, visible in both themes.
- Support `prefers-reduced-motion`.

**Do not**

- Do not use drop shadows beyond the one specified.
- Do not use purple/blue UI gradients.
- Do not use rounded-corner card farms typical of mid-market auto marketplaces.
- Do not use emoji, icons for decoration, or ribbon badges.
- Do not put more than two primary CTAs on any screen.

---

## Screen 1 — Landing page (home)

**Purpose:** convince a discerning buyer that this is not CARS24. Frame the brand, then hand off to the catalog.

**Theme:** dark premium (05) above the fold, transitioning to editorial light (01) below the first section.

**Structure (top to bottom):**

1. **Top nav** — thin, transparent over dark hero. Monogram + wordmark left. Links centered: *The Collection, Certification, Sell Your Car, Service, Journal*. On the right: *Bangalore · Mumbai · Chennai* dropdown (city selector) and a small *Sign in* text link. No hamburger on desktop. On mobile, a tall overlay menu with editorial type.

2. **Hero** — full-bleed dusk image of an architectural showroom with a single car silhouette visible through glass. Overlay headline in Playfair Display 112 px:
   *"A quieter way to own a great car."*
   Sub-line in Inter 18 px: *"Each vehicle hand-selected, inspected on 210 points, and shown in three cities."*
   One pill CTA in champagne brass: *"View the collection →"*. Secondary text link under it: *"Or sell your car privately"*. Mono caption bottom-left: *"SPRING 2026 · NO. 04"* — treat the site like an issue.

3. **Curation strip** — three featured vehicles in horizontal 16:10 cards, displayed on the dark surface. Each card: a large photograph, mono label with year and make above, Playfair title with model, one line of editorial prose, price in Inter 500 using Indian grouping (₹1,45,00,000), and a slim *→* that links to the vehicle page. No ratings, no mileage, no unnecessary chrome.

4. **Transition block** — a full-width editorial passage on cream paper describing our certification program in 3 short paragraphs, set in 20/32 Inter. To the right, a vertical mono-type figure: *210 checks · 12 month warranty · 3 outlet network*.

5. **The Collection preview** — a 12-column grid, light theme. Nine vehicle cards in a 3x3 arrangement. Each card: 4:5 photograph, 12 px mono meta (year · km · city), Playfair Display 28 px title (`<make> <model>`), sub-line body with one descriptive detail, price 20 px Inter medium. Hairline divider above each price. On hover: title underline animates in from left, image shifts 1.02x scale over 700 ms.

6. **Services band** — 3 card columns with ink background: *Service & Maintenance*, *Pre-Purchase Inspection*, *Sell Privately*. Each has a 72 px Playfair title, 2 sentence description, small mono link *"Learn more →"*.

7. **Journal** — editorial magazine-style row of 3 article previews (photography + Playfair 22 px title + Inter 14 px excerpt). Reinforces brand intelligence.

8. **Footer** — cream on ink, 3 columns: *Visit* (three outlets with address lines in Inter 14/22), *Contact* (phone in mono, email in Inter), *Company* (About, Certification, Privacy, Terms). Below: newsletter email field and a mono caption *"© 2026 <brand> · A multi-city concern."*

**Motion specifics:** hero image gentle parallax on scroll. Vehicle cards stagger-reveal on entry (120 ms between items, 400 ms duration). City dropdown opens with 220 ms scale from 0.96.

**Responsive:** mobile collapses to single-column. Hero headline reflows to 56 px. Curation strip becomes a horizontal snap-scroll.

**Accessibility notes:** city selector must be keyboard-operable with `role=combobox`. Hero headline must maintain AA contrast on its image via a soft gradient underlay (0 to 40% ink opacity).

---

## Screen 2 — Car display (vehicle detail page)

**Purpose:** sell this specific car. One vehicle, argued confidently.

**Theme:** dark premium (05) for the hero and gallery; light editorial (01) for details and specs.

**Structure (top to bottom):**

1. **Top nav** — same as landing, but with a thin breadcrumb directly below: *The Collection · Sedans · 2022 Porsche Panamera 4* (mono, muted).

2. **Hero gallery** — full-bleed dark. A tall 70vh hero photograph of the car, centered composition, slight negative space above and below. To the left margin: vertical mono stack:
   - *VIN · WP0ZZZ97•XXXXXXXXX* (last-4 unmasked, others masked as hairline dots)
   - *2022 · 18,420 km · Bangalore*
   - *CPO · 210-point certified*
   Beneath the image: a thin gallery strip showing 7 thumbnails, the selected one outlined in champagne brass.

3. **Name & price block** — Playfair Display title 88 px:
   *"2022 Porsche Panamera 4"*
   Sub-line 20 px Inter muted: *"Platinum edition · Crayon exterior · black interior · one owner."*
   Below, a two-row statement:
   - Price in Playfair 56 px: *"₹1,28,50,000"*
   - Inline mono 12 px: *"inclusive of GST margin · TCS applicable"*
   - Two CTAs side by side: champagne pill *"Reserve for ₹1,00,000 →"* and outlined *"Schedule a viewing"*. A text link under them: *"Ask about financing"*.

4. **Editorial paragraph** — a 1-column 720 px wide editorial essay (Inter 19/32) describing the car like a magazine feature. 3–4 paragraphs. Pull quote in Playfair Display 40 px mid-way: *"It arrived to us with a dealer service file most owners would envy."*

5. **Details grid** — light cream surface. 3 columns of spec groups:
   - *Provenance*: year, make, model, trim, colors, owners, location
   - *Technical*: powertrain, transmission, fuel type, displacement, power, torque
   - *Ownership*: ODO reading, service history, warranty, road tax valid through, insurance valid through, registration state, key count
   Each row is a thin hairline separator. Labels are 11 px mono uppercase, values are Inter 15/22.

6. **Certification panel** — forest-green signal block. Header Playfair 32 px: *"210-point certification"*. Three sub-sections: *Mechanical*, *Cosmetic*, *Documentation*, each with a list of inspected items (Inter 14/22). Button in corner: *"Download inspection report (PDF)"*.

7. **Ownership cost estimator** — a compact card: "Based on Bangalore registration, a ₹XX lakh down payment, and a 60-month loan, your monthly outflow is ₹XX,XXX." Small controls to adjust. Disclaimer in mono 11 px.

8. **Similar in The Collection** — row of 3 cards from the catalog using the same card language as the landing collection strip.

9. **Reservation sticky bar** — appears on scroll on mobile. Contains price + primary CTA.

10. **Footer** — same as landing.

**Motion specifics:** gallery selection cross-fades at 240 ms. Price reveal uses a 400 ms reveal from 8 px below. Parallax on hero at 0.12 factor.

**Responsive:** mobile collapses gallery to a horizontal snap-scroll with a 4:3 frame. Spec grid becomes 2-column then 1-column.

**Accessibility:** each gallery thumbnail is a button with an accessible name *"View photo N of 7"*. VIN last-4 and phone numbers never rendered fully; always masked.

---

## Screen 3 — City manager (outlet / location selector)

**Purpose:** help the user pick a city (Bangalore, Mumbai, Chennai) and see that city's showroom, team, and current inventory count. This is a brand moment, not a utility page.

**Theme:** editorial light (01) with one full-bleed dark banner.

**Structure:**

1. **Top nav** — same. The city selector in the nav is replaced with a static label *"Our cities"* on this page.

2. **Page title** — Playfair Display 80 px: *"Three cities. One standard."* Sub-line 20 px Inter: *"Visit us at any outlet. Your account and your saved cars travel with you."*

3. **City map / hero** — a minimalist India map illustration (line art, no political boundaries emphasized). Three pins in brass: Bangalore, Mumbai, Chennai. The pin for the user's detected city is highlighted; the other two are muted. Clicking a pin smooth-scrolls to the corresponding section.

4. **City section (repeat for Bangalore, Mumbai, Chennai)** — each is a full-width block:
   - Left column: large photo of the physical showroom (16:10), 48 px radius image masking, exterior at dusk preferred.
   - Right column:
     - Mono label: *"BANGALORE · KA"*
     - Playfair 56 px: *"Bangalore"*
     - Inter 17/26 paragraph: 3–4 lines about the outlet — neighborhood, what makes it distinctive.
     - Address block in Inter 15/22, four lines.
     - Phone (masked format `+91 •• •••• 1234`, reveal on click), email.
     - Opening hours as a two-column mini-table (Inter 14/22).
     - Mono figure: *"42 vehicles currently in residence · 8 in service bay · 3 arriving this month"*.
     - Two CTAs: *"Book a visit →"* (pill) and *"Meet the team"* (text link).

5. **Team row for each city** — below the city block, a horizontal row of 4–6 team cards. Each: round portrait 120 px, Playfair 20 px name, mono role label, a one-line quote from them. Photos are black-and-white editorial portraits.

6. **Services availability table** — a single light block showing a small matrix of *Services × Cities* (sales, service, body shop, parts counter, certification, detailing). Cities as columns, services as rows, filled cells = offered. Values as hairline checkmarks in forest green. Mono type.

7. **Footer** — same.

**Motion specifics:** map pins pulse softly (1.0 → 1.05, 2 s loop, easing). City blocks reveal on entry with a 140 ms stagger.

**Responsive:** map collapses to 3 stacked city cards with inline pin icons.

**Accessibility:** map pins are buttons with aria-labels. Address block and phone are copy-to-clipboard.

---

## Screen 4 — Customer account

**Purpose:** the customer's private space. Bookings, saved cars, service history, documents. Must feel like a concierge's leather-bound ledger, not a SaaS dashboard.

**Theme:** editorial light (01) throughout. Rely on hairlines and Playfair.

**Structure:**

1. **Top nav** — same, but a subtle signed-in badge appears at the right with the user's initials in a 32 px circle. Clicking opens a small overlay with *Account · Saved · Service · Payments · Documents · Sign out*.

2. **Hero line** — minimal; no image. A 56 px Playfair greeting: *"Good evening, Arjun."* followed by a muted line: *"Here is what we are holding for you."* Above, a small mono label: *"BANGALORE ACCOUNT · MEMBER SINCE MARCH 2026"*.

3. **Primary shelf — Saved cars** — a horizontal row of 3 vehicle mini-cards in the landing style, but smaller (320 px wide). Each card shows a quiet tag in the top-right corner: *"SAVED"* in mono brass. Scroll-snap horizontally if > 3.

4. **Active reservations & bookings** — a two-column editorial block:
   - Left: Playfair 32 px *"Current holds"*. A clean list of 1–3 reservations, each row showing a 72 px thumbnail, vehicle name, reservation expiry, and a text link *"View hold →"*. Hairline between rows.
   - Right: *"Upcoming visits"* — a list of service appointments or showroom visits with date in mono and Playfair service-type.

5. **Service history** — a long editorial ledger. Each service is an entry in the shape of a journal:
   - Mono date on the far left (column A).
   - Playfair 24 px service title and sub-line describing the work.
   - Right column: cost, service advisor initials, a text link *"Full record →"*.
   - Hairline between entries. No table chrome.
   The impression should be *"here is the life of your car, written out."*

6. **Vehicles owned (if any)** — each owned vehicle gets a single-row card showing the car photo (120 px square), VIN in mono (masked), mileage-at-last-service, next service due, and two text links: *"Schedule service"*, *"Request pickup"*.

7. **Documents** — a dense but elegant list: insurance, RC, service records, invoices, finance documents. Each item is a single line with Playfair filename, mono date, and a brass download icon at the right. Grouped by vehicle and year with Playfair 22 px section headers.

8. **Communications preferences** — small, understated. Toggles for WhatsApp updates, SMS reminders, quarterly journal by post. DPDP-compliant consent language below each (Inter 12/18 muted).

9. **Footer** — same.

**Motion specifics:** initial page load reveals the greeting in 400 ms, then shelves stagger in at 120 ms intervals. Toggle switches animate at 180 ms.

**Responsive:** on mobile, shelves become vertical; the ledger stays as-is (it reads well on tall screens).

**Accessibility:** the account menu is keyboard-reachable from the initials avatar; first focus target is the greeting heading. Document download buttons have `aria-label="Download <filename>"`.

---

## Screen 5 — Car & service management cards (the customer-portal card vocabulary)

**Purpose:** a card system page that shows every card variant the customer will encounter across their account. Think of it as a mini library page that double-documents the components and gives Stitch a reference frame.

**Theme:** editorial light (01). Soft cream paper.

**Structure (an editorial "specimen" page):**

1. **Page title** — Playfair 64 px: *"The vocabulary."* Sub-line: *"Every card you will see in your account, labelled."*

2. **Section: Saved vehicle card (compact)** — 320 × 400 px.
   - Top: 4:5 photo, 2 px radius.
   - Middle: mono row *`2022 · 18,420 KM · BANGALORE`*.
   - Playfair 22 px title.
   - Inter 14 px sub-line: trim + color.
   - Price in Inter 500 18 px.
   - Footer row: brass text link *"View →"* and a small outline remove action *"Unfollow"*.
   Display 3 side-by-side with a small caption underneath: *"Appears on: Home shelf, Saved collection."*

3. **Section: Reservation card** — 480 × 220 px.
   - Left: 160 × 160 photo.
   - Right: Playfair 22 px title, mono *`HOLD · EXPIRES 18 APR, 16:00`*, sub-line *"Deposit ₹1,00,000 received on 15 Apr 2026"*, two actions: *"Pay balance"* (pill brass) and *"Release hold"* (text link in muted ink).
   Caption: *"Appears on: Account home, Reservations list."*

4. **Section: Owned vehicle card** — 480 × 200 px.
   - Left: 160 × 160 photo.
   - Right: mono *`VIN · ••••••••••••1234`*, Playfair title, registration city, next service due in Playfair 20 px in forest green; if overdue, show in warm amber (#B7791F).
   - Actions: *"Schedule service"*, *"Request pickup"*, *"View documents"* as a three-text-link row.
   Caption: *"Appears on: Account home, Garage list."*

5. **Section: Service appointment card** — 480 × 220 px.
   - Top-left mono: *`APPOINTMENT · 22 APR 2026 · 09:30`*.
   - Playfair title: *"Annual service · Panamera 4"*.
   - Body: advisor name, outlet (Bangalore), estimated duration, estimated cost range.
   - Actions: *"Reschedule"*, *"Cancel"* (muted), *"Add to calendar"* (brass).
   Caption: *"Appears on: Account home Upcoming visits, Service page."*

6. **Section: Job card / service-in-progress** — 480 × 260 px.
   - Status header strip (forest green / amber / muted based on state): *"IN PROGRESS · BAY 3"*.
   - Playfair title of the service, vehicle sub-line.
   - A thin 4-step progress rail: *Received · Diagnosed · Working · Ready*; current step filled with brass, future steps hairline.
   - Real-time note row: *"Updated 12 min ago by Rohan K., Service Advisor"*.
   - Actions: *"View details"*, *"Message advisor"*.
   Caption: *"Appears on: Account home when a live job card exists; Service history when complete."*

7. **Section: Completed service record card** — 480 × 260 px.
   - Top: mono date + invoice number + amount (masked until clicked).
   - Playfair: work summary title.
   - Body: list of line items in Inter 14 px, each with a small mono unit price. GST line shown explicitly. TCS line shown if present.
   - Actions: *"Download invoice"*, *"Download inspection report"*, *"Request warranty claim"*.
   Caption: *"Appears on: Service ledger."*

8. **Section: Document card** — 320 × 120 px.
   - Icon 24 px (brass) · filename in Playfair 18 px · date in mono 12 px · size in muted Inter 12 px.
   - Download icon-button on the right.
   Caption: *"Appears on: Documents section."*

9. **Section: Reservation expiry warning card** — 480 × 120 px, amber hairline.
   - Playfair title: *"Your hold on the Panamera 4 expires in 3 hours."*
   - Body: one-line instruction, two actions *"Pay balance"* and *"Extend hold"* (if allowed).
   Caption: *"Appears when a reservation is close to expiry."*

10. **Section: CPO badge strip** — a small card showing the visual language of the certified badge (forest green circle, 32 px, interior checkmark hairline, label *"CPO · 210-POINT"* in mono).

11. **Section: Empty state card** — 480 × 160 px.
    - Playfair: *"No cars yet in your garage."*
    - Sub-line: *"When you buy or book a service with us, we will keep the record here."*
    - CTA: *"Browse the collection →"*.
    Caption: *"Used for empty Saved, empty Owned, empty Service history, empty Documents."*

**Motion specifics:** each card reveals on scroll with a 280 ms fade + 8 px lift. Progress rail on the job card animates the filled step by 200 ms when the status advances.

**Responsive:** all cards collapse to full-width single column on mobile.

**Accessibility:** every card is a landmark with a clear heading hierarchy. Progress rail is `role="progressbar"` with aria values.

---

## Additional output requests to Stitch

For each screen, please also output:

1. A mobile variant (390 px width).
2. A dark-theme variant only for **Landing** and **Car display** hero sections.
3. A labeled layout frame showing the 12-column grid overlay.
4. Component sheet for the Vehicle card variants used on that page.

## Quality bar

- Typography must honor the Playfair Display / Inter / IBM Plex Mono trio with the exact weights and sizes listed.
- No stock car marketplace clichés (no "% off" ribbons, no neon CTAs, no carousel overlays).
- Monetary values in Indian grouping (`₹1,28,50,000`) — never US grouping.
- Masked PII — phone numbers and VINs shown masked by default.
- When in doubt, use less.
